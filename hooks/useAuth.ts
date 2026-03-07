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

    // Timeout salvavita per reti lente o blocchi di Supabase
    const timeoutId = setTimeout(() => {
      if (!isSettled) {
        console.warn("useAuth: getSession timeout (8s), sblocco la UI senza ricaricare");
        isSettled = true;
        setLoading(false);
      }
    }, 8000);

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
