const VERSION = "vJWT-2026-02-09-100";

// supabase/functions/admin-users/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Action = "create_user" | "set_role" | "set_admin" | "set_password" | "update_user" | "delete_user";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, payload: any) {
  const body = typeof payload === "object" && payload !== null
    ? { version: VERSION, ...payload }
    : { version: VERSION, payload };

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normRole(input: any) {
  const r = String(input ?? "HELPER").trim().toUpperCase();

  if (r === "AIUTANTE") return "HELPER";
  if (r === "COMANDANTE") return "INSTRUCTOR";
  if (r === "ISTRUTTORE") return "INSTRUCTOR";
  if (r === "RISERVA") return "RESERVE";       // ✅ aggiungi

  if (r === "MANAGER" || r === "HELPER" || r === "INSTRUCTOR" || r === "RESERVE") return r; // ✅ aggiungi RESERVE

  return "HELPER";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
      return json(500, { error: "Missing env vars (SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY)" });
    }

    // Authorization header (case-insensitive)
    const authHeader =
      req.headers.get("Authorization") ||
      req.headers.get("authorization") ||
      "";

    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "missing Authorization bearer token" });
    }

    // client utente: valida token
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { error: "invalid session", details: userErr?.message ?? null });
    }

    const callerUid = userData.user.id;

    // client admin
    const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

    // verifica admin nel DB
    const { data: callerRow, error: callerDbErr } = await admin
      .from("users")
      .select("is_admin, role")
      .eq("auth_id", callerUid)
      .maybeSingle();

    if (callerDbErr) return json(500, { error: callerDbErr.message });

    if (!callerRow?.is_admin) {
      return json(403, { error: "forbidden (not admin)" });
    }

    // body
    const body = await req.json().catch(() => ({}));
    const action: Action = body.action;

    if (!action) return json(400, { error: "missing action" });


    // -------------------------
// ACTION: create_user
// -------------------------
if (action === "create_user") {
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "HELPER").trim().toUpperCase();
  const isAdmin = !!body.is_admin;

  const phoneNumber = body.phone_number ? String(body.phone_number).trim() : null;
  const birthDate = body.birth_date ? String(body.birth_date).trim() : null;

  if (!email || !password) return json(400, { error: "email/password required" });

  // 1) crea utente in Auth
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr || !created?.user) {
    return json(400, { error: authErr?.message ?? "auth create failed" });
  }

  const authId = created.user.id;

  // 2) crea/aggiorna riga in public.users (ANTI-DOPPIONE)
  // Se esiste già (trigger o tentativo precedente) -> update, altrimenti insert
  const { error: dbErr } = await admin
    .from("users")
    .upsert(
      {
        auth_id: authId,
        email,
        name: name || email.split("@")[0],
        role,
        is_admin: isAdmin,
        phone_number: phoneNumber,
        birth_date: birthDate,
      },
      { onConflict: "auth_id" }
    );

  if (dbErr) {
    // Qui NON cancellare l'utente auth a prescindere: potresti aver già una riga users creata dal trigger
    return json(400, { error: dbErr.message });
  }

  return json(200, { ok: true, auth_id: authId });
}



    if (action === "set_role") {
      const authId = String(body.auth_id ?? "").trim();
      const role = normRole(body.role);
      if (!authId) return json(400, { error: "auth_id required" });

      const { error } = await admin.from("users").update({ role }).eq("auth_id", authId);
      if (error) return json(400, { error: error.message });

      return json(200, { ok: true });
    }

    if (action === "set_admin") {
      const authId = String(body.auth_id ?? "").trim();
      const isAdmin = !!body.is_admin;
      if (!authId) return json(400, { error: "auth_id required" });

      const { error } = await admin.from("users").update({ is_admin: isAdmin }).eq("auth_id", authId);
      if (error) return json(400, { error: error.message });

      return json(200, { ok: true });
    }


    
// SET PASSWORD - DELETE USER

if (action === "set_password") {
  const authId = String(body.auth_id ?? "").trim();
  const password = String(body.password ?? "").trim();
  const mustChange = !!body.must_change_password;

  if (!authId || !password) return json(400, { error: "auth_id/password required" });

  const { error: pwdErr } = await admin.auth.admin.updateUserById(authId, { password });
  if (pwdErr) return json(400, { error: pwdErr.message });

  // opzionale: se hai una colonna nel DB per forzare cambio password al primo login, aggiorna qui
  // await admin.from("users").update({ must_change_password: mustChange }).eq("auth_id", authId);

  return json(200, { ok: true, must_change_password: mustChange });
}

if (action === "delete_user") {
  const authId = String(body.auth_id ?? "").trim();
  if (!authId) return json(400, { error: "auth_id required" });

  // ⚠️ Se hai FK che impediscono delete, questa parte può fallire.
  // In tal caso ti faccio soft-delete, che è indistruttibile.
  const { error: dbErr } = await admin.from("users").delete().eq("auth_id", authId);
  if (dbErr) return json(400, { error: dbErr.message });

  const { error: authErr } = await admin.auth.admin.deleteUser(authId);
  if (authErr) return json(400, { error: authErr.message });

  return json(200, { ok: true });
}

if (action === "update_user") {
  const authId = String(body.auth_id ?? "").trim();
  if (!authId) return json(400, { error: "auth_id required" });

  const patch: any = {};

  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.email === "string") patch.email = body.email.trim().toLowerCase() || null;
  if (typeof body.role !== "undefined") patch.role = normRole(body.role);
  if (typeof body.is_admin === "boolean") patch.is_admin = !!body.is_admin;

  if (typeof body.phone_number === "string") patch.phone_number = body.phone_number.trim() || null;
  if (typeof body.birth_date === "string") patch.birth_date = body.birth_date.trim() || null;
  if (typeof body.avatar_url === "string") patch.avatar_url = body.avatar_url.trim() || null;

  // 1) aggiorna public.users
  if (Object.keys(patch).length) {
    const { error: dbErr } = await admin.from("users").update(patch).eq("auth_id", authId);
    if (dbErr) return json(400, { error: dbErr.message });
  }

  // 2) se cambia email, aggiorna anche auth
  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (email) {
      const { error: authErr } = await admin.auth.admin.updateUserById(authId, { email });
      if (authErr) return json(400, { error: authErr.message });
    }
  }

  return json(200, { ok: true });
}

    return json(400, { error: "unknown action" });
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) });
  }
});

