import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./hooks/useAuth";


import {
  Activity,
  Assignment,
  AssignmentStatus,
  Availability,
  AvailabilityStatus,
  Boat,
  ConfirmationStatus,
  DayNote,
  GeneralEvent,
  CalendarEvent,
  MaintenanceRecord,
  MaintenanceStatus,
  NotificationType,
  Role,
  User,
  UserNotification,
} from "./types";

import { DayModal } from "./components/DayModal";
import { DayHoverModal } from "./components/DayHoverModal";
import { UserManagementModal } from "./components/UserManagementModal";
import { ProfilePage } from "./components/ProfilePage";
import { ForcePasswordChange } from "./components/ForcePasswordChange";
import { FleetManagementPage } from "./components/FleetManagementPage";

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
};

const parseDate = (dateString?: string | null) => {
  if (!dateString) {
    // fallback "safe": oggi a mezzanotte
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // se arriva "YYYY-MM-DDTHH..." taglia
  const safe = dateString.slice(0, 10);

  const [year, month, day] = safe.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};


const normalizeBoatType = (t: any) => {
  const v = String(t ?? "").trim().toLowerCase();
  if (v === "vela") return "VELA";
  if (v === "motore") return "MOTORE";
  return "VELA"; // fallback sicuro
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
      className={`rounded-full p-1 text-slate-900 shrink-0 ${
        type === "error" ? "bg-rose-500" : "bg-green-500"
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


const mapDbCalendarEvent = (row: DbCalendarEventRow): CalendarEvent => ({
  id: row.id,
  boatId: row.boat_id,
  title: row.title,
  startDate: row.start_date,
  endDate: row.end_date,
  type: row.type,
  createdBy: row.created_by,
  createdAt: row.created_at,
});



const App: React.FC = () => {
  // --- AUTH (da hook) ---
  const { session, isLoggedIn, loading } = useAuth();
  const sessionUser = session?.user;
  const currentUserId = session?.user?.id ?? null;


  // --- DATA STATE ---
  // user “DB” = riga in public.users
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

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // “Password change” flow (se lo usi ancora in locale)
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // app data
  const [users, setUsers] = useState<User[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedCalendarEvents, setSelectedCalendarEvents] = useState<CalendarEvent[]>([]);
  

  const [boats, setBoats] = useState<Boat[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [generalEvents, setGeneralEvents] = useState<GeneralEvent[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);

  


  
  const didRunRef = useRef<string | null>(null);

    useEffect(() => {
        console.log("[A3][STATE calendarEvents] len:", calendarEvents.length);
         if (calendarEvents[0]) console.log("[A3][STATE first]", calendarEvents[0]);
    }, [calendarEvents]);



  // ✅ currentUser: UNO SOLO (fallback se dbUser non è ancora arrivato)
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
    };

    if (!dbUser) return fallback;

    return {
      id: dbUser.auth_id ?? fallback.id,
      name: dbUser.name ?? fallback.name,
      email: dbUser.email ?? fallback.email,
      role: (dbUser.role ?? fallback.role) as Role,
      isAdmin: !!dbUser.is_admin,
      avatar: dbUser.avatar_url ?? fallback.avatar,
      mustChangePassword: false,
      googleCalendarConnected: false,
    };
  }, [dbUser, sessionUser?.id, sessionUser?.email]);



  
useEffect(() => {
  setAppReady(true);
}, []);

  


const lastUidRef = useRef<string | null>(null);

useEffect(() => {
  const uid = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;

  console.log("GET-OR-CREATE effect fired. uid =", uid);

  // Logout / nessuna sessione
  if (!uid) {
    lastUidRef.current = null;
    setDbUser(null);
    return;
  }

  // Se ho già processato questo uid, non rifaccio niente
  if (lastUidRef.current === uid) return;
  lastUidRef.current = uid;

  let cancelled = false;

  (async () => {
    const { data: existing, error: selErr } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", uid)
      .maybeSingle();

    console.log("GET-OR-CREATE select result:", { existing, selErr });

    if (cancelled) return;

    if (selErr) {
      console.error("GET-OR-CREATE select ERROR:", selErr);
      return;
    }

    if (existing) {
  setDbUser(existing);
  return;
}

const { data: notesData, error: notesErr } = await supabase
  .from("day_notes")
  .select("*")
  .order("created_at", { ascending: true });

console.log("[A5][LOAD day_notes] rows:", (notesData ?? []).length, "error:", notesErr);
if (notesErr) return;

setDayNotes(
  (notesData ?? []).map((r: any) => ({
    id: r.id,
    date: String(r.date).slice(0, 10),
    userId: r.user_id,
    text: r.text,
    createdAt: new Date(r.created_at).getTime(),
  }))
);


    const payload = { auth_id: uid, email };

    const { data: created, error: insErr } = await supabase
      .from("users")
      .insert(payload)
      .select("*")
      .single();

    console.log("GET-OR-CREATE insert result:", { created, insErr });

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
}, [session?.user?.id]); // dipendenza MINIMA




  // 2) Mappa dbUser -> User “interno” (per far funzionare tutto il resto dell’app)
  useEffect(() => {
    if (!dbUser) {
      setUsers([]);
      return;
    }

    const mapped: User = {
      id: dbUser.auth_id,
      name: dbUser.name ?? (dbUser.email ? dbUser.email.split("@")[0] : "utente"),
      email: dbUser.email ?? "",
      role: (dbUser.role as Role) ?? Role.HELPER,
      isAdmin: !!dbUser.is_admin,
      avatar:
        dbUser.avatar_url ??
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbUser.email || dbUser.auth_id}`,
      mustChangePassword: false,
      googleCalendarConnected: false,
      // campi opzionali nel tuo type User
      username: dbUser.email ? dbUser.email.split("@")[0] : "utente",
      password: "",
      phoneNumber: "",
      birthDate: "",
    };

    setUsers([mapped]);
  }, [dbUser?.id]);




