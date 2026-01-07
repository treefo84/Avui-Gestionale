
import React, { useState, useEffect } from 'react';
import { ACTIVITIES, BOATS, USERS, MAINTENANCE_RECORDS } from './constants';
import { Activity, Assignment, AssignmentStatus, Availability, AvailabilityStatus, Boat, ConfirmationStatus, NotificationType, Role, User, UserNotification, GeneralEvent, DayNote, MaintenanceRecord, MaintenanceStatus } from './types';
import { DayModal } from './components/DayModal';
import { DayHoverModal } from './components/DayHoverModal';
import { LoginPage } from './components/LoginPage';
import { UserManagementModal } from './components/UserManagementModal';
import { ProfilePage } from './components/ProfilePage';
import { ForcePasswordChange } from './components/ForcePasswordChange';
import { FleetManagementPage } from './components/FleetManagementPage';
import { format, eachDayOfInterval, isSameDay, isWeekend, addMonths, addDays, differenceInCalendarDays, isAfter, isBefore, differenceInDays } from 'date-fns';
import it from 'date-fns/locale/it';
import { ChevronLeft, ChevronRight, Ship, Skull, X, CheckCircle, Users as UsersIcon, LogOut, Anchor, Calendar as CalendarIcon, AlertTriangle, Bell, Check, Trash2, Eye, PartyPopper, CalendarDays, CalendarRange, MessageCircle, Wrench, Mail } from 'lucide-react';

const parseDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<User[]>(USERS);
  const [currentUserId, setCurrentUserId] = useState<string>(USERS[0].id);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const [boats, setBoats] = useState<Boat[]>(BOATS);
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [generalEvents, setGeneralEvents] = useState<GeneralEvent[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(MAINTENANCE_RECORDS);
  
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isFleetManagementOpen, setIsFleetManagementOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationToast, setNotificationToast] = useState<{message: string, type?: 'success' | 'error'} | null>(null);
  
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const getDaysToRender = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      if (calendarView === 'month') {
          const monthStart = new Date(year, month, 1);
          const monthEnd = new Date(year, month + 1, 0);
          return eachDayOfInterval({ start: monthStart, end: monthEnd });
      } else {
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

  useEffect(() => {
    if (notificationToast) {
        const timer = setTimeout(() => setNotificationToast(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [notificationToast]);

  const sendEmailSimulation = (userId: string, assignment: Assignment) => {
      const user = users.find(u => u.id === userId);
      if (user?.email) {
          const boat = boats.find(b => b.id === assignment.boatId);
          const activity = activities.find(a => a.id === assignment.activityId);
          setNotificationToast({
              message: `📧 Email inviata a ${user.email}: "Nuova convocazione per ${activity?.name} su ${boat?.name}"`,
              type: 'success'
          });
      }
  };

  const createInAppNotification = (userId: string, assignment: Assignment) => {
      const boat = boats.find(b => b.id === assignment.boatId);
      const activity = activities.find(a => a.id === assignment.activityId);
      const dateStr = format(parseDate(assignment.date), 'dd MMMM', { locale: it });

      const newNotif: UserNotification = {
          id: crypto.randomUUID(),
          userId,
          type: NotificationType.ASSIGNMENT_REQUEST,
          message: `⚓ Sei stato convocato! ${activity?.name} su ${boat?.name} il ${dateStr}. Confermi la presenza?`,
          read: false,
          data: {
              assignmentId: assignment.id,
              role: userId === assignment.instructorId ? Role.INSTRUCTOR : Role.HELPER
          },
          createdAt: Date.now()
      };
      setNotifications(prev => [newNotif, ...prev]);
  };

  const handleUpdateAssignment = (newAssignment: Assignment) => {
    setAssignments(prev => {
        const existingIdx = prev.findIndex(a => a.id === newAssignment.id);
        const oldAssignment = existingIdx >= 0 ? prev[existingIdx] : null;

        if (newAssignment.instructorId && newAssignment.instructorId !== oldAssignment?.instructorId) {
            newAssignment.instructorStatus = ConfirmationStatus.PENDING;
            createInAppNotification(newAssignment.instructorId, newAssignment);
            sendEmailSimulation(newAssignment.instructorId, newAssignment);
        }
        if (newAssignment.helperId && newAssignment.helperId !== oldAssignment?.helperId) {
            newAssignment.helperStatus = ConfirmationStatus.PENDING;
            createInAppNotification(newAssignment.helperId, newAssignment);
            sendEmailSimulation(newAssignment.helperId, newAssignment);
        }

        if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = newAssignment;
            return updated;
        }
        return [...prev, newAssignment];
    });
  };

  const handleConfirmAssignmentFromNotif = (notification: UserNotification, status: ConfirmationStatus) => {
      if (!notification.data?.assignmentId) return;
      
      setAssignments(prev => prev.map(a => {
          if (a.id === notification.data?.assignmentId) {
              const updated = { ...a };
              if (notification.data?.role === Role.INSTRUCTOR) updated.instructorStatus = status;
              else if (notification.data?.role === Role.HELPER) updated.helperStatus = status;
              return updated;
          }
          return a;
      }));

      handleMarkNotificationRead(notification.id);
      setNotificationToast({
          message: status === ConfirmationStatus.CONFIRMED ? "Missione confermata! Buon vento." : "Missione rifiutata.",
          type: status === ConfirmationStatus.CONFIRMED ? 'success' : 'error'
      });
  };

  const handleMarkNotificationRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleLogin = (user: User) => {
    if (user.mustChangePassword) {
        setPendingUser(user);
        return;
    }
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedDate(null);
    setIsProfileOpen(false);
    setPendingUser(null);
    setIsUserManagementOpen(false);
    setIsFleetManagementOpen(false);
    setIsNotificationOpen(false);
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
      if (calendarView === 'month') {
          setCurrentDate(prev => direction === 'prev' ? addMonths(prev, -1) : addMonths(prev, 1));
      } else {
          setCurrentDate(prev => direction === 'prev' ? addDays(prev, -7) : addDays(prev, 7));
      }
  };

  const myNotifications = notifications.filter(n => n.userId === currentUser.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  if (!isAuthenticated) {
    if (pendingUser) return <ForcePasswordChange user={pendingUser} onSave={(p) => { 
        setUsers(prev => prev.map(u => u.id === pendingUser.id ? {...u, password: p, mustChangePassword: false} : u));
        setCurrentUserId(pendingUser.id);
        setIsAuthenticated(true);
        setPendingUser(null);
    }} />;
    return <LoginPage users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative">
      {notificationToast && <NotificationToast message={notificationToast.message} type={notificationToast.type} onClose={() => setNotificationToast(null)} />}

      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Ship size={20} /></div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">Calendario Avui</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="relative">
                <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors relative">
                    <Bell size={22} />
                    {unreadCount > 0 && <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">{unreadCount}</span>}
                </button>
                {isNotificationOpen && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Notifiche</span>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {myNotifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400"><p className="text-xs">Nessuna notifica</p></div>
                            ) : (
                                myNotifications.map(n => (
                                    <div key={n.id} className={`p-4 border-b border-slate-50 last:border-0 ${n.read ? 'opacity-60' : 'bg-blue-50/30'}`}>
                                        <p className="text-xs text-slate-700 mb-3 leading-relaxed">{n.message}</p>
                                        {!n.read && n.type === NotificationType.ASSIGNMENT_REQUEST && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleConfirmAssignmentFromNotif(n, ConfirmationStatus.CONFIRMED)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"><Check size={12} /> Conferma</button>
                                                <button onClick={() => handleConfirmAssignmentFromNotif(n, ConfirmationStatus.REJECTED)} className="flex-1 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-600 text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"><X size={12} /> Rifiuta</button>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[9px] text-slate-400">{format(n.createdAt, 'dd MMM HH:mm', { locale: it })}</span>
                                            {!n.read && <button onClick={() => handleMarkNotificationRead(n.id)} className="text-[9px] text-blue-600 font-bold hover:underline">Segna letto</button>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
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
            <img onClick={() => setIsProfileOpen(true)} src={currentUser.avatar} className="w-9 h-9 rounded-full border border-slate-200 bg-slate-100 cursor-pointer" alt="Avatar" />
            <button onClick={handleLogout} className="ml-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"><LogOut size={20} /></button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
                 <h2 className="text-3xl font-bold text-slate-800 capitalize min-w-[200px]">
                    {calendarView === 'month' ? format(currentDate, 'MMMM yyyy', { locale: it }) : `Settimana ${format(currentDate, 'w', { locale: it })}`}
                 </h2>
                 <div className="flex gap-2">
                    <button onClick={() => navigateCalendar('prev')} className="p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-medium hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200 text-slate-600">Oggi</button>
                    <button onClick={() => navigateCalendar('next')} className="p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"><ChevronRight size={20} /></button>
                </div>
            </div>
            <div className="flex bg-slate-200 p-1 rounded-lg">
                <button onClick={() => setCalendarView('month')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${calendarView === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><CalendarDays size={16} /> Mese</button>
                <button onClick={() => setCalendarView('week')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${calendarView === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><CalendarRange size={16} /> Settimana</button>
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
                const notes = dayNotes.filter(n => n.date === dateStr);
                
                let bgClass = "bg-white";
                if (myStatus === AvailabilityStatus.AVAILABLE) bgClass = "bg-emerald-50/70 hover:bg-emerald-100/50";
                if (myStatus === AvailabilityStatus.UNAVAILABLE) bgClass = "bg-rose-50/70 hover:bg-rose-100/50";
                if (isSameDay(day, new Date())) bgClass = "bg-blue-50/50";

                const getEffAsgn = (boatId: string) => {
                    const targetDate = parseDate(dateStr);
                    return assignments.find(a => {
                        if (a.boatId !== boatId) return false;
                        const startDate = parseDate(a.date);
                        const diff = differenceInCalendarDays(targetDate, startDate);
                        return diff >= 0 && diff < a.durationDays;
                    });
                };

                return (
                    <div key={dateStr} onClick={() => setSelectedDate(dateStr)} onMouseEnter={() => setHoveredDate(dateStr)} onMouseLeave={() => setHoveredDate(null)} onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })} className={`${bgClass} min-h-[160px] p-2 transition-all cursor-pointer group flex flex-col relative`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white' : (isDayWeekend ? 'text-slate-800' : 'text-slate-400')}`}>{format(day, 'd')}</span>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                           {notes.length > 0 && <div className="h-4 bg-amber-100 border border-amber-200 text-amber-600 rounded px-2 text-[9px] font-bold flex items-center gap-1 mb-1 shadow-sm"><MessageCircle size={8} /> {notes.length} Note</div>}
                           {boats.map(boat => {
                               const assignment = getEffAsgn(boat.id);
                               if (!assignment) return null; 
                               const isStart = isSameDay(day, parseDate(assignment.date));
                               const isPending = assignment.instructorStatus === ConfirmationStatus.PENDING || assignment.helperStatus === ConfirmationStatus.PENDING;
                               const isCancelled = assignment.status === AssignmentStatus.CANCELLED;
                               let barColor = isCancelled ? "bg-red-100 text-red-600" : isPending ? "bg-amber-400 text-white" : "bg-teal-600 text-white";
                               return (
                                   <div key={`${boat.id}-${assignment.id}`} className={`h-6 text-[10px] px-2 flex items-center overflow-hidden whitespace-nowrap ${barColor} rounded-md mx-1`}>
                                       {isStart && <span className="font-bold mr-1">{boat.name}</span>}
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
            maintenanceRecords={currentUser.isAdmin ? maintenanceRecords : []}
            onUpdateAvailability={(av) => setAvailabilities(prev => [...prev.filter(a => !(a.userId === av.userId && a.date === av.date)), av])}
            onUpdateAssignment={handleUpdateAssignment}
            onDeleteAssignment={(id) => setAssignments(prev => prev.filter(a => a.id !== id))}
            onCreateGeneralEvent={() => {}} 
            onUpdateGeneralEvent={() => {}}
            onDeleteGeneralEvent={() => {}}
            onAddDayNote={(d, t) => setDayNotes(prev => [...prev, {id: crypto.randomUUID(), date: d, text: t, userId: currentUser.id, createdAt: Date.now()}])}
            onDeleteDayNote={(id) => setDayNotes(prev => prev.filter(n => n.id !== id))}
        />
      )}

      <UserManagementModal isOpen={isUserManagementOpen} onClose={() => setIsUserManagementOpen(false)} users={users} currentUserId={currentUserId} onAddUser={() => {}} onRemoveUser={() => {}} onToggleRole={() => {}} onUpdateUser={() => {}} />
      <FleetManagementPage isOpen={isFleetManagementOpen} onClose={() => setIsFleetManagementOpen(false)} boats={boats} activities={activities} maintenanceRecords={maintenanceRecords} onUpdateBoats={setBoats} onUpdateActivities={setActivities} onUpdateMaintenance={setMaintenanceRecords} />
      {isProfileOpen && <ProfilePage user={currentUser} users={users} assignments={assignments} boats={boats} activities={activities} onClose={() => setIsProfileOpen(false)} onUpdateUser={() => {}} />}
    </div>
  );
};

export default App;
