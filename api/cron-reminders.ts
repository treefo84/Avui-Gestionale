import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // Assicurati che il task sia autenticato (puoi impostare CRON_SECRET su Vercel)
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    // Usa idealmente il SERVICE_ROLE_KEY per il cron, altrimenti l'anon key
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const resendApiKey = process.env.VITE_EMAIL_API_KEY || process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev"; 

    if (!supabaseUrl || !supabaseKey || !resendApiKey) {
      return res.status(500).json({ error: "Mancano variabili d'ambiente (SUPABASE o RESEND_API_KEY)" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Recupera gli utenti (tranne MANAGER e RISERVA che potrebbero non dover inserire disponibilità)
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id, name, email, role")
      .neq("role", "MANAGER");

    if (usersErr) throw usersErr;
    if (!users || users.length === 0) {
      return res.status(200).json({ message: "Nessun utente trovato." });
    }

    // Calcoliamo il mese corrente (es. "2023-11%")
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    // 2. Recuperiamo tutte le disponibilità inserite nel mese corrente
    const { data: availabilities, error: availErr } = await supabase
      .from("availabilities")
      .select("user_id")
      .like("date", `${currentYearMonth}-%`);

    if (availErr) throw availErr;

    // Creiamo un Set di utenti che hanno inserito almeno UN giorno di disponibilità per il mese
    const usersWithAvailability = new Set(availabilities?.map((a) => a.user_id));

    // 3. Filtriamo gli utenti che NON hanno inserito disponibilità e che hanno un'email
    const usersToRemind = users.filter((u) => !usersWithAvailability.has(u.id) && u.email);

    if (usersToRemind.length === 0) {
      return res.status(200).json({ message: "Tutti hanno inserito le disponibilità." });
    }

    // 4. Inviamo le email con Resend
    const emailPromises = usersToRemind.map((user) => {
      console.log(`Invio promemoria a ${user.email} (${user.name})`);
      
      return fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: user.email,
          subject: "Avui Gestionale: Promemoria Inserimento Disponibilità",
          html: `<p>Ciao ${user.name},</p>
          <p>Ti ricordiamo che oggi è il 5 del mese e non hai ancora inserito le tue disponibilità per il mese corrente.</p>
          <p>Ti preghiamo di accedere e aggiornare il calendario al più presto.</p>
          <p>Grazie!</p>`,
        }),
      });
    });

    await Promise.allSettled(emailPromises);

    return res.status(200).json({ 
      message: "Cron terminato con successo",
      emailsSentCount: usersToRemind.length,
      usersReminded: usersToRemind.map(u => u.name)
    });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
