import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import cardsCraftedLogo from '../assets/images/cards_crafted_logo_1786446210358.jpg';
import {
  Sparkles,
  Shield,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Scissors,
  Palette,
  Heart,
  Smile,
  Pencil,
  Stamp,
  Gift,
  Wand2,
  Phone,
  MapPin,
  CheckCircle2,
  ShoppingBag,
  UserPlus,
  LogIn,
  Mail,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Lock,
  ArrowLeft,
  ShieldCheck,
  Send,
  RotateCw,
  Timer,
  Key,
  Github
} from 'lucide-react';

type AuthMode = 'ADMIN_LOGIN' | 'CUSTOMER_LOGIN' | 'CUSTOMER_SIGNUP' | 'FORGOT_PASSWORD' | 'VERIFY_OTP' | 'RESET_PASSWORD';

export const LoginPage: React.FC = () => {
  const { login, registerCustomer, connectWithGithub } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('CUSTOMER_LOGIN');
  const [githubLoading, setGithubLoading] = useState(false);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Customer Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupWhatsapp, setSignupWhatsapp] = useState('');
  const [signupAltPhone, setSignupAltPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupCity, setSignupCity] = useState('Mumbai');
  const [signupState, setSignupState] = useState('Maharashtra');
  const [signupPincode, setSignupPincode] = useState('400001');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot Password & OTP Verification State
  const [forgotEmailOrPhone, setForgotEmailOrPhone] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [otpResult, setOtpResult] = useState<{
    channel: 'EMAIL' | 'WHATSAPP';
    sender: string;
    senderName: string;
    maskedTarget: string;
    otp?: string;
    whatsappUrl?: string;
    mailtoUrl?: string;
    user: { id: string; name: string; email: string; whatsapp?: string };
    expiresAt: string;
  } | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset Password State (Only unlocked after OTP verification)
  const [resetToken, setResetToken] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<{ id: string; name: string; email: string; whatsapp?: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await registerCustomer({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        whatsapp: signupWhatsapp,
        alternatePhone: signupAltPhone,
        address: signupAddress,
        city: signupCity,
        state: signupState,
        pincode: signupPincode
      });
      setSuccessMsg('Account created successfully! Redirecting to Customer Portal...');
    } catch (err: any) {
      setError(err.message || 'Failed to create customer account.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request OTP via selected internal channel (Email / WhatsApp)
  const handleSendOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!forgotEmailOrPhone.trim()) {
      setError('Please enter your registered email address or WhatsApp number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmailOrPhone.trim(), deliveryChannel);
      setOtpResult(res);
      setEnteredOtp('');
      setResendCooldown(60); // 60s cooldown
      setAuthMode('VERIFY_OTP');
      setSuccessMsg(`OTP sent internally via ${res.channel === 'EMAIL' ? 'Email' : 'WhatsApp'}.`);
    } catch (err: any) {
      setError(err.message || 'No account found matching this email or phone number.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP internally
  const handleResendOtp = async (channelOverride?: 'EMAIL' | 'WHATSAPP') => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const channelToUse = channelOverride || deliveryChannel;
    try {
      const res = await api.resendOtp(forgotEmailOrPhone.trim(), channelToUse);
      setDeliveryChannel(channelToUse);
      setOtpResult(res);
      setResendCooldown(60);
      setSuccessMsg(`Fresh OTP sent internally via ${channelToUse === 'EMAIL' ? 'Email' : 'WhatsApp'}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP entered by user
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanOtp = enteredOtp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(forgotEmailOrPhone.trim(), cleanOtp);
      if (res.valid) {
        setResetToken(res.resetToken);
        setVerifiedUser(res.user);
        setNewPassword('');
        setConfirmNewPassword('');
        setAuthMode('RESET_PASSWORD');
        setSuccessMsg(`✓ Identity verified for ${res.user.name}! Please set your new password.`);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        token: resetToken,
        newPassword
      });

      // Pre-fill email and switch to login
      setEmail(res.email || verifiedUser?.email || '');
      setPassword('');
      setResetToken('');
      setVerifiedUser(null);
      setOtpResult(null);
      setEnteredOtp('');
      setAuthMode('CUSTOMER_LOGIN');
      setSuccessMsg('✨ Password reset successfully! Please log in with your new password.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Verification session may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setGithubLoading(true);
    try {
      const result = await connectWithGithub('login');
      if (result.success) {
        setSuccessMsg('GitHub account authenticated successfully! Redirecting...');
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with GitHub.');
    } finally {
      setGithubLoading(false);
    }
  };

  const setDemoAccount = (demoEmail: string, demoPass: string, mode: 'ADMIN_LOGIN' | 'CUSTOMER_LOGIN') => {
    setAuthMode(mode);
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-[#070b16] bg-blueprint-grid text-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-x-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* Floating Animated Craft Elements / Doodles */}
      <div className="absolute top-6 left-6 sm:top-10 sm:left-14 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-2xl shadow-lg transform -rotate-3 hover:scale-105 transition-transform">
        <Scissors className="w-5 h-5 text-pink-400 -rotate-90" />
        <div className="flex flex-col">
          <span className="font-cursive font-bold text-sm text-pink-300 tracking-wide leading-none">Cards Crafted</span>
          <span className="font-cursive font-semibold text-[10px] text-pink-400 leading-tight">by Shivani ✂️</span>
        </div>
      </div>

      <div className="absolute top-8 right-6 sm:top-12 sm:right-16 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-lg transform rotate-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <span className="text-xs font-bold text-amber-300">Customer Portal Access</span>
      </div>

      {/* MAIN CONTAINER CARD */}
      <div className="w-full max-w-lg bg-[#0e1526]/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/80 p-5 sm:p-7 relative z-10 my-4">
        {/* Brand Header */}
        <div className="text-center mb-5 flex flex-col items-center">
          <div className="relative mb-3 flex items-center justify-center">
            <img
              src={cardsCraftedLogo}
              alt="Cards Crafted by Shivani"
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain rounded-full shadow-2xl shadow-pink-500/25 hover:scale-105 transition-transform duration-300 mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="font-cursive font-bold text-3xl sm:text-4xl text-white tracking-wide leading-none drop-shadow-md">
              Cards Crafted
            </h1>
            <p className="font-cursive font-bold text-lg sm:text-xl text-pink-400 tracking-wider mt-1">
              by Shivani
            </p>
          </div>
        </div>

        {/* Auth Mode Switch Tabs (Shown for standard modes) */}
        {authMode !== 'FORGOT_PASSWORD' && authMode !== 'VERIFY_OTP' && authMode !== 'RESET_PASSWORD' && (
          <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMode('CUSTOMER_LOGIN');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2 px-1 text-center font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                authMode === 'CUSTOMER_LOGIN'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Customer Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('CUSTOMER_SIGNUP');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2 px-1 text-center font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                authMode === 'CUSTOMER_SIGNUP'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Sign Up</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('ADMIN_LOGIN');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2 px-1 text-center font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                authMode === 'ADMIN_LOGIN'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Admin Portal</span>
            </button>
          </div>
        )}

        {/* Error / Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs font-bold rounded-2xl animate-in fade-in flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs font-bold rounded-2xl animate-in fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. CUSTOMER SIGN UP FORM */}
        {authMode === 'CUSTOMER_SIGNUP' && (
          <form onSubmit={handleSignupSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Pooja Sharma"
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="pooja@example.com"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">WhatsApp Number *</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="919820011223"
                    value={signupWhatsapp}
                    onChange={e => setSignupWhatsapp(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Alternate Phone</label>
                <input
                  type="text"
                  placeholder="Optional backup"
                  value={signupAltPhone}
                  onChange={e => setSignupAltPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Delivery / Street Address</label>
              <textarea
                rows={2}
                placeholder="House / Flat No, Landmark, Area..."
                value={signupAddress}
                onChange={e => setSignupAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-500 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={signupCity}
                  onChange={e => setSignupCity(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  value={signupState}
                  onChange={e => setSignupState(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">Pincode</label>
                <input
                  type="text"
                  value={signupPincode}
                  onChange={e => setSignupPincode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Create Password *</label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    placeholder="Min. 6 chars"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Confirm Password *</label>
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={signupConfirmPassword}
                  onChange={e => setSignupConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all mt-3 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Customer Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up for Customer Portal</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. LOGIN FORM (Customer Login / Admin Login) */}
        {(authMode === 'CUSTOMER_LOGIN' || authMode === 'ADMIN_LOGIN') && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                {authMode === 'CUSTOMER_LOGIN' ? 'Customer Email Address' : 'Admin / Staff Email'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={authMode === 'CUSTOMER_LOGIN' ? 'pooja@example.com' : 'admin@example.com'}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 focus:border-blue-500 text-white font-bold rounded-xl transition-all focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmailOrPhone(email);
                    setOtpResult(null);
                    setEnteredOtp('');
                    setError('');
                    setSuccessMsg('');
                    setAuthMode('FORGOT_PASSWORD');
                  }}
                  className="text-[11px] font-bold text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 focus:border-indigo-500 text-white font-bold rounded-xl transition-all focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all mt-3 cursor-pointer disabled:opacity-50 ${
                authMode === 'CUSTOMER_LOGIN'
                  ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
              }`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>
                    {authMode === 'CUSTOMER_LOGIN'
                      ? 'Sign In to Customer Portal'
                      : 'Sign In to Admin Portal'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* GitHub Social Sign-In / Fast Connect Divider */}
        {(authMode === 'CUSTOMER_LOGIN' || authMode === 'CUSTOMER_SIGNUP' || authMode === 'ADMIN_LOGIN') && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="relative flex py-1 items-center justify-center mb-2.5">
              <div className="grow border-t border-slate-800"></div>
              <span className="shrink mx-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                or continue with
              </span>
              <div className="grow border-t border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGithubSignIn}
              disabled={githubLoading || loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {githubLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to GitHub...</span>
                </>
              ) : (
                <>
                  <Github className="w-4 h-4 text-slate-100" />
                  <span>Continue with GitHub</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 3. STEP 1: FORGOT PASSWORD - REQUEST OTP */}
        {authMode === 'FORGOT_PASSWORD' && (
          <div className="space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-sm">Reset Password</h3>
                    <span className="px-2 py-0.5 bg-pink-950/80 border border-pink-700/60 text-pink-300 rounded-full text-[10px] font-bold">
                      Step 1 of 3
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Select delivery channel to receive your 6-digit OTP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('CUSTOMER_LOGIN');
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Login
              </button>
            </div>

            <form onSubmit={handleSendOtpSubmit} className="space-y-3.5">
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-slate-300 text-[11px] leading-relaxed">
                Enter your registered details and choose where you want to receive your <strong>6-digit OTP verification code</strong>. The code will be sent internally from the official Cards Crafted Studio account.
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-pink-400" />
                  Registered Email or WhatsApp Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={forgotEmailOrPhone}
                    onChange={e => setForgotEmailOrPhone(e.target.value)}
                    placeholder="e.g. pooja@example.com or 9820011223"
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 focus:border-pink-500 text-white font-bold rounded-xl transition-all focus:outline-hidden text-xs"
                  />
                </div>
              </div>

              {/* Delivery Channel Selector: Option 1: Email, Option 2: WhatsApp */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-300 text-xs">
                  Choose OTP Delivery Option:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option 1: Email */}
                  <button
                    type="button"
                    onClick={() => setDeliveryChannel('EMAIL')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      deliveryChannel === 'EMAIL'
                        ? 'bg-blue-950/70 border-blue-500 text-white ring-1 ring-blue-500'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      deliveryChannel === 'EMAIL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <span>1. Email OTP</span>
                        {deliveryChannel === 'EMAIL' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Receive code on your registered email
                      </p>
                    </div>
                  </button>

                  {/* Option 2: WhatsApp */}
                  <button
                    type="button"
                    onClick={() => setDeliveryChannel('WHATSAPP')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      deliveryChannel === 'WHATSAPP'
                        ? 'bg-emerald-950/70 border-emerald-500 text-white ring-1 ring-emerald-500'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      deliveryChannel === 'WHATSAPP' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <span>2. WhatsApp OTP</span>
                        {deliveryChannel === 'WHATSAPP' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Receive code on your registered WhatsApp
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending OTP Internally...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send OTP via {deliveryChannel === 'EMAIL' ? 'Email' : 'WhatsApp'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 4. STEP 2: VERIFY OTP SCREEN */}
        {authMode === 'VERIFY_OTP' && otpResult && (
          <div className="space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-sm">Verify OTP Code</h3>
                    <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 rounded-full text-[10px] font-bold">
                      Step 2 of 3
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Enter the 6-digit code received on your {otpResult.channel === 'EMAIL' ? 'Email' : 'WhatsApp'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('FORGOT_PASSWORD');
                  setError('');
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                Change Channel
              </button>
            </div>

            {/* Delivery Confirmation Banner */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>OTP Sent Internally via {otpResult.channel === 'EMAIL' ? 'Email' : 'WhatsApp'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Valid for 10 min</span>
            </div>

            {/* OTP Entry Form */}
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-3.5">
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2.5">
                <label className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Enter 6-Digit OTP Code *
                </label>

                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={enteredOtp}
                    onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full py-3 px-4 bg-slate-950 border border-slate-700 focus:border-indigo-500 text-white font-mono font-black text-center text-2xl tracking-[0.4em] rounded-xl transition-all focus:outline-hidden"
                  />
                </div>

                {/* Resend & Channel Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/70">
                  <span className="text-[11px] text-slate-400">
                    Didn't receive the OTP?
                  </span>
                  
                  {resendCooldown > 0 ? (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResendOtp()}
                        disabled={loading}
                        className="text-[11px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCw className="w-3 h-3" />
                        Resend to {otpResult.channel === 'EMAIL' ? 'Email' : 'WhatsApp'}
                      </button>

                      <span className="text-slate-600">|</span>

                      <button
                        type="button"
                        onClick={() => handleResendOtp(otpResult.channel === 'EMAIL' ? 'WHATSAPP' : 'EMAIL')}
                        disabled={loading}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        Send via {otpResult.channel === 'EMAIL' ? 'WhatsApp' : 'Email'} instead
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || enteredOtp.length < 6}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying OTP Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Code & Set New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 5. STEP 3: RESET PASSWORD FORM (UNLOCKED ONLY AFTER VERIFIED OTP) */}
        {authMode === 'RESET_PASSWORD' && (
          <div className="space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-sm">Set New Password</h3>
                    <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded-full text-[10px] font-bold">
                      Step 3 of 3
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {verifiedUser ? `Identity verified for ${verifiedUser.name} (${verifiedUser.email})` : 'Create your new secure password'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('CUSTOMER_LOGIN');
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                Cancel
              </button>
            </div>

            {/* Verified Badge */}
            {verifiedUser && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                  ✓
                </div>
                <div className="text-[11px] text-emerald-200">
                  <strong className="text-white">OTP Verification Successful!</strong> Your identity is verified for <strong>{verifiedUser.email}</strong>.
                </div>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  New Password (Min. 6 Characters) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 focus:border-purple-500 text-white font-bold rounded-xl transition-all focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-pink-400" />
                  Confirm New Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 focus:border-pink-500 text-white font-bold rounded-xl transition-all focus:outline-hidden"
                  />
                </div>
              </div>

              {newPassword && confirmNewPassword && (
                <div className="text-[11px] font-bold flex items-center gap-1.5">
                  {newPassword === confirmNewPassword ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Passwords match!
                    </span>
                  ) : (
                    <span className="text-red-400">Passwords do not match</span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (newPassword.length < 6) || (newPassword !== confirmNewPassword)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving New Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Password & Sign In</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Quick Demo Credentials Buttons (Shown only in login modes) */}
        {(authMode === 'CUSTOMER_LOGIN' || authMode === 'ADMIN_LOGIN') && (
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center mb-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Quick Demo Logins
              <Sparkles className="w-3 h-3 text-amber-400" />
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => setDemoAccount('pooja@example.com', 'ChangeMe123!', 'CUSTOMER_LOGIN')}
                className="p-2.5 bg-pink-950/40 hover:bg-pink-900/50 text-pink-200 rounded-xl border border-pink-800/60 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-pink-400" />
                  <div>
                    <span className="text-xs font-bold block text-white">Customer Demo</span>
                    <p className="text-[10px] text-pink-300">pooja@example.com</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-pink-800 text-pink-100 rounded">Fill</span>
              </button>

              <button
                onClick={() => setDemoAccount('admin@example.com', 'ChangeMe123!', 'ADMIN_LOGIN')}
                className="p-2.5 bg-blue-950/40 hover:bg-blue-900/50 text-blue-200 rounded-xl border border-blue-800/60 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-xs font-bold block text-white">Super Admin</span>
                    <p className="text-[10px] text-blue-300">admin@example.com</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-800 text-blue-100 rounded">Fill</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
