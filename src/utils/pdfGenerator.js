import { jsPDF } from 'jspdf';
import dayjs from 'dayjs';

export const generateInvoicePdf = async (order) => {
  // Create new PDF document with A4 page size
  const doc = new jsPDF();
  doc.setFont('Courier'); // Set default font to Courier for typewriter look

  // Document properties
  const invoiceNumber = `INV_${order._id}`;
  const orderDate = dayjs(order.createdAt).format('DD/MM/YYYY');

  // Calculate totals
  const itemsTotal = order.items.reduce((acc, item) => acc + (item.priceAtPurchase * item.quantity), 0);

  // Theme Colors
  const themeColor = [45, 45, 45]; // Dark grey
  const blackColor = [0, 0, 0];
  const greyColor = [100, 100, 100]; // Darker text
  const lightGreyColor = [180, 180, 180]; // Lighter text, borders (made slightly lighter)
  const whiteColor = [255, 255, 255];
  const rowStripeColor = [248, 248, 248]; // Very light grey for table row striping

  // Page Margins
  const pageMargin = 12; // Slightly increased margin for a cleaner look
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - (2 * pageMargin);

  // Position tracking
  let yPos = pageMargin;

  // Helper functions
  const addText = (text, x, y, opts = {}) => {
    const options = {
      fontSize: 10,
      color: blackColor,
      fontStyle: 'normal', // 'normal', 'bold', 'italic', 'bolditalic'
      align: 'left',
      maxWidth: undefined,
      ...opts
    };

    doc.setFontSize(options.fontSize);
    doc.setTextColor(...options.color);
    doc.setFont(undefined, options.fontStyle); // Uses the document's current font family (Courier)

    doc.text(text, x, y, { align: options.align, maxWidth: options.maxWidth });
    doc.setFont(undefined, 'normal'); // Reset to normal style for subsequent default calls
  };

  const addLine = (startX, startY, endX, endY, color = lightGreyColor, width = 0.2) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(startX, startY, endX, endY);
  };

  const addRectangle = (x, y, width, height, fillColor, strokeColor = null, strokeWidth = 0) => {
    doc.setFillColor(...fillColor);
    doc.rect(x, y, width, height, 'F'); // Always fill

    if (strokeColor) {
      doc.setDrawColor(...strokeColor);
      doc.setLineWidth(strokeWidth);
      doc.rect(x, y, width, height, 'S');
    }
  };

  // --- HEADER SECTION ---
  yPos = pageMargin + 2; // Start a bit lower
  const logoUrl = `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/assets/logos/md.png`;
  const logoWidth = 20, logoHeight = 20; // Made logo smaller
  let logoAddedSuccessfully = false;

  if (process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL && !logoUrl.startsWith('undefined')) {
    try {
      const res = await fetch(logoUrl);
      if (!res.ok) throw new Error(`Failed to fetch logo: ${res.statusText}`);
      const blob = await res.blob();
      const logoDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, pageMargin, yPos, logoWidth, logoHeight); // Let jsPDF infer format
        yPos += logoHeight + 4; // Reduced spacing after logo
        logoAddedSuccessfully = true;
      }
    } catch (e) {
      console.error('Logo fetch or addImage error:', e);
    }
  }

  if (!logoAddedSuccessfully) {
    addText('MADDY CUSTOM', pageMargin, yPos + 5, { fontSize: 18, color: themeColor, fontStyle: 'bold' }); // Slightly smaller font if logo fails
    yPos += 8; // Reduced spacing
  }

  // Company Details
  let companyYPos = pageMargin + 2; // Align higher, adjusted for smaller header
  addText('MADDY CUSTOM', pageWidth - pageMargin, companyYPos, { fontSize: 11, color: themeColor, fontStyle: 'bold', align: 'right' }); // Slightly smaller
  companyYPos += 5; // Reduced spacing
  addText('VIP Rd, Kasimpur Patri, Tiwaripur', pageWidth - pageMargin, companyYPos, { fontSize: 7, color: greyColor, align: 'right' }); // Smaller font for compactness
  companyYPos += 4; // Reduced spacing
  addText('Lucknow, UP 226005', pageWidth - pageMargin, companyYPos, { fontSize: 7, color: greyColor, align: 'right' }); // Smaller font
  companyYPos += 4; // Reduced spacing
  addText('GSTIN: 09BJFPY6263C1ZV', pageWidth - pageMargin, companyYPos, { fontSize: 7, color: greyColor, align: 'right' }); // Smaller font

  yPos = Math.max(yPos, companyYPos) + 6; // Reduced spacing before line
  addLine(pageMargin, yPos, pageWidth - pageMargin, yPos, themeColor, 0.3);
  yPos += 8; // Reduced spacing after line

  // --- INVOICE TITLE ---
  addText('INVOICE', pageWidth / 2, yPos, { fontSize: 22, color: themeColor, fontStyle: 'bold', align: 'center' }); // Slightly smaller title
  yPos += 12; // Reduced spacing

  // --- BILL TO & INVOICE DETAILS ---
  const infoBoxStartY = yPos;
  const col1X = pageMargin;
  const col2X = pageWidth / 2 + pageMargin / 2; // Adjusted for better spacing
  const infoBoxWidth = usableWidth / 2 - pageMargin / 2;


  // Bill To (Left Column)
  addText('BILL TO:', col1X, yPos, { fontSize: 10, fontStyle: 'bold', color: themeColor });
  yPos += 7;
  const customerName = order.address?.receiverName || 'N/A';
  addText(customerName, col1X, yPos, { fontSize: 10, fontStyle: 'bold', maxWidth: infoBoxWidth });
  yPos += 6;

  const addressLine1 = order.address?.addressLine1 || '';
  const addressLine2 = order.address?.addressLine2 || '';
  let fullAddress = addressLine1;
  if (addressLine2) fullAddress += `, ${addressLine2}`;
  if (!fullAddress) fullAddress = 'N/A';
  
  const addressLines = doc.splitTextToSize(fullAddress, infoBoxWidth);
  addressLines.forEach(line => {
    addText(line, col1X, yPos, { fontSize: 9, color: greyColor, maxWidth: infoBoxWidth });
    yPos += 5;
  });

  addText(`${order.address?.city || 'N/A'}, ${order.address?.state || 'N/A'} - ${order.address?.pincode || 'N/A'}`, col1X, yPos, { fontSize: 9, color: greyColor, maxWidth: infoBoxWidth });
  yPos += 6;
  addText(`Phone: ${order.address?.receiverPhoneNumber || 'N/A'}`, col1X, yPos, { fontSize: 9, color: greyColor, maxWidth: infoBoxWidth });

  // Invoice Details (Right Column)
  let rightColY = infoBoxStartY;
  addText('INVOICE DETAILS:', col2X, rightColY, { fontSize: 10, fontStyle: 'bold', color: themeColor });
  rightColY += 7;

  const detailLabelWidth = 35; // Width for labels like "Invoice No:"
  const addDetail = (label, value, y, options = {}) => {
      addText(label, col2X, y, { fontSize: 9, fontStyle: 'bold', ...options });
      addText(value, col2X + detailLabelWidth, y, { fontSize: 9, color: greyColor, maxWidth: infoBoxWidth - detailLabelWidth, ...options });
  };
  
  addDetail('Invoice No:', invoiceNumber, rightColY);
  rightColY += 6;
  addDetail('Order ID:', order._id, rightColY, {maxWidth: infoBoxWidth - detailLabelWidth}); // Ensure Order ID can wrap if too long
  rightColY += (doc.splitTextToSize(order._id, infoBoxWidth - detailLabelWidth).length > 1 ? 10 : 6); // Adjust spacing if Order ID wraps
  addDetail('Date:', orderDate, rightColY);
  rightColY += 6;
  addDetail('Payment Mode:', order.paymentDetails?.mode?.name?.toUpperCase() || 'COD', rightColY);

  yPos = Math.max(yPos, rightColY) + 12; // Reduced space after info boxes

  // --- ITEMS TABLE ---
  const tableHeaders = ['PRODUCT', 'SKU', 'PRICE', 'QTY', 'TOTAL'];
  const tableColWidths = [usableWidth * 0.40, usableWidth * 0.15, usableWidth * 0.15, usableWidth * 0.10, usableWidth * 0.20];
  let currentX = pageMargin;
  const tableHeaderX = [];
  tableColWidths.forEach(w => {
    tableHeaderX.push(currentX);
    currentX += w;
  });

  // Table Header Background
  addRectangle(pageMargin, yPos, usableWidth, 10, themeColor);
  yPos += 7; // Position text inside the rectangle, adjusted for Courier

  tableHeaders.forEach((header, i) => {
    let align = 'left';
    if (['PRICE', 'QTY', 'TOTAL'].includes(header)) align = 'right';
    let xPos = tableHeaderX[i];
    // For Courier, alignment is critical. Adjust padding.
    if (align === 'right') xPos += tableColWidths[i] - (header === 'QTY' ? 1 : 2); // Fine-tune padding for right align
    else xPos += 2; 
    addText(header, xPos, yPos, { fontSize: 9, fontStyle: 'bold', color: whiteColor, align: align });
  });
  yPos += 8; // Space after header text

  order.items.forEach((item, index) => {
    if (yPos > 255) { // Check for page break (A4 height is approx 297, leave footer space)
      doc.addPage();
      doc.setFont('Courier'); // Re-apply font after new page
      yPos = pageMargin;
      addText("(Invoice Continued)", pageWidth / 2, yPos, { align: 'center', fontStyle: 'italic', fontSize: 8, color: greyColor });
      yPos += 12;
      // Redraw table header
      addRectangle(pageMargin, yPos, usableWidth, 10, themeColor);
      yPos += 7;
      tableHeaders.forEach((header, i) => {
        let align = 'left';
        if (['PRICE', 'QTY', 'TOTAL'].includes(header)) align = 'right';
        let xPos = tableHeaderX[i];
        if (align === 'right') xPos += tableColWidths[i] - (header === 'QTY' ? 1 : 2); else xPos += 2;
        addText(header, xPos, yPos, { fontSize: 9, fontStyle: 'bold', color: whiteColor, align: align });
      });
      yPos += 8;
    }

    const rowY = yPos;
    const baseRowHeight = 12; // Base height for Courier font
    let textY = rowY + 5; // Vertically center text in row

    if (index % 2 !== 0) { // Stripe odd rows
        addRectangle(pageMargin, rowY -1 , usableWidth, baseRowHeight -1 , rowStripeColor);
    }

    // Product Name
    const itemName = item.product?.specificCategoryVariant?.name || item.name || 'N/A';
    const productNameLines = doc.splitTextToSize(itemName, tableColWidths[0] - 4); // -4 for padding
    let currentLineY = textY;
    productNameLines.forEach(line => {
        addText(line, tableHeaderX[0] + 2, currentLineY, { fontSize: 9, maxWidth: tableColWidths[0] - 4 });
        currentLineY += 5; // Courier line height
    });
    let productTextHeight = (productNameLines.length * 5) + (productNameLines.length > 1 ? 2 : 0) ;

    // SKU
    addText(item.sku || 'N/A', tableHeaderX[1] + 2, textY, { fontSize: 9, maxWidth: tableColWidths[1] - 4 });
    
    // Price
    const price = `Rs. ${(item.priceAtPurchase || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    addText(price, tableHeaderX[2] + tableColWidths[2] - 2, textY, { fontSize: 9, align: 'right', maxWidth: tableColWidths[2] - 4 });
    
    // Quantity
    addText((item.quantity || '1').toString(), tableHeaderX[3] + tableColWidths[3] - 1, textY, { fontSize: 9, align: 'right', maxWidth: tableColWidths[3] - 2 });
    
    // Total
    const total = `Rs. ${((item.priceAtPurchase || 0) * (item.quantity || 1)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    addText(total, tableHeaderX[4] + tableColWidths[4] - 2, textY, { fontSize: 9, align: 'right', maxWidth: tableColWidths[4] - 4 });
    
    let dynamicRowHeight = Math.max(baseRowHeight, productTextHeight + 2);

    if (item.wrapFinish) {
      currentLineY = textY + productTextHeight - (productNameLines.length > 1 ? 0 : 5) + 3;
      if (productNameLines.length === 1) currentLineY = textY + 5;

      addText(`Finish: ${item.wrapFinish}`, tableHeaderX[0] + 4, currentLineY, { fontSize: 7, fontStyle: 'italic', color: greyColor });
      dynamicRowHeight = Math.max(dynamicRowHeight, (currentLineY - rowY) + 7);
    }
    
    yPos += dynamicRowHeight;
    addLine(pageMargin, yPos - 2, pageWidth - pageMargin, yPos - 2, lightGreyColor, 0.1); // Row separator
  });
  
  yPos += 8; // Space before summary

  // --- SUMMARY SECTION ---
  const summaryX = pageWidth / 2 + pageMargin / 2; 
  const summaryLabelX = summaryX + 5;
  const summaryValueX = pageWidth - pageMargin; 
  
  let summaryYPos = yPos;

  if (yPos > 240) { // Check for page break before summary
      doc.addPage();
      doc.setFont('Courier'); // Re-apply font
      yPos = pageMargin;
      summaryYPos = yPos;
  }

  const addSummaryLine = (label, value, options = {}) => {
    addText(label, summaryLabelX, summaryYPos, { fontSize: 10, ...options });
    addText(value, summaryValueX, summaryYPos, { fontSize: 10, align: 'right', ...options });
    summaryYPos += 7;
  };

  addSummaryLine('Items Total:', `Rs. ${itemsTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`);

  if (order.totalDiscount > 0) {
    addSummaryLine('Discount:', `- Rs. ${order.totalDiscount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`, { color: greyColor });
  }

  if (order.extraCharges && order.extraCharges.length > 0) {
    order.extraCharges.forEach(charge => {
      if (charge.chargesAmount && charge.chargesAmount > 0) {
        addSummaryLine(`${charge.chargesName || 'Extra Charge'}:`, `+ Rs. ${(charge.chargesAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`);
      }
    });
  }
  
  summaryYPos += 2; // Little extra space before total line
  addLine(summaryX, summaryYPos, pageWidth - pageMargin, summaryYPos, themeColor, 0.3);
  summaryYPos += 5;

  addRectangle(summaryX - 2, summaryYPos - 3, (pageWidth - pageMargin) - (summaryX - 2) , 10, [235, 235, 235]); // Light background for total
  addText('TOTAL AMOUNT:', summaryLabelX, summaryYPos + 1.5, { fontSize: 12, fontStyle: 'bold' }); // Adjusted y for better centering in rect
  addText(`Rs. ${order.totalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`, summaryValueX, summaryYPos + 1.5, { fontSize: 12, fontStyle: 'bold', align: 'right' });
  summaryYPos += 15;
  
  yPos = summaryYPos;

  // --- NOTES & FOOTER ---
  // Position notes closer to the bottom or after summary, ensuring space for footer
  const notesStartY = doc.internal.pageSize.getHeight() - 45; 
  yPos = Math.max(yPos, notesStartY); 
  if (yPos > notesStartY) yPos = notesStartY; // If summary pushes too far, cap yPos for notes

  addText('* GST is included in the product price.', pageMargin, yPos, { fontSize: 8, fontStyle: 'italic', color: greyColor });
  yPos += 8;
  addText('Thank you for shopping with us!', pageWidth / 2, yPos, { fontSize: 10, fontStyle: 'bold', align: 'center', color: themeColor }); // Slightly smaller
  
  // Footer Bar
  const footerHeight = 18; // Slightly smaller footer
  const footerY = doc.internal.pageSize.getHeight() - footerHeight;
  addRectangle(0, footerY, pageWidth, footerHeight, themeColor);
  addText('Maddy Custom | www.maddycustom.com', pageWidth / 2, footerY + 7, { align: 'center', color: whiteColor, fontSize: 8, fontStyle: 'bold' }); // Adjusted Y and font size
  addText('This is a computer-generated invoice and does not require a signature.', pageWidth / 2, footerY + 12, { align: 'center', fontSize: 6, color: lightGreyColor }); // Adjusted Y and font size
  
  doc.save(`${invoiceNumber}.pdf`);
};

// Keep the text generator function for fallback
export const generateInvoiceTxt = (order) => {
  // ... (original generateInvoiceTxt function remains unchanged)
  const orderDate = dayjs(order.createdAt).format('DD/MM/YYYY HH:mm:ss');
  const invoiceNumber = `INV_${order._id}`;
  const itemsTotal = order.items.reduce((acc, item) => acc + (item.priceAtPurchase * item.quantity), 0);
  const itemDetails = order.items.map(item => {
    return `
    Item: ${item.product?.specificCategoryVariant?.name || item.name || 'N/A'}
    SKU: ${item.sku || 'N/A'}
    Wrap Finish: ${item.wrapFinish || 'N/A'}
    Price: ₹${item.priceAtPurchase?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
    Quantity: ${item.quantity || '0'}
    Total: ₹${((item.priceAtPurchase || 0) * (item.quantity || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
    ------------------------------------------------`;
  }).join('\n');
  const extraChargesDetails = order.extraCharges && order.extraCharges.length > 0 
    ? order.extraCharges.map(charge => 
      `${charge.chargesName || 'Extra Charge'}: ₹${charge.chargesAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}`
    ).join('\n')
    : 'No extra charges';
  const invoiceText = `
==========================================================
              MADDY CUSTOM INVOICE
==========================================================

INVOICE DETAILS:
------------------
Invoice Number: ${invoiceNumber}
Order ID: ${order._id}
Date: ${orderDate}
Payment Mode: ${order.paymentDetails?.mode?.name?.toUpperCase() || 'COD'}

CUSTOMER DETAILS:
------------------
Name: ${order.address?.receiverName || 'N/A'}
Phone: ${order.address?.receiverPhoneNumber || 'N/A'}
Address: ${order.address?.addressLine1 || 'N/A'}${order.address?.addressLine2 ? `, ${order.address.addressLine2}` : ''}
City: ${order.address?.city || 'N/A'}, ${order.address?.state || 'N/A'}, ${order.address?.pincode || 'N/A'}

ITEMS:
------------------${itemDetails}

SUMMARY:
------------------
Items Total: ₹${itemsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
Discount: -₹${order.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

EXTRA CHARGES:
------------------
${extraChargesDetails}

==========================================================
TOTAL AMOUNT: ₹${order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
==========================================================

* Tax is included in the product price
* This is a computer-generated invoice and does not require a signature.
* Thank you for shopping with us!

COMPANY DETAILS:
------------------
Maddy Custom
Address: Your Address Line, City, State, Pincode 
GSTIN: GSTIN123456789
Phone: +91 1234567890
`;
  const blob = new Blob([invoiceText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoiceNumber}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};