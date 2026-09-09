import React, { useState } from 'react';
import {
  Mail,
  Send,
  RefreshCw,
  Inbox,
  PenSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Clock
} from 'lucide-react';
import { useGmail } from '../../context/GmailContext';
import { useGoogleDrive } from '../../context/GoogleDriveContext';
import { GoogleSignInButton } from '../drive/GoogleSignInButton';

interface GmailHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipient?: string;
  initialSubject?: string;
  initialBody?: string;
  orderContext?: {
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    items?: string;
  };
}

export const GmailHubModal: React.FC<GmailHubModalProps> = ({
  isOpen,
  onClose,
  initialRecipient = '',
  initialSubject = '',
  initialBody = '',
  orderContext
}) => {
  const { isConnected } = useGoogleDrive();
  const {
    messages,
    loadingMessages,
    sending,
    userEmailAddress,
    refreshMessages,
    sendEmail
  } = useGmail();

  const [activeTab, setActiveTab] = useState<'COMPOSE' | 'INBOX'>('COMPOSE');
  
  // Compose form fields
  const [recipient, setRecipient] = useState(initialRecipient);
  const [subject, setSubject] = useState(initialSubject || (orderContext ? `Cards Crafted - Order #${orderContext.orderNumber} Update` : ''));
  const [body, setBody] = useState(initialBody || (orderContext ? `Hi ${orderContext.customerName},\n\nThank you for choosing Cards Crafted! We are actively crafting your handmade items for order #${orderContext.orderNumber}.\n\nTotal: ₹${orderContext.totalAmount}\n\nWarm regards,\nCards Crafted Studio Team` : ''));
  
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mandatory explicit confirmation dialog before sending emails
  const [confirmSendDialog, setConfirmSendDialog] = useState(false);

  if (!isOpen) return null;

  const handleTemplateSelect = (templateType: 'CONFIRMATION' | 'IN_PROGRESS' | 'DISPATCHED' | 'THANK_YOU') => {
    const custName = orderContext?.customerName || 'Valued Customer';
    const ordNum = orderContext?.orderNumber || 'ORD-1001';
    const amount = orderContext?.totalAmount ? `₹${orderContext.totalAmount}` : 'your order';

    switch (templateType) {
      case 'CONFIRMATION':
        setSubject(`Order Confirmed #${ordNum} | Cards Crafted Studio`);
        setBody(
          `Dear ${custName},\n\nThank you for your order with Cards Crafted Studio!\n\nYour order #${ordNum} (${amount}) has been received and scheduled with our master craft artists. We will share photos during crafting.\n\nWarm regards,\nCards Crafted Studio`
        );
        break;
      case 'IN_PROGRESS':
        setSubject(`Crafting Progress Update: Order #${ordNum}`);
        setBody(
          `Dear ${custName},\n\nGreat news! Your custom handmade items for order #${ordNum} are currently being crafted in our workshop.\n\nOur resin layers and paper detailing are setting nicely. We will notify you once quality check is complete!\n\nBest,\nCards Crafted Studio`
        );
        break;
      case 'DISPATCHED':
        setSubject(`Order #${ordNum} Dispatched & On Its Way! 🚀`);
        setBody(
          `Dear ${custName},\n\nYour handmade order #${ordNum} has been carefully packaged and handed over to our delivery partner.\n\nPlease inspect the parcel upon arrival and reach out if you need anything.\n\nWarm regards,\nCards Crafted Team`
        );
        break;
      case 'THANK_YOU':
        setSubject(`Thank You for Supporting Cards Crafted! ❤️`);
        setBody(
          `Dear ${custName},\n\nWe hope you love your handcrafted creation as much as we loved making it for you! Thank you for supporting handmade art and small businesses.\n\nWarm regards,\nCards Crafted Studio`
        );
        break;
    }
  };

  const handleSendFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      setStatusMsg({ type: 'error', text: 'Please fill in recipient, subject, and email body.' });
      return;
    }
    setConfirmSendDialog(true);
  };

  const executeSendEmail = async () => {
    setConfirmSendDialog(false);
    try {
      await sendEmail({
        to: recipient.trim(),
        subject: subject.trim(),
        body: body.trim(),
        fromName: 'Cards Crafted Studio'
      });
      setStatusMsg({
        type: 'success',
        text: `Email successfully sent to ${recipient} via your connected Gmail account!`
      });
      setSubject('');
      setBody('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to send email via Gmail.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Gmail Communication Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {userEmailAddress ? `Connected as ${userEmailAddress}` : 'Send order updates & receipts via Gmail'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GoogleSignInButton />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/70 border-rose-800/60 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {!isConnected ? (
          <div className="p-8 text-center flex flex-col items-center justify-center my-auto">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-inner">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Connect Gmail Account</h3>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              Sign in with your Google Account to send personalized order confirmations, dispatch updates, and craft
              progress emails directly to your customers with your permission.
            </p>
            <GoogleSignInButton />
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2 bg-slate-900/50">
              <button
                onClick={() => setActiveTab('COMPOSE')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'COMPOSE'
                    ? 'bg-slate-800 text-red-400 border-t-2 border-red-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>Compose & Send Email</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('INBOX');
                  refreshMessages();
                }}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'INBOX'
                    ? 'bg-slate-800 text-red-400 border-t-2 border-red-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Recent Gmail Activity ({messages.length})</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* TAB 1: COMPOSE */}
              {activeTab === 'COMPOSE' && (
                <div className="space-y-4">
                  {/* Template selector */}
                  <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Quick Craft Studio Templates:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleTemplateSelect('CONFIRMATION')}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
                      >
                        Order Confirmed
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTemplateSelect('IN_PROGRESS')}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
                      >
                        Crafting in Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTemplateSelect('DISPATCHED')}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
                      >
                        Dispatched / Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTemplateSelect('THANK_YOU')}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
                      >
                        Thank You & Feedback
                      </button>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSendFormSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">To (Customer Email) *</label>
                      <input
                        type="email"
                        required
                        value={recipient}
                        onChange={e => setRecipient(e.target.value)}
                        placeholder="customer@example.com"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Subject *</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Cards Crafted - Order Update"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Message Body *</label>
                      <textarea
                        rows={6}
                        required
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Write your email message..."
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-red-500 leading-relaxed font-mono"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={sending || !recipient.trim() || !subject.trim() || !body.trim()}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{sending ? 'Sending via Gmail...' : 'Send Customer Email'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: INBOX & RECENT MESSAGES */}
              {activeTab === 'INBOX' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Recent Customer Communications</span>
                    <button
                      onClick={() => refreshMessages()}
                      disabled={loadingMessages}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {loadingMessages ? (
                    <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      <span>Fetching recent messages from Gmail...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
                      <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No recent messages found in your inbox.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-bold text-xs text-white line-clamp-1">
                                {msg.from || 'Customer'}
                              </span>
                            </div>
                            {msg.date && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                                <Clock className="w-3 h-3" />
                                {new Date(msg.date).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-200">{msg.subject || '(No Subject)'}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{msg.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Official Gmail API Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog before sending emails */}
      {confirmSendDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl max-w-md w-full p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-400">
              <Mail className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Confirm Email Delivery</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to send this email to <strong>{recipient}</strong> with subject &ldquo;
              <strong>{subject}</strong>&rdquo; from your connected Gmail address (<strong>{userEmailAddress}</strong>)?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSendDialog(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSendEmail}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
