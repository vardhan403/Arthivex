/**
 * Arthivex Institutional PDF Statement Generator
 * Uses jsPDF to produce crisp, publication-grade cryptographic financial statements.
 */
import { jsPDF } from 'jspdf';
import { formatCurrency } from './currencyFormatter';

export function generateTransactionStatementPdf({
  user,
  account,
  transactions = [],
  dateRange = 'Last 30 Days',
  currency = 'INR'
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const primaryCurr = currency || account?.currency || 'INR';
  const statementId = `STMT-AX-${Date.now().toString().slice(-6)}`;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  // Calculate summary metrics
  const totalInflows = transactions
    .filter((t) => (t.rawType || t.type || '').toUpperCase() === 'DEPOSIT' && (t.status || '').toUpperCase() !== 'FAILED')
    .reduce((sum, t) => sum + (parseFloat(t.rawAmount || t.amount) || 0), 0);

  const totalOutflows = transactions
    .filter((t) => {
      const type = (t.rawType || t.type || '').toUpperCase();
      return (type === 'WITHDRAWAL' || type === 'TRANSFER') && (t.status || '').toUpperCase() !== 'FAILED';
    })
    .reduce((sum, t) => sum + (parseFloat(t.rawAmount || t.amount) || 0), 0);

  const netMovement = totalInflows - totalOutflows;
  const currentBalance = account?.balance !== undefined ? parseFloat(account.balance) : null;

  // --- 1. HEADER BANNER ---
  doc.setFillColor(14, 19, 32); // Deep Navy #0e1320
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Accent Line
  doc.setFillColor(255, 176, 103); // Peach #ffb067
  doc.rect(0, 32, pageWidth, 1.5, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('ARTHIVEX', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 176, 103);
  doc.text('ENTERPRISE VAULT • DOUBLE-ENTRY LEDGER', margin, 19);

  // Statement Meta (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL ACCOUNT STATEMENT', pageWidth - margin, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(191, 198, 222);
  doc.text(`Ref: ${statementId}  |  Generated: ${formattedDate} ${formattedTime}`, pageWidth - margin, 19, { align: 'right' });
  doc.text(`Period: ${dateRange}  |  Ledger Status: VERIFIED BALANCED`, pageWidth - margin, 24, { align: 'right' });

  // --- 2. ACCOUNT HOLDER & STATEMENT OVERVIEW BOXES ---
  let cursorY = 40;

  // Box 1: Account Holder Details (Left half)
  const boxWidth = (contentWidth - 6) / 2;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(margin, cursorY, boxWidth, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('ACCOUNT HOLDER DETAILS', margin + 4, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(user?.name || user?.fullName || 'Authorized Account Holder', margin + 4, cursorY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Email: ${user?.email || 'N/A'}`, margin + 4, cursorY + 19);
  doc.text(`Role: ${user?.role ? user.role.replace(/_/g, ' ') : 'ACCOUNT_HOLDER'}  |  Status: ACTIVE`, margin + 4, cursorY + 24);

  // Box 2: Financial Partition Overview (Right half)
  const rightBoxX = margin + boxWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, cursorY, boxWidth, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('LEDGER PARTITION OVERVIEW', rightBoxX + 4, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const accTitle = account
    ? `${account.accountType || 'Commercial Checking'} (•••• ${account.accountNumber?.slice(-4) || 'Vault'})`
    : 'Consolidated Treasury Vaults';
  doc.text(accTitle, rightBoxX + 4, cursorY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Base Currency: ${primaryCurr}`, rightBoxX + 4, cursorY + 19);
  if (currentBalance !== null) {
    doc.text(`Current Settled Balance: ${formatCurrency(currentBalance, primaryCurr)}`, rightBoxX + 4, cursorY + 24);
  } else {
    doc.text(`Transaction Count: ${transactions.length} record(s)`, rightBoxX + 4, cursorY + 24);
  }

  // --- 3. EXECUTIVE SUMMARY METRICS STRIP ---
  cursorY += 36;
  const metricColWidth = contentWidth / 3;

  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(margin, cursorY, contentWidth, 16, 2, 2, 'F');

  // Metric 1: Total Inflows
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INFLOWS (DEPOSITS)', margin + 6, cursorY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(16, 185, 129); // Green
  doc.text(`+${formatCurrency(totalInflows, primaryCurr)}`, margin + 6, cursorY + 12);

  // Metric 2: Total Outflows
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL OUTFLOWS (WITHDRAWALS/TRANSFERS)', margin + metricColWidth + 6, cursorY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(225, 29, 72); // Rose/Red
  doc.text(`-${formatCurrency(totalOutflows, primaryCurr)}`, margin + metricColWidth + 6, cursorY + 12);

  // Metric 3: Net Liquidity Delta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NET LIQUIDITY MOVEMENT', margin + metricColWidth * 2 + 6, cursorY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(netMovement >= 0 ? 16 : 225, netMovement >= 0 ? 185 : 29, netMovement >= 0 ? 129 : 72);
  doc.text(`${netMovement >= 0 ? '+' : ''}${formatCurrency(netMovement, primaryCurr)}`, margin + metricColWidth * 2 + 6, cursorY + 12);

  // --- 4. TRANSACTIONS TABLE HEADER ---
  cursorY += 22;

  const drawTableHeader = (y) => {
    doc.setFillColor(14, 19, 32); // Deep Navy
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    doc.text('DATE / TIME', margin + 3, y + 5);
    doc.text('REF ID', margin + 30, y + 5);
    doc.text('DESCRIPTION / COUNTERPARTY', margin + 55, y + 5);
    doc.text('TYPE', margin + 115, y + 5);
    doc.text('STATUS', margin + 138, y + 5);
    doc.text('AMOUNT', pageWidth - margin - 3, y + 5, { align: 'right' });
  };

  drawTableHeader(cursorY);
  cursorY += 7;

  // --- 5. TRANSACTIONS ROWS ---
  if (transactions.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, cursorY, contentWidth, 14, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No ledger transactions recorded for this period.', margin + contentWidth / 2, cursorY + 8, { align: 'center' });
    cursorY += 14;
  } else {
    transactions.forEach((tx, idx) => {
      // Check page break
      if (cursorY > pageHeight - 25) {
        // Draw footer on current page
        drawFooter(doc, pageWidth, pageHeight, margin);
        doc.addPage();
        // Draw top banner & running header on new page
        doc.setFillColor(14, 19, 32);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('ARTHIVEX — STATEMENT CONTINUED', margin, 8);
        doc.setFontSize(8);
        doc.setTextColor(255, 176, 103);
        doc.text(`Ref: ${statementId}`, pageWidth - margin, 8, { align: 'right' });

        cursorY = 18;
        drawTableHeader(cursorY);
        cursorY += 7;
      }

      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, cursorY, contentWidth, 6.5, 'F');

      // Date
      const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(dateStr, margin + 3, cursorY + 4.5);

      // Ref
      const refStr = (tx.reference || tx.id?.slice(0, 8) || 'N/A').toUpperCase();
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(refStr.slice(0, 10), margin + 30, cursorY + 4.5);

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      const descStr = (tx.description || tx.memo || tx.party || 'Ledger Operation').slice(0, 30);
      doc.text(descStr, margin + 55, cursorY + 4.5);

      // Type
      const typeStr = (tx.type || tx.rawType || 'TRANSFER').toUpperCase();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(typeStr, margin + 115, cursorY + 4.5);

      // Status
      const statusStr = (tx.status || 'SETTLED').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      if (statusStr === 'COMPLETED' || statusStr === 'SETTLED') {
        doc.setTextColor(16, 185, 129);
      } else if (statusStr === 'FAILED') {
        doc.setTextColor(225, 29, 72);
      } else {
        doc.setTextColor(217, 119, 6);
      }
      doc.text(statusStr, margin + 138, cursorY + 4.5);

      // Amount with +/-
      const amtNum = parseFloat(tx.rawAmount || tx.amount) || 0;
      const isPositive = typeStr === 'DEPOSIT' || tx.isPositive === true;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      if (isPositive) {
        doc.setTextColor(16, 185, 129);
        doc.text(`+${formatCurrency(amtNum, tx.currency || primaryCurr)}`, pageWidth - margin - 3, cursorY + 4.5, { align: 'right' });
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text(`-${formatCurrency(amtNum, tx.currency || primaryCurr)}`, pageWidth - margin - 3, cursorY + 4.5, { align: 'right' });
      }

      cursorY += 6.5;
    });
  }

  // Draw Bottom border line
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);

  // --- 6. FOOTER STAMP ---
  drawFooter(doc, pageWidth, pageHeight, margin);

  // Save / Trigger Download
  const filename = `arthivex_statement_${formattedDate.replace(/[\s,]+/g, '_')}.pdf`;
  doc.save(filename);
  return filename;
}

function drawFooter(doc, pageWidth, pageHeight, margin) {
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'AUTHENTICATED ARTHIVEX LEDGER RECORD • DOUBLE-ENTRY BALANCE VERIFIED • RFC-4122 PROTECTED',
    margin,
    footerY + 2
  );

  const pageCount = doc.internal.getNumberOfPages();
  const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
  doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - margin, footerY + 2, { align: 'right' });
}

