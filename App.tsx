import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./hooks/useAuth";

import {
  Activity,
  Assignment,
  AssignmentStatus,
  Availability,
  AvailabilityStatus,
  Boat,
  BoatType,
  CalendarEvent,
  ConfirmationStatus,
  DayNote,
  GeneralEvent,
  MaintenanceRecord,
  MaintenanceStatus,
  NotificationType,
  Role,
  User,
  UserNotification,
} from "./types";
import { sendNotificationEmail } from "./services/emailService";

import { DayModal } from "./components/DayModal";
import { DayHoverModal } from "./components/DayHoverModal";
import { UserManagementModal } from "./components/UserManagementModal";
import { ProfilePage } from "./components/ProfilePage";
import { FleetManagementPage } from "./components/FleetManagementPage";
import { CalendarGrid } from "./components/CalendarGrid";
import { Navbar } from "./components/Navbar";
import { ModalsLayer } from "./components/ModalsLayer";
import { CalendarHeader } from "./components/CalendarHeader";
import { AppNavbar } from "./components/AppNavbar";
import { NoticeBoard } from "./components/NoticeBoard";
import { NextAssignmentsBox } from "./components/NextAssignmentsBox";




import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInDays,
  eachDayOfInterval,
  format,
  isBefore,
  isSameDay,
  isWeekend,
} from "date-fns";
import { it } from "date-fns/locale";

import {
  AlertTriangle,
  Anchor,
  Bell,
  CalendarDays,
  CalendarRange,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageCircle,
  PartyPopper,
  Ship,
  Users as UsersIcon,
  Wrench,
  X,
} from "lucide-react";

type DbUserRow = {
  id: string;
  auth_id: string;
  email: string | null;
  name?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  avatar_url?: string | null;
  phone_number?: string | null;
  birth_date?: string | null;
  google_calendar_connected?: boolean | null;
};

const DEV = import.meta.env.DEV;
if (DEV) console.log("...");



