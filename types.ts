
export enum Role {
  INSTRUCTOR = 'INSTRUCTOR',
  HELPER = 'HELPER',
  MANAGER = 'MANAGER',
  RESERVE = 'RESERVE'
}

export enum BoatType {
  SAILING = 'SAILING',
  POWER = 'POWER'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string; // In a real app, this would be hashed/handled securely
  role: Role;
  isAdmin: boolean;
  avatar: string;
  email?: string;
  phoneNumber?: string;
  birthDate?: string; // YYYY-MM-DD
  mustChangePassword?: boolean;
  googleCalendarConnected?: boolean;
}

export interface Boat {
  id: string;
  name: string;
  type: BoatType;
  image: string;
}

export interface Activity {
  id: string;
  name: string;
  allowedBoatTypes: BoatType[];
  defaultDurationDays: number;
  isGeneral?: boolean; // New: For activities like Dinner, Party, etc.
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  UNKNOWN = 'UNKNOWN'
}

export interface Availability {
  userId: string;
  date: string; // ISO date string YYYY-MM-DD
  status: AvailabilityStatus;
}

export enum AssignmentStatus {
  CONFIRMED = 'CONFIRMED', // The assignment event itself is valid
  CANCELLED = 'CANCELLED'  // The assignment event is cancelled
}

export enum ConfirmationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED'
}

export interface Assignment {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  boatId: string;
  instructorId: string | null;
  helperId: string | null;
  activityId: string | null;
  durationDays: number;
  status?: AssignmentStatus; // Global status of the event
  instructorStatus?: ConfirmationStatus; // Individual confirmation
  helperStatus?: ConfirmationStatus; // Individual confirmation
  notes?: string;
}

export interface GeneralEvent {
  id: string;
  date: string;
  activityId: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  responses: { userId: string; status: ConfirmationStatus }[];
}

export interface DayNote {
  id: string;
  date: string;
  userId: string;
  text: string;
  createdAt: number;
}

export enum NotificationType {
  ASSIGNMENT_REQUEST = 'ASSIGNMENT_REQUEST',
  EVENT_INVITE = 'EVENT_INVITE',
  REMINDER = 'REMINDER',
  INFO = 'INFO'
}

export interface UserNotification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  data?: {
    assignmentId?: string;
    eventId?: string;
    role?: Role;
    date?: string;
  };
  createdAt: number;
}

export enum MaintenanceStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export type RecurrenceUnit = 'days' | 'months' | 'years';

export interface MaintenanceRecord {
  id: string;
  boatId: string;
  description: string;
  status: MaintenanceStatus;
  date: string; // Creation date or Date done
  expirationDate?: string; // Optional expiration
  recurrenceInterval?: number; // e.g., 3
  recurrenceUnit?: RecurrenceUnit; // e.g., 'years'
  notes?: string;
}

export interface AppState {
  currentUser: User;
  availabilities: Availability[];
  assignments: Assignment[];
  generalEvents: GeneralEvent[];
  dayNotes: DayNote[];
  maintenanceRecords: MaintenanceRecord[];
}
