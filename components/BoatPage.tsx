import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Boat, MaintenanceRecord, MaintenanceStatus, RecurrenceUnit, User, Role } from '../types';
import { X, Wrench, CheckCircle2, Clock, Trash2, Calendar, Repeat, RefreshCw, Ship, Info, AlertTriangle } from 'lucide-react';
import { format, isBefore, addDays, differenceInDays, addMonths, addYears } from 'date-fns';
import { it } from 'date-fns/locale';

interface BoatPageProps {
    boat: Boat;
    records: MaintenanceRecord[];
    currentUser: User;
    onClose: () => void;
    onUpdateRecords: (records: MaintenanceRecord[]) => Promise<void> | void;
    onDeleteRecords: (id: string) => Promise<void> | void;
}

const parseDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const BoatPage: React.FC<BoatPageProps> = ({
    boat,
    records,
    currentUser,
    onClose,
    onUpdateRecords
}) => {
    const isAdminOrManager = currentUser.isAdmin || currentUser.role === Role.MANAGER;

    const [filter, setFilter] = useState<'ALL' | 'TODO' | 'DONE'>('ALL');

    // Form State
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [expDate, setExpDate] = useState('');
    const [status, setStatus] = useState<MaintenanceStatus>(MaintenanceStatus.TODO);
    const [recurrenceVal, setRecurrenceVal] = useState<number | ''>('');
    const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('years');

    const boatRecords = records
        .filter(r => r.boatId === boat.id)
        .sort((a, b) => {
            const dateA = a.expirationDate ? parseDate(a.expirationDate).getTime() : parseDate(a.date).getTime();
            const dateB = b.expirationDate ? parseDate(b.expirationDate).getTime() : parseDate(b.date).getTime();
            return dateB - dateA;
        });

    const filteredRecords = boatRecords.filter(r => {
        if (filter === 'ALL') return true;
        if (filter === 'DONE') return r.status === MaintenanceStatus.DONE;
        if (filter === 'TODO') return r.status === MaintenanceStatus.TODO || r.status === MaintenanceStatus.IN_PROGRESS;
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
        if (!desc) return;

        const newRecord: MaintenanceRecord = {
            id: crypto.randomUUID(),
            boatId: boat.id,
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
        if (!confirm("Eliminare questa voce dal diario?")) return;

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

    const boatTypeLabel = (boat.type === 'SAILING' ? 'Vela' : 'Motore');

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-6 sticky top-0 z-10 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {boat.image ? (
                            <img src={boat.image} alt={boat.name} className="w-full h-full object-cover" />
                        ) : (
                            <Ship className="text-slate-500" size={32} />
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{boat.name}</h2>
                        <div className="flex items-center gap-2 text-blue-300 text-sm font-medium">
                            <span className="uppercase tracking-wider">Flotta / {boatTypeLabel}</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-8">

                {/* Left Column: Boat Info */}
                <div className="md:col-span-5 space-y-6">
                    {/* General Info */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Info size={20} className="text-blue-500" /> Dettagli Imbarcazione
                        </h3>

                        {boat.image && (
                            <div className="mb-6 rounded-xl overflow-hidden shadow-sm aspect-video w-full bg-slate-100">
                                <img src={boat.image} alt={boat.name} className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm font-medium">{boat.name}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipologia</label>
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm font-medium">{boatTypeLabel}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Maintenance Log */}
                <div className="md:col-span-7">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Wrench size={24} className="text-amber-500" /> Diario di Manutenzione
                    </h3>

                    {!isAdminOrManager ? (
                        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                            <AlertTriangle size={48} className="mx-auto text-amber-300 mb-4" />
                            <p className="text-slate-500 font-medium">Accesso Riservato.</p>
                            <p className="text-sm text-slate-400">Il diario di bordo e le manutenzioni sono visibili solo al comandante e ai manager della flotta.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Add Form (Admin only) */}
                            <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Nuova Voce Manutenzione</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Descrizione Lavoro</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Es. Sostituzione Batterie"
                                            value={desc}
                                            onChange={(e) => setDesc(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Data (Lavoro/Creazione)</label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Scadenza (Opzionale)</label>
                                        <input
                                            type="date"
                                            value={expDate}
                                            onChange={(e) => setExpDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                                        />
                                    </div>

                                    {/* Recurrence Input */}
                                    <div className="md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold w-24 shrink-0">
                                            <Repeat size={14} />
                                            Ripeti ogni:
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="#"
                                            value={recurrenceVal}
                                            onChange={(e) => setRecurrenceVal(e.target.value ? parseInt(e.target.value) : '')}
                                            className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-center bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                        <select
                                            value={recurrenceUnit}
                                            onChange={(e) => setRecurrenceUnit(e.target.value as RecurrenceUnit)}
                                            className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            <option value="years">Anni</option>
                                            <option value="months">Mesi</option>
                                            <option value="days">Giorni</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 mb-2">Stato Iniziale</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setStatus(MaintenanceStatus.TODO)}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${status === MaintenanceStatus.TODO ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                            >Da Fare / In Corso</button>
                                            <button
                                                type="button"
                                                onClick={() => setStatus(MaintenanceStatus.DONE)}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${status === MaintenanceStatus.DONE ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                            >Completato / Chiuso</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-100 mt-2">
                                    <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                                        <Wrench size={18} /> Salva Intervento
                                    </button>
                                </div>
                            </form>

                            {/* Maintenance List */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-700">Storico Interventi ({filteredRecords.length})</h3>
                                    <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                                        <button onClick={() => setFilter('ALL')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${filter === 'ALL' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Tutti</button>
                                        <button onClick={() => setFilter('TODO')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${filter === 'TODO' ? 'bg-amber-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Aperti</button>
                                        <button onClick={() => setFilter('DONE')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${filter === 'DONE' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Chiusi</button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {filteredRecords.length === 0 ? (
                                        <p className="text-center text-slate-400 text-sm py-8 bg-white rounded-2xl border border-slate-200 border-dashed">Nessun intervento registrato con i filtri attuali.</p>
                                    ) : (
                                        filteredRecords.map(record => {
                                            const isDone = record.status === MaintenanceStatus.DONE;
                                            const isExpiringSoon = record.expirationDate && differenceInDays(parseDate(record.expirationDate), new Date()) <= 30 && !isDone;
                                            const isExpired = record.expirationDate && isBefore(parseDate(record.expirationDate), new Date()) && !isDone;

                                            return (
                                                <div key={record.id} className={`bg-white p-5 rounded-2xl border shadow-sm flex items-start gap-4 transition-all hover:shadow-md ${isDone ? 'border-slate-200 bg-slate-50/50 opacity-90' : 'border-slate-300'} ${isExpired ? 'border-red-300 bg-red-50/50' : ''}`}>
                                                    <button
                                                        onClick={() => handleToggleStatus(record)}
                                                        className={`mt-1 h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white border-slate-300 text-transparent hover:border-amber-400 hover:text-amber-200'}`}
                                                        title={isDone ? "Segna come Da Fare" : "Segna come Completato"}
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>

                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className={`font-bold text-base ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                                {record.description}
                                                            </h4>
                                                            <button onClick={() => handleDelete(record.id)} className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2 mt-3 text-xs">
                                                            <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-md font-medium border border-slate-200">
                                                                <Calendar size={12} /> Creazione: {format(parseDate(record.date), 'dd/MM/yyyy')}
                                                            </span>

                                                            {record.recurrenceInterval && (
                                                                <span className="flex items-center gap-1.5 text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded-md border border-blue-200">
                                                                    <RefreshCw size={12} /> Ripeti ogni {record.recurrenceInterval} {record.recurrenceUnit === 'years' ? 'anni' : (record.recurrenceUnit === 'months' ? 'mesi' : 'gg')}
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
                    )}
                </div>
            </div>
        </div>
    );
};
