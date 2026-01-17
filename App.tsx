import React, { useState, useEffect } from 'react';
// import { ACTIVITIES, BOATS, USERS, MAINTENANCE_RECORDS } from './constants'; // Commentato perché usi il fetch
import { Activity, Assignment, AssignmentStatus, Availability, AvailabilityStatus, Boat, ConfirmationStatus, NotificationType, Role, User, UserNotification, GeneralEvent, DayNote, MaintenanceRecord, MaintenanceStatus } from './types';
import { DayModal } from './components/DayModal';
import { DayHoverModal } from './components/DayHoverModal';
import { LoginPage } from './components/LoginPage';
import { UserManagementModal } from './components/UserManagementModal';
import { ProfilePage } from './components/ProfilePage';
import { ForcePasswordChange } from './components/ForcePasswordChange';
import { FleetManagementPage } from './components/FleetManagementPage';
import { format, endOfMonth, eachDayOfInterval, isSameDay, isWeekend, addMonths, addDays, differenceInCalendarDays, isAfter, isBefore, endOfWeek, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale'; // Fix import per versioni recenti
import { ChevronLeft, ChevronRight, Ship, Skull, X, CheckCircle, Users as UsersIcon, LogOut, Anchor, Calendar as CalendarIcon, AlertTriangle, Bell, Check, Trash2, Eye, PartyPopper, CalendarDays, CalendarRange, MessageCircle, Wrench } from 'lucide-react';

const parseDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Toast Component
const NotificationToast = ({ message, type, onClose }: { message: string, type?: 'success' | 'error', onClose: () => void }) => (
    <div className="fixed bottom-6 right-6 z-[100] bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 max-w-md">
        <div className={`rounded-full p-1 text-slate-900 shrink-0 ${type === 'error' ? 'bg-rose-500' : 'bg-green-500'}`}>
            {type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
        </div>
        <div>
            <p className="text-sm font-medium">{message}</p>
        </div>
        <button onClick={onClose} className="ml-2 hover:bg-slate-700 p-1 rounded-full"><X size={14}/></button>
    </div>
);

// Availability Modal Component
const AvailabilityWarningModal = ({ nextMonthName, onClose }: { nextMonthName: string, onClose: () => void }) => (
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

const App: React.FC = () => {
  // 1. DEFINIZIONE STATI (Consolidati tutti qui)
  const [appReady, setAppReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // AGGIUNGI QUESTA RIGA:
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Dati
  const [users, setUsers] = useState<User[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [generalEvents, setGeneralEvents] = useState<GeneralEvent[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);

  // UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [notificationToast, setNotificationToast] = useState<any>(null);
  const [showAvailabilityAlert, setShowAvailabilityAlert] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isFleetManagementOpen, setIsFleetManagementOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // AGGIUNGI QUESTA FUNZIONE INTERA:
  const handleServerLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const username = (form.elements.namedItem('username') as HTMLInputElement).value;
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;

      setLoginError(null);
      
      try {
          const response = await fetch('/wp-json/avui/v1/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
          });

          const data = await response.json();

          if (!response.ok) {
              throw new Error('Credenziali non valide');
          }

          // Login OK: Se l'utente non era in lista, lo aggiungiamo al volo
          if (!users.find(u => u.id === data.id)) {
              setUsers(prev => [...prev, data]);
          }

          setCurrentUserId(data.id);
          setIsAuthenticated(true);
      } catch (err) {
          setLoginError("Utente o password errati.");
      }
  };

  // 2. FETCH DATI INIZIALI
  useEffect(() => {
    fetch('/wp-json/avui/v1/state')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users ?? []);
        setBoats(data.boats ?? []);
        setActivities(data.activities ?? []);
        setAvailabilities(data.availabilities ?? []);
        setAssignments(data.assignments ?? []);
        setGeneralEvents(data.generalEvents ?? []);
        setDayNotes(data.dayNotes ?? []);
        setNotifications(data.notifications ?? []);
        setMaintenanceRecords(data.maintenanceRecords ?? []);
        setAppReady(true);
      })
      .catch(err => {
          console.error("Errore fetch:", err);
          // Fallback per non bloccare l'app se il fetch fallisce in dev
          setAppReady(true); 
      });
  }, []);

  

  // 3. LOGICHE CALCOLATE
  const currentUser = users.find(u => u.id === currentUserId);

  // Calendar Logic Calculation
  const getDaysToRender = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      if (calendarView === 'month') {
          const monthStart = new Date(year, month, 1);
          const monthEnd = new Date(year, month + 1, 0);
          return eachDayOfInterval({ start: monthStart, end: monthEnd });
      } else {
          // Week view: Show Mon-Sun of the current date week
          const start = new Date(currentDate);
          const day = start.getDay();
          const diff = start.getDate() - day + (day === 0 ? -6 : 1);
          start.setDate(diff);
          start.setHours(0,0,0,0);
          
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23,59,59,999);
          
          return eachDayOfInterval({ start, end });
      }
  };
  
  const daysToRender = getDaysToRender();
  const startDayPadding = calendarView === 'month' ? (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7 : 0;
  const nextMonthDate = addMonths(new Date(), 1);
  
  const myNotifications = notifications.filter(n => n.userId === currentUserId);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  // 4. EFFECTS LOGICI
  // Auto-dismiss toast
  useEffect(() => {
    if (notificationToast) {
        const timer = setTimeout(() => setNotificationToast(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [notificationToast]);

  // Check Availability for Next Month on Login AND Maintenance Expirations AND Birthdays
  useEffect(() => {
    if (isAuthenticated && currentUser) {
        checkNextMonthAvailability();
        checkMaintenanceExpirations();
        checkForBirthdays();
    }
  }, [isAuthenticated]);

  // 5. FUNZIONI LOGICHE
  const checkForBirthdays = () => {
      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();
      
      const birthdayUsers = users.filter(u => {
          if(!u.birthDate) return false;
          const bdate = parseDate(u.birthDate);
          return bdate.getMonth() === todayMonth && bdate.getDate() === todayDay;
      });

      if (birthdayUsers.length > 0) {
          setNotifications(prev => {
              const newNotifs: UserNotification[] = [];
              
              birthdayUsers.forEach(u => {
                  const msg = `🎉 Oggi è il compleanno di ${u.name}! Tanti auguri! 🎂`;
                  if (!prev.some(n => n.message === msg && n.type === NotificationType.INFO)) {
                      users.forEach(recipient => {
                          newNotifs.push({
                              id: crypto.randomUUID(),
                              userId: recipient.id,
                              type: NotificationType.INFO,
                              message: msg,
                              read: false,
                              createdAt: Date.now()
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
      
      const hasEntries = weekends.some(day => {
          const dStr = format(day, 'yyyy-MM-dd');
          return availabilities.some(a => a.userId === currentUser.id && a.date === dStr);
      });

      if (!hasEntries && weekends.length > 0) {
          setShowAvailabilityAlert(true);
          
          if (currentUser.email) {
              setTimeout(() => {
                  setNotificationToast({
                      message: `📧 Email automatica inviata a ${currentUser.email}: "Inserisci disponibilità per ${format(nextMonthDate, 'MMMM', { locale: it })}!"`,
                      type: 'error'
                  });
              }, 500);
          }
      }
  };

  const checkMaintenanceExpirations = () => {
      if (!currentUser?.isAdmin) return;

      const expiringRecords = maintenanceRecords.filter(r => {
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
                  message: `⚠️ Manutenzione in scadenza: "${record.description}" su ${boat?.name}${moreCount > 0 ? ` (+${moreCount} altri)` : ''}`,
                  type: 'error'
              });
          }, 1000);
      }
  };

  const handleLogin = (user: User) => {
    if (user.mustChangePassword) {
        setPendingUser(user);
        return;
    }
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
  };

  const handleForcePasswordChange = (newPassword: string) => {
      if (!pendingUser) return;
      const updatedUser = { ...pendingUser, password: newPassword, mustChangePassword: false };
      setUsers(prev => prev.map(u => u.id === pendingUser.id ? updatedUser : u));
      setCurrentUserId(updatedUser.id);
      setIsAuthenticated(true);
      setPendingUser(null);
      setNotificationToast({ message: "Password impostata! Benvenuto a bordo." });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUserId(null); // Importante reset
    setSelectedDate(null);
    setIsProfileOpen(false);
    setPendingUser(null);
    setIsUserManagementOpen(false);
    setIsFleetManagementOpen(false);
    setIsNotificationOpen(false);
    setShowAvailabilityAlert(false);
  };

  const handleUpdateAvailability = (newAvailability: Availability) => {
    setAvailabilities(prev => {
      const existing = prev.findIndex(a => a.userId === newAvailability.userId && a.date === newAvailability.date);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAvailability;
        return updated;
      }
      return [...prev, newAvailability];
    });
  };

  const handleUpdateAssignment = (newAssignment: Assignment) => {
    setAssignments(prev => {
        const existingById = prev.findIndex(a => a.id === newAssignment.id);
        if (existingById >= 0) {
            const updated = [...prev];
            updated[existingById] = newAssignment;
            return updated;
        }
        const existingByDate = prev.findIndex(a => a.boatId === newAssignment.boatId && a.date === newAssignment.date);
        if (existingByDate >= 0) {
            const updated = [...prev];
            updated[existingByDate] = newAssignment;
            return updated;
        }
        return [...prev, newAssignment];
    });
  };

  const handleDeleteAssignment = (id: string) => {
      if(confirm("Sei sicuro di voler eliminare definitivamente questa missione?")) {
          setAssignments(prev => prev.filter(a => a.id !== id));
          setNotificationToast({ message: "Missione eliminata dal registro.", type: 'error' });
      }
  };

  const handleCreateGeneralEvent = (date: string, activityId: string, startTime?: string, endTime?: string, notes?: string) => {
      const act = activities.find(a => a.id === activityId);
      const newEvent: GeneralEvent = {
          id: crypto.randomUUID(),
          date,
          activityId,
          startTime,
          endTime,
          notes,
          responses: users.map(u => ({ userId: u.id, status: ConfirmationStatus.PENDING }))
      };
      
      setGeneralEvents(prev => [...prev, newEvent]);
      setNotificationToast({ message: `Evento "${act?.name}" creato! Inviti spediti a tutti.` });

      const newNotifications: UserNotification[] = users.map(u => ({
          id: crypto.randomUUID(),
          userId: u.id,
          type: NotificationType.EVENT_INVITE,
          message: `Invito: ${act?.name} il ${format(parseDate(date), 'dd/MM')}`,
          read: false,
          data: { eventId: newEvent.id },
          createdAt: Date.now()
      }));

      setNotifications(prev => [...newNotifications, ...prev]);
  };

  const handleUpdateGeneralEvent = (updatedEvent: GeneralEvent) => {
      setGeneralEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      setNotificationToast({ message: "Evento modificato con successo." });
  };

  const handleDeleteGeneralEvent = (id: string) => {
      if(confirm("Sei sicuro di voler eliminare questo evento social?")) {
          setGeneralEvents(prev => prev.filter(e => e.id !== id));
          setNotificationToast({ message: "Evento eliminato.", type: 'error' });
      }
  };

  const handleEventResponse = (notification: UserNotification, isAccepted: boolean) => {
      if (!notification.data?.eventId || !currentUser) return;
      
      const newStatus = isAccepted ? ConfirmationStatus.CONFIRMED : ConfirmationStatus.REJECTED;

      setGeneralEvents(prev => prev.map(e => {
          if (e.id === notification.data?.eventId) {
              const updatedResponses = e.responses.map(r => 
                  r.userId === currentUser.id ? { ...r, status: newStatus } : r
              );
              return { ...e, responses: updatedResponses };
          }
          return e;
      }));

      handleMarkNotificationRead(notification.id);
      setNotificationToast({ message: isAccepted ? "Partecipazione confermata!" : "Invito declinato." });
  };

  const handleAddDayNote = (date: string, text: string) => {
      if(!currentUser) return;
      const note: DayNote = {
          id: crypto.randomUUID(),
          date,
          userId: currentUser.id,
          text,
          createdAt: Date.now()
      };
      setDayNotes(prev => [...prev, note]);
  };

  const handleDeleteDayNote = (id: string) => {
      setDayNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleConfirmAssignment = (notification: UserNotification, isConfirmed: boolean) => {
      if (!notification.data?.assignmentId) return;

      const newStatus = isConfirmed ? ConfirmationStatus.CONFIRMED : ConfirmationStatus.REJECTED;

      setAssignments(prev => prev.map(a => {
          if (a.id === notification.data?.assignmentId) {
              const updated = { ...a };
              if (notification.data?.role === Role.INSTRUCTOR) updated.instructorStatus = newStatus;
              if (notification.data?.role === Role.HELPER) updated.helperStatus = newStatus;
              if (notification.data?.role === 'MANAGER') updated.instructorStatus = newStatus; // Gestione caso limite
              return updated;
          }
          return a;
      }));

      handleMarkNotificationRead(notification.id);
  };

  const handleMarkNotificationRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleUpdateProfile = (field: keyof User, value: any) => {
    if(!currentUser) return;
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, [field]: value } : u));
  };

  const handleAdminUpdateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    setNotificationToast({ message: "Dati marinaio aggiornati con successo!" });
  };
  
  const handleAddUser = (name: string, role: Role, email: string, isAdmin: boolean, phoneNumber: string, birthDate: string) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      username: name.toLowerCase().replace(/\s/g, ''),
      password: '1234',
      isAdmin,
      role,
      email,
      phoneNumber,
      birthDate,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=b6e3f4`,
      mustChangePassword: true,
      googleCalendarConnected: false
    };
    setUsers([...users, newUser]);
  };

  const handleRemoveUser = (userId: string) => {
    if (userId === currentUserId) return;
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleToggleRole = (userId: string) => {
    if (userId === currentUserId) return;
    setUsers(users.map(u => {
      if (u.id === userId) {
        let newRole = Role.HELPER;
        if (u.role === Role.HELPER) newRole = Role.INSTRUCTOR;
        else if (u.role === Role.INSTRUCTOR) newRole = Role.MANAGER; // Assumendo esista MANAGER nell'enum Role
        return { ...u, role: newRole };
      }
      return u;
    }));
  };

  const getEffectiveAssignment = (dateStr: string, boatId: string) => {
    const targetDate = parseDate(dateStr);
    return assignments.find(a => {
        if (a.boatId !== boatId) return false;
        const startDate = parseDate(a.date);
        const diff = differenceInCalendarDays(targetDate, startDate);
        return diff >= 0 && diff < a.durationDays;
    });
  };
  
  const getHoverData = () => {
    if (!hoveredDate) return [];
    return boats.map(boat => {
      const assignment = getEffectiveAssignment(hoveredDate, boat.id);
      if (!assignment || !assignment.activityId) return null;
      const activity = activities.find(a => a.id === assignment.activityId);
      if (!activity) return null;
      return {
        boat, assignment, activity,
        instructor: users.find(u => u.id === assignment.instructorId),
        helper: users.find(u => u.id === assignment.helperId)
      };
    }).filter(item => item !== null);
  };

  const getDayNotesForHover = () => {
      if (!hoveredDate) return [];
      return dayNotes.filter(n => n.date === hoveredDate);
  }

  const navigateCalendar = (direction: 'prev' | 'next') => {
      if (calendarView === 'month') {
          setCurrentDate(prev => direction === 'prev' ? addMonths(prev, -1) : addMonths(prev, 1));
      } else {
          setCurrentDate(prev => direction === 'prev' ? addDays(prev, -7) : addDays(prev, 7));
      }
  };

  // 6. BLOCCHI DI RITORNO SICURI (Guard Clauses)
  if (!appReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Caricamento Ciurma...</div>;
  }

  // SOSTITUISCI IL VECCHIO BLOCCO "if (!isAuthenticated)" CON QUESTO:
  if (!isAuthenticated) {
    if (pendingUser) {
        return <ForcePasswordChange user={pendingUser} onSave={handleForcePasswordChange} />;
    }
    
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

                <form onSubmit={handleServerLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
                        <input name="username" type="text" className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Es. trifo" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                        <input name="password" type="password" className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="••••••••" required />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md hover:shadow-lg mt-2">
                        ACCEDI
                    </button>
                </form>
            </div>
        </div>
    );
  }

  // 7. RENDER PRINCIPALE
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative">
      {notificationToast && <NotificationToast message={notificationToast.message} type={notificationToast.type} onClose={() => setNotificationToast(null)} />}
      
      {showAvailabilityAlert && (
          <AvailabilityWarningModal 
             nextMonthName={format(nextMonthDate, 'MMMM', { locale: it })}
             onClose={() => setShowAvailabilityAlert(false)} 
          />
      )}

      {hoveredDate && !isProfileOpen && !selectedDate && !isUserManagementOpen && !isFleetManagementOpen && !isNotificationOpen && (
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
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">Calendario Avui</h1>
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
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white">{unreadCount}</span>
                    )}
                </button>
            </div>

            <div className="flex items-center gap-2">
               {currentUser.isAdmin && (
                 <>
                   <button onClick={() => setIsUserManagementOpen(true)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"><UsersIcon size={22} /></button>
                   <button onClick={() => setIsFleetManagementOpen(true)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors mr-2"><Anchor size={22} /></button>
                 </>
               )}
               <span className="hidden md:inline text-sm font-medium text-slate-600 text-right">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{currentUser.name}</div>
                  {currentUser.role}
               </span>
            </div>
            
            <div className="relative group cursor-pointer" onClick={() => setIsProfileOpen(true)}>
              <img src={currentUser.avatar} className="w-9 h-9 rounded-full border border-slate-200 bg-slate-100" alt="Avatar" />
            </div>

            <button onClick={handleLogout} className="ml-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors">
              <LogOut size={20} />
            </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
                 <h2 className="text-3xl font-bold text-slate-800 capitalize min-w-[200px]">
                    {calendarView === 'month' 
                        ? format(currentDate, 'MMMM yyyy', { locale: it }) 
                        : `Settimana ${format(currentDate, 'w', { locale: it })}`}
                 </h2>
                 <div className="flex gap-2">
                    <button onClick={() => navigateCalendar('prev')} className="p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-medium hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200 text-slate-600">Oggi</button>
                    <button onClick={() => navigateCalendar('next')} className="p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"><ChevronRight size={20} /></button>
                </div>
            </div>
            
            <div className="flex bg-slate-200 p-1 rounded-lg">
                <button 
                    onClick={() => setCalendarView('month')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${calendarView === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <CalendarDays size={16} /> Mese
                </button>
                <button 
                    onClick={() => setCalendarView('week')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${calendarView === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <CalendarRange size={16} /> Settimana
                </button>
            </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className="bg-slate-50 p-4 text-center font-semibold text-sm text-slate-400 uppercase tracking-wider">{day}</div>
            ))}
            {calendarView === 'month' && Array.from({ length: startDayPadding }).map((_, i) => <div key={`empty-${i}`} className="bg-white min-h-[160px]" />)}

            {daysToRender.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isDayWeekend = isWeekend(day);
                const myStatus = availabilities.find(a => a.userId === currentUser.id && a.date === dateStr)?.status;
                const daysGeneralEvents = generalEvents.filter(e => e.date === dateStr);
                const expiringMaintenance = maintenanceRecords.filter(r => r.expirationDate === dateStr && r.status !== MaintenanceStatus.DONE);
                const performedMaintenance = maintenanceRecords.filter(r => r.date === dateStr);
                const notes = dayNotes.filter(n => n.date === dateStr);
                
                let bgClass = "bg-white";
                if (myStatus === AvailabilityStatus.AVAILABLE) bgClass = "bg-emerald-50/70 hover:bg-emerald-100/50";
                if (myStatus === AvailabilityStatus.UNAVAILABLE) bgClass = "bg-rose-50/70 hover:bg-rose-100/50";
                if (isSameDay(day, new Date())) bgClass = "bg-blue-50/50";

                return (
                    <div 
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        onMouseEnter={() => setHoveredDate(dateStr)}
                        onMouseLeave={() => setHoveredDate(null)}
                        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                        className={`${bgClass} min-h-[160px] p-2 transition-all cursor-pointer group flex flex-col relative`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white shadow-md' : (isDayWeekend ? 'text-slate-800' : 'text-slate-400')}`}>{format(day, 'd')}</span>
                        </div>

                        <div className="flex flex-col gap-1 flex-1">
                           {notes.length > 0 && (
                               <div className="h-4 bg-amber-100 border border-amber-200 text-amber-600 rounded px-2 text-[9px] font-bold flex items-center gap-1 mb-1 shadow-sm">
                                   <MessageCircle size={8} /> 
                                   <span className="truncate">{notes.length} Note</span>
                               </div>
                           )}

                           {daysGeneralEvents.map(event => {
                               const act = activities.find(a => a.id === event.activityId);
                               return (
                                   <div key={event.id} className="h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 bg-purple-500 text-white font-bold">
                                           <PartyPopper size={10} className="mr-1" />
                                           <span className="truncate">{act?.name}</span>
                                   </div>
                               );
                           })}

                           {/* Maintenance Expirations (Admin Only) */}
                           {currentUser.isAdmin && expiringMaintenance.map(record => {
                               const boat = boats.find(b => b.id === record.boatId);
                               const expDate = parseDate(record.expirationDate!);
                               const isExpired = isBefore(expDate, new Date()) && !isSameDay(expDate, new Date());
                               
                               return (
                                   <div key={record.id} className={`h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 border ${isExpired ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                           <Wrench size={10} className="mr-1 shrink-0" />
                                           <span className="font-bold truncate">SCADE: {boat?.name}</span>
                                   </div>
                               );
                           })}
                           
                           {/* Performed Maintenance (Admin Only) */}
                           {currentUser.isAdmin && performedMaintenance.map(record => {
                               const boat = boats.find(b => b.id === record.boatId);
                               return (
                                   <div key={record.id} className="h-5 text-[10px] px-2 flex items-center rounded overflow-hidden whitespace-nowrap mb-0.5 border bg-blue-100 text-blue-700 border-blue-200">
                                           <CheckCircle size={10} className="mr-1 shrink-0" />
                                           <span className="truncate">{boat?.name}: {record.description}</span>
                                   </div>
                               );
                           })}

                           {boats.map(boat => {
                               const assignment = getEffectiveAssignment(dateStr, boat.id);
                               if (!assignment) return null; 
                               const activity = activities.find(a => a.id === assignment.activityId);
                               const isCancelled = assignment.status === AssignmentStatus.CANCELLED;
                               const isStart = isSameDay(day, parseDate(assignment.date));
                               
                               let barColor = "bg-teal-600 text-white shadow-sm border border-teal-700/10";
                               if (isCancelled) barColor = "bg-red-100 text-red-600 border border-red-200 decoration-line-through opacity-80";

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

      {selectedDate && (
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
        />
      )}

      <UserManagementModal isOpen={isUserManagementOpen} onClose={() => setIsUserManagementOpen(false)} users={users} currentUserId={currentUserId} onAddUser={handleAddUser} onRemoveUser={handleRemoveUser} onToggleRole={handleToggleRole} onUpdateUser={handleAdminUpdateUser} />
      <FleetManagementPage isOpen={isFleetManagementOpen} onClose={() => setIsFleetManagementOpen(false)} boats={boats} activities={activities} maintenanceRecords={maintenanceRecords} onUpdateBoats={setBoats} onUpdateActivities={setActivities} onUpdateMaintenance={setMaintenanceRecords} />
      {isProfileOpen && <ProfilePage user={currentUser} users={users} assignments={assignments} boats={boats} activities={activities} onClose={() => setIsProfileOpen(false)} onUpdateUser={handleUpdateProfile} /> }
    </div>
  );
};

export default App;