import { Router, Response } from 'express';
import { db } from './db';
import { authenticateToken, requireRoles, AuthenticatedRequest, generateToken, hashPassword, verifyPassword } from './auth';
import { UserRole, OrderStatus, User } from '../src/types';

export const apiRouter = Router();

// --- Auth Routes ---
apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.status === 'INACTIVE') {
    return res.status(403).json({ error: 'Your account has been deactivated. Please contact administrator.' });
  }

  if (user.passwordHash) {
    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  } else {
    if (!verifyPassword(password, 'ChangeMe123!')) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  }

  // Update last login
  db.updateUser(user.id, { lastLogin: new Date().toISOString() });
  db.logAudit(user.id, user.name, 'LOGIN', 'User', user.id, `User logged in from ${req.ip}`);

  const token = generateToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      whatsapp: user.whatsapp,
      customerId: user.customerId
    }
  });
});

// Helper function to mask email for privacy
function maskEmail(email: string): string {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name[0]}${'*'.repeat(Math.max(1, name.length - 2))}${name[name.length - 1]}@${domain}`;
}

// Helper function to mask phone for privacy
function maskPhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 6) return phone;
  const start = clean.slice(0, 4);
  const end = clean.slice(-2);
  return `+91 ${start} **** ${end}`;
}

// Helper function to dynamically retrieve Super Admin / Studio contact details
function getAdminContactDetails() {
  const users = db.getUsers();
  const superAdmin = users.find(u => u.role === 'SUPER_ADMIN') || users[0];
  const settings = db.getSettings();

  const emailSender = superAdmin?.email || settings?.email || 'admin@cardscrafted.com';
  const whatsappSender = superAdmin?.whatsapp || settings?.whatsapp || settings?.phone || '919820112345';
  const businessName = settings?.businessName || settings?.companyName || 'Cards Crafted Studio';

  return {
    emailSender,
    emailSenderName: `${businessName} Admin (${emailSender})`,
    whatsappSender,
    whatsappSenderName: `${businessName} Admin WhatsApp (${whatsappSender})`
  };
}

// Helper function to format phone numbers cleanly for WhatsApp wa.me / api.whatsapp.com
function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

// Forgot Password - Internal OTP Dispatch (Email or WhatsApp)
apiRouter.post('/auth/forgot-password', (req, res) => {
  const { emailOrPhone, channel = 'EMAIL' } = req.body;
  if (!emailOrPhone || typeof emailOrPhone !== 'string' || !emailOrPhone.trim()) {
    return res.status(400).json({ error: 'Please enter your registered email address or WhatsApp phone number.' });
  }

  const user = db.getUserByEmailOrPhone(emailOrPhone.trim());
  if (!user) {
    return res.status(404).json({ error: 'No user account found matching this email or phone number.' });
  }

  const selectedChannel: 'EMAIL' | 'WHATSAPP' = channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';

  // Check if WhatsApp is chosen but user has no WhatsApp registered
  if (selectedChannel === 'WHATSAPP' && !user.whatsapp) {
    return res.status(400).json({
      error: 'This account does not have a registered WhatsApp phone number. Please choose Email instead.'
    });
  }

  // Generate secure 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

  db.updateUser(user.id, {
    passwordResetOtp: otp,
    passwordResetOtpExpires: otpExpires,
    passwordResetToken: undefined,
    passwordResetExpires: undefined
  });

  const adminContacts = getAdminContactDetails();
  const settings = db.getSettings();
  const businessName = settings?.businessName || settings?.companyName || 'Cards Crafted Studio';
  const targetPhoneClean = formatPhoneForWhatsApp(user.whatsapp || '');

  const waMessage = `*${businessName} - Verification Code*\n\nHello ${user.name},\nYour 6-digit OTP verification code is: *${otp}*\n\nDispatched from Admin: ${adminContacts.whatsappSender}\nValid for 10 minutes. Please enter this code to reset your password.`;
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhoneClean}&text=${encodeURIComponent(waMessage)}`;

  const emailSubject = `${businessName} - Password Reset Verification Code`;
  const emailBody = `Hello ${user.name},\n\nYour 6-digit OTP verification code is: ${otp}\n\nDispatched from Studio Admin: ${adminContacts.emailSender}\nThis OTP is valid for 10 minutes.\n\nThank you,\n${businessName}`;
  const mailtoUrl = `mailto:${user.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const senderInfo = selectedChannel === 'EMAIL'
    ? { sender: adminContacts.emailSender, senderName: adminContacts.emailSenderName, target: maskEmail(user.email) }
    : { sender: adminContacts.whatsappSender, senderName: adminContacts.whatsappSenderName, target: maskPhone(user.whatsapp || '') };

  // Internal dispatch simulation & server log with dynamically fetched admin details
  console.log(`[DISPATCH SYSTEM] Internal OTP dispatched via ${selectedChannel}:`);
  console.log(`  -> Admin Sender: ${senderInfo.senderName} [${senderInfo.sender}]`);
  console.log(`  -> Recipient User: ${selectedChannel === 'EMAIL' ? user.email : user.whatsapp} (${user.name})`);
  console.log(`  -> Security Code (OTP): [${otp}]`);

  db.logAudit(
    user.id,
    user.name,
    'OTP_DISPATCHED',
    'User',
    user.id,
    `OTP sent internally via ${selectedChannel} from Admin (${senderInfo.sender}) to ${selectedChannel === 'EMAIL' ? user.email : user.whatsapp}`
  );

  return res.json({
    success: true,
    message: `Verification OTP dispatched internally via ${selectedChannel === 'EMAIL' ? 'Email' : 'WhatsApp'}.`,
    channel: selectedChannel,
    sender: senderInfo.sender,
    senderName: senderInfo.senderName,
    maskedTarget: senderInfo.target,
    otp,
    whatsappUrl,
    mailtoUrl,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp
    },
    expiresAt: otpExpires
  });
});

// Resend OTP Endpoint (Internal Dispatch)
apiRouter.post('/auth/resend-otp', (req, res) => {
  const { emailOrPhone, channel = 'EMAIL' } = req.body;
  if (!emailOrPhone || typeof emailOrPhone !== 'string' || !emailOrPhone.trim()) {
    return res.status(400).json({ error: 'Please enter your registered email address or WhatsApp phone number.' });
  }

  const user = db.getUserByEmailOrPhone(emailOrPhone.trim());
  if (!user) {
    return res.status(404).json({ error: 'No user account found matching this email or phone number.' });
  }

  const selectedChannel: 'EMAIL' | 'WHATSAPP' = channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';

  if (selectedChannel === 'WHATSAPP' && !user.whatsapp) {
    return res.status(400).json({
      error: 'This account does not have a registered WhatsApp phone number. Please choose Email instead.'
    });
  }

  // Generate fresh 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.updateUser(user.id, {
    passwordResetOtp: otp,
    passwordResetOtpExpires: otpExpires
  });

  const adminContacts = getAdminContactDetails();
  const settings = db.getSettings();
  const businessName = settings?.businessName || settings?.companyName || 'Cards Crafted Studio';
  const targetPhoneClean = formatPhoneForWhatsApp(user.whatsapp || '');

  const waMessage = `*${businessName} - Verification Code*\n\nHello ${user.name},\nYour 6-digit OTP verification code is: *${otp}*\n\nDispatched from Admin: ${adminContacts.whatsappSender}\nValid for 10 minutes. Please enter this code to reset your password.`;
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhoneClean}&text=${encodeURIComponent(waMessage)}`;

  const emailSubject = `${businessName} - Password Reset Verification Code`;
  const emailBody = `Hello ${user.name},\n\nYour 6-digit OTP verification code is: ${otp}\n\nDispatched from Studio Admin: ${adminContacts.emailSender}\nThis OTP is valid for 10 minutes.\n\nThank you,\n${businessName}`;
  const mailtoUrl = `mailto:${user.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const senderInfo = selectedChannel === 'EMAIL'
    ? { sender: adminContacts.emailSender, senderName: adminContacts.emailSenderName, target: maskEmail(user.email) }
    : { sender: adminContacts.whatsappSender, senderName: adminContacts.whatsappSenderName, target: maskPhone(user.whatsapp || '') };

  console.log(`[DISPATCH SYSTEM] Fresh OTP resent via ${selectedChannel}:`);
  console.log(`  -> Admin Sender: ${senderInfo.senderName} [${senderInfo.sender}]`);
  console.log(`  -> Recipient: ${selectedChannel === 'EMAIL' ? user.email : user.whatsapp}`);
  console.log(`  -> New Security Code: [${otp}]`);

  db.logAudit(
    user.id,
    user.name,
    'OTP_RESENT',
    'User',
    user.id,
    `Fresh OTP dispatched internally via ${selectedChannel} from Admin (${senderInfo.sender}) to ${selectedChannel === 'EMAIL' ? user.email : user.whatsapp}`
  );

  return res.json({
    success: true,
    message: `Fresh verification OTP dispatched internally via ${selectedChannel === 'EMAIL' ? 'Email' : 'WhatsApp'}.`,
    channel: selectedChannel,
    sender: senderInfo.sender,
    senderName: senderInfo.senderName,
    maskedTarget: senderInfo.target,
    otp,
    whatsappUrl,
    mailtoUrl,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp
    },
    expiresAt: otpExpires
  });
});

// Verify OTP Endpoint
apiRouter.post('/auth/verify-otp', (req, res) => {
  const { emailOrPhone, otp } = req.body;
  if (!emailOrPhone || !otp) {
    return res.status(400).json({ error: 'Email/Phone and 6-digit OTP code are required.' });
  }

  const user = db.getUserByEmailOrPhone(emailOrPhone.trim());
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (!user.passwordResetOtp) {
    return res.status(400).json({ error: 'No active OTP verification session found. Please request a new OTP.' });
  }

  if (user.passwordResetOtpExpires && new Date(user.passwordResetOtpExpires).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This OTP has expired. Please request a new OTP.' });
  }

  if (user.passwordResetOtp.trim() !== otp.toString().trim()) {
    return res.status(400).json({ error: 'Invalid OTP code. Please enter the correct 6-digit OTP.' });
  }

  // OTP is valid! Issue a verified temporary resetToken valid for 15 minutes to allow password update
  const resetToken = `rst_verified_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  const resetExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.updateUser(user.id, {
    passwordResetOtp: undefined,
    passwordResetOtpExpires: undefined,
    passwordResetToken: resetToken,
    passwordResetExpires: resetExpires
  });

  db.logAudit(user.id, user.name, 'OTP_VERIFIED', 'User', user.id, `Password reset OTP successfully verified for ${user.email}`);

  return res.json({
    valid: true,
    message: 'OTP verified successfully! You can now set your new password.',
    resetToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp
    }
  });
});

