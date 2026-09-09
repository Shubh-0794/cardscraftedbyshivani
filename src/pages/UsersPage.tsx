import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, UserRole } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { exportUsersToExcel } from '../utils/excelExport';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Shield,
  Lock,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  User as UserIcon,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UsersPage: React.FC = () => {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPER_ADMIN' | 'CUSTOMER'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');
  const [creating, setCreating] = useState(false);

  // Edit User State
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('SUPER_ADMIN');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [updating, setUpdating] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createUser({
        name,
        email,
        whatsapp,
        role
      });
      setShowAddModal(false);
      resetForm();
      await loadUsers();
      triggerToast('New system user registered successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditWhatsapp(user.whatsapp || '');
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setUpdating(true);
    try {
      await api.updateUser(editUser.id, {
        name: editName,
        email: editEmail,
        whatsapp: editWhatsapp,
        role: editRole,
        status: editStatus
      });
      setEditUser(null);
      await loadUsers();
      triggerToast(`User profile for "${editName}" updated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update user details');
    } finally {
      setUpdating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setWhatsapp('');
    setRole('SUPER_ADMIN');
  };

  const toggleUserStatus = async (user: User) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateUserStatus(user.id, nextStatus);
      await loadUsers();
      triggerToast(`User ${user.name} is now ${nextStatus.toLowerCase()}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.whatsapp && u.whatsapp.includes(searchTerm));

    if (!matchesSearch) return false;
    if (roleFilter === 'SUPER_ADMIN') return u.role === 'SUPER_ADMIN';
    if (roleFilter === 'CUSTOMER') return u.role === 'CUSTOMER';
    return true;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 mx-auto mb-3 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
        Loading User Access Directory...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-200 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
            User Roles & Permissions (RBAC)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage system administrator credentials, customer portal accounts, contact info & role-based privileges.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => exportUsersToExcel(filteredUsers.length > 0 ? filteredUsers : users)}
            className="p-2 sm:px-3.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Download Users Directory as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            title="Create System User"
            className="p-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-101"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">+ Create System User</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Users</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{users.length}</p>
        </div>
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">Super Admins</span>
          <p className="text-xl font-black text-purple-700 dark:text-purple-300 mt-0.5">
            {users.filter(u => u.role === 'SUPER_ADMIN').length}
          </p>
        </div>
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Customers</span>
          <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">
            {users.filter(u => u.role === 'CUSTOMER').length}
          </p>
        </div>
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Active Status</span>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {users.filter(u => u.status === 'ACTIVE').length}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search user name, email, WhatsApp, role..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-purple-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'SUPER_ADMIN', 'CUSTOMER'] as const).map(rf => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                roleFilter === rf
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              {rf === 'ALL' ? 'All Roles' : rf === 'SUPER_ADMIN' ? 'Super Admins' : 'Customers'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table & Mobile Cards */}
      <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {/* Mobile View: Responsive Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-200/60 dark:divide-slate-800">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No users found matching your search.
            </div>
          ) : (
            filteredUsers.map(usr => (
              <div key={usr.id} className="p-4 space-y-3 hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 flex items-center justify-center font-bold text-xs text-purple-700 dark:text-purple-300 shrink-0">
                      {usr.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-sm truncate flex items-center gap-1">
                        {usr.name}
                        {currentUser?.id === usr.id && (
                          <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-1 py-0.2 rounded">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {usr.id.slice(0, 8)}</p>
                    </div>
                  </div>

                  <Badge type="role" value={usr.role} />
                </div>

                <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{usr.email}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{usr.whatsapp || 'No WhatsApp'}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border ${
                      usr.status === 'ACTIVE'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${usr.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {usr.status}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(usr)}
                      className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(usr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                          usr.status === 'ACTIVE'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {usr.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table (hidden on mobile, visible on md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">System Role</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(usr => (
                  <tr key={usr.id} className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 flex items-center justify-center font-bold text-xs text-purple-700 dark:text-purple-300 shrink-0">
                          {usr.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            {usr.name}
                            {currentUser?.id === usr.id && (
                              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-1.5 py-0.2 rounded-md">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">ID: {usr.id.slice(0, 12)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {usr.email}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {usr.whatsapp || 'No WhatsApp added'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge type="role" value={usr.role} />
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border ${
                          usr.status === 'ACTIVE'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${usr.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {usr.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {usr.lastLogin ? new Date(usr.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit User Option */}
                        <button
                          onClick={() => handleOpenEdit(usr)}
                          className="px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Edit User Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Activate / Deactivate Toggle for Admin */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => toggleUserStatus(usr)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                              usr.status === 'ACTIVE'
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {usr.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Details Modal */}
      {editUser && (
        <Modal
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
          title={`Edit User Details: ${editUser.name}`}
          subtitle={`Update profile information, contact number, assigned role and account status`}
          maxWidth="lg"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
            {/* Quick Context Card */}
            <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                  {editName ? editName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm">{editName || 'User'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{editEmail}</p>
                </div>
              </div>
              <Badge type="role" value={editRole} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Radhika Apte"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:border-purple-600 focus:outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:border-purple-600 focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Number (with country code)
                </label>
                <input
                  type="text"
                  placeholder="919820011223"
                  value={editWhatsapp}
                  onChange={e => setEditWhatsapp(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:border-purple-600 focus:outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Account Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-hidden"
                >
                  <option value="ACTIVE">ACTIVE (Granted Login Access)</option>
                  <option value="INACTIVE">INACTIVE (Access Suspended)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Role & Permissions <span className="text-rose-500">*</span>
              </label>
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-hidden"
              >
                <option value="SUPER_ADMIN">Super Admin (Full Studio & System Control)</option>
                <option value="CUSTOMER">Customer (Customer Self-Service Portal Access)</option>
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {editRole === 'SUPER_ADMIN'
                  ? 'Super Admins can create and edit orders, manage inventory, audit receipts, customize studio settings, and manage RBAC permissions.'
                  : 'Customers can view active crafting orders, track delivery milestones, review invoices, and submit custom craft requests.'}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save User Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add System Administrator / User"
        subtitle="Provision new account credentials and assign system privileges"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Administrator Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:border-purple-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              required
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:border-purple-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp Number</label>
            <input
              type="text"
              placeholder="919820011223"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:border-purple-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Role *</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-hidden"
            >
              <option value="SUPER_ADMIN">Super Admin (Full System Control)</option>
              <option value="CUSTOMER">Customer (Customer Portal Access)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
            >
              {creating ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