const loggedUidRef = useRef<string | null>(null);

useEffect(() => {
  const uid = session?.user?.id ?? null;
  if (!uid) {
    loggedUidRef.current = null;
    return;
  }
  if (loggedUidRef.current === uid) return;
  loggedUidRef.current = uid;

  console.log("AUTH SESSION USER:", session?.user ?? null);
  console.log("DB USER (public.users):", dbUser ?? null);
  console.log("SESSION USER ID:", uid);
  console.log("CURRENT USER:", currentUser ?? null);
}, [session?.user?.id, dbUser, currentUser]);


 useEffect(() => {
  let cancelled = false;

  (async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select(`
        id,
        boat_id,
        title,
        start_date,
        end_date,
        type,
        activity_id,
        boats:boat_id ( id, name ),
        activities:activity_id ( id, name )
      `)
      .order("start_date", { ascending: true });

    console.log("[A3][LOAD calendar_events] rows:", data?.length ?? 0, "error:", error);

    if (cancelled) return;

    if (error) {
      console.error("[A3] calendar_events load error:", error);
      return;
    }

    const mapped: CalendarEvent[] = (data ?? []).map((r: any) => ({
      id: r.id,
      boatId: r.boat_id,
      title: r.title,
      startDate: r.start_date,
      endDate: r.end_date ?? r.start_date,
      type: r.type ?? null,
      activityId: r.activity_id ?? null,
      boatName: r.boats?.name ?? null,
      activityName: r.activities?.name ?? null,
    }));

    setCalendarEvents(mapped);

    // log “di conferma” super leggibile
    if (mapped.length) {
      console.log("[A3][LOAD sample mapped]", mapped[0]);
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);



 

  // --- EFFECTS LOGICI ---
  useEffect(() => {
    if (notificationToast) {
      const timer = setTimeout(() => setNotificationToast(null), 4000);
      return () => clearTimeout(timer);
    }
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

  const checkNextMonthAvailability = () => {
    if (!currentUser) return;

    const year = nextMonthDate.getFullYear();
    const month = nextMonthDate.getMonth();
    const startNextMonth = new Date(year, month, 1);
    const endNextMonth = new Date(year, month + 1, 0);
    const daysInNextMonth = eachDayOfInterval({ start: startNextMonth, end: endNextMonth });

    const weekends = daysInNextMonth.filter(isWeekend);

    const hasEntries = weekends.some((day) => {
      const dStr = format(day, "yyyy-MM-dd");
      return availabilities.some((a) => a.userId === currentUser.id && a.date === dStr);
    });

    if (!hasEntries && weekends.length > 0) {
      setShowAvailabilityAlert(true);

      if (currentUser.email) {
        setTimeout(() => {
          setNotificationToast({
            message: `📧 Email automatica inviata a ${currentUser.email}: "Inserisci disponibilità per ${format(
              nextMonthDate,
              "MMMM",
              { locale: it }
            )}!"`,
            type: "error",
          });
        }, 500);
      }
    }
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
      const boat = boats.find((b) => b.id === record.boatId);
      const moreCount = expiringRecords.length - 1;

      setTimeout(() => {
        setNotificationToast({
          message: `⚠️ Manutenzione in scadenza: "${record.description}" su ${boat?.name}${
            moreCount > 0 ? ` (+${moreCount} altri)` : ""
          }`,
          type: "error",
        });
      }, 1000);
    }
  };


 useEffect(() => {
  if (!isLoggedIn) return;

  (async () => {
    // --- BOATS ---
    const { data: boatsData, error: boatsErr } = await supabase
      .from("boats")
      .select("id,name,type,image")
      .order("name", { ascending: true });

    console.log(
      "[A4][LOAD boats] rows:",
      (boatsData ?? []).length,
      "error:",
      boatsErr
    );
    console.log("[A4][LOAD boats sample]", (boatsData ?? [])[0]);

    if (boatsErr) return;

    setBoats(
  (boatsData ?? []).map((b: any) => {
    const raw = String(b.type ?? "").trim().toUpperCase();

    const normalizedType =
      raw === "VELA" ? "VELA" :
      raw === "MOTORE" ? "MOTORE" :
      // fallback “furbo” se qualcuno scrive robe strane
      raw.includes("VEL") ? "VELA" :
      raw.includes("MOT") ? "MOTORE" :
      "VELA";

    return {
      id: b.id,
      name: b.name,
      type: normalizedType,     // <-- ORA combacia con l'enum (VELA/MOTORE)
      image: b.image ?? "",
    };
  })
);


    // --- ACTIVITIES ---
    const { data: actsData, error: actsErr } = await supabase
      .from("activities")
      .select("*")
      .order("name", { ascending: true });

    console.log(
      "[A4][LOAD activities] rows:",
      (actsData ?? []).length,
      "error:",
      actsErr
    );

    if (actsErr) return;

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


    // --- A5: LOAD assignments ---
    const { data: asgRows, error: asgErr } = await supabase
  .from("assignments")
  .select("*")
  .order("start_date", { ascending: true });

console.log("[A12][LOAD assignments] rows:", (asgRows ?? []).length, "error:", asgErr);
if (asgErr) return;

setAssignments(
  (asgRows ?? []).map((r: any) => ({
    id: r.id,
    date: r.start_date,                 // <-- QUESTA è la chiave
    boatId: r.boat_id,
    instructorId: r.instructor_id ?? null,
    helperId: r.helper_id ?? null,
    activityId: r.activity_id ?? null,
    durationDays: r.duration_days ?? 1,
    status: r.status ?? "CONFIRMED",
    notes: r.notes ?? "",
  }))
);



  })();
}, [isLoggedIn]);


// A5) LOAD availabilities (DB -> state)
useEffect(() => {
  if (!isLoggedIn) return;

  let cancelled = false;

  (async () => {
    const { data, error } = await supabase
      .from("availabilities")
      .select("*")
      .order("date", { ascending: true });

    console.log("[A5][LOAD availabilities] rows:", (data ?? []).length, "error:", error);
    if (error || cancelled) return;

    setAvailabilities(
      (data ?? []).map((r: any) => ({
        userId: r.user_id,
        date: String(r.date), // "YYYY-MM-DD"
        status: r.status as AvailabilityStatus,
      }))
    );
  })();

  return () => {
    cancelled = true;
  };
}, [isLoggedIn]);

// A5) LOAD assignments (DB -> state)
useEffect(() => {
  if (!isLoggedIn) return;

  let cancelled = false;

  (async () => {
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .order("date", { ascending: true });

    console.log("[A5][LOAD assignments] rows:", (data ?? []).length, "error:", error);
    if (error || cancelled) return;

    setAssignments(
      (data ?? []).map((r: any) => ({
        id: r.id,
        date: String(r.start_date ?? r.date),
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
  })();

  return () => {
    cancelled = true;
  };
}, [isLoggedIn]);



useEffect(() => {
  if (!isLoggedIn) return;

  (async () => {
    const { data, error } = await supabase
      .from("day_notes")
      .select("*")
      .order("created_at", { ascending: true });

    console.log("[A5][LOAD day_notes] rows:", (data ?? []).length, "error:", error);
    if (error) return;

    setDayNotes(
      (data ?? []).map((r: any) => ({
        id: r.id,
        date: String(r.date),
        userId: r.user_id,
        text: r.text,
        createdAt: new Date(r.created_at).getTime(),
      }))
    );
  })();
}, [isLoggedIn]);





 useEffect(() => {
  if (!isLoggedIn || !currentUser) return;

  checkNextMonthAvailability();
  checkMaintenanceExpirations();
  checkForBirthdays();
}, [isLoggedIn, currentUser?.id]);



useEffect(() => {
  if (!isLoggedIn) return;

  let cancelled = false;

  (async () => {
    // 1) Boats
    const { data: boatsData, error: boatsErr } = await supabase
      .from("boats")
      .select("*")
      .order("name", { ascending: true });

    if (boatsErr) {
      console.error("boats load error:", boatsErr);
    } else if (!cancelled) {
      // Se vuoi mapping strong qui sotto (type/image), dimmelo e lo facciamo,
      // per ora lasciamo il raw se ti va bene.
      setBoats(boatsData ?? []);
    }

    // 2) Activities
    const { data: activitiesData, error: actErr } = await supabase
      .from("activities")
      .select("*")
      .order("name", { ascending: true });

    if (actErr) {
      console.error("activities load error:", actErr);
    } else if (!cancelled) {
      const mappedActivities = (activitiesData ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,

        // DB: allowed_boat_types (array) | fallback: allowedBoatTypes
        allowedBoatTypes: Array.isArray(a.allowedBoatTypes)
          ? a.allowedBoatTypes
          : Array.isArray(a.allowed_boat_types)
          ? a.allowed_boat_types
          : [],

        // DB: default_duration_days | fallback: defaultDurationDays
        defaultDurationDays:
          typeof a.defaultDurationDays === "number"
            ? a.defaultDurationDays
            : typeof a.default_duration_days === "number"
            ? a.default_duration_days
            : 1,

        // DB: is_general | fallback: isGeneral
        isGeneral:
          typeof a.isGeneral === "boolean"
            ? a.isGeneral
            : typeof a.is_general === "boolean"
            ? a.is_general
            : false,
      }));

      setActivities(mappedActivities);
      console.log("[A4][LOAD activities mapped] sample:", mappedActivities[0]);
    }

    // 3) Calendar events
    const { data: eventsData, error: evErr } = await supabase
      .from("calendar_events")
      .select("*")
      .order("start_date", { ascending: true });

    if (evErr) {
      console.error("calendar_events load error:", evErr);
    } else if (!cancelled) {
      const mapped = (eventsData ?? []).map((r: any) => ({
        id: r.id,
        boatId: r.boat_id,
        title: r.title,
        startDate: r.start_date,
        endDate: r.end_date,
        type: r.type,
        createdBy: r.created_by,
        createdAt: r.created_at,
      }));

      setCalendarEvents(mapped);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [isLoggedIn]);






  // --- FUNZIONI CRUD LOCALI (come nel tuo file) ---
  const handleForcePasswordChange = (newPassword: string) => {
    if (!pendingUser) return;
    const updatedUser = { ...pendingUser, password: newPassword, mustChangePassword: false };
    setUsers((prev) => prev.map((u) => (u.id === pendingUser.id ? updatedUser : u)));
    setPendingUser(null);
    setNotificationToast({ message: "Password impostata! Benvenuto a bordo." });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    setSelectedDate(null);
    setIsProfileOpen(false);
    setPendingUser(null);
    setIsUserManagementOpen(false);
    setIsFleetManagementOpen(false);
    setIsNotificationOpen(false);
    setShowAvailabilityAlert(false);

    setDbUser(null);
    setUsers([]);
  };

  const handleUpdateAvailability = async (newAvailability: Availability) => {
  // 1) aggiorno lo state subito (UI reattiva)
  setAvailabilities((prev) => {
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

  // 2) persisto su Supabase (unique(user_id,date) -> upsert)
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
    console.error("[A5][UPSERT availabilities] error:", error, payload);
    setNotificationToast({ message: "Errore salvataggio disponibilità (DB).", type: "error" });
  } else {
    console.log("[A5][UPSERT availabilities] ok:", payload);
  }
};



const handleUpdateAssignment = async (newAssignment: Assignment) => {
  // 1) state update
  setAssignments((prev) => {
    const existingById = prev.findIndex((a) => a.id === newAssignment.id);
    if (existingById >= 0) {
      const updated = [...prev];
      updated[existingById] = newAssignment;
      return updated;
    }

    const existingByDate = prev.findIndex(
      (a) => a.boatId === newAssignment.boatId && a.date === newAssignment.date
    );
    if (existingByDate >= 0) {
      const updated = [...prev];
      updated[existingByDate] = newAssignment;
      return updated;
    }

    return [...prev, newAssignment];
  });

  // 2) DB payload (camelCase -> snake_case) + start_date allineato
  const payload = {
    id: newAssignment.id,
    boat_id: newAssignment.boatId,
    date: newAssignment.date,
    start_date: newAssignment.date,
    instructor_id: newAssignment.instructorId,
    helper_id: newAssignment.helperId,
    activity_id: newAssignment.activityId,
    duration_days: newAssignment.durationDays ?? 1,
    status: newAssignment.status ?? AssignmentStatus.CONFIRMED,
    instructor_status: newAssignment.instructorStatus ?? null,
    helper_status: newAssignment.helperStatus ?? null,
    notes: newAssignment.notes ?? null,
  };

  const { data, error } = await supabase
    .from("assignments")
    .upsert(payload, { onConflict: "boat_id,date" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[A13][UPSERT assignments] error:", error, payload);
    setNotificationToast({ message: "Errore salvataggio missione (DB).", type: "error" });
    return;
  }

  console.log("[A13][UPSERT assignments] ok:", data);
};


  // 4) allinea lo state con ciò che torna dal DB (se vuoi essere super-stabile)
  // (Supabase torna un array di righe)
  const savedRow = (data ?? [])[0];
  if (!savedRow) return;

  const saved: Assignment = {
    id: savedRow.id,
    date: String(savedRow.date),
    boatId: savedRow.boat_id,
    instructorId: savedRow.instructor_id ?? null,
    helperId: savedRow.helper_id ?? null,
    activityId: savedRow.activity_id ?? null,
    durationDays: savedRow.duration_days ?? 1,
    status: (savedRow.status as AssignmentStatus) ?? AssignmentStatus.CONFIRMED,
    instructorStatus: savedRow.instructor_status ?? undefined,
    helperStatus: savedRow.helper_status ?? undefined,
    notes: savedRow.notes ?? undefined,
  };

  setAssignments((prev) =>
    prev.map((a) => (a.id === saved.id ? saved : a))
  );

  console.log("[A13][UPSERT assignments] ok:", savedRow);
};





const handleDeleteAssignment = async (id: string) => {
  if (!confirm("Sei sicuro di voler eliminare definitivamente questa missione?")) return;

  // 1) UI subito
  setAssignments((prev) => prev.filter((a) => a.id !== id));
  setNotificationToast({ message: "Missione eliminata dal registro.", type: "error" });

  // 2) DB
  const { error } = await supabase.from("assignments").delete().eq("id", id);

  if (error) {
    console.error("[A5][DELETE assignments] error:", error, { id });
    setNotificationToast({ message: "Errore eliminazione missione (DB).", type: "error" });
  } else {
    console.log("[A5][DELETE assignments] ok:", { id });
  }
};




  const handleCreateGeneralEvent = (
    date: string,
    activityId: string,
    startTime?: string,
    endTime?: string,
    notes?: string
  ) => {
    const act = activities.find((a) => a.id === activityId);
    const newEvent: GeneralEvent = {
      id: crypto.randomUUID(),
      date,
      activityId,
      startTime,
      endTime,
      notes,
      responses: users.map((u) => ({ userId: u.id, status: ConfirmationStatus.PENDING })),
    };

    setGeneralEvents((prev) => [...prev, newEvent]);
    setNotificationToast({ message: `Evento "${act?.name}" creato! Inviti spediti a tutti.` });

    const newNotifications: UserNotification[] = users.map((u) => ({
      id: crypto.randomUUID(),
      userId: u.id,
      type: NotificationType.EVENT_INVITE,
      message: `Invito: ${act?.name} il ${format(parseDate(date), "dd/MM")}`,
      read: false,
      data: { eventId: newEvent.id },
      createdAt: Date.now(),
    }));

    setNotifications((prev) => [...newNotifications, ...prev]);
  };

  const handleUpdateGeneralEvent = (updatedEvent: GeneralEvent) => {
    setGeneralEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    setNotificationToast({ message: "Evento modificato con successo." });
  };

  const handleDeleteGeneralEvent = (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questo evento social?")) {
      setGeneralEvents((prev) => prev.filter((e) => e.id !== id));
      setNotificationToast({ message: "Evento eliminato.", type: "error" });
    }
  };

  const handleEventResponse = (notification: UserNotification, isAccepted: boolean) => {
    if (!notification.data?.eventId || !currentUser) return;

    const newStatus = isAccepted ? ConfirmationStatus.CONFIRMED : ConfirmationStatus.REJECTED;

    setGeneralEvents((prev) =>
      prev.map((e) => {
        if (e.id === notification.data?.eventId) {
          const updatedResponses = e.responses.map((r) =>
            r.userId === currentUser.id ? { ...r, status: newStatus } : r
          );
          return { ...e, responses: updatedResponses };
        }
        return e;
      })
    );

    handleMarkNotificationRead(notification.id);
    setNotificationToast({ message: isAccepted ? "Partecipazione confermata!" : "Invito declinato." });
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

  const { data, error } = await supabase
    .from("day_notes")
    .insert(payload)
    .select("*")
    .single();

  console.log("[A9][INSERT day_notes]", payload, "error:", error);

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
  // 1) prendo la nota (per rollback se serve)
  const toDelete = dayNotes.find((n) => n.id === id);
  if (!toDelete) return;

  // 2) UI subito
  setDayNotes((prev) => prev.filter((n) => n.id !== id));

  // 3) DB
  const { error } = await supabase.from("day_notes").delete().eq("id", id);

  console.log("[A9][DELETE day_notes]", id, "error:", error);

  if (error) {
    // rollback
    setDayNotes((prev) => [...prev, toDelete].sort((a, b) => a.createdAt - b.createdAt));
    setNotificationToast({ message: "Errore eliminazione nota", type: "error" });
  }
};


  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleUpdateProfile = async (field: keyof User, value: any) => {
  if (!currentUser) return;

  // 1) UI ottimistica: aggiorno subito users[]
  setUsers((prev) =>
    prev.map((u) => (u.id === currentUser.id ? { ...u, [field]: value } : u))
  );

  // 2) mappa campi User -> colonne DB
  const fieldMap: Partial<Record<keyof User, string>> = {
    avatar: "avatar_url",
    phoneNumber: "phone_number",
    birthDate: "birth_date",
    googleCalendarConnected: "google_calendar_connected",
    isAdmin: "is_admin",
  };

  const dbColumn = fieldMap[field] ?? (field as string);

  const { data, error } = await supabase
    .from("users")
    .update({ [dbColumn]: value })
    .eq("auth_id", currentUser.id)
    .select("*")
    .single();

  if (error) {
    console.error("Update profile DB error:", error);

    // opzionale: rollback (se vuoi essere pignolo)
    // -> per farlo servirebbe salvare il valore precedente prima del setUsers
    return;
  }

  // 3) riallineo dbUser con la riga appena aggiornata
  setDbUser(data);
};



  const handleAdminUpdateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    setNotificationToast({ message: "Dati marinaio aggiornati con successo!" });
  };

  const handleAddUser = (
    name: string,
    role: Role,
    email: string,
    isAdmin: boolean,
    phoneNumber: string,
    birthDate: string
  ) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      username: name.toLowerCase().replace(/\s/g, ""),
      password: "1234",
      isAdmin,
      role,
      email,
      phoneNumber,
      birthDate,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=b6e3f4`,
      mustChangePassword: true,
      googleCalendarConnected: false,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const handleRemoveUser = (userId: string) => {
    if (userId === currentUserId) return;
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleToggleRole = (userId: string) => {
    if (userId === currentUserId) return;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          let newRole = Role.HELPER;
          if (u.role === Role.HELPER) newRole = Role.INSTRUCTOR;
          else if (u.role === Role.INSTRUCTOR) newRole = Role.MANAGER;
          return { ...u, role: newRole };
        }
        return u;
      })
    );
  };

  const getEffectiveAssignment = (dateStr: string, boatId: string) => {
    const targetDate = parseDate(dateStr);
    return assignments.find((a) => {
      if (a.boatId !== boatId) return false;
      const startDate = parseDate(a.date);
      const diff = differenceInCalendarDays(targetDate, startDate);
      return diff >= 0 && diff < a.durationDays;
    });
  };

  const getHoverData = () => {
  if (!hoveredDate) return [];

  // 1) eventi presi da calendar_events per quel giorno
  const dayCalEvents = calendarEvents.filter(
    (e) => e.startDate <= hoveredDate && e.endDate >= hoveredDate
  );

  // 2) li trasformo nel “formato” che DayHoverModal già si aspetta
  const calAsHoverRows = dayCalEvents.map((e) => ({
    boat:
      boats.find((b) => b.id === e.boatId) ??
      ({ id: e.boatId, name: "Barca", type: BoatType.SAILING, image: "" } as any),
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
    },
    instructor: null,
    helper: null,
  }));

  // 3) QUI è il tuo “vecchio” hoverData (boats+assignments ecc.)
  const assignmentHoverRows = boats
    .map((boat) => {
      const assignment = getEffectiveAssignment(hoveredDate, boat.id);
      if (!assignment || !assignment.activityId) return null;

      const activity = activities.find((a) => a.id === assignment.activityId);
      if (!activity) return null;

      return {
        boat,
        assignment,
        activity,
        instructor: users.find((u) => u.id === assignment.instructorId),
        helper: users.find((u) => u.id === assignment.helperId),
      };
    })
    .filter(Boolean);

  // 4) QUESTO è “cambiare il return”: unisco i due array
  return [...calAsHoverRows, ...assignmentHoverRows];
};


  const getDayNotesForHover = () => {
    if (!hoveredDate) return [];
    return dayNotes.filter((n) => n.date === hoveredDate);
  };

  const navigateCalendar = (direction: "prev" | "next") => {
    if (calendarView === "month") {
      setCurrentDate((prev) => (direction === "prev" ? addMonths(prev, -1) : addMonths(prev, 1)));
    } else {
      setCurrentDate((prev) => (direction === "prev" ? addDays(prev, -7) : addDays(prev, 7)));
    }
  };

  // --- GUARD CLAUSES ---
  if (!appReady) {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Caricamento Ciurma...</div>;
 }

 if (loading) {
  return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
 }

    if (isLoggedIn && !sessionUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Sto preparando il profilo…
      </div>
    );
  }

  // ✅ Se NON sei loggato, mostra la schermata login
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
          <div className="flex justify-center mb-6 text-blue-600">
            <Ship size={48} />
          </div>
          <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">
            Benvenuto a Bordo
          </h1>

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
  const daysToRender = (() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    if (calendarView === "month") {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    } else {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return eachDayOfInterval({ start, end });
    }
  })();

  const startDayPadding =
    calendarView === "month"
      ? (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7
      : 0;

  const myNotifications = notifications.filter((n) => n.userId === currentUserId);
  const unreadCount = myNotifications.filter((n) => !n.read).length;

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
          />
        )}

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Ship size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">
            Calendario Avui
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors relative"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentUser?.isAdmin && (
              <>
                <button
                  onClick={() => setIsUserManagementOpen(true)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <UsersIcon size={22} />
                </button>
                <button
                  onClick={() => setIsFleetManagementOpen(true)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors mr-2"
                >
                  <Anchor size={22} />
                </button>
              </>
            )}
            <span className="hidden md:inline text-sm font-medium text-slate-600 text-right">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {currentUser?.name}
              </div>
              {currentUser?.role}
            </span>
          </div>

          <div className="relative group cursor-pointer" onClick={() => setIsProfileOpen(true)}>
            <img
              src={currentUser?.avatar}
              className="w-9 h-9 rounded-full border border-slate-200 bg-slate-100"
              alt="Avatar"
            />
          </div>

          <button
            onClick={handleLogout}
            className="ml-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-slate-800 capitalize min-w-[200px]">
              {calendarView === "month"
                ? format(currentDate, "MMMM yyyy", { locale: it })
                : `Settimana ${format(currentDate, "w", { locale: it })}`}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => navigateCalendar("prev")}
                className="p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-medium hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200 text-slate-600"
              >
                Oggi
              </button>
              <button
                onClick={() => navigateCalendar("next")}
                className="p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setCalendarView("month")}
              className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${
                calendarView === "month" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CalendarDays size={16} /> Mese
            </button>
            <button
              onClick={() => setCalendarView("week")}
              className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${
                calendarView === "week" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CalendarRange size={16} /> Settimana
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
  {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
    <div
      key={day}
      className="bg-slate-50 p-4 text-center font-semibold text-sm text-slate-400 uppercase tracking-wider"
    >
      {day}
    </div>
  ))}

  {calendarView === "month" &&
    Array.from({ length: startDayPadding }).map((_, i) => (
      <div key={`empty-${i}`} className="bg-white min-h-[160px]" />
    ))}

  {daysToRender.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");

    // ✅ eventi che coprono quel giorno (start/end inclusi)
    const dayCalendarEvents = calendarEvents.filter((e) => {
      const start = (e.startDate ?? "").slice(0, 10);
      const end = (e.endDate ?? e.startDate ?? "").slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });

    const isDayWeekend = isWeekend(day);

    const myStatus = availabilities.find(
      (a) => a.userId === currentUser!.id && a.date === dateStr
    )?.status;

    const daysGeneralEvents = generalEvents.filter((e) => e.date === dateStr);
    const expiringMaintenance = maintenanceRecords.filter(
      (r) => r.expirationDate === dateStr && r.status !== MaintenanceStatus.DONE
    );
    const performedMaintenance = maintenanceRecords.filter((r) => r.date === dateStr);
    const notes = dayNotes.filter((n) => n.date === dateStr);

    let bgClass = "bg-white";
    if (myStatus === AvailabilityStatus.AVAILABLE)
      bgClass = "bg-emerald-50/70 hover:bg-emerald-100/50";
    if (myStatus === AvailabilityStatus.UNAVAILABLE)
      bgClass = "bg-rose-50/70 hover:bg-rose-100/50";
    if (isSameDay(day, new Date())) bgClass = "bg-blue-50/50";

    return (
      <div
        key={dateStr}
        onClick={() => {
          setSelectedDate(dateStr);

          const selected = calendarEvents.filter((e) => {
            const start = (e.startDate ?? "").slice(0, 10);
            const end = (e.endDate ?? e.startDate ?? "").slice(0, 10);
            return dateStr >= start && dateStr <= end;
          });

          setSelectedCalendarEvents(selected);

          // ✅ log solo al click
          console.log(
            "[A3][CLICK MATCH]",
            dateStr,
            "events:",
            selected.length,
            selected.map((e) => e.title)
          );
        }}
        onMouseEnter={() => setHoveredDate(dateStr)}
        onMouseLeave={() => setHoveredDate(null)}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        className={`${bgClass} min-h-[160px] p-2 transition-all cursor-pointer group flex flex-col relative`}
      >
        <div className="flex justify-between items-start mb-2">
          <span
            className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
              isSameDay(day, new Date())
                ? "bg-blue-600 text-white shadow-md"
                : isDayWeekend
                ? "text-slate-800"
                : "text-slate-400"
            }`}
          >
            {format(day, "d")}
          </span>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {/* ✅ NOTE */}
          {notes.length > 0 && (
            <div className="h-4 bg-amber-100 border border-amber-200 text-amber-600 rounded px-2 text-[9px] font-bold flex items-center gap-1 mb-1 shadow-sm">
              <MessageCircle size={8} />
              <span className="truncate">{notes.length} Note</span>
            </div>
          )}

          {/* ✅ EVENTI calendar_events (UNA SOLA RIGA “pin”) */}
          {dayCalendarEvents.length > 0 && (
            <div
              className="h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 bg-indigo-600 text-white font-bold"
              title={dayCalendarEvents
                .map((ev) => {
                  const boatName = boats.find((b) => b.id === ev.boatId)?.name ?? "Barca";
                  return `${boatName}: ${ev.title}`;
                })
                .join(" • ")}
            >
              <span className="truncate">
                📌{" "}
                {(() => {
                  const ev = dayCalendarEvents[0];
                  const boatName = boats.find((b) => b.id === ev.boatId)?.name ?? "Barca";
                  const extra = dayCalendarEvents.length > 1 ? ` (+${dayCalendarEvents.length - 1})` : "";
                  return `${boatName}: ${ev.title}${extra}`;
                })()}
              </span>
            </div>
          )}

          {/* ✅ GENERAL EVENTS (viola) */}
          {daysGeneralEvents.map((event) => {
            const act = activities.find((a) => a.id === event.activityId);
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

          {/* ✅ MAINTENANCE */}
          {currentUser?.isAdmin &&
            expiringMaintenance.map((record) => {
              const boat = boats.find((b) => b.id === record.boatId);
              const expDate = parseDate(record.expirationDate!);
              const isExpired = isBefore(expDate, new Date()) && !isSameDay(expDate, new Date());

              return (
                <div
                  key={record.id}
                  className={`h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 border ${
                    isExpired
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}
                >
                  <Wrench size={10} className="mr-1 shrink-0" />
                  <span className="font-bold truncate">SCADE: {boat?.name}</span>
                </div>
              );
            })}

          {currentUser?.isAdmin &&
            performedMaintenance.map((record) => {
              const boat = boats.find((b) => b.id === record.boatId);
              return (
                <div
                  key={record.id}
                  className="h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 border bg-blue-100 text-blue-700 border-blue-200"
                >
                  <CheckCircle size={10} className="mr-1 shrink-0" />
                  <span className="truncate">
                    {boat?.name}: {record.description}
                  </span>
                </div>
              );
            })}

          {/* ✅ ASSIGNMENTS */}
          {boats.map((boat) => {
            const assignment = getEffectiveAssignment(dateStr, boat.id);
            if (!assignment) return null;

            const activity = activities.find((a) => a.id === assignment.activityId);
            const isCancelled = assignment.status === AssignmentStatus.CANCELLED;
            const isStart = isSameDay(day, parseDate(assignment.date));

            let barColor = "bg-teal-600 text-white shadow-sm border border-teal-700/10";
            if (isCancelled)
              barColor =
                "bg-red-100 text-red-600 border border-red-200 decoration-line-through opacity-80";

            return (
              <div
                key={`${boat.id}-${assignment.id}`}
                className={`h-6 text-[10px] px-2 flex items-center overflow-hidden whitespace-nowrap ${barColor} rounded-md mx-1`}
              >
                {isStart && <span className="font-bold mr-1">{boat.name}</span>}
                {isStart && activity && <span className="opacity-90 truncate">{activity.name}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  })}

        </div>
      </main>

      {selectedDate && currentUser && (
        <DayModal
          date={selectedDate}
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          currentUser={currentUser}
          users={users}
          boats={boats}
          activities={activities}
          availabilities={availabilities}
          assignments={assignments}
          generalEvents={generalEvents}
          dayNotes={dayNotes}
          onUpdateAvailability={handleUpdateAvailability}
          onUpdateAssignment={handleUpdateAssignment}
          onDeleteAssignment={handleDeleteAssignment}
          onCreateGeneralEvent={handleCreateGeneralEvent}
          onUpdateGeneralEvent={handleUpdateGeneralEvent}
          onDeleteGeneralEvent={handleDeleteGeneralEvent}
          onAddDayNote={handleAddDayNote}
          onDeleteDayNote={handleDeleteDayNote}
          calendarEvents={selectedCalendarEvents}
        />
      )}

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        users={users}
        currentUserId={currentUserId}
        onAddUser={handleAddUser}
        onRemoveUser={handleRemoveUser}
        onToggleRole={handleToggleRole}
        onUpdateUser={handleAdminUpdateUser}
      />

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

      {isProfileOpen && currentUser && (
        <ProfilePage
          user={currentUser}
          users={users}
          assignments={assignments}
          boats={boats}
          activities={activities}
          onClose={() => setIsProfileOpen(false)}
          onUpdateUser={handleUpdateProfile}
        />
      )}
    </div>
  



export default App;
