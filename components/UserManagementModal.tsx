import React, { useMemo, useState } from "react";
import { Role, User } from "../types";
import {
  X,
  UserPlus,
  Trash2,
  Shield,
  LifeBuoy,
  Pencil,
  Save,
  ChevronLeft,
  RefreshCw,
  KeyRound,
  Mail,
  Briefcase,
  UserCog,
  Phone,
  Cake,
} from "lucide-react";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUserId: string;

  // ✅ aggiunta password per il NUOVO utente
  onAddUser: (
    name: string,
    role: Role,
    email: string,
    isAdmin: boolean,
    phoneNumber: string,
    birthDate: string,
    password: string
  ) => void;

  onRemoveUser: (userId: string) => void;
  onToggleRole: (userId: string) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
}

const AVATAR_SEEDS = [
  "Trifo",
  "Ciccio",
  "Gianlu",
  "Francesca",
  "Mauro",
  "Matteo",
  "Gennaro",
  "Emanuele",
  "Luca",
  "Riccardo",
  "Salvatore",
  "Roberto",
  "Felix",
  "Boots",
  "Cuddles",
  "Snuggles",
  "Bella",
  "Luna",
  "Charlie",
  "Max",
  "Sailor",
  "Captain",
  "Pirate",
  "Mate",
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId,
  onAddUser,
  onRemoveUser,
  onToggleRole,
  onUpdateUser,
}) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // =========================
  // NEW USER STATE
  // =========================
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newRole, setNewRole] = useState<Role>(Role.HELPER);
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newUserPassword, setNewUserPassword] = useState("");

  // =========================
  // EDITING STATE
  // =========================
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editRole, setEditRole] = useState<Role>(Role.HELPER);
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  // reset password (edit mode)
  const [editNewPassword, setEditNewPassword] = useState("");
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  const sortedUsers = useMemo(() => {
    const roleOrder = {
      [Role.MANAGER]: 0,
      [Role.INSTRUCTOR]: 1,
      [Role.HELPER]: 2,
      [Role.RESERVE]: 3,
    } as const;

    return [...users].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  }, [users]);

  if (!isOpen) return null;

  const resetNewUserForm = () => {
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewBirthDate("");
    setNewRole(Role.HELPER);
    setNewIsAdmin(false);
    setNewUserPassword("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();
    const pwd = newUserPassword.trim();

    if (!name) return;
    if (!email) return;
    if (!pwd) return;

    onAddUser(name, newRole, email, newIsAdmin, newPhone, newBirthDate, pwd);
    resetNewUserForm();
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditName(user.name ?? "");
    setEditEmail(user.email ?? "");
    setEditPhone(user.phoneNumber ?? "");
    setEditBirthDate(user.birthDate ?? "");
    setEditRole(user.role ?? Role.HELPER);
    setEditIsAdmin(!!user.isAdmin);

    setEditNewPassword("");
    setForcePasswordChange(false);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updates: Partial<User> = {
      name: editName,
      email: editEmail,
      phoneNumber: editPhone,
      birthDate: editBirthDate,
      role: editRole,
      isAdmin: editIsAdmin,
    };

    if (editNewPassword.trim().length > 0) {
      updates.password = editNewPassword.trim();
      updates.mustChangePassword = forcePasswordChange;
    }

    onUpdateUser(editingUser.id, updates);
    setEditingUser(null);
  };

  const handleAvatarUpdate = (seed: string) => {
    if (!editingUser) return;

    const bg = ["b6e3f4", "c0aede", "ffdfbf"][Math.floor(Math.random() * 3)];
    const newAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${bg}`;

    onUpdateUser(editingUser.id, { avatar: newAvatarUrl });
    setEditingUser({ ...editingUser, avatar: newAvatarUrl });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            {editingUser && (
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {editingUser ? `Modifica ${editingUser.name}` : "Gestisci la Ciurma"}
              </h2>
              <p className="text-sm text-slate-500">Area Riservata Ammiragliato</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {editingUser ? (
            // =========================
            // EDIT MODE
            // =========================
            <div className="space-y-6 animate-in slide-in-from-right duration-200">
              {/* Avatar */}
              <div className="flex flex-col items-center justify-center mb-6">
                <img
                  src={editingUser.avatar}
                  className="w-24 h-24 rounded-full border-4 border-slate-100 mb-4 bg-slate-50"
                  alt="avatar"
                />
                <div className="flex gap-2 max-w-full overflow-x-auto p-2">
                  {AVATAR_SEEDS.slice(0, 8).map((seed) => (
                    <button
                      key={seed}
                      onClick={() => handleAvatarUpdate(seed)}
                      className="w-8 h-8 rounded-full border border-slate-200 hover:scale-110 transition-transform overflow-hidden"
                      type="button"
                    >
                      <img
                        alt={seed}
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${
                          ["b6e3f4", "c0aede", "ffdfbf"][Math.floor(Math.random() * 3)]
                        }`}
                      />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAvatarUpdate(Math.random().toString())}
                    className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-500"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Clicca per cambiare faccia</p>
              </div>

              <form onSubmit={handleEditSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefono</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data di Nascita</label>
                    <div className="relative">
                      <Cake size={16} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="date"
                        value={editBirthDate}
                        onChange={(e) => setEditBirthDate(e.target.value)}
                        style={{ colorScheme: "light" }}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grado</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as Role)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    >
                      <option value={Role.HELPER}>Mozzo</option>
                      <option value={Role.INSTRUCTOR}>Comandante</option>
                      <option value={Role.MANAGER}>Manager</option>
                      <option value={Role.RESERVE}>Riserva (In Prova)</option>
                    </select>
                  </div>

                  <div className="flex items-center mt-6">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={editIsAdmin}
                        onChange={(e) => setEditIsAdmin(e.target.checked)}
                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 bg-white"
                      />
                      Utente Admin
                    </label>
                  </div>
                </div>

                {/* Reset password (edit mode) */}
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mt-6">
                  <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <KeyRound size={16} /> Reset Password
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nuova Password (lascia vuoto per non cambiare)"
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-900"
                    />
                    <label className="flex items-center gap-2 text-xs font-bold text-amber-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forcePasswordChange}
                        onChange={(e) => setForcePasswordChange(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      Forza cambio password al prossimo login
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Salva Modifiche
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // =========================
            // LIST MODE
            // =========================
            <>
              {/* Add New User */}
              <section className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserPlus size={16} /> Arruola Nuovo Marinaio
                </h3>

                <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-blue-600 mb-1">Nome</label>
                    <input
                      type="text"
                      required
                      placeholder="Jack"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-blue-600 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="jack@sailsync.it"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-blue-600 mb-1">Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Es: Test1234!"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-blue-600 mb-1">Telefono</label>
                    <input
                      type="tel"
                      placeholder="+39 333..."
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-blue-600 mb-1">Data Nascita</label>
                    <input
                      type="date"
                      value={newBirthDate}
                      onChange={(e) => setNewBirthDate(e.target.value)}
                      style={{ colorScheme: "light" }}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-blue-600 mb-1">Grado</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as Role)}
                      className="w-full text-sm px-2 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    >
                      <option value={Role.HELPER}>Mozzo</option>
                      <option value={Role.INSTRUCTOR}>Comandante</option>
                      <option value={Role.MANAGER}>Manager</option>
                      <option value={Role.RESERVE}>Riserva</option>
                    </select>
                  </div>

                  <div className="md:col-span-4 flex items-center mb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-800 font-medium">
                      <input
                        type="checkbox"
                        checked={newIsAdmin}
                        onChange={(e) => setNewIsAdmin(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      Admin
                    </label>
                  </div>

                  <div className="md:col-span-12 mt-2">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Arruola
                    </button>
                  </div>
                </form>
              </section>

              {/* User List */}
              <section>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Libro Mastro dell&apos;Equipaggio
                </h3>

                <div className="space-y-2">
                  {sortedUsers.map((user) => {
                    let roleBadge = "bg-emerald-100 text-emerald-700";
                    let RoleIcon: any = LifeBuoy;
                    let roleName = "Mozzo";

                    if (user.role === Role.INSTRUCTOR) {
                      roleBadge = "bg-violet-100 text-violet-700";
                      RoleIcon = Shield;
                      roleName = "Comandante";
                    } else if (user.role === Role.MANAGER) {
                      roleBadge = "bg-amber-100 text-amber-700";
                      RoleIcon = Briefcase;
                      roleName = "Manager";
                    } else if (user.role === Role.RESERVE) {
                      roleBadge = "bg-slate-100 text-slate-600 border border-slate-200";
                      RoleIcon = UserCog;
                      roleName = "Riserva";
                    }

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow group"
                      >
                        {/* User Info */}
                        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleEditClick(user)}>
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className={`w-10 h-10 rounded-full border border-slate-200 ${
                              user.role === Role.RESERVE ? "grayscale opacity-70" : ""
                            }`}
                          />
                          <div>
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                              {user.name}
                              {user.isAdmin && (
                                <span className="bg-slate-800 text-white text-[10px] px-1.5 rounded border border-slate-700">
                                  ADMIN
                                </span>
                              )}
                              {user.id === currentUserId && <span className="text-xs text-blue-500">(Tu)</span>}
                            </h4>

                            <div className="flex flex-col">
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">{user.username}</p>
                              <div className="flex gap-2">
                                {user.email && (
                                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                                    <Mail size={8} /> {user.email}
                                  </p>
                                )}
                                {user.phoneNumber && (
                                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                                    <Phone size={8} /> {user.phoneNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${roleBadge}`}>
                            <RoleIcon size={12} />
                            {roleName}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleEditClick(user)}
                            className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 transition-colors"
                            title="Modifica Completa"
                          >
                            <Pencil size={18} />
                          </button>

                          {user.id !== currentUserId && (
                            <button
                              type="button"
                              onClick={() => onRemoveUser(user.id)}
                              className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                              title="Butta a mare"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
