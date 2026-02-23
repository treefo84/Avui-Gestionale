import React, { useState } from 'react';
import { Activity, Assignment, AssignmentStatus, Availability, AvailabilityStatus, Boat, Role, User, GeneralEvent, ConfirmationStatus, DayNote, CalendarEvent } from '../types';
import { BoatCard } from './BoatCard';
import { X, Anchor, Skull, CalendarX, Plus, Users, ChevronDown, ChevronUp, Clock, StickyNote, MessageCircle, Send, Trash2, Lock, Pencil, Save, CalendarDays } from 'lucide-react';
import { differenceInCalendarDays, isSaturday, isSunday, addDays, format } from 'date-fns';

interface DayModalProps {
    date: string;
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    users: User[];
    boats: Boat[];
    activities: Activity[];
    availabilities: Availability[];
    assignments: Assignment[];
    generalEvents: GeneralEvent[];
    dayNotes: DayNote[];
    calendarEvents: CalendarEvent[];
    onUpdateAvailability: (availability: Availability) => void;
    onUpdateAssignment: (assignment: Assignment) => void;
    onDeleteAssignment: (id: string) => void;
    onUpdateGeneralEvent: (event: GeneralEvent) => void;
    onDeleteGeneralEvent: (id: string) => void;
    onAddDayNote: (date: string, text: string) => void;
    onDeleteDayNote: (id: string) => void;
    onCreateCalendarEvent?: (eventData: Partial<CalendarEvent>) => void;
    onCreateGeneralEvent: (
        date: string,
        activityId: string,
        startTime?: string,
        endTime?: string,
        notes?: string
    ) => void;
}

const parseDate = (dateString?: string | null) => {
    if (!dateString || typeof dateString !== "string") return null;

    // accetta "YYYY-MM-DD" oppure timestamp ISO (prende i primi 10)
    const safe = dateString.slice(0, 10);
    const [year, month, day] = safe.split("-").map(Number);

    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day);
};