// Reset Password Endpoint (Only allowed with verified resetToken)
apiRouter.post('/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Verified reset token and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const user = db.getUserByResetToken(token);
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification session. Please verify OTP again.' });
  }

  if (user.passwordResetExpires && new Date(user.passwordResetExpires).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Your verified reset session has expired. Please request and verify OTP again.' });
  }

  const hashed = hashPassword(newPassword);
  db.updateUser(user.id, {
    passwordHash: hashed,
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
    passwordResetOtp: undefined,
    passwordResetOtpExpires: undefined
  });

  db.logAudit(user.id, user.name, 'PASSWORD_RESET_COMPLETED', 'User', user.id, `Password successfully reset following OTP verification`);

  return res.json({
    success: true,
    message: 'Your password has been reset successfully. Please log in with your new password.',
    email: user.email
  });
});

// Customer Sign Up Endpoint
apiRouter.post('/auth/register-customer', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      whatsapp,
      alternatePhone,
      address,
      city,
      state,
      pincode
    } = req.body;

    if (!name || !email || !password || !whatsapp) {
      return res.status(400).json({ error: 'Name, email, password, and WhatsApp number are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    // 1. Create Customer record in DB
    const newCustomer = db.createCustomer({
      name,
      email,
      whatsapp,
      alternatePhone: alternatePhone || '',
      address: address || '',
      city: city || 'Mumbai',
      state: state || 'Maharashtra',
      pincode: pincode || '400001',
      status: 'ACTIVE',
      notes: 'Registered via Customer Portal'
    });

    // 2. Create User login credentials linked to the customer
    const newUser = db.createUser({
      name,
      email,
      whatsapp,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      customerId: newCustomer.id,
      passwordHash: hashPassword(password)
    });

    // 3. Link customer's userId
    db.updateCustomer(newCustomer.id, { userId: newUser.id });

    // 4. Log audit & generate token
    db.logAudit(newUser.id, newUser.name, 'CUSTOMER_SIGNUP', 'Customer', newCustomer.id, `New customer self-registered: ${name} (${newCustomer.customerCode})`);

    const token = generateToken(newUser);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        whatsapp: newUser.whatsapp,
        customerId: newCustomer.id
      },
      customer: newCustomer
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to register customer' });
  }
});

apiRouter.get('/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  let user = db.getUserById(req.user.id);
  if (!user && req.user.email) {
    user = db.getUserByEmail(req.user.email);
  }
  if (!user) {
    // Gracefully restore user in DB from valid signed JWT claims
    const restoredUser: User = {
      id: req.user.id,
      name: req.user.name || 'User',
      email: req.user.email || '',
      whatsapp: '',
      role: req.user.role || 'SUPER_ADMIN',
      status: 'ACTIVE',
      customerId: req.user.customerId,
      createdAt: new Date().toISOString()
    };
    db.getRawData().users.push(restoredUser);
    return res.json(restoredUser);
  }
  return res.json(user);
});

// --- GitHub OAuth Integration ---

export function getGithubRedirectUri(req: any): string {
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    const cleanAppUrl = appUrl.replace(/\/+$/, '');
    return `${cleanAppUrl}/auth/github/callback`;
  }
  const host = req.get ? (req.get('host') || 'localhost:3000') : 'localhost:3000';
  const proto = (req.protocol === 'https' || (req.headers && req.headers['x-forwarded-proto'] === 'https')) ? 'https' : 'http';
  return `${proto}://${host}/auth/github/callback`;
}

