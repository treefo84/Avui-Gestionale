
import React, { useState } from 'react';
import { Activity, Assignment, AssignmentStatus, Boat, Role, User } from '../types';
import { X, Lock, Save, Calendar, Ship, MapPin, Mail, Scroll, Link as LinkIcon, Check, Loader2, Ban, Phone, Cake } from 'lucide-react';
import { format, isFuture } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '../supabaseClient';

interface ProfilePageProps {
    user: User;
    users: User[];
    assignments: Assignment[];
    boats: Boat[];
    activities: Activity[];
    onClose: () => void;
    onUpdateUser: (field: keyof User, value: any) => void;
}

const AVATAR_SEEDS = [
    'Trifo', 'Ciccio', 'Gianlu', 'Francesca', 'Mauro', 'Matteo', 'Gennaro', 'Emanuele',
    'Luca', 'Riccardo', 'Salvatore', 'Roberto', 'Felix', 'Boots', 'Cuddles', 'Snuggles',
    'Bella', 'Luna', 'Charlie', 'Max', 'Sailor', 'Captain', 'Pirate', 'Mate'
];

const parseDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
    user,
    users,
    assignments,
    boats,
    activities,
    onClose,
    onUpdateUser
}) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passMessage, setPassMessage] = useState('');
    const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword === confirmPassword && newPassword.length > 0) {
            onUpdateUser('password', newPassword);
            setPassMessage('Password aggiornata con successo!');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPassMessage(''), 3000);
        } else {
            setPassMessage('Le password non coincidono o sono vuote.');
        }
    };

    const handleAvatarChange = (seed: string) => {
        const newAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${['b6e3f4', 'c0aede', 'ffdfbf'][Math.floor(Math.random() * 3)]}`;
        onUpdateUser('avatar', newAvatarUrl);
    };

    const toggleGoogleCalendar = async () => {
        setIsConnectingCalendar(true);
        try {
            if (user.googleCalendarConnected) {
                // Prima cerchiamo e scolleghiamo l'identità google
                const { data: { identities }, error: idError } = await supabase.auth.getUserIdentities();
                if (!idError && identities) {
                    const googleIdentity = identities.find(id => id.provider === 'google');
                    if (googleIdentity) {
                        const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
                        if (unlinkError) throw unlinkError;
                    }
                }
                // Disconnesso con successo
                onUpdateUser('googleCalendarConnected', false);
            } else {
                // Avvia il flow OAuth2 per collegare Google
                const { error } = await supabase.auth.linkIdentity({
                    provider: 'google',
                    options: {
                        redirectTo: `${window.location.origin}/`,
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                        },
                        scopes: 'https://www.googleapis.com/auth/calendar.events',
                    }
                });

                if (error) {
                    console.error("Errore durante il collegamento a Google:", error.message);
                    alert("Errore di connessione a Google Calendar: " + error.message);
                }
                // N.B: in caso di successo la pagina viene ricaricata ed esegue il redirect
            }
        } catch (err: any) {
            console.error("Errore Google Calendar:", err);
            alert("Si è verificato un errore: " + err.message);
        } finally {
            setIsConnectingCalendar(false);
        }
    };

    // Filter future assignments for this user
    const myAssignments = assignments
        .filter(a => (a.instructorId === user.id || a.helperId === user.id))
        .filter(a => isFuture(parseDate(a.date)))
        .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-6 sticky top-0 z-10 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <img src={user.avatar} className="w-16 h-16 rounded-full border-4 border-slate-700 bg-slate-800" alt="Profile" />
                    <div>
                        <h2 className="text-2xl font-bold">{user.name}</h2>
                        <div className="flex items-center gap-2 text-blue-300 text-sm font-medium">
                            <span className="uppercase tracking-wider">
                                {user.role === Role.INSTRUCTOR ? 'Comandante' :
                                    (user.role === Role.MANAGER ? 'Manager' :
                                        (user.role === Role.RESERVE ? 'Riserva (In Prova)' : 'Mozzo'))}
                            </span>
                            {user.isAdmin && <span className="bg-amber-500 text-slate-900 text-[10px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-8">

                {/* Left Column: Settings */}
                <div className="md:col-span-5 space-y-6">

                    {/* Account Details */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Scroll size={20} className="text-blue-500" /> Dati Personali
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                <input type="text" value={user.username} disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 text-sm cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={user.email || ''}
                                        onChange={(e) => onUpdateUser('email', e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefono</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={user.phoneNumber || ''}
                                        onChange={(e) => onUpdateUser('phoneNumber', e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data di Nascita</label>
                                <div className="relative">
                                    <Cake size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="date"
                                        value={user.birthDate || ''}
                                        onChange={(e) => onUpdateUser('birthDate', e.target.value)}
                                        style={{ colorScheme: 'light' }}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Integrations (Google Calendar) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <LinkIcon size={20} className="text-indigo-500" /> Integrazioni
                        </h3>
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-lg border border-slate-200">
                                    <Calendar size={20} className="text-red-500" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800">Google Calendar</h4>
                                    <p className="text-xs text-slate-500">Sincronizza missioni</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleGoogleCalendar}
                                disabled={isConnectingCalendar}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${user.googleCalendarConnected
                                    ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}`}
                            >
                                {isConnectingCalendar ? <Loader2 size={12} className="animate-spin" /> : (user.googleCalendarConnected ? <Check size={12} /> : <LinkIcon size={12} />)}
                                {user.googleCalendarConnected ? 'Connesso' : 'Connetti'}
                            </button>
                        </div>
                        {user.googleCalendarConnected && (
                            <p className="text-[10px] text-slate-400 mt-2 text-center">
                                Gli eventi confermati verranno aggiunti automaticamente al tuo calendario.
                            </p>
                        )}
                    </div>

                    {/* Security */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Lock size={20} className="text-rose-500" /> Sicurezza
                        </h3>
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                            <input
                                type="password"
                                placeholder="Nuova Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            />
                            <input
                                type="password"
                                placeholder="Conferma Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            />
                            {passMessage && <p className={`text-xs font-medium ${passMessage.includes('successo') ? 'text-green-600' : 'text-rose-600'}`}>{passMessage}</p>}
                            <button type="submit" className="w-full bg-slate-800 text-white text-sm font-bold py-2 rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2">
                                <Save size={16} /> Aggiorna Password
                            </button>
                        </form>
                    </div>

                    {/* Avatar Picker */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Cambia Faccia</h3>
                        <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {AVATAR_SEEDS.map((seed) => (
                                <button
                                    key={seed}
                                    onClick={() => handleAvatarChange(seed)}
                                    className={`rounded-full overflow-hidden transition-all border-2 ${user.avatar.includes(seed) ? 'border-blue-500 scale-110' : 'border-transparent hover:border-slate-300'}`}
                                >
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${['b6e3f4', 'c0aede', 'ffdfbf'][Math.floor(Math.random() * 3)]}`}
                                        className="w-full h-full bg-slate-50"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Schedule */}
                <div className="md:col-span-7">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Calendar size={24} className="text-teal-600" /> Le Tue Prossime Missioni
                    </h3>

                    {myAssignments.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                            <Ship size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">Nessuna missione in vista, marinaio.</p>
                            <p className="text-sm text-slate-400">Goditi il riposo a terra.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myAssignments.map(assignment => {
                                const boat = boats.find(b => b.id === assignment.boatId);
                                const activity = activities.find(a => a.id === assignment.activityId);
                                const date = parseDate(assignment.date);
                                const isCancelled = assignment.status === AssignmentStatus.CANCELLED;

                                // Determine partner
                                const isInstructor = assignment.instructorId === user.id;
                                const partnerId = isInstructor ? assignment.helperId : assignment.instructorId;
                                const partner = users.find(u => u.id === partnerId);

                                return (
                                    <div key={assignment.id} className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-5 hover:shadow-md transition-shadow relative overflow-hidden ${isCancelled ? 'border-red-200 bg-red-50/50' : 'border-slate-200'}`}>
                                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${isCancelled ? 'bg-red-500' : 'bg-teal-500'}`}></div>

                                        <div className="flex flex-col items-center justify-center bg-slate-50 p-3 rounded-xl min-w-[80px]">
                                            <span className="text-xs font-bold text-slate-400 uppercase">{format(date, 'MMM', { locale: it })}</span>
                                            <span className={`text-2xl font-bold ${isCancelled ? 'text-red-500 decoration-line-through' : 'text-slate-800'}`}>{format(date, 'd')}</span>
                                            <span className="text-xs font-medium text-slate-500 capitalize">{format(date, 'EEE', { locale: it })}</span>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className={`text-lg font-bold mb-1 ${isCancelled ? 'text-red-600 line-through' : 'text-slate-800'}`}>
                                                        {activity?.name || 'Attività Sconosciuta'}
                                                        {isCancelled && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full no-underline">ANNULLATA</span>}
                                                    </h4>
                                                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                                                        <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                                                            <Ship size={12} /> {boat?.name}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={14} className="text-slate-400" /> Base Nautica
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Partner Info */}
                                                {partner && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] uppercase text-slate-400 font-bold mb-1">Con</span>
                                                        <div className={`flex items-center gap-2 bg-slate-50 pl-2 pr-3 py-1 rounded-full border border-slate-100 ${isCancelled ? 'opacity-50 grayscale' : ''}`}>
                                                            <img src={partner.avatar} className="w-6 h-6 rounded-full border border-slate-200" alt="Partner" />
                                                            <div className="text-right">
                                                                <p className="text-xs font-bold text-slate-700 leading-none">{partner.name}</p>
                                                                <p className="text-[9px] text-slate-400">
                                                                    {partner.role === Role.INSTRUCTOR ? 'Comandante' : (partner.role === Role.MANAGER ? 'Manager' : 'Mozzo')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