export const DayModal: React.FC<DayModalProps> = ({
    date,
    isOpen,
    onClose,
    currentUser,
    users,
    boats,
    activities,
    availabilities,
    assignments,
    generalEvents,
    dayNotes,
    calendarEvents = [],
    onUpdateAvailability,
    onUpdateAssignment,
    onDeleteAssignment,
    onCreateGeneralEvent,
    onUpdateGeneralEvent,
    onDeleteGeneralEvent,
    onAddDayNote,
    onDeleteDayNote,
    onCreateCalendarEvent
}) => {

    console.log("[B4][DayModal render]", {
        date,
        isOpen,
        calLen: calendarEvents?.length,
        calSample: calendarEvents?.[0],
    });

    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

    // Create Event State
    const [selectedGeneralAct, setSelectedGeneralAct] = useState('');
    const [newStartTime, setNewStartTime] = useState('');
    const [newEndTime, setNewEndTime] = useState('');
    const [newNotes, setNewNotes] = useState('');

    // Edit Event State
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [editEventActId, setEditEventActId] = useState('');
    const [editEventDate, setEditEventDate] = useState('');
    const [editEventStartTime, setEditEventStartTime] = useState('');
    const [editEventEndTime, setEditEventEndTime] = useState('');
    const [editEventNotes, setEditEventNotes] = useState('');

    // Calendar Event Creation State
    const [isCreatingCalEvent, setIsCreatingCalEvent] = useState(false);
    const [newCalTitle, setNewCalTitle] = useState('');
    const [newCalStartTime, setNewCalStartTime] = useState('');
    const [newCalEndTime, setNewCalEndTime] = useState('');
    const [newCalEndDate, setNewCalEndDate] = useState('');
    const [newCalParticipants, setNewCalParticipants] = useState<string[]>([]);
    const [newCalRecurrence, setNewCalRecurrence] = useState('NONE');
    const [newCalRecEndDate, setNewCalRecEndDate] = useState('');

    // Day Note State
    const [newDayNote, setNewDayNote] = useState('');

    if (!isOpen) return null;

    const myAvailability = availabilities.find(a => a.userId === currentUser.id && a.date === date);
    const myStatus = myAvailability?.status || AvailabilityStatus.UNKNOWN;
    const targetDateObj = parseDate(date);
    const isWeekendDay = isSaturday(targetDateObj) || isSunday(targetDateObj);
    const todaysGeneralEvents = generalEvents.filter(e => e.date === date);
    const todaysNotes = dayNotes.filter(n => n.date === date).sort((a, b) => a.createdAt - b.createdAt);
    const generalActivities = activities.filter(a => a.isGeneral);

    const isCommandingOfficer = currentUser.role === Role.INSTRUCTOR || currentUser.role === Role.MANAGER;

    const handleAvailabilityClick = (status: AvailabilityStatus) => {
        const datesToUpdate = [date];
        if (isSaturday(targetDateObj)) {
            datesToUpdate.push(format(addDays(targetDateObj, 1), 'yyyy-MM-dd'));
        } else if (isSunday(targetDateObj)) {
            datesToUpdate.push(format(addDays(targetDateObj, -1), 'yyyy-MM-dd'));
        }

        datesToUpdate.forEach(d => {
            onUpdateAvailability({
                userId: currentUser.id,
                date: d,
                status
            });
        });
    };

    const handleCancelDay = () => {
        if (!confirm("Sei sicuro di voler annullare TUTTE le missioni di oggi?")) return;

        boats.forEach(boat => {
            const assignment = getEffectiveAssignment(boat.id);
            if (assignment) {
                onUpdateAssignment({
                    ...assignment,
                    status: AssignmentStatus.CANCELLED
                });
            }
        });
    };

    const handleCreateEvent = () => {
        if (selectedGeneralAct) {
            onCreateGeneralEvent(date, selectedGeneralAct, newStartTime, newEndTime, newNotes);
            setSelectedGeneralAct('');
            setNewStartTime('');
            setNewEndTime('');
            setNewNotes('');
        }
    };

    const handleCreateCalendarEvent = () => {
        if (!newCalTitle.trim() || !onCreateCalendarEvent) return;
        onCreateCalendarEvent({
            title: newCalTitle,
            startDate: date,
            endDate: newCalEndDate || date,
            startTime: newCalStartTime || null,
            endTime: newCalEndTime || null,
            recurrenceRule: newCalRecurrence !== 'NONE' ? newCalRecurrence : null,
            recurrenceEndDate: newCalRecurrence !== 'NONE' && newCalRecEndDate ? newCalRecEndDate : null,
            participants: newCalParticipants
        });
        setNewCalTitle('');
        setNewCalStartTime('');
        setNewCalEndTime('');
        setNewCalEndDate('');
        setNewCalParticipants([]);
        setNewCalRecurrence('NONE');
        setNewCalRecEndDate('');
        setIsCreatingCalEvent(false);
    };

    const startEditingEvent = (event: GeneralEvent) => {
        setEditingEventId(event.id);
        setEditEventActId(event.activityId);
        setEditEventDate(event.date);
        setEditEventStartTime(event.startTime || '');
        setEditEventEndTime(event.endTime || '');
        setEditEventNotes(event.notes || '');
        // Prevent expanding toggle when clicking edit
        if (expandedEventId === event.id) setExpandedEventId(null);
    };

    const saveEditedEvent = (originalEvent: GeneralEvent) => {
        if (!editEventDate) return;

        const updatedEvent: GeneralEvent = {
            ...originalEvent,
            activityId: editEventActId,
            date: editEventDate,
            startTime: editEventStartTime || undefined,
            endTime: editEventEndTime || undefined,
            notes: editEventNotes || undefined
        };
        onUpdateGeneralEvent(updatedEvent);
        setEditingEventId(null);
    };

    const handleSendNote = () => {
        if (!newDayNote.trim()) return;
        onAddDayNote(date, newDayNote);
        setNewDayNote('');
    };

    const getEffectiveAssignment = (boatId: string) => {
        const targetDate = parseDate(date);
        if (!targetDate) return undefined;

        return assignments.find((a) => {
            if (a.boatId !== boatId) return false;

            const startDate = parseDate(a.date);
            if (!startDate) return false;

            const diff = differenceInCalendarDays(targetDate, startDate);
            return diff >= 0 && diff < (a.durationDays ?? 1);
        });
    };


    const getBusyUserIds = (excludeBoatId: string) => {
        const targetDate = parseDate(date);
        const busy = new Set<string>();
        assignments.forEach(a => {
            if (a.boatId === excludeBoatId) return;
            const startDate = parseDate(a.date);
            const diff = differenceInCalendarDays(targetDate, startDate);
            if (diff >= 0 && diff < a.durationDays) {
                if (a.instructorId) busy.add(a.instructorId);
                if (a.helperId) busy.add(a.helperId);
            }
        });
        return busy;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 capitalize">
                            {new Date(date).toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h2>
                        <p className="text-slate-500 text-sm">Organizza la giornata e prega che ci sia vento</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {isCommandingOfficer && (
                            <button
                                onClick={handleCancelDay}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-200"
                            >
                                <CalendarX size={16} /> Annulla Giornata
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={24} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                {calendarEvents.length > 0 && (
                    <div className="px-6 pt-4">
                        <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50">
                            <div className="font-bold text-indigo-700 mb-2">Eventi del giorno</div>

                            <div className="space-y-2">
                                {calendarEvents.map((e) => (
                                    <div key={e.id} className="text-sm text-slate-700">
                                        <div className="font-semibold">{e.title}</div>
                                        <div className="text-xs text-slate-500">
                                            {e.startTime && e.endTime ? `${e.startTime.slice(0, 5)} - ${e.endTime.slice(0, 5)}` : 'Tutto il giorno'}
                                            {e.type ? ` • ${e.type}` : ""}
                                            {e.recurrenceRule && ` 🔁 (${e.recurrenceRule})`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8">

                    {/* Admin: Create Calendar Event */}
                    {currentUser.isAdmin && (
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gestione Eventi (Admin)</h3>
                                <button
                                    onClick={() => setIsCreatingCalEvent(!isCreatingCalEvent)}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                >
                                    {isCreatingCalEvent ? <X size={14} /> : <Plus size={14} />} {isCreatingCalEvent ? "Annulla" : "Nuovo Evento"}
                                </button>
                            </div>

                            {isCreatingCalEvent && (
                                <div className="bg-indigo-50 p-4 rounded-xl border border-dashed border-indigo-300 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                        <div className="md:col-span-12">
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Titolo Evento *</label>
                                            <input
                                                type="text"
                                                value={newCalTitle}
                                                onChange={(e) => setNewCalTitle(e.target.value)}
                                                placeholder="Es: Riunione istruttori, Serata pizza..."
                                                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-900"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Inizio</label>
                                            <input
                                                type="time"
                                                value={newCalStartTime}
                                                onChange={(e) => setNewCalStartTime(e.target.value)}
                                                style={{ colorScheme: 'light' }}
                                                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-2 py-2 text-slate-900"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Fine</label>
                                            <input
                                                type="time"
                                                value={newCalEndTime}
                                                onChange={(e) => setNewCalEndTime(e.target.value)}
                                                style={{ colorScheme: 'light' }}
                                                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-2 py-2 text-slate-900"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Data Fine (opz.)</label>
                                            <input
                                                type="date"
                                                value={newCalEndDate}
                                                style={{ colorScheme: 'light' }}
                                                onChange={(e) => setNewCalEndDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-2 py-2 text-slate-900"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Ripeti</label>
                                            <select
                                                value={newCalRecurrence}
                                                onChange={(e) => setNewCalRecurrence(e.target.value)}
                                                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-900"
                                            >
                                                <option value="NONE">Non ripetere</option>
                                                <option value="DAILY">Ogni giorno</option>
                                                <option value="WEEKLY">Ogni settimana</option>
                                            </select>
                                        </div>
                                        {newCalRecurrence !== 'NONE' && (
                                            <div className="md:col-span-12">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Interrompi ripetizione il (opz.)</label>
                                                <input
                                                    type="date"
                                                    value={newCalRecEndDate}
                                                    style={{ colorScheme: 'light' }}
                                                    onChange={(e) => setNewCalRecEndDate(e.target.value)}
                                                    className="w-full md:w-1/3 bg-white border border-slate-200 text-sm rounded-lg px-2 py-2 text-slate-900"
                                                />
                                            </div>
                                        )}
                                        <div className="md:col-span-12 mt-2">
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Partecipanti (opzionale)</label>
                                            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white flex flex-wrap gap-2">
                                                {users.map(u => (
                                                    <label key={u.id} className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 cursor-pointer hover:bg-slate-100">
                                                        <input
                                                            type="checkbox"
                                                            checked={newCalParticipants.includes(u.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setNewCalParticipants(p => [...p, u.id]);
                                                                else setNewCalParticipants(p => p.filter(id => id !== u.id));
                                                            }}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                                                        />
                                                        <span className="truncate max-w-[100px]">{u.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="md:col-span-12 mt-2">
                                            <button
                                                onClick={handleCreateCalendarEvent}
                                                disabled={!newCalTitle.trim()}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} /> Salva Evento nel Calendario
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                    {/* Section 1: My Availability */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Ci sei o ci fai?</h3>
                        <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${myStatus === AvailabilityStatus.AVAILABLE ? 'bg-emerald-50 border-emerald-100' :
                            myStatus === AvailabilityStatus.UNAVAILABLE ? 'bg-rose-50 border-rose-100' :
                                'bg-slate-50 border-slate-100'
                            }`}>
                            <img src={currentUser.avatar} alt={currentUser.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                            <div className="flex-1">
                                <p className="font-semibold text-slate-800">Ci sei questo giorno?</p>
                                <p className="text-xs text-slate-500">
                                    {isWeekendDay
                                        ? "Se confermi, vale per tutto il weekend!"
                                        : "Se ti segni verde, ti tocca lavorare."}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAvailabilityClick(AvailabilityStatus.AVAILABLE)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${myStatus === AvailabilityStatus.AVAILABLE
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'bg-white text-slate-600 hover:bg-emerald-50 border'
                                        }`}
                                >
                                    <Anchor size={16} /> Presente!
                                </button>
                                <button
                                    onClick={() => handleAvailabilityClick(AvailabilityStatus.UNAVAILABLE)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${myStatus === AvailabilityStatus.UNAVAILABLE
                                        ? 'bg-rose-500 text-white shadow-md'
                                        : 'bg-white text-slate-600 hover:bg-rose-50 border'
                                        }`}
                                >
                                    <Skull size={16} /> Sparito
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: General Events (Social) */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Eventi & Social</h3>
                        </div>

                        <div className="space-y-3">
                            {todaysGeneralEvents.map(event => {
                                const isEditing = editingEventId === event.id;
                                const act = activities.find(a => a.id === event.activityId);
                                const confirmedCount = event.responses.filter(r => r.status === ConfirmationStatus.CONFIRMED).length;
                                const pendingCount = event.responses.filter(r => r.status === ConfirmationStatus.PENDING).length;
                                const isExpanded = expandedEventId === event.id;

                                if (isEditing) {
                                    return (
                                        <div key={event.id} className="bg-white border-2 border-purple-500 rounded-xl p-4 shadow-lg animate-in fade-in">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-bold text-purple-700 uppercase">Modifica Evento</h4>
                                                <button onClick={() => setEditingEventId(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={16} /></button>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-bold text-slate-400 mb-1">Attività</label>
                                                        <select value={editEventActId} onChange={(e) => setEditEventActId(e.target.value)} className="w-full border rounded p-1 text-sm bg-slate-50">
                                                            {generalActivities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-bold text-slate-400 mb-1">Data</label>
                                                        <div className="relative">
                                                            <CalendarDays size={14} className="absolute left-2 top-2 text-slate-400" />
                                                            <input style={{ colorScheme: 'light' }} type="date" value={editEventDate} onChange={(e) => setEditEventDate(e.target.value)} className="w-full border rounded p-1 pl-7 text-sm bg-slate-50" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-bold text-slate-400 mb-1">Inizio</label>
                                                        <input style={{ colorScheme: 'light' }} type="time" value={editEventStartTime} onChange={(e) => setEditEventStartTime(e.target.value)} className="w-full border rounded p-1 text-sm bg-slate-50" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-bold text-slate-400 mb-1">Fine</label>
                                                        <input style={{ colorScheme: 'light' }} type="time" value={editEventEndTime} onChange={(e) => setEditEventEndTime(e.target.value)} className="w-full border rounded p-1 text-sm bg-slate-50" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">Note</label>
                                                    <input type="text" value={editEventNotes} onChange={(e) => setEditEventNotes(e.target.value)} className="w-full border rounded p-1 text-sm bg-slate-50" />
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button onClick={() => saveEditedEvent(event)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-700"><Save size={14} /> Salva</button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }

                                return (
                                    <div key={event.id} className="bg-purple-50 border border-purple-100 rounded-xl overflow-hidden group">
                                        <div
                                            className="p-4 cursor-pointer hover:bg-purple-100/50 transition-colors"
                                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-purple-200 text-purple-700 p-2 rounded-lg"><Users size={20} /></div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800">{act?.name}</h4>
                                                        <p className="text-xs text-slate-500 flex items-center gap-2">
                                                            <span>{confirmedCount} Confermati • {pendingCount} In attesa</span>
                                                            {event.startTime && (
                                                                <span className="flex items-center gap-1 bg-white px-1.5 rounded text-purple-600 font-bold border border-purple-100">
                                                                    <Clock size={10} /> {event.startTime} {event.endTime ? `- ${event.endTime}` : ''}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isCommandingOfficer && (
                                                        <div className="flex gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); startEditingEvent(event); }}
                                                                className="p-1.5 bg-white text-slate-400 hover:text-blue-600 rounded border border-slate-200 hover:border-blue-200"
                                                                title="Modifica"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onDeleteGeneralEvent(event.id); }}
                                                                className="p-1.5 bg-white text-slate-400 hover:text-red-600 rounded border border-slate-200 hover:border-red-200"
                                                                title="Elimina"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="text-purple-400">
                                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </div>
                                                </div>
                                            </div>

                                            {event.notes && isExpanded && (
                                                <div className="mt-3 bg-white p-2 rounded-lg border border-purple-100 text-xs text-slate-600 flex gap-2">
                                                    <StickyNote size={14} className="text-yellow-500 shrink-0" />
                                                    {event.notes}
                                                </div>
                                            )}
                                        </div>

                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-0 border-t border-purple-100 bg-white">
                                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    {event.responses.map(resp => {
                                                        const u = users.find(user => user.id === resp.userId);
                                                        if (!u) return null;
                                                        let color = "bg-slate-50 text-slate-400 border-slate-100";
                                                        if (resp.status === ConfirmationStatus.CONFIRMED) color = "bg-green-50 text-green-700 border-green-100";
                                                        if (resp.status === ConfirmationStatus.REJECTED) color = "bg-red-50 text-red-700 border-red-100";

                                                        return (
                                                            <div key={u.id} className={`flex items-center gap-2 px-2 py-1 rounded border text-xs font-medium ${color}`}>
                                                                <div className={`w-2 h-2 rounded-full ${resp.status === ConfirmationStatus.CONFIRMED ? 'bg-green-500' : (resp.status === ConfirmationStatus.REJECTED ? 'bg-red-500' : 'bg-slate-300')}`}></div>
                                                                <span className="truncate">{u.name}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {isCommandingOfficer && generalActivities.length > 0 && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Nuovo Evento Social</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                        <div className="md:col-span-5">
                                            <label className="block text-xs font-semibold text-slate-400 mb-1">Cosa si fa?</label>
                                            <select
                                                value={selectedGeneralAct}
                                                onChange={(e) => setSelectedGeneralAct(e.target.value)}
                                                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
                                            >
                                                <option value="">Scegli evento...</option>
                                                {generalActivities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-slate-400 mb-1">Inizio</label>
                                            <input
                                                type="time"
                                                value={newStartTime}
                                                onChange={(e) => setNewStartTime(e.target.value)}
                                                style={{ colorScheme: 'light' }}
                                                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-2 py-2 text-slate-900"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-slate-400 mb-1">Fine</label>
                                            <input
                                                type="time"
                                                value={newEndTime}
                                                onChange={(e) => setNewEndTime(e.target.value)}
                                                style={{ colorScheme: 'light' }}
                                                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-2 py-2 text-slate-900"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <button
                                                onClick={handleCreateEvent}
                                                disabled={!selectedGeneralAct}
                                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} /> Crea Invito
                                            </button>
                                        </div>
                                        <div className="md:col-span-12">
                                            <input
                                                type="text"
                                                placeholder="Note aggiuntive (opzionale)"
                                                value={newNotes}
                                                onChange={(e) => setNewNotes(e.target.value)}
                                                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Section 3: Messages in a Bottle (Day Notes) */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <MessageCircle size={16} /> Messaggi in Bottiglia {currentUser.isAdmin ? '(Admin)' : ''}
                        </h3>
                        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-4">
                            <div className="space-y-3">
                                {todaysNotes.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic text-center py-2">Nessun messaggio lasciato per oggi. Il mare è silenzioso.</p>
                                ) : (
                                    todaysNotes.map(note => {
                                        const author = users.find(u => u.id === note.userId);
                                        const isMe = author?.id === currentUser.id;

                                        return (
                                            <div key={note.id} className="flex gap-3 group">
                                                <img src={author?.avatar} className="w-8 h-8 rounded-full border border-amber-200 bg-white" />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-700">{author?.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400">{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            {currentUser.isAdmin && (
                                                                <button onClick={() => onDeleteDayNote(note.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-600 bg-white p-2 rounded-lg rounded-tl-none border border-amber-100 shadow-sm mt-1">
                                                        {note.text}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {currentUser.isAdmin ? (
                                <div className="flex gap-2 pt-2 border-t border-amber-100/50">
                                    <input
                                        type="text"
                                        value={newDayNote}
                                        onChange={(e) => setNewDayNote(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
                                        placeholder="Lascia un messaggio per tutti..."
                                        className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900"
                                    />
                                    <button
                                        onClick={handleSendNote}
                                        disabled={!newDayNote.trim()}
                                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 p-2 bg-white/50 border border-dashed border-amber-200 rounded text-xs text-amber-600/70 justify-center italic">
                                    <Lock size={12} />
                                    Solo gli Ammiragli possono lasciare messaggi in bottiglia.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Section 4: Fleet Management (Instructor/Manager Only) */}
                    <section className={!isCommandingOfficer ? 'opacity-50 pointer-events-none grayscale' : ''}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                Piano di Battaglia {!isCommandingOfficer && '(Solo per i Boss)'}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {boats.map(boat => {
                                const assignment = getEffectiveAssignment(boat.id);
                                const busyIds = getBusyUserIds(boat.id);
                                const boatSpecificUsers = users.filter(u => {
                                    const isAssignedToThisBoat = assignment?.instructorId === u.id || assignment?.helperId === u.id;
                                    const isAvailable = availabilities.find(a => a.userId === u.id && a.date === date)?.status === AvailabilityStatus.AVAILABLE;
                                    const isBusyElsewhere = busyIds.has(u.id);
                                    if (isAssignedToThisBoat) return true;
                                    return isAvailable && !isBusyElsewhere;
                                });

                                return (
                                    <BoatCard
                                        key={boat.id}
                                        boat={boat}
                                        assignment={assignment}
                                        users={boatSpecificUsers}
                                        activities={activities}
                                        isInstructor={isCommandingOfficer}
                                        onUpdate={onUpdateAssignment}
                                        onDelete={onDeleteAssignment}
                                        date={date}
                                    />
                                );
                            })}
                        </div>
                    </section>

                    {/* Availability Summary */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Chi c'è e chi dorme</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {users.map(u => {
                                const status = availabilities.find(a => a.userId === u.id && a.date === date)?.status || AvailabilityStatus.UNKNOWN;
                                let statusColor = "bg-slate-100 text-slate-400";
                                if (status === AvailabilityStatus.AVAILABLE) statusColor = "bg-green-100 text-green-700 border-green-200";
                                if (status === AvailabilityStatus.UNAVAILABLE) statusColor = "bg-red-50 text-red-300 decoration-line-through";

                                return (
                                    <div key={u.id} className={`flex items-center gap-2 p-2 rounded-lg border ${statusColor} border-transparent`}>
                                        <div className="relative">
                                            <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                            <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${status === AvailabilityStatus.AVAILABLE ? 'bg-green-500' : (status === AvailabilityStatus.UNAVAILABLE ? 'bg-red-500' : 'bg-slate-300')}`}></div>
                                        </div>
                                        <span className="text-xs font-medium truncate">{u.name}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
