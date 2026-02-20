import React from "react";
import { Activity, Assignment, Availability, Boat, CalendarEvent, DayNote, GeneralEvent, MaintenanceRecord, User } from "../types";
import { DayModal } from "./DayModal";
import { ProfilePage } from "./ProfilePage";
import { UserManagementModal } from "./UserManagementModal";
import { FleetManagementPage } from "./FleetManagementPage";

type Props = {
  // --- DayModal ---
  selectedDate: string | null;
  setSelectedDate: (v: string | null) => void;

  currentUser: User | null;

  users: User[];
  boats: Boat[];
  activities: Activity[];
  availabilities: Availability[];
  assignments: Assignment[];
  generalEvents: GeneralEvent[];
  dayNotes: DayNote[];
  selectedCalendarEvents: CalendarEvent[];

  onUpdateAvailability: (a: Availability) => Promise<void> | void;
  onUpdateAssignment: (a: Assignment) => Promise<void> | void;
  onDeleteAssignment: (id: string) => Promise<void> | void;

  onCreateGeneralEvent: (
    date: string,
    activityId: string,
    startTime?: string,
    endTime?: string,
    notes?: string
  ) => Promise<void> | void;

  onUpdateGeneralEvent: (e: GeneralEvent) => void;
  onDeleteGeneralEvent: (id: string) => void;

  onAddDayNote: (date: string, text: string) => Promise<void> | void;
  onDeleteDayNote: (id: string) => Promise<void> | void;

  // --- UserManagement ---
  isUserManagementOpen: boolean;
  setIsUserManagementOpen: (v: boolean) => void;
  currentUserId: string | null;

  onAddUser: (
    name: string,
    role: any,
    email: string,
    isAdmin: boolean,
    phoneNumber: string,
    birthDate: string,
    password: string
  ) => Promise<void> | void;

  onRemoveUser: (id: string) => void;
  onToggleRole: (id: string) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void> | void;

  // --- FleetManagement ---
  isFleetManagementOpen: boolean;
  setIsFleetManagementOpen: (v: boolean) => void;
  maintenanceRecords: MaintenanceRecord[];
  onUpdateBoats: (b: Boat[]) => void;
  onUpdateActivities: (a: Activity[]) => void;
  onUpdateMaintenance: (m: MaintenanceRecord[]) => void;

  // --- Profile ---
  isProfileOpen: boolean;
  setIsProfileOpen: (v: boolean) => void;
  onUpdateProfile: (field: keyof User, value: any) => Promise<void> | void;
};

export const ModalsLayer: React.FC<Props> = React.memo(function ModalsLayer(props) {
  const {
    selectedDate,
    setSelectedDate,
    currentUser,
    users,
    boats,
    activities,
    availabilities,
    assignments,
    generalEvents,
    dayNotes,
    selectedCalendarEvents,
    onUpdateAvailability,
    onUpdateAssignment,
    onDeleteAssignment,
    onCreateGeneralEvent,
    onUpdateGeneralEvent,
    onDeleteGeneralEvent,
    onAddDayNote,
    onDeleteDayNote,

    isUserManagementOpen,
    setIsUserManagementOpen,
    currentUserId,
    onAddUser,
    onRemoveUser,
    onToggleRole,
    onUpdateUser,

    isFleetManagementOpen,
    setIsFleetManagementOpen,
    maintenanceRecords,
    onUpdateBoats,
    onUpdateActivities,
    onUpdateMaintenance,

    isProfileOpen,
    setIsProfileOpen,
    onUpdateProfile,
  } = props;

  return (
    <>
      {selectedDate && currentUser && (
        <DayModal
          date={selectedDate}
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          currentUser={currentUser}
          users={users}
          boats={boats}
          activities={activities}
          availabilities={availabilities}
          assignments={assignments}
          generalEvents={generalEvents}
          dayNotes={dayNotes}
          onUpdateAvailability={onUpdateAvailability}
          onUpdateAssignment={onUpdateAssignment}
          onDeleteAssignment={onDeleteAssignment}
          onCreateGeneralEvent={onCreateGeneralEvent}
          onUpdateGeneralEvent={onUpdateGeneralEvent}
          onDeleteGeneralEvent={onDeleteGeneralEvent}
          onAddDayNote={onAddDayNote}
          onDeleteDayNote={onDeleteDayNote}
          calendarEvents={selectedCalendarEvents}
        />
      )}

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        users={users}
        currentUserId={currentUserId}
        onAddUser={onAddUser as any}
        onRemoveUser={onRemoveUser}
        onToggleRole={onToggleRole}
        onUpdateUser={onUpdateUser as any}
      />

      <FleetManagementPage
        isOpen={isFleetManagementOpen}
        onClose={() => setIsFleetManagementOpen(false)}
        boats={boats}
        activities={activities}
        maintenanceRecords={maintenanceRecords}
        onUpdateBoats={onUpdateBoats}
        onUpdateActivities={onUpdateActivities}
        onUpdateMaintenance={onUpdateMaintenance}
      />

      {isProfileOpen && currentUser && (
        <ProfilePage
          user={currentUser}
          users={users}
          assignments={assignments}
          boats={boats}
          activities={activities}
          onClose={() => setIsProfileOpen(false)}
          onUpdateUser={onUpdateProfile as any}
        />
      )}
    </>
  );
});
