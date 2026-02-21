import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Activity, Boat, BoatType, MaintenanceRecord } from "../types";
import {
  X,
  Anchor,
  Plus,
  Trash2,
  Save,
  Ship,
  Map,
  Clock,
  ChevronLeft,
  Image as ImageIcon,
  Users,
  Wrench,
} from "lucide-react";
import { MaintenanceModal } from "./MaintenanceModal";
import { promises } from "dns";

interface FleetManagementPageProps {
  isOpen: boolean;
  onClose: () => void;

  boats: Boat[];
  activities: Activity[];
  maintenanceRecords: MaintenanceRecord[];

  onUpdateBoats: (boats: Boat[]) => void;
  onUpdateActivities: (activities: Activity[]) => void;
  onSaveMaintenance: (records: MaintenanceRecord[]) => promise<void>;
    onDeleteMaintenance: (id: string) => promise<void>;
}

type DbBoatRow = {
  id: string;
  name: string;
  type: string;
  image: string | null;
  notes: string | null;
  created_at: string;
};

type DbActivityRow = {
  id: string;
  name: string;
  default_duration_days: number | null;
  allowed_boat_types: string[] | null;
  is_general: boolean | null;
  created_at: string;
};

export const FleetManagementPage: React.FC<FleetManagementPageProps> = ({
  isOpen,
  onClose,
  boats,
  activities,
  maintenanceRecords,
  onUpdateBoats,
  onUpdateActivities,
  onUpdateMaintenance,
}) => {
  const [activeTab, setActiveTab] = useState<"boats" | "activities">("boats");
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null);
  const [newBoatName, setNewBoatName] = useState("");
  const [newBoatType, setNewBoatType] = useState<BoatType>(BoatType.SAILING);
  const [newBoatImage, setNewBoatImage] = useState("");
  const [editBoatName, setEditBoatName] = useState("");
  const [editBoatType, setEditBoatType] = useState<BoatType>(BoatType.SAILING);
  const [editBoatImage, setEditBoatImage] = useState("");
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [newActName, setNewActName] = useState("");
  const [newActDuration, setNewActDuration] = useState(2);
  const [newActTypes, setNewActTypes] = useState<BoatType[]>([BoatType.SAILING]);
  const [newActIsGeneral, setNewActIsGeneral] = useState(false);
  const [editActName, setEditActName] = useState("");
  const [editActDuration, setEditActDuration] = useState(2);
  const [editActTypes, setEditActTypes] = useState<BoatType[]>([]);
  const [editActIsGeneral, setEditActIsGeneral] = useState(false);
  const [maintenanceBoat, setMaintenanceBoat] = useState<Boat | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const placeholderBoatImage =
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&q=80&w=400&h=200";

  const normalizeBoatType = (v: any): BoatType => {
    const raw = String(v ?? "").trim().toUpperCase();
    if (raw === "VELA" || raw === "SAILING") return BoatType.SAILING;
    if (raw === "MOTORE" || raw === "POWER") return BoatType.POWER;
    return BoatType.SAILING;
  };

  const dbBoatTypeFromEnum = (t: BoatType): string => {
    return t === BoatType.POWER ? "MOTORE" : "VELA";
  };

  const boatTypeLabel = (t: BoatType) => (t === BoatType.POWER ? "Motore" : "Vela");

  // Reset editing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingBoat(null);
      setEditingActivity(null);
      setMaintenanceBoat(null);
      setErrorMsg(null);
      setSaving(false);
    }
  }, [isOpen]);

  // LOAD DB (quando apri la modale)
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    (async () => {
      setErrorMsg(null);

      const { data: boatsRows, error: boatsErr } = await supabase
        .from("boats")
        .select("id,name,type,image,notes,created_at")
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (boatsErr) {
          console.error("[boats][load] error:", boatsErr);
          setErrorMsg(`Errore caricamento barche: ${boatsErr.message}`);
        } else {
          const mapped: Boat[] = ((boatsRows as DbBoatRow[] | null) ?? []).map((b) => ({
            id: b.id,
            name: b.name,
            type: normalizeBoatType(b.type),
            image: b.image ?? "",
            ...(b.notes ? ({ notes: b.notes } as any) : {}),
          })) as any;

          onUpdateBoats(mapped);
        }
      }

      const { data: actRows, error: actErr } = await supabase
        .from("activities")
        .select("id,name,default_duration_days,allowed_boat_types,is_general,created_at")
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (actErr) {
          console.error("[activities][load] error:", actErr);
          setErrorMsg(`Errore caricamento missioni: ${actErr.message}`);
        } else {
          const mapped: Activity[] = ((actRows as DbActivityRow[] | null) ?? []).map((a) => ({
            id: a.id,
            name: a.name,
            defaultDurationDays: a.default_duration_days ?? 2,
            allowedBoatTypes: Array.isArray(a.allowed_boat_types)
              ? (a.allowed_boat_types as any).map(normalizeBoatType)
              : [],
            isGeneral: !!a.is_general,
          })) as any;

          onUpdateActivities(mapped);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /* --- BOAT HANDLERS (DB) --- */
  const handleAddBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = newBoatName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const payload = {
        name,
        type: dbBoatTypeFromEnum(newBoatType),
        image: (newBoatImage || "").trim() || placeholderBoatImage,
        notes: null as any,
      };

      const { data, error } = await supabase.from("boats").insert(payload).select("*").single();

      if (error || !data) {
        console.error("[boats][create] error:", error);
        setErrorMsg(`Errore DB creazione barca: ${error?.message ?? "unknown"}`);
        return;
      }

      const saved: Boat = {
        id: data.id,
        name: data.name,
        type: normalizeBoatType(data.type),
        image: data.image ?? "",
        ...(data.notes ? ({ notes: data.notes } as any) : {}),
      } as any;

      onUpdateBoats([...boats, saved]);
      setNewBoatName("");
      setNewBoatImage("");
    } finally {
      setSaving(false);
    }
  };

  const handleBoatClick = (boat: Boat) => {
    setEditingBoat(boat);
    setEditBoatName(boat.name);
    setEditBoatType(boat.type);
    setEditBoatImage(boat.image);
  };

  const handleSaveBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoat) return;

    setErrorMsg(null);
    setSaving(true);
    try {
      const patch = {
        name: editBoatName.trim(),
        type: dbBoatTypeFromEnum(editBoatType),
        image: (editBoatImage || "").trim() || placeholderBoatImage,
      };

      const { data, error } = await supabase
        .from("boats")
        .update(patch)
        .eq("id", editingBoat.id)
        .select("*")
        .single();

      if (error || !data) {
        console.error("[boats][update] error:", error);
        setErrorMsg(`Errore DB salvataggio barca: ${error?.message ?? "unknown"}`);
        return;
      }

      const saved: Boat = {
        id: data.id,
        name: data.name,
        type: normalizeBoatType(data.type),
        image: data.image ?? "",
        ...(data.notes ? ({ notes: data.notes } as any) : {}),
      } as any;

      onUpdateBoats(boats.map((b) => (b.id === saved.id ? saved : b)));
      setEditingBoat(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Sei sicuro di voler affondare questa barca?")) return;

    setErrorMsg(null);
    setSaving(true);
    try {
      const { error } = await supabase.from("boats").delete().eq("id", id);
      if (error) {
        console.error("[boats][delete] error:", error);
        setErrorMsg(`Errore DB eliminazione barca: ${error.message}`);
        return;
      }

      onUpdateBoats(boats.filter((b) => b.id !== id));
      if (editingBoat?.id === id) setEditingBoat(null);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenMaintenance = (e: React.MouseEvent, boat: Boat) => {
    e.stopPropagation();
    setMaintenanceBoat(boat);
  };

  /* --- ACTIVITY HANDLERS (DB) --- */
  const toggleNewActType = (type: BoatType) => {
    setNewActTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const toggleEditActType = (type: BoatType) => {
    setEditActTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = newActName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const payload = {
        name,
        default_duration_days: Math.max(1, Number(newActDuration) || 1),
        is_general: !!newActIsGeneral,
        allowed_boat_types: newActIsGeneral ? [] : newActTypes.map(dbBoatTypeFromEnum),
      };

      const { data, error } = await supabase.from("activities").insert(payload).select("*").single();

      if (error || !data) {
        console.error("[activities][create] error:", error);
        setErrorMsg(`Errore DB creazione missione: ${error?.message ?? "unknown"}`);
        return;
      }

      const saved: Activity = {
        id: data.id,
        name: data.name,
        defaultDurationDays: data.default_duration_days ?? payload.default_duration_days,
        allowedBoatTypes: Array.isArray(data.allowed_boat_types)
          ? (data.allowed_boat_types as any).map(normalizeBoatType)
          : [],
        isGeneral: !!data.is_general,
      } as any;

      onUpdateActivities([...activities, saved]);

      setNewActName("");
      setNewActDuration(2);
      setNewActTypes([BoatType.SAILING]);
      setNewActIsGeneral(false);
    } finally {
      setSaving(false);
    }
  };

  const handleActivityClick = (activity: Activity) => {
    setEditingActivity(activity);
    setEditActName(activity.name);
    setEditActDuration(activity.defaultDurationDays);
    setEditActTypes(activity.allowedBoatTypes ?? []);
    setEditActIsGeneral(!!activity.isGeneral);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;

    setErrorMsg(null);
    setSaving(true);
    try {
      const patch = {
        name: editActName.trim(),
        default_duration_days: Math.max(1, Number(editActDuration) || 1),
        is_general: !!editActIsGeneral,
        allowed_boat_types: editActIsGeneral ? [] : editActTypes.map(dbBoatTypeFromEnum),
      };

      const { data, error } = await supabase
        .from("activities")
        .update(patch)
        .eq("id", editingActivity.id)
        .select("*")
        .single();

      if (error || !data) {
        console.error("[activities][update] error:", error);
        setErrorMsg(`Errore DB salvataggio missione: ${error?.message ?? "unknown"}`);
        return;
      }

      const saved: Activity = {
        id: data.id,
        name: data.name,
        defaultDurationDays: data.default_duration_days ?? patch.default_duration_days,
        allowedBoatTypes: Array.isArray(data.allowed_boat_types)
          ? (data.allowed_boat_types as any).map(normalizeBoatType)
          : [],
        isGeneral: !!data.is_general,
      } as any;

      onUpdateActivities(activities.map((a) => (a.id === saved.id ? saved : a)));
      setEditingActivity(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Eliminare questa missione?")) return;

    setErrorMsg(null);
    setSaving(true);
    try {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) {
        console.error("[activities][delete] error:", error);
        setErrorMsg(`Errore DB eliminazione missione: ${error.message}`);
        return;
      }

      onUpdateActivities(activities.filter((a) => a.id !== id));
      if (editingActivity?.id === id) setEditingActivity(null);
    } finally {
      setSaving(false);
    }
  };

  const title = useMemo(() => {
    if (editingBoat) return `Modifica ${editingBoat.name}`;
    if (editingActivity) return `Modifica ${editingActivity.name}`;
    return "Gestione Flotta & Missioni";
  }, [editingBoat, editingActivity]);

  // ✅ IMPORTANTISSIMO: niente return prima degli hook.
  return !isOpen ? null : (
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
          <div className="flex items-center gap-3">
            {(editingBoat || editingActivity) && (
              <button
                onClick={() => {
                  setEditingBoat(null);
                  setEditingActivity(null);
                  setErrorMsg(null);
                }}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Anchor size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{title}</h2>
              <p className="text-sm text-slate-500">Cantiere Navale</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Tabs */}
        {!editingBoat && !editingActivity && (
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("boats")}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === "boats"
                  ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50/50"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              Le Barche
            </button>
            <button
              onClick={() => setActiveTab("activities")}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === "activities"
                  ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50/50"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              Le Missioni
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === "boats" ? (
            <div className="space-y-6 animate-in slide-in-from-left duration-200">
              {/* ... TUTTO IL JSX DELLE BARCHE IDENTICO A PRIMA ... */}
              {/* Per non incollarti 900 righe doppie, qui NON ho cambiato nulla nella UI. */}
              {/* Se vuoi, te lo ri-incoll0 tutto, ma è letteralmente invariato. */}
              {/* ↳ Copia dal tuo file precedente a partire da qui fino al blocco activities */}
              {/* ---- */}
              {/* INIZIO BLOCCO BARCHE */}
              {editingBoat ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <form
                      onSubmit={handleSaveBoat}
                      className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Nome Barca
                        </label>
                        <input
                          type="text"
                          value={editBoatName}
                          onChange={(e) => setEditBoatName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Tipo
                        </label>
                        <select
                          value={editBoatType}
                          onChange={(e) => setEditBoatType(e.target.value as BoatType)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                        >
                          <option value={BoatType.SAILING}>Vela</option>
                          <option value={BoatType.POWER}>Motore</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          URL Immagine
                        </label>
                        <div className="relative">
                          <ImageIcon size={16} className="absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={editBoatImage}
                            onChange={(e) => setEditBoatImage(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-slate-900"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingBoat(null)}
                          className="flex-1 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                          disabled={saving}
                        >
                          Annulla
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                          disabled={saving}
                        >
                          <Save size={18} /> Salva
                        </button>
                      </div>
                    </form>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Anteprima</label>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100 mb-3 relative group">
                        {editBoatImage ? (
                          <img
                            src={editBoatImage}
                            className="w-full h-full object-cover"
                            onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/400x200?text=No+Image")}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-400 flex-col gap-2">
                            <ImageIcon size={32} />
                            <span className="text-xs">Nessuna immagine</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-bold tracking-widest uppercase">
                            {editBoatName || "Nome"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">{editBoatName || "Nome Barca"}</h3>
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                            {boatTypeLabel(editBoatType)}
                          </span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          <Ship size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <form
                    onSubmit={handleAddBoat}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end"
                  >
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Barca</label>
                      <input
                        type="text"
                        value={newBoatName}
                        onChange={(e) => setNewBoatName(e.target.value)}
                        placeholder="Es. Perla Nera"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"
                      />
                    </div>

                    <div className="w-full md:w-40">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                      <select
                        value={newBoatType}
                        onChange={(e) => setNewBoatType(e.target.value as BoatType)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"
                      >
                        <option value={BoatType.SAILING}>Vela</option>
                        <option value={BoatType.POWER}>Motore</option>
                      </select>
                    </div>

                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Immagine (Opzionale)</label>
                      <input
                        type="text"
                        value={newBoatImage}
                        onChange={(e) => setNewBoatImage(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      disabled={saving}
                    >
                      <Plus size={16} /> Aggiungi
                    </button>
                  </form>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {boats.map((boat) => (
                      <div
                        key={boat.id}
                        onClick={() => handleBoatClick(boat)}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 group cursor-pointer hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden"
                      >
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-blue-500 transition-colors"></div>
                        <img src={boat.image} alt={boat.name} className="w-16 h-16 rounded-lg object-cover bg-slate-200" />
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{boat.name}</h4>
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                            {boatTypeLabel(boat.type)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleOpenMaintenance(e, boat)}
                          className="p-2 mr-1 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors z-10"
                          title="Diario di Bordo"
                        >
                          <Wrench size={18} />
                        </button>

                        <button
                          onClick={(e) => handleDeleteBoat(e, boat.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors z-10"
                          title="Elimina"
                          disabled={saving}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {/* FINE BLOCCO BARCHE */}
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right duration-200">
              {/* Qui rimane identico al tuo blocco missioni del file precedente */}
              {/* (Non ho toccato UI, solo bug hooks) */}
              {/* ---- */}
              {editingActivity ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Map size={20} className="text-indigo-600" /> Modifica Missione
                  </h3>

                  <form onSubmit={handleSaveActivity} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Missione</label>
                        <input
                          type="text"
                          value={editActName}
                          onChange={(e) => setEditActName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Durata Default (giorni)</label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="number"
                            min="1"
                            value={editActDuration}
                            onChange={(e) => setEditActDuration(parseInt(e.target.value))}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white text-slate-900"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editActIsGeneral}
                            onChange={(e) => setEditActIsGeneral(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 bg-white"
                          />
                          Evento Generale (No Barca) - es. Cena, Party
                        </label>
                      </div>

                      {!editActIsGeneral && (
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipi Barca Ammessi</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleEditActType(BoatType.SAILING)}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                                editActTypes.includes(BoatType.SAILING)
                                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                  : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              Vela
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleEditActType(BoatType.POWER)}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                                editActTypes.includes(BoatType.POWER)
                                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                  : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              Motore
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingActivity(null)}
                        className="flex-1 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                        disabled={saving}
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                        disabled={saving}
                      >
                        <Save size={18} /> Salva Modifiche
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <form onSubmit={handleAddActivity} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Missione</label>
                        <input
                          type="text"
                          value={newActName}
                          onChange={(e) => setNewActName(e.target.value)}
                          placeholder="Es. Regata della Morte"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Durata (gg)</label>
                        <input
                          type="number"
                          min="1"
                          value={newActDuration}
                          onChange={(e) => setNewActDuration(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-4 flex items-center gap-4">
                        <label className="flex items-center gap-2 font-medium text-xs text-slate-600 cursor-pointer border border-slate-200 p-2 rounded-lg bg-slate-50">
                          <input
                            type="checkbox"
                            checked={newActIsGeneral}
                            onChange={(e) => setNewActIsGeneral(e.target.checked)}
                            className="rounded text-blue-600 bg-white"
                          />
                          Evento No Barca
                        </label>

                        {!newActIsGeneral && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleNewActType(BoatType.SAILING)}
                              className={`px-2 py-1.5 rounded-lg text-xs font-bold border ${
                                newActTypes.includes(BoatType.SAILING)
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}
                            >
                              Vela
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleNewActType(BoatType.POWER)}
                              className={`px-2 py-1.5 rounded-lg text-xs font-bold border ${
                                newActTypes.includes(BoatType.POWER)
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}
                            >
                              Motore
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          disabled={saving}
                        >
                          <Plus size={16} /> Crea
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        onClick={() => handleActivityClick(act)}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>

                        <div className="flex items-center gap-4 pl-2">
                          <div className={`p-2 rounded-lg ${act.isGeneral ? "bg-purple-50 text-purple-600" : "bg-indigo-50 text-indigo-600"}`}>
                            {act.isGeneral ? <Users size={20} /> : <Map size={20} />}
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{act.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> {act.defaultDurationDays} gg
                              </span>

                              {act.isGeneral ? (
                                <span className="text-purple-500 font-medium">Tutti invitati</span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Ship size={12} /> {(act.allowedBoatTypes ?? []).map(boatTypeLabel).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteActivity(e, act.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors z-10"
                          disabled={saving}
                          title="Elimina"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {maintenanceBoat && (
          <MaintenanceModal
            isOpen={!!maintenanceBoat}
            onClose={() => setMaintenanceBoat(null)}
            boat={maintenanceBoat}
            records={maintenanceRecords}

            onSaveRecords={onSaveMaintenance}
            onDeleteRecords={onDeleteMaintenance}
          />
        )}
      </div>
    </div>
  );
};
