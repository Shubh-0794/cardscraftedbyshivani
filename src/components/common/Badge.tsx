import React from 'react';
import { OrderStatus, PaymentStatus, UserRole } from '../../types';

interface BadgeProps {
  type: 'orderStatus' | 'paymentStatus' | 'role' | 'stock';
  value: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  if (type === 'orderStatus') {
    const status = value as OrderStatus;
    const config: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
      NEW: { label: 'New Order', bg: 'bg-blue-50 dark:bg-blue-950/70', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      PAYMENT_VERIFICATION_PENDING: { label: 'Payment Under Verification', bg: 'bg-amber-50 dark:bg-amber-950/70', text: 'text-amber-700 dark:text-amber-300 animate-pulse', border: 'border-amber-300 dark:border-amber-700' },
      PAYMENT_REJECTED: { label: 'Payment Rejected / Unplaced', bg: 'bg-rose-50 dark:bg-rose-950/70', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800' },
      ORDER_RECEIVED: { label: 'Order Received', bg: 'bg-blue-50 dark:bg-blue-950/70', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      CONFIRMED: { label: 'Confirmed', bg: 'bg-indigo-50 dark:bg-indigo-950/70', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
      PRINT_IN_PROGRESS: { label: 'Print In Progress', bg: 'bg-purple-50 dark:bg-purple-950/70', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
      PRINT_DONE: { label: 'Print Done', bg: 'bg-cyan-50 dark:bg-cyan-950/70', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
      PACKED_SEAL: { label: 'Packed Seal', bg: 'bg-amber-50 dark:bg-amber-950/70', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
      READY_TO_DISPATCH: { label: 'Ready to Dispatch', bg: 'bg-emerald-50 dark:bg-emerald-950/70', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
      DESIGNING: { label: 'Designing', bg: 'bg-purple-50 dark:bg-purple-950/70', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
      DESIGN_APPROVED: { label: 'Design Approved', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/70', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800' },
      IN_PRODUCTION: { label: 'In Production', bg: 'bg-amber-50 dark:bg-amber-950/70', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
      QUALITY_CHECK: { label: 'Quality Check', bg: 'bg-yellow-50 dark:bg-yellow-950/70', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
      READY: { label: 'Ready for Pickup', bg: 'bg-emerald-50 dark:bg-emerald-950/70', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
      OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: 'bg-cyan-50 dark:bg-cyan-950/70', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
      DELIVERED: { label: 'Delivered', bg: 'bg-green-100 dark:bg-green-950/70', text: 'text-green-800 dark:text-green-300', border: 'border-green-300 dark:border-green-800' },
      CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50 dark:bg-rose-950/70', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' }
    };

    const cfg = config[status] || { label: value, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75"></span>
        {cfg.label}
      </span>
    );
  }

  if (type === 'paymentStatus') {
    const status = value as PaymentStatus;
    const config: Record<PaymentStatus, { label: string; bg: string }> = {
      PAID: { label: 'Fully Paid', bg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
      PARTIALLY_PAID: { label: 'Partially Paid', bg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
      PENDING: { label: 'Payment Pending', bg: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800' },
      PENDING_VERIFICATION: { label: 'Verification In Progress', bg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse' },
      REJECTED: { label: 'Payment Rejected', bg: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800' },
      REFUNDED: { label: 'Refunded', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' }
    };
    const cfg = config[status] || { label: value, bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.bg} ${className}`}>
        {cfg.label}
      </span>
    );
  }

  if (type === 'role') {
    const role = value as UserRole;
    const config: Record<string, { label: string; bg: string }> = {
      SUPER_ADMIN: { label: 'Super Admin', bg: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800' },
      CUSTOMER: { label: 'Customer', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' }
    };
    const cfg = config[role] || { label: value, bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${cfg.bg} ${className}`}>
        {cfg.label}
      </span>
    );
  }

  if (type === 'stock') {
    const status = value; // 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'
    if (status === 'OUT_OF_STOCK') {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 ${className}`}>
          Out of Stock
        </span>
      );
    }
    if (status === 'LOW_STOCK') {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 ${className}`}>
          Low Stock
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 ${className}`}>
        In Stock
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 ${className}`}>
      {value}
    </span>
  );
};
