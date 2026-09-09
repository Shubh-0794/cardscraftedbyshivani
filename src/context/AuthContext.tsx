import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  registerCustomer: (customerData: {
    name: string;
    email: string;
    password: string;
    whatsapp: string;
    alternatePhone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) => Promise<User>;
  connectWithGithub: (action?: 'login' | 'link') => Promise<{ success: boolean; user?: User; error?: string }>;
  disconnectGithub: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshCurrentUser = async () => {
    const token = getAuthToken();
    if (token) {
      try {
        const userData = await api.getMe();
        setUser(userData);
        return userData;
      } catch {
        removeAuthToken();
        setUser(null);
      }
    }
    return null;
  };

  useEffect(() => {
    async function loadUser() {
      await refreshCurrentUser();
      setIsLoading(false);
    }
    loadUser();

    // Listen for OAuth messages from popup windows
    const handleOAuthMessage = async (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin || '';
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.token) {
          setAuthToken(event.data.token);
        }
        if (event.data.user) {
          setUser(event.data.user);
        } else {
          await refreshCurrentUser();
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await api.login({ email, password: pass });
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const registerCustomer = async (customerData: {
    name: string;
    email: string;
    password: string;
    whatsapp: string;
    alternatePhone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }): Promise<User> => {
    const res = await api.registerCustomer(customerData);
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const connectWithGithub = async (action: 'login' | 'link' = 'login'): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const res = await api.getGithubAuthUrl(action);
      const targetUrl = res.url || res.demoUrl;

      if (!targetUrl) {
        throw new Error(res.message || 'Unable to generate GitHub authorization URL.');
      }

      return new Promise((resolve) => {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const authWindow = window.open(
          targetUrl,
          'github_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
        );

        if (!authWindow) {
          resolve({ success: false, error: 'Popup window blocked. Please allow popups for this site to connect GitHub.' });
          return;
        }

        let isResolved = false;

        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
            window.removeEventListener('message', messageHandler);
            if (!isResolved) {
              isResolved = true;
              if (event.data.token) {
                setAuthToken(event.data.token);
              }
              if (event.data.user) {
                setUser(event.data.user);
                resolve({ success: true, user: event.data.user });
              } else {
                refreshCurrentUser().then((u) => resolve({ success: true, user: u || undefined }));
              }
            }
          } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
            window.removeEventListener('message', messageHandler);
            if (!isResolved) {
              isResolved = true;
              resolve({ success: false, error: event.data.error || 'GitHub authorization failed.' });
            }
          }
        };

        window.addEventListener('message', messageHandler);

        // Check if window was closed by user
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            if (!isResolved) {
              isResolved = true;
              // Refresh user in case it succeeded just before closing
              refreshCurrentUser().then((u) => {
                resolve({ success: true, user: u || undefined });
              });
            }
          }
        }, 1000);
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to initiate GitHub OAuth flow.' };
    }
  };

  const disconnectGithub = async () => {
    const res = await api.disconnectGithub();
    if (res.user) {
      setUser(res.user);
    } else {
      await refreshCurrentUser();
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || (user?.role as any) === 'ADMIN';
  const isAdmin = isSuperAdmin;
  const isStaff = isSuperAdmin;
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        registerCustomer,
        logout,
        hasRole,
        isSuperAdmin,
        isAdmin,
        isStaff,
        isCustomer
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
