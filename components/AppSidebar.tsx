import React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Wind,
  Megaphone,
  Ship,
  Wrench,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Anchor,
  X,
  Sparkles
} from "lucide-react";
import { Role, User } from "../types";

export type SectionType =
  | "dashboard"
  | "calendar"
  | "weather"
  | "notices"
  | "fleet"
  | "maintenance"
  | "users";

interface AppSidebarProps {
  activeSection: SectionType;
  onSelectSection: (section: SectionType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  currentUser: User | null;
  unreadNoticesCount?: number;
  maintenanceAlertCount?: number;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  currentUser,
  unreadNoticesCount = 0,
  maintenanceAlertCount = 0,
  onOpenProfile,
  onLogout,
}) => {
  const isAdmin = !!currentUser?.isAdmin;
  const isManager = currentUser?.role === Role.MANAGER;
  const isAdminOrManager = isAdmin || isManager;

  const mainNavItems = [
    {
      id: "dashboard" as SectionType,
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      badge: null,
    },
    {
      id: "calendar" as SectionType,
      label: "Calendario Uscite",
      icon: <CalendarDays size={20} />,
      badge: null,
    },
    {
      id: "weather" as SectionType,
      label: "Meteo Marino (Windy)",
      icon: <Wind size={20} />,
      badge: "Live",
      badgeColor: "bg-red-500 text-white",
    },
    {
      id: "notices" as SectionType,
      label: "Bacheca Avvisi",
      icon: <Megaphone size={20} />,
      badge: unreadNoticesCount > 0 ? String(unreadNoticesCount) : null,
      badgeColor: "bg-amber-500 text-slate-900",
    },
  ];

  const adminNavItems = [
    {
      id: "fleet" as SectionType,
      label: "Flotta & Barche",
      icon: <Ship size={20} />,
      visible: true,
    },
    {
      id: "maintenance" as SectionType,
      label: "Diario Manutenzioni",
      icon: <Wrench size={20} />,
      visible: isAdminOrManager,
      badge: maintenanceAlertCount > 0 ? String(maintenanceAlertCount) : null,
      badgeColor: "bg-orange-500 text-white",
    },
    {
      id: "users" as SectionType,
      label: "Gestione Utenti",
      icon: <Users size={20} />,
      visible: isAdmin,
    },
  ].filter((item) => item.visible);

  return (
    <>
      {/* Backdrop Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800
          transition-all duration-300 ease-in-out shadow-xl
          lg:static lg:z-30
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-20" : "lg:w-64"}
          w-72
        `}
      >
        {/* Header Logo */}
        <div className={`h-16 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 transition-all ${isCollapsed && !isMobileOpen ? "px-2" : "px-3.5"}`}>
          {isCollapsed && !isMobileOpen ? (
            <button
              onClick={onToggleCollapse}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 shadow-sm p-1.5 shrink-0 transition-colors cursor-pointer group"
              title="Espandi menu"
            >
              <img
                src="/logo-avui-icon.png"
                alt="AVUI"
                className="h-full w-full object-contain group-hover:scale-105 transition-transform"
              />
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0 pr-1 py-1">
              <img
                src="/logo-avui.png"
                alt="AVUI Sailing Team"
                className="h-9 w-auto max-w-[170px] object-contain shrink-0"
              />
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full shrink-0">
                2.0
              </span>
            </div>
          )}

          {/* Close Mobile Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>

          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? "Espandi menu" : "Comprimi menu"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-6">
          {/* Main Navigation */}
          <div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Navigazione
              </div>
            )}
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectSection(item.id);
                      if (isMobileOpen) onCloseMobile();
                    }}
                    title={isCollapsed && !isMobileOpen ? item.label : undefined}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative cursor-pointer
                      ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }
                      ${isCollapsed && !isMobileOpen ? "justify-center" : ""}
                    `}
                  >
                    <span
                      className={`shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"
                      }`}
                    >
                      {item.icon}
                    </span>

                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}

                    {(!isCollapsed || isMobileOpen) && item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          item.badgeColor || "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Collapsed Badge Dot Indicator */}
                    {isCollapsed && !isMobileOpen && item.badge && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-slate-900" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Admin / Fleet Section */}
          {adminNavItems.length > 0 && (
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                  <span>Gestione</span>
                  {isAdmin && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
              )}
              <nav className="space-y-1">
                {adminNavItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectSection(item.id);
                        if (isMobileOpen) onCloseMobile();
                      }}
                      title={isCollapsed && !isMobileOpen ? item.label : undefined}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative cursor-pointer
                        ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }
                        ${isCollapsed && !isMobileOpen ? "justify-center" : ""}
                      `}
                    >
                      <span
                        className={`shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? "text-white" : "text-slate-400 group-hover:text-amber-400"
                        }`}
                      >
                        {item.icon}
                      </span>

                      {(!isCollapsed || isMobileOpen) && (
                        <span className="truncate flex-1 text-left">{item.label}</span>
                      )}

                      {(!isCollapsed || isMobileOpen) && item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            item.badgeColor || "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Collapsed Badge Dot Indicator */}
                      {isCollapsed && !isMobileOpen && item.badge && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-slate-900" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div
            onClick={onOpenProfile}
            title={isCollapsed && !isMobileOpen ? `${currentUser?.name} (Profilo)` : undefined}
            className={`
              flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors group
              ${isCollapsed && !isMobileOpen ? "justify-center" : ""}
            `}
          >
            <div className="relative shrink-0">
              <img
                src={
                  currentUser?.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name || "sailor"}`
                }
                alt={currentUser?.name}
                className="w-9 h-9 rounded-full border border-slate-700 bg-slate-800 object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {currentUser?.name || "Utente"}
                </div>
                <div className="text-xs text-slate-400 truncate uppercase font-bold tracking-wider">
                  {currentUser?.role || "MARINAIO"}
                </div>
              </div>
            )}

            {(!isCollapsed || isMobileOpen) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout();
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                title="Disconnetti"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
