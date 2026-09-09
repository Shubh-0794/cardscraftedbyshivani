import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Payment } from '../types';
import { Badge } from '../components/common/Badge';
import { exportPaymentsToExcel } from '../utils/excelExport';
import { CreditCard, Search, IndianRupee, ArrowDownRight, FileSpreadsheet } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadPayments() {
      try {
        const data = await api.getPayments();
        setPayments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, []);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = payments.filter(p =>
    p.paymentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.transactionReference && p.transactionReference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="p-8 text-center text-xs font-semibold text-slate-500">Loading Payments Ledger...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Payment History & Receipts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Audit transactions, payment methods & reference receipts.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => exportPaymentsToExcel(filteredPayments.length > 0 ? filteredPayments : payments)}
            className="p-2 sm:px-3.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Download Payments Ledger as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs text-right transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Collected</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹{(totalCollected || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search payment ID, Order #, customer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-purple-600"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase">
                <th className="py-3 px-4">Payment ID</th>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference ID</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayments.map(pay => (
                <tr key={pay.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{pay.paymentCode}</td>
                  <td className="py-3.5 px-4 font-bold text-purple-700 dark:text-purple-400">{pay.orderNumber}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{pay.customerName}</td>
                  <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400">₹{(pay.amount || 0).toLocaleString()}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px] rounded-md">
                      {pay.method}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{pay.transactionReference || 'N/A'}</td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                    {new Date(pay.paymentDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
