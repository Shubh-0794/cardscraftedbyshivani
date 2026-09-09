import React from 'react';
import { Mail } from 'lucide-react';

interface EmailBtnProps {
  email: string;
  customerName?: string;
  orderNumber?: string;
  subject?: string;
  body?: string;
  className?: string;
  children?: React.ReactNode;
}

export const EmailBtn: React.FC<EmailBtnProps> = ({
  email,
  customerName = '',
  orderNumber = '',
  subject = 'Update from Cards Crafted',
  body,
  className = '',
  children
}) => {
  const defaultBody = body || `Dear ${customerName},\n\nThis is regarding your order #${orderNumber} at Cards Crafted.\n\nBest regards,\nCards Crafted`;
  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(defaultBody)}`;

  return (
    <a
      href={mailtoUrl}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors ${className}`}
    >
      <Mail className="w-3.5 h-3.5" />
      {children || 'Email'}
    </a>
  );
};
