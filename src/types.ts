export type UserRole = 'SUPER_ADMIN' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  passwordHash?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  passwordResetOtp?: string;
  passwordResetOtpExpires?: string;
  lastLogin?: string;
  createdAt: string;
  customerId?: string; // Linked customer ID if role is CUSTOMER
  hasUsedFirstOrderFreeOffer?: boolean;
  githubId?: string;
  githubUsername?: string;
  githubAvatarUrl?: string;
  githubConnectedAt?: string;
}

export interface Customer {
  id: string;
  customerCode: string; // e.g. CUS-00001
  userId?: string;
  name: string;
  email: string;
  whatsapp: string;
  alternatePhone?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  hasUsedFirstOrderFreeOffer?: boolean;
  githubId?: string;
  githubUsername?: string;
  githubAvatarUrl?: string;
  githubConnectedAt?: string;
  createdAt: string;
}

export type OrderStatus =
  | 'NEW'
  | 'PAYMENT_VERIFICATION_PENDING'
  | 'PAYMENT_REJECTED'
  | 'ORDER_RECEIVED'
  | 'CONFIRMED'
  | 'PRINT_IN_PROGRESS'
  | 'PRINT_DONE'
  | 'PACKED_SEAL'
  | 'READY_TO_DISPATCH'
  | 'DESIGNING'
  | 'DESIGN_APPROVED'
  | 'IN_PRODUCTION'
  | 'QUALITY_CHECK'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'PENDING_VERIFICATION' | 'REJECTED' | 'REFUNDED';

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';

export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface PrintDocumentConfig {
  id?: string;
  documentName: string;
  documentSize?: string;
  documentType?: string; // 'PDF' | 'DOCX' | 'IMAGE' | 'OTHER'
  fileDataUrl?: string;
  totalPages: number;
  copies: number;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  colorType: 'BW' | 'COLOR';
  paperSize: 'A4' | 'A3' | 'LEGAL' | 'LETTER';
  paperGsm: '75_GSM' | '100_GSM' | 'PHOTO_PAPER';
  printSides: 'SINGLE' | 'DOUBLE';
  bindingType?: 'NONE';
  specialInstructions?: string;
  pricePerPage: number;
  totalPrice: number;
  firstPrintDiscountApplied?: boolean;
}

export interface CustomCraftDetails {
  designName: string;
  description: string;
  dimensions?: string;
  material?: string;
  color?: string;
  textContent?: string;
  instructions?: string;
  referenceImages?: string[];
  printConfig?: PrintDocumentConfig;
}

export interface UpiVerificationDetails {
  utr: string;
  amount: number;
  upiId: string;
  payerUpi?: string;
  submittedAt: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. CC-2026-00001
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: OrderStatus;
  orderType?: 'CRAFT' | 'PRINT' | 'DOCUMENT_PRINTING';
  items: OrderItem[];
  customDetails?: CustomCraftDetails;
  shippingMethod?: 'PICKUP' | 'DELIVERY';
  shippingAddress?: any;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  upiVerification?: UpiVerificationDetails;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  oldStatus?: OrderStatus;
  newStatus: OrderStatus;
  changedBy: string;
  changedAt: string;
  remarks?: string;
}

export interface ProductMaterialRequirement {
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  quantityRequired: number;
}

export interface Product {
  id: string;
  sku: string; // PRD-00001
  name: string;
  category: string;
  description: string;
  sellingPrice: number;
  costPrice: number;
  taxPercent: number;
  stockQuantity: number;
  minStock: number;
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  materials?: ProductMaterialRequirement[];
  createdAt: string;
}

export type PurchaseChannel = 'ONLINE' | 'OFFLINE';
export type OnlinePurchasePlatform = 'FLIPKART' | 'AMAZON' | 'MEESHO' | 'OTHER';

export interface InventoryItem {
  id: string;
  sku: string; // INV-00001
  name: string;
  category: 'RAW_MATERIAL' | 'FINISHED_PRODUCT' | 'PACKAGING' | 'ACCESSORIES' | 'CONSUMABLES';
  unit: 'PCS' | 'SETS' | 'BOXES' | 'SHEETS' | 'METERS' | 'GRAMS' | 'KG' | 'LITRES';
  currentStock: number;
  minStock: number;
  maxStock: number;
  purchasePrice: number;
  sellingPrice?: number;
  purchaseChannel?: PurchaseChannel;
  purchasePlatform?: OnlinePurchasePlatform | string;
  purchasePlatformOther?: string;
  purchaseOrderRef?: string;
  supplier?: string;
  storageLocation?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export type StockMovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ADJUSTMENT'
  | 'DAMAGED'
  | 'RETURNED'
  | 'USED_IN_ORDER';

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  movementType: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  purchaseChannel?: PurchaseChannel;
  purchasePlatform?: OnlinePurchasePlatform | string;
  purchasePlatformOther?: string;
  purchaseOrderRef?: string;
  orderId?: string;
  createdBy: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentCode: string; // PAY-00001
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  paymentDate: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId?: string;
  orderId?: string;
  orderNumber?: string;
  title: string;
  message: string;
  type: 'LOW_STOCK' | 'PAYMENT_DUE' | 'NEW_ORDER' | 'STATUS_CHANGE' | 'NEW_CUSTOMER' | 'STOCK_ALERT' | 'ORDER_STATUS' | 'OFFER_ALERT';
  read: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string; // 'Home' | 'Work' | 'Studio' | 'Gift Delivery' | string
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  customerId: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
  stockQuantity: number;
  savedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export type ActivityLog = AuditLog;

export interface SystemSettings {
  companyName: string;
  businessName: string;
  logoUrl: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  gstin: string;
  upiId?: string;
  bankDetails?: string;
  currencySymbol?: string;
  orderPrefix: string;
  lowStockAlertThreshold: number;
  defaultTaxPercent: number;
  whatsappOrderConfirmedMsg: string;
  whatsappOrderReadyMsg: string;
  whatsappPaymentDueMsg: string;
}

export type BusinessSettings = SystemSettings;



