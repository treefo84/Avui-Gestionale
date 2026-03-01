import React, { useMemo } from 'react';
import {
    format,
    addDays,
    isSameDay,
    isWeekend,
    parseISO
} from 'date-fns';
import { it } from 'date-fns/locale';
import {
    User,
    Availability,
    Assignment,
    GeneralEvent,
    Boat,
    Activity,
    AvailabilityStatus,
    AssignmentStatus,
    ConfirmationStatus
} from '../types';

interface TableViewProps {
    users: User[];
    availabilities: Availability[];
    assignments: Assignment[];
    generalEvents: GeneralEvent[];
    boats: Boat[];
    activities: Activity[];
    onDateClick: (dateStr: string) => void;
    onOpenBoatPage: (boatId: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({
    users,
    availabilities,
    assignments,
    generalEvents,
    boats,
    activities,
    onDateClick,
    onOpenBoatPage
}) => {

    // 1. Generate Relevant Dates (from today up to 60 days ahead)
    const relevantDates = useMemo(() => {
        const dates: Date[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 60; i++) {
            const d = addDays(today, i);
            const dateStr = format(d, 'yyyy-MM-dd');

            // Is it weekend?
            const isWe = isWeekend(d);

            // Does it have availabilities?
            const hasAvail = availabilities.some(a => a.date === dateStr);

            // Does it have an event?
            const hasEvent = generalEvents.some(e => e.date === dateStr);

            // Does it have an assignment? (considering duration)
            const hasAssignment = assignments.some(a => {
                if (a.status === AssignmentStatus.CANCELLED) return false;
                const aStart = parseISO(a.date);
                const aEnd = addDays(aStart, a.durationDays - 1);
                return d >= aStart && d <= aEnd;
            });

            if (isWe || hasAvail || hasEvent || hasAssignment) {
                dates.push(d);
            }
        }
        return dates;
    }, [availabilities, assignments, generalEvents]);

    // Order users: instructors first, then helpers (alphabetically ordered inside their groups)
    const sortedUsers = useMemo(() => {
        const instructors = users.filter(u => u.role === 'ISTRUTTORE').sort((a, b) => a.name.localeCompare(b.name));
        const helpers = users.filter(u => u.role !== 'ISTRUTTORE').sort((a, b) => a.name.localeCompare(b.name));
        return [...instructors, ...helpers];
    }, [users]);

    // Helper to find assignment for a user on a given date
    const getUserAssignment = (userId: string, targetDate: Date) => {
        return assignments.find(a => {
            if (a.status === AssignmentStatus.CANCELLED) return false;
            if (a.instructorId !== userId && a.helperId !== userId) return false;

            const aStart = parseISO(a.date);
            const aEnd = addDays(aStart, a.durationDays - 1);
            return targetDate >= aStart && targetDate <= aEnd;
        });
    };

    // Helper to find general event for a user on a given date
    const getUserEvent = (userId: string, targetDateStr: string) => {
        return generalEvents.find(e =>
            e.date === targetDateStr &&
            e.responses.some(r => r.userId === userId && r.status === ConfirmationStatus.CONFIRMED)
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-250px)] min-h-[700px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-slate-800">Vista Matrice Assegnazioni</h2>
                <div className="text-sm text-slate-500">
                    Mostra fine settimana e giorni con attività pianificate
                </div>
            </div>

            <div className="overflow-auto flex-1 p-4 relative custom-scrollbar">
                <table className="w-full border-collapse min-w-max">
                    <thead className="sticky top-0 z-20 bg-white shadow-sm">
                        <tr>
                            <th className="p-2 border border-slate-200 bg-slate-100 text-left sticky left-0 z-30 shadow-[1px_0_0_#e2e8f0]">
                                <span className="font-semibold text-slate-700 text-sm">Utente</span>
                            </th>
                            {relevantDates.map(date => (
                                <th
                                    key={date.toISOString()}
                                    className={`p-2 border border-slate-200 text-center cursor-pointer hover:bg-slate-50 min-w-[100px] ${isWeekend(date) ? 'bg-slate-50/80' : 'bg-white'}`}
                                    onClick={() => onDateClick(format(date, 'yyyy-MM-dd'))}
                                >
                                    <div className="text-xs font-bold text-slate-700">
                                        {format(date, 'eee', { locale: it }).toUpperCase()}
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {format(date, 'dd/MM')}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2 border border-slate-200 sticky left-0 z-10 bg-white shadow-[1px_0_0_#e2e8f0] max-w-[180px]">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                                        </div>
                                        <div className="truncate">
                                            <div className="text-sm font-semibold text-slate-800 truncate">{user.name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user.role}</div>
                                        </div>
                                    </div>
                                </td>

                                {relevantDates.map(date => {
                                    const dateStr = format(date, 'yyyy-MM-dd');

                                    // 1. Check Assignment
                                    const assignment = getUserAssignment(user.id, date);

                                    if (assignment) {
                                        const isInstructor = assignment.instructorId === user.id;
                                        const userStatus = isInstructor ? assignment.instructorStatus : assignment.helperStatus;
                                        const boat = boats.find(b => b.id === assignment.boatId);
                                        const isWarning = userStatus === ConfirmationStatus.PENDING;

                                        // Trova l'attività associata
                                        const activity = assignment.activityId
                                            ? activities.find(a => a.id === assignment.activityId)
                                            : null;
                                        const activityName = activity?.name || 'Attività';

                                        return (
                                            <td key={dateStr} className="p-1 border border-slate-200 align-top">
                                                <div
                                                    onClick={() => onOpenBoatPage(assignment.boatId)}
                                                    className={`p-1.5 rounded text-xs font-medium cursor-pointer border hover:shadow-sm transition-shadow ${isWarning
                                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                        : 'bg-teal-100 text-teal-800 border-teal-300'
                                                        }`}
                                                >
                                                    <div className="truncate font-bold">⛵ {boat?.name || 'Barca'}</div>
                                                    <div className="text-[10px] opacity-80 truncate">{activityName}</div>
                                                </div>
                                            </td>
                                        );
                                    }

                                    // 2. Check General Event
                                    const gEvent = getUserEvent(user.id, dateStr);
                                    if (gEvent) {
                                        const activity = activities.find(a => a.id === gEvent.activityId);
                                        return (
                                            <td key={dateStr} className="p-1 border border-slate-200 align-top">
                                                <div className="p-1.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                                    <div className="truncate font-bold">🎉 {activity?.name || 'Evento'}</div>
                                                </div>
                                            </td>
                                        );
                                    }

                                    // 3. Check Availability
                                    const avail = availabilities.find(a => a.userId === user.id && a.date === dateStr);
                                    let bgClass = "bg-transparent";
                                    let content = null;

                                    if (avail) {
                                        if (avail.status === AvailabilityStatus.AVAILABLE) {
                                            bgClass = "bg-green-100/50";
                                            content = <div className="w-full h-full flex items-center justify-center text-green-600"><span className="text-xs font-bold">✔️</span></div>;
                                        } else if (avail.status === AvailabilityStatus.UNAVAILABLE) {
                                            bgClass = "bg-red-50";
                                            content = <div className="w-full h-full flex items-center justify-center text-red-400 opacity-60"><span className="text-xs font-bold">✖</span></div>;
                                        }
                                    }

                                    return (
                                        <td
                                            key={dateStr}
                                            className={`p-1 border border-slate-200 h-14 ${bgClass}`}
                                            onClick={() => onDateClick(dateStr)}
                                        >
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Tailwind utilities for custom scrollbar typically go in index.css, we assume standard scrollbar or custom class here */}
        </div>
    );
};
