import { OrderStatus, Order } from '../types';

export interface OrderStepInfo {
  status: OrderStatus;
  label: string;
  shortLabel: string;
  desc: string;
  color: string;
}

/**
 * Checks whether an order is a Print Document order or a standard Craft order.
 */
export function isPrintOrder(order?: Partial<Order> | null): boolean {
  if (!order) return false;
  if (order.orderType === 'PRINT' || order.orderType === 'DOCUMENT_PRINTING') return true;
  if (order.customDetails?.printConfig) return true;
  if (order.items && Array.isArray(order.items)) {
    return order.items.some(item => {
      const name = (item.productName || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      const id = (item.productId || '').toLowerCase();
      return (
        name.includes('print') ||
        name.includes('document') ||
        name.includes('pdf') ||
        notes.includes('print') ||
        notes.includes('gsm') ||
        id === 'print-doc' ||
        id.includes('print')
      );
    });
  }
  return false;
}

/**
 * Lifecycle step sequence for PRINT ORDERS ONLY:
 * 1. Order Received
 * 2. Confirmed
 * 3. Print In Progress
 * 4. Print Done
 * 5. Packed Seal
 * 6. Ready to Dispatch
 * 7. Delivered
 */
export const PRINT_ORDER_STEPS: OrderStepInfo[] = [
  {
    status: 'ORDER_RECEIVED',
    label: 'Order Received',
    shortLabel: 'Received',
    desc: 'Document upload received & verified for printing',
    color: 'blue'
  },
  {
    status: 'CONFIRMED',
    label: 'Confirmed',
    shortLabel: 'Confirmed',
    desc: 'Print specifications confirmed & queued to printer',
    color: 'indigo'
  },
  {
    status: 'PRINT_IN_PROGRESS',
    label: 'Print In Progress',
    shortLabel: 'Printing',
    desc: 'High-speed laser printing in progress with selected GSM paper',
    color: 'purple'
  },
  {
    status: 'PRINT_DONE',
    label: 'Print Done',
    shortLabel: 'Print Done',
    desc: 'Printing completed, verified for sharpness and page alignment',
    color: 'cyan'
  },
  {
    status: 'PACKED_SEAL',
    label: 'Packed Seal',
    shortLabel: 'Packed Seal',
    desc: 'Documents securely sealed in tamper-proof protective packaging',
    color: 'amber'
  },
  {
    status: 'READY_TO_DISPATCH',
    label: 'Ready to Dispatch',
    shortLabel: 'Ready to Dispatch',
    desc: 'Packaged & ready for counter pickup or courier dispatch',
    color: 'emerald'
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    shortLabel: 'Delivered',
    desc: 'Document order successfully handed over to customer',
    color: 'green'
  }
];

/**
 * Ordered statuses for admin manual status changes for PRINT ORDERS
 */
export const PRINT_ORDER_STATUS_FLOW: OrderStatus[] = [
  'ORDER_RECEIVED',
  'CONFIRMED',
  'PRINT_IN_PROGRESS',
  'PRINT_DONE',
  'PACKED_SEAL',
  'READY_TO_DISPATCH',
  'DELIVERED'
];

/**
 * Standard lifecycle step sequence for HANDMADE CRAFT ORDERS:
 */
export const CRAFT_ORDER_STEPS: OrderStepInfo[] = [
  {
    status: 'NEW',
    label: 'Order Received',
    shortLabel: 'Received',
    desc: 'Craft request logged into studio schedule',
    color: 'blue'
  },
  {
    status: 'CONFIRMED',
    label: 'Confirmed',
    shortLabel: 'Confirmed',
    desc: 'Design specifications & materials verified',
    color: 'indigo'
  },
  {
    status: 'DESIGNING',
    label: 'Designing',
    shortLabel: 'Designing',
    desc: 'Digital mockups & typography in progress',
    color: 'purple'
  },
  {
    status: 'DESIGN_APPROVED',
    label: 'Design Approved',
    shortLabel: 'Approved',
    desc: 'Customer approved proof for creation',
    color: 'fuchsia'
  },
  {
    status: 'IN_PRODUCTION',
    label: 'In Production',
    shortLabel: 'In Production',
    desc: 'Artisan crafting & assembly in workshop',
    color: 'amber'
  },
  {
    status: 'QUALITY_CHECK',
    label: 'Quality Check',
    shortLabel: 'Quality Check',
    desc: 'Final inspection & curing check',
    color: 'yellow'
  },
  {
    status: 'READY',
    label: 'Ready for Pickup',
    shortLabel: 'Ready',
    desc: 'Packed & ready for pickup or dispatch',
    color: 'emerald'
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    shortLabel: 'Delivered',
    desc: 'Order safely delivered to recipient',
    color: 'green'
  }
];

export const CRAFT_ORDER_STATUS_FLOW: OrderStatus[] = [
  'CONFIRMED',
  'DESIGNING',
  'DESIGN_APPROVED',
  'IN_PRODUCTION',
  'QUALITY_CHECK',
  'READY',
  'DELIVERED'
];

/**
 * Returns the relevant steps list depending on order type
 */
export function getOrderSteps(order?: Partial<Order> | null): OrderStepInfo[] {
  return isPrintOrder(order) ? PRINT_ORDER_STEPS : CRAFT_ORDER_STEPS;
}

/**
 * Normalizes status to find step index in the progress stepper
 */
export function getOrderStepIndex(status: OrderStatus | string, isPrint: boolean): number {
  if (isPrint) {
    // Normalize aliases for print orders
    if (status === 'NEW' || status === 'ORDER_RECEIVED') return 0;
    if (status === 'CONFIRMED') return 1;
    if (status === 'PRINT_IN_PROGRESS' || status === 'DESIGNING' || status === 'DESIGN_APPROVED' || status === 'IN_PRODUCTION') return 2;
    if (status === 'PRINT_DONE' || status === 'QUALITY_CHECK') return 3;
    if (status === 'PACKED_SEAL') return 4;
    if (status === 'READY_TO_DISPATCH' || status === 'READY' || status === 'OUT_FOR_DELIVERY') return 5;
    if (status === 'DELIVERED') return 6;
    return -1;
  } else {
    // Normal craft order
    if (status === 'NEW' || status === 'ORDER_RECEIVED') return 0;
    if (status === 'CONFIRMED') return 1;
    if (status === 'DESIGNING') return 2;
    if (status === 'DESIGN_APPROVED') return 3;
    if (status === 'IN_PRODUCTION' || status === 'PRINT_IN_PROGRESS') return 4;
    if (status === 'QUALITY_CHECK' || status === 'PRINT_DONE') return 5;
    if (status === 'READY' || status === 'PACKED_SEAL' || status === 'READY_TO_DISPATCH' || status === 'OUT_FOR_DELIVERY') return 6;
    if (status === 'DELIVERED') return 7;
    return -1;
  }
}

/**
 * Human-readable display status label with print order context
 */
export function formatOrderStatus(status: OrderStatus | string, isPrint: boolean = false): string {
  switch (status) {
    case 'NEW':
      return isPrint ? 'Order Received' : 'New Order';
    case 'ORDER_RECEIVED':
      return 'Order Received';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'PRINT_IN_PROGRESS':
      return 'Print In Progress';
    case 'PRINT_DONE':
      return 'Print Done';
    case 'PACKED_SEAL':
      return 'Packed Seal';
    case 'READY_TO_DISPATCH':
      return 'Ready to Dispatch';
    case 'DESIGNING':
      return 'Designing';
    case 'DESIGN_APPROVED':
      return 'Design Approved';
    case 'IN_PRODUCTION':
      return isPrint ? 'Print In Progress' : 'In Production';
    case 'QUALITY_CHECK':
      return isPrint ? 'Print Done' : 'Quality Check';
    case 'READY':
      return isPrint ? 'Ready to Dispatch' : 'Ready for Pickup';
    case 'OUT_FOR_DELIVERY':
      return isPrint ? 'Ready to Dispatch' : 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return (status || '').replace(/_/g, ' ');
  }
}
