import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { PriceItem, Role, User } from '../types';
import {
  Tag,
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  Layers,
  Euro,
  Share2,
  ArrowUpDown,
  Filter,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

interface PriceListPageProps {
  currentUser: User | null;
}

const DEFAULT_CATEGORIES = [
  'Patente Nautica',
  'Corsi Vela Cabinato',
  'Manovre & Ormeggi',
  'Regata & Vele Portanti',
  'Uscite & Weekend',
  'Lezioni Private',
  'Tesseramento & Quote',
  'Altro'
] as const;

const INITIAL_PRICE_LIST: Omit<PriceItem, 'id'>[] = [
  {
    title: 'Patente Nautica Entro 12 Miglia (Vela + Motore)',
    category: 'Patente Nautica',
    price: 650,
    priceDetail: 'a persona',
    duration: '5 weekend teorici + 4 uscite pratiche + esame',
    description: 'Corso completo per il conseguimento della patente nautica entro 12 miglia dalla costa. Include lezioni in aula/online, materiale didattico, carte nautiche, squadrette, compasso e uscite di preparazione pratica con le barche sociali.',
    requirements: 'Certificato medico per patente nautica rilasciato da medico abilitato, 3 fototessere, marca da bollo.',
    notes: 'Acconto 30% all\'iscrizione, saldo prima dell\'esame pratico. Esclusi diritti e tasse d\'esame della Motorizzazione.',
    orderIndex: 1,
    isActive: true
  },
  {
    title: 'Patente Nautica Senza Limiti (Integrazione Vela + Motore)',
    category: 'Patente Nautica',
    price: 550,
    priceDetail: 'a persona',
    duration: '6 serate di carteggio avanzato + simulazioni',
    description: 'Corso di integrazione per chi possiede già la patente entro 12M o corso diretto per la Senza Limiti. Comprende carteggio approfondito su correnti, scarroccio, rotte ortodromiche, loxodromiche e navigazione stimata.',
    requirements: 'Possesso patente entro 12M (per estensione) o requisiti base patente.',
    notes: 'Include dispense ed eserciziario ufficiale Ministeriale.',
    orderIndex: 2,
    isActive: true
  },
  {
    title: 'Corso Base Cabinato (Iniziazione alla Vela)',
    category: 'Corsi Vela Cabinato',
    price: 280,
    priceDetail: 'a persona (weekend)',
    duration: '2 weekend (4 giorni full-day: 09:30 - 17:30)',
    description: 'Per chi sale a bordo per le prime volte. Nomenclatura, andature (bolina, traverso, lasco, poppa), virata, strambata, regolazione vele, nodi marinareschi e sicurezza della navigazione.',
    requirements: 'Certificato medico non agonistico, tessera FIV/CSEN in corso di validità.',
    notes: 'Max 5 allievi per imbarcazione con istruttore a bordo. Include uso barca e carburante.',
    orderIndex: 3,
    isActive: true
  },
  {
    title: 'Corso Avanzato & Navigazione Costiera',
    category: 'Corsi Vela Cabinato',
    price: 340,
    priceDetail: 'a persona',
    duration: '2 weekend con navigazione notturna',
    description: 'Approfondimento regolazione di fino delle vele, uso del trasto, punti di scotta, sicurezza in navigazione d\'altura, presa di terzaroli con mare formato e navigazione notturna guidata.',
    requirements: 'Aver frequentato il corso Base o esperienza equivalente.',
    notes: 'Include navigazione notturna ed esperienza di vita di bordo.',
    orderIndex: 4,
    isActive: true
  },
  {
    title: 'Corso Ormeggi & Manovre in Porto',
    category: 'Manovre & Ormeggi',
    price: 190,
    priceDetail: 'a persona',
    duration: '1 weekend intensivo (Sabato e Domenica)',
    description: 'Dedicato interamente alla gestione della barca a motore in spazi ristretti: effetto evolutivo dell\'elica, ormeggio all\'inglese, di poppa con corpo morto e trappe, presa del gavitello, gestione del vento al traverso.',
    requirements: 'Nessun requisito specifico.',
    notes: 'Consigliatissimo per neo-patentati e prima del noleggio estivo.',
    orderIndex: 5,
    isActive: true
  },
  {
    title: 'Corso Spinnaker & Gennaker (Vele Portanti)',
    category: 'Regata & Vele Portanti',
    price: 220,
    priceDetail: 'a persona',
    duration: '1 weekend (Sabato e Domenica)',
    description: 'Armo e gestione delle vele portanti: circuito bracci e scotte, tangonatura, issata, regolazione in andatura, strambata con tangone e ammainata in sicurezza.',
    requirements: 'Buona conoscenza delle manovre base su cabinato.',
    notes: 'Massimo 4 allievi a bordo per garantire rotazione completa dei ruoli.',
    orderIndex: 6,
    isActive: true
  },
  {
    title: 'Uscita Giornaliera / Perfezionamento Weekend',
    category: 'Uscite & Weekend',
    price: 75,
    priceDetail: 'a persona / giornata',
    duration: 'Giornata intera (09:30 - 17:30)',
    description: 'Uscita didattica o di puro relax a vela per fare miglia e tenersi allenati. Condotta da uno dei nostri istruttori o skipper autorizzati.',
    requirements: 'Tessera associativa / assicurativa valida.',
    notes: 'Pranzo al sacco o sosta in rada a seconda del meteo.',
    orderIndex: 7,
    isActive: true
  },
  {
    title: 'Lezione Privata 1:1 con Istruttore',
    category: 'Lezioni Private',
    price: 50,
    priceDetail: 'all\'ora (min. 2 ore)',
    duration: 'Flessibile (2 - 4 ore)',
    description: 'Sessione personalizzata one-to-one su barca sociale o sulla barca dell\'allievo (armatore). Programma su misura: manovre, ormeggio, regolazione vele, elettronica di bordo.',
    requirements: 'Su prenotazione e disponibilità istruttore.',
    notes: 'Possibilità di pacchetto mezza giornata (4 ore) a € 180,00.',
    orderIndex: 8,
    isActive: true
  },
  {
    title: 'Tesseramento Socio Annuale AVUI + FIV/CSEN',
    category: 'Tesseramento & Quote',
    price: 50,
    priceDetail: 'annuale (anno solare)',
    duration: 'Valido fino al 31 Dicembre',
    description: 'Quota sociale per partecipare a tutte le attività, uscite e corsi dell\'AVUI Sailing Team. Include copertura assicurativa RC e infortuni base FIV / CSEN.',
    requirements: 'Certificato medico di idoneità sportiva non agonistica.',
    notes: 'Obbligatorio per tutti gli allievi e partecipanti alle uscite in mare.',
    orderIndex: 9,
    isActive: true
  }
];

const LOCAL_STORAGE_KEY = 'avui_price_list_cache';

export const PriceListPage: React.FC<PriceListPageProps> = ({ currentUser }) => {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');
  const [sortBy, setSortBy] = useState<'order' | 'price_asc' | 'price_desc' | 'title'>('order');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Patente Nautica',
    price: '',
    priceDetail: 'a persona',
    duration: '',
    description: '',
    requirements: '',
    notes: '',
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Permission Check: Instructors, Managers, and Admins can create/edit/delete
  const canEdit = useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role;
    return (
      role === Role.INSTRUCTOR ||
      role === Role.MANAGER ||
      Boolean(currentUser.isAdmin)
    );
  }, [currentUser]);

  // Load Price List
  const loadPrices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('price_list')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: PriceItem[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category || 'Altro',
          price: Number(d.price) || 0,
          priceDetail: d.price_detail || '',
          duration: d.duration || '',
          description: d.description || '',
          requirements: d.requirements || '',
          notes: d.notes || '',
          orderIndex: d.order_index ?? 0,
          isActive: d.is_active ?? true,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          createdBy: d.created_by,
          updatedByName: d.updated_by_name || ''
        }));
        setItems(mapped);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
      } else if (!error && data && data.length === 0) {
        // Table is empty in Supabase, seed with default catalog
        if (canEdit) {
          const rowsToInsert = INITIAL_PRICE_LIST.map((item) => ({
            title: item.title,
            category: item.category,
            price: item.price,
            price_detail: item.priceDetail,
            duration: item.duration,
            description: item.description,
            requirements: item.requirements,
            notes: item.notes,
            order_index: item.orderIndex,
            is_active: item.isActive,
            updated_by_name: currentUser?.name || 'Staff'
          }));
          const { data: insertedData, error: insErr } = await supabase
            .from('price_list')
            .insert(rowsToInsert)
            .select('*');

          if (!insErr && insertedData) {
            const mapped: PriceItem[] = insertedData.map((d: any) => ({
              id: d.id,
              title: d.title,
              category: d.category || 'Altro',
              price: Number(d.price) || 0,
              priceDetail: d.price_detail || '',
              duration: d.duration || '',
              description: d.description || '',
              requirements: d.requirements || '',
              notes: d.notes || '',
              orderIndex: d.order_index ?? 0,
              isActive: d.is_active ?? true,
              createdAt: d.created_at,
              updatedAt: d.updated_at,
              createdBy: d.created_by,
              updatedByName: d.updated_by_name || ''
            }));
            setItems(mapped);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
            return;
          }
        }
        // Fallback to initial static data with mock IDs
        const fallback = INITIAL_PRICE_LIST.map((item, idx) => ({
          ...item,
          id: `local-${idx + 1}`,
          updatedByName: 'AVUI Sailing Team'
        }));
        setItems(fallback);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fallback));
      } else {
        // Table doesn't exist yet or connection issue: load from localStorage cache or fallback
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          try {
            setItems(JSON.parse(cached));
          } catch {
            const fallback = INITIAL_PRICE_LIST.map((item, idx) => ({
              ...item,
              id: `local-${idx + 1}`,
              updatedByName: 'AVUI Sailing Team'
            }));
            setItems(fallback);
          }
        } else {
          const fallback = INITIAL_PRICE_LIST.map((item, idx) => ({
            ...item,
            id: `local-${idx + 1}`,
            updatedByName: 'AVUI Sailing Team'
          }));
          setItems(fallback);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fallback));
        }
      }
    } catch (err) {
      console.warn('Utilizzo catalogo locale per il listino prezzi:', err);
      const fallback = INITIAL_PRICE_LIST.map((item, idx) => ({
        ...item,
        id: `local-${idx + 1}`,
        updatedByName: 'AVUI Sailing Team'
      }));
      setItems(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrices();

    // Supabase Realtime subscription
    try {
      const channel = supabase
        .channel('price_list_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'price_list' },
          () => {
            loadPrices();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      // Realtime not supported or table absent
    }
  }, []);

  // Filter and Sort Items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Category filter
        if (selectedCategory !== 'Tutti' && item.category !== selectedCategory) {
          return false;
        }
        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.duration && item.duration.toLowerCase().includes(q)) ||
          (item.requirements && item.requirements.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
      });
  }, [items, selectedCategory, searchQuery, sortBy]);

  // Categories list with counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = { Tutti: items.length };
    DEFAULT_CATEGORIES.forEach((cat) => {
      counts[cat] = items.filter((i) => i.category === cat).length;
    });
    // Add any custom categories
    items.forEach((i) => {
      if (!DEFAULT_CATEGORIES.includes(i.category as any)) {
        counts[i.category] = (counts[i.category] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  // Open Modal for Create or Edit
  const handleOpenModal = (item?: PriceItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        category: item.category,
        price: item.price.toString(),
        priceDetail: item.priceDetail || 'a persona',
        duration: item.duration || '',
        description: item.description || '',
        requirements: item.requirements || '',
        notes: item.notes || '',
        isActive: item.isActive ?? true
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        category: selectedCategory !== 'Tutti' ? selectedCategory : 'Patente Nautica',
        price: '',
        priceDetail: 'a persona',
        duration: '',
        description: '',
        requirements: '',
        notes: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Inserisci il nome del corso o servizio.');
      return;
    }
    const numPrice = parseFloat(formData.price.replace(',', '.'));
    if (isNaN(numPrice) || numPrice < 0) {
      alert('Inserisci un importo valido.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category.trim(),
        price: numPrice,
        price_detail: formData.priceDetail.trim() || 'a persona',
        duration: formData.duration.trim() || null,
        description: formData.description.trim() || null,
        requirements: formData.requirements.trim() || null,
        notes: formData.notes.trim() || null,
        is_active: formData.isActive,
        updated_at: new Date().toISOString(),
        updated_by_name: currentUser?.name || 'Istruttore'
      };

      if (editingItem) {
        // UPDATE
        const { error } = await supabase
          .from('price_list')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) {
          console.warn('Supabase update error, aggiornamento locale:', error);
          // Update in local state
          const updated = items.map((i) =>
            i.id === editingItem.id
              ? {
                  ...i,
                  title: payload.title,
                  category: payload.category,
                  price: payload.price,
                  priceDetail: payload.price_detail,
                  duration: payload.duration || '',
                  description: payload.description || '',
                  requirements: payload.requirements || '',
                  notes: payload.notes || '',
                  isActive: payload.is_active,
                  updatedAt: payload.updated_at,
                  updatedByName: payload.updated_by_name
                }
              : i
          );
          setItems(updated);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } else {
          await loadPrices();
        }
      } else {
        // INSERT
        const newOrderIndex = items.length > 0 ? Math.max(...items.map((i) => i.orderIndex ?? 0)) + 1 : 1;
        const { error } = await supabase.from('price_list').insert({
          ...payload,
          order_index: newOrderIndex
        });

        if (error) {
          console.warn('Supabase insert error, inserimento locale:', error);
          const newItem: PriceItem = {
            id: `local-${Date.now()}`,
            title: payload.title,
            category: payload.category,
            price: payload.price,
            priceDetail: payload.price_detail,
            duration: payload.duration || '',
            description: payload.description || '',
            requirements: payload.requirements || '',
            notes: payload.notes || '',
            orderIndex: newOrderIndex,
            isActive: payload.is_active,
            createdAt: new Date().toISOString(),
            updatedAt: payload.updated_at,
            updatedByName: payload.updated_by_name
          };
          const updated = [...items, newItem];
          setItems(updated);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } else {
          await loadPrices();
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Errore salvataggio:', err);
      alert('Si è verificato un errore durante il salvataggio.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async (item: PriceItem) => {
    if (!window.confirm(`Sei sicuro di voler eliminare "${item.title}" dal listino prezzi?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('price_list').delete().eq('id', item.id);

      if (error) {
        console.warn('Supabase delete error, eliminazione locale:', error);
      }
      const updated = items.filter((i) => i.id !== item.id);
      setItems(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Errore eliminazione:', err);
      alert('Errore durante l\'eliminazione.');
    }
  };

  // Copy Course info to clipboard (WhatsApp/Email ready)
  const handleCopyCourseInfo = (item: PriceItem) => {
    const formattedPrice = item.price.toLocaleString('it-IT', {
      style: 'currency',
      currency: 'EUR'
    });

    const lines = [
      `⛵ *AVUI Sailing Team - Scheda Corso & Prezzo*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📚 *Corso:* ${item.title}`,
      `🏷️ *Categoria:* ${item.category}`,
      `💶 *Costo:* ${formattedPrice} ${item.priceDetail ? `(${item.priceDetail})` : ''}`,
      item.duration ? `⏱️ *Durata:* ${item.duration}` : null,
      ``,
      item.description ? `📝 *Cosa include:* ${item.description}` : null,
      item.requirements ? `📋 *Requisiti:* ${item.requirements}` : null,
      item.notes ? `📌 *Note:* ${item.notes}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `ℹ️ Per info e iscrizioni contatta la segreteria o lo staff AVUI!`
    ]
      .filter((line) => line !== null)
      .join('\n');

    navigator.clipboard.writeText(lines).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Get Category Badge Color
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Patente Nautica':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Corsi Vela Cabinato':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Manovre & Ormeggi':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Regata & Vele Portanti':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Uscite & Weekend':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Lezioni Private':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Tesseramento & Quote':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Tag size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Listino Prezzi & Corsi
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                Staff AVUI
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Catalogo e tariffe ufficiali dei corsi e servizi della scuola vela. Consulta i costi
              aggiornati per rispondere rapidamente alle richieste degli allievi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {canEdit ? (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>Aggiungi Corso</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl">
              <Info size={15} className="text-blue-500 shrink-0" />
              <span>Sola visualizzazione</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Corsi & Voci
            </div>
            <div className="text-xl font-black text-slate-800">{items.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Categorie
            </div>
            <div className="text-xl font-black text-slate-800">
              {Object.keys(categoriesWithCounts).length - 1}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Euro size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tariffa Min - Max
            </div>
            <div className="text-sm font-black text-slate-800">
              {items.length > 0
                ? `€ ${Math.min(...items.map((i) => i.price))} - € ${Math.max(...items.map((i) => i.price))}`
                : '-'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Share2 size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Condivisione
            </div>
            <div className="text-xs font-medium text-slate-600">Copia rapida WhatsApp</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col gap-4">
        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cerca corso, costo, durata, requisiti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium shrink-0">
              <ArrowUpDown size={14} />
              <span className="hidden sm:inline">Ordina:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="order">Predefinito (Consigliato)</option>
              <option value="price_asc">Prezzo: Crescente (€ → €€€)</option>
              <option value="price_desc">Prezzo: Decrescente (€€€ → €)</option>
              <option value="title">Nome Corso (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
          {Object.entries(categoriesWithCounts).map(([cat, count]) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`
                  px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5
                  ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }
                `}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium">Caricamento listino prezzi...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <Search size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Nessun corso o tariffa trovata</h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Non ci sono voci che corrispondono ai filtri o al termine di ricerca selezionato.
          </p>
          {(searchQuery || selectedCategory !== 'Tutti') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Tutti');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Azzera filtri
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isCopied = copiedId === item.id;
            const categoryBadgeStyle = getCategoryColor(item.category);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Card Header & Price */}
                <div className="p-5 pb-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${categoryBadgeStyle}`}
                    >
                      {item.category}
                    </span>

                    {/* Action buttons (Instructor/Admin only) */}
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Modifica corso e prezzo"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Elimina dal listino"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">
                    {item.title}
                  </h3>

                  {/* Price Banner */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-3.5 flex items-baseline justify-between shadow-inner">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-slate-300 font-medium">Prezzo:</span>
                      <span className="text-2xl font-black tracking-tight text-white">
                        € {item.price.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {item.priceDetail && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/10 text-blue-200 border border-white/10">
                        {item.priceDetail}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body: Details */}
                <div className="p-5 pt-4 flex-1 flex flex-col gap-3.5 text-xs text-slate-600">
                  {/* Duration */}
                  {item.duration && (
                    <div className="flex items-start gap-2">
                      <Clock size={15} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800">Durata: </span>
                        <span>{item.duration}</span>
                      </div>
                    </div>
                  )}

                  {/* Description / What's Included */}
                  {item.description && (
                    <div className="flex items-start gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-800 mb-0.5">Cosa include:</div>
                        <p className="text-slate-600 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  {item.requirements && (
                    <div className="flex items-start gap-2">
                      <FileText size={15} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800">Requisiti: </span>
                        <span className="text-slate-600">{item.requirements}</span>
                      </div>
                    </div>
                  )}

                  {/* Notes / Payment Terms */}
                  {item.notes && (
                    <div className="flex items-start gap-2">
                      <AlertCircle size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800">Note: </span>
                        <span className="text-slate-600">{item.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Quick Copy for WhatsApp / Email */}
                <div className="px-5 py-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400 truncate">
                    {item.updatedByName && (
                      <span>Aggiornato da: <strong className="text-slate-600 font-semibold">{item.updatedByName}</strong></span>
                    )}
                  </div>

                  <button
                    onClick={() => handleCopyCourseInfo(item)}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0
                      ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                      }
                    `}
                    title="Copia scheda formattata per WhatsApp o Email"
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} />
                        <span>Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-slate-400" />
                        <span>Copia info</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Aggiungi / Modifica Corso */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isSaving && setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Tag size={20} className="text-blue-400" />
                <h3 className="font-bold text-base">
                  {editingItem ? 'Modifica Corso & Prezzo' : 'Aggiungi Nuovo Corso / Prezzo'}
                </h3>
              </div>
              <button
                onClick={() => !isSaving && setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Titolo del Corso / Servizio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Patente Nautica Entro 12 Miglia (Vela + Motore)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Category & Price Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prezzo (€) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      €
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="650"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Price Detail & Duration Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Specifica Tariffa
                  </label>
                  <input
                    type="text"
                    placeholder="Es. a persona, a weekend, all'ora, annuale"
                    value={formData.priceDetail}
                    onChange={(e) => setFormData({ ...formData, priceDetail: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Durata Prevista
                  </label>
                  <input
                    type="text"
                    placeholder="Es. 5 weekend teorici + 4 uscite pratiche"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description / Inclusions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cosa Include / Descrizione Corso
                </label>
                <textarea
                  rows={3}
                  placeholder="Descrivi cosa comprende la quota (materiale didattico, lezioni, uscite in mare, carburante, istruttore...)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Requisiti Richiesti
                </label>
                <input
                  type="text"
                  placeholder="Es. Certificato medico non agonistico, tessera FIV"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Notes & Payment Terms */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Note & Condizioni di Pagamento
                </label>
                <input
                  type="text"
                  placeholder="Es. Acconto 30% all'iscrizione, saldo prima dell'esame"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvataggio...' : editingItem ? 'Salva Modifiche' : 'Crea Corso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
