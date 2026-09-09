import fs from 'fs';
import path from 'path';
import {
  User,
  Customer,
  Product,
  InventoryItem,
  Order,
  Payment,
  OrderStatusHistory,
  InventoryMovement,
  Notification,
  AuditLog,
  SystemSettings,
  OrderStatus,
  PaymentStatus,
  StockMovementType,
  CustomerAddress,
  WishlistItem,
  UpiVerificationDetails
} from '../src/types';
import { syncAllToSupabase } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseSchema {
  users: User[];
  customers: Customer[];
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
  payments: Payment[];
  statusHistory: OrderStatusHistory[];
  inventoryMovements: InventoryMovement[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  addresses: CustomerAddress[];
  wishlists: WishlistItem[];
  settings: SystemSettings;
  counters: {
    customerSeq: number;
    orderSeq: number;
    productSeq: number;
    inventorySeq: number;
    paymentSeq: number;
  };
}

const defaultSettings: SystemSettings = {
  companyName: 'Cards Crafted',
  businessName: 'Cards Crafted',
  logoUrl: '/src/assets/images/cards_crafted_logo_1786446210358.jpg',
  address: '102 Creative Craft Lane, Handloom Market',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400012',
  phone: '+91 98201 12345',
  whatsapp: '919820112345',
  email: 'contact@craftflowstudio.com',
  website: 'www.craftflowstudio.com',
  gstin: '27AABCC1234D1ZP',
  upiId: 'shiv.khante5-2@okaxis',
  bankDetails: 'Cards Crafted • Axis Bank • A/C: 92302001889912 • IFSC: UTIB0001234',
  currencySymbol: '₹',
  orderPrefix: 'CC-2026-',
  lowStockAlertThreshold: 10,
  defaultTaxPercent: 12,
  whatsappOrderConfirmedMsg: 'Hello {{customerName}}, your craft order #{{orderNumber}} for {{itemCount}} item(s) has been confirmed! Expected completion: {{deliveryDate}}.',
  whatsappOrderReadyMsg: 'Hello {{customerName}}, great news! Your craft order #{{orderNumber}} is READY for pickup / delivery!',
  whatsappPaymentDueMsg: 'Hello {{customerName}}, a friendly reminder regarding order #{{orderNumber}}. Outstanding balance is ₹{{balance}}.'
};

// Seed clean initial data (Clean slate with Super Admin)
function getInitialData(): DatabaseSchema {
  const users: User[] = [
    {
      id: 'usr-1',
      name: 'Super Admin',
      email: 'admin@example.com',
      whatsapp: '919820112345',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }
  ];

  return {
    users,
    customers: [],
    products: [],
    inventory: [],
    orders: [],
    payments: [],
    statusHistory: [],
    inventoryMovements: [],
    notifications: [],
    auditLogs: [],
    addresses: [],
    wishlists: [],
    settings: defaultSettings,
    counters: {
      customerSeq: 0,
      orderSeq: 0,
      productSeq: 0,
      inventorySeq: 0,
      paymentSeq: 0
    }
  };
}

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        this.data.addresses = this.data.addresses || [];
        this.data.wishlists = this.data.wishlists || [];
        this.data.notifications = this.data.notifications || [];
      } catch (err) {
        console.error('Error reading db.json, reinitializing initial data', err);
        this.data = getInitialData();
        this.save();
      }
    } else {
      this.data = getInitialData();
      this.save();
    }
  }

  private syncTimeout: NodeJS.Timeout | null = null;

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      
      // Debounced background sync to Supabase (500ms delay to batch rapid sequential writes)
      if (this.syncTimeout) {
        clearTimeout(this.syncTimeout);
      }
      this.syncTimeout = setTimeout(() => {
        syncAllToSupabase(this.data).catch(err => {
          console.warn('Background Supabase sync notice:', err?.message || err);
        });
      }, 500);
    } catch (err) {
      console.error('Failed to write db.json', err);
    }
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  // --- Audit Log Helper ---
  public logAudit(userId: string, userName: string, action: string, entity: string, entityId: string, details: string) {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      userName,
      action,
      entity,
      entityId,
      details,
      createdAt: new Date().toISOString()
    };
    this.data.auditLogs.unshift(log);
    this.save();
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserByEmailOrPhone(query: string): User | undefined {
    const clean = query.trim().toLowerCase();
    const cleanDigits = query.replace(/\D/g, '');
    return this.data.users.find(u => {
      const uEmail = u.email.toLowerCase();
      const uPhone = (u.whatsapp || '').replace(/\D/g, '');
      if (uEmail === clean) return true;
      if (cleanDigits && uPhone.includes(cleanDigits)) return true;
      return false;
    });
  }

  public getUserByResetToken(token: string): User | undefined {
    if (!token) return undefined;
    return this.data.users.find(u => u.passwordResetToken === token);
  }

  public getUserByGithubId(githubId: string): User | undefined {
    if (!githubId) return undefined;
    return this.data.users.find(u => u.githubId === String(githubId));
  }

  public createUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.getUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return this.data.customers;
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find(c => c.id === id || c.customerCode === id);
  }

  public getCustomerByUserId(userId: string): Customer | undefined {
    if (!userId) return undefined;
    return this.data.customers.find(c => c.userId === userId);
  }

  public getCustomerByEmail(email: string): Customer | undefined {
    if (!email) return undefined;
    return this.data.customers.find(c => c.email.toLowerCase() === email.toLowerCase());
  }

  public createCustomer(custData: Omit<Customer, 'id' | 'customerCode' | 'totalOrders' | 'totalSpent' | 'createdAt'>): Customer {
    this.data.counters.customerSeq += 1;
    const seqStr = String(this.data.counters.customerSeq).padStart(5, '0');
    const customerCode = `CUS-${seqStr}`;

    const newCustomer: Customer = {
      ...custData,
      id: customerCode,
      customerCode,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };
    this.data.customers.unshift(newCustomer);

    // Auto-create notification
    this.data.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: 'New Customer Enrolled',
      message: `${newCustomer.name} (${newCustomer.customerCode}) has been registered.`,
      type: 'NEW_CUSTOMER',
      read: false,
      createdAt: new Date().toISOString()
    });

    this.save();
    return newCustomer;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer | undefined {
    const customer = this.getCustomerById(id);
    if (!customer) return undefined;
    Object.assign(customer, updates);
    this.save();
    return customer;
  }

  // --- Products ---
  public getProducts(): Product[] {
    return this.data.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id || p.sku === id);
  }

  public createProduct(prodData: Omit<Product, 'id' | 'sku' | 'createdAt'>): Product {
    this.data.counters.productSeq += 1;
    const sku = `PRD-${String(this.data.counters.productSeq).padStart(5, '0')}`;
    const newProduct: Product = {
      ...prodData,
      id: sku,
      sku,
      createdAt: new Date().toISOString()
    };
    this.data.products.unshift(newProduct);
    this.save();
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const prod = this.getProductById(id);
    if (!prod) return undefined;
    Object.assign(prod, updates);
    this.save();
    return prod;
  }

  // --- Inventory ---
  public getInventory(): InventoryItem[] {
    return this.data.inventory;
  }

  public getInventoryById(id: string): InventoryItem | undefined {
    return this.data.inventory.find(i => i.id === id || i.sku === id);
  }

  public createInventoryItem(invData: Omit<InventoryItem, 'id' | 'sku'>): InventoryItem {
    this.data.counters.inventorySeq += 1;
    const sku = `INV-${String(this.data.counters.inventorySeq).padStart(5, '0')}`;
    const newItem: InventoryItem = {
      ...invData,
      id: sku,
      sku
    };
    this.data.inventory.unshift(newItem);
    this.save();
    return newItem;
  }

  public updateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem | undefined {
    const item = this.getInventoryById(id);
    if (!item) return undefined;
    Object.assign(item, updates);
    this.save();
    return item;
  }

  public updateInventoryStock(
    itemId: string,
    quantity: number,
    movementType: StockMovementType,
    createdBy: string,
    orderId?: string,
    notes?: string,
    channelData?: {
      purchaseChannel?: any;
      purchasePlatform?: any;
      purchasePlatformOther?: string;
      purchaseOrderRef?: string;
    }
  ): { item: InventoryItem; movement: InventoryMovement } | undefined {
    const item = this.getInventoryById(itemId);
    if (!item) return undefined;

    const previousStock = item.currentStock;
    let newStock = previousStock;

    if (movementType === 'STOCK_IN' || movementType === 'RETURNED') {
      newStock += quantity;
      // Optionally update latest purchase channel on item if provided in stock in
      if (channelData?.purchaseChannel) {
        item.purchaseChannel = channelData.purchaseChannel;
        item.purchasePlatform = channelData.purchasePlatform;
        item.purchasePlatformOther = channelData.purchasePlatformOther;
        item.purchaseOrderRef = channelData.purchaseOrderRef;
      }
    } else if (movementType === 'STOCK_OUT' || movementType === 'DAMAGED' || movementType === 'USED_IN_ORDER') {
      newStock -= quantity;
      if (newStock < 0) newStock = 0; // prevent negative stock if enforced
    } else if (movementType === 'ADJUSTMENT') {
      newStock = quantity; // direct override
    }

    item.currentStock = newStock;

    const movement: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random()*100)}`,
      inventoryItemId: item.id,
      inventoryItemName: item.name,
      movementType,
      quantity,
      previousStock,
      newStock,
      purchaseChannel: channelData?.purchaseChannel || item.purchaseChannel,
      purchasePlatform: channelData?.purchasePlatform || item.purchasePlatform,
      purchasePlatformOther: channelData?.purchasePlatformOther || item.purchasePlatformOther,
      purchaseOrderRef: channelData?.purchaseOrderRef || item.purchaseOrderRef,
      orderId,
      createdBy,
      notes,
      createdAt: new Date().toISOString()
    };

    this.data.inventoryMovements.unshift(movement);

    // Low stock check
    if (newStock <= item.minStock) {
      this.data.notifications.unshift({
        id: `notif-low-${Date.now()}`,
        title: 'Low Stock Alert',
        message: `${item.name} is down to ${newStock} ${item.unit} (Min: ${item.minStock}).`,
        type: 'LOW_STOCK',
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    this.save();
    return { item, movement };
  }

  // --- Orders ---
  public getOrders(): Order[] {
    return this.data.orders;
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id || o.orderNumber === id);
  }

  public createOrder(orderData: {
    customerId: string;
    orderType?: 'CRAFT' | 'PRINT' | 'DOCUMENT_PRINTING';
    status?: OrderStatus;
    items: { productId?: string; productName: string; quantity: number; unitPrice: number; notes?: string }[];
    customDetails?: any;
    discount?: number;
    deliveryCharge?: number;
    tax?: number;
    expectedDeliveryDate?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    advancePayment?: { amount: number; method: any; reference?: string };
    upiVerification?: UpiVerificationDetails;
    shippingMethod?: 'PICKUP' | 'DELIVERY';
    shippingAddress?: any;
    createdBy: string;
  }): Order {
    const customer = this.getCustomerById(orderData.customerId);
    if (!customer) throw new Error('Customer not found');

    this.data.counters.orderSeq += 1;
    const prefix = this.data.settings.orderPrefix || 'CC-2026-';
    const orderNumber = `${prefix}${String(this.data.counters.orderSeq).padStart(5, '0')}`;

    const items = orderData.items.map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      productId: item.productId,
      productName: item.productName,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.quantity) * Number(item.unitPrice),
      notes: item.notes
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const discount = Number(orderData.discount || 0);
    const deliveryCharge = Number(orderData.deliveryCharge || 0);
    const tax = orderData.tax !== undefined ? Number(orderData.tax) : Math.round((subtotal - discount) * (this.data.settings.defaultTaxPercent / 100));
    const grandTotal = Math.max(0, subtotal - discount + deliveryCharge + tax);

    let paidAmount = 0;
    const isUpiVerificationPending = orderData.status === 'PAYMENT_VERIFICATION_PENDING' || !!orderData.upiVerification;

    if (orderData.advancePayment && orderData.advancePayment.amount > 0) {
      if (!isUpiVerificationPending) {
        paidAmount = Number(orderData.advancePayment.amount);
      }
    }
    const balanceAmount = Math.max(0, grandTotal - paidAmount);

    let paymentStatus: PaymentStatus = 'PENDING';
    if (isUpiVerificationPending) {
      paymentStatus = 'PENDING_VERIFICATION';
    } else if (paidAmount >= grandTotal && grandTotal > 0) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    const orderId = `ord-${Date.now()}`;
    const now = new Date().toISOString();

    const initialStatus: OrderStatus = isUpiVerificationPending
      ? 'PAYMENT_VERIFICATION_PENDING'
      : (orderData.status || (orderData.orderType === 'DOCUMENT_PRINTING' || orderData.orderType === 'PRINT' ? 'ORDER_RECEIVED' : 'NEW'));

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      orderType: orderData.orderType,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.whatsapp,
      customerEmail: customer.email,
      orderDate: now,
      expectedDeliveryDate: orderData.expectedDeliveryDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      status: initialStatus,
      items,
      customDetails: orderData.customDetails,
      subtotal,
      discount,
      deliveryCharge,
      tax,
      grandTotal,
      paidAmount,
      balanceAmount,
      paymentStatus,
      priority: orderData.priority || 'MEDIUM',
      upiVerification: orderData.upiVerification,
      createdBy: orderData.createdBy,
      createdAt: now,
      updatedAt: now
    };

    this.data.orders.unshift(newOrder);

    // Initial Status History
    this.data.statusHistory.unshift({
      id: `hist-${Date.now()}`,
      orderId: newOrder.id,
      newStatus: initialStatus,
      changedBy: orderData.createdBy,
      changedAt: now,
      remarks: isUpiVerificationPending
        ? `Payment UTR (${orderData.upiVerification?.utr || 'Submitted'}) submitted. Awaiting Admin bank verification.`
        : 'Order created'
    });

    // Handle advance payment record if created and not pending verification
    if (paidAmount > 0 && orderData.advancePayment && !isUpiVerificationPending) {
      this.data.counters.paymentSeq += 1;
      const paymentCode = `PAY-${String(this.data.counters.paymentSeq).padStart(5, '0')}`;
      this.data.payments.unshift({
        id: paymentCode,
        paymentCode,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        customerId: customer.id,
        customerName: customer.name,
        amount: paidAmount,
        method: orderData.advancePayment.method || 'CASH',
        transactionReference: orderData.advancePayment.reference,
        paymentDate: now,
        notes: 'Advance payment on order creation',
        createdBy: orderData.createdBy,
        createdAt: now
      });
    }

    // Update customer stats only if verified or cash
    if (!isUpiVerificationPending) {
      customer.totalOrders += 1;
      customer.totalSpent += grandTotal;
      customer.lastOrderDate = now;
    }

    if (isUpiVerificationPending) {
      this.data.notifications.unshift({
        id: `notif-ord-${Date.now()}`,
        title: '🛡️ UPI Payment Verification Required',
        message: `Order #${newOrder.orderNumber} placed by ${customer.name} (₹${grandTotal}) requires verification for UTR: ${orderData.upiVerification?.utr || 'N/A'} to shiv.khante5-2@okaxis.`,
        type: 'NEW_ORDER',
        read: false,
        createdAt: now
      });
    } else {
      this.data.notifications.unshift({
        id: `notif-ord-${Date.now()}`,
        title: 'New Order Received',
        message: `Order #${newOrder.orderNumber} placed for ${customer.name} (Total: ₹${grandTotal}).`,
        type: 'NEW_ORDER',
        read: false,
        createdAt: now
      });
    }

    this.save();
    return newOrder;
  }

  public verifyOrderUpiPayment(
    orderId: string,
    verifiedBy: string,
    remarks?: string
  ): { order: Order; payment: Payment } {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const utr = order.upiVerification?.utr || '';
    const verifyAmount = order.upiVerification?.amount || order.grandTotal;
    const now = new Date().toISOString();

    // Mark upiVerification as VERIFIED
    order.upiVerification = {
      utr,
      amount: verifyAmount,
      upiId: order.upiVerification?.upiId || 'shiv.khante5-2@okaxis',
      payerUpi: order.upiVerification?.payerUpi,
      submittedAt: order.upiVerification?.submittedAt || now,
      status: 'VERIFIED',
      verifiedAt: now,
      verifiedBy: verifiedBy
    };

    // Update order status to CONFIRMED or ORDER_RECEIVED
    const newStatus: OrderStatus = (order.orderType === 'DOCUMENT_PRINTING' || order.orderType === 'PRINT') ? 'ORDER_RECEIVED' : 'CONFIRMED';
    const oldStatus = order.status;
    order.status = newStatus;
    order.paidAmount = verifyAmount;
    order.balanceAmount = Math.max(0, order.grandTotal - order.paidAmount);
    order.paymentStatus = order.paidAmount >= order.grandTotal ? 'PAID' : 'PARTIALLY_PAID';
    order.updatedAt = now;

    // Record verified payment in payments ledger
    this.data.counters.paymentSeq += 1;
    const paymentCode = `PAY-${String(this.data.counters.paymentSeq).padStart(5, '0')}`;
    const payment: Payment = {
      id: paymentCode,
      paymentCode,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      amount: verifyAmount,
      method: 'UPI',
      transactionReference: utr,
      paymentDate: now,
      notes: remarks || `Verified UPI Payment to shiv.khante5-2@okaxis (UTR: ${utr})`,
      createdBy: verifiedBy,
      createdAt: now
    };
    this.data.payments.unshift(payment);

    // Update customer stats if this was first verification
    const customer = this.getCustomerById(order.customerId);
    if (customer) {
      customer.totalOrders += 1;
      customer.totalSpent += order.grandTotal;
      customer.lastOrderDate = now;
    }

    // Add status history
    this.data.statusHistory.unshift({
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      orderId: order.id,
      oldStatus,
      newStatus,
      changedBy: verifiedBy,
      changedAt: now,
      remarks: remarks || `Payment verified against bank statement (UTR: ${utr}). Order confirmed.`
    });

    // Notify Customer
    const user = this.data.users.find(
      u =>
        u.customerId === customer?.id ||
        (customer?.userId && u.id === customer.userId) ||
        (customer?.email && u.email && u.email.toLowerCase() === customer.email.toLowerCase())
    );

    this.data.notifications.unshift({
      id: `notif-verified-${Date.now()}`,
      userId: user?.id || customer?.userId || undefined,
      orderId: order.id,
      orderNumber: order.orderNumber,
      title: `✅ Payment Verified & Order Confirmed! (#${order.orderNumber})`,
      message: `Your payment of ₹${verifyAmount} (UTR: ${utr}) was verified by Admin. Order #${order.orderNumber} is now placed & in queue.`,
      type: 'ORDER_STATUS',
      read: false,
      createdAt: now
    });

    this.save();
    return { order, payment };
  }

  public rejectOrderUpiPayment(
    orderId: string,
    reason: string,
    rejectedBy: string
  ): Order {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const utr = order.upiVerification?.utr || 'N/A';
    const now = new Date().toISOString();

    order.upiVerification = {
      utr,
      amount: order.upiVerification?.amount || order.grandTotal,
      upiId: order.upiVerification?.upiId || 'shiv.khante5-2@okaxis',
      payerUpi: order.upiVerification?.payerUpi,
      submittedAt: order.upiVerification?.submittedAt || now,
      status: 'REJECTED',
      rejectionReason: reason,
      verifiedAt: now,
      verifiedBy: rejectedBy
    };

    const oldStatus = order.status;
    order.status = 'PAYMENT_REJECTED';
    order.paymentStatus = 'REJECTED';
    order.paidAmount = 0;
    order.balanceAmount = order.grandTotal;
    order.updatedAt = now;

    // Status History
    this.data.statusHistory.unshift({
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      orderId: order.id,
      oldStatus,
      newStatus: 'PAYMENT_REJECTED',
      changedBy: rejectedBy,
      changedAt: now,
      remarks: `Payment verification rejected: ${reason}`
    });

    // Customer Notification
    const customer = this.getCustomerById(order.customerId);
    const user = this.data.users.find(
      u =>
        u.customerId === customer?.id ||
        (customer?.userId && u.id === customer.userId) ||
        (customer?.email && u.email && u.email.toLowerCase() === customer.email.toLowerCase())
    );

    this.data.notifications.unshift({
      id: `notif-rej-${Date.now()}`,
      userId: user?.id || customer?.userId || undefined,
      orderId: order.id,
      orderNumber: order.orderNumber,
      title: `❌ Payment Rejected: Order #${order.orderNumber} Not Placed`,
      message: `Your payment verification failed: ${reason}. Please submit a valid UPI reference or contact Admin.`,
      type: 'ORDER_STATUS',
      read: false,
      createdAt: now
    });

    this.save();
    return order;
  }

  public resubmitOrderUpiPayment(
    orderId: string,
    utr: string,
    payerUpi: string | undefined,
    customerName: string
  ): Order {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const cleanUtr = String(utr || '').trim().toUpperCase();
    const now = new Date().toISOString();

    order.upiVerification = {
      utr: cleanUtr,
      amount: order.upiVerification?.amount || order.grandTotal,
      upiId: 'shiv.khante5-2@okaxis',
      payerUpi: payerUpi || undefined,
      submittedAt: now,
      status: 'PENDING'
    };

    const oldStatus = order.status;
    order.status = 'PAYMENT_VERIFICATION_PENDING';
    order.paymentStatus = 'PENDING_VERIFICATION';
    order.updatedAt = now;

    // Status History
    this.data.statusHistory.unshift({
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      orderId: order.id,
      oldStatus,
      newStatus: 'PAYMENT_VERIFICATION_PENDING',
      changedBy: customerName,
      changedAt: now,
      remarks: `Resubmitted new UPI UTR: ${cleanUtr}. Awaiting Admin bank verification.`
    });

    // Admin Notification
    this.data.notifications.unshift({
      id: `notif-resub-${Date.now()}`,
      title: '🔄 Resubmitted UPI Payment Verification',
      message: `Customer ${customerName} resubmitted payment UTR (${cleanUtr}) for Order #${order.orderNumber} (₹${order.grandTotal}).`,
      type: 'NEW_ORDER',
      read: false,
      createdAt: now
    });

    this.save();
    return order;
  }

  public updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    remarks?: string
  ): Order | undefined {
    const order = this.getOrderById(orderId);
    if (!order) return undefined;

    const oldStatus = order.status;
    if (oldStatus === newStatus) return order;

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();

    this.data.statusHistory.unshift({
      id: `hist-${Date.now()}-${Math.floor(Math.random()*100)}`,
      orderId: order.id,
      oldStatus,
      newStatus,
      changedBy,
      changedAt: order.updatedAt,
      remarks
    });

    // Trigger Material Recipe Deduction when entering IN_PRODUCTION!
    if (newStatus === 'IN_PRODUCTION' && oldStatus !== 'IN_PRODUCTION') {
      this.deductMaterialsForOrder(order, changedBy);
    }

    // Identify customer and linked user account
    const customer = this.getCustomerById(order.customerId);
    const user = this.data.users.find(
      u =>
        u.customerId === customer?.id ||
        (customer?.userId && u.id === customer.userId) ||
        (customer?.email && u.email && u.email.toLowerCase() === customer.email.toLowerCase())
    );

    // Build user-friendly status notification text
    let notifTitle = `Order #${order.orderNumber} Status: ${newStatus.replace(/_/g, ' ')}`;
    let notifMessage = `Order #${order.orderNumber} (${order.customerName}) is now ${newStatus.replace(/_/g, ' ')}.`;

    switch (newStatus) {
      case 'PRINT_IN_PROGRESS':
        notifTitle = `🖨️ Print In Progress (#${order.orderNumber})`;
        notifMessage = `Great news! Your custom card prints are currently running on our high-definition studio printer.`;
        break;
      case 'PRINT_DONE':
        notifTitle = `✨ Printing Completed (#${order.orderNumber})`;
        notifMessage = `Printing for order #${order.orderNumber} is complete! Transitioning to hand-crafting, folding & embellishments.`;
        break;
      case 'IN_PRODUCTION':
        notifTitle = `🎨 Craft & Production In Progress (#${order.orderNumber})`;
        notifMessage = `Our artisan crafting team has started hand-crafting, cutting, and assembling your custom order details.`;
        break;
      case 'PACKED_SEAL':
        notifTitle = `🎀 Packed & Sealed (#${order.orderNumber})`;
        notifMessage = `Your handcrafted cards are quality-checked, carefully packed in premium protective packaging, and sealed.`;
        break;
      case 'READY_TO_DISPATCH':
        notifTitle = `📦 Ready to Dispatch / Pickup (#${order.orderNumber})`;
        notifMessage = `Your custom order #${order.orderNumber} is packed and ready for dispatch or pickup at our studio point!`;
        break;
      case 'READY':
        notifTitle = `✅ Ready for Pickup / Delivery (#${order.orderNumber})`;
        notifMessage = `Your order #${order.orderNumber} is completely ready.`;
        break;
      case 'OUT_FOR_DELIVERY':
        notifTitle = `🚚 Out for Delivery (#${order.orderNumber})`;
        notifMessage = `Your order #${order.orderNumber} is out for delivery to your designated delivery address!`;
        break;
      case 'DELIVERED':
        notifTitle = `🎉 Order Delivered Successfully (#${order.orderNumber})`;
        notifMessage = `Your order #${order.orderNumber} has been safely delivered! Thank you for choosing Cards Crafted.`;
        break;
      case 'DESIGNING':
        notifTitle = `🎨 Designing Proof (#${order.orderNumber})`;
        notifMessage = `Our craft designers are currently designing the layout and artwork for your custom cards.`;
        break;
      case 'DESIGN_APPROVED':
        notifTitle = `👍 Design Proof Approved (#${order.orderNumber})`;
        notifMessage = `Your design proof for order #${order.orderNumber} is approved and moving to the print queue.`;
        break;
      case 'QUALITY_CHECK':
        notifTitle = `🔍 Quality Inspection (#${order.orderNumber})`;
        notifMessage = `Your handcrafted order #${order.orderNumber} is undergoing final quality inspection.`;
        break;
      case 'CANCELLED':
        notifTitle = `❌ Order Cancelled (#${order.orderNumber})`;
        notifMessage = `Your order #${order.orderNumber} has been cancelled. Remarks: ${remarks || 'No remarks provided.'}`;
        break;
      case 'PAYMENT_VERIFICATION_PENDING':
        notifTitle = `⏳ Payment Verification In Progress (#${order.orderNumber})`;
        notifMessage = `Your UPI payment for order #${order.orderNumber} is under bank verification by Admin. Once approved, production will begin.`;
        break;
      case 'PAYMENT_REJECTED':
        notifTitle = `❌ Payment Rejected: Order Not Placed (#${order.orderNumber})`;
        notifMessage = `Payment for order #${order.orderNumber} was rejected: ${remarks || 'Invalid/unmatched UPI UTR'}. Order has not been placed.`;
        break;
      case 'CONFIRMED':
      case 'ORDER_RECEIVED':
        notifTitle = `✅ Order Confirmed (#${order.orderNumber})`;
        notifMessage = `Your order #${order.orderNumber} is confirmed and queued for production.`;
        break;
    }

    this.data.notifications = this.data.notifications || [];
    this.data.notifications.unshift({
      id: `notif-stat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user?.id || customer?.userId || undefined,
      orderId: order.id,
      orderNumber: order.orderNumber,
      title: notifTitle,
      message: notifMessage,
      type: 'ORDER_STATUS',
      read: false,
      createdAt: order.updatedAt
    });

    this.save();
    return order;
  }

  private deductMaterialsForOrder(order: Order, changedBy: string) {
    for (const item of order.items) {
      if (item.productId) {
        const product = this.getProductById(item.productId);
        if (product && product.materials) {
          for (const mat of product.materials) {
            const qtyNeeded = mat.quantityRequired * item.quantity;
            this.updateInventoryStock(
              mat.inventoryItemId,
              qtyNeeded,
              'USED_IN_ORDER',
              changedBy,
              order.id,
              `Auto-deducted for order #${order.orderNumber} (${item.productName})`
            );
          }
        }
      }
    }
  }

  public recordPayment(paymentData: {
    orderId: string;
    amount: number;
    method: any;
    transactionReference?: string;
    notes?: string;
    createdBy: string;
  }): { payment: Payment; order: Order } {
    const order = this.getOrderById(paymentData.orderId);
    if (!order) throw new Error('Order not found');

    const amount = Number(paymentData.amount);
    if (amount <= 0) throw new Error('Payment amount must be greater than zero');

    this.data.counters.paymentSeq += 1;
    const paymentCode = `PAY-${String(this.data.counters.paymentSeq).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const payment: Payment = {
      id: paymentCode,
      paymentCode,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      amount,
      method: paymentData.method,
      transactionReference: paymentData.transactionReference,
      paymentDate: now,
      notes: paymentData.notes,
      createdBy: paymentData.createdBy,
      createdAt: now
    };

    this.data.payments.unshift(payment);

    // Update order totals
    order.paidAmount += amount;
    order.balanceAmount = Math.max(0, order.grandTotal - order.paidAmount);

    if (order.paidAmount >= order.grandTotal) {
      order.paymentStatus = 'PAID';
    } else if (order.paidAmount > 0) {
      order.paymentStatus = 'PARTIALLY_PAID';
    }
    order.updatedAt = now;

    this.save();
    return { payment, order };
  }

  // --- Settings ---
  public getSettings(): SystemSettings {
    if (!this.data.settings) {
      this.data.settings = { ...defaultSettings };
    }
    if (!this.data.settings.upiId || this.data.settings.upiId === 'cardscrafted@okaxis') {
      this.data.settings.upiId = 'shiv.khante5-2@okaxis';
    }
    return this.data.settings;
  }

  public updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    Object.assign(this.data.settings, newSettings);
    this.save();
    return this.data.settings;
  }

  // --- Address Book ---
  public getAddressesByCustomerId(customerId: string): CustomerAddress[] {
    this.data.addresses = this.data.addresses || [];
    return this.data.addresses.filter(a => a.customerId === customerId);
  }

  public addAddress(addressData: Omit<CustomerAddress, 'id' | 'createdAt'>): CustomerAddress {
    this.data.addresses = this.data.addresses || [];
    // If set as primary, unmark other addresses for this customer
    if (addressData.isPrimary) {
      this.data.addresses.forEach(a => {
        if (a.customerId === addressData.customerId) {
          a.isPrimary = false;
        }
      });
    } else if (this.data.addresses.filter(a => a.customerId === addressData.customerId).length === 0) {
      // First address defaults to primary
      addressData.isPrimary = true;
    }

    const newAddress: CustomerAddress = {
      ...addressData,
      id: `addr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.data.addresses.unshift(newAddress);
    this.save();
    return newAddress;
  }

  public updateAddress(id: string, customerId: string, updates: Partial<CustomerAddress>): CustomerAddress | undefined {
    this.data.addresses = this.data.addresses || [];
    const address = this.data.addresses.find(a => a.id === id && a.customerId === customerId);
    if (!address) return undefined;

    if (updates.isPrimary) {
      this.data.addresses.forEach(a => {
        if (a.customerId === customerId) {
          a.isPrimary = false;
        }
      });
    }

    Object.assign(address, updates);
    this.save();
    return address;
  }

  public deleteAddress(id: string, customerId: string): boolean {
    this.data.addresses = this.data.addresses || [];
    const index = this.data.addresses.findIndex(a => a.id === id && a.customerId === customerId);
    if (index === -1) return false;

    const wasPrimary = this.data.addresses[index].isPrimary;
    this.data.addresses.splice(index, 1);

    // If we deleted the primary address, make the first remaining address primary
    if (wasPrimary) {
      const remaining = this.data.addresses.find(a => a.customerId === customerId);
      if (remaining) {
        remaining.isPrimary = true;
      }
    }

    this.save();
    return true;
  }

  public setPrimaryAddress(id: string, customerId: string): CustomerAddress | undefined {
    this.data.addresses = this.data.addresses || [];
    const target = this.data.addresses.find(a => a.id === id && a.customerId === customerId);
    if (!target) return undefined;

    this.data.addresses.forEach(a => {
      if (a.customerId === customerId) {
        a.isPrimary = a.id === id;
      }
    });

    this.save();
    return target;
  }

  // --- Saved Items / Wishlist ---
  public getWishlistByCustomerId(customerId: string): WishlistItem[] {
    this.data.wishlists = this.data.wishlists || [];
    return this.data.wishlists.filter(w => w.customerId === customerId);
  }

  public addToWishlist(itemData: Omit<WishlistItem, 'id' | 'savedAt'>): WishlistItem {
    this.data.wishlists = this.data.wishlists || [];
    const existing = this.data.wishlists.find(
      w => w.customerId === itemData.customerId && w.productId === itemData.productId
    );
    if (existing) return existing;

    const newItem: WishlistItem = {
      ...itemData,
      id: `wish-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      savedAt: new Date().toISOString()
    };
    this.data.wishlists.unshift(newItem);
    this.save();
    return newItem;
  }

  public removeFromWishlist(id: string, customerId: string): boolean {
    this.data.wishlists = this.data.wishlists || [];
    const initialLen = this.data.wishlists.length;
    this.data.wishlists = this.data.wishlists.filter(
      w => !(w.id === id && w.customerId === customerId) && !(w.productId === id && w.customerId === customerId)
    );
    const deleted = this.data.wishlists.length !== initialLen;
    if (deleted) this.save();
    return deleted;
  }

  // --- Customer Notifications ---
  public getCustomerNotifications(userId: string): Notification[] {
    this.data.notifications = this.data.notifications || [];
    const notifs = this.data.notifications.filter(n => n.userId === userId || !n.userId);
    // If empty for this user, populate sample customer alerts so they see stock, order, and offer alerts immediately!
    if (notifs.length === 0) {
      const existingOrder = this.data.orders[0];
      const samples: Notification[] = [
        {
          id: `notif-stock-${Date.now()}`,
          userId,
          title: '🌸 Back In Stock Alert',
          message: 'Handmade Floral Explosion Box & Pop-Up Card is back in stock! Order your custom gift today.',
          type: 'STOCK_ALERT',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: `notif-status-${Date.now() + 1}`,
          userId,
          orderId: existingOrder ? existingOrder.id : undefined,
          orderNumber: existingOrder ? existingOrder.orderNumber : undefined,
          title: `✨ Order #${existingOrder ? existingOrder.orderNumber : 'CC-00001'} Craft In Progress`,
          message: `Shivani has begun hand-crafting your custom order details. Status: ${existingOrder ? existingOrder.status.replace(/_/g, ' ') : 'In Production'}.`,
          type: 'ORDER_STATUS',
          read: false,
          createdAt: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: `notif-offer-${Date.now() + 2}`,
          userId,
          title: '🎁 Special Craft Offer Alert',
          message: 'Enjoy ₹150 OFF on all personalized birthday greeting cards with code CRAFT150.',
          type: 'OFFER_ALERT',
          read: false,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      this.data.notifications.unshift(...samples);
      this.save();
      return samples;
    }
    return notifs;
  }

  public markNotificationRead(id: string, userId?: string): boolean {
    this.data.notifications = this.data.notifications || [];
    const notif = this.data.notifications.find(n => n.id === id && (!userId || n.userId === userId || !n.userId));
    if (!notif) return false;
    notif.read = true;
    this.save();
    return true;
  }

  public markAllNotificationsRead(userId?: string): boolean {
    this.data.notifications = this.data.notifications || [];
    this.data.notifications.forEach(n => {
      if (!userId || n.userId === userId || !n.userId) {
        n.read = true;
      }
    });
    this.save();
    return true;
  }

  public deleteNotification(id: string, userId?: string): boolean {
    this.data.notifications = this.data.notifications || [];
    const idx = this.data.notifications.findIndex(n => n.id === id && (!userId || n.userId === userId || !n.userId));
    if (idx === -1) return false;
    this.data.notifications.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Account Deletion ---
  public deleteCustomerAccount(userId: string, customerId?: string): boolean {
    // Remove user
    const uIdx = this.data.users.findIndex(u => u.id === userId);
    if (uIdx !== -1) {
      this.data.users.splice(uIdx, 1);
    }

    // Remove or deactivate customer profile
    if (customerId) {
      const cIdx = this.data.customers.findIndex(c => c.id === customerId || c.customerCode === customerId);
      if (cIdx !== -1) {
        this.data.customers[cIdx].status = 'INACTIVE';
      }
      // Clean up addresses and wishlists
      this.data.addresses = (this.data.addresses || []).filter(a => a.customerId !== customerId);
      this.data.wishlists = (this.data.wishlists || []).filter(w => w.customerId !== customerId);
    }

    // Clean up notifications
    this.data.notifications = (this.data.notifications || []).filter(n => n.userId !== userId);

    this.save();
    return true;
  }

  // --- Bulk Export / Import for Firebase Cloud Sync ---
  public exportAllData(): DatabaseSchema {
    return {
      users: this.data.users || [],
      customers: this.data.customers || [],
      products: this.data.products || [],
      inventory: this.data.inventory || [],
      orders: this.data.orders || [],
      payments: this.data.payments || [],
      statusHistory: this.data.statusHistory || [],
      inventoryMovements: this.data.inventoryMovements || [],
      notifications: this.data.notifications || [],
      auditLogs: this.data.auditLogs || [],
      addresses: this.data.addresses || [],
      wishlists: this.data.wishlists || [],
      settings: this.data.settings || defaultSettings,
      counters: this.data.counters || {
        customerSeq: (this.data.customers || []).length,
        orderSeq: (this.data.orders || []).length,
        productSeq: (this.data.products || []).length,
        inventorySeq: (this.data.inventory || []).length,
        paymentSeq: (this.data.payments || []).length
      }
    };
  }

  public importAllData(incoming: Partial<DatabaseSchema>): { importedCount: number; details: Record<string, number> } {
    let importedCount = 0;
    const details: Record<string, number> = {};

    const mergeCollection = <T extends { id: string }>(targetKey: keyof DatabaseSchema, incomingList?: T[]) => {
      if (!incomingList || !Array.isArray(incomingList) || incomingList.length === 0) {
        details[targetKey as string] = 0;
        return;
      }
      const existingList = (this.data[targetKey] as unknown as T[]) || [];
      const map = new Map<string, T>();
      existingList.forEach(item => {
        if (item && item.id) map.set(item.id, item);
      });
      let addedOrUpdated = 0;
      incomingList.forEach(item => {
        if (item && item.id) {
          map.set(item.id, { ...(map.get(item.id) || {}), ...item });
          addedOrUpdated++;
        }
      });
      (this.data[targetKey] as unknown as T[]) = Array.from(map.values());
      details[targetKey as string] = addedOrUpdated;
      importedCount += addedOrUpdated;
    };

    mergeCollection('users', incoming.users);
    mergeCollection('customers', incoming.customers);
    mergeCollection('products', incoming.products);
    mergeCollection('inventory', incoming.inventory);
    mergeCollection('orders', incoming.orders);
    mergeCollection('payments', incoming.payments);
    mergeCollection('statusHistory', incoming.statusHistory);
    mergeCollection('inventoryMovements', incoming.inventoryMovements);
    mergeCollection('notifications', incoming.notifications);
    mergeCollection('auditLogs', incoming.auditLogs);
    mergeCollection('addresses', incoming.addresses);
    mergeCollection('wishlists', incoming.wishlists);

    if (incoming.settings && typeof incoming.settings === 'object') {
      this.data.settings = { ...(this.data.settings || defaultSettings), ...incoming.settings };
      importedCount++;
      details['settings'] = 1;
    }

    // Recalculate max counters based on records
    this.data.counters = {
      customerSeq: Math.max(this.data.counters?.customerSeq || 0, (this.data.customers || []).length),
      orderSeq: Math.max(this.data.counters?.orderSeq || 0, (this.data.orders || []).length),
      productSeq: Math.max(this.data.counters?.productSeq || 0, (this.data.products || []).length),
      inventorySeq: Math.max(this.data.counters?.inventorySeq || 0, (this.data.inventory || []).length),
      paymentSeq: Math.max(this.data.counters?.paymentSeq || 0, (this.data.payments || []).length)
    };

    this.save();
    return { importedCount, details };
  }
}

export const db = new DatabaseStore();
