import React from 'react';
import { Mail } from 'lucide-react';

interface EmailBtnProps {
  email: string;
  customerName?: string;
  orderNumber?: string;
  messageType?: 'confirmed' | 'ready' | 'payment_due' | 'custom';
  subject?: string;
  customBody?: string;
  balance?: number;
  className?: string;
  children?: React.ReactNode;
}

export const EmailBtn: React.FC<EmailBtnProps> = ({
  email,
  customerName = 'Valued Customer',
  orderNumber = '',
  messageType = 'custom',
  subject = 'Cards Crafted - Update on your Order',
  customBody = '',
  balance = 0,
  className = '',
  children
}) => {
  let body = customBody;

  if (messageType === 'confirmed') {
    body = `Hello ${customerName},\n\nYour craft order #${orderNumber} at Cards Crafted has been CONFIRMED!\nWe are preparing high quality handcrafted materials for your order.\n\nThank you,\nCards Crafted Team`;
  } else if (messageType === 'ready') {
    body = `Hello ${customerName},\n\nGreat news! Your craft order #${orderNumber} is READY for dispatch / pickup.\n\nThank you,\nCards Crafted Team`;
  } else if (messageType === 'payment_due') {
    body = `Hello ${customerName},\n\nFriendly reminder regarding craft order #${orderNumber}.\nThe outstanding balance is ₹${balance}.\n\nThank you,\nCards Crafted Team`;
  }

  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={mailtoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs ${className}`}
    >
      {children || (
        <>
          <Mail className="w-3.5 h-3.5" />
          <span>Email</span>
        </>
      )}
    </a>
  );
};
