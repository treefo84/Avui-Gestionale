import React from "react";
import {
  Menu,
  Bell,
  LogOut,
  ChevronRight,
  Sparkles,
  Ship,
  LayoutDashboard,
  CalendarDays,
  Wind,
  Megaphone,
  Wrench,
  Users
} from "lucide-react";
import { User, UserNotification } from "../types";
import { SectionType } from "./AppSidebar";

type Props = {
  currentUser: User | null;
  currentUserId: string | null;
  activeSection: SectionType;
  onToggleMobileSidebar: () => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isProfileOpen: boolean;
  setIsProfileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  notificationPanelRef: React.RefObject<HTMLDivElement>;
  notifications: UserNotification[];
  handleLogout: () => void;
  handleEventResponse: (n: UserNotification, accepted: boolean) => void;
  handleAssignmentResponse: (n: UserNotification, accepted: boolean) => void;
  handleMarkNotificationRead: (id: string) => void;
};

export function AppNavbar({
  currentUser,
  currentUserId,
  activeSection,
  onToggleMobileSidebar,
  isNotificationOpen,
  setIsNotificationOpen,
  isProfileOpen,
  setIsProfileOpen,
  notificationPanelRef,
  notifications,
  handleLogout,
  handleEventResponse,
  handleAssignmentResponse,
  handleMarkNotificationRead,
}: Props) {
  const myNotifications = notifications.filter((n) => n.userId === currentUserId);
  const unread = myNotifications.filter((n) => !n.read);

  const getSectionTitle = () => {
    switch (activeSection) {
      case "dashboard":
        return { name: "Dashboard", icon: <LayoutDashboard size={18} className="text-blue-500" /> };
      case "calendar":
        return { name: "Calendario Uscite", icon: <CalendarDays size={18} className="text-blue-500" /> };
      case "weather":
        return { name: "Meteo Marino Windy", icon: <Wind size={18} className="text-sky-500" /> };
      case "notices":
        return { name: "Bacheca Avvisi", icon: <Megaphone size={18} className="text-amber-500" /> };
      case "fleet":
        return { name: "Flotta & Imbarcazioni", icon: <Ship size={18} className="text-blue-500" /> };
      case "maintenance":
        return { name: "Diario Manutenzioni", icon: <Wrench size={18} className="text-amber-500" /> };
      case "users":
        return { name: "Gestione Utenti", icon: <Users size={18} className="text-indigo-500" /> };
      default:
        return { name: "Panoramica", icon: <Ship size={18} className="text-blue-500" /> };
    }
  };

  const sectionInfo = getSectionTitle();

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs px-3 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Left side: Hamburger (mobile) + Breadcrumbs / Title */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          aria-label="Apri Menu"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm sm:text-base">
            <span className="hidden sm:inline text-slate-400 font-normal">Avui</span>
            <ChevronRight size={14} className="text-slate-300 hidden sm:inline" />
            <div className="flex items-center gap-1.5">
              {sectionInfo.icon}
              <span className="font-bold text-slate-800">{sectionInfo.name}</span>
            </div>
          </div>
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full border border-blue-200 hidden sm:inline">
            2.0
          </span>
        </div>
      </div>

      {/* Right side: Notifications + User Profile + Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell + Panel */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen((v) => !v)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer"
            aria-label="Notifiche"
          >
            <Bell size={20} />

            {unread.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white animate-pulse">
                {unread.length}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div
              ref={notificationPanelRef}
              className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-14 sm:top-full sm:mt-2 
                         sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden
                         z-[9999] origin-top sm:origin-top-right flex flex-col max-h-[85vh] sm:max-w-[400px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold text-sm">Notifiche Nuove</span>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-blue-300">
                  {unread.length} da leggere
                </span>
              </div>

              <div className="max-h-[70vh] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                {unread.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    <p>Nessuna nuova notifica.</p>
                  </div>
                ) : (
                  unread.map((n) => {
                    const type = String(n.type ?? "").toUpperCase();
                    const isInvite = type === "EVENT_INVITE" && (n as any).data?.eventId;
                    const isAssignmentReq = type === "ASSIGNMENT_REQUEST";

                    return (
                      <div key={n.id} className="p-3.5 bg-slate-50 hover:bg-white transition-colors">
                        <div className="text-sm font-semibold text-slate-800">{n.message}</div>

                        {isInvite && (
                          <div className="mt-2.5 flex gap-2">
                            <button
                              onClick={() => handleEventResponse(n, true)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-xs"
                            >
                              Accetta
                            </button>
                            <button
                              onClick={() => handleEventResponse(n, false)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 cursor-pointer shadow-xs"
                            >
                              Rifiuta
                            </button>
                          </div>
                        )}

                        {isAssignmentReq && (
                          <div className="mt-2.5 flex gap-2">
                            <button
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
                              onClick={() => handleAssignmentResponse(n, true)}
                            >
                              Accetta
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xs"
                              onClick={() => handleAssignmentResponse(n, false)}
                            >
                              Rifiuta
                            </button>
                          </div>
                        )}

                        {!isInvite && !isAssignmentReq && (
                          <button
                            onClick={() => handleMarkNotificationRead(n.id)}
                            className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            Segna come letta
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Avatar */}
        <div
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center gap-2.5 pl-2 py-1 pr-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-all border border-transparent hover:border-slate-200"
          title="Apri Profilo Personale"
        >
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {currentUser?.name || "Utente"}
            </span>
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
              {currentUser?.role || "MARINAIO"}
            </span>
          </div>

          <div className="relative">
            <img
              src={
                currentUser?.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name || "sailor"}`
              }
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 object-cover"
              alt="Avatar"
            />
            {currentUser?.isAdmin && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-[8px] font-black text-slate-900 px-1 rounded-full border border-white">
                ★
              </span>
            )}
          </div>
        </div>

        {/* Quick Logout */}
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
          aria-label="Logout"
          title="Esci dall'applicazione"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}

