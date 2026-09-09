import React from 'react';
import { MessageSquare } from 'lucide-react';

interface WhatsAppBtnProps {
  phone: string;
  customerName?: string;
  orderNumber?: string;
  messageType?: 'confirmed' | 'ready' | 'payment_due' | 'custom';
  customMessage?: string;
  balance?: number;
  className?: string;
  children?: React.ReactNode;
}

export const WhatsAppBtn: React.FC<WhatsAppBtnProps> = ({
  phone,
  customerName = 'Valued Customer',
  orderNumber = '',
  messageType = 'custom',
  customMessage = '',
  balance = 0,
  className = '',
  children
}) => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  let text = customMessage;

  if (messageType === 'confirmed') {
    text = `Hello ${customerName}, your craft order #${orderNumber} at Cards Crafted has been CONFIRMED! We are preparing the materials for production. Thank you!`;
  } else if (messageType === 'ready') {
    text = `Hello ${customerName}, great news! Your craft order #${orderNumber} is READY for pickup / delivery! Please let us know when you would like it dispatched.`;
  } else if (messageType === 'payment_due') {
    text = `Hello ${customerName}, a friendly reminder from Cards Crafted regarding order #${orderNumber}. Outstanding payment balance is ₹${balance}. Kindly settle at your convenience.`;
  }

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors ${className}`}
    >
      <MessageSquare className="w-3.5 h-3.5" />
      {children || 'WhatsApp'}
    </a>
  );
};
