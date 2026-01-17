import React, { useState } from 'react';
import { User } from '../types';
import { Ship, Lock, KeyRound, AlertTriangle } from 'lucide-react';

interface ForcePasswordChangeProps {
  user: User;
  onSave: (newPassword: string) => void;
}

export const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({ user, onSave }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
        setError('La password deve essere di almeno 4 caratteri.');
        return;
    }
    if (newPassword !== confirmPassword) {
        setError('Le password non coincidono.');
        return;
    }
    if (newPassword === '1234') {
        setError('Non puoi usare la password di default!');
        return;
    }
    onSave(newPassword);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 right-10 transform rotate-12"><Ship size={300} /></div>
        <div className="absolute bottom-10 left-10 transform -rotate-12"><Lock size={300} /></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-4 bg-amber-500 rounded-2xl shadow-xl mb-6 ring-4 ring-amber-900">
            <KeyRound size={48} className="text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Sicurezza a Bordo</h1>
          <p className="text-slate-400">
            Benvenuto <strong>{user.name}</strong>. <br/> 
            Per sicurezza, devi cambiare la password di default prima di salpare.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
                <label className="block text-sm font-bold text-amber-200 mb-2">Nuova Password</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock size={18} className="text-slate-500" />
                    </div>
                    <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-amber-200 mb-2">Conferma Password</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock size={18} className="text-slate-500" />
                    </div>
                    <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-200 text-sm font-medium">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            <button 
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-amber-500/25 transform hover:scale-[1.02]"
            >
                Imposta Password e Accedi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};