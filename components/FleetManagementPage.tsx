
import React, { useState, useEffect } from 'react';
import { Activity, Boat, BoatType, MaintenanceRecord } from '../types';
import { X, Anchor, Plus, Trash2, Save, Ship, Map, Clock, ChevronLeft, Image as ImageIcon, Users, Wrench } from 'lucide-react';
import { MaintenanceModal } from './MaintenanceModal';

interface FleetManagementPageProps {
  isOpen: boolean;
  onClose: () => void;
  boats: Boat[];
  activities: Activity[];
  maintenanceRecords: MaintenanceRecord[];
  onUpdateBoats: (boats: Boat[]) => void;
  onUpdateActivities: (activities: Activity[]) => void;
  onUpdateMaintenance: (records: MaintenanceRecord[]) => void;
}

export const FleetManagementPage: React.FC<FleetManagementPageProps> = ({
  isOpen,
  onClose,
  boats,
  activities,
  maintenanceRecords,
  onUpdateBoats,
  onUpdateActivities,
  onUpdateMaintenance
}) => {
  const [activeTab, setActiveTab] = useState<'boats' | 'activities'>('boats');
  
  // Boat Editing State
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null);
  
  // Boat Form State (Add)
  const [newBoatName, setNewBoatName] = useState('');
  const [newBoatType, setNewBoatType] = useState<BoatType>(BoatType.SAILING);
  const [newBoatImage, setNewBoatImage] = useState('');

  // Boat Edit Form State
  const [editBoatName, setEditBoatName] = useState('');
  const [editBoatType, setEditBoatType] = useState<BoatType>(BoatType.SAILING);
  const [editBoatImage, setEditBoatImage] = useState('');

  // Activity Editing State
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Activity Form State (Add)
  const [newActName, setNewActName] = useState('');
  const [newActDuration, setNewActDuration] = useState(2);
  const [newActTypes, setNewActTypes] = useState<BoatType[]>([BoatType.SAILING]);
  const [newActIsGeneral, setNewActIsGeneral] = useState(false);

  // Activity Edit Form State
  const [editActName, setEditActName] = useState('');
  const [editActDuration, setEditActDuration] = useState(2);
  const [editActTypes, setEditActTypes] = useState<BoatType[]>([]);
  const [editActIsGeneral, setEditActIsGeneral] = useState(false);

  // Maintenance Modal State
  const [maintenanceBoat, setMaintenanceBoat] = useState<Boat | null>(null);

  // Reset editing state when tab changes or modal closes
  useEffect(() => {
    if (!isOpen) {
        setEditingBoat(null);
        setEditingActivity(null);
        setMaintenanceBoat(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /* --- BOAT HANDLERS --- */
  const handleAddBoat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoatName) return;
    
    const newBoat: Boat = {
      id: crypto.randomUUID(),
      name: newBoatName,
      type: newBoatType,
      image: newBoatImage || 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&q=80&w=400&h=200'
    };
    
    onUpdateBoats([...boats, newBoat]);
    setNewBoatName('');
    setNewBoatImage('');
  };

  const handleBoatClick = (boat: Boat) => {
      setEditingBoat(boat);
      setEditBoatName(boat.name);
      setEditBoatType(boat.type);
      setEditBoatImage(boat.image);
  };

  const handleSaveBoat = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingBoat) return;

      const updatedBoats = boats.map(b => 
        b.id === editingBoat.id 
            ? { ...b, name: editBoatName, type: editBoatType, image: editBoatImage }
            : b
      );
      
      onUpdateBoats(updatedBoats);
      setEditingBoat(null);
  };

  const handleDeleteBoat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening edit mode
    if (confirm('Sei sicuro di voler affondare questa barca?')) {
      onUpdateBoats(boats.filter(b => b.id !== id));
      if (editingBoat?.id === id) setEditingBoat(null);
    }
  };

  const handleOpenMaintenance = (e: React.MouseEvent, boat: Boat) => {
      e.stopPropagation();
      setMaintenanceBoat(boat);
  };

  /* --- ACTIVITY HANDLERS --- */
  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActName) return;

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      name: newActName,
      defaultDurationDays: newActDuration,
      allowedBoatTypes: newActIsGeneral ? [] : newActTypes,
      isGeneral: newActIsGeneral
    };

    onUpdateActivities([...activities, newActivity]);
    setNewActName('');
    setNewActDuration(2);
    setNewActTypes([BoatType.SAILING]);
    setNewActIsGeneral(false);
  };

  const handleActivityClick = (activity: Activity) => {
    setEditingActivity(activity);
    setEditActName(activity.name);
    setEditActDuration(activity.defaultDurationDays);
    setEditActTypes(activity.allowedBoatTypes);
    setEditActIsGeneral(!!activity.isGeneral);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;

    const updatedActivities = activities.map(a => 
      a.id === editingActivity.id 
        ? { 
            ...a, 
            name: editActName, 
            defaultDurationDays: editActDuration, 
            allowedBoatTypes: editActIsGeneral ? [] : editActTypes,
            isGeneral: editActIsGeneral
          }
        : a
    );
    onUpdateActivities(updatedActivities);
    setEditingActivity(null);
  };

  const handleDeleteActivity = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Eliminare questa missione?')) {
      onUpdateActivities(activities.filter(a => a.id !== id));
      if (editingActivity?.id === id) setEditingActivity(null);
    }
  };

  const toggleNewActType = (type: BoatType) => {
    if (newActTypes.includes(type)) {
      setNewActTypes(newActTypes.filter(t => t !== type));
    } else {
      setNewActTypes([...newActTypes, type]);
    }
  };

  const toggleEditActType = (type: BoatType) => {
    if (editActTypes.includes(type)) {
      setEditActTypes(editActTypes.filter(t => t !== type));
    } else {
      setEditActTypes([...editActTypes, type]);
    }
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
          <div className="flex items-center gap-3">
             {(editingBoat || editingActivity) && (
                 <button onClick={() => { setEditingBoat(null); setEditingActivity(null); }} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                     <ChevronLeft size={24} />
                 </button>
             )}
             <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Anchor size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">
                    {editingBoat ? `Modifica ${editingBoat.name}` : (editingActivity ? `Modifica ${editingActivity.name}` : 'Gestione Flotta & Missioni')}
                </h2>
                <p className="text-sm text-slate-500">Cantiere Navale</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        {!editingBoat && !editingActivity && (
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('boats')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'boats' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    Le Barche
                </button>
                <button 
                    onClick={() => setActiveTab('activities')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'activities' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    Le Missioni
                </button>
            </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
           
           {activeTab === 'boats' ? (
               <div className="space-y-6 animate-in slide-in-from-left duration-200">
                   {/* Boat content */}
                   {editingBoat ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-6">
                               <form onSubmit={handleSaveBoat} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Barca</label>
                                       <input type="text" value={editBoatName} onChange={(e) => setEditBoatName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900" />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                       <select value={editBoatType} onChange={(e) => setEditBoatType(e.target.value as BoatType)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900">
                                           <option value={BoatType.SAILING}>Vela</option>
                                           <option value={BoatType.POWER}>Motore</option>
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Immagine</label>
                                       <div className="relative">
                                            <ImageIcon size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                            <input type="text" value={editBoatImage} onChange={(e) => setEditBoatImage(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-slate-900" />
                                       </div>
                                   </div>
                                   <div className="pt-4 flex gap-3">
                                       <button type="button" onClick={() => setEditingBoat(null)} className="flex-1 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Annulla</button>
                                       <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"><Save size={18} /> Salva</button>
                                   </div>
                               </form>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Anteprima</label>
                               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                   <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100 mb-3 relative group">
                                       {editBoatImage ? (<img src={editBoatImage} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x200?text=No+Image')} />) : (<div className="flex items-center justify-center h-full text-slate-400 flex-col gap-2"><ImageIcon size={32} /><span className="text-xs">Nessuna immagine</span></div>)}
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white font-bold tracking-widest uppercase">{editBoatName || 'Nome'}</span></div>
                                   </div>
                                   <div className="flex items-center justify-between">
                                       <div><h3 className="font-bold text-slate-800 text-lg">{editBoatName || 'Nome Barca'}</h3><span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{editBoatType}</span></div>
                                       <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Ship size={18} /></div>
                                   </div>
                               </div>
                           </div>
                       </div>
                   ) : (
                       <>
                           <form onSubmit={handleAddBoat} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                               <div className="flex-1 w-full"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Barca</label><input type="text" value={newBoatName} onChange={(e) => setNewBoatName(e.target.value)} placeholder="Es. Perla Nera" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"/></div>
                               <div className="w-full md:w-40"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label><select value={newBoatType} onChange={(e) => setNewBoatType(e.target.value as BoatType)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"><option value={BoatType.SAILING}>Vela</option><option value={BoatType.POWER}>Motore</option></select></div>
                               <div className="flex-1 w-full"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Immagine (Opzionale)</label><input type="text" value={newBoatImage} onChange={(e) => setNewBoatImage(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"/></div>
                               <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Aggiungi</button>
                           </form>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {boats.map(boat => (
                                   <div key={boat.id} onClick={() => handleBoatClick(boat)} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 group cursor-pointer hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden">
                                       <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-blue-500 transition-colors"></div>
                                       <img src={boat.image} alt={boat.name} className="w-16 h-16 rounded-lg object-cover bg-slate-200" />
                                       <div className="flex-1"><h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{boat.name}</h4><span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{boat.type}</span></div>
                                       
                                       <button 
                                          onClick={(e) => handleOpenMaintenance(e, boat)}
                                          className="p-2 mr-1 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors z-10"
                                          title="Diario di Bordo"
                                       >
                                          <Wrench size={18} />
                                       </button>

                                       <button onClick={(e) => handleDeleteBoat(e, boat.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors z-10" title="Elimina"><Trash2 size={18} /></button>
                                   </div>
                               ))}
                           </div>
                       </>
                   )}
               </div>
           ) : (
               <div className="space-y-6 animate-in slide-in-from-right duration-200">
                   {/* Activity content */}
                   {editingActivity ? (
                       /* ================= EDIT ACTIVITY MODE ================= */
                       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
                           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                               <Map size={20} className="text-indigo-600" /> Modifica Missione
                           </h3>
                           <form onSubmit={handleSaveActivity} className="space-y-6">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <div className="md:col-span-2">
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Missione</label>
                                       <input type="text" value={editActName} onChange={(e) => setEditActName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-900"/>
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Durata Default (giorni)</label>
                                       <div className="relative">
                                           <Clock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                           <input type="number" min="1" value={editActDuration} onChange={(e) => setEditActDuration(parseInt(e.target.value))} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white text-slate-900"/>
                                       </div>
                                   </div>
                                   
                                   <div className="md:col-span-2">
                                       <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                                           <input type="checkbox" checked={editActIsGeneral} onChange={(e) => setEditActIsGeneral(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 bg-white" />
                                           Evento Generale (No Barca) - es. Cena, Party
                                       </label>
                                   </div>

                                   {!editActIsGeneral && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipi Barca Ammessi</label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => toggleEditActType(BoatType.SAILING)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${editActTypes.includes(BoatType.SAILING) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>Vela</button>
                                            <button type="button" onClick={() => toggleEditActType(BoatType.POWER)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${editActTypes.includes(BoatType.POWER) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>Motore</button>
                                        </div>
                                    </div>
                                   )}
                               </div>

                               <div className="pt-4 flex gap-3">
                                   <button type="button" onClick={() => setEditingActivity(null)} className="flex-1 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Annulla</button>
                                   <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"><Save size={18} /> Salva Modifiche</button>
                               </div>
                           </form>
                       </div>
                   ) : (
                       /* ================= LIST ACTIVITIES MODE ================= */
                       <>
                           {/* Add Activity Form */}
                           <form onSubmit={handleAddActivity} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                               <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                   <div className="md:col-span-4">
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Missione</label>
                                       <input type="text" value={newActName} onChange={(e) => setNewActName(e.target.value)} placeholder="Es. Regata della Morte" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"/>
                                   </div>
                                   <div className="md:col-span-2">
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Durata (gg)</label>
                                       <input type="number" min="1" value={newActDuration} onChange={(e) => setNewActDuration(parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-900"/>
                                   </div>
                                   <div className="md:col-span-4 flex items-center gap-4">
                                       <label className="flex items-center gap-2 font-medium text-xs text-slate-600 cursor-pointer border border-slate-200 p-2 rounded-lg bg-slate-50">
                                           <input type="checkbox" checked={newActIsGeneral} onChange={(e) => setNewActIsGeneral(e.target.checked)} className="rounded text-blue-600 bg-white" />
                                           Evento No Barca
                                       </label>
                                       
                                       {!newActIsGeneral && (
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => toggleNewActType(BoatType.SAILING)} className={`px-2 py-1.5 rounded-lg text-xs font-bold border ${newActTypes.includes(BoatType.SAILING) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Vela</button>
                                            <button type="button" onClick={() => toggleNewActType(BoatType.POWER)} className={`px-2 py-1.5 rounded-lg text-xs font-bold border ${newActTypes.includes(BoatType.POWER) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Motore</button>
                                        </div>
                                       )}
                                   </div>
                                   <div className="md:col-span-2">
                                       <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Crea</button>
                                   </div>
                               </div>
                           </form>

                           {/* Activity List */}
                           <div className="space-y-2">
                               {activities.map(act => (
                                   <div key={act.id} onClick={() => handleActivityClick(act)} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">
                                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
                                       <div className="flex items-center gap-4 pl-2">
                                           <div className={`p-2 rounded-lg ${act.isGeneral ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                               {act.isGeneral ? <Users size={20} /> : <Map size={20} />}
                                           </div>
                                           <div>
                                               <h4 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{act.name}</h4>
                                               <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                   <span className="flex items-center gap-1"><Clock size={12}/> {act.defaultDurationDays} gg</span>
                                                   {act.isGeneral ? (
                                                        <span className="text-purple-500 font-medium">Tutti invitati</span>
                                                   ) : (
                                                        <span className="flex items-center gap-1"><Ship size={12}/> {act.allowedBoatTypes.join(', ')}</span>
                                                   )}
                                               </div>
                                           </div>
                                       </div>
                                       <button onClick={(e) => handleDeleteActivity(e, act.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors z-10"><Trash2 size={18} /></button>
                                   </div>
                               ))}
                           </div>
                       </>
                   )}
               </div>
           )}
        </div>
        
        {/* Maintenance Modal */}
        {maintenanceBoat && (
           <MaintenanceModal 
              isOpen={!!maintenanceBoat}
              onClose={() => setMaintenanceBoat(null)}
              boat={maintenanceBoat}
              records={maintenanceRecords}
              onUpdateRecords={onUpdateMaintenance}
           />
        )}
      </div>
    </div>
  );
};