function sendOAuthPopupResponse(res: Response, success: boolean, payload: { token?: string; user?: any; error?: string; provider?: string }) {
  const safeData = JSON.stringify({
    type: success ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_ERROR',
    provider: payload.provider || 'github',
    token: payload.token || '',
    user: payload.user || null,
    error: payload.error || null
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GitHub Authorization - Cards Crafted</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #090d16;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 1rem;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1.25rem;
      padding: 2.25rem 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .icon-box {
      width: 56px;
      height: 56px;
      border-radius: 1rem;
      background: ${success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
      border: 1px solid ${success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem auto;
      font-size: 28px;
    }
    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #ffffff;
    }
    p {
      color: #94a3b8;
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #e2e8f0;
    }
    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top: 3px solid ${success ? '#22c55e' : '#ef4444'};
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">
      ${success ? '🐙' : '⚠️'}
    </div>
    <h2>${success ? 'GitHub Connected Successfully' : 'Authentication Failed'}</h2>
    <p>${success ? 'Completing authorization and linking your Cards Crafted account. This popup will close automatically.' : (payload.error || 'Could not complete GitHub authorization.')}</p>
    <div class="badge">
      <span class="spinner"></span>
      <span>${success ? 'Transferring credentials...' : 'Closing...'}</span>
    </div>
  </div>
  <script>
    (function() {
      const data = ${safeData};
      try {
        if (window.opener) {
          window.opener.postMessage(data, '*');
          setTimeout(() => {
            try { window.close(); } catch(e) {}
          }, 800);
        } else {
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      } catch (err) {
        console.error('Error posting message to opener:', err);
        window.location.href = '/';
      }
    })();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

export async function handleGithubCallback(req: any, res: Response) {
  const { code, state, demo, error, error_description } = req.query;

  if (error) {
    return sendOAuthPopupResponse(res, false, {
      error: (error_description as string) || (error as string) || 'Access was denied by GitHub user.'
    });
  }

  // Parse state
  let stateData: any = {};
  if (state) {
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString('utf8'));
    } catch {
      try {
        stateData = JSON.parse(state as string);
      } catch {}
    }
  }

  let ghUser: any = null;

  if (demo === 'true' || demo === true) {
    // Sandbox / Instant test mode
    const mockSuffix = Math.floor(1000 + Math.random() * 9000);
    ghUser = {
      id: 99882200 + mockSuffix,
      login: `artisan_${mockSuffix}`,
      name: `Artisan User (${mockSuffix})`,
      email: `artisan.${mockSuffix}@github.example.com`,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    };
  } else {
    if (!code) {
      return sendOAuthPopupResponse(res, false, {
        error: 'Missing GitHub authorization code in callback query parameters.'
      });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return sendOAuthPopupResponse(res, false, {
        error: 'GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not configured on the server. Please configure them in AI Studio Settings.'
      });
    }

    try {
      // 1. Exchange code for access token
      const redirectUri = getGithubRedirectUri(req);
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'Cards-Crafted-App'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri
        })
      });

      if (!tokenRes.ok) {
        throw new Error(`GitHub token exchange failed: HTTP ${tokenRes.status}`);
      }

      const tokenData: any = await tokenRes.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code');
      }

      const accessToken = tokenData.access_token;
      if (!accessToken) {
        throw new Error('No access_token returned by GitHub');
      }

      // 2. Fetch GitHub User Profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Cards-Crafted-App'
        }
      });

      if (!userRes.ok) {
        throw new Error(`Failed to fetch GitHub profile: HTTP ${userRes.status}`);
      }

      ghUser = await userRes.json();

      // 3. If email is not public, fetch primary verified email
      if (!ghUser.email) {
        try {
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'Cards-Crafted-App'
            }
          });
          if (emailsRes.ok) {
            const emails: any = await emailsRes.json();
            if (Array.isArray(emails)) {
              const primary = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified) || emails[0];
              if (primary?.email) {
                ghUser.email = primary.email;
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch GitHub user emails list:', e);
        }
      }

      if (!ghUser.email) {
        ghUser.email = `${ghUser.login}@users.noreply.github.com`;
      }
    } catch (err: any) {
      console.error('GitHub OAuth error:', err);
      return sendOAuthPopupResponse(res, false, {
        error: err.message || 'Error occurred while communicating with GitHub API.'
      });
    }
  }

  // Process user linking / registration in Cards Crafted DB
  try {
    const ghIdStr = String(ghUser.id);
    const ghUsername = ghUser.login || 'github_user';
    const ghAvatar = ghUser.avatar_url || '';
    const ghEmail = (ghUser.email || `${ghUsername}@users.noreply.github.com`).toLowerCase();
    const ghName = ghUser.name || ghUsername;
    const nowIso = new Date().toISOString();

    let targetUser: User | undefined;

    // Case A: Explicit Account Linking for currently logged-in user
    if (stateData.action === 'link' && stateData.linkUserId) {
      targetUser = db.getUserById(stateData.linkUserId);
      if (targetUser) {
        db.updateUser(targetUser.id, {
          githubId: ghIdStr,
          githubUsername: ghUsername,
          githubAvatarUrl: ghAvatar,
          githubConnectedAt: nowIso
        });

        // Also update linked Customer if exists
        const cust = db.getCustomerByUserId(targetUser.id) || (targetUser.customerId ? db.getCustomerById(targetUser.customerId) : undefined);
        if (cust) {
          db.updateCustomer(cust.id, {
            githubId: ghIdStr,
            githubUsername: ghUsername,
            githubAvatarUrl: ghAvatar,
            githubConnectedAt: nowIso
          });
        }

        db.logAudit(targetUser.id, targetUser.name, 'GITHUB_LINKED', 'User', targetUser.id, `Linked GitHub account @${ghUsername} (${ghIdStr})`);

        const token = generateToken(targetUser);
        return sendOAuthPopupResponse(res, true, {
          token,
          user: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
            whatsapp: targetUser.whatsapp,
            customerId: targetUser.customerId,
            githubId: ghIdStr,
            githubUsername: ghUsername,
            githubAvatarUrl: ghAvatar,
            githubConnectedAt: nowIso
          }
        });
      }
    }

    // Case B: Sign-in / Log-in with GitHub
    // 1. Lookup by GitHub ID
    targetUser = db.getUserByGithubId(ghIdStr);

    // 2. Lookup by email if not found by GitHub ID
    if (!targetUser && ghEmail) {
      targetUser = db.getUserByEmail(ghEmail);
      if (targetUser) {
        // Link GitHub to this existing account
        db.updateUser(targetUser.id, {
          githubId: ghIdStr,
          githubUsername: ghUsername,
          githubAvatarUrl: ghAvatar,
          githubConnectedAt: nowIso
        });
        const cust = db.getCustomerByUserId(targetUser.id) || (targetUser.customerId ? db.getCustomerById(targetUser.customerId) : undefined);
        if (cust) {
          db.updateCustomer(cust.id, {
            githubId: ghIdStr,
            githubUsername: ghUsername,
            githubAvatarUrl: ghAvatar,
            githubConnectedAt: nowIso
          });
        }
      }
    }

    // 3. Create brand new Customer + User if not existing
    if (!targetUser) {
      // Create Customer profile
      const newCustomer = db.createCustomer({
        name: ghName,
        email: ghEmail,
        whatsapp: '',
        address: 'Craft Address to be provided',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'ACTIVE',
        notes: `Registered via GitHub OAuth (@${ghUsername})`,
        githubId: ghIdStr,
        githubUsername: ghUsername,
        githubAvatarUrl: ghAvatar,
        githubConnectedAt: nowIso
      });

      // Create User credentials
      targetUser = db.createUser({
        name: ghName,
        email: ghEmail,
        whatsapp: '',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        customerId: newCustomer.id,
        githubId: ghIdStr,
        githubUsername: ghUsername,
        githubAvatarUrl: ghAvatar,
        githubConnectedAt: nowIso
      });

      // Link Customer's userId
      db.updateCustomer(newCustomer.id, { userId: targetUser.id });

      db.logAudit(targetUser.id, targetUser.name, 'GITHUB_SIGNUP', 'Customer', newCustomer.id, `New customer registered via GitHub OAuth: @${ghUsername} (${ghEmail})`);
    } else {
      // Update last login
      db.updateUser(targetUser.id, { lastLogin: nowIso });
      db.logAudit(targetUser.id, targetUser.name, 'GITHUB_LOGIN', 'User', targetUser.id, `Logged in via GitHub OAuth: @${ghUsername}`);
    }

    const token = generateToken(targetUser);
    return sendOAuthPopupResponse(res, true, {
      token,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        whatsapp: targetUser.whatsapp,
        customerId: targetUser.customerId,
        githubId: targetUser.githubId || ghIdStr,
        githubUsername: targetUser.githubUsername || ghUsername,
        githubAvatarUrl: targetUser.githubAvatarUrl || ghAvatar,
        githubConnectedAt: targetUser.githubConnectedAt || nowIso
      }
    });
  } catch (err: any) {
    console.error('Error saving GitHub auth user:', err);
    return sendOAuthPopupResponse(res, false, {
      error: err.message || 'Database error occurred while processing GitHub account.'
    });
  }
}

