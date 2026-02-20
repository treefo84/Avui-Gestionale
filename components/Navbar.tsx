import React from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Anchor,
  Bell,
  LogOut,
  Ship,
  Users as UsersIcon,
} from "lucide-react";

import { NotificationType, User, UserNotification } from "../types";

type Props = {
  currentUser: User | null;
  currentUserId: string | null;

  // notifiche
  notifications: UserNotification[];
  unreadCount: number;
  isNotificationOpen: boolean;
  setIsNotificationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  notificationPanelRef: React.RefObject<HTMLDivElement>;

  // modali / navigation
  setIsUserManagementOpen: (v: boolean) => void;
  setIsFleetManagementOpen: (v: boolean) => void;
  setIsProfileOpen: (v: boolean) => void;

  // azioni notifiche
  handleMarkNotificationRead: (id: string) => void;
  handleEventResponse: (n: UserNotification, accepted: boolean) => void;
  handleAssignmentResponse: (n: UserNotification, accepted: boolean) => void;

  // logout
  handleLogout: () => void;
};

export const Navbar: React.FC<Props> = React.memo(function Navbar({
  currentUser,
  currentUserId,
  notifications,
  unreadCount,
  isNotificationOpen,
  setIsNotificationOpen,
  notificationPanelRef,
  setIsUserManagementOpen,
  setIsFleetManagementOpen,
  setIsProfileOpen,
  handleMarkNotificationRead,
  handleEventResponse,
  handleAssignmentResponse,
  handleLogout,
}) {
  const myNotifications = notifications.filter((n) => n.userId === currentUserId);
  const unreadOnly = myNotifications.filter((n) => !n.read);

  return (
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
        {/* Notification Bell + Panel */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen((v) => !v)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors relative"
            aria-label="Notifiche"
          >
            <Bell size={22} />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div
              ref={notificationPanelRef}
              className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-24px)]
                         bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden
                         z-[9999]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-slate-100 font-bold text-slate-700">
                Notifiche nuove
              </div>

              <div className="max-h-[70vh] overflow-y-auto">
                {unreadOnly.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">Nessuna nuova notifica.</div>
                ) : (
                  unreadOnly.map((n) => {
                    const t = String(n.type ?? "").toUpperCase();
                    const isInvite =
                      t === String(NotificationType.EVENT_INVITE).toUpperCase() &&
                      (n as any).data?.eventId;
                    const isAssignmentReq =
                      t === String(NotificationType.ASSIGNMENT_REQUEST).toUpperCase();

                    return (
                      <div key={n.id} className="p-3 border-b border-slate-100 bg-slate-50">
                        <div className="text-sm font-semibold text-slate-800">{n.message}</div>

                        {isInvite && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => handleEventResponse(n, true)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                            >
                              Accetta
                            </button>
                            <button
                              onClick={() => handleEventResponse(n, false)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600"
                            >
                              Rifiuta
                            </button>
                          </div>
                        )}

                        {isAssignmentReq && (
                          <div className="mt-2 flex gap-2">
                            <button
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => handleAssignmentResponse(n, true)}
                            >
                              Accetta
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
                              onClick={() => handleAssignmentResponse(n, false)}
                            >
                              Rifiuta
                            </button>
                          </div>
                        )}

                        {!isInvite && !isAssignmentReq && (
                          <button
                            onClick={() => handleMarkNotificationRead(n.id)}
                            className="mt-2 text-xs font-bold text-blue-600 hover:underline"
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

        {/* Admin buttons + user label */}
        <div className="flex items-center gap-2">
          {currentUser?.isAdmin && (
            <>
              <button
                onClick={() => setIsUserManagementOpen(true)}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Gestione utenti"
              >
                <UsersIcon size={22} />
              </button>
              <button
                onClick={() => setIsFleetManagementOpen(true)}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors mr-2"
                aria-label="Gestione flotta"
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

        {/* Avatar */}
        <div className="relative group cursor-pointer" onClick={() => setIsProfileOpen(true)}>
          <img
            src={currentUser?.avatar}
            className="w-9 h-9 rounded-full border border-slate-200 bg-slate-100"
            alt="Avatar"
          />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="ml-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
          aria-label="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
});
