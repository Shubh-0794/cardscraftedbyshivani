import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { exportOrdersToExcel } from '../utils/excelExport';
import { BarChart3, Download, TrendingUp, IndianRupee, ShoppingBag, Boxes, FileSpreadsheet } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const data = await api.getReportSummary();
        setSummary(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, []);

  const exportExcel = async () => {
    try {
      const orders = await api.getOrders();
      exportOrdersToExcel(orders, `Cards_Crafted_Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert('Failed to generate Excel export');
    }
  };

  const exportCSV = async () => {
    try {
      const orders = await api.getOrders();
      const csvHeader = 'Order Number,Customer Name,Date,Status,Total Amount,Paid Amount,Balance Due\n';
      const csvRows = orders.map(o =>
        `"${o.orderNumber}","${o.customerName}","${o.orderDate}","${o.status}",${o.grandTotal},${o.paidAmount},${o.balanceAmount}`
      ).join('\n');

      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cards_Crafted_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      alert('Failed to generate CSV export');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs font-semibold text-slate-500">Loading Business Reports...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Analytics & Financial Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Export sales summaries, customer value metrics & stock valuation.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={exportExcel}
            className="p-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
            title="Download Financial & Sales Report as Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel (.xlsx)</span>
          </button>
          <button
            onClick={exportCSV}
            title="Export CSV"
            className="p-2 sm:px-3.5 sm:py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Revenue Collected</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{(summary?.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Dues</span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">₹{(summary?.totalDue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Lifetime Orders</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{summary?.totalOrders || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Current Inventory Value</span>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-400">₹{(summary?.inventoryValue || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Top Value Customers */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3">Top High-Value Customers</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {summary?.topCustomers?.map((c: any) => (
            <div key={c.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{c.name} ({c.customerCode})</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{c.whatsapp} • {c.city}</p>
              </div>
              <span className="font-black text-purple-700 dark:text-purple-400 text-sm">₹{(c.totalSpent || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