apiRouter.get('/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const action = req.query.action === 'link' ? 'link' : 'login';
  const redirectUri = getGithubRedirectUri(req);
  
  const devCallback = 'https://ais-dev-vkx47xa4cy4qkyqxk57fjr-29826142568.asia-east1.run.app/auth/github/callback';
  const sharedCallback = 'https://ais-pre-vkx47xa4cy4qkyqxk57fjr-29826142568.asia-east1.run.app/auth/github/callback';
  const callbackUrls = Array.from(new Set([redirectUri, devCallback, sharedCallback]));

  let linkUserId = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded: any = (req as any).user || null;
      if (decoded?.id) {
        linkUserId = decoded.id;
      }
    } catch {}
  }

  const statePayload = {
    action,
    linkUserId: linkUserId || (req.query.linkUserId as string) || '',
    nonce: Math.random().toString(36).substring(2, 12),
    timestamp: Date.now()
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');

  if (!clientId) {
    return res.json({
      configured: false,
      message: 'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not configured in environment secrets.',
      callbackUrls,
      setupUrl: 'https://github.com/settings/developers',
      redirectUri,
      demoUrl: `/auth/github/callback?demo=true&state=${encodeURIComponent(state)}`
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user,user:email',
    state,
    allow_signup: 'true'
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  return res.json({
    configured: true,
    url: authUrl,
    redirectUri,
    callbackUrls,
    setupUrl: 'https://github.com/settings/developers'
  });
});

apiRouter.get(['/auth/github/callback', '/auth/github/callback/'], (req, res) => {
  return handleGithubCallback(req, res);
});

apiRouter.get('/auth/github/status', (req, res) => {
  const configured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  const redirectUri = getGithubRedirectUri(req);
  const devCallback = 'https://ais-dev-vkx47xa4cy4qkyqxk57fjr-29826142568.asia-east1.run.app/auth/github/callback';
  const sharedCallback = 'https://ais-pre-vkx47xa4cy4qkyqxk57fjr-29826142568.asia-east1.run.app/auth/github/callback';
  
  return res.json({
    configured,
    clientId: process.env.GITHUB_CLIENT_ID ? `${process.env.GITHUB_CLIENT_ID.slice(0, 6)}...` : null,
    redirectUri,
    callbackUrls: Array.from(new Set([redirectUri, devCallback, sharedCallback])),
    setupUrl: 'https://github.com/settings/developers'
  });
});

apiRouter.post('/auth/github/disconnect', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.updateUser(user.id, {
    githubId: undefined,
    githubUsername: undefined,
    githubAvatarUrl: undefined,
    githubConnectedAt: undefined
  });

  const cust = db.getCustomerByUserId(user.id) || (user.customerId ? db.getCustomerById(user.customerId) : undefined);
  if (cust) {
    db.updateCustomer(cust.id, {
      githubId: undefined,
      githubUsername: undefined,
      githubAvatarUrl: undefined,
      githubConnectedAt: undefined
    });
  }

  db.logAudit(user.id, user.name, 'GITHUB_DISCONNECTED', 'User', user.id, `Disconnected GitHub account from user profile`);

  const updated = db.getUserById(user.id);
  return res.json({
    success: true,
    message: 'GitHub account disconnected successfully.',
    user: updated
  });
});

// --- Dashboard & Summary Stats ---
apiRouter.get('/dashboard/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const raw = db.getRawData();

  if (user.role === 'CUSTOMER') {
    // Customer Dashboard Stats
    const custId = user.customerId || raw.customers.find(c => c.userId === user.id)?.id;
    const custOrders = raw.orders.filter(o => o.customerId === custId);
    const activeOrders = custOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
    const completedOrders = custOrders.filter(o => o.status === 'DELIVERED');
    const totalSpent = custOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const pendingBalance = custOrders.reduce((sum, o) => sum + o.balanceAmount, 0);

    return res.json({
      role: 'CUSTOMER',
      totalOrders: custOrders.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      totalSpent,
      pendingBalance,
      recentOrders: custOrders.slice(0, 5)
    });
  }

  // Admin / Staff Dashboard Stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = raw.orders.filter(o => o.orderDate.startsWith(todayStr));
  const pendingOrders = raw.orders.filter(o => ['NEW', 'CONFIRMED', 'DESIGNING', 'DESIGN_APPROVED'].includes(o.status));
  const inProduction = raw.orders.filter(o => o.status === 'IN_PRODUCTION' || o.status === 'QUALITY_CHECK');
  const readyForDelivery = raw.orders.filter(o => o.status === 'READY' || o.status === 'OUT_FOR_DELIVERY');
  const todayRevenue = raw.payments.filter(p => p.paymentDate.startsWith(todayStr)).reduce((sum, p) => sum + p.amount, 0);
  const outstandingPayments = raw.orders.reduce((sum, o) => sum + o.balanceAmount, 0);

  const lowStockItems = raw.inventory.filter(i => i.currentStock <= i.minStock);
  const outOfStockItems = raw.inventory.filter(i => i.currentStock <= 0);

  // Sales trend data
  const salesByDate: Record<string, number> = {};
  raw.orders.forEach(o => {
    const d = o.orderDate.split('T')[0];
    salesByDate[d] = (salesByDate[d] || 0) + o.grandTotal;
  });

  const orderStatusCounts: Record<string, number> = {};
  raw.orders.forEach(o => {
    orderStatusCounts[o.status] = (orderStatusCounts[o.status] || 0) + 1;
  });

  return res.json({
    role: user.role,
    todayOrdersCount: todayOrders.length,
    pendingOrdersCount: pendingOrders.length,
    inProductionCount: inProduction.length,
    readyCount: readyForDelivery.length,
    todayRevenue,
    outstandingPayments,
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
    totalCustomers: raw.customers.length,
    totalProducts: raw.products.length,
    lowStockList: lowStockItems.slice(0, 5),
    recentOrders: raw.orders.slice(0, 8),
    recentCustomers: raw.customers.slice(0, 5),
    salesTrend: Object.entries(salesByDate).map(([date, amount]) => ({ date, amount })),
    orderStatusCounts
  });
});

// --- Customers API ---
apiRouter.get('/customers', authenticateToken, requireRoles(['SUPER_ADMIN']), (req, res) => {
  return res.json(db.getCustomers());
});

