import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Announcement, User } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Send, Trash2, Megaphone, Loader2 } from 'lucide-react';

interface NoticeBoardProps {
    currentUser: User | null;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ currentUser }) => {
    const [messages, setMessages] = useState<Announcement[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select(`
          id, 
          content, 
          created_at, 
          author_id,
          users!inner (
            name,
            avatar_url,
            is_admin
          )
        `)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                const mapped: Announcement[] = data.map((d: any) => ({
                    id: d.id,
                    authorId: d.author_id,
                    content: d.content,
                    createdAt: d.created_at,
                    authorName: d.users?.name || 'Utente Sconosciuto',
                    authorAvatar: d.users?.avatar_url
                }));
                setMessages(mapped);
            }
        } catch (err) {
            console.error("Errore fetch announcements:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        const sub = supabase.channel('announcements-board')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
                fetchMessages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    useEffect(() => {
        // Scroll to bottom when new messages arrive WITHOUT scrolling the whole page
        if (messagesEndRef.current) {
            const parent = messagesEndRef.current.parentElement;
            if (parent) {
                parent.scrollTo({ top: parent.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;

        setIsSending(true);
        try {
            const { error } = await supabase
                .from('announcements')
                .insert({
                    author_id: currentUser.id,
                    content: newMessage.trim()
                });

            if (error) throw error;
            setNewMessage('');
        } catch (err) {
            console.error("Errore invio messaggio:", err);
            alert("Errore nell'invio del messaggio.");
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = async (id: string) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo messaggio?")) return;

        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error("Errore eliminazione:", err);
            alert("Errore durante l'eliminazione.");
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 flex flex-col h-[500px] lg:h-[600px] overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 text-white p-4 flex items-center gap-3">
                <Megaphone className="text-amber-400" size={24} />
                <h2 className="font-bold text-lg">Bacheca Avvisi</h2>
                <span className="ml-auto text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">
                    Staff Avui
                </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Megaphone size={48} className="text-slate-200" />
                        <p>Nessun avviso presente. Scrivi qualcosa!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMine = msg.authorId === currentUser?.id;
                        const showDelete = isMine || currentUser?.isAdmin;
                        const msgDate = new Date(msg.createdAt);

                        // grouping logic for dates could be added here, keeping simple for now
                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                                <img
                                    src={msg.authorAvatar || `https://ui-avatars.com/api/?name=${msg.authorName}`}
                                    alt={msg.authorName}
                                    className="w-10 h-10 rounded-full border border-slate-200 shadow-sm"
                                />
                                <div className={`flex flex-col max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1 px-1">
                                        <span className="text-xs font-semibold text-slate-700">
                                            {isMine ? 'Tu' : msg.authorName}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {format(msgDate, "dd MMM HH:mm", { locale: it })}
                                        </span>
                                    </div>

                                    <div className="group relative">
                                        <div className={`p-3 rounded-2xl shadow-sm whitespace-pre-wrap break-words text-sm
                      ${isMine ? 'bg-amber-500 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}
                    `}>
                                            {msg.content}
                                        </div>

                                        {showDelete && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className={`absolute top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100
                          ${isMine ? '-left-10' : '-right-10'}
                        `}
                                                title="Elimina messaggio"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Scrivi un avviso in bacheca..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                        disabled={!currentUser || isSending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || !currentUser || isSending}
                        className="bg-slate-800 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="translate-x-[1px]" />}
                    </button>
                </form>
            </div>
        </div>
    );
};
