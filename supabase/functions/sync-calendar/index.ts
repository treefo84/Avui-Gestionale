import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { targetUserId, title, description, startTime, endTime, eventId, action } = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Missing targetUserId" }), { status: 400, headers: corsHeaders });
    }

    // Recupera l'utente
    const { data: user, error: userError } = await supabaseClient
      .from("users")
      .select("google_provider_token, google_refresh_token, google_calendar_connected")
      .eq("auth_id", targetUserId)
      .single();

    if (userError || !user || !user.google_calendar_connected || !user.google_provider_token) {
      console.log("Utente non connesso a Google Calendar o token mancante.");
      return new Response(JSON.stringify({ message: "Utente non connesso a Google Calendar" }), { status: 200, headers: corsHeaders });
    }

    let accessToken = user.google_provider_token;

    // TODO: implementare refresh token se necessario, ma servirebbe GOOGLE_CLIENT_ID e SECRET
    // Al momento proveremo a usare l'access token esistente.

    if (action === "create" || action === "update") {
      const isAllDay = !startTime.includes('T');
      
      const gcalEvent = {
        summary: title,
        description: description,
        start: isAllDay ? { date: startTime } : { dateTime: startTime },
        end: isAllDay ? { date: endTime } : { dateTime: endTime },
      };

      const url = action === "create" 
        ? "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        : `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
        
      const method = action === "create" ? "POST" : "PUT";

      console.log(`Sending ${method} to GCal API...`);
      const response = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(gcalEvent)
      });

      const data = await response.json();
      console.log("Response from GCal:", data);

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to sync event to Google Calendar");
      }

      return new Response(JSON.stringify({ success: true, googleEventId: data.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else if (action === "delete") {
      if (!eventId) throw new Error("Missing eventId for deletion");
      
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Failed to delete event");
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });

  } catch (error: any) {
    console.error("Calendar Sync Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
