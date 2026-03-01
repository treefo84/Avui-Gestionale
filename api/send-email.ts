export default async function handler(req: any, res: any) {
  // Solo POST consentito
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const resendApiKey = process.env.VITE_EMAIL_API_KEY || process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || "Avui Gestionale <onboarding@resend.dev>"; 

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is missing on server.");
      return res.status(500).json({ error: 'Email service configuration missing on server.' });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Vercel API] Failed to send email via Resend:", response.status, errorText);
      return res.status(response.status).json({ error: 'Upstream error from Resend', details: errorText });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, data });

  } catch (err: any) {
    console.error("[Vercel API] Error sending email:", err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
