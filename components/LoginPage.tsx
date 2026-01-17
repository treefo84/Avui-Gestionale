
import React, { useState } from 'react';
import { User } from '../types';
import { Ship, Anchor, KeyRound, User as UserIcon } from 'lucide-react';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.password === password
    );

    if (user) {
      onLogin(user);
    } else {
      setError('Credenziali errate, marinaio! Riprova.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 transform -rotate-12"><Ship size={300} /></div>
        <div className="absolute bottom-10 right-10 transform rotate-12"><Anchor size={300} /></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl shadow-xl mb-6 ring-4 ring-blue-900">
            <Ship size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Calendario Avui</h1>
          <p className="text-slate-400">Inserisci le credenziali per salire a bordo</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-blue-200 mb-2">Nome Utente</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon size={18} className="text-slate-500" />
                    </div>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Es. trifo"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-blue-200 mb-2">Password</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound size={18} className="text-slate-500" />
                    </div>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-200 text-sm font-medium text-center">
                    {error}
                </div>
            )}

            <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.02]"
            >
                Entra in Servizio
            </button>
          </form>
          
          <div className="mt-6 text-center">
             <p className="text-xs text-slate-500">Password dimenticata? Chiedi all'Ammiraglio Trifo.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