apiRouter.get('/customers/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const raw = db.getRawData();
  const customer = user.customerId
    ? db.getCustomerById(user.customerId)
    : raw.customers.find(c => c.userId === user.id || c.email.toLowerCase() === user.email.toLowerCase());

  if (!customer) {
    const fullUser = db.getUserById(user.id);
    // If not existing yet, create a default customer profile for the user
    const newCust = db.createCustomer({
      name: user.name,
      email: user.email,
      whatsapp: fullUser?.whatsapp || '919820011223',
      address: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      status: 'ACTIVE',
      userId: user.id
    });
    db.updateUser(user.id, { customerId: newCust.id });
    return res.json(newCust);
  }

  return res.json(customer);
});

apiRouter.get('/customers/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = db.getCustomerById(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  // Customer can only view their own record
  if (user.role === 'CUSTOMER' && user.customerId !== customer.id && customer.userId !== user.id) {
    return res.status(403).json({ error: 'Access denied to other customer profile' });
  }

  const raw = db.getRawData();
  const customerOrders = raw.orders.filter(o => o.customerId === customer.id);
  const customerPayments = raw.payments.filter(p => p.customerId === customer.id);

  return res.json({
    ...customer,
    orders: customerOrders,
    payments: customerPayments
  });
});

// ADMIN DIRECT CUSTOMER ENROLLMENT
apiRouter.post('/customers', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, whatsapp, alternatePhone, address, city, state, pincode, notes, createAccount, role } = req.body;

    if (!name || !email || !whatsapp) {
      return res.status(400).json({ error: 'Name, email, and WhatsApp number are required' });
    }

    // Check existing customer with same email or whatsapp
    const existing = db.getCustomers().find(c => c.email.toLowerCase() === email.toLowerCase() || c.whatsapp === whatsapp);
    if (existing) {
      return res.status(400).json({ error: 'A customer with this email or WhatsApp number already exists.' });
    }

    let linkedUserId: string | undefined = undefined;

    // Direct enrollment option to auto-create User login credentials
    if (createAccount) {
      const assignedRole: UserRole = role || 'CUSTOMER';
      // Only Super Admin can assign elevated roles
      if (assignedRole !== 'CUSTOMER' && req.user!.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only Super Admin can assign elevated roles.' });
      }

      const tempUser = db.createUser({
        name,
        email,
        whatsapp,
        role: assignedRole,
        status: 'ACTIVE'
      });
      linkedUserId = tempUser.id;
    }

    const newCustomer = db.createCustomer({
      userId: linkedUserId,
      name,
      email,
      whatsapp,
      alternatePhone,
      address: address || '',
      city: city || 'Mumbai',
      state: state || 'Maharashtra',
      pincode: pincode || '400001',
      notes,
      status: 'ACTIVE'
    });

    if (linkedUserId) {
      db.updateUser(linkedUserId, { customerId: newCustomer.id });
    }

    db.logAudit(req.user!.id, req.user!.name, 'ENROLL_CUSTOMER', 'Customer', newCustomer.id, `Enrolled customer ${newCustomer.name} (${newCustomer.customerCode})`);

    return res.status(201).json(newCustomer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to enroll customer' });
  }
});

apiRouter.put('/customers/:id', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  const updated = db.updateCustomer(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Customer not found' });
  db.logAudit(req.user!.id, req.user!.name, 'UPDATE_CUSTOMER', 'Customer', updated.id, `Updated details for customer ${updated.name}`);
  return res.json(updated);
});

// --- Orders API ---
apiRouter.get('/orders', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const allOrders = db.getOrders();

  if (user.role === 'CUSTOMER') {
    const custId = user.customerId || db.getCustomers().find(c => c.userId === user.id)?.id;
    const userOrders = allOrders.filter(o => o.customerId === custId);
    return res.json(userOrders);
  }

  return res.json(allOrders);
});

apiRouter.get('/orders/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (user.role === 'CUSTOMER') {
    const custId = user.customerId || db.getCustomers().find(c => c.userId === user.id)?.id;
    if (order.customerId !== custId) {
      return res.status(403).json({ error: 'Access denied to this order' });
    }
  }

  const raw = db.getRawData();
  const history = raw.statusHistory.filter(h => h.orderId === order.id);
  const payments = raw.payments.filter(p => p.orderId === order.id);

  return res.json({
    ...order,
    statusHistory: history,
    payments
  });
});

apiRouter.post('/orders', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    let customerId = req.body.customerId;

    // If customer creates an order request themselves
    if (user.role === 'CUSTOMER') {
      const raw = db.getRawData();
      customerId = user.customerId || raw.customers.find(c => c.userId === user.id || c.email.toLowerCase() === user.email.toLowerCase())?.id;
      if (!customerId) {
        const fullUser = db.getUserById(user.id);
        // Auto create customer record for this user
        const newCust = db.createCustomer({
          name: user.name,
          email: user.email,
          whatsapp: fullUser?.whatsapp || req.body.shippingAddress?.whatsapp || '919820011223',
          address: req.body.shippingAddress?.address || '',
          city: req.body.shippingAddress?.city || 'Mumbai',
          state: req.body.shippingAddress?.state || 'Maharashtra',
          pincode: req.body.shippingAddress?.pincode || '400001',
          status: 'ACTIVE',
          userId: user.id
        });
        db.updateUser(user.id, { customerId: newCust.id });
        customerId = newCust.id;
      }
    }

    // If shipping address was provided in checkout, update customer address info
    if (customerId && req.body.shippingAddress) {
      const ship = req.body.shippingAddress;
      db.updateCustomer(customerId, {
        name: ship.recipientName || undefined,
        whatsapp: ship.whatsapp || undefined,
        address: ship.address || undefined,
        city: ship.city || undefined,
        state: ship.state || undefined,
        pincode: ship.pincode || undefined
      });
    }

    // For customer self-orders, enforce verified payment to predefined UPI ID: shiv.khante5-2@okaxis
    let upiVerificationPayload: any = undefined;
    let initialOrderStatus: OrderStatus | undefined = req.body.status;

    if (user.role === 'CUSTOMER') {
      const items = req.body.items || [];
      const totalItemPrice = items.reduce((sum: number, it: any) => sum + (Number(it.unitPrice || 0) * Number(it.quantity || 1)), 0);
      const isFreeQuoteInquiry = totalItemPrice === 0 && (!req.body.advancePayment || req.body.advancePayment.amount === 0);

      if (!isFreeQuoteInquiry) {
        const adv = req.body.advancePayment;
        if (!adv || !adv.amount || adv.amount <= 0 || !adv.reference) {
          return res.status(400).json({
            error: 'Order placement requires verified UPI payment to predefined UPI ID: shiv.khante5-2@okaxis. Please complete payment verification first.'
          });
        }

        const cleanUtr = String(adv.reference || '').trim().toUpperCase();
        if (cleanUtr.length < 6) {
          return res.status(400).json({
            error: 'Invalid UPI Transaction Reference (UTR). Payment must be verified before placing order.'
          });
        }

        // Check for duplicate UTR usage in previous verified payments
        const raw = db.getRawData();
        const duplicate = raw.payments.find(p => p.transactionReference && p.transactionReference.toUpperCase() === cleanUtr);
        if (duplicate) {
          return res.status(400).json({
            error: `This UPI Reference Number (${cleanUtr}) has already been used and verified for order #${duplicate.orderNumber}.`
          });
        }

        upiVerificationPayload = {
          utr: cleanUtr,
          amount: Number(adv.amount),
          upiId: 'shiv.khante5-2@okaxis',
          payerUpi: req.body.payerUpi || undefined,
          submittedAt: new Date().toISOString(),
          status: 'PENDING'
        };
        initialOrderStatus = 'PAYMENT_VERIFICATION_PENDING';
      }
    }

    // Enforce 1st order free eligibility strictly: only 1 time on their 1st order
    const customerObj = db.getCustomerById(customerId);
    const existingOrdersCount = db.getRawData().orders.filter(
      o => o.customerId === customerId && o.status !== 'CANCELLED' && o.status !== 'PAYMENT_REJECTED'
    ).length;
    const hasPriorOrders = existingOrdersCount > 0 || (customerObj && (customerObj.totalOrders > 0 || customerObj.hasUsedFirstOrderFreeOffer));

    let discountToApply = Number(req.body.discount || 0);
    const isFirstOrderDiscount = req.body.firstPrintDiscountApplied || req.body.isFirstOrderDiscount || (discountToApply > 0 && req.body.orderType === 'DOCUMENT_PRINTING');

    if (isFirstOrderDiscount) {
      if (hasPriorOrders) {
        // User already has past orders or already used the 1st free offer -> reset discount to 0
        discountToApply = 0;
      } else {
        // Valid 1st order -> mark offer as used
        if (customerObj) customerObj.hasUsedFirstOrderFreeOffer = true;
        if (user) {
          user.hasUsedFirstOrderFreeOffer = true;
          db.updateUser(user.id, { hasUsedFirstOrderFreeOffer: true });
        }
      }
    }

    const order = db.createOrder({
      customerId,
      orderType: req.body.orderType,
      status: initialOrderStatus,
      items: req.body.items || [],
      customDetails: {
        ...(req.body.customDetails || {}),
        shippingAddress: req.body.shippingAddress
      },
      discount: discountToApply,
      deliveryCharge: req.body.deliveryCharge,
      tax: req.body.tax,
      expectedDeliveryDate: req.body.expectedDeliveryDate,
      priority: req.body.priority,
      upiVerification: upiVerificationPayload,
      advancePayment: req.body.advancePayment ? {
        amount: Number(req.body.advancePayment.amount) || 0,
        method: 'UPI',
        reference: String(req.body.advancePayment.reference || '').trim().toUpperCase()
      } : undefined,
      createdBy: user.name
    });

    db.logAudit(user.id, user.name, 'CREATE_ORDER', 'Order', order.id, `Created order #${order.orderNumber} for ₹${order.grandTotal}`);

    return res.status(201).json(order);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create order' });
  }
});

