import React from 'react';
import { Assignment, GeneralEvent, User, Boat, Activity, ConfirmationStatus } from '../types';
import { format, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarDays, Anchor, PartyPopper, ChevronRight } from 'lucide-react';

interface NextAssignmentsBoxProps {
    currentUser: User | null;
    assignments: Assignment[];
    generalEvents: GeneralEvent[];
    boats: Boat[];
    activities: Activity[];
}

type UpcomingItem = {
    id: string;
    date: Date;
    type: 'assignment' | 'general_event';
    title: string;
    subtitle: string;
    icon: React.ReactNode;
};

export const NextAssignmentsBox: React.FC<NextAssignmentsBoxProps> = ({
    currentUser,
    assignments,
    generalEvents,
    boats,
    activities
}) => {
    if (!currentUser) return null;

    const today = startOfDay(new Date());

    // 1. Process Assignments
    const upcomingAssignments = assignments
        .filter(a => {
            // Must be in the future or today
            const aDate = startOfDay(new Date(a.date));
            if (isBefore(aDate, today)) return false;

            // Must involve the current user
            const isInstructor = a.instructorId === currentUser.id;
            const isHelper = a.helperId === currentUser.id;
            if (!isInstructor && !isHelper) return false;

            // Must be confirmed by the user
            if (isInstructor && a.instructorStatus !== ConfirmationStatus.CONFIRMED) return false;
            if (isHelper && a.helperStatus !== ConfirmationStatus.CONFIRMED) return false;

            return true;
        })
        .map(a => {
            const boat = boats.find(b => b.id === a.boatId);
            const activity = activities.find(act => act.id === a.activityId);
            const role = a.instructorId === currentUser.id ? 'Comandante' : 'Aiutante';

            return {
                id: a.id,
                date: new Date(a.date),
                type: 'assignment' as const,
                title: `${activity?.name || 'Uscita'} in ${boat?.name || 'Barca'}`,
                subtitle: `Ruolo: ${role} ${a.durationDays > 1 ? `(${a.durationDays} gg)` : ''}`,
                icon: <Anchor size={18} className="text-blue-500" />
            };
        });

    // 2. Process General Events
    const upcomingEvents = generalEvents
        .filter(e => {
            // Must be in the future or today
            const eDate = startOfDay(new Date(e.date));
            if (isBefore(eDate, today)) return false;

            // Must be invited and confirmed
            const response = e.responses.find(r => r.userId === currentUser.id);
            if (!response || response.status !== ConfirmationStatus.CONFIRMED) return false;

            return true;
        })
        .map(e => {
            const activity = activities.find(act => act.id === e.activityId);
            const timeStr = e.startTime ? ` alle ${e.startTime}` : '';
            return {
                id: e.id,
                date: new Date(e.date),
                type: 'general_event' as const,
                title: activity?.name || 'Evento Speciale',
                subtitle: `Evento di gruppo${timeStr}`,
                icon: <PartyPopper size={18} className="text-purple-500" />
            };
        });

    // 3. Combine, Sort and slice top 3
    const allUpcoming: UpcomingItem[] = [...upcomingAssignments, ...upcomingEvents]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 3);


    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 flex flex-col overflow-hidden w-full">
            {/* Header */}
            <div className="bg-slate-800 text-white p-4 flex items-center gap-3">
                <CalendarDays className="text-emerald-400" size={24} />
                <h2 className="font-bold text-lg">Le tue prossime Uscite</h2>
            </div>

            {/* List */}
            <div className="p-2 space-y-1">
                {allUpcoming.length === 0 ? (
                    <div className="text-center p-6 text-slate-400 text-sm">
                        <p>Nessuna uscita confermata in programma.</p>
                        <p className="text-xs mt-1">Vai al calendario per dare la disponibilità!</p>
                    </div>
                ) : (
                    allUpcoming.map(item => (
                        <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                            {/* Date Badge */}
                            <div className="flex flex-col items-center justify-center bg-slate-100 text-slate-700 rounded-lg min-w-[3.5rem] h-14 border border-slate-200 shadow-sm shrink-0">
                                <span className="text-[10px] uppercase font-bold text-slate-500 leading-none mb-1">
                                    {format(item.date, "MMM", { locale: it })}
                                </span>
                                <span className="text-xl font-bold leading-none">
                                    {format(item.date, "dd")}
                                </span>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    {item.icon}
                                    <h4 className="font-semibold text-slate-800 text-sm truncate">
                                        {item.title}
                                    </h4>
                                </div>
                                <p className="text-xs text-slate-500 truncate">
                                    {item.subtitle}
                                </p>
                            </div>

                            {/* Chevron */}
                            <ChevronRight size={16} className="text-slate-300 shrink-0" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
