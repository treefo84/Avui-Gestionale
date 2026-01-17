
import { Activity, Boat, BoatType, MaintenanceRecord, MaintenanceStatus, Role, User } from './types';

export const USERS: User[] = [
  { id: 'u1', name: 'Trifo', username: 'trifo', password: '1234', role: Role.INSTRUCTOR, isAdmin: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Trifo&backgroundColor=b6e3f4', email: 'trifo@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'u2', name: 'Ciccio', username: 'ciccio', password: '1234', role: Role.INSTRUCTOR, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ciccio&backgroundColor=c0aede', email: 'ciccio@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'u3', name: 'Gianlu', username: 'gianlu', password: '1234', role: Role.INSTRUCTOR, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gianlu&backgroundColor=ffdfbf', email: 'gianlu@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'h1', name: 'Francesca', username: 'francesca', password: '1234', role: Role.HELPER, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Francesca&backgroundColor=ffdfbf', email: 'francesca@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'h2', name: 'Mauro', username: 'mauro', password: '1234', role: Role.HELPER, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mauro&backgroundColor=b6e3f4', email: 'mauro@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'h3', name: 'Matteo', username: 'matteo', password: '1234', role: Role.HELPER, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Matteo&backgroundColor=c0aede', email: 'matteo@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'h4', name: 'Gennaro', username: 'gennaro', password: '1234', role: Role.HELPER, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gennaro&backgroundColor=b6e3f4', email: 'gennaro@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'h5', name: 'Emanuele', username: 'emanuele', password: '1234', role: Role.HELPER, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emanuele&backgroundColor=ffdfbf', email: 'emanuele@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'h6', name: 'Luca', username: 'luca', password: '1234', role: Role.HELPER, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luca&backgroundColor=c0aede', email: 'luca@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'h7', name: 'Riccardo', username: 'riccardo', password: '1234', role: Role.HELPER, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riccardo&backgroundColor=ffdfbf', email: 'riccardo@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'h8', name: 'Salvatore', username: 'salvatore', password: '1234', role: Role.HELPER, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Salvatore&backgroundColor=b6e3f4', email: 'salvatore@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
  { id: 'h9', name: 'Roberto', username: 'roberto', password: '1234', role: Role.HELPER, isAdmin: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto&backgroundColor=c0aede', email: 'roberto@sailsync.it', mustChangePassword: true, googleCalendarConnected: false },
];

export const BOATS: Boat[] = [
  { id: 'b1', name: 'Trilly', type: BoatType.SAILING, image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&q=80&w=400&h=200' },
  { id: 'b2', name: 'Tucanò', type: BoatType.SAILING, image: 'https://images.unsplash.com/photo-1563116544-79354964648c?auto=format&fit=crop&q=80&w=400&h=200' },
  { id: 'b3', name: 'Tukè', type: BoatType.POWER, image: 'https://images.unsplash.com/photo-1564750130838-662867827829?auto=format&fit=crop&q=80&w=400&h=200' },
];

export const ACTIVITIES: Activity[] = [
  { id: 'a1', name: 'Avviamento alla vela', allowedBoatTypes: [BoatType.SAILING], defaultDurationDays: 2 },
  { id: 'a2', name: 'Modulo 1', allowedBoatTypes: [BoatType.SAILING], defaultDurationDays: 2 },
  { id: 'a3', name: 'Modulo 2', allowedBoatTypes: [BoatType.SAILING], defaultDurationDays: 2 },
  { id: 'a4', name: 'Ormeggio', allowedBoatTypes: [BoatType.SAILING, BoatType.POWER], defaultDurationDays: 1 },
  { id: 'a5', name: 'Avanzato', allowedBoatTypes: [BoatType.SAILING], defaultDurationDays: 2 },
  { id: 'a6', name: 'Crociera', allowedBoatTypes: [BoatType.SAILING], defaultDurationDays: 2 },
  { id: 'a7', name: 'Estate', allowedBoatTypes: [BoatType.SAILING, BoatType.POWER], defaultDurationDays: 1 },
  { id: 'a8', name: 'Esame', allowedBoatTypes: [BoatType.SAILING], defaultDurationDays: 2 },
  { id: 'a9', name: 'Team Building', allowedBoatTypes: [BoatType.SAILING, BoatType.POWER], defaultDurationDays: 1 },
  { id: 'g1', name: 'Cena Equipaggio', allowedBoatTypes: [], defaultDurationDays: 1, isGeneral: true },
  { id: 'g2', name: 'Party Fine Corso', allowedBoatTypes: [], defaultDurationDays: 1, isGeneral: true },
];

export const MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  { id: 'm1', boatId: 'b1', description: 'Cambio Olio Motore', status: MaintenanceStatus.DONE, date: '2023-11-15', recurrenceInterval: 1, recurrenceUnit: 'years' },
  { id: 'm2', boatId: 'b1', description: 'Scadenza Zattera', status: MaintenanceStatus.TODO, date: '2024-05-20', expirationDate: '2024-06-01', recurrenceInterval: 2, recurrenceUnit: 'years' },
  { id: 'm3', boatId: 'b2', description: 'Pulizia Carena', status: MaintenanceStatus.TODO, date: '2024-04-10', recurrenceInterval: 6, recurrenceUnit: 'months' },
];