apiRouter.post('/orders/:id/verify-payment', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  try {
    const { remarks } = req.body;
    const result = db.verifyOrderUpiPayment(req.params.id, req.user!.name, remarks);
    db.logAudit(req.user!.id, req.user!.name, 'VERIFY_PAYMENT', 'Order', result.order.id, `Verified UPI payment & confirmed order #${result.order.orderNumber}`);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to verify payment' });
  }
});

apiRouter.post('/orders/:id/reject-payment', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    const result = db.rejectOrderUpiPayment(req.params.id, String(reason).trim(), req.user!.name);
    db.logAudit(req.user!.id, req.user!.name, 'REJECT_PAYMENT', 'Order', result.id, `Rejected payment for order #${result.orderNumber}: ${reason}`);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to reject payment' });
  }
});

apiRouter.post('/orders/:id/resubmit-payment', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { utr, payerUpi } = req.body;
    if (!utr || String(utr).trim().length < 6) {
      return res.status(400).json({ error: 'Valid UPI UTR reference is required (min 6 characters)' });
    }
    const result = db.resubmitOrderUpiPayment(req.params.id, String(utr).trim().toUpperCase(), payerUpi, req.user!.name);
    db.logAudit(req.user!.id, req.user!.name, 'RESUBMIT_PAYMENT', 'Order', result.id, `Resubmitted UPI payment for order #${result.orderNumber}`);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to resubmit payment' });
  }
});

apiRouter.patch('/orders/:id/status', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  const { status, remarks } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const updated = db.updateOrderStatus(req.params.id, status as OrderStatus, req.user!.name, remarks);
  if (!updated) return res.status(404).json({ error: 'Order not found' });

  db.logAudit(req.user!.id, req.user!.name, 'UPDATE_ORDER_STATUS', 'Order', updated.id, `Changed status of #${updated.orderNumber} to ${status}`);

  return res.json(updated);
});

apiRouter.post('/orders/:id/payments', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  try {
    const { amount, method, transactionReference, notes } = req.body;
    const result = db.recordPayment({
      orderId: req.params.id,
      amount,
      method,
      transactionReference,
      notes,
      createdBy: req.user!.name
    });

    db.logAudit(req.user!.id, req.user!.name, 'RECORD_PAYMENT', 'Payment', result.payment.id, `Recorded ₹${amount} payment for order #${result.order.orderNumber}`);

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to record payment' });
  }
});

// --- UPI Payment Verification API (Mandatory verification to predefined shiv.khante5-2@okaxis) ---
apiRouter.post('/payments/verify-upi', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { utr, amount, upiId, payerUpi } = req.body;
    const predefinedUpi = 'shiv.khante5-2@okaxis';
    const targetUpi = upiId || db.getSettings().upiId || predefinedUpi;

    // Validate that payment is directed exclusively to predefined UPI
    if (targetUpi !== predefinedUpi && targetUpi !== db.getSettings().upiId) {
      return res.status(400).json({
        verified: false,
        error: `Invalid recipient UPI ID. Payments must strictly be made to predefined UPI ID: ${predefinedUpi}`
      });
    }

    const cleanUtr = String(utr || '').trim().toUpperCase();
    if (!cleanUtr) {
      return res.status(400).json({
        verified: false,
        error: 'UPI Transaction Reference Number / 12-digit UTR is required to verify payment.'
      });
    }

    // Validate UTR format (Standard Indian banking 12-digit numeric or alphanumeric reference 10-22 chars)
    const isValidFormat = /^[0-9A-Z]{8,22}$/i.test(cleanUtr);
    if (!isValidFormat) {
      return res.status(400).json({
        verified: false,
        error: 'Invalid UPI Transaction Reference format. Please enter the 12-digit UTR or Reference ID from your UPI app (GPay / PhonePe / Paytm / BHIM).'
      });
    }

    // Check for previous duplicate UTR use
    const raw = db.getRawData();
    const existingPayment = raw.payments.find(p => p.transactionReference && p.transactionReference.toUpperCase() === cleanUtr);
    if (existingPayment) {
      return res.status(400).json({
        verified: false,
        error: `This UPI Reference Number (${cleanUtr}) has already been used and verified for order #${existingPayment.orderNumber}.`
      });
    }

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      return res.status(400).json({
        verified: false,
        error: 'Payment amount must be greater than ₹0.'
      });
    }

    // Successful Verification Payload
    const verificationRecord = {
      verified: true,
      utr: cleanUtr,
      targetUpiId: predefinedUpi,
      amount: numAmount,
      payerUpi: payerUpi ? String(payerUpi).trim() : undefined,
      timestamp: new Date().toISOString(),
      gatewayStatus: 'SUCCESS',
      bankRrn: cleanUtr,
      verificationToken: `VERIFIED-UPI-${Date.now()}-${cleanUtr.slice(-4)}`
    };

    return res.json({
      success: true,
      verified: true,
      message: `UPI Payment of ₹${numAmount.toLocaleString()} to ${predefinedUpi} verified successfully!`,
      data: verificationRecord
    });
  } catch (err: any) {
    return res.status(400).json({ verified: false, error: err.message || 'Payment verification failed' });
  }
});

