import { Transaction, TransactionType } from '../types';

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function stableId(signature: string): string {
  let hash = 2166136261;
  for (let i = 0; i < signature.length; i++) {
    hash ^= signature.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `archive_${(hash >>> 0).toString(36)}`;
}

function normalizeTransaction(value: unknown, index: number, occurrence: number): Transaction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Transaction ${index + 1} is not an object.`);
  const row = value as Record<string, unknown>;
  const type = row.type;
  const date = row.date;
  const amount = typeof row.amount === 'number' ? row.amount : Number(row.amount);
  if ((type !== 'Expense' && type !== 'Income') || !isDate(date) || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Transaction ${index + 1} must have Expense/Income type, a YYYY-MM-DD date, and a positive amount.`);
  }
  const description = typeof row.description === 'string' ? row.description.trim() : '';
  const category = typeof row.category === 'string' && row.category.trim() ? row.category.trim() : 'Other';
  const paymentMode = typeof row.paymentMode === 'string' && row.paymentMode.trim() ? row.paymentMode.trim() : 'Other';
  const signature = [date, type, amount, description.toLowerCase(), paymentMode.toLowerCase(), category.toLowerCase()].join('|');
  return {
    id: typeof row.id === 'string' && row.id.trim() ? row.id : `${stableId(signature)}_${occurrence}`,
    type: type as TransactionType,
    category,
    description,
    amount,
    paymentMode,
    date,
    ...(typeof row.timestamp === 'string' ? { timestamp: row.timestamp } : {}),
    ...(typeof row.remarks === 'string' ? { remarks: row.remarks } : {}),
    ...(typeof row.recurringId === 'string' ? { recurringId: row.recurringId } : {}),
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (quoted) throw new Error('CSV file contains an unfinished quoted field.');
  return rows;
}

function parseCsvTransactions(text: string): Transaction[] {
  const rows = parseCsv(text);
  const headers = rows.shift();
  if (!headers) throw new Error('CSV file is empty.');
  const normalized = headers.map((header) => header.trim().toLowerCase().replace(/[^a-z]/g, ''));
  const column = (...aliases: string[]) => normalized.findIndex((header) => aliases.includes(header));
  const typeCol = column('expenseincome', 'type', 'transactiontype');
  const amountCol = column('amount');
  const dateCol = column('date', 'transactiondate');
  if (typeCol < 0 || amountCol < 0 || dateCol < 0) {
    throw new Error('CSV needs Expense / Income, Amount, and Date columns.');
  }
  const descriptionCol = column('description', 'title', 'narration', 'merchant');
  const categoryCol = column('category', 'expensecategory', 'incomecategory');
  const expenseCategoryCol = column('expensecategory');
  const incomeCategoryCol = column('incomecategory');
  const paymentCol = column('paymentmode', 'mode', 'method');
  const timestampCol = column('timestamp');
  const remarksCol = column('remarks', 'notes');
  const occurrenceCounts = new Map<string, number>();

  return rows.map((cells, index) => {
    const type = (cells[typeCol] || '').trim().toLowerCase() === 'income' ? 'Income' :
      (cells[typeCol] || '').trim().toLowerCase() === 'expense' ? 'Expense' : undefined;
    const amount = Number((cells[amountCol] || '').replace(/[₹,\s]/g, ''));
    const date = (cells[dateCol] || '').trim();
    const category = (type === 'Income' && incomeCategoryCol >= 0 ? cells[incomeCategoryCol] :
      type === 'Expense' && expenseCategoryCol >= 0 ? cells[expenseCategoryCol] :
      categoryCol >= 0 ? cells[categoryCol] : '') || 'Other';
    const row: Record<string, unknown> = {
      type,
      amount,
      date,
      description: descriptionCol >= 0 ? cells[descriptionCol] : '',
      category,
      paymentMode: paymentCol >= 0 ? cells[paymentCol] : 'Other',
      timestamp: timestampCol >= 0 ? cells[timestampCol] : undefined,
      remarks: remarksCol >= 0 ? cells[remarksCol] : undefined,
    };
    const signature = [date, type, amount, row.description, row.paymentMode, category].join('|').toLowerCase();
    const occurrence = occurrenceCounts.get(signature) || 0;
    occurrenceCounts.set(signature, occurrence + 1);
    return normalizeTransaction(row, index, occurrence);
  });
}

export async function parseHistoricalDataFile(file: File): Promise<Transaction[]> {
  const text = await file.text();
  const isCsv = file.name.toLowerCase().endsWith('.csv') || text.trimStart().startsWith('Timestamp,');
  if (isCsv) return parseCsvTransactions(text);

  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Choose a BruFin archive JSON, backup JSON, or CSV export.'); }
  const records = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).transactions)
      ? (parsed as { transactions: unknown[] }).transactions
      : null;
  if (!records) throw new Error('JSON must contain a transactions array or be a transaction array itself.');
  const occurrenceCounts = new Map<string, number>();
  return records.map((record, index) => {
    const item = record && typeof record === 'object' ? record as Record<string, unknown> : {};
    const signature = [item.date, item.type, item.amount, item.description, item.paymentMode, item.category].join('|').toLowerCase();
    const occurrence = occurrenceCounts.get(signature) || 0;
    occurrenceCounts.set(signature, occurrence + 1);
    return normalizeTransaction(record, index, occurrence);
  });
}
