
import React from 'react';
import { Activity, Assignment, AssignmentStatus, Boat, ConfirmationStatus, Role, User } from '../types';
import { LifeBuoy, Compass, Hourglass, Ban, RotateCcw, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface BoatCardProps {
    boat: Boat;
    assignment: Assignment | undefined;
    users: User[];
    activities: Activity[];
    isInstructor: boolean;
    onUpdate: (assignment: Assignment) => void;
    onDelete: (id: string) => void;
    onOpenBoatPage: (id: string) => void;
    date: string;
    isAdmin: boolean;
}

const parseDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const BoatCard: React.FC<BoatCardProps> = ({
    boat,
    assignment,
    users,
    activities,
    isInstructor,
    onUpdate,
    onDelete,
    onOpenBoatPage,
    date,
    isAdmin
}) => {
    const instructors = users.filter(u => u.role === Role.INSTRUCTOR || u.role === Role.MANAGER);
    const helpers = users.filter(u => u.role === Role.HELPER || u.role === Role.RESERVE);

    const didLogRef = React.useRef(false);

    if (!didLogRef.current) {
        console.log("[BoatCard][debug]", { boatId: boat.id, boatType: boat.type, activitiesLen: activities.length });
        didLogRef.current = true;
    };

    // --- DRAFT STATE FOR ADMINS ---
    const [isDrafting, setIsDrafting] = React.useState(false);
    const [draftAssignment, setDraftAssignment] = React.useState<Assignment | undefined>(undefined);
    const [draftDelete, setDraftDelete] = React.useState(false);

    const currentAssignment = isDrafting ? draftAssignment : assignment;

    // Filter activities based on boat type
    const allowedActivities = activities.filter(a => (a.allowedBoatTypes ?? []).includes(boat.type));
    const isCancelled = currentAssignment?.status === AssignmentStatus.CANCELLED;

    const handleFieldChange = (field: keyof Assignment, value: any) => {
        if (isCancelled && field !== 'status') return;

        const baseAssignment: Assignment = currentAssignment || {
            id: crypto.randomUUID(),
            date,
            boatId: boat.id,
            instructorId: null,
            helperId: null,
            activityId: null,
            durationDays: 2,
            status: AssignmentStatus.CONFIRMED,
            instructorStatus: ConfirmationStatus.PENDING,
            helperStatus: ConfirmationStatus.PENDING,
            notes: ''
        };

        // If changing a person, reset their confirmation status to PENDING
        const updates: any = { [field]: value };
        if (field === 'instructorId') updates.instructorStatus = ConfirmationStatus.PENDING;
        if (field === 'helperId') updates.helperStatus = ConfirmationStatus.PENDING;

        const newAssignment = { ...baseAssignment, ...updates };

        if (isAdmin) {
            setDraftAssignment(newAssignment);
            setIsDrafting(true);
            setDraftDelete(false);
        } else {
            onUpdate(newAssignment);
        }
    };

    const toggleCancellation = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentAssignment) return;
        const newStatus = isCancelled ? AssignmentStatus.CONFIRMED : AssignmentStatus.CANCELLED;
        
        if (isAdmin) {
            setDraftAssignment({ ...currentAssignment, status: newStatus });
            setIsDrafting(true);
            setDraftDelete(false);
        } else {
            onUpdate({ ...currentAssignment, status: newStatus });
        }
    };

    const handleSaveDraft = () => {
        if (draftDelete) {
            if (assignment?.id) onDelete(assignment.id);
        } else if (draftAssignment) {
            onUpdate(draftAssignment);
        }
        setIsDrafting(false);
        setDraftDelete(false);
    };

    const handleCancelDraft = () => {
        setIsDrafting(false);
        setDraftDelete(false);
        setDraftAssignment(undefined);
    };

    const isContinued = currentAssignment && currentAssignment.date !== date;
    const startDate = currentAssignment ? parseDate(currentAssignment.date) : parseDate(date);
    const endDate = currentAssignment ? addDays(startDate, currentAssignment.durationDays - 1) : addDays(startDate, 1);

    // Styling based on status
    let cardBg = "bg-white border-slate-200";
    
    if (isDrafting) {
        cardBg = "bg-orange-50 border-orange-400 ring-2 ring-orange-400 border-dashed ring-offset-1";
    } else if (isCancelled) {
        cardBg = "bg-red-50 border-red-200";
    } else if (currentAssignment?.instructorId && currentAssignment?.helperId) {
        // Check if pending
        if (currentAssignment.instructorStatus === ConfirmationStatus.PENDING || currentAssignment.helperStatus === ConfirmationStatus.PENDING) {
            cardBg = "bg-amber-50/50 border-amber-300";
        } else {
            cardBg = "bg-teal-50/50 border-teal-500";
        }
    }

    const renderStatusIcon = (status?: ConfirmationStatus) => {
        if (status === ConfirmationStatus.CONFIRMED) return <CheckCircle2 size={14} className="text-teal-500" />;
        if (status === ConfirmationStatus.PENDING) return <AlertCircle size={14} className="text-amber-500 animate-pulse" />;
        return null;
    };

    return (
        <div className={`p-4 rounded-xl border-2 transition-all relative ${cardBg}`}>
            {isContinued && (
                <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-bl-lg rounded-tr-md font-bold flex items-center gap-1">
                    <Hourglass size={12} />
                    Inizia il {format(startDate, 'd MMM')}
                </div>
            )}

            {/* Cancelled Overlay/Badge */}
            {isCancelled && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none z-10">
                    <div className="bg-red-600 text-white font-bold text-xl px-4 py-2 rounded-xl shadow-lg border-2 border-white transform -rotate-12 opacity-90">
                        ANNULLATA
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 shrink-0">
                        <img src={boat.image} alt={boat.name} className={`h-full w-full object-cover ${isCancelled ? 'grayscale' : ''}`} />
                    </div>
                    <div
                        className="cursor-pointer group"
                        onClick={(e) => {
                            if (isInstructor) {
                                e.stopPropagation();
                                onOpenBoatPage(boat.id);
                            }
                        }}
                    >
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {boat.type}
                        </span>
                    </div>
                </div>

                {/* Actions - Delete button removed, Cancel button retained */}
                {isInstructor && currentAssignment?.activityId && (
                    <div className="flex items-center gap-1 relative z-20">
                        <button
                            type="button"
                            onClick={toggleCancellation}
                            className={`p-2 rounded-full transition-colors ${isCancelled ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                            title={isCancelled ? "Ripristina Missione" : "Annulla Missione"}
                        >
                            {isCancelled ? <RotateCcw size={16} /> : <Ban size={16} />}
                        </button>
                    </div>
                )}
            </div>

            <div className={`space-y-3 ${isCancelled ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Activity Selection */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Missione</label>
                    <select
                        disabled={!isInstructor}
                        className="w-full text-sm p-2 rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed text-slate-900"
                        value={currentAssignment?.activityId || ''}
                        onChange={(e) => {
                            if (e.target.value === 'CLEAR_SELECTION') {
                                if (isAdmin) {
                                    setIsDrafting(true);
                                    setDraftDelete(true);
                                } else {
                                    if (assignment?.id) onDelete(assignment.id);
                                }
                            } else {
                                handleFieldChange('activityId', e.target.value);
                            }
                        }}
                    >
                        <option value="">Scegli missione...</option>
                        <option value="CLEAR_SELECTION" className="text-red-500 font-bold">✖ Nessuna attività</option>
                        {allowedActivities.map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.defaultDurationDays}gg)</option>
                        ))}
                    </select>
                </div>

                {/* Date and Duration */}
                {currentAssignment?.activityId && (
                    <div className="bg-slate-100 p-2 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600 w-14 shrink-0">Inizio:</label>
                            <input
                                type="date"
                                disabled={!isInstructor}
                                value={currentAssignment.date}
                                onChange={(e) => handleFieldChange('date', e.target.value)}
                                style={{ colorScheme: 'light' }}
                                className="flex-1 text-xs p-1 rounded border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600 w-14 shrink-0">Durata:</label>
                            <div className="flex-1 flex items-center justify-between">
                                <input
                                    type="number"
                                    min="1"
                                    max="14"
                                    disabled={!isInstructor}
                                    value={currentAssignment.durationDays || 1}
                                    onChange={(e) => handleFieldChange('durationDays', parseInt(e.target.value) || 1)}
                                    style={{ colorScheme: 'light' }}
                                    className="w-12 text-xs p-1 rounded border border-slate-300 text-center disabled:opacity-70 bg-white text-slate-900 outline-none focus:border-blue-500"
                                />
                                <span className="text-[10px] text-slate-500 font-medium">
                                    Fine: {format(endDate, 'd MMM')}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    {/* Instructor Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                            <Compass size={12} /> Il Comandante
                            {currentAssignment?.instructorId && renderStatusIcon(currentAssignment.instructorStatus)}
                        </label>
                        <select
                            disabled={!isInstructor}
                            className={`w-full text-sm p-2 rounded-lg border bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed text-slate-900 ${isDrafting && currentAssignment?.instructorId !== assignment?.instructorId ? 'border-orange-400 bg-orange-50' : 'border-slate-300'}`}
                            value={currentAssignment?.instructorId || ''}
                            onChange={(e) => handleFieldChange('instructorId', e.target.value)}
                        >
                            <option value="">Nessuno</option>
                            {instructors.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Helper Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                            <LifeBuoy size={12} /> Mozzo
                            {currentAssignment?.helperId && renderStatusIcon(currentAssignment.helperStatus)}
                        </label>
                        <select
                            disabled={!isInstructor}
                            className={`w-full text-sm p-2 rounded-lg border bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed text-slate-900 ${isDrafting && currentAssignment?.helperId !== assignment?.helperId ? 'border-orange-400 bg-orange-50' : 'border-slate-300'}`}
                            value={currentAssignment?.helperId || ''}
                            onChange={(e) => handleFieldChange('helperId', e.target.value)}
                        >
                            <option value="">Nessuno</option>
                            {helpers.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Logbook / Notes */}
                {currentAssignment?.activityId && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                            <BookOpen size={12} /> Giornale di Bordo (Note)
                        </label>
                        <textarea
                            disabled={!isInstructor}
                            className={`w-full text-xs p-2 rounded-lg border bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed text-slate-900 resize-none h-16 ${isDrafting && currentAssignment?.notes !== assignment?.notes ? 'border-orange-400 bg-orange-50' : 'border-slate-300'}`}
                            value={currentAssignment.notes || ''}
                            onChange={(e) => handleFieldChange('notes', e.target.value)}
                            placeholder="Note sulla missione..."
                        />
                    </div>
                )}
            </div>

            {/* Admin Draft Actions */}
            {isDrafting && isAdmin && (
                <div className="mt-4 pt-3 border-t border-orange-200 flex items-center justify-end gap-2">
                    <span className="text-xs text-orange-600 font-bold mr-auto tracking-tight uppercase">Modifiche non salvate</span>
                    <button
                        onClick={handleCancelDraft}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSaveDraft}
                        className="px-4 py-1.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-md transition-colors border border-orange-600"
                    >
                        Salva / Notifica
                    </button>
                </div>
            )}
        </div>
    );
};
