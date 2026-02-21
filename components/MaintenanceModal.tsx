import { supabase } from "../supabaseClient";
import React, { useState } from 'react';
import { Boat, MaintenanceRecord, MaintenanceStatus, RecurrenceUnit } from '../types';
import { X, Wrench, CheckCircle2, Circle, Clock, Trash2, Calendar, AlertTriangle, Filter, RefreshCw, Repeat } from 'lucide-react';
import { format, isBefore, addDays, differenceInDays, addMonths, addYears } from 'date-fns';
import it from 'date-fns/locale/it';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  boat: Boat;
  records: MaintenanceRecord[];
  onUpdateRecords: (records: MaintenanceRecord[]) => void;
}

// Helper to parse YYYY-MM-DD date strings safely to avoid issues with platform-specific Date implementations
const parseDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  boat,
  records,
  onUpdateRecords
}) => {
  const [filter, setFilter] = useState<'ALL' | 'TODO' | 'DONE'>('ALL');
  
  // Form State
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expDate, setExpDate] = useState('');
  const [status, setStatus] = useState<MaintenanceStatus>(MaintenanceStatus.TODO);
  const [recurrenceVal, setRecurrenceVal] = useState<number | ''>('');
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('years');

  const getCurrentAuthId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
};

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
  const createdBy = await getCurrentAuthId();

  const payload: any = {
    id: rec.id,
    boat_id: rec.boatId,
    date: rec.date,
    description: rec.description ?? "",
    status: rec.status ?? MaintenanceStatus.TODO,
    expiration_date: rec.expirationDate ?? null,
    recurrence_interval: rec.recurrenceInterval ?? null,
    recurrence_unit: rec.recurrenceUnit ?? null,
    created_by: createdBy, // se la colonna esiste
  };

  // upsert: se esiste aggiorna, se non esiste inserisce
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

  if (!isOpen) return null;

  const boatRecords = records
    .filter(r => r.boatId === boat.id)
    .sort((a, b) => {
        // Sort by expiration date (nearest first) if exists, otherwise by date
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

  const calculateNextExpiration = (baseDate: Date, val: number, unit: RecurrenceUnit): Date => {
      if (unit === 'years') return addYears(baseDate, val);
      if (unit === 'months') return addMonths(baseDate, val);
      return addDays(baseDate, val);
  };

const handleToggleStatus = async (record: MaintenanceRecord) => {
  const isMarkingDone = record.status !== MaintenanceStatus.DONE;
  const newStatus = isMarkingDone ? MaintenanceStatus.DONE : MaintenanceStatus.TODO;

  try {
    // 1) aggiorna status del record corrente su DB
    const updated = await saveToDb({ ...record, status: newStatus });

    let updatedRecords = records.map((r) => (r.id === record.id ? updated : r));

    // 2) se completato e ha ricorrenza, proponi prossima scadenza e SALVALA su DB
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
    <div 
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                    <Wrench size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Diario di Bordo: {boat.name}</h2>
                    <p className="text-sm text-slate-500">Manutenzioni e Scadenze</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
            
            {/* Add Form */}
            <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Nuova Voce</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
                    <div className="md:col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-3">
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
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center bg-white text-slate-900"
                        />
                        <select 
                            value={recurrenceUnit}
                            onChange={(e) => setRecurrenceUnit(e.target.value as RecurrenceUnit)}
                            className="px-2 py-1 border border-slate-300 rounded text-sm bg-white text-slate-900"
                        >
                            <option value="years">Anni</option>
                            <option value="months">Mesi</option>
                            <option value="days">Giorni</option>
                        </select>
                    </div>

                    <div className="md:col-span-2 mt-2">
                         <label className="block text-xs font-semibold text-slate-500 mb-1">Stato Iniziale</label>
                         <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={() => setStatus(MaintenanceStatus.TODO)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg border ${status === MaintenanceStatus.TODO ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-slate-500 border-slate-200'}`}
                            >Da Fare</button>
                            <button 
                                type="button" 
                                onClick={() => setStatus(MaintenanceStatus.DONE)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg border ${status === MaintenanceStatus.DONE ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-500 border-slate-200'}`}
                            >Fatto</button>
                         </div>
                    </div>
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white font-bold py-2 rounded-lg hover:bg-slate-700 transition-colors">Aggiungi al Diario</button>
            </form>

            {/* List */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700">Storico Interventi</h3>
                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                        <button onClick={() => setFilter('ALL')} className={`px-3 py-1 text-xs font-bold rounded ${filter === 'ALL' ? 'bg-slate-100 text-slate-800' : 'text-slate-400'}`}>Tutti</button>
                        <button onClick={() => setFilter('TODO')} className={`px-3 py-1 text-xs font-bold rounded ${filter === 'TODO' ? 'bg-amber-100 text-amber-700' : 'text-slate-400'}`}>Da Fare</button>
                        <button onClick={() => setFilter('DONE')} className={`px-3 py-1 text-xs font-bold rounded ${filter === 'DONE' ? 'bg-green-100 text-green-700' : 'text-slate-400'}`}>Fatti</button>
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredRecords.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-4 italic">Nessuna voce trovata nel diario.</p>
                    ) : (
                        filteredRecords.map(record => {
                            const isDone = record.status === MaintenanceStatus.DONE;
                            const isExpiringSoon = record.expirationDate && differenceInDays(parseDate(record.expirationDate), new Date()) <= 30 && !isDone;
                            const isExpired = record.expirationDate && isBefore(parseDate(record.expirationDate), new Date()) && !isDone;

                            return (
                                <div key={record.id} className={`bg-white p-4 rounded-xl border shadow-sm flex items-start gap-4 transition-colors ${isDone ? 'border-slate-100 opacity-80' : 'border-slate-200'} ${isExpired ? 'border-red-300 bg-red-50' : ''}`}>
                                    <button 
                                        onClick={() => handleToggleStatus(record)}
                                        className={`mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-amber-400'}`}
                                    >
                                        <CheckCircle2 size={14} />
                                    </button>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`font-bold text-sm ${isDone ? 'text-slate-600' : 'text-slate-800'}`}>{record.description}</h4>
                                            <button onClick={() => handleDelete(record.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-3 mt-2 text-xs">
                                            <span className="flex items-center gap-1 text-slate-500">
                                                <Calendar size={12} /> {format(parseDate(record.date), 'd MMM yyyy', { locale: it })}
                                            </span>
                                            
                                            {record.recurrenceInterval && (
                                                <span className="flex items-center gap-1 text-blue-500 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                                                    <RefreshCw size={10} /> Ogni {record.recurrenceInterval} {record.recurrenceUnit === 'years' ? 'anni' : (record.recurrenceUnit === 'months' ? 'mesi' : 'gg')}
                                                </span>
                                            )}

                                            {record.expirationDate && (
                                                <span className={`flex items-center gap-1 font-medium ${isExpired ? 'text-red-600' : (isExpiringSoon ? 'text-amber-600' : 'text-slate-500')}`}>
                                                    <Clock size={12} /> Scade: {format(parseDate(record.expirationDate), 'd MMM yyyy', { locale: it })}
                                                    {isExpired && " (SCADUTO)"}
                                                    {isExpiringSoon && !isExpired && " (In scadenza)"}
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
