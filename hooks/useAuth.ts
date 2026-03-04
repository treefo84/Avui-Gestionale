import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionKilled, setSessionKilled] = useState(false);

  useEffect(() => {
    let isSettled = false;

    // sessione iniziale
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Error getting session:", error);
      }
      setSession(data?.session ?? null);
      setAuthUser(data?.session?.user ?? null);
    }).catch(err => {
      console.error("Failed to get session:", err);
    }).finally(() => {
      isSettled = true;
      setLoading(false);
    });

    // Timeout di emergenza: in rari casi getSession si blocca infinitamente
    const timeoutId = setTimeout(() => {
      if (!isSettled) {
        console.warn("useAuth: getSession timeout, forcing app load and clearing cache");
        
        // Se il getSession si congela, è molto probabile che la sessione locale sia corrotta.
        // Forziamo il logout per sbloccare l'utente in modo definitivo.
        supabase.auth.signOut().catch(e => console.error("Timeout SignOut Error:", e));
        localStorage.clear();
        sessionStorage.clear();

        setSession(null);
        setAuthUser(null);
        setSessionKilled(true);
        setLoading(false);
      }
    }, 2000);

    // listener auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession((prev) => sessionKilled ? null : session);
      setAuthUser((prev) => sessionKilled ? null : (session?.user ?? null));
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return {
    session: sessionKilled ? null : session,
    authUser: sessionKilled ? null : authUser,
    isLoggedIn: !sessionKilled && !!authUser,
    loading,
  };
}
