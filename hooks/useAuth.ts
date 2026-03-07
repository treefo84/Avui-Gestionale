import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSettled = false;

    // sessione iniziale
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error getting session:", error);
          if (error.message?.toLowerCase().includes("refresh token")) {
             console.warn("Refresh token expired or invalid, cleaning up session.");
             supabase.auth.signOut().catch(() => {});
             localStorage.clear();
             sessionStorage.clear();
          }
        }
        setSession(data?.session ?? null);
        setAuthUser(data?.session?.user ?? null);
      })
      .catch(err => {
        console.error("Failed to get session:", err);
      })
      .finally(() => {
        isSettled = true;
        setLoading(false);
      });

    // Timeout salvavita per veri deadlock di Supabase (connessioni molto lente o bug lock)
    const timeoutId = setTimeout(() => {
      if (!isSettled) {
        console.warn("useAuth: getSession DEADLOCK (12s). Fixing lock and reloading...");
        
        let authObj = null;
        let authKey = null;
        
        // Salviamo la sessione buona prima di piallare i locks rotti di Supabase
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                authKey = key;
                authObj = localStorage.getItem(key);
                break;
            }
        }

        localStorage.clear();
        sessionStorage.clear();

        if (authKey && authObj) {
            localStorage.setItem(authKey, authObj);
        }

        // Dobbiamo ricaricare la pagina per uccidere la Promise `getSession` rimasta appesa in background,
        // altrimenti anche le chiamate al DB (supabase.from(...)) si bloccheranno per sempre aspettando il token.
        window.location.reload();
      }
    }, 12000);

    // listener auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthUser(session?.user ?? null);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    authUser,
    isLoggedIn: !!authUser,
    loading,
  };
}