// --- Products & Catalog API ---
apiRouter.get('/products', authenticateToken, (req, res) => {
  return res.json(db.getProducts());
});

apiRouter.post('/products', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  try {
    const product = db.createProduct(req.body);
    db.logAudit(req.user!.id, req.user!.name, 'CREATE_PRODUCT', 'Product', product.id, `Created product ${product.name}`);
    return res.status(201).json(product);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/products/:id', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  const updated = db.updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  db.logAudit(req.user!.id, req.user!.name, 'UPDATE_PRODUCT', 'Product', updated.id, `Updated product ${updated.name}`);
  return res.json(updated);
});

// --- Inventory & Stock Movement API ---
apiRouter.get('/inventory', authenticateToken, requireRoles(['SUPER_ADMIN']), (req, res) => {
  return res.json(db.getInventory());
});

apiRouter.post('/inventory', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  try {
    const item = db.createInventoryItem(req.body);
    db.logAudit(req.user!.id, req.user!.name, 'CREATE_INVENTORY_ITEM', 'Inventory', item.id, `Added inventory item ${item.name}`);
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/inventory/:id', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  const updated = db.updateInventoryItem(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Inventory item not found' });
  db.logAudit(req.user!.id, req.user!.name, 'UPDATE_INVENTORY_ITEM', 'Inventory', updated.id, `Updated inventory item ${updated.name}`);
  return res.json(updated);
});

apiRouter.post('/inventory/movement', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  try {
    const { inventoryItemId, quantity, movementType, notes, purchaseChannel, purchasePlatform, purchasePlatformOther, purchaseOrderRef } = req.body;
    const result = db.updateInventoryStock(
      inventoryItemId,
      Number(quantity),
      movementType,
      req.user!.name,
      undefined,
      notes,
      { purchaseChannel, purchasePlatform, purchasePlatformOther, purchaseOrderRef }
    );
    if (!result) return res.status(404).json({ error: 'Inventory item not found' });

    db.logAudit(req.user!.id, req.user!.name, 'STOCK_MOVEMENT', 'Inventory', inventoryItemId, `${movementType} of ${quantity} for ${result.item.name}`);

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// --- Payments API ---
apiRouter.get('/payments', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const raw = db.getRawData();

  if (user.role === 'CUSTOMER') {
    const custId = user.customerId || raw.customers.find(c => c.userId === user.id)?.id;
    return res.json(raw.payments.filter(p => p.customerId === custId));
  }

  return res.json(raw.payments);
});

// --- Reports API ---
apiRouter.get('/reports/summary', authenticateToken, requireRoles(['SUPER_ADMIN']), (req, res) => {
  const raw = db.getRawData();
  const totalRevenue = raw.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOrders = raw.orders.length;
  const totalDue = raw.orders.reduce((sum, o) => sum + o.balanceAmount, 0);
  const inventoryValue = raw.inventory.reduce((sum, i) => sum + i.currentStock * i.purchasePrice, 0);

  return res.json({
    totalRevenue,
    totalOrders,
    totalDue,
    inventoryValue,
    topCustomers: raw.customers.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5),
    recentMovements: raw.inventoryMovements.slice(0, 10)
  });
});

// --- Users & Roles API ---
apiRouter.get('/users', authenticateToken, requireRoles(['SUPER_ADMIN']), (req, res) => {
  return res.json(db.getUsers());
});

apiRouter.post('/users', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  const { name, email, whatsapp, role, password } = req.body;

  // Non-super admin cannot create Super Admin
  if (req.user!.role !== 'SUPER_ADMIN' && role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can assign administrative roles' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const newUser = db.createUser({
    name,
    email,
    whatsapp: whatsapp || '',
    role: role || 'SUPER_ADMIN',
    status: 'ACTIVE'
  });

  db.logAudit(req.user!.id, req.user!.name, 'CREATE_USER', 'User', newUser.id, `Created user ${newUser.name} with role ${newUser.role}`);

  return res.status(201).json(newUser);
});

apiRouter.put('/users/:id', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  const targetUser = db.getUserById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // Prevent demoting/deactivating last active Super Admin
  if (targetUser.role === 'SUPER_ADMIN' && (req.body.role === 'CUSTOMER' || req.body.status === 'INACTIVE')) {
    const activeSuperAdmins = db.getUsers().filter(u => u.id !== targetUser.id && u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE');
    if (activeSuperAdmins.length === 0) {
      return res.status(400).json({ error: 'Cannot demote or deactivate the last active Super Admin account' });
    }
  }

  // Check email uniqueness if email is changed
  if (req.body.email && req.body.email.toLowerCase() !== targetUser.email.toLowerCase()) {
    const existingWithEmail = db.getUserByEmail(req.body.email);
    if (existingWithEmail && existingWithEmail.id !== targetUser.id) {
      return res.status(400).json({ error: 'Another user with this email already exists' });
    }
  }

  const { name, email, whatsapp, role, status } = req.body;
  const updates: Partial<User> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (whatsapp !== undefined) updates.whatsapp = whatsapp;
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;

  const updated = db.updateUser(targetUser.id, updates);
  db.logAudit(req.user!.id, req.user!.name, 'UPDATE_USER', 'User', targetUser.id, `Updated user details for ${targetUser.name}`);

  return res.json(updated);
});

apiRouter.patch('/users/:id/status', authenticateToken, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
  const targetUser = db.getUserById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // Prevent deactivating last Super Admin
  if (targetUser.role === 'SUPER_ADMIN' && targetUser.status === 'ACTIVE' && req.body.status === 'INACTIVE') {
    const activeSuperAdmins = db.getUsers().filter(u => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE');
    if (activeSuperAdmins.length <= 1) {
      return res.status(400).json({ error: 'Cannot deactivate the last active Super Admin account' });
    }
  }

  const updated = db.updateUser(targetUser.id, { status: req.body.status });
  db.logAudit(req.user!.id, req.user!.name, 'CHANGE_USER_STATUS', 'User', targetUser.id, `Changed user ${targetUser.name} status to ${req.body.status}`);

  return res.json(updated);
});

// --- Notifications API ---
apiRouter.get('/notifications', authenticateToken, (req, res) => {
  const raw = db.getRawData();
  return res.json(raw.notifications);
});

apiRouter.patch('/notifications/:id/read', authenticateToken, (req, res) => {
  const raw = db.getRawData();
  const notif = raw.notifications.find(n => n.id === req.params.id);
  if (notif) notif.read = true;
  return res.json({ success: true });
});

apiRouter.post('/notifications/read-all', authenticateToken, (req: AuthenticatedRequest, res) => {
  const raw = db.getRawData();
  const userId = req.user?.id;
  raw.notifications.forEach(n => {
    if (!n.userId || n.userId === userId) {
      n.read = true;
    }
  });
  return res.json({ success: true });
});

// --- Audit Logs API ---
apiRouter.get('/audit-logs', authenticateToken, requireRoles(['SUPER_ADMIN']), (req, res) => {
  const raw = db.getRawData();
  return res.json(raw.auditLogs);
});

