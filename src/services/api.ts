import {
  User,
  Customer,
  Product,
  InventoryItem,
  Order,
  Payment,
  SystemSettings,
  Notification,
  AuditLog,
  OrderStatus,
  StockMovementType,
  CustomerAddress,
  WishlistItem
} from '../types';
import { firestoreService } from './firestoreService';

const TOKEN_KEY = 'craftflow_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! Status: ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    fetchApi<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }).then(res => {
      firestoreService.saveUser(res.user).catch(() => {});
      return res;
    }),

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
  }) =>
    fetchApi<{ token: string; user: User; customer: Customer }>('/auth/register-customer', {
      method: 'POST',
      body: JSON.stringify(customerData)
    }).then(res => {
      firestoreService.saveUser(res.user).catch(() => {});
      return res;
    }),

  forgotPassword: (emailOrPhone: string, channel: 'EMAIL' | 'WHATSAPP' = 'EMAIL') =>
    fetchApi<{
      success: boolean;
      message: string;
      channel: 'EMAIL' | 'WHATSAPP';
      sender: string;
      senderName: string;
      maskedTarget: string;
      otp?: string;
      whatsappUrl?: string;
      mailtoUrl?: string;
      user: { id: string; name: string; email: string; whatsapp: string };
      expiresAt: string;
    }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, channel })
    }),

  resendOtp: (emailOrPhone: string, channel: 'EMAIL' | 'WHATSAPP' = 'EMAIL') =>
    fetchApi<{
      success: boolean;
      message: string;
      channel: 'EMAIL' | 'WHATSAPP';
      sender: string;
      senderName: string;
      maskedTarget: string;
      otp?: string;
      whatsappUrl?: string;
      mailtoUrl?: string;
      user: { id: string; name: string; email: string; whatsapp: string };
      expiresAt: string;
    }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, channel })
    }),

  verifyOtp: (emailOrPhone: string, otp: string) =>
    fetchApi<{
      valid: boolean;
      message: string;
      resetToken: string;
      user: { id: string; name: string; email: string; whatsapp: string };
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, otp })
    }),

  resetPassword: (payload: { token: string; newPassword: string }) =>
    fetchApi<{
      success: boolean;
      message: string;
      email: string;
    }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMe: () => fetchApi<User>('/auth/me'),

  // Dashboard stats
  getDashboardStats: () => fetchApi<any>('/dashboard/stats'),

  // Customers
  getCustomers: () => fetchApi<Customer[]>('/customers'),
  getMyCustomerProfile: () => fetchApi<Customer>('/customers/me'),
  getCustomerById: (id: string) => fetchApi<Customer & { orders: Order[]; payments: Payment[] }>(`/customers/${id}`),
  createCustomer: (customerData: any) =>
    fetchApi<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    }).then(cust => {
      firestoreService.saveCustomer(cust).catch(() => {});
      return cust;
    }),
  updateCustomer: (id: string, updates: Partial<Customer>) =>
    fetchApi<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }).then(cust => {
      firestoreService.saveCustomer(cust).catch(() => {});
      return cust;
    }),

  // Orders
  getOrders: () => fetchApi<Order[]>('/orders'),
  getOrderById: (id: string) => fetchApi<Order & { statusHistory: any[]; payments: Payment[] }>(`/orders/${id}`),
  createOrder: (orderData: any) =>
    fetchApi<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    }).then(ord => {
      firestoreService.saveOrder(ord).catch(() => {});
      return ord;
    }),
  updateOrderStatus: (id: string, status: OrderStatus, remarks?: string) =>
    fetchApi<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks })
    }).then(ord => {
      firestoreService.saveOrder(ord).catch(() => {});
      return ord;
    }),
  verifyOrderPayment: (id: string, remarks?: string) =>
    fetchApi<{ order: Order; payment: Payment }>(`/orders/${id}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ remarks })
    }).then(res => {
      firestoreService.savePayment(res.payment).catch(() => {});
      firestoreService.saveOrder(res.order).catch(() => {});
      return res;
    }),
  rejectOrderPayment: (id: string, reason: string) =>
    fetchApi<Order>(`/orders/${id}/reject-payment`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }).then(ord => {
      firestoreService.saveOrder(ord).catch(() => {});
      return ord;
    }),
  resubmitOrderPayment: (id: string, utr: string, payerUpi?: string) =>
    fetchApi<Order>(`/orders/${id}/resubmit-payment`, {
      method: 'POST',
      body: JSON.stringify({ utr, payerUpi })
    }).then(ord => {
      firestoreService.saveOrder(ord).catch(() => {});
      return ord;
    }),
  recordOrderPayment: (id: string, paymentData: any) =>
    fetchApi<{ payment: Payment; order: Order }>(`/orders/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    }).then(res => {
      firestoreService.savePayment(res.payment).catch(() => {});
      firestoreService.saveOrder(res.order).catch(() => {});
      return res;
    }),
  verifyUpiPayment: (payload: { utr: string; amount: number; upiId?: string; payerUpi?: string }) =>
    fetchApi<{
      success: boolean;
      verified: boolean;
      message: string;
      data: {
        verified: boolean;
        utr: string;
        targetUpiId: string;
        amount: number;
        payerUpi?: string;
        timestamp: string;
        gatewayStatus: string;
        bankRrn: string;
        verificationToken: string;
      };
    }>('/payments/verify-upi', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Products
  getProducts: () => fetchApi<Product[]>('/products'),
  createProduct: (productData: any) =>
    fetchApi<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    }).then(prod => {
      firestoreService.saveProduct(prod).catch(() => {});
      return prod;
    }),
  updateProduct: (id: string, updates: Partial<Product>) =>
    fetchApi<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }).then(prod => {
      firestoreService.saveProduct(prod).catch(() => {});
      return prod;
    }),

  // Inventory
  getInventory: () => fetchApi<InventoryItem[]>('/inventory'),
  createInventoryItem: (itemData: any) =>
    fetchApi<InventoryItem>('/inventory', {
      method: 'POST',
      body: JSON.stringify(itemData)
    }).then(item => {
      firestoreService.saveInventoryItem(item).catch(() => {});
      return item;
    }),
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) =>
    fetchApi<InventoryItem>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }).then(item => {
      firestoreService.saveInventoryItem(item).catch(() => {});
      return item;
    }),
  recordStockMovement: (movementData: {
    inventoryItemId: string;
    quantity: number;
    movementType: StockMovementType;
    notes?: string;
    purchaseChannel?: any;
    purchasePlatform?: any;
    purchasePlatformOther?: string;
    purchaseOrderRef?: string;
  }) =>
    fetchApi<{ item: InventoryItem; movement: any }>('/inventory/movement', {
      method: 'POST',
      body: JSON.stringify(movementData)
    }).then(res => {
      firestoreService.saveInventoryItem(res.item).catch(() => {});
      return res;
    }),

  // Payments
  getPayments: () => fetchApi<Payment[]>('/payments'),

  // Reports
  getReportSummary: () => fetchApi<any>('/reports/summary'),

  // Users & Roles
  getUsers: () => fetchApi<User[]>('/users'),
  createUser: (userData: any) =>
    fetchApi<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }).then(u => {
      firestoreService.saveUser(u).catch(() => {});
      return u;
    }),
  updateUser: (id: string, updates: Partial<User>) =>
    fetchApi<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }).then(u => {
      firestoreService.saveUser(u).catch(() => {});
      return u;
    }),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    fetchApi<User>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }).then(u => {
      firestoreService.saveUser(u).catch(() => {});
      return u;
    }),

  // Notifications
  getNotifications: () => fetchApi<Notification[]>('/notifications'),
  markNotificationRead: (id: string) =>
    fetchApi<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH'
    }),
  markAllNotificationsRead: () =>
    fetchApi<{ success: boolean }>('/notifications/read-all', {
      method: 'POST'
    }),
  getFirstOrderEligibility: () =>
    fetchApi<{ isEligible: boolean; totalOrders: number; hasUsedOffer: boolean; reason: string }>('/customer/first-order-eligibility'),

  // Audit Logs
  getAuditLogs: () => fetchApi<AuditLog[]>('/audit-logs'),

  // Settings
  getSettings: () => fetchApi<SystemSettings>('/settings'),
  updateSettings: (settings: Partial<SystemSettings>) =>
    fetchApi<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }).then(s => {
      firestoreService.saveSettings(s).catch(() => {});
      return s;
    }),

  // Customer Specific Account APIs
  getCustomerProfile: () => fetchApi<{ user: User; customer: Customer | null }>('/customer/profile'),
  updateCustomerProfile: (data: {
    name?: string;
    email?: string;
    whatsapp?: string;
    alternatePhone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) =>
    fetchApi<{ user: User; customer: Customer }>('/customer/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteCustomerAccount: () =>
    fetchApi<{ success: boolean; message: string }>('/customer/account', {
      method: 'DELETE'
    }),

  // Customer Address Book
  getCustomerAddresses: () => fetchApi<CustomerAddress[]>('/customer/addresses'),
  addCustomerAddress: (address: Omit<CustomerAddress, 'id' | 'createdAt'>) =>
    fetchApi<CustomerAddress>('/customer/addresses', {
      method: 'POST',
      body: JSON.stringify(address)
    }).then(addr => {
      firestoreService.saveAddress(addr).catch(() => {});
      return addr;
    }),
  updateCustomerAddress: (id: string, address: Partial<CustomerAddress>) =>
    fetchApi<CustomerAddress>(`/customer/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(address)
    }).then(addr => {
      firestoreService.saveAddress(addr).catch(() => {});
      return addr;
    }),
  deleteCustomerAddress: (id: string) =>
    fetchApi<{ success: boolean }>(`/customer/addresses/${id}`, {
      method: 'DELETE'
    }).then(res => {
      firestoreService.deleteAddress(id).catch(() => {});
      return res;
    }),
  setPrimaryCustomerAddress: (id: string) =>
    fetchApi<CustomerAddress>(`/customer/addresses/${id}/primary`, {
      method: 'PUT'
    }).then(addr => {
      firestoreService.saveAddress(addr).catch(() => {});
      return addr;
    }),

  // Customer Wishlist / Saved Items
  getCustomerWishlist: () => fetchApi<WishlistItem[]>('/customer/wishlist'),
  addToCustomerWishlist: (item: {
    productId: string;
    name: string;
    category?: string;
    price: number;
    imageUrl?: string;
    stockQuantity?: number;
  }) =>
    fetchApi<WishlistItem>('/customer/wishlist', {
      method: 'POST',
      body: JSON.stringify(item)
    }).then(w => {
      firestoreService.saveWishlistItem(w).catch(() => {});
      return w;
    }),
  removeFromCustomerWishlist: (id: string) =>
    fetchApi<{ success: boolean }>(`/customer/wishlist/${id}`, {
      method: 'DELETE'
    }).then(res => {
      firestoreService.deleteWishlistItem(id).catch(() => {});
      return res;
    }),

  // Customer Notifications
  getCustomerNotifications: () => fetchApi<Notification[]>('/customer/notifications'),
  markCustomerNotificationRead: (id: string) =>
    fetchApi<{ success: boolean }>(`/customer/notifications/${id}/read`, {
      method: 'PATCH'
    }),
  markAllCustomerNotificationsRead: () =>
    fetchApi<{ success: boolean }>('/customer/notifications/read-all', {
      method: 'POST'
    }),
  deleteCustomerNotification: (id: string) =>
    fetchApi<{ success: boolean }>(`/customer/notifications/${id}`, {
      method: 'DELETE'
    }).then(res => {
      firestoreService.deleteNotification(id).catch(() => {});
      return res;
    }),

  // Export / Import API
  exportAllData: () => fetchApi<any>('/sync/export-all'),
  importAllData: (data: any) =>
    fetchApi<any>('/sync/import-all', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // OVERALL DATA SYNC TO FIREBASE CLOUD
  syncAllToFirebase: async () => {
    try {
      let allData: any = {};
      try {
        allData = await api.exportAllData();
      } catch {
        // Fallback to fetching collections individually
        const [users, customers, orders, products, inventory, payments, auditLogs, notifications, settings] = await Promise.all([
          api.getUsers().catch(() => []),
          api.getCustomers().catch(() => []),
          api.getOrders().catch(() => []),
          api.getProducts().catch(() => []),
          api.getInventory().catch(() => []),
          api.getPayments().catch(() => []),
          api.getAuditLogs().catch(() => []),
          api.getNotifications().catch(() => []),
          api.getSettings().catch(() => null)
        ]);
        allData = {
          users: users || [],
          customers: customers || [],
          orders: orders || [],
          products: products || [],
          inventory: inventory || [],
          payments: payments || [],
          auditLogs: auditLogs || [],
          notifications: notifications || [],
          settings: settings || undefined
        };
      }

      const result = await firestoreService.syncAllDataToFirebase(allData);
      return result;
    } catch (err: any) {
      console.error('Error during overall sync to Firebase:', err);
      throw err;
    }
  },

  // RESTORE / IMPORT ALL DATA FROM FIREBASE CLOUD
  restoreAllFromFirebase: async () => {
    try {
      const cloudData = await firestoreService.getAllDataFromFirestore();
      const result = await api.importAllData(cloudData);
      return {
        cloudData,
        ...result
      };
    } catch (err: any) {
      console.error('Error restoring data from Firebase:', err);
      throw err;
    }
  },

  // GitHub OAuth Integration
  getGithubAuthUrl: (action: 'login' | 'link' = 'login') =>
    fetchApi<{
      configured: boolean;
      url?: string;
      demoUrl?: string;
      redirectUri?: string;
      callbackUrls?: string[];
      setupUrl?: string;
      message?: string;
    }>(`/auth/github/url?action=${action}`),

  getGithubStatus: () =>
    fetchApi<{
      configured: boolean;
      clientId?: string;
      callbackUrls: string[];
      setupUrl: string;
      redirectUri: string;
    }>('/auth/github/status'),

  disconnectGithub: () =>
    fetchApi<{
      success: boolean;
      user: User;
      message: string;
    }>('/auth/github/disconnect', {
      method: 'POST'
    })
};

