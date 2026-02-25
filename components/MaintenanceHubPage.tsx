import React, { useState } from 'react';
import { Boat, MaintenanceRecord, MaintenanceStatus, RecurrenceUnit, User } from '../types';
import { supabase } from '../supabaseClient';
import { X, Wrench, CheckCircle2, Clock, Trash2, Calendar, Repeat, RefreshCw, AlertTriangle, Filter } from 'lucide-react';
import { format, isBefore, addDays, differenceInDays, addMonths, addYears } from 'date-fns';

interface MaintenanceHubPageProps {
    isOpen: boolean;
    onClose: () => void;

    boats: Boat[];
    records: MaintenanceRecord[];
    currentUser: User | null;

    onUpdateRecords: (records: MaintenanceRecord[]) => Promise<void> | void;
    onDeleteRecords: (id: string) => Promise<void> | void;
}

const parseDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const MaintenanceHubPage: React.FC<MaintenanceHubPageProps> = ({
    isOpen,
    onClose,
    boats,
    records,
    currentUser,
    onUpdateRecords
}) => {
    const [filter, setFilter] = useState<'ALL' | 'TODO' | 'DONE' | 'EXPIRING'>('TODO');

    // Form State
    const [selectedBoatId, setSelectedBoatId] = useState<string>('');
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [expDate, setExpDate] = useState('');
    const [status, setStatus] = useState<MaintenanceStatus>(MaintenanceStatus.TODO);
    const [recurrenceVal, setRecurrenceVal] = useState<number | ''>('');
    const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('years');

    if (!isOpen || !currentUser?.isAdmin) return null;

    const boatsById = new Map(boats.map(b => [b.id, b]));

    // Sort: Expiring soonest first, then by creation date
    const sortedRecords = [...records].sort((a, b) => {
        const dateA = a.expirationDate ? parseDate(a.expirationDate).getTime() : parseDate(a.date).getTime() + 100000000000; // Push non-expiring down
        const dateB = b.expirationDate ? parseDate(b.expirationDate).getTime() : parseDate(b.date).getTime() + 100000000000;
        return dateA - dateB;
    });

    const filteredRecords = sortedRecords.filter(r => {
        const isDone = r.status === MaintenanceStatus.DONE;
        const isExpiringSoon = r.expirationDate && differenceInDays(parseDate(r.expirationDate), new Date()) <= 30 && !isDone;
        const isExpired = r.expirationDate && isBefore(parseDate(r.expirationDate), new Date()) && !isDone;

        if (filter === 'ALL') return true;
        if (filter === 'DONE') return isDone;
        if (filter === 'TODO') return !isDone;
        if (filter === 'EXPIRING') return isExpired || isExpiringSoon;
        return true;
    });

    // DB Helpers
    const dbToRecord = (r: any): MaintenanceRecord => ({
        id: r.id,
        boatId: r.boat_id,
        description: r.description ?? "",
        date: String(r.date).slice(0, 10),
        expirationDate: r.expiration_date ? String(r.expiration_date).slice(0, 10) : undefined,
        status: (r.status as MaintenanceStatus) ?? MaintenanceStatus.TODO,
        recurrenceInterval: r.recurrence_interval ?? undefined,
        recurrenceUnit: r.recurrence_unit ?? undefined,
    });

    const saveToDb = async (rec: MaintenanceRecord) => {
        const payload: any = {
            id: rec.id,
            boat_id: rec.boatId,
            date: rec.date,
            description: rec.description ?? "",
            status: rec.status ?? MaintenanceStatus.TODO,
            expiration_date: rec.expirationDate ?? null,
            recurrence_interval: rec.recurrenceInterval ?? null,
            recurrence_unit: rec.recurrenceUnit ?? null,
            created_by: currentUser.id,
        };

        const { data, error } = await supabase
            .from("maintenance_logs")
            .upsert(payload, { onConflict: "id" })
            .select("*")
            .single();

        if (error) throw error;
        return dbToRecord(data);
    };

    const deleteFromDb = async (id: string) => {
        const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);
        if (error) throw error;
    };

    const calculateNextExpiration = (baseDate: Date, val: number, unit: RecurrenceUnit): Date => {
        if (unit === 'years') return addYears(baseDate, val);
        if (unit === 'months') return addMonths(baseDate, val);
        return addDays(baseDate, val);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!desc || !selectedBoatId) {
            alert("Seleziona una barca e inserisci una descrizione.");
            return;
        }

        const newRecord: MaintenanceRecord = {
            id: crypto.randomUUID(),
            boatId: selectedBoatId,
            description: desc,
            date,
            expirationDate: expDate || undefined,
            status,
            recurrenceInterval: recurrenceVal ? Number(recurrenceVal) : undefined,
            recurrenceUnit: recurrenceVal ? recurrenceUnit : undefined,
        };

        try {
            const saved = await saveToDb(newRecord);
            onUpdateRecords([...records, saved]);

            setDesc("");
            setExpDate("");
            setStatus(MaintenanceStatus.TODO);
            setRecurrenceVal("");
        } catch (err: any) {
            console.error("[maintenance][add] error:", err);
            alert(`Errore salvataggio manutenzione: ${err?.message ?? String(err)}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Eliminare questa voce dal diario globale?")) return;

        try {
            await deleteFromDb(id);
            onUpdateRecords(records.filter((r) => r.id !== id));
        } catch (err: any) {
            console.error("[maintenance][delete] error:", err);
            alert(`Errore eliminazione manutenzione: ${err?.message ?? String(err)}`);
        }
    };

    const handleToggleStatus = async (record: MaintenanceRecord) => {
        const isMarkingDone = record.status !== MaintenanceStatus.DONE;
        const newStatus = isMarkingDone ? MaintenanceStatus.DONE : MaintenanceStatus.TODO;

        try {
            const updated = await saveToDb({ ...record, status: newStatus });
            let updatedRecords = records.map((r) => (r.id === record.id ? updated : r));

            if (isMarkingDone && record.recurrenceInterval && record.recurrenceUnit) {
                const unitLabel =
                    record.recurrenceUnit === "years" ? "Anni" : record.recurrenceUnit === "months" ? "Mesi" : "Giorni";

                if (
                    confirm(
                        `Hai completato "${record.description}".\nVuoi programmare la prossima scadenza tra ${record.recurrenceInterval} ${unitLabel}?`
                    )
                ) {
                    const today = new Date();
                    const nextExpDate = calculateNextExpiration(today, record.recurrenceInterval, record.recurrenceUnit);

                    const nextRecord: MaintenanceRecord = {
                        id: crypto.randomUUID(),
                        boatId: record.boatId,
                        description: record.description,
                        status: MaintenanceStatus.TODO,
                        date: format(today, "yyyy-MM-dd"),
                        expirationDate: format(nextExpDate, "yyyy-MM-dd"),
                        recurrenceInterval: record.recurrenceInterval,
                        recurrenceUnit: record.recurrenceUnit,
                    };

                    const savedNext = await saveToDb(nextRecord);
                    updatedRecords = [...updatedRecords, savedNext];
                }
            }

            onUpdateRecords(updatedRecords);
        } catch (err: any) {
            console.error("[maintenance][toggle] error:", err);
            alert(`Errore aggiornamento manutenzione: ${err?.message ?? String(err)}`);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Centro Manutenzioni</h2>
                            <p className="text-slate-400 text-sm font-medium">Gestione globale flotta</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {/* Filtri */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                            <Filter size={18} /> Mostra:
                        </div>
                        <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 overflow-x-auto">
                            <button onClick={() => setFilter('TODO')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${filter === 'TODO' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}>Aperti</button>
                            <button onClick={() => setFilter('EXPIRING')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${filter === 'EXPIRING' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}>In Scadenza</button>
                            <button onClick={() => setFilter('DONE')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${filter === 'DONE' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}>Chiusi</button>
                            <button onClick={() => setFilter('ALL')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${filter === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}>Tutti</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Area Laterale: Aggiunta nuovo */}
                        <div className="lg:col-span-1">
                            <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Nuova Manutenzione</h4>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Barca</label>
                                        <select
                                            required
                                            value={selectedBoatId}
                                            onChange={(e) => setSelectedBoatId(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="">-- Seleziona --</option>
                                            {boats.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Descrizione Lavoro</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Es. Sostituzione Batterie"
                                            value={desc}
                                            onChange={(e) => setDesc(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-900"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Data Op.</label>
                                            <input
                                                type="date"
                                                required
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Scadenza</label>
                                            <input
                                                type="date"
                                                value={expDate}
                                                onChange={(e) => setExpDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    {/* Recurrence Input */}
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                            <Repeat size={14} /> Ripeti ogni:
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="#"
                                                value={recurrenceVal}
                                                onChange={(e) => setRecurrenceVal(e.target.value ? parseInt(e.target.value) : '')}
                                                className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-center bg-white text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                            <select
                                                value={recurrenceUnit}
                                                onChange={(e) => setRecurrenceUnit(e.target.value as RecurrenceUnit)}
                                                className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
                                            >
                                                <option value="years">Anni</option>
                                                <option value="months">Mesi</option>
                                                <option value="days">Giorni</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100">
                                        <button type="submit" className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                                            <Wrench size={16} /> Salva
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Area Principale: Lista Lavori */}
                        <div className="lg:col-span-2 space-y-4">
                            {filteredRecords.length === 0 ? (
                                <div className="text-center text-slate-400 py-12 bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <p className="font-bold">Nessun intervento trovato</p>
                                    <p className="text-sm mt-1">Con i filtri attuali non ci sono lavori da mostrare.</p>
                                </div>
                            ) : (
                                filteredRecords.map(record => {
                                    const boat = boatsById.get(record.boatId) as Boat | undefined;
                                    const isDone = record.status === MaintenanceStatus.DONE;
                                    const isExpiringSoon = record.expirationDate && differenceInDays(parseDate(record.expirationDate), new Date()) <= 30 && !isDone;
                                    const isExpired = record.expirationDate && isBefore(parseDate(record.expirationDate), new Date()) && !isDone;

                                    return (
                                        <div key={record.id} className={`bg-white p-4 rounded-xl border shadow-sm flex items-start gap-4 transition-all hover:shadow-md ${isDone ? 'border-slate-200 bg-slate-50/50 opacity-80' : 'border-slate-300'} ${isExpired ? 'border-red-300 bg-red-50/20' : ''}`}>
                                            <button
                                                onClick={() => handleToggleStatus(record)}
                                                className={`mt-1 h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white border-slate-300 text-transparent hover:border-amber-400 hover:text-amber-200'}`}
                                                title={isDone ? "Segna come Da Fare" : "Segna come Completato"}
                                            >
                                                <CheckCircle2 size={18} />
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded text-indigo-700 bg-indigo-50 border border-indigo-100 mr-2 uppercase tracking-wide">
                                                            {boat?.name || 'Barca Ignorata'}
                                                        </span>
                                                        <h4 className={`font-bold inline-block text-base ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                            {record.description}
                                                        </h4>
                                                    </div>
                                                    <button onClick={() => handleDelete(record.id)} className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors shrink-0"><Trash2 size={16} /></button>
                                                </div>

                                                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                                                    <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-md font-medium border border-slate-200">
                                                        <Calendar size={12} /> {format(parseDate(record.date), 'dd/MM/yyyy')}
                                                    </span>

                                                    {record.recurrenceInterval && (
                                                        <span className="flex items-center gap-1.5 text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded-md border border-blue-200">
                                                            <RefreshCw size={12} /> {record.recurrenceInterval} {record.recurrenceUnit === 'years' ? 'anni' : (record.recurrenceUnit === 'months' ? 'mesi' : 'gg')}
                                                        </span>
                                                    )}

                                                    {record.expirationDate && (
                                                        <span className={`flex items-center gap-1.5 font-bold px-2 py-1 rounded-md border ${isExpired ? 'bg-red-100 text-red-700 border-red-200' : (isExpiringSoon ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200')}`}>
                                                            <Clock size={12} /> Scade: {format(parseDate(record.expirationDate), 'dd/MM/yyyy')}
                                                            {isExpired && " !"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