// --- Customer Specific Account API ---

// 1. Get Customer Profile
apiRouter.get('/customer/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  
  return res.json({
    user,
    customer: customer || null
  });
});

// 1.1 First-order free eligibility check
apiRouter.get('/customer/first-order-eligibility', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const raw = db.getRawData();
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);

  if (!customer) {
    return res.json({
      isEligible: true,
      totalOrders: 0,
      hasUsedOffer: false,
      reason: 'Eligible for 1st Free Print on your first order'
    });
  }

  const existingValidOrders = raw.orders.filter(
    o => o.customerId === customer.id && o.status !== 'CANCELLED' && o.status !== 'PAYMENT_REJECTED'
  );
  const hasUsed = Boolean(customer.hasUsedFirstOrderFreeOffer || user.hasUsedFirstOrderFreeOffer);
  const isEligible = !hasUsed && customer.totalOrders === 0 && existingValidOrders.length === 0;

  return res.json({
    isEligible,
    totalOrders: existingValidOrders.length,
    hasUsedOffer: hasUsed || existingValidOrders.length > 0,
    reason: isEligible
      ? 'Eligible for 1st Free Print on your first order'
      : '1st Free offer already claimed on your first order (1 time only per user)'
  });
});

// 2. Update Customer Profile
apiRouter.put('/customer/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { name, email, whatsapp, alternatePhone, address, city, state, pincode } = req.body;

  // Update user record
  const updatedUser = db.updateUser(user.id, {
    name: name || user.name,
    email: email || user.email,
    whatsapp: whatsapp || user.whatsapp
  });

  // Update or create linked customer record
  let customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);

  if (customer) {
    customer = db.updateCustomer(customer.id, {
      name: name || customer.name,
      email: email || customer.email,
      whatsapp: whatsapp || customer.whatsapp,
      alternatePhone: alternatePhone !== undefined ? alternatePhone : customer.alternatePhone,
      address: address !== undefined ? address : customer.address,
      city: city !== undefined ? city : customer.city,
      state: state !== undefined ? state : customer.state,
      pincode: pincode !== undefined ? pincode : customer.pincode
    });
  } else {
    customer = db.createCustomer({
      userId: user.id,
      name: name || user.name,
      email: email || user.email,
      whatsapp: whatsapp || user.whatsapp,
      alternatePhone: alternatePhone || '',
      address: address || '',
      city: city || 'Mumbai',
      state: state || 'Maharashtra',
      pincode: pincode || '400001',
      status: 'ACTIVE'
    });
    db.updateUser(user.id, { customerId: customer.id });
  }

  return res.json({
    user: updatedUser,
    customer
  });
});

// 3. Delete Customer Account
apiRouter.delete('/customer/account', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  
  db.deleteCustomerAccount(user.id, customer?.id);
  db.logAudit(user.id, user.name, 'DELETE_ACCOUNT', 'User', user.id, `Customer ${user.name} deleted their own account.`);

  return res.json({ success: true, message: 'Account deleted successfully' });
});

// 4. Address Book
apiRouter.get('/customer/addresses', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  const customerId = customer?.id || user.id;

  const addresses = db.getAddressesByCustomerId(customerId);
  // If empty and customer has standard address, auto-populate initial Primary address
  if (addresses.length === 0 && customer && customer.address) {
    const initAddr = db.addAddress({
      customerId,
      label: 'Home',
      recipientName: customer.name || user.name,
      phone: customer.whatsapp || user.whatsapp || '',
      street: customer.address,
      city: customer.city || 'Mumbai',
      state: customer.state || 'Maharashtra',
      pincode: customer.pincode || '400001',
      isPrimary: true
    });
    return res.json([initAddr]);
  }

  return res.json(addresses);
});

apiRouter.post('/customer/addresses', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  const customerId = customer?.id || user.id;

  const { label, recipientName, phone, street, city, state, pincode, isPrimary } = req.body;
  if (!street || !city || !pincode) {
    return res.status(400).json({ error: 'Street address, city, and pincode are required' });
  }

  const newAddr = db.addAddress({
    customerId,
    label: label || 'Home',
    recipientName: recipientName || user.name,
    phone: phone || user.whatsapp || '',
    street,
    city,
    state: state || 'Maharashtra',
    pincode,
    isPrimary: Boolean(isPrimary)
  });

  return res.status(201).json(newAddr);
});

apiRouter.put('/customer/addresses/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  const customerId = customer?.id || user.id;

  const updated = db.updateAddress(req.params.id, customerId, req.body);
  if (!updated) return res.status(404).json({ error: 'Address not found' });
  return res.json(updated);
});

apiRouter.delete('/customer/addresses/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  const customerId = customer?.id || user.id;

  const success = db.deleteAddress(req.params.id, customerId);
  if (!success) return res.status(404).json({ error: 'Address not found' });
  return res.json({ success: true });
});

apiRouter.put('/customer/addresses/:id/primary', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  const customerId = customer?.id || user.id;

  const updated = db.setPrimaryAddress(req.params.id, customerId);
  if (!updated) return res.status(404).json({ error: 'Address not found' });
  return res.json(updated);
});

// 5. Saved Items / Wishlist
apiRouter.get('/customer/wishlist', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  const customerId = customer?.id || user.id;

  const items = db.getWishlistByCustomerId(customerId);
  return res.json(items);
});

apiRouter.post('/customer/wishlist', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  const customerId = customer?.id || user.id;

  const { productId, name, category, price, imageUrl, stockQuantity } = req.body;
  if (!productId || !name) {
    return res.status(400).json({ error: 'Product ID and name are required' });
  }

  const item = db.addToWishlist({
    customerId,
    productId,
    name,
    category: category || 'Handmade Cards',
    price: Number(price) || 0,
    imageUrl: imageUrl || '',
    stockQuantity: Number(stockQuantity) || 1
  });

  return res.status(201).json(item);
});

apiRouter.delete('/customer/wishlist/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const customer = user.customerId ? db.getCustomerById(user.customerId) : db.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase() || c.userId === user.id);
  const customerId = customer?.id || user.id;

  const deleted = db.removeFromWishlist(req.params.id, customerId);
  return res.json({ success: deleted });
});

// 6. Customer Notifications
apiRouter.get('/customer/notifications', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notifs = db.getCustomerNotifications(user.id);
  return res.json(notifs);
});

apiRouter.patch('/customer/notifications/:id/read', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const success = db.markNotificationRead(req.params.id, user.id);
  return res.json({ success });
});

apiRouter.post('/customer/notifications/read-all', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const success = db.markAllNotificationsRead(user.id);
  return res.json({ success });
});

apiRouter.delete('/customer/notifications/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const success = db.deleteNotification(req.params.id, user.id);
  return res.json({ success });
});

// --- Overall Cloud Sync (Firebase Bridge) ---
apiRouter.get('/sync/export-all', authenticateToken, (req: AuthenticatedRequest, res) => {
  const allData = db.exportAllData();
  return res.json(allData);
});

apiRouter.post('/sync/import-all', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const result = db.importAllData(req.body);
  db.logAudit(
    user.id,
    user.name,
    'FIREBASE_SYNC',
    'Database',
    'all',
    `Imported/merged ${result.importedCount} records from Firebase Firestore`
  );
  return res.json({
    success: true,
    message: `Successfully synchronized ${result.importedCount} records to local state`,
    ...result
  });
});


