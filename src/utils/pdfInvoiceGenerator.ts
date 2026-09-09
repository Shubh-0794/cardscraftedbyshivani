import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, SystemSettings } from '../types';
import { isPrintOrder, formatOrderStatus } from './orderStatusUtils';

export interface GeneratePdfOptions {
  fileName?: string;
  docTitle?: string;
}

/**
 * Generates and downloads a high-quality, professional summary invoice PDF for any order.
 * Specially formatted for Print Orders and Craft Orders with full specification details.
 */
export function generateOrderSummaryPdf(
  order: Order,
  settings?: SystemSettings | null,
  options?: GeneratePdfOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const isPrint = isPrintOrder(order);
  const bizName = settings?.businessName || 'Cards Crafted Studio';
  const bizAddr = settings?.address || '102 Creative Craft Lane, Handloom Market';
  const bizCityState = `${settings?.city || 'Mumbai'}, ${settings?.state || 'Maharashtra'} - ${settings?.pincode || '400012'}`;
  const bizPhone = settings?.phone || '+91 98201 12345';
  const bizEmail = settings?.email || 'contact@cardscrafted.com';
  const gstin = settings?.gstin || '27AABCC1234D1ZP';
  const upiId = settings?.upiId || 'shiv.khante5-2@okaxis';

  // Palette colors
  const primaryColor = isPrint ? [37, 99, 235] as [number, number, number] : [126, 34, 206] as [number, number, number]; // Blue-600 or Purple-700
  const darkColor: [number, number, number] = [15, 23, 42]; // Slate-900
  const grayColor: [number, number, number] = [100, 116, 139]; // Slate-500
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate-50

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  let currentY = margin;

  // 1. Top Decorative Brand Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 6, 'F');

  currentY = 16;

  // Header: Business Info (Left) and Invoice Badge (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...darkColor);
  doc.text(bizName, margin, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text(isPrint ? 'LASER DOCUMENT PRINTING & COPY STUDIO' : 'HANDCRAFTED ART & CUSTOM PRINTING', margin, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`${bizAddr}, ${bizCityState}`, margin, currentY);
  currentY += 3.5;
  doc.text(`Phone: ${bizPhone}  |  Email: ${bizEmail}`, margin, currentY);
  if (gstin) {
    currentY += 3.5;
    doc.text(`GSTIN: ${gstin}`, margin, currentY);
  }

  // Right Side - Invoice / Order Header Box
  const rightBoxX = pageWidth - margin - 65;
  const rightBoxY = 14;
  
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightBoxX, rightBoxY, 65, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text(options?.docTitle || (isPrint ? 'PRINT ORDER INVOICE' : 'TAX INVOICE / SUMMARY'), rightBoxX + 32.5, rightBoxY + 7, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.text(`Order #: ${order.orderNumber}`, rightBoxX + 4, rightBoxY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  const formattedDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
  doc.text(`Date: ${formattedDate}`, rightBoxX + 4, rightBoxY + 19);

  const statusLabel = formatOrderStatus(order.status, isPrint);
  doc.text(`Status: ${statusLabel}`, rightBoxX + 4, rightBoxY + 24);

  // Status & Payment Pill
  const isPaid = order.balanceAmount <= 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  if (isPaid) {
    doc.setTextColor(22, 101, 52); // green
    doc.text('● FULLY PAID', rightBoxX + 45, rightBoxY + 24);
  } else if (order.paidAmount > 0) {
    doc.setTextColor(180, 83, 9); // amber
    doc.text('● PARTIAL DUE', rightBoxX + 40, rightBoxY + 24);
  } else {
    doc.setTextColor(185, 28, 28); // red
    doc.text('● UNPAID', rightBoxX + 48, rightBoxY + 24);
  }

  // Divider Line
  currentY = 48;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // 2. Customer Information & Delivery Summary Box
  currentY += 5;
  const colWidth = (pageWidth - margin * 2 - 6) / 2;

  // Billed To Column
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, currentY, colWidth, 24, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('CUSTOMER / BILLED TO', margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...darkColor);
  doc.text(order.customerName || 'Valued Customer', margin + 4, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Phone: ${order.customerPhone || 'N/A'}`, margin + 4, currentY + 16);
  doc.text(`Email: ${order.customerEmail || 'N/A'}`, margin + 4, currentY + 20.5);

  // Delivery & Dispatch Details Column
  const col2X = margin + colWidth + 6;
  doc.setFillColor(...lightBg);
  doc.roundedRect(col2X, currentY, colWidth, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('ORDER & DISPATCH DETAILS', col2X + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkColor);
  const estDelivery = order.expectedDeliveryDate 
    ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Immediate / Ready for Pickup';
  doc.text(`Estimated Delivery: ${estDelivery}`, col2X + 4, currentY + 11);
  doc.setTextColor(...grayColor);
  doc.text(`Workflow Type: ${isPrint ? 'Laser Print Pipeline (A4 Spec)' : 'Custom Craft Order'}`, col2X + 4, currentY + 16);
  doc.text(`Priority: ${order.priority || 'NORMAL'}`, col2X + 4, currentY + 20.5);

  currentY += 28;

  // 3. Document / Order Items Table
  const tableData: any[][] = [];

  if (order.items && order.items.length > 0) {
    order.items.forEach((item, idx) => {
      const lineTotal = item.totalPrice || ((item.quantity || 1) * (item.unitPrice || 0));
      
      // Detailed description if notes or print configs exist
      let desc = item.productName || 'Order Item';
      if (item.notes) {
        desc += `\nSpecs: ${item.notes}`;
      } else if (order.customDetails?.printConfig) {
        const pc = order.customDetails.printConfig;
        desc += `\n(Config: ${pc.paperGsm.replace('_', ' ')} • ${pc.colorType === 'COLOR' ? 'Full Color' : 'Black & White'} • ${pc.printSides === 'DOUBLE' ? '2-Sided' : '1-Sided'} • ${pc.totalPages} pgs)`;
      }

      tableData.push([
        (idx + 1).toString(),
        desc,
        `x${item.quantity || 1}`,
        `Rs. ${(item.unitPrice || 0).toFixed(2)}`,
        `Rs. ${lineTotal.toFixed(2)}`
      ]);
    });
  } else {
    tableData.push([
      '1',
      isPrint ? 'Custom Document Laser Print Service' : 'Custom Craft Item',
      'x1',
      `Rs. ${(order.grandTotal || 0).toFixed(2)}`,
      `Rs. ${(order.grandTotal || 0).toFixed(2)}`
    ]);
  }

  // Draw Table using jspdf-autotable
  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Document / Item Description & Specifications', 'Qty / Copies', 'Unit Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: darkColor,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  currentY = finalY + 5;

  // 4. Special Instructions & Print Notes (Left) vs Financial Breakdown (Right)
  const totalsBoxWidth = 72;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const notesWidth = totalsBoxX - margin - 6;

  // Left Box: Print Specs / Custom Details
  if (order.customDetails || isPrint) {
    doc.setFillColor(...lightBg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, notesWidth, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text(isPrint ? 'PRINT QUALITY & BINDING SPECIFICATIONS' : 'CUSTOM CRAFT SPECIFICATIONS', margin + 3.5, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkColor);
    
    let noteY = currentY + 9.5;
    if (order.customDetails?.printConfig) {
      const pc = order.customDetails.printConfig;
      doc.text(`• Paper: ${pc.paperGsm.replace('_', ' ')} (${pc.paperSize || 'A4'})`, margin + 3.5, noteY);
      noteY += 4;
      doc.text(`• Mode: ${pc.colorType === 'COLOR' ? 'High-Def Vivid Color' : 'Crisp Monochrome Black & White'}`, margin + 3.5, noteY);
      noteY += 4;
      doc.text(`• Orientation & Sides: ${pc.orientation || 'Portrait'} • ${pc.printSides === 'DOUBLE' ? 'Double Sided (Duplex)' : 'Single Sided'}`, margin + 3.5, noteY);
      noteY += 4;
      if (pc.specialInstructions) {
        doc.text(`• Instructions: ${pc.specialInstructions.substring(0, 70)}`, margin + 3.5, noteY);
        noteY += 4;
      }
    } else if (order.customDetails) {
      if (order.customDetails.designName) {
        doc.text(`• Design: ${order.customDetails.designName}`, margin + 3.5, noteY);
        noteY += 4;
      }
      if (order.customDetails.textContent) {
        doc.text(`• Calligraphy/Text: "${order.customDetails.textContent.substring(0, 50)}"`, margin + 3.5, noteY);
        noteY += 4;
      }
      if (order.customDetails.instructions) {
        doc.text(`• Notes: ${order.customDetails.instructions.substring(0, 65)}`, margin + 3.5, noteY);
        noteY += 4;
      }
    } else {
      doc.text('• High-definition commercial laser grade print on standard A4 media.', margin + 3.5, noteY);
      noteY += 4;
      doc.text('• Sealed in moisture-resistant sleeve prior to dispatch.', margin + 3.5, noteY);
      noteY += 4;
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...grayColor);
    doc.text('Orders packed and verified under strict QC standards.', margin + 3.5, currentY + 34);
  }

  // Right Box: Financial Summary Totals
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, 38, 2, 2, 'FD');

  const subtotalVal = order.subtotal ?? order.grandTotal;
  let summaryY = currentY + 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('Subtotal:', totalsBoxX + 4, summaryY);
  doc.setTextColor(...darkColor);
  doc.text(`Rs. ${(subtotalVal || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 4, summaryY, { align: 'right' });

  if ((order.discount || 0) > 0) {
    summaryY += 4.5;
    doc.setTextColor(22, 101, 52); // green
    doc.text('Discount / Free Promo:', totalsBoxX + 4, summaryY);
    doc.text(`-Rs. ${(order.discount || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 4, summaryY, { align: 'right' });
  }

  if ((order.deliveryCharge || 0) > 0) {
    summaryY += 4.5;
    doc.setTextColor(...grayColor);
    doc.text('Delivery Charge:', totalsBoxX + 4, summaryY);
    doc.setTextColor(...darkColor);
    doc.text(`Rs. ${(order.deliveryCharge || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 4, summaryY, { align: 'right' });
  }

  if ((order.tax || 0) > 0) {
    summaryY += 4.5;
    doc.setTextColor(...grayColor);
    doc.text('GST / Tax:', totalsBoxX + 4, summaryY);
    doc.setTextColor(...darkColor);
    doc.text(`Rs. ${(order.tax || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 4, summaryY, { align: 'right' });
  }

  // Grand Total Line
  summaryY += 6;
  doc.setFillColor(...primaryColor);
  doc.rect(totalsBoxX, summaryY - 3.5, totalsBoxWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL:', totalsBoxX + 4, summaryY + 1);
  doc.text(`Rs. ${(order.grandTotal || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 4, summaryY + 1, { align: 'right' });

  // Paid & Balance Line
  summaryY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...grayColor);
  doc.text(`Paid: Rs. ${(order.paidAmount || 0).toFixed(2)}`, totalsBoxX + 4, summaryY);
  
  if (order.balanceAmount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text(`Due: Rs. ${(order.balanceAmount || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 4, summaryY, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('Fully Paid ✓', totalsBoxX + totalsBoxWidth - 4, summaryY, { align: 'right' });
  }

  // 5. Payment Details, UPI & Bank Box
  currentY += 43;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...darkColor);
  doc.text('PAYMENT INFORMATION & INSTANT SETTLEMENT', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...grayColor);
  doc.text(`UPI VPA: ${upiId}  •  Accepted: GooglePay, PhonePe, Paytm, BHIM UPI, NetBanking`, margin + 4, currentY + 9.5);
  doc.text(`For immediate order support & print updates, contact: ${bizPhone} or ${bizEmail}`, margin + 4, currentY + 14);

  // Authorized Signatory Seal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryColor);
  doc.text(`For ${bizName}`, pageWidth - margin - 35, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...grayColor);
  doc.text('Authorized Signatory / Studio QC', pageWidth - margin - 35, currentY + 14);

  // 6. Bottom Footer
  const footerY = 285;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.text(
    `This is a computer-generated summary invoice from ${bizName}. Valid without physical signature.`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Trigger Save/Download
  const cleanCustomerName = (order.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const targetFileName = options?.fileName || `Invoice_${order.orderNumber}_${cleanCustomerName}.pdf`;
  doc.save(targetFileName);

  return doc;
}
