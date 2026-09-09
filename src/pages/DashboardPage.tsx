import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import {
  ShoppingBag,
  Clock,
  Hammer,
  Truck,
  IndianRupee,
  AlertTriangle,
  PlusCircle,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
  PackageCheck,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardPageProps {
  onOpenNewOrder?: () => void;
  onOpenNewCustomer?: () => void;
  onViewOrder?: (id: string) => void;
  setActiveView?: (view: string) => void;
  onNavigateView?: (view: string) => void;
  onOpenOrderWorkflow?: (orderId?: string) => void;
  onOpenCustomerEnrollment?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenNewOrder,
  onOpenNewCustomer,
  onViewOrder,
  setActiveView,
  onNavigateView,
  onOpenOrderWorkflow,
  onOpenCustomerEnrollment
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const navigate = (view: string) => {
    if (setActiveView) {
      setActiveView(view);
    } else if (onNavigateView) {
      onNavigateView(view);
    }
  };

  const handleCreateCustomer = () => {
    if (onOpenNewCustomer) {
      onOpenNewCustomer();
    } else if (onOpenCustomerEnrollment) {
      onOpenCustomerEnrollment();
    } else {
      navigate('customers');
    }
  };

  const handleCreateOrder = () => {
    if (onOpenNewOrder) {
      onOpenNewOrder();
    } else if (onOpenOrderWorkflow) {
      onOpenOrderWorkflow();
    } else {
      navigate('orders');
    }
  };

  const handleViewOrder = (id: string) => {
    if (onViewOrder) {
      onViewOrder(id);
    } else if (onOpenOrderWorkflow) {
      onOpenOrderWorkflow(id);
    } else {
      navigate('orders');
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold tracking-wide">Loading Dashboard Overview...</p>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

  const pieData = stats?.orderStatusCounts
    ? Object.entries(stats.orderStatusCounts).map(([status, count]) => ({
        name: status.replace(/_/g, ' '),
        value: count
      }))
    : [];

  const metrics = [
    {
      label: "Today's Orders",
      value: stats?.todayOrdersCount || 0,
      subtext: 'New today',
      icon: ShoppingBag,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30'
    },
    {
      label: 'Pending Orders',
      value: stats?.pendingOrdersCount || 0,
      subtext: 'Awaiting confirmation',
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30'
    },
    {
      label: 'In Production',
      value: stats?.inProductionCount || 0,
      subtext: 'Currently crafting',
      icon: Hammer,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30'
    },
    {
      label: 'Ready for Dispatch',
      value: stats?.readyCount || 0,
      subtext: 'Completed items',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      label: "Today's Revenue",
      value: `₹${(stats?.todayRevenue || 0).toLocaleString()}`,
      subtext: 'Payments received',
      icon: IndianRupee,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30'
    },
    {
      label: 'Stock Alerts',
      value: stats?.lowStockCount || 0,
      subtext: stats?.lowStockCount > 0 ? 'Requires attention' : 'Inventory healthy',
      icon: AlertTriangle,
      color: stats?.lowStockCount > 0 ? 'text-rose-500' : 'text-slate-400',
      bgColor: stats?.lowStockCount > 0 ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-50 dark:bg-slate-800/40'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131b2e] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Studio Overview</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time status of orders, production pipelines, inventory, and finances.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleCreateCustomer}
            title="Add Customer"
            className="p-2 sm:px-3.5 sm:py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700/50"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Add Customer</span>
          </button>
          <button
            onClick={handleCreateOrder}
            title="New Order"
            className="p-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Order</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid - Clean & Crisp */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                  {m.label}
                </span>
                <div className={`p-1.5 rounded-lg ${m.bgColor} ${m.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {m.value}
                </div>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 truncate">
                  {m.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5 sm:p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Revenue & Sales Trend
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Order value generated over timeline</p>
            </div>
          </div>
          <div className="h-60 w-full">
            {stats?.salesTrend && stats.salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.salesTrend}>
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`₹${(Number(val) || 0).toLocaleString()}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <p>No revenue transactions recorded yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">New order payments will plot automatically here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Distribution Donut */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5 sm:p-6 transition-colors flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white mb-0.5">Orders by Status</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Active pipeline breakdown</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', border: '1px solid #334155', color: '#fff', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                <p>No active orders</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px] text-slate-600 dark:text-slate-300">
            {pieData.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="truncate">{p.name}: <strong className="text-slate-800 dark:text-white">{p.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders & Low Stock Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-colors">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Recent Orders</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Latest active submissions</p>
            </div>
            <button
              onClick={() => navigate('orders')}
              className="text-xs font-bold text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile View for Recent Orders (< md) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((ord: any) => (
                <div key={ord.id} className="p-3.5 space-y-2 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs font-mono text-blue-600 dark:text-blue-400">
                      {ord.orderNumber}
                    </span>
                    <Badge type="orderStatus" value={ord.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{ord.customerName}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{ord.customerPhone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 dark:text-white">₹{(ord.grandTotal || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleViewOrder(ord.id)}
                      className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
                    >
                      View Order Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                <ShoppingBag className="w-7 h-7 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold">No orders placed yet.</p>
              </div>
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Order #</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {stats.recentOrders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-blue-500 dark:text-blue-400">{ord.orderNumber}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800 dark:text-white">{ord.customerName}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{ord.customerPhone}</p>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">₹{(ord.grandTotal || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <Badge type="orderStatus" value={ord.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleViewOrder(ord.id)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold">No orders placed yet.</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Click "+ New Order" to record your first client order.</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Material Widget */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5 sm:p-6 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Stock Alerts</h3>
              </div>
              <button
                onClick={() => navigate('inventory')}
                className="text-xs font-bold text-blue-500 hover:text-blue-400 hover:underline cursor-pointer"
              >
                Inventory
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {!stats?.lowStockList || stats.lowStockList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <PackageCheck className="w-6 h-6 mx-auto mb-1.5 text-emerald-500" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">All materials well stocked</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No low stock thresholds triggered.</p>
                </div>
              ) : (
                stats.lowStockList.map((item: any) => (
                  <div key={item.id} className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-rose-600 dark:text-rose-300 font-medium mt-0.5">
                        Stock: {item.currentStock} {item.unit} (Min: {item.minStock})
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('inventory')}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg shadow-xs cursor-pointer"
                    >
                      Restock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