const parseDate = (dateString?: string | null) => {
  if (!dateString) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const safe = String(dateString).slice(0, 10);
  const [year, month, day] = safe.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const NotificationToast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}) => (
  <div className="fixed bottom-6 right-6 z-[100] bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 max-w-md">
    <div
      className={`rounded-full p-1 text-slate-900 shrink-0 ${type === "error" ? "bg-rose-500" : "bg-green-500"
        }`}
    >
      {type === "error" ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
    </div>
    <div>
      <p className="text-sm font-medium">{message}</p>
    </div>
    <button onClick={onClose} className="ml-2 hover:bg-slate-700 p-1 rounded-full">
      <X size={14} />
    </button>
  </div>
);

const AvailabilityWarningModal = ({
  nextMonthName,
  onClose,
}: {
  nextMonthName: string;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center border-2 border-amber-400"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Attenzione Marinaio!</h2>
      <p className="text-slate-600 mb-6">
        Non hai ancora dato la disponibilità per <strong>{nextMonthName}</strong>.
        <br />
        Senza disponibilità, non verrai assegnato a nessuna barca!
      </p>
      <button
        onClick={onClose}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
      >
        Ho capito, provvedo subito!
      </button>
    </div>
  </div>
);

const normalizeRole = (input: any): Role => {
  const r = String(input ?? "HELPER").trim().toUpperCase();

  // italiani -> canonici
  if (r === "AIUTANTE" || r === "MOZZO") return Role.HELPER;
  if (r === "COMANDANTE" || r === "ISTRUTTORE") return Role.INSTRUCTOR;

  // canonici
  if (r === "HELPER") return Role.HELPER;
  if (r === "INSTRUCTOR") return Role.INSTRUCTOR;
  if (r === "MANAGER") return Role.MANAGER;

  // Riserva
  if (r === "RISERVA" || r === "RESERVE") return Role.RESERVE;

  return Role.HELPER;
};

const syncGoogleCalendarEvent = async (payload: { targetUserId: string, title: string, description: string, startTime: string, endTime: string, action: 'create' | 'update' | 'delete', eventId?: string }) => {
  try {
    const { error } = await supabase.functions.invoke('sync-calendar', {
      body: payload
    });
    if (error) console.error("[Google Calendar Sync Error]:", error);
  } catch (err) {
    console.error("[Google Calendar Sync Exception]:", err);
  }
};

const App: React.FC = () => {
  // --- AUTH ---
  const { session, isLoggedIn, loading } = useAuth();
  const sessionUser = session?.user ?? null;
  const currentUserId = sessionUser?.id ?? null;

  // --- DB USER ---
  const [dbUser, setDbUser] = useState<DbUserRow | null>(null);

  // --- UI STATE ---
  const [appReady, setAppReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [notificationToast, setNotificationToast] = useState<any>(null);
  const [showAvailabilityAlert, setShowAvailabilityAlert] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isFleetManagementOpen, setIsFleetManagementOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMaintenanceHubOpen, setIsMaintenanceHubOpen] = useState(false);
  const [selectedBoatIdForPage, setSelectedBoatIdForPage] = useState<string | null>(null);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // app data
  const [users, setUsers] = useState<User[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedCalendarEvents, setSelectedCalendarEvents] = useState<CalendarEvent[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [availabilitiesLoaded, setAvailabilitiesLoaded] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [generalEvents, setGeneralEvents] = useState<GeneralEvent[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);

  const toUuidOrNull = (v: any) => {
    const s = String(v ?? "").trim();
    return s.length ? s : null;
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED')) {
        // Se c'è un provider_token (ovvero l'utente ha fatto login/link con Google in questo esatto istante)
        if (session.provider_token) {
          try {
            await supabase.from('users').update({
              google_provider_token: session.provider_token,
              google_refresh_token: session.provider_refresh_token,
              google_calendar_connected: true
            }).eq('auth_id', session.user.id);
            console.log("Tokens Google salvati nel database.");
          } catch (err) {
            console.error("Errore nel salvataggio dei token Google:", err);
          }
        }
      }
    });

    // Se trovi errori di refresh token, ti conviene forzare signOut (vedi sotto)
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // “scudo”: se la sessione è rotta, esci e ripulisci
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error?.message?.toLowerCase().includes("refresh token")) {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
      }
    })();
  }, []);


  // --- DEBUG STATE calendarEvents ---

  useEffect(() => {
    console.log("[ASSIGNMENTS][STATE] len:", assignments.length);
    if (assignments[0]) console.log("[ASSIGNMENTS][STATE] first:", assignments[0]);
  }, [assignments]);


  // ✅ currentUser: fallback se dbUser non è ancora arrivato
  const currentUser: User | null = useMemo(() => {
    if (!sessionUser) return null;

    const fallback: User = {
      id: sessionUser.id,
      name: sessionUser.email ? sessionUser.email.split("@")[0] : "utente",
      email: sessionUser.email ?? "",
      role: Role.HELPER,
      isAdmin: false,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${sessionUser.email ?? sessionUser.id}`,
      mustChangePassword: false,
      googleCalendarConnected: false,
      username: sessionUser.email ? sessionUser.email.split("@")[0] : "utente",
      password: "",
    };

    if (!dbUser) return fallback;

    return {
      id: dbUser.auth_id ?? fallback.id,
      name: dbUser.name ?? fallback.name,
      email: dbUser.email ?? fallback.email,
      role: normalizeRole(dbUser.role ?? fallback.role),
      isAdmin: !!dbUser.is_admin,
      avatar: dbUser.avatar_url ?? fallback.avatar,
      birthDate: (dbUser as any).birth_date ? String((dbUser as any).birth_date).slice(0, 10) : "",
    } as any;
  }, [dbUser, sessionUser?.id, sessionUser?.email]);



  useEffect(() => setAppReady(true), []);

  const assignmentsByBoat = useMemo(() => {
    const m = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const arr = m.get(a.boatId) ?? [];
      arr.push(a);
      m.set(a.boatId, arr);
    }
    // ordina per data
    for (const [k, arr] of m.entries()) {
      arr.sort((x, y) => x.date.localeCompare(y.date));
      m.set(k, arr);
    }
    return m;
  }, [assignments]);


  // --- GET OR CREATE dbUser ---

  async function callAdminUsersFn(token: string, payload: any) {
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;

    console.log("[ADMIN FN CALL]", payload);

    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log("[ADMIN FN RESPONSE STATUS]", res.status);
    console.log("[ADMIN FN RESPONSE TEXT]", text);

    let json: any = null;
    try { json = JSON.parse(text); } catch { }

    // ✅ questi due non devono MAI essere undefined
    return { ok: res.ok, status: res.status, text, json };
  }

  const lastUidRef = useRef<string | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    const uid = session?.user?.id ?? null;
    const mail = session?.user?.email ?? null;

    if (!uid) {
      setDbUser(null);
      return;
    }

    let cancelled = false;

    (async () => {
      // 1) prova a leggere SEMPRE dal DB (così vedi subito role/is_admin aggiornati)
      const { data: existing, error: selErr } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", uid)
        .maybeSingle();

      if (cancelled) return;

      if (selErr) {
        console.error("GET-OR-CREATE select ERROR:", selErr);
        return;
      }

      if (existing) {
        setDbUser(existing);
        return;
      }



      // 2) se non esiste, crealo con default sensati
      const payload = { auth_id: uid, email: mail, role: "HELPER", is_admin: false };


      const { data: created, error: insErr } = await supabase
        .from("users")
        .insert(payload)
        .select("*")
        .single();

      if (cancelled) return;

      if (insErr) {
        console.error("GET-OR-CREATE insert ERROR:", insErr);
        return;
      }

      setDbUser(created);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.email]);

  useEffect(() => {
    if (!DEV) return;
    if (!dbUser) return;
    console.log("DB USER role/is_admin:", dbUser.role, dbUser.is_admin);
  }, [dbUser, DEV]);




  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (!uid) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", uid)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("[REFRESH dbUser] error:", error);
        return;
      }
      if (data) setDbUser(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, isLoggedIn]);



  // 2) dbUser -> users[] (interno)

  useEffect(() => {
    if (!isLoggedIn) return;
    loadUsersFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, dbUser?.id]);



  useEffect(() => {
    if (!isNotificationOpen) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = notificationPanelRef.current;
      if (!el) return;

      const target = e.target as Node | null;
      if (!target) return;

      // se clicco DENTRO al pannello, non chiudo
      if (el.contains(target)) return;

      // altrimenti chiudo
      setIsNotificationOpen(false);
    };

    // pointerdown è più affidabile (chiude subito, anche su touch)
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isNotificationOpen]);



  // --- Toast auto hide ---
  useEffect(() => {
    if (!notificationToast) return;
    const timer = setTimeout(() => setNotificationToast(null), 4000);
    return () => clearTimeout(timer);
  }, [notificationToast]);

  const nextMonthDate = addMonths(new Date(), 1);

  const checkForBirthdays = () => {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    const birthdayUsers = users.filter((u) => {
      if (!u.birthDate) return false;
      const bdate = parseDate(u.birthDate);
      return bdate.getMonth() === todayMonth && bdate.getDate() === todayDay;
    });

    if (birthdayUsers.length > 0) {
      setNotifications((prev) => {
        const newNotifs: UserNotification[] = [];

        birthdayUsers.forEach((u) => {
          const msg = `🎉 Oggi è il compleanno di ${u.name}! Tanti auguri! 🎂`;
          if (!prev.some((n) => n.message === msg && n.type === NotificationType.INFO)) {
            users.forEach((recipient) => {
              newNotifs.push({
                id: crypto.randomUUID(),
                userId: recipient.id,
                type: NotificationType.INFO,
                message: msg,
                read: false,
                createdAt: Date.now(),
              });
            });
          }
        });

        if (newNotifs.length > 0) return [...newNotifs, ...prev];
        return prev;
      });
    }
  };


  const hasNextMonthAvailability = (userId: string, avs: Availability[]) => {
    const nextMonth = addMonths(new Date(), 1);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth();

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const days = eachDayOfInterval({ start, end });
    const weekends = days.filter(d => isWeekend(d));

    // basta almeno 1 entry nel mese prossimo (come facevi già tu)
    return weekends.some((day) => {
      const dStr = format(day, "yyyy-MM-dd");
      return avs.some((a) => a.userId === userId && String(a.date).slice(0, 10) === dStr);
    });
  };


  const checkNextMonthAvailability = () => {
    if (!currentUser) return;

    // MANAGER: non devono compilare -> niente popup
    const role = String(currentUser.role ?? "").toUpperCase();
    if (role === "MANAGER") return;

    const next = addMonths(new Date(), 1);
    const year = next.getFullYear();
    const month = next.getMonth();

    const startNextMonth = new Date(year, month, 1);
    const endNextMonth = new Date(year, month + 1, 0);

    // se vuoi SOLO weekend:
    const daysInNextMonth = eachDayOfInterval({ start: startNextMonth, end: endNextMonth });
    const targetDays = daysInNextMonth.filter(d => isWeekend(d));

    // almeno una disponibilità nel mese successivo (solo weekend)
    const hasEntries = targetDays.some((day) => {
      const dStr = format(day, "yyyy-MM-dd");
      return availabilities.some((a) => a.userId === currentUser.id && a.date === dStr);
    });

    setShowAvailabilityAlert(!hasEntries && targetDays.length > 0);
  };



  const checkMaintenanceExpirations = () => {
    if (!currentUser?.isAdmin) return;

    const expiringRecords = maintenanceRecords.filter((r) => {
      if (!r.expirationDate || r.status === MaintenanceStatus.DONE) return false;
      const daysLeft = differenceInDays(parseDate(r.expirationDate), new Date());
      return daysLeft <= 30 && daysLeft >= 0;
    });

    if (expiringRecords.length > 0) {
      const record = expiringRecords[0];
      const boat = boats.find(b => b.id === record.boatId);
      const moreCount = expiringRecords.length - 1;

      setTimeout(() => {
        setNotificationToast({
          message: `⚠️ Manutenzione in scadenza: "${record.description}" su ${boat?.name}${moreCount > 0 ? ` (+${moreCount} altri)` : ""
            }`,
          type: "error",
        });
      }, 800);
    }
  };

  const ensureMaintenanceExpiringNotifications = async () => {
    if (!currentUser?.isAdmin) return;
    if (!maintenanceRecords.length) return;

    const today = new Date();

    // prendo solo record con scadenza nei prossimi 30 giorni (incluso oggi), non già DONE
    const expiring = maintenanceRecords.filter((r) => {
      if (!r.expirationDate) return false;
      if (r.status === MaintenanceStatus.DONE) return false;

      const daysLeft = differenceInDays(parseDate(r.expirationDate), today);
      return daysLeft >= 0 && daysLeft <= 30;
    });

    if (!expiring.length) return;

    // preparo payload notifiche: 1 per record, con ref_key unico
    const nowIso = new Date().toISOString();

    const rows = expiring.map((r) => {
      const boatName = boatsById.get(r.boatId)?.name ?? "Barca";
      const daysLeft = differenceInDays(parseDate(r.expirationDate!), today);

      const refKey = `MAINT_EXP_30D:${r.id}:${String(r.expirationDate).slice(0, 10)}`;

      return {
        user_id: currentUser.id,
        type: "MAINTENANCE_EXPIRING",
        ref_key: refKey,
        message: `⚠️ Manutenzione in scadenza: "${r.description}" su ${boatName} (tra ${daysLeft} gg)`,
        read: false,
        data: {
          recordId: r.id,
          boatId: r.boatId,
          expirationDate: String(r.expirationDate).slice(0, 10),
          daysLeft,
        },
        created_at: nowIso,
      };
    });

    // upsert: se esiste già (grazie all'indice unique), non duplica
    const { error } = await supabase
      .from("notifications")
      .upsert(rows, { onConflict: "user_id,type,ref_key" });

    if (error) {
      console.error("[MAINT][NOTIFS] upsert error:", error);
      return;
    }

    console.log("[MAINT][NOTIF] rows to upsert", rows);

    // ricarico le notifiche così le vedi subito in campanella
    await loadNotificationsFromDb();
  };

  // ✅ LOAD DATI (UNA SOLA VOLTA, non duplicata)
  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    (async () => {
      // BOATS
      const { data: boatsData, error: boatsErr } = await supabase
        .from("boats")
        .select("id,name,type,image")
        .order("name", { ascending: true });

      if (!cancelled) {
        if (boatsErr) console.error("[LOAD boats] error:", boatsErr);
        else {
          setBoats(
            (boatsData ?? []).map((b: any) => {
              const raw = String(b.type ?? "").trim().toUpperCase();
              const normalizedType =
                raw === "VELA"
                  ? "VELA"
                  : raw === "MOTORE"
                    ? "MOTORE"
                    : raw.includes("VEL")
                      ? "VELA"
                      : raw.includes("MOT")
                        ? "MOTORE"
                        : "VELA";

              return { id: b.id, name: b.name, type: normalizedType, image: b.image ?? "" } as any;
            })
          );
        }
      }

      // ACTIVITIES
      const { data: actsData, error: actsErr } = await supabase
        .from("activities")
        .select("*")
        .order("name", { ascending: true });

      if (!cancelled) {
        if (actsErr) console.error("[LOAD activities] error:", actsErr);
        else {
          const mappedActs = (actsData ?? []).map((a: any) => ({
            ...a,
            allowedBoatTypes: Array.isArray(a.allowedBoatTypes)
              ? a.allowedBoatTypes
              : Array.isArray(a.allowed_boat_types)
                ? a.allowed_boat_types
                : [],
            defaultDurationDays: a.defaultDurationDays ?? a.default_duration_days ?? 1,
            isGeneral: a.isGeneral ?? a.is_general ?? false,
          }));
          setActivities(mappedActs);
        }
      }

      // AVAILABILITIES
      const { data: avRows, error: avErr } = await supabase
        .from("availabilities")
        .select("*")
        .order("date", { ascending: true });

      if (!cancelled) {
        if (avErr) console.error("[LOAD availabilities] error:", avErr);
        else {
          setAvailabilities(
            (avRows ?? []).map((r: any) => ({
              userId: r.user_id,
              date: String(r.date).slice(0, 10),
              status: r.status as AvailabilityStatus,
            }))
          );
          setAvailabilitiesLoaded(true);

        }
      }

      // ASSIGNMENTS
      const { data: asgRows, error: asgErr } = await supabase
        .from("assignments")
        .select("*")
        .order("start_date", { ascending: true });

      console.log("[ASSIGNMENTS][LOAD] rows:", (asgRows ?? []).length);
      console.log("[ASSIGNMENTS][LOAD] error:", asgErr);
      if ((asgRows ?? [])[0]) console.log("[ASSIGNMENTS][LOAD] sample:", (asgRows as any[])[0]);


      if (!cancelled) {
        if (asgErr) console.error("[LOAD assignments] error:", asgErr);
        else {
          setAssignments(
            (asgRows ?? []).map((r: any) => ({
              id: r.id,
              date: String(r.start_date ?? r.date).slice(0, 10),
              boatId: r.boat_id,
              instructorId: r.instructor_id ?? null,
              helperId: r.helper_id ?? null,
              activityId: r.activity_id ?? null,
              durationDays: r.duration_days ?? 1,
              status: (r.status as AssignmentStatus) ?? AssignmentStatus.CONFIRMED,
              instructorStatus: r.instructor_status ?? undefined,
              helperStatus: r.helper_status ?? undefined,
              notes: r.notes ?? undefined,

            }))

          );
        }
      }

      // DAY NOTES
      const { data: notesData, error: notesErr } = await supabase
        .from("day_notes")
        .select("*")
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (notesErr) console.error("[LOAD day_notes] error:", notesErr);
        else {
          setDayNotes(
            (notesData ?? []).map((r: any) => ({
              id: r.id,
              date: String(r.date).slice(0, 10),
              userId: r.user_id,
              text: r.text,
              createdAt: new Date(r.created_at).getTime(),
            }))
          );
        }
      }

      // CALENDAR EVENTS
      const { data: eventsData, error: evErr } = await supabase
        .from("calendar_events")
        .select("*, calendar_event_participants(user_id)")
        .order("start_date", { ascending: true });

      if (!cancelled) {
        if (evErr) console.error("[LOAD calendar_events] error:", evErr);
        else {
          const mapped: CalendarEvent[] = (eventsData ?? []).map((r: any) => ({
            id: r.id,
            boatId: r.boat_id,
            title: r.title,
            startDate: String(r.start_date).slice(0, 10),
            endDate: String(r.end_date ?? r.start_date).slice(0, 10),
            type: r.type ?? null,
            activityId: r.activity_id ?? null,
            createdBy: r.created_by ?? null,
            createdAt: r.created_at ?? null,
            startTime: r.start_time ?? null,
            endTime: r.end_time ?? null,
            recurrenceRule: r.recurrence_rule ?? null,
            recurrenceEndDate: r.recurrence_end_date ?? null,
            participants: r.calendar_event_participants?.map((p: any) => p.user_id) || [],
          }));
          setCalendarEvents(mapped);
          if (mapped.length) console.log("[A3][LOAD sample mapped]", mapped[0]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);



  // carico eventi generali quando loggato + quando cambia la lista utenti (per avere responses coerenti)
  useEffect(() => {
    if (!isLoggedIn) return;
    loadGeneralEventsFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, users.length]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id) return;

    // 1) load iniziale
    loadNotificationsFromDb(currentUser.id);


    // 2) realtime
    const channel = supabase
      .channel(`notifications-live:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          loadNotificationsFromDb(currentUser.id);

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, currentUser?.id]);



  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    checkNextMonthAvailability();
    checkMaintenanceExpirations();
    checkForBirthdays();
    ensureMaintenanceExpiringNotifications
  }, [isLoggedIn, currentUser?.id, currentUser?.role, boats.length, maintenanceRecords.length, availabilities.length, users.length]);

  // --- ACTIONS ---
  const handleLogout = async () => {
    await supabase.auth.signOut();

    setSelectedDate(null);
    setIsProfileOpen(false);
    setIsUserManagementOpen(false);
    setIsFleetManagementOpen(false);
    setIsMaintenanceHubOpen(false);
    setIsNotificationOpen(false);
    setShowAvailabilityAlert(false);

    setDbUser(null);
    setUsers([]);
  };

  const handleUpdateAvailability = async (newAvailability: Availability) => {
    setAvailabilities((prev) => {
      // Se lo stato è UNKNOWN, lo rimuoviamo dallo stato locale
      if (newAvailability.status === AvailabilityStatus.UNKNOWN) {
        return prev.filter(
          (a) => !(a.userId === newAvailability.userId && a.date === newAvailability.date)
        );
      }

      const idx = prev.findIndex(
        (a) => a.userId === newAvailability.userId && a.date === newAvailability.date
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newAvailability;
        return copy;
      }
      return [...prev, newAvailability];
    });

    if (newAvailability.status === AvailabilityStatus.UNKNOWN) {
      const { error } = await supabase
        .from("availabilities")
        .delete()
        .match({ user_id: newAvailability.userId, date: newAvailability.date });

      if (error) {
        console.error("[DELETE availabilities] error:", error);
        setNotificationToast({ message: "Errore reset disponibilità (DB).", type: "error" });
      }
      return;
    }

    const payload = {
      user_id: newAvailability.userId,
      date: newAvailability.date,
      status: newAvailability.status,
    };

    const { error } = await supabase
      .from("availabilities")
      .upsert(payload, { onConflict: "user_id,date" })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[UPSERT availabilities] error:", error, payload);
      setNotificationToast({ message: "Errore salvataggio disponibilità (DB).", type: "error" });
    }
  };

  const handleToggleRole = async (userId: string) => {
    if (userId === currentUserId) return;

    const u = users.find((x) => x.id === userId);
    if (!u) return;

    let newRole: Role = Role.HELPER;
    if (u.role === Role.HELPER) newRole = Role.INSTRUCTOR;
    else if (u.role === Role.INSTRUCTOR) newRole = Role.MANAGER;
    else if (u.role === Role.MANAGER) newRole = Role.HELPER;

    // usa il tuo handleUpdateUser "vero" (quello che scrive su DB / edge function)
    await handleUpdateUser(userId, { role: newRole });
  };


  // ---- helper: chiama la Edge Function admin-users e logga la risposta ----
  async function callAdminFn(payload: any, token: string) {
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;

    console.log("[ADMIN FN CALL]", payload);

    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log("[ADMIN FN RESPONSE STATUS]", res.status);
    console.log("[ADMIN FN RESPONSE TEXT]", text);

    let json: any = null;
    try { json = JSON.parse(text); } catch { }

    return { res, text, json };
  }



  // App.tsx

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const authId = userId;

      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;

      if (sessErr || !token) {
        setNotificationToast({ message: "Sessione non disponibile.", type: "error" });
        return;
      }

      // 1) update_user (NO role qui dentro)
      const profilePayload: any = { action: "update_user", auth_id: authId };

      if (typeof updates.name === "string") profilePayload.name = updates.name;
      if (typeof updates.email === "string") profilePayload.email = updates.email;
      if (typeof updates.isAdmin === "boolean") profilePayload.is_admin = updates.isAdmin;
      if (typeof updates.phoneNumber === "string") profilePayload.phone_number = updates.phoneNumber;
      if (typeof updates.birthDate === "string") profilePayload.birth_date = updates.birthDate;
      if (typeof updates.avatar === "string") profilePayload.avatar_url = updates.avatar;
      if (typeof updates.isAdmin === "boolean") {
        const r = await callAdminUsersFn(token, {
          action: "set_admin",
          auth_id: authId,
          is_admin: updates.isAdmin,
        });

        if (!r.ok) {
          setNotificationToast({
            message: r.json?.error
              ? `Errore admin: ${r.json.error}`
              : (r.text || `Errore set_admin (HTTP ${r.status})`),
            type: "error",
          });
          return;
        }

        console.log("[SET_ADMIN][DB RETURNED]", r.json?.user);
      }

      const hasProfilePatch = Object.keys(profilePayload).length > 2;
      if (hasProfilePatch) {
        const r = await callAdminUsersFn(token, profilePayload);
        if (!r.ok) {
          setNotificationToast({
            message: r.json?.error ? `Errore utente: ${r.json.error}` : `Errore update_user (HTTP ${r.status}): ${r.text}`,
            type: "error",
          });
          return;
        }
      }

      // 2) set_role (se richiesto)
      if (typeof (updates as any).role !== "undefined") {
        const r = await callAdminUsersFn(token, {
          action: "set_role",
          auth_id: authId,
          role: (updates as any).role,
        });

        if (!r.ok) {
          setNotificationToast({
            message: r.json?.error
              ? `Errore ruolo: ${r.json.error}`
              : `Errore set_role (HTTP ${r.status}): ${r.text}`,
            type: "error",
          });
          return;
        }
      }

      // 3) set_password (se richiesto)
      const passRaw = (updates as any)?.password;
      const newPass = typeof passRaw === "string" ? passRaw.trim() : "";
      if (newPass.length) {
        const r = await callAdminUsersFn(token,
          {
            action: "set_password",
            auth_id: authId,
            password: newPass,
            must_change_password: !!(updates as any).mustChangePassword,
          }
        );

        if (!r.ok) {
          setNotificationToast({
            message: r.json?.error ? `Errore password: ${r.json.error}` : `Errore set_password (HTTP ${r.status}): ${r.text}`,
            type: "error",
          });
          return;
        }
      }

      await loadUsersFromDb();
      setNotificationToast({ message: "Utente aggiornato ✅", type: "success" });
    } catch (e) {
      console.error("[USERS][update] unexpected:", e);
      setNotificationToast({ message: "Errore inatteso aggiornamento utente.", type: "error" });
    }
  };


  const handleUpdateAssignment = async (newAssignment: Assignment) => {
    // UI ottimistica
    setAssignments((prev) => {
      const existingById = prev.findIndex((a) => a.id === newAssignment.id);
      if (existingById >= 0) {
        const updated = [...prev];
        updated[existingById] = newAssignment;
        return updated;
      }
      const existingByKey = prev.findIndex(
        (a) => a.boatId === newAssignment.boatId && a.date === newAssignment.date
      );
      if (existingByKey >= 0) {
        const updated = [...prev];
        updated[existingByKey] = newAssignment;
        return updated;
      }
      return [...prev, newAssignment];
    });

    const payload = {
      id: newAssignment.id,
      boat_id: newAssignment.boatId,
      date: newAssignment.date,
      start_date: newAssignment.date,
      instructor_id: toUuidOrNull(newAssignment.instructorId),
      helper_id: toUuidOrNull(newAssignment.helperId),
      activity_id: toUuidOrNull(newAssignment.activityId),
      duration_days: newAssignment.durationDays ?? 1,
      status: newAssignment.status ?? AssignmentStatus.CONFIRMED,
      instructor_status: newAssignment.instructorId ? (newAssignment.instructorStatus ?? "PENDING") : null,
      helper_status: newAssignment.helperStatus ?? null,
      notes: newAssignment.notes ?? null,
    };
    console.log("[ASSIGNMENTS][SAVE] payload:", payload);


    const { data, error } = await supabase
      .from("assignments")
      .upsert(payload, { onConflict: "boat_id,date" })
      .select("*")
      .single();

    if (data?.id) {
      const { data: checkRow, error: checkErr } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();

      console.log("[ASSIGNMENTS][VERIFY] row:", checkRow);
      console.log("[ASSIGNMENTS][VERIFY] err:", checkErr);
    }


    console.log("[ASSIGNMENTS][SAVE] result data:", data);
    console.log("[ASSIGNMENTS][SAVE] result error:", error);


    if (error || !data) {
      console.error("[UPSERT assignments] error:", error, payload);

      const msg =
        error?.code === "23505"
          ? "🚫 Questa persona è già assegnata a un’altra barca in quella data."
          : "Errore salvataggio missione (DB).";

      setNotificationToast({ message: msg, type: "error" });
      return;
    }


    // --- CREA NOTIFICHE (richiesta conferma incarico) ---
    try {
      const instructorId = toUuidOrNull(newAssignment.instructorId);
      const helperId = toUuidOrNull(newAssignment.helperId);

      const notifsToCreate: any[] = [];
      const nowIso = new Date().toISOString();

      if (instructorId) {
        const refKey = `ASSIGNMENT_REQUEST:${newAssignment.id}:INSTRUCTOR`;
        notifsToCreate.push({
          user_id: instructorId,
          type: NotificationType.ASSIGNMENT_REQUEST,
          ref_key: refKey,
          message: `Nuovo incarico come COMANDANTE il ${newAssignment.date}`,
          read: false,
          data: { assignmentId: newAssignment.id, role: "INSTRUCTOR" },
          created_at: nowIso,
        });
      }

      if (helperId) {
        const refKey = `ASSIGNMENT_REQUEST:${newAssignment.id}:HELPER`;
        notifsToCreate.push({
          user_id: helperId,
          type: NotificationType.ASSIGNMENT_REQUEST,
          ref_key: refKey,
          message: `Nuovo incarico come AIUTANTE il ${newAssignment.date}`,
          read: false,
          data: { assignmentId: newAssignment.id, role: "HELPER" },
          created_at: nowIso,
        });
      }

      if (notifsToCreate.length) {
        // upsert = se esiste già (grazie all'indice unique) non duplica
        const { error: nErr } = await supabase
          .from("notifications")
          .upsert(notifsToCreate, { onConflict: "user_id,type,ref_key" });

        if (nErr) console.error("[A13][UPSERT notifications] error:", nErr);
        else {
          Promise.allSettled(
            notifsToCreate.map(async (notif) => {
              const u = users.find(x => x.id === notif.user_id);
              if (u?.email) {
                await sendNotificationEmail({
                  to: u.email,
                  subject: `Nuova Avui Notifica: ${notif.message}`,
                  html: `<p>Ciao ${u.name},</p><p>${notif.message}</p><p>Accedi all'app per maggiori dettagli.</p>`
                });
              }
            })
          ).catch(e => console.error("Email send error", e));

          // refresh UI locale solo se la notifica è per ME
          await loadNotificationsFromDb();
        }
      }
    } catch (e) {
      console.error("[A13][UPSERT notifications] unexpected:", e);
    }



    // riallineo state con riga DB (stabile)
    const saved: Assignment = {
      id: data.id,
      date: String(data.start_date ?? data.date).slice(0, 10),
      boatId: data.boat_id,
      instructorId: data.instructor_id ?? null,
      helperId: data.helper_id ?? null,
      activityId: data.activity_id ?? null,
      durationDays: data.duration_days ?? 1,
      status: (data.status as AssignmentStatus) ?? AssignmentStatus.CONFIRMED,
      instructorStatus: data.instructor_status ?? undefined,
      helperStatus: data.helper_status ?? undefined,
      notes: data.notes ?? undefined,
    };

    setAssignments((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      const idx2 = prev.findIndex((a) => a.boatId === saved.boatId && a.date === saved.date);
      if (idx2 >= 0) {
        const copy = [...prev];
        copy[idx2] = saved;
        return copy;
      }
      return [...prev, saved];
    });

    console.log("[UPSERT assignments] ok:", saved);
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questa missione?")) return;

    setAssignments((prev) => prev.filter((a) => a.id !== id));
    setNotificationToast({ message: "Missione eliminata dal registro.", type: "error" });

    const { error } = await supabase.from("assignments").delete().eq("id", id);

    if (error) {
      console.error("[DELETE assignments] error:", error, { id });
      setNotificationToast({ message: "Errore eliminazione missione (DB).", type: "error" });
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    // UI subito
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    // DB
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) console.error("[A8][UPDATE notifications read] error:", error);
  };

  const handleEventResponse = async (notification: UserNotification, isAccepted: boolean) => {
    if (!currentUser) return;

    const eventId = notification.data?.eventId;
    if (!eventId) return;

    const newStatus = isAccepted ? ConfirmationStatus.CONFIRMED : ConfirmationStatus.REJECTED;

    const { error } = await supabase
      .from("general_event_responses")
      .upsert(
        {
          event_id: eventId,
          user_id: currentUser.id,
          status: newStatus,
        },
        { onConflict: "event_id,user_id" }
      );

    if (error) {
      console.error("[A8][UPSERT general_event_responses] error:", error);
      setNotificationToast({ message: "Errore risposta invito", type: "error" });
      return;
    }

    await handleMarkNotificationRead(notification.id);

    // reload per vedere subito i conteggi nel DayModal
    await loadGeneralEventsFromDb();
    await loadNotificationsFromDb();

    // Sincronizzazione Google Calendar
    if (isAccepted && currentUser?.googleCalendarConnected) {
      const gEvent = generalEvents.find((e) => e.id === eventId);
      if (gEvent) {
        const activity = activities.find((a) => a.id === gEvent.activityId);

        let startStr = gEvent.date;
        let endStr = gEvent.date;

        if (gEvent.startTime && gEvent.endTime) {
          startStr = `${gEvent.date}T${gEvent.startTime}:00`;
          endStr = `${gEvent.date}T${gEvent.endTime}:00`;
        }

        syncGoogleCalendarEvent({
          targetUserId: currentUser.id,
          title: `Evento: ${activity?.name || "Avui"}`,
          description: gEvent.notes || "Evento in Base Nautica",
          startTime: startStr,
          endTime: endStr,
          action: 'create'
        });
      }
    }

    setNotificationToast({
      message: isAccepted ? "Partecipazione confermata!" : "Invito declinato.",
      type: "success",
    });
  };


  const handleAssignmentResponse = async (notif: UserNotification, accepted: boolean) => {
    const assignmentId = (notif as any)?.data?.assignmentId ?? (notif as any)?.data?.assignment_id;
    const role = (notif as any)?.data?.role; // "INSTRUCTOR" | "HELPER"

    if (!assignmentId || !role) {
      console.error("[A14] notif missing assignmentId/role", notif);
      return;
    }

    setIsNotificationOpen(false);
    await loadNotificationsFromDb();


    const newStatus = accepted ? "CONFIRMED" : "REJECTED";

    // 1) UI ottimistica: aggiorno assignments state
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== assignmentId) return a;

        if (role === "INSTRUCTOR") return { ...a, instructorStatus: newStatus as any };
        if (role === "HELPER") return { ...a, helperStatus: newStatus as any };

        return a;
      })
    );

    // 2) DB: aggiorno la colonna giusta su assignments
    const patch =
      role === "INSTRUCTOR"
        ? { instructor_status: newStatus }
        : { helper_status: newStatus };

    const { error: rpcErr } = await supabase.rpc("respond_assignment", {
      p_assignment_id: assignmentId,
      p_status: accepted ? "CONFIRMED" : "REJECTED",
    });

    if (rpcErr) {
      console.error("[ASSIGNMENT][RPC] error:", rpcErr);
      setNotificationToast({
        message: "Errore nel confermare/rifiutare l’incarico.",
        type: "error",
      });
      return;
    }



    // 3) DB + UI: segno la notifica come letta
    await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));

    // Sincronizzazione Google Calendar
    if (accepted && currentUser?.googleCalendarConnected) {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (assignment) {
        const boat = boats.find((b) => b.id === assignment.boatId);
        const activity = activities.find((a) => a.id === assignment.activityId);

        syncGoogleCalendarEvent({
          targetUserId: currentUser.id,
          title: `Incarico: ${activity?.name || "Avui"}`,
          description: `Barca: ${boat?.name || "Sconosciuta"} - ${assignment.notes || ''}`,
          startTime: assignment.date, // All-day event se usiamo solo YYYY-MM-DD
          endTime: assignment.date,
          action: 'create'
        });
      }
    }

    setNotificationToast({
      message: accepted ? "Incarico confermato ✅" : "Incarico rifiutato ❌",
      type: accepted ? "success" : "error",
    });
  };



  const handleUpdateGeneralEvent = (updatedEvent: GeneralEvent) => {
    setGeneralEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    setNotificationToast({ message: "Evento modificato con successo." });
  };

  const handleDeleteGeneralEvent = (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo evento social?")) return;
    setGeneralEvents((prev) => prev.filter((e) => e.id !== id));
    setNotificationToast({ message: "Evento eliminato.", type: "error" });
  };

  const handleAddDayNote = async (date: string, text: string) => {
    if (!currentUser) return;

    const safeText = (text ?? "").trim();
    if (!safeText) return;

    const optimistic: DayNote = {
      id: crypto.randomUUID(),
      date,
      userId: currentUser.id,
      text: safeText,
      createdAt: Date.now(),
    };

    setDayNotes((prev) => [...prev, optimistic]);

    const payload = { date, user_id: currentUser.id, text: safeText };

    const { data, error } = await supabase.from("day_notes").insert(payload).select("*").single();

    if (error || !data) {
      setDayNotes((prev) => prev.filter((n) => n.id !== optimistic.id));
      setNotificationToast({ message: "Errore salvataggio nota", type: "error" });
      return;
    }

    const saved: DayNote = {
      id: data.id,
      date: String(data.date).slice(0, 10),
      userId: data.user_id,
      text: data.text,
      createdAt: new Date(data.created_at).getTime(),
    };

    setDayNotes((prev) => prev.map((n) => (n.id === optimistic.id ? saved : n)));
  };

  const handleDeleteDayNote = async (id: string) => {
    const toDelete = dayNotes.find((n) => n.id === id);
    if (!toDelete) return;

    setDayNotes((prev) => prev.filter((n) => n.id !== id));

    const { error } = await supabase.from("day_notes").delete().eq("id", id);

    if (error) {
      setDayNotes((prev) => [...prev, toDelete].sort((a, b) => a.createdAt - b.createdAt));
      setNotificationToast({ message: "Errore eliminazione nota", type: "error" });
    }
  };

  const handleCreateGeneralEvent = async (
    date: string,
    activityId: string,
    startTime?: string,
    endTime?: string,
    notes?: string
  ) => {
    if (!currentUser) return;

    const act = activitiesById.get(activityId);
    const safeDate = String(date).slice(0, 10);

    // 1️⃣ creo evento
    const { data: createdEvent, error: evErr } = await supabase
      .from("general_events")
      .insert({
        date: safeDate,
        activity_id: activityId || null,
        start_time: startTime || null,
        end_time: endTime || null,
        notes: notes || null,
        created_by: currentUser.id,
      })
      .select("*")
      .single();

    console.log("[A8][INSERT general_events]", evErr);

    if (evErr || !createdEvent) {
      setNotificationToast({
        message: "Errore creazione evento",
        type: "error",
      });
      return;
    }

    const eventId = createdEvent.id;

    // 2️⃣ creo responses per tutti gli utenti
    const responsesPayload = users.map((u) => ({
      event_id: eventId,
      user_id: u.id,
      status: ConfirmationStatus.PENDING,
    }));

    const { error: respErr } = await supabase
      .from("general_event_responses")
      .insert(responsesPayload);

    console.log("[A8][INSERT responses]", respErr);

    // 3️⃣ notifiche
    const msg = `Invito: ${act?.name ?? "Evento"} il ${format(
      parseDate(safeDate),
      "dd/MM"
    )}`;

    const notifPayload = users.map((u) => ({
      user_id: u.id,
      type: NotificationType.EVENT_INVITE,
      message: msg,
      read: false,
      data: { eventId },
    }));

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert(notifPayload);

    console.log("[A8][INSERT notifications]", notifErr);

    if (!notifErr) {
      Promise.allSettled(
        notifPayload.map(async (notif) => {
          const u = users.find(x => x.id === notif.user_id);
          if (u?.email) {
            await sendNotificationEmail({
              to: u.email,
              subject: `Nuovo Invito: ${act?.name ?? "Evento"}`,
              html: `<p>Ciao ${u.name},</p><p>${notif.message}</p><p>Accedi all'app per confermare o rifiutare la tua presenza.</p>`
            });
          }
        })
      ).catch(e => console.error("Email send error", e));
    }

    setNotificationToast({
      message: `Evento "${act?.name ?? "Evento"}" creato!`,
      type: notifErr ? "error" : "success",
    });

    // reload dal DB (importantissimo per evitare ghost state)
    await loadGeneralEventsFromDb();
    await loadNotificationsFromDb();
  };

  const handleCreateCalendarEvent = async (eventData: Partial<CalendarEvent>) => {
    if (!currentUser) return;

    // Default the date to today if not provided
    const safeDate = String(eventData.startDate || new Date().toISOString()).slice(0, 10);
    const endDate = eventData.endDate ? String(eventData.endDate).slice(0, 10) : safeDate;

    const { data: createdEvent, error: evErr } = await supabase
      .from("calendar_events")
      .insert({
        title: eventData.title || "Nuovo Evento",
        start_date: safeDate,
        end_date: endDate,
        start_time: eventData.startTime || null,
        end_time: eventData.endTime || null,
        recurrence_rule: eventData.recurrenceRule || null,
        recurrence_end_date: eventData.recurrenceEndDate || null,
        created_by: currentUser.id,
      })
      .select("*")
      .single();

    if (evErr || !createdEvent) {
      console.error("[ADD CALENDAR EVENT] Error:", evErr);
      setNotificationToast({ message: "Errore creazione evento calendario", type: "error" });
      return;
    }

    if (eventData.participants && eventData.participants.length > 0) {
      const parts = eventData.participants.map(uid => ({
        event_id: createdEvent.id,
        user_id: uid
      }));
      const { error: pErr } = await supabase.from("calendar_event_participants").insert(parts);
      if (pErr) console.error("[ADD CALENDAR EVENT PARTICIPANTS] Error:", pErr);
    }

    setNotificationToast({ message: "Evento aggiunto al calendario!", type: "success" });

    const mapped: CalendarEvent = {
      id: createdEvent.id,
      boatId: createdEvent.boat_id,
      title: createdEvent.title,
      startDate: String(createdEvent.start_date).slice(0, 10),
      endDate: String(createdEvent.end_date ?? createdEvent.start_date).slice(0, 10),
      type: createdEvent.type ?? null,
      activityId: createdEvent.activity_id ?? null,
      createdBy: createdEvent.created_by ?? null,
      createdAt: createdEvent.created_at ?? null,
      startTime: createdEvent.start_time ?? null,
      endTime: createdEvent.end_time ?? null,
      recurrenceRule: createdEvent.recurrence_rule ?? null,
      recurrenceEndDate: createdEvent.recurrence_end_date ?? null,
      participants: eventData.participants || [],
    };

    setCalendarEvents(prev => [...prev, mapped]);
  };

  const loadUsersFromDb = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("auth_id,email,name,role,is_admin,avatar_url,phone_number,birth_date,google_calendar_connected")
      .order("email", { ascending: true });

    if (error) {
      console.error("[LOAD users] error:", error);
      setNotificationToast({ message: "Errore caricamento utenti (DB).", type: "error" });
      return;
    }

    console.log("[LOAD users][RAW roles]", (data ?? []).map((r: any) => ({ auth_id: r.auth_id, role: r.role })));
    const mapped: User[] = (data ?? []).map((r: any) => ({
      id: r.auth_id,
      name: r.name ?? (r.email ? String(r.email).split("@")[0] : "utente"),
      email: r.email ?? "",
      role: normalizeRole(r.role),
      isAdmin: !!r.is_admin,
      avatar:
        r.avatar_url ??
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.email || r.auth_id}`,
      mustChangePassword: false,
      googleCalendarConnected: !!r.google_calendar_connected,
      phoneNumber: r.phone_number ?? "",
      birthDate: r.birth_date ? String(r.birth_date).slice(0, 10) : "",
      username: r.email ? String(r.email).split("@")[0] : "utente",
      password: "",
    })) as any;

    setUsers(mapped);
    console.log("[LOAD users] rows:", mapped.length, mapped.map(u => ({ id: u.id, role: u.role })));
  };

  const loadMaintenanceFromDb = async () => {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .select("id,boat_id,date,description,created_by,created_at,status,expiration_date")
      .order("date", { ascending: false });

    if (error) {
      console.error("[LOAD maintenance_logs] error:", error);
      return;
    }

    const mapped: MaintenanceRecord[] = (data ?? []).map((r: any) => ({
      id: r.id,
      boatId: r.boat_id,
      date: String(r.date).slice(0, 10),
      description: r.description ?? "",
      createdBy: r.created_by ?? null,
      createdAt: r.created_at ?? null,

      status: (String(r.status ?? "PENDING").toUpperCase() as any),
      expirationDate: r.expiration_date ? String(r.expiration_date).slice(0, 10) : null,
    })) as any;

    setMaintenanceRecords(mapped);
    console.log("[LOAD maintenance_logs] rows:", mapped.length);
  };


  const saveMaintenanceRecord = async (rec: MaintenanceRecord) => {
    const payload: any = {
      id: rec.id,
      boat_id: rec.boatId,
      date: rec.date,
      description: rec.description ?? "",
      created_by: (rec as any).createdBy ?? null,

      status: (String((rec as any).status ?? "PENDING").toUpperCase()),
      expiration_date: (rec as any).expirationDate || null,
    };

    const { error } = await supabase
      .from("maintenance_logs")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("[SAVE maintenance_logs] error:", error, payload);
      return;
    }

    // ricarico per essere sicuro che al refresh rimanga tutto
    await loadMaintenanceFromDb();
  };


  const deleteMaintenanceRecord = async (id: string) => {
    if (!confirm("Eliminare questa voce di manutenzione?")) return;

    const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);
    if (error) {
      console.error("[DELETE maintenance_records] error:", error);
      setNotificationToast({ message: "Errore eliminazione manutenzione.", type: "error" });
      return;
    }

    await loadMaintenanceFromDb();
    setNotificationToast({ message: "Manutenzione eliminata ✅", type: "success" });
  };


  const loadGeneralEventsFromDb = async () => {
    // 1) eventi
    const { data: evRows, error: evErr } = await supabase
      .from("general_events")
      .select("id,date,activity_id,start_time,end_time,notes,created_by,created_at")
      .order("date", { ascending: true });

    if (evErr) {
      console.error("[A8][LOAD general_events] error:", evErr);
      return;
    }

    // 2) risposte
    const { data: respRows, error: respErr } = await supabase
      .from("general_event_responses")
      .select("event_id,user_id,status");

    if (respErr) {
      console.error("[A8][LOAD general_event_responses] error:", respErr);
      return;
    }

    const byEventId = new Map<string, { userId: string; status: ConfirmationStatus }[]>();
    (respRows ?? []).forEach((r: any) => {
      const arr = byEventId.get(r.event_id) ?? [];
      arr.push({ userId: r.user_id, status: r.status as ConfirmationStatus });
      byEventId.set(r.event_id, arr);
    });

    const mapped: GeneralEvent[] = (evRows ?? []).map((e: any) => ({
      id: e.id,
      date: String(e.date).slice(0, 10),
      activityId: e.activity_id ?? "",
      startTime: e.start_time ?? undefined,
      endTime: e.end_time ?? undefined,
      notes: e.notes ?? undefined,
      responses: byEventId.get(e.id) ?? [],
    }));

    setGeneralEvents(mapped);
    console.log("[A8][LOAD general_events] rows:", mapped.length);
  };

  const loadNotificationsFromDb = async (userId?: string | null) => {
    const uid = userId ?? currentUser?.id;
    if (!uid) return;

    const { data: rows, error } = await supabase
      .from("notifications")
      .select("id,user_id,type,message,read,data,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[A8][LOAD notifications] error:", error);
      return;
    }

    const mapped: UserNotification[] = (rows ?? []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type as NotificationType,
      message: n.message,
      read: !!n.read,
      data: n.data ?? undefined,
      createdAt: new Date(n.created_at).getTime(),
    }));

    setNotifications(mapped);
    console.log("[A8][LOAD notifications] rows:", mapped.length);
  };


  useEffect(() => {
    if (!isLoggedIn) return;
    loadMaintenanceFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);


  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          loadNotificationsFromDb(currentUser.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, currentUser?.id]);

  useEffect(() => {
    if (!DEV) return;
    console.log("[A3][STATE calendarEvents] len:", calendarEvents.length);
    if (calendarEvents[0]) console.log("[A3][STATE first]", calendarEvents[0]);
  }, [calendarEvents, DEV]);


  const handleUpdateProfile = async (field: keyof User, value: any) => {
    if (!currentUser) return;

    // UI subito
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, [field]: value } : u)));

    // mappa campi UI -> colonne DB
    const fieldMap: Partial<Record<keyof User, string>> = {
      avatar: "avatar_url",
      phoneNumber: "phone_number",
      birthDate: "birth_date",
      googleCalendarConnected: "google_calendar_connected",
      isAdmin: "is_admin",
      name: "name",
      email: "email",
      role: "role",
    };

    const dbColumn = fieldMap[field] ?? (field as string);

    // normalizzazione valori
    const patch: any = {};
    patch[dbColumn] =
      value === "" || value === undefined ? null : value;

    console.log("[USERS][update] auth_id:", currentUser.id, "patch:", patch);

    const { error } = await supabase
      .from("users")
      .update(patch)
      .eq("auth_id", currentUser.id);

    if (error) {
      console.error("[USERS][update] DB error:", error);
      setNotificationToast({ message: `Errore salvataggio profilo: ${error.message}`, type: "error" });
      return;
    }

    // ricarica dbUser + lista users per allineare

    const { data: refreshed } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", currentUser.id)
      .maybeSingle();
    if (refreshed) setDbUser(refreshed);

    setNotificationToast({ message: "Profilo aggiornato ✅", type: "success" });
  };

  /* const handleAdminUpdateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    setNotificationToast({ message: "Dati marinaio aggiornati con successo!" });
  }; */

  const handleAddUser = async (
    name: string,
    role: Role,
    email: string,
    isAdmin: boolean,
    phoneNumber: string,
    birthDate: string,
    password: string
  ) => {
    try {
      // 1) session token
      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) {
        console.error("[ADD USER] getSession error:", sessErr);
        setNotificationToast({ message: "Sessione non disponibile.", type: "error" });
        return;
      }

      const token = sess.session?.access_token;
      if (!token) {
        console.error("[ADD USER] token mancante");
        setNotificationToast({ message: "Non risulti loggato. Rifai login.", type: "error" });
        return;
      }

      // 2) validazioni
      const safeEmail = (email ?? "").trim().toLowerCase();
      const safePwd = (password ?? "").trim();
      if (!safeEmail || !safePwd) {
        setNotificationToast({ message: "Email e Password sono obbligatorie.", type: "error" });
        return;
      }

      // 3) payload
      const payload = {
        action: "create_user",
        email: safeEmail,
        password: safePwd,
        name: (name ?? "").trim(),
        role: String(role ?? Role.HELPER).toUpperCase(),
        is_admin: !!isAdmin,
        phone_number: phoneNumber?.trim() || null,
        birth_date: birthDate?.trim() || null,
      };

      // 4) fetch DIRETTA con apikey + Authorization
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;

      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch { }

      if (!res.ok) {
        console.error("[ADD USER] HTTP", res.status, text);
        setNotificationToast({
          message: json?.error ? `Errore: ${json.error}` : `Errore creazione utente (HTTP ${res.status})`,
          type: "error",
        });
        return;
      }

      console.log("[ADD USER] ok:", json);

      // Invia email di benvenuto con credenziali
      sendNotificationEmail({
        to: safeEmail,
        subject: "Benvenuto su Avui Gestionale - Credenziali di Accesso",
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>Benvenuto a Bordo, ${payload.name}! ⛵</h2>
            <p>Il tuo account su Avui Gestionale è stato creato con successo.</p>
            <p>Di seguito trovi le tue credenziali di accesso provvisorie. Ti ricordiamo che la prima volta che effettuerai l'accesso ti verrà richiesto di cambiare la password per motivi di sicurezza.</p>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Username / Email:</strong> ${safeEmail}</p>
              <p style="margin: 0;"><strong>Password Temporanea:</strong> <code>${safePwd}</code></p>
            </div>
            <p>Accedi subito all'app per gestire la tua disponibilità e vedere le tue convocazioni!</p>
          </div>
        `
      }).catch((e) => console.error("[ADD USER] Errore invio email di benvenuto", e));

      setNotificationToast({ message: "Utente creato ✅ e email inviata!", type: "success" });
    } catch (e) {
      console.error("[ADD USER] unexpected:", e);
      setNotificationToast({ message: "Errore inatteso creazione utente.", type: "error" });
    }
  };


  const handleRemoveUser = async (userId: string) => {
    if (userId === currentUserId) return;
    if (!confirm("Vuoi eliminare questo utente definitivamente?")) return;

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        setNotificationToast({ message: "Sessione non disponibile.", type: "error" });
        return;
      }

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;

      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "delete_user", auth_id: userId }),
      });

      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { }

      if (!res.ok) {
        setNotificationToast({
          message: json?.error ? `Errore eliminazione: ${json.error}` : `Errore delete (HTTP ${res.status})`,
          type: "error",
        });
        return;
      }

      await loadUsersFromDb();
      setNotificationToast({ message: "Utente eliminato ✅", type: "success" });
    } catch (e) {
      console.error("[USERS][delete] unexpected:", e);
      setNotificationToast({ message: "Errore inatteso eliminazione utente.", type: "error" });
    }
  };


  const maintenanceByDate = useMemo(() => {
    const expiring = new Map<string, MaintenanceRecord[]>();
    const performed = new Map<string, MaintenanceRecord[]>();

    for (const r of maintenanceRecords) {
      const date = (r.date ?? "").slice(0, 10);
      if (date) {
        const arr = performed.get(date) ?? [];
        arr.push(r);
        performed.set(date, arr);
      }

      const exp = (r.expirationDate ?? "").slice(0, 10);
      if (exp && r.status !== MaintenanceStatus.DONE) {
        const arr = expiring.get(exp) ?? [];
        arr.push(r);
        expiring.set(exp, arr);
      }
    }

    return { expiring, performed };
  }, [maintenanceRecords]);

  const getHoverData = () => {
    if (!hoveredDate) return [];

    // 1) calendar events già indicizzati per data
    const dayCalEvents = calEventsByDate.get(hoveredDate) ?? [];

    const calAsHoverRows = dayCalEvents.map((e) => ({
      boat:
        boatsById.get(e.boatId) ??
        ({ id: e.boatId, name: "Barca", type: "VELA", image: "" } as any),
      assignment: {
        id: e.id,
        date: e.startDate,
        boatId: e.boatId,
        instructorId: null,
        helperId: null,
        activityId: null,
        durationDays: 1,
        status: AssignmentStatus.CONFIRMED,
        notes: e.title,
      },
      activity: {
        id: "CAL",
        name: e.title,
        allowedBoatTypes: [],
        defaultDurationDays: 1,
        isGeneral: false,
      },
      instructor: null,
      helper: null,
    }));

    // 2) assignments: per quella data, per ogni barca
    const assignmentHoverRows = boats
      .map((boat) => {
        const assignment = getEffectiveAssignment(hoveredDate, boat.id);
        if (!assignment || !assignment.activityId) return null;

        const activity = activitiesById.get(assignment.activityId);
        if (!activity) return null;

        return {
          boat,
          assignment,
          activity,
          instructor: assignment.instructorId ? usersById.get(assignment.instructorId) ?? null : null,
          helper: assignment.helperId ? usersById.get(assignment.helperId) ?? null : null,
        };
      })
      .filter(Boolean);

    return [...calAsHoverRows, ...(assignmentHoverRows as any[])];
  };


  const isCommanderConfirmed = (a: Assignment) => {
    const s = String((a as any).instructorStatus ?? "").toUpperCase();
    return s === "CONFIRMED";
  };

  const getCommanderStatus = (a: Assignment) => {
    const s = String((a as any).instructorStatus ?? "").toUpperCase();
    if (s === "CONFIRMED") return "CONFIRMED";
    if (s === "REJECTED") return "REJECTED";
    return "PENDING";
  };


  const getDayNotesForHover = () => {
    if (!hoveredDate) return [];
    return notesByDate.get(hoveredDate) ?? [];
  };


  const hoverMaintenance = React.useMemo(() => {
    if (!hoveredDate) return { expiring: [], performed: [] };

    return {
      expiring: maintenanceByDate.expiring.get(hoveredDate) ?? [],
      performed: maintenanceByDate.performed.get(hoveredDate) ?? [],
    };
  }, [hoveredDate, maintenanceByDate]);

  const navigateCalendar = (direction: "prev" | "next") => {
    if (calendarView === "month") {
      setCurrentDate((prev) => (direction === "prev" ? addMonths(prev, -1) : addMonths(prev, 1)));
    } else {
      setCurrentDate((prev) => (direction === "prev" ? addDays(prev, -7) : addDays(prev, 7)));
    }
  };

  // =========================
  // INDICI / MAPPE (PERFORMANCE)
  // Metti TUTTO QUESTO BLOCCO PRIMA DEI "GUARDS" (prima degli if con return)
  // =========================

  // 1) Disponibilità per utente+data (utile se ti serve in giro)
  const availByUserDate = useMemo(() => {
    const m = new Map<string, AvailabilityStatus>();
    for (const a of availabilities) {
      const d = (a.date ?? "").slice(0, 10);
      if (!d) continue;
      m.set(`${a.userId}|${d}`, a.status);
    }
    return m;
  }, [availabilities]);

  // 2) Le MIE disponibilità per data (per colorare il calendario)
  const myAvailabilityByDate = useMemo(() => {
    const m = new Map<string, AvailabilityStatus>();
    const myId = currentUser?.id;
    if (!myId) return m;

    for (const a of availabilities) {
      if (a.userId !== myId) continue;
      const d = (a.date ?? "").slice(0, 10);
      if (!d) continue;
      m.set(d, a.status);
    }
    return m;
  }, [availabilities, currentUser?.id]);

  // 3) Note per data
  const notesByDate = useMemo(() => {
    const m = new Map<string, DayNote[]>();
    for (const n of dayNotes) {
      const d = (n.date ?? "").slice(0, 10);
      if (!d) continue;
      const arr = m.get(d) ?? [];
      arr.push(n);
      m.set(d, arr);
    }
    return m;
  }, [dayNotes]);

  // 4) Eventi generali per data
  const generalEventsByDate = useMemo(() => {
    const m = new Map<string, GeneralEvent[]>();
    for (const e of generalEvents) {
      const d = (e.date ?? "").slice(0, 10);
      if (!d) continue;
      const arr = m.get(d) ?? [];
      arr.push(e);
      m.set(d, arr);
    }
    return m;
  }, [generalEvents]);

  // 5) Manutenzioni indicizzate (expiring + performed)


  // 6) Calendar events: indicizza OGNI giorno del range e le ricorrenze
  const calEventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();

    for (const e of calendarEvents) {
      const start = (e.startDate ?? "").slice(0, 10);
      const end = (e.endDate ?? e.startDate ?? "").slice(0, 10);
      if (!start) continue;

      const baseDays = eachDayOfInterval({
        start: parseDate(start),
        end: parseDate(end),
      });

      // Aggiungi le date base (evento singolo o durata base)
      for (const d of baseDays) {
        const ds = format(d, "yyyy-MM-dd");
        const arr = m.get(ds) ?? [];
        if (!arr.find(existing => existing.id === e.id)) {
          arr.push(e);
          m.set(ds, arr);
        }
      }

      // Gestisci la ricorrenza
      if (e.recurrenceRule && e.recurrenceRule !== 'NONE') {
        const recEnd = e.recurrenceEndDate ? parseDate(e.recurrenceEndDate) : null;
        // Per sicurezza espandiamo al massimo fino a +1 anno dal currentDate se non c'è fine
        const limitDate = recEnd || addDays(new Date(), 365);

        let currentDateCursor = parseDate(start);
        const durationDays = differenceInCalendarDays(parseDate(end), parseDate(start));

        while (true) {
          if (e.recurrenceRule === 'DAILY') {
            currentDateCursor = addDays(currentDateCursor, 1);
          } else if (e.recurrenceRule === 'WEEKLY') {
            currentDateCursor = addDays(currentDateCursor, 7);
          } else {
            break; // Regola sconosciuta, esci
          }

          if (currentDateCursor > limitDate) break;

          // Genera i giorni di durata per questa occorrenza
          const occurrenceDays = eachDayOfInterval({
            start: currentDateCursor,
            end: addDays(currentDateCursor, durationDays)
          });

          for (const d of occurrenceDays) {
            const ds = format(d, "yyyy-MM-dd");
            const arr = m.get(ds) ?? [];
            if (!arr.find(existing => existing.id === e.id)) {
              arr.push(e);
              m.set(ds, arr);
            }
          }
        }
      }
    }

    return m;
  }, [calendarEvents]);



  // 7) Lookup mappe byId (per evitare .find)
  const boatsById = useMemo(() => new Map(boats.map((b) => [b.id, b])), [boats]);
  const activitiesById = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  // 8) daysToRender memoizzato
  const daysToRender = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (calendarView === "month") {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }

    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return eachDayOfInterval({ start, end });
  }, [currentDate, calendarView]);

  // 9) MouseMove throttling via requestAnimationFrame
  const rafRef = useRef<number | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (rafRef.current != null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setMousePos(lastMouseRef.current);
    });
  }, []);

  const handleDayClick = React.useCallback((dateStr: string) => {
    setSelectedDate(dateStr);

    const selected = (calEventsByDate?.get?.(dateStr) ?? []) as any[];
    // Se tu usi un indice diverso, sostituisci la riga sopra con quello.
    setSelectedCalendarEvents(selected);
  }, [calEventsByDate]);

  const handleDayEnter = React.useCallback((dateStr: string) => {
    setHoveredDate(dateStr);
  }, []);

  const handleDayLeave = React.useCallback(() => {
    setHoveredDate(null);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // 10) Assignments indicizzati per barca (performance + match più affidabile)
  const assignmentsByBoatId = useMemo(() => {
    const m = new Map<string, Assignment[]>();

    for (const a of assignments) {
      const boatId = String(a.boatId ?? "").trim();
      if (!boatId) continue;

      const normalized: Assignment = {
        ...a,
        boatId,
        date: String(a.date ?? "").slice(0, 10),
        durationDays: Number(a.durationDays ?? 1) || 1,
      };

      const arr = m.get(boatId) ?? [];
      arr.push(normalized);
      m.set(boatId, arr);
    }

    // facoltativo: ordina per data per scorrere più “pulito”
    for (const [k, arr] of m.entries()) {
      arr.sort((x, y) => String(x.date).localeCompare(String(y.date)));
      m.set(k, arr);
    }

    return m;
  }, [assignments]);

  const getEffectiveAssignment = React.useCallback(
    (dateStr: string, boatId: string) => {
      const list = assignmentsByBoatId.get(String(boatId).trim()) ?? [];
      if (!list.length) return undefined;

      const target = parseDate(String(dateStr).slice(0, 10));

      for (const a of list) {
        const start = parseDate(String(a.date).slice(0, 10));
        const diff = differenceInCalendarDays(target, start);
        const dur = Number(a.durationDays ?? 1) || 1;

        if (diff >= 0 && diff < dur) return a;
      }
      return undefined;
    },
    [assignmentsByBoatId]
  );

  useEffect(() => {
    console.log("[DBG] assignments:", assignments.length);
    console.log("[DBG] assignmentsByBoatId keys:", Array.from(assignmentsByBoatId.keys()).length);
  }, [assignments.length, assignmentsByBoatId]);


  // =========================
  // --- GUARDS ---
  // (Devono stare DOPO TUTTI GLI HOOK sopra)
  // =========================
  if (!appReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Caricamento Ciurma...
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  }

  if (isLoggedIn && !sessionUser) {
    return <div className="min-h-screen flex items-center justify-center">Sto preparando il profilo…</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
          <div className="flex justify-center mb-6 text-blue-600">
            <Ship size={48} />
          </div>
          <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">Benvenuto a Bordo</h1>

          {loginError && (
            <div className="bg-rose-100 text-rose-700 p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-2">
              <AlertTriangle size={16} /> {loginError}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginError(null);

              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) setLoginError(error.message);
            }}
            className="space-y-4"
          >
            <input
              type="email"
              required
              className="w-full border p-2 rounded"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              required
              className="w-full border p-2 rounded"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
              Accedi
            </button>
          </form>
        </div>
      </div>
    );
  }




  // --- RENDER PRINCIPALE ---



  const startDayPadding = calendarView === "month" ? (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7 : 0;

  const myNotifications = notifications; // già filtrate dal DB per user_id
  const unreadCount = myNotifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);


  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative">
      {notificationToast && (
        <NotificationToast
          message={notificationToast.message}
          type={notificationToast.type}
          onClose={() => setNotificationToast(null)}
        />
      )}

      {showAvailabilityAlert && (
        <AvailabilityWarningModal
          nextMonthName={format(nextMonthDate, "MMMM", { locale: it })}
          onClose={() => setShowAvailabilityAlert(false)}
        />
      )}

      {hoveredDate &&
        !isProfileOpen &&
        !selectedDate &&
        !isUserManagementOpen &&
        !isFleetManagementOpen &&
        !isNotificationOpen && (
          <DayHoverModal
            date={hoveredDate}
            position={mousePos}
            data={getHoverData() as any}
            notes={getDayNotesForHover()}
            maintenance={hoverMaintenance as any}
          />
        )}


      {/* Navbar */}
      <AppNavbar
        currentUser={currentUser}
        currentUserId={currentUserId}
        isNotificationOpen={isNotificationOpen}
        setIsNotificationOpen={setIsNotificationOpen}
        isProfileOpen={isProfileOpen}
        setIsProfileOpen={setIsProfileOpen}
        isUserManagementOpen={isUserManagementOpen}
        setIsUserManagementOpen={setIsUserManagementOpen}
        isFleetManagementOpen={isFleetManagementOpen}
        setIsFleetManagementOpen={setIsFleetManagementOpen}
        isMaintenanceHubOpen={isMaintenanceHubOpen}
        setIsMaintenanceHubOpen={setIsMaintenanceHubOpen}
        notificationPanelRef={notificationPanelRef}
        notifications={notifications}
        handleLogout={handleLogout}
        handleEventResponse={handleEventResponse}
        handleAssignmentResponse={handleAssignmentResponse}
        handleMarkNotificationRead={handleMarkNotificationRead}
      />


      {/* Fleet Management (admin) */}
      {isFleetManagementOpen && (
        <FleetManagementPage
          isOpen={isFleetManagementOpen}
          onClose={() => setIsFleetManagementOpen(false)}
          boats={boats}
          activities={activities}
          maintenanceRecords={maintenanceRecords}
          onUpdateBoats={setBoats}
          onUpdateActivities={setActivities}
          onUpdateMaintenance={setMaintenanceRecords}
        />
      )}

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto p-6 flex flex-col xl:flex-row gap-6 items-start">

        {/* Calendar Section */}
        <div className="flex-1 w-full xl:w-auto overflow-hidden">
          <CalendarHeader
            currentDate={currentDate}
            calendarView={calendarView}
            onPrev={() => navigateCalendar("prev")}
            onToday={() => setCurrentDate(new Date())}
            onNext={() => navigateCalendar("next")}
            onSetView={(v) => setCalendarView(v)}
          />

          <CalendarGrid
            daysToRender={daysToRender}
            calendarView={calendarView}
            startDayPadding={startDayPadding}
            currentUser={currentUser}
            boats={boats}
            activitiesById={activitiesById}
            boatsById={boatsById}
            usersById={usersById}
            calEventsByDate={calEventsByDate}
            generalEventsByDate={generalEventsByDate}
            maintenanceByDate={maintenanceByDate}
            myAvailabilityByDate={myAvailabilityByDate}
            notesByDate={notesByDate}
            getEffectiveAssignment={getEffectiveAssignment}
            isCommanderConfirmed={isCommanderConfirmed}
            onDayClick={(dateStr) => {
              setSelectedDate(dateStr);
              setSelectedCalendarEvents(calEventsByDate.get(dateStr) ?? []);
            }}
            onOpenBoatPage={(boatId) => setSelectedBoatIdForPage(boatId)}
            onDayEnter={(dateStr) => setHoveredDate(dateStr)}
            onDayLeave={() => setHoveredDate(null)}
            onMouseMove={handleMouseMove}
            DayCell={DayCell}
          />
        </div>

        {/* Notice Board Section (Sidebar on XL, Bottom on Mobile) */}
        <aside className="w-full xl:w-[400px] shrink-0 flex flex-col gap-6">
          <NextAssignmentsBox
            currentUser={currentUser}
            assignments={assignments}
            generalEvents={generalEvents}
            boats={boats}
            activities={activities}
          />
          <NoticeBoard currentUser={currentUser} />
        </aside>

      </main>

      <ModalsLayer
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        currentUser={currentUser}
        users={users}
        boats={boats}
        activities={activities}
        availabilities={availabilities}
        assignments={assignments}
        generalEvents={generalEvents}
        dayNotes={dayNotes}
        selectedCalendarEvents={selectedCalendarEvents}
        onUpdateAvailability={handleUpdateAvailability}
        onUpdateAssignment={handleUpdateAssignment}
        onDeleteAssignment={handleDeleteAssignment}
        onCreateGeneralEvent={handleCreateGeneralEvent}
        onUpdateGeneralEvent={handleUpdateGeneralEvent}
        onDeleteGeneralEvent={handleDeleteGeneralEvent}
        onAddDayNote={handleAddDayNote}
        onDeleteDayNote={handleDeleteDayNote}
        isUserManagementOpen={isUserManagementOpen}
        setIsUserManagementOpen={setIsUserManagementOpen}
        currentUserId={currentUserId}
        onAddUser={handleAddUser}
        onRemoveUser={handleRemoveUser}
        onToggleRole={handleToggleRole}
        onUpdateUser={handleUpdateUser}
        isFleetManagementOpen={isFleetManagementOpen}
        setIsFleetManagementOpen={setIsFleetManagementOpen}
        isMaintenanceHubOpen={isMaintenanceHubOpen}
        setIsMaintenanceHubOpen={setIsMaintenanceHubOpen}
        maintenanceRecords={maintenanceRecords}
        onUpdateBoats={setBoats}
        onUpdateActivities={setActivities}
        onUpdateMaintenance={setMaintenanceRecords}
        isProfileOpen={isProfileOpen}
        setIsProfileOpen={setIsProfileOpen}
        onUpdateProfile={handleUpdateProfile}
        onCreateCalendarEvent={handleCreateCalendarEvent}
        selectedBoatIdForPage={selectedBoatIdForPage}
        setSelectedBoatIdForPage={setSelectedBoatIdForPage}
        onOpenBoatPage={(id) => setSelectedBoatIdForPage(id)}
      />

    </div>
  );
};

