import React from "react";
import { format, isSameDay, isWeekend } from "date-fns";
import { AvailabilityStatus, Assignment, CalendarEvent, DayNote, GeneralEvent, MaintenanceRecord, User, Boat, Activity } from "../types";
import { WeekViewGrid } from "./WeekViewGrid";

export type CalendarGridProps = {
  daysToRender: Date[];
  calendarView: "month" | "week";
  startDayPadding: number;

  currentUser: User | null;

  boats: Boat[];
  activitiesById: Map<string, Activity>;
  boatsById: Map<string, Boat>;
  usersById: Map<string, User>;

  calEventsByDate: Map<string, CalendarEvent[]>;
  generalEventsByDate: Map<string, GeneralEvent[]>;
  maintenanceByDate: { expiring: Map<string, MaintenanceRecord[]>; performed: Map<string, MaintenanceRecord[]> };
  myAvailabilityByDate: Map<string, AvailabilityStatus>;
  notesByDate: Map<string, DayNote[]>;

  getEffectiveAssignment: (dateStr: string, boatId: string) => Assignment | undefined;
  isCommanderConfirmed: (a: Assignment) => boolean;

  onDayClick: (dateStr: string) => void;
  onOpenBoatPage: (boatId: string) => void;
  onDayEnter: (dateStr: string) => void;
  onDayLeave: () => void;
  onMouseMove: (e: React.MouseEvent) => void;

  DayCell: React.ComponentType<any>; // riusi il tuo DayCell senza riscriverlo
};

export function CalendarGrid({
  daysToRender,
  calendarView,
  startDayPadding,
  currentUser,
  boats,
  activitiesById,
  boatsById,
  usersById,
  calEventsByDate,
  generalEventsByDate,
  maintenanceByDate,
  myAvailabilityByDate,
  notesByDate,
  getEffectiveAssignment,
  isCommanderConfirmed,
  onDayClick,
  onOpenBoatPage,
  onDayEnter,
  onDayLeave,
  onMouseMove,
  DayCell,
}: CalendarGridProps) {
  if (calendarView === "week") {
    return <WeekViewGrid {...arguments[0]} />;
  }

  return (
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

        const dayCalendarEvents = calEventsByDate.get(dateStr) ?? [];
        const isDayWeekend = isWeekend(day);
        const myStatus = myAvailabilityByDate.get(dateStr);

        const daysGeneralEvents = generalEventsByDate.get(dateStr) ?? [];
        const expiringMaintenance = currentUser?.isAdmin ? (maintenanceByDate.expiring.get(dateStr) ?? []) : [];
        const performedMaintenance = currentUser?.isAdmin ? (maintenanceByDate.performed.get(dateStr) ?? []) : [];
        const notes = notesByDate.get(dateStr) ?? [];

        let bgClass = "bg-white";
        if (myStatus === AvailabilityStatus.AVAILABLE) bgClass = "bg-emerald-50/70 hover:bg-emerald-100/50";
        if (myStatus === AvailabilityStatus.UNAVAILABLE) bgClass = "bg-rose-50/70 hover:bg-rose-100/50";
        if (isSameDay(day, new Date())) bgClass = "bg-blue-50/50";

        return (
          <DayCell
            key={dateStr}
            dateStr={dateStr}
            day={day}
            isToday={isSameDay(day, new Date())}
            isWeekendDay={isDayWeekend}
            bgClass={bgClass}
            notesCount={notes.length}
            dayCalendarEvents={dayCalendarEvents}
            daysGeneralEvents={daysGeneralEvents}
            expiringMaintenance={expiringMaintenance}
            performedMaintenance={performedMaintenance}
            boats={boats}
            activitiesById={activitiesById}
            boatsById={boatsById}
            usersById={usersById}
            getEffectiveAssignment={getEffectiveAssignment}
            isCommanderConfirmed={isCommanderConfirmed}
            onClick={() => onDayClick(dateStr)}
            onOpenBoatPage={onOpenBoatPage}
            onMouseEnter={() => onDayEnter(dateStr)}
            onMouseLeave={onDayLeave}
            onMouseMove={onMouseMove}
          />
        );
      })}
    </div>
  );
}
