/**
 * Arthivex RFC 4180 Compliant CSV Export Utility
 * Safely generates and downloads CSV spreadsheets for transactions, accounts, and audit logs.
 * Includes CSV formula injection sanitization and UTF-8 Byte Order Mark (BOM) for Excel compatibility.
 */

/**
 * Escapes a cell according to RFC 4180 rules and mitigates CSV Formula Injection (DDE).
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Formula injection mitigation: prepend single quote if cell starts with dangerous prefix characters
  if (/^[=+@-]$/.test(str.charAt(0)) || /^[-+=@\t\r]/.test(str)) {
    // If it looks like a number (e.g. -1500.50), leave it as numeric unless it has an equals formula
    if (str.startsWith('=') || str.startsWith('@')) {
      str = "'" + str;
    }
  }

  // If the cell contains quotes, commas, or line breaks, enclose in quotes and escape existing quotes
  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates an RFC 4180 CSV string from a 2D array of headers and rows.
 */
export function buildCsvString(headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a client-side file download with UTF-8 BOM for Microsoft Excel / Numbers compatibility.
 */
export function downloadCsvFile(csvContent, filename) {
  // UTF-8 BOM (\uFEFF) ensures Excel opens special characters (like ₹, UTF-8 hashes) without corruption
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports an array of transaction objects into an official Arthivex CSV statement.
 */
export function exportTransactionsCsv(transactions = [], options = {}) {
  const {
    filename = `arthivex_transactions_${new Date().toISOString().slice(0, 10)}.csv`,
    accountName = 'All Accounts',
    currency = 'INR'
  } = options;

  const headers = [
    'Transaction ID',
    'Timestamp (UTC)',
    'Type',
    'Flow',
    'Amount',
    'Currency',
    'Status',
    'Source Account',
    'Destination Account',
    'Counterparty',
    'Reference / Description',
    'Ledger Hash'
  ];

  const rows = transactions.map((tx) => {
    const rawType = (tx.rawType || tx.type || 'TRANSFER').toUpperCase();
    const flow = rawType === 'DEPOSIT' ? 'INFLOW' : rawType === 'WITHDRAWAL' ? 'OUTFLOW' : 'TRANSFER';
    const amountVal = tx.rawAmount !== undefined ? tx.rawAmount : tx.amount;
    const numAmount = typeof amountVal === 'number' ? amountVal : parseFloat(String(amountVal).replace(/[^0-9.-]/g, '')) || 0;

    return [
      tx.id || tx.transactionId || 'N/A',
      tx.rawTimestamp || tx.timestamp || new Date().toISOString(),
      rawType,
      flow,
      numAmount.toFixed(2),
      tx.currency || currency,
      (tx.status || 'SETTLED').toUpperCase(),
      tx.sourceAccount || tx.account || accountName || 'Primary Account',
      tx.destinationAccount || 'Internal Ledger',
      tx.counterparty || 'Arthivex Custody',
      tx.description || tx.reference || 'Institutional Settlement',
      tx.hash || tx.signature || 'SHA256:VERIFIED'
    ];
  });

  const csvString = buildCsvString(headers, rows);
  downloadCsvFile(csvString, filename);
  return { success: true, count: rows.length };
}

/**
 * Exports an array of account objects into a CSV portfolio summary.
 */
export function exportAccountsCsv(accounts = [], options = {}) {
  const {
    filename = `arthivex_accounts_${new Date().toISOString().slice(0, 10)}.csv`
  } = options;

  const headers = [
    'Account ID',
    'Account Number',
    'Account Name',
    'Account Type',
    'Currency',
    'Current Balance',
    'Status',
    'Created At'
  ];

  const rows = accounts.map((acc) => [
    acc.id || 'N/A',
    acc.accountNumber || 'N/A',
    acc.name || acc.accountName || 'Financial Account',
    (acc.type || acc.accountType || 'SAVINGS').toUpperCase(),
    acc.currency || 'INR',
    (parseFloat(acc.balance) || 0).toFixed(2),
    (acc.status || 'ACTIVE').toUpperCase(),
    acc.createdAt || 'N/A'
  ]);

  const csvString = buildCsvString(headers, rows);
  downloadCsvFile(csvString, filename);
  return { success: true, count: rows.length };
}

