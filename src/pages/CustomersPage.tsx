import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Customer, Order, Payment } from '../types';
import { WhatsAppBtn } from '../components/common/WhatsAppBtn';
import { EmailBtn } from '../components/common/EmailBtn';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { exportCustomersToExcel } from '../utils/excelExport';
import {
  UserPlus,
  Search,
  Users,
  Eye,
  ShoppingBag,
  CreditCard,
  MapPin,
  MessageSquare,
  Mail,
  X,
  Sparkles,
  PlusCircle,
  FileText,
  Pencil,
  CheckCircle2,
  Phone,
  FileSpreadsheet
} from 'lucide-react';

interface CustomersPageProps {
  onOpenCreateOrderForCustomer?: (customer: Customer) => void;
  openEnrollModalInitially?: boolean;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  onOpenCreateOrderForCustomer,
  openEnrollModalInitially = false
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'HIGH_VALUE'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Enroll Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(openEnrollModalInitially);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollWhatsapp, setEnrollWhatsapp] = useState('');
  const [enrollAltPhone, setEnrollAltPhone] = useState('');
  const [enrollAddress, setEnrollAddress] = useState('');
  const [enrollCity, setEnrollCity] = useState('Mumbai');
  const [enrollState, setEnrollState] = useState('Maharashtra');
  const [enrollPincode, setEnrollPincode] = useState('400001');
  const [enrollNotes, setEnrollNotes] = useState('');
  const [enrollCreateAccount, setEnrollCreateAccount] = useState(true);
  const [enrollRole, setEnrollRole] = useState<'CUSTOMER' | 'SUPER_ADMIN'>('CUSTOMER');
  const [enrolling, setEnrolling] = useState(false);
  const [createdCustomerResult, setCreatedCustomerResult] = useState<Customer | null>(null);

  // Selected Customer Details Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<(Customer & { orders?: Order[]; payments?: Payment[] }) | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'payments' | 'address' | 'notes'>('overview');

  // Edit Customer Modal State
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editAltPhone, setEditAltPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [updating, setUpdating] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrolling(true);
    try {
      const created = await api.createCustomer({
        name: enrollName,
        email: enrollEmail,
        whatsapp: enrollWhatsapp,
        alternatePhone: enrollAltPhone,
        address: enrollAddress,
        city: enrollCity,
        state: enrollState,
        pincode: enrollPincode,
        notes: enrollNotes,
        createAccount: enrollCreateAccount,
        role: enrollRole
      });

      setCreatedCustomerResult(created);
      setShowEnrollModal(false);
      resetEnrollForm();
      await loadCustomers();
      triggerToast(`Customer ${created.name} registered successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to enroll customer');
    } finally {
      setEnrolling(false);
    }
  };

  const resetEnrollForm = () => {
    setEnrollName('');
    setEnrollEmail('');
    setEnrollWhatsapp('');
    setEnrollAltPhone('');
    setEnrollAddress('');
    setEnrollCity('Mumbai');
    setEnrollState('Maharashtra');
    setEnrollPincode('400001');
    setEnrollNotes('');
    setEnrollCreateAccount(true);
    setEnrollRole('CUSTOMER');
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditCustomer(cust);
    setEditName(cust.name);
    setEditEmail(cust.email);
    setEditWhatsapp(cust.whatsapp);
    setEditAltPhone(cust.alternatePhone || '');
    setEditAddress(cust.address || '');
    setEditCity(cust.city || 'Mumbai');
    setEditState(cust.state || 'Maharashtra');
    setEditPincode(cust.pincode || '400001');
    setEditNotes(cust.notes || '');
    setEditStatus(cust.status);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setUpdating(true);
    try {
      const updated = await api.updateCustomer(editCustomer.id, {
        name: editName,
        email: editEmail,
        whatsapp: editWhatsapp,
        alternatePhone: editAltPhone,
        address: editAddress,
        city: editCity,
        state: editState,
        pincode: editPincode,
        notes: editNotes,
        status: editStatus
      });

      setEditCustomer(null);
      await loadCustomers();

      // If this customer is currently being viewed, update the active details view
      if (selectedCustomer && (selectedCustomer.id === editCustomer.id || selectedCustomer.customerCode === editCustomer.customerCode)) {
        const fresh = await api.getCustomerById(editCustomer.id);
        setSelectedCustomer(fresh);
      }

      triggerToast(`Customer details for ${editName} updated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update customer details');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewCustomer = async (cust: Customer) => {
    try {
      const detailed = await api.getCustomerById(cust.id);
      setSelectedCustomer(detailed);
      setActiveTab('overview');
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.whatsapp.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return c.status === 'ACTIVE';
    if (statusFilter === 'INACTIVE') return c.status === 'INACTIVE';
    if (statusFilter === 'HIGH_VALUE') return c.totalSpent >= 5000;

    return true;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 mx-auto mb-3 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
        Loading Customer Directory...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Header Title & Enroll Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
              <Users className="w-5 h-5" />
            </div>
            Customer Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Directly enroll customers, edit profile details, auto-create credentials & track order histories.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => exportCustomersToExcel(filteredCustomers.length > 0 ? filteredCustomers : customers)}
            className="p-2 sm:px-3.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Download Customer Directory as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={() => {
              setCreatedCustomerResult(null);
              setShowEnrollModal(true);
            }}
            title="Direct Enroll Customer"
            className="p-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-101"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">+ Direct Enroll Customer</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Customers</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{customers.length}</p>
        </div>
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Active Clients</span>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {customers.filter(c => c.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">VIP / High-Value</span>
          <p className="text-xl font-black text-purple-700 dark:text-purple-300 mt-0.5">
            {customers.filter(c => c.totalSpent >= 5000).length}
          </p>
        </div>
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Lifetime Orders</span>
          <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">
            {customers.reduce((acc, c) => acc + (c.totalOrders || 0), 0)}
          </p>
        </div>
      </div>

      {/* Direct Enrollment Success Banner */}
      {createdCustomerResult && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 relative animate-in fade-in">
          <button
            onClick={() => setCreatedCustomerResult(null)}
            className="absolute top-3 right-3 p-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
              ✓
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">Customer Enrolled Successfully!</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                <strong>ID:</strong> {createdCustomerResult.customerCode} | <strong>Name:</strong> {createdCustomerResult.name} | <strong>WhatsApp:</strong> {createdCustomerResult.whatsapp}
              </p>
              <div className="flex items-center gap-2 mt-3">
                {onOpenCreateOrderForCustomer && (
                  <button
                    onClick={() => onOpenCreateOrderForCustomer(createdCustomerResult)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Create Order Now
                  </button>
                )}
                <WhatsAppBtn
                  phone={createdCustomerResult.whatsapp}
                  customMessage={`Hello ${createdCustomerResult.name}, welcome to Cards Crafted! Your Customer ID is ${createdCustomerResult.customerCode}.`}
                >
                  Send Welcome WhatsApp
                </WhatsAppBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, Code, WhatsApp, email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-purple-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE', 'HIGH_VALUE'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === f
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              {f === 'ALL' ? 'All Customers' : f === 'HIGH_VALUE' ? 'High Value (₹5k+)' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table & Mobile Cards */}
      <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {/* Mobile View (< md) */}
        <div className="md:hidden divide-y divide-slate-200/60 dark:divide-slate-800">
          {filteredCustomers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No customers found matching filter.
            </div>
          ) : (
            filteredCustomers.map(cust => (
              <div key={cust.id} className="p-4 space-y-3 hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-purple-700 dark:text-purple-300">
                      {cust.customerCode}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase border ${
                        cust.status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cust.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {cust.status}
                    </span>
                  </div>

                  <span className="font-black text-xs text-purple-700 dark:text-purple-400">
                    Spent: ₹{(cust.totalSpent || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{cust.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{cust.city}, {cust.state}</p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {cust.whatsapp}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Orders</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm">{cust.totalOrders}</span>
                  </div>
                </div>

                {/* Mobile Actions Grid */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-4 gap-1.5">
                  <div className="col-span-1 flex items-center justify-center">
                    <WhatsAppBtn phone={cust.whatsapp} customerName={cust.name} />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cust)}
                    className="py-2 px-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewCustomer(cust)}
                    className="py-2 px-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Profile</span>
                  </button>

                  {onOpenCreateOrderForCustomer && (
                    <button
                      type="button"
                      onClick={() => onOpenCreateOrderForCustomer(cust)}
                      className="py-2 px-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Order</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4">Customer ID</th>
                <th className="py-3.5 px-4">Name & Region</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Orders</th>
                <th className="py-3.5 px-4">Total Spent</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    No customers found matching filter.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{cust.customerCode}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{cust.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{cust.city}, {cust.state}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {cust.whatsapp}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {cust.email}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{cust.totalOrders}</td>
                    <td className="py-3.5 px-4 font-black text-purple-700 dark:text-purple-400">₹{(cust.totalSpent || 0).toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border ${
                          cust.status === 'ACTIVE'
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cust.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {cust.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <WhatsAppBtn phone={cust.whatsapp} customerName={cust.name} />

                        {/* Edit Customer Button */}
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                          title="Edit Customer Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleViewCustomer(cust)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Profile
                        </button>

                        {onOpenCreateOrderForCustomer && (
                          <button
                            onClick={() => onOpenCreateOrderForCustomer(cust)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer shadow-xs"
                          >
                            + Order
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

      {/* Edit Customer Details Modal */}
      {editCustomer && (
        <Modal
          isOpen={!!editCustomer}
          onClose={() => setEditCustomer(null)}
          title={`Edit Customer Details: ${editCustomer.name}`}
          subtitle={`Customer ID: ${editCustomer.customerCode} | Update personal information, addresses & notes`}
          maxWidth="2xl"
        >
          <form onSubmit={handleUpdateCustomer} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName || ''}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail || ''}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editWhatsapp || ''}
                  onChange={e => setEditWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alternate Phone</label>
                <input
                  type="text"
                  placeholder="Optional backup"
                  value={editAltPhone || ''}
                  onChange={e => setEditAltPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Status</label>
                <select
                  value={editStatus || 'ACTIVE'}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-hidden"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Delivery / Street Address</label>
              <textarea
                rows={2}
                value={editAddress || ''}
                onChange={e => setEditAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-hidden text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={editCity || ''}
                  onChange={e => setEditCity(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  value={editState || ''}
                  onChange={e => setEditState(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
                <input
                  type="text"
                  value={editPincode || ''}
                  onChange={e => setEditPincode(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Internal Admin Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. VIP client, prefers gold calligraphy..."
                value={editNotes || ''}
                onChange={e => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden text-xs"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditCustomer(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Customer Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Enroll Customer Modal */}
      <Modal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title="Admin Direct Customer Enrollment"
        subtitle="Register customer details and automatically provision access credentials"
        maxWidth="2xl"
      >
        <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Radhika Apte"
                value={enrollName || ''}
                onChange={e => setEnrollName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="radhika@example.com"
                value={enrollEmail || ''}
                onChange={e => setEnrollEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp Number *</label>
              <input
                type="text"
                required
                placeholder="919820011223"
                value={enrollWhatsapp || ''}
                onChange={e => setEnrollWhatsapp(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alternate Phone</label>
              <input
                type="text"
                placeholder="919820099887 (Optional)"
                value={enrollAltPhone || ''}
                onChange={e => setEnrollAltPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shipping / Delivery Address</label>
            <textarea
              rows={2}
              placeholder="Flat / House No, Street, Landmark..."
              value={enrollAddress || ''}
              onChange={e => setEnrollAddress(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={enrollCity || ''}
                onChange={e => setEnrollCity(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">State</label>
              <input
                type="text"
                value={enrollState || ''}
                onChange={e => setEnrollState(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
              <input
                type="text"
                value={enrollPincode || ''}
                onChange={e => setEnrollPincode(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Internal Admin Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. VIP client, prefers gold foil finish..."
              value={enrollNotes || ''}
              onChange={e => setEnrollNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden text-xs"
            />
          </div>

          {/* Account Credentials Setup */}
          <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-purple-900 dark:text-purple-200">Provision User Login Account</p>
                <p className="text-[11px] text-purple-700 dark:text-purple-400">Auto-creates credentials for login to customer portal</p>
              </div>
              <input
                type="checkbox"
                checked={enrollCreateAccount}
                onChange={e => setEnrollCreateAccount(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded-md"
              />
            </div>

            {enrollCreateAccount && (
              <div>
                <label className="block font-bold text-purple-900 dark:text-purple-200 mb-1">Assigned System Role</label>
                <select
                  value={enrollRole || 'CUSTOMER'}
                  onChange={e => setEnrollRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                >
                  <option value="CUSTOMER">Customer (Default Customer Portal Access)</option>
                  <option value="SUPER_ADMIN">Super Admin (System Management)</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowEnrollModal(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={enrolling}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
            >
              {enrolling ? 'Enrolling...' : 'Enroll Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detailed Customer Profile Drawer / Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Customer Profile: ${selectedCustomer.name}`}
          subtitle={`Code: ${selectedCustomer.customerCode} | Status: ${selectedCustomer.status}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* Customer Header Stats with Edit Option */}
            <div className="bg-slate-50/90 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 w-full">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Orders</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{selectedCustomer.totalOrders}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Spent</span>
                  <p className="text-xl font-black text-purple-700 dark:text-purple-400">₹{(selectedCustomer.totalSpent || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedCustomer.whatsapp}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedCustomer.email}</p>
                </div>
              </div>

              {/* Edit Details Action inside Profile */}
              <button
                onClick={() => handleOpenEdit(selectedCustomer)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            </div>

            {/* Profile Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold gap-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'overview' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'orders' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500'
                }`}
              >
                Orders ({selectedCustomer.orders?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'payments' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500'
                }`}
              >
                Payments ({selectedCustomer.payments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('address')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'address' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500'
                }`}
              >
                Address & Notes
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Enrolled On:</strong> {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                </p>
                {selectedCustomer.lastOrderDate && (
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Last Order Date:</strong> {new Date(selectedCustomer.lastOrderDate).toLocaleDateString()}
                  </p>
                )}
                {selectedCustomer.notes && (
                  <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-900 dark:text-amber-200">
                    <strong>Admin Notes:</strong> {selectedCustomer.notes}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {selectedCustomer.orders?.length === 0 ? (
                  <p className="text-slate-400 text-xs py-4 text-center">No orders recorded yet for this customer.</p>
                ) : (
                  selectedCustomer.orders?.map(ord => (
                    <div key={ord.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">#{ord.orderNumber} - {ord.items[0]?.productName}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px]">{new Date(ord.orderDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge type="orderStatus" value={ord.status} />
                        <span className="font-bold text-slate-900 dark:text-white">₹{(ord.grandTotal || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {selectedCustomer.payments?.length === 0 ? (
                  <p className="text-slate-400 text-xs py-4 text-center">No payments logged yet.</p>
                ) : (
                  selectedCustomer.payments?.map(pay => (
                    <div key={pay.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{pay.paymentCode} - {pay.method}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                          {new Date(pay.paymentDate).toLocaleDateString()} | Ref: {pay.transactionReference || 'N/A'}
                        </p>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{(pay.amount || 0).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'address' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <p className="font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</p>
                <p className="text-slate-600 dark:text-slate-300">{selectedCustomer.address || 'No street address specified.'}</p>
                <p className="text-slate-600 dark:text-slate-300">{selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