type DayCellProps = {
  dateStr: string;
  day: Date;
  isToday: boolean;
  isWeekendDay: boolean;
  bgClass: string;

  notesCount: number;

  dayCalendarEvents: CalendarEvent[];
  daysGeneralEvents: GeneralEvent[];
  expiringMaintenance: MaintenanceRecord[];
  performedMaintenance: MaintenanceRecord[];

  boats: Boat[];
  activitiesById: Map<string, Activity>;
  boatsById: Map<string, Boat>;
  usersById: Map<string, User>;

  getEffectiveAssignment: (dateStr: string, boatId: string) => Assignment | undefined;
  isCommanderConfirmed: (a: Assignment) => boolean;

  onClick: () => void;
  onOpenBoatPage: (boatId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
};

const DayCell = React.memo(function DayCell(props: DayCellProps) {
  const {
    dateStr,
    day,
    isToday,
    isWeekendDay,
    bgClass,
    notesCount,
    dayCalendarEvents,
    daysGeneralEvents,
    expiringMaintenance,
    performedMaintenance,
    boats,
    activitiesById,
    boatsById,
    getEffectiveAssignment,
    isCommanderConfirmed,
    onClick,
    onOpenBoatPage,
    onMouseEnter,
    onMouseLeave,
    onMouseMove,
  } = props;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      className={`${bgClass} min-h-[160px] p-2 transition-all cursor-pointer group flex flex-col relative`}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isToday
            ? "bg-blue-600 text-white shadow-md"
            : isWeekendDay
              ? "text-slate-800"
              : "text-slate-400"
            }`}
        >
          {format(day, "d")}
        </span>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {notesCount > 0 && (
          <div className="h-4 bg-amber-100 border border-amber-200 text-amber-600 rounded px-2 text-[9px] font-bold flex items-center gap-1 mb-1 shadow-sm">
            <MessageCircle size={8} />
            <span className="truncate">{notesCount} Note</span>
          </div>
        )}

        {dayCalendarEvents.length > 0 && (
          <div
            className="h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 bg-indigo-600 text-white font-bold"
            title={dayCalendarEvents
              .map((ev) => {
                const boatName = boatsById.get(ev.boatId)?.name ?? "Barca";
                return `${boatName}: ${ev.title}`;
              })
              .join(" • ")}
          >
            <span className="truncate">
              📌{" "}
              {(() => {
                const ev = dayCalendarEvents[0];
                const boatName = boatsById.get(ev.boatId)?.name ?? "Barca";
                const extra = dayCalendarEvents.length > 1 ? ` (+${dayCalendarEvents.length - 1})` : "";
                return `${boatName}: ${ev.title}${extra}`;
              })()}
            </span>
          </div>
        )}

        {daysGeneralEvents.map((event) => {
          const act = activitiesById.get(event.activityId);
          return (
            <div
              key={event.id}
              className="h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 bg-purple-500 text-white font-bold"
            >
              <PartyPopper size={10} className="mr-1" />
              <span className="truncate">{act?.name}</span>
            </div>
          );
        })}

        {expiringMaintenance.map((record) => {
          const boat = boatsById.get(record.boatId);
          const expDate = parseDate(record.expirationDate!);
          const isExpired = isBefore(expDate, new Date()) && !isSameDay(expDate, new Date());

          return (
            <div
              key={record.id}
              className={`h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 border ${isExpired
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
                }`}
            >
              <Wrench size={10} className="mr-1 shrink-0" />
              <span className="font-bold truncate">SCADE: {boat?.name}</span>
            </div>
          );
        })}

        {performedMaintenance.map((record) => {
          const boat = boatsById.get(record.boatId);
          return (
            <div
              key={record.id}
              className="h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 border bg-blue-100 text-blue-700 border-blue-200"
            >
              <CheckCircle size={10} className="mr-1 shrink-0" />
              <span
                className="truncate cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBoatPage(boat!.id);
                }}
              >
                {boat?.name}: {record.description}
              </span>
            </div>
          );
        })}

        {boats.map((boat) => {
          const assignment = getEffectiveAssignment(dateStr, boat.id);
          if (!assignment) return null;

          const activity = assignment.activityId ? activitiesById.get(assignment.activityId) : undefined;
          const isCancelled = assignment.status === AssignmentStatus.CANCELLED;
          const commanderConfirmed = isCommanderConfirmed(assignment);

          let barColor = "bg-slate-500 text-white";
          if (commanderConfirmed) barColor = "bg-emerald-600 text-white";
          if (isCancelled) barColor = "bg-red-100 text-red-600 border border-red-200 line-through opacity-80";

          const label = `${boat.name}: ${activity?.name ?? "Missione"}`;

          return (
            <div
              key={`${boat.id}-${assignment.id}`}
              className={`h-6 text-[10px] px-2 flex items-center overflow-hidden whitespace-nowrap ${barColor} rounded-md mx-1 cursor-pointer transition-opacity hover:opacity-90`}
              title={label}
              onClick={(e) => {
                e.stopPropagation();
                onOpenBoatPage(boat.id);
              }}
            >
              <span className="truncate">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});


export default App;
