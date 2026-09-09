import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import {
  User,
  Customer,
  Product,
  InventoryItem,
  Order,
  Payment,
  SystemSettings,
  AuditLog,
  Notification,
  CustomerAddress,
  WishlistItem,
  OrderStatusHistory,
  InventoryMovement
} from '../types';

/**
 * Deeply sanitizes data objects for Firestore by:
 * 1. Removing keys with `undefined` values (which crash setDoc in Firestore Web SDK)
 * 2. Converting undefined within arrays to null or omitting them
 * 3. Preserving primitives, nulls, and nested plain objects
 */
export function cleanForFirestore<T>(data: T): any {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => cleanForFirestore(item));
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      clean[key] = cleanForFirestore(value);
    }
  }
  return clean;
}

export interface FirestoreAllData {
  users?: User[];
  customers?: Customer[];
  products?: Product[];
  inventory?: InventoryItem[];
  orders?: Order[];
  payments?: Payment[];
  statusHistory?: OrderStatusHistory[];
  inventoryMovements?: InventoryMovement[];
  notifications?: Notification[];
  auditLogs?: AuditLog[];
  addresses?: CustomerAddress[];
  wishlists?: WishlistItem[];
  settings?: SystemSettings;
}

export const firestoreService = {
  isConfigured(): boolean {
    return isFirebaseConfigured && Boolean(db);
  },

  /**
   * Diagnostic probe to test Firestore connectivity and latency
   */
  async testConnection(): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    if (!this.isConfigured()) {
      return { ok: false, message: 'Firebase configuration not found or not initialized.' };
    }
    const start = performance.now();
    try {
      // Write & read probe to test both read and write
      const probeDoc = doc(db, 'system_probes', 'connection_health');
      await setDoc(probeDoc, {
        lastPing: new Date().toISOString(),
        status: 'ONLINE',
        clientTime: Date.now()
      }, { merge: true });

      const snap = await getDocFromServer(probeDoc);
      const latency = Math.round(performance.now() - start);

      if (snap.exists()) {
        return {
          ok: true,
          message: `Firestore connected & operational (${latency}ms roundtrip)`,
          latencyMs: latency
        };
      }
      return { ok: true, message: `Connected to Firestore (${latency}ms)`, latencyMs: latency };
    } catch (err: any) {
      const msg = err?.message || String(err);
      return { ok: false, message: `Connection probe failed: ${msg}` };
    }
  },

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
      return [];
    }
  },

  async saveUser(user: User): Promise<void> {
    if (!this.isConfigured() || !user?.id) return;
    try {
      await setDoc(doc(db, 'users', user.id), cleanForFirestore(user), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    if (!this.isConfigured() || !userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  },

  // --- ORDERS ---
  async getOrders(): Promise<Order[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'orders'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'orders');
      return [];
    }
  },

  async saveOrder(order: Order): Promise<void> {
    if (!this.isConfigured() || !order?.id) return;
    try {
      await setDoc(doc(db, 'orders', order.id), cleanForFirestore(order), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${order.id}`);
    }
  },

  async deleteOrder(orderId: string): Promise<void> {
    if (!this.isConfigured() || !orderId) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    }
  },

  // --- CUSTOMERS ---
  async getCustomers(): Promise<Customer[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'customers'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'customers');
      return [];
    }
  },

  async saveCustomer(customer: Customer): Promise<void> {
    if (!this.isConfigured() || !customer?.id) return;
    try {
      await setDoc(doc(db, 'customers', customer.id), cleanForFirestore(customer), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `customers/${customer.id}`);
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    if (!this.isConfigured() || !customerId) return;
    try {
      await deleteDoc(doc(db, 'customers', customerId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${customerId}`);
    }
  },

  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'products'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'products');
      return [];
    }
  },

  async saveProduct(product: Product): Promise<void> {
    if (!this.isConfigured() || !product?.id) return;
    try {
      await setDoc(doc(db, 'products', product.id), cleanForFirestore(product), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    if (!this.isConfigured() || !productId) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  },

  // --- INVENTORY ---
  async getInventory(): Promise<InventoryItem[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'inventory'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'inventory');
      return [];
    }
  },

  async saveInventoryItem(item: InventoryItem): Promise<void> {
    if (!this.isConfigured() || !item?.id) return;
    try {
      await setDoc(doc(db, 'inventory', item.id), cleanForFirestore(item), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `inventory/${item.id}`);
    }
  },

  async deleteInventoryItem(itemId: string): Promise<void> {
    if (!this.isConfigured() || !itemId) return;
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${itemId}`);
    }
  },

  // --- PAYMENTS ---
  async getPayments(): Promise<Payment[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'payments'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'payments');
      return [];
    }
  },

  async savePayment(payment: Payment): Promise<void> {
    if (!this.isConfigured() || !payment?.id) return;
    try {
      await setDoc(doc(db, 'payments', payment.id), cleanForFirestore(payment), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `payments/${payment.id}`);
    }
  },

  // --- ADDRESSES ---
  async getAddresses(): Promise<CustomerAddress[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'addresses'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerAddress));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'addresses');
      return [];
    }
  },

  async saveAddress(address: CustomerAddress): Promise<void> {
    if (!this.isConfigured() || !address?.id) return;
    try {
      await setDoc(doc(db, 'addresses', address.id), cleanForFirestore(address), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `addresses/${address.id}`);
    }
  },

  async deleteAddress(addressId: string): Promise<void> {
    if (!this.isConfigured() || !addressId) return;
    try {
      await deleteDoc(doc(db, 'addresses', addressId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `addresses/${addressId}`);
    }
  },

  // --- WISHLISTS ---
  async getWishlists(): Promise<WishlistItem[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'wishlists'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WishlistItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'wishlists');
      return [];
    }
  },

  async saveWishlistItem(item: WishlistItem): Promise<void> {
    if (!this.isConfigured() || !item?.id) return;
    try {
      await setDoc(doc(db, 'wishlists', item.id), cleanForFirestore(item), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `wishlists/${item.id}`);
    }
  },

  async deleteWishlistItem(itemId: string): Promise<void> {
    if (!this.isConfigured() || !itemId) return;
    try {
      await deleteDoc(doc(db, 'wishlists', itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `wishlists/${itemId}`);
    }
  },

  // --- AUDIT LOGS ---
  async getAuditLogs(): Promise<AuditLog[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'auditLogs'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'auditLogs');
      return [];
    }
  },

  async saveAuditLog(log: AuditLog): Promise<void> {
    if (!this.isConfigured() || !log?.id) return;
    try {
      await setDoc(doc(db, 'auditLogs', log.id), cleanForFirestore(log), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `auditLogs/${log.id}`);
    }
  },

  // --- NOTIFICATIONS ---
  async getNotifications(): Promise<Notification[]> {
    if (!this.isConfigured()) return [];
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'notifications');
      return [];
    }
  },

  async saveNotification(notification: Notification): Promise<void> {
    if (!this.isConfigured() || !notification?.id) return;
    try {
      await setDoc(doc(db, 'notifications', notification.id), cleanForFirestore(notification), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notifications/${notification.id}`);
    }
  },

  async deleteNotification(id: string): Promise<void> {
    if (!this.isConfigured() || !id) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  },

  // --- SETTINGS ---
  async getSettings(): Promise<SystemSettings | null> {
    if (!this.isConfigured()) return null;
    try {
      const snap = await getDoc(doc(db, 'settings', 'company'));
      if (snap.exists()) {
        return snap.data() as SystemSettings;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'settings/company');
      return null;
    }
  },

  async saveSettings(settings: SystemSettings): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await setDoc(doc(db, 'settings', 'company'), cleanForFirestore(settings), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/company');
    }
  },

  // --- FETCH ALL CLOUD DATA ---
  async getAllDataFromFirestore(): Promise<FirestoreAllData> {
    if (!this.isConfigured()) return {};
    const [
      users,
      customers,
      orders,
      products,
      inventory,
      payments,
      addresses,
      wishlists,
      notifications,
      auditLogs,
      settings
    ] = await Promise.all([
      this.getUsers(),
      this.getCustomers(),
      this.getOrders(),
      this.getProducts(),
      this.getInventory(),
      this.getPayments(),
      this.getAddresses(),
      this.getWishlists(),
      this.getNotifications(),
      this.getAuditLogs(),
      this.getSettings()
    ]);

    return {
      users,
      customers,
      orders,
      products,
      inventory,
      payments,
      addresses,
      wishlists,
      notifications,
      auditLogs,
      settings: settings || undefined
    };
  },

  // --- OVERALL BATCH DATA SYNC TO FIREBASE ---
  async syncAllDataToFirebase(allData: FirestoreAllData): Promise<{
    syncedCount: number;
    details: Record<string, number>;
    errors: string[];
  }> {
    if (!this.isConfigured()) {
      return {
        syncedCount: 0,
        details: {},
        errors: ['Firebase Firestore is not initialized with active configuration credentials.']
      };
    }
    let syncedCount = 0;
    const details: Record<string, number> = {};
    const errors: string[] = [];

    // Helper to upload collection cleanly
    const uploadCollection = async (collName: string, items?: any[]) => {
      if (!items || !Array.isArray(items) || items.length === 0) {
        details[collName] = 0;
        return;
      }
      let successInColl = 0;
      for (const item of items) {
        if (!item || !item.id) continue;
        try {
          const sanitized = cleanForFirestore(item);
          await setDoc(doc(db, collName, String(item.id)), sanitized, { merge: true });
          successInColl++;
          syncedCount++;
        } catch (e: any) {
          errors.push(`Failed syncing ${collName}/${item.id}: ${e?.message || e}`);
        }
      }
      details[collName] = successInColl;
    };

    await uploadCollection('users', allData.users);
    await uploadCollection('customers', allData.customers);
    await uploadCollection('orders', allData.orders);
    await uploadCollection('products', allData.products);
    await uploadCollection('inventory', allData.inventory);
    await uploadCollection('payments', allData.payments);
    await uploadCollection('addresses', allData.addresses);
    await uploadCollection('wishlists', allData.wishlists);
    await uploadCollection('notifications', allData.notifications);
    await uploadCollection('auditLogs', allData.auditLogs);

    if (allData.settings) {
      try {
        const sanitizedSettings = cleanForFirestore(allData.settings);
        await setDoc(doc(db, 'settings', 'company'), sanitizedSettings, { merge: true });
        syncedCount++;
        details['settings'] = 1;
      } catch (e: any) {
        errors.push(`Failed syncing settings/company: ${e?.message || e}`);
      }
    }

    return { syncedCount, details, errors };
  }
};
