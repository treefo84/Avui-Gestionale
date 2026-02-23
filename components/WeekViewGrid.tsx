import React, { useMemo, useRef, useEffect } from "react";
import { format, isSameDay, isWeekend, parse } from "date-fns";
import { AvailabilityStatus, Assignment, CalendarEvent, DayNote, GeneralEvent, MaintenanceRecord, User, Boat, Activity } from "../types";
import { parseDate } from "../utils/dateUtils";

type Props = {
    daysToRender: Date[];
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
};

// Costanti per la griglia oraria
const HOUR_HEIGHT = 60; // 1 pixel al minuto
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekViewGrid(props: Props) {
    const {
        daysToRender,
        currentUser,
        boats,
        activitiesById,
        boatsById,
        calEventsByDate,
        generalEventsByDate,
        maintenanceByDate,
        myAvailabilityByDate,
        notesByDate,
        getEffectiveAssignment,
        isCommanderConfirmed,
        onDayClick,
    } = props;

    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to current time or 8:00 AM on mount
    useEffect(() => {
        if (scrollRef.current) {
            const currentHour = new Date().getHours();
            const startHour = currentHour > 2 ? currentHour - 2 : 8;
            scrollRef.current.scrollTop = startHour * HOUR_HEIGHT;
        }
    }, []);

    // Helper per distinguere "All Day" da "Timed"
    const getEventsByDay = (dayStr: string) => {
        const dayCalEvents = calEventsByDate.get(dayStr) || [];
        const dayGenEvents = generalEventsByDate.get(dayStr) || [];

        const timedEvents: any[] = [];
        const allDayEvents: any[] = [];

        dayCalEvents.forEach(e => {
            if (e.startTime) timedEvents.push({ ...e, isCal: true });
            else allDayEvents.push({ ...e, isCal: true });
        });

        dayGenEvents.forEach(e => {
            if (e.startTime) timedEvents.push({ ...e, isGen: true });
            else allDayEvents.push({ ...e, isGen: true });
        });

        return { timedEvents, allDayEvents };
    };

    const calculateTopAndHeight = (startTime: string, endTime: string | null) => {
        const [startH, startM] = startTime.split(':').map(Number);
        const top = (startH * HOUR_HEIGHT) + startM;

        let height = HOUR_HEIGHT; // default 1 hour if no end time
        if (endTime) {
            const [endH, endM] = endTime.split(':').map(Number);
            let endTop = (endH * HOUR_HEIGHT) + endM;
            if (endTop <= top) endTop = top + HOUR_HEIGHT; // fallback
            height = endTop - top;
        }
        return { top, height };
    };

    return (
        <div className="flex flex-col h-[700px] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header Sticky: Giorni e All-Day */}
            <div className="flex bg-slate-50 border-b border-slate-200 z-10 sticky top-0">
                <div className="w-16 flex-shrink-0 border-r border-slate-200">
                    {/* Fuso Orario spalla */}
                    <div className="h-12 flex items-end justify-center pb-1 text-[10px] text-slate-400 font-medium">GMT+1</div>
                </div>

                <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200">
                    {daysToRender.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const isToday = isSameDay(day, new Date());
                        const myStatus = myAvailabilityByDate.get(dateStr);
                        const isDayWeekend = isWeekend(day);
                        const { allDayEvents } = getEventsByDay(dateStr);
                        const notes = notesByDate.get(dateStr) || [];

                        let bgClass = "bg-transparent";
                        if (myStatus === AvailabilityStatus.AVAILABLE) bgClass = "bg-emerald-50/70";
                        if (myStatus === AvailabilityStatus.UNAVAILABLE) bgClass = "bg-rose-50/70";

                        return (
                            <div
                                key={dateStr}
                                className={`flex flex-col ${bgClass}`}
                                onClick={() => onDayClick(dateStr)}
                            >
                                {/* Day Header */}
                                <div className={`p-2 text-center border-b border-slate-100 ${isToday ? 'bg-blue-50/50' : ''}`}>
                                    <div className="text-xs font-semibold text-slate-500 uppercase">{format(day, "eee")}</div>
                                    <div className={`text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-blue-600 text-white shadow-sm' : isDayWeekend ? 'text-slate-800' : 'text-slate-700'}`}>
                                        {format(day, "d")}
                                    </div>
                                </div>

                                {/* All-Day Content Area (Fixed short height with overflow) */}
                                <div className="h-24 overflow-y-auto p-1 space-y-1 custom-scrollbar cursor-pointer hover:bg-slate-100/50 transition-colors">
                                    {/* Notes Indicator */}
                                    {notes.length > 0 && (
                                        <div className="h-5 bg-amber-100 border border-amber-200 text-amber-700 text-[10px] rounded px-1 flex items-center font-bold">
                                            {notes.length} Note
                                        </div>
                                    )}

                                    {/* All Day Events */}
                                    {allDayEvents.map(e => (
                                        <div key={e.id} className={`h-5 text-[10px] rounded px-1 flex items-center font-bold truncate ${e.isCal ? 'bg-indigo-600 text-white' : 'bg-purple-500 text-white'}`}>
                                            {e.title || (e.activityId ? activitiesById.get(e.activityId)?.name : 'Evento')}
                                        </div>
                                    ))}

                                    {/* Boats/Assignments */}
                                    {boats.map(boat => {
                                        const assignment = getEffectiveAssignment(dateStr, boat.id);
                                        if (!assignment) return null;
                                        const activity = assignment.activityId ? activitiesById.get(assignment.activityId) : undefined;
                                        const isConfirmed = isCommanderConfirmed(assignment);

                                        let color = "bg-slate-500 text-white";
                                        if (isConfirmed) color = "bg-emerald-600 text-white";

                                        return (
                                            <div key={boat.id} className={`h-5 text-[9px] rounded px-1 flex items-center font-bold truncate ${color}`}>
                                                {boat.name}: {activity?.name || 'M'}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Grid Scrollable: Time Grid */}
            <div className="flex-1 overflow-y-auto relative custom-scrollbar bg-slate-50" ref={scrollRef}>
                <div className="flex relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>

                    {/* Time Axis (Left column) */}
                    <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-white relative">
                        {HOURS.map(hour => (
                            <div key={hour} className="absolute w-full text-right pr-2 text-[10px] font-medium text-slate-400" style={{ top: `${hour * HOUR_HEIGHT - 6}px` }}>
                                {hour === 0 ? '' : `${hour.toString().padStart(2, '0')}:00`}
                            </div>
                        ))}
                    </div>

                    {/* Lines & Day Columns */}
                    <div className="flex-1 relative bg-white">
                        {/* Horizontal Grid Lines */}
                        {HOURS.map(hour => (
                            <div key={hour} className="absolute w-full border-t border-slate-100 pointer-events-none" style={{ top: `${hour * HOUR_HEIGHT}px` }} />
                        ))}

                        {/* Vertical Columns & Events */}
                        <div className="grid grid-cols-7 absolute inset-0 divide-x divide-slate-100">
                            {daysToRender.map(day => {
                                const dateStr = format(day, "yyyy-MM-dd");
                                const myStatus = myAvailabilityByDate.get(dateStr);
                                const { timedEvents } = getEventsByDay(dateStr);

                                let bgClass = "bg-transparent";
                                if (myStatus === AvailabilityStatus.AVAILABLE) bgClass = "bg-emerald-50/20";
                                if (myStatus === AvailabilityStatus.UNAVAILABLE) bgClass = "bg-rose-50/20";

                                return (
                                    <div
                                        key={dateStr}
                                        className={`relative group cursor-pointer ${bgClass}`}
                                        onClick={() => onDayClick(dateStr)}
                                    >
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/50 transition-colors pointer-events-none" />

                                        {/* Timed Events Render */}
                                        {timedEvents.map((evt, idx) => {
                                            const { top, height } = calculateTopAndHeight(evt.startTime, evt.endTime);
                                            // simple overlap avoidance by indenting (could be improved)
                                            const left = `${(idx % 3) * 5}%`;
                                            const width = `${90 - (idx % 3) * 5}%`;

                                            return (
                                                <div
                                                    key={evt.id}
                                                    className={`absolute rounded-md shadow flex flex-col overflow-hidden text-[10px] p-1 border hover:z-20 transition-all ${evt.isCal
                                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                                                            : 'bg-purple-100 border-purple-300 text-purple-800'
                                                        }`}
                                                    style={{ top: `${top}px`, height: `${height}px`, left, width }}
                                                    onClick={(e) => { e.stopPropagation(); onDayClick(dateStr); }}
                                                >
                                                    <div className="font-bold truncate">{evt.startTime.slice(0, 5)} {evt.title || 'Evento'}</div>
                                                    {height > 30 && <div className="truncate opacity-80">{evt.notes || ''}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
