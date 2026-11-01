import {
  Transaction,
  CreditCard,
  RecurringPayment,
  InvestmentItem,
  LoanItem,
  BankAccount,
  MonthlyAccountBalance,
  PaymentMethodItem,
} from '../types';
import { generateSampleData, DEFAULT_MONTHLY_TARGET } from '../data/dummyData';
import { DEFAULT_BASE_PAYMENT_MODES } from './categories';
import { getTodayDateString, getCurrentTimestampString } from './dateUtils';

const STORAGE_KEYS = {
  TRANSACTIONS: 'brufin_transactions_v2',
  CARDS: 'brufin_cards_v2',
  RECURRING: 'brufin_recurring_v2',
  TARGET: 'brufin_target_v2',
  INVESTMENTS: 'brufin_investments_v2',
  LOANS: 'brufin_loans_v2',
  ACCOUNTS: 'brufin_accounts_v2',
  BALANCES: 'brufin_balances_v2',
  PAYMENT_METHODS: 'brufin_payment_methods_v2',
  IS_DEMO_MODE: 'brufin_is_demo_mode_v2',
  HAS_ONBOARDED: 'brufin_has_onboarded_v2',
  BALANCE_PROMPTS_ENABLED: 'brufin_balance_prompts_enabled_v2',
  DISMISSED_PROMPTS: 'brufin_dismissed_balance_prompts_v2',
  SHOW_DIAGNOSTICS: 'brufin_show_diagnostics_v2',
  AUTO_ARCHIVE_ENABLED: 'brufin_auto_archive_enabled_v2',
  ARCHIVE_HISTORY: 'brufin_archive_history_v2',
  APP_SCALE: 'brufin_app_scale_v2',
};

export const APP_SCALE_PRESETS = [
  { value: 0.9, label: '90%', name: 'Compact' },
  { value: 1.0, label: '100%', name: 'Default' },
  { value: 1.1, label: '110%', name: 'Comfort' },
  { value: 1.2, label: '120%', name: 'Large' },
  { value: 1.3, label: '130%', name: 'Extra Large' },
];

export function loadAppScale(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.APP_SCALE);
    if (val) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0.8 && parsed <= 1.5) {
        return Math.round(parsed * 100) / 100;
      }
    }
  } catch {
    // fallback
  }
  return 1.0;
}

export function saveAppScale(scale: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_SCALE, scale.toString());
  } catch (e) {
    console.error('Error saving app scale', e);
  }
}

export function isDiagnosticsEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.SHOW_DIAGNOSTICS);
    return val === 'true'; // Off by default, toggled via Coffee logo
  } catch {
    return false;
  }
}

export function setDiagnosticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SHOW_DIAGNOSTICS, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Error saving diagnostics preference', e);
  }
}

export function isAutoArchiveEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_ARCHIVE_ENABLED);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setAutoArchiveEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTO_ARCHIVE_ENABLED, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Error saving auto archive preference', e);
  }
}

export interface ArchiveRecord {
  id: string;
  archivedAt: string;
  count: number;
  dateRange: string;
  fileName: string;
  format: 'json' | 'csv';
  totalExpense: number;
  totalIncome: number;
}

export function getArchiveHistory(): ArchiveRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARCHIVE_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveArchiveRecord(record: ArchiveRecord): void {
  try {
    const current = getArchiveHistory();
    localStorage.setItem(STORAGE_KEYS.ARCHIVE_HISTORY, JSON.stringify([record, ...current]));
  } catch (e) {
    console.error('Error saving archive record', e);
  }
}

export function isBalancePromptsEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.BALANCE_PROMPTS_ENABLED);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setBalancePromptsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BALANCE_PROMPTS_ENABLED, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Error saving balance prompt preference', e);
  }
}

export function getDismissedBalancePrompts(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISMISSED_PROMPTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setDismissedBalancePrompt(promptId: string): void {
  try {
    const current = getDismissedBalancePrompts();
    if (!current.includes(promptId)) {
      localStorage.setItem(STORAGE_KEYS.DISMISSED_PROMPTS, JSON.stringify([...current, promptId]));
    }
  } catch (e) {
    console.error('Error saving dismissed prompt', e);
  }
}

// Check if user has answered the initial onboarding choice
export function hasUserOnboarded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED) === 'true';
  } catch {
    return false;
  }
}

export function setUserOnboarded(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, value ? 'true' : 'false');
  } catch (e) {
    console.error('Error saving onboarded status', e);
  }
}

// Check if current dataset is demo data
export function isDemoModeActive(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.IS_DEMO_MODE) === 'true';
  } catch {
    return false;
  }
}

export function setDemoModeActive(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.IS_DEMO_MODE, value ? 'true' : 'false');
  } catch (e) {
    console.error('Error setting demo mode', e);
  }
}

// Data loaders - strictly defaulting to empty arrays for clean, private defaults
export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading transactions', e);
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions || []));
  } catch (e) {
    console.error('Error saving transactions', e);
  }
}

export function loadCreditCards(): CreditCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveCreditCards(cards: CreditCard[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards || []));
  } catch (e) {
    console.error('Error saving credit cards', e);
  }
}

export function loadRecurringPayments(): RecurringPayment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECURRING);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveRecurringPayments(recurring: RecurringPayment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(recurring || []));
  } catch (e) {
    console.error('Error saving recurring payments', e);
  }
}

export function loadMonthlyTarget(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TARGET);
    if (!raw) return DEFAULT_MONTHLY_TARGET;
    const num = parseFloat(raw);
    return isNaN(num) || num <= 0 ? DEFAULT_MONTHLY_TARGET : num;
  } catch (e) {
    return DEFAULT_MONTHLY_TARGET;
  }
}

export function saveMonthlyTarget(target: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TARGET, (target || DEFAULT_MONTHLY_TARGET).toString());
  } catch (e) {
    console.error('Error saving monthly target', e);
  }
}

export function loadInvestments(): InvestmentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVESTMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveInvestments(investments: InvestmentItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(investments || []));
  } catch (e) {
    console.error('Error saving investments', e);
  }
}

export function loadLoans(): LoanItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOANS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveLoans(loans: LoanItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans || []));
  } catch (e) {
    console.error('Error saving loans', e);
  }
}

export function loadPaymentMethods(): PaymentMethodItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS);
    if (!raw) {
      savePaymentMethods(DEFAULT_BASE_PAYMENT_MODES);
      return DEFAULT_BASE_PAYMENT_MODES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BASE_PAYMENT_MODES;
  } catch (e) {
    return DEFAULT_BASE_PAYMENT_MODES;
  }
}

export function savePaymentMethods(methods: PaymentMethodItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(methods || DEFAULT_BASE_PAYMENT_MODES));
  } catch (e) {
    console.error('Error saving payment methods', e);
  }
}

export function loadBankAccounts(): BankAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveBankAccounts(accounts: BankAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts || []));
  } catch (e) {
    console.error('Error saving bank accounts', e);
  }
}

export function loadMonthlyBalances(): MonthlyAccountBalance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BALANCES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveMonthlyBalances(balances: MonthlyAccountBalance[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(balances));
  } catch (e) {
    console.error('Error saving monthly balances', e);
  }
}

/**
 * Retrieves the total liquid balance for a given monthKey (YYYY-MM).
 * Aggregates any legacy multi-account entries if present.
 */
export function getUnifiedMonthlyBalance(
  monthlyBalances: MonthlyAccountBalance[],
  monthKey: string
): { startBalance: number; endBalance: number; notes: string; exists: boolean } {
  const matches = monthlyBalances.filter((b) => b.month === monthKey);
  if (matches.length === 0) {
    return { startBalance: 0, endBalance: 0, notes: '', exists: false };
  }
  const start = matches.reduce((sum, b) => sum + (b.startBalance || 0), 0);
  const end = matches.reduce((sum, b) => sum + (b.endBalance || 0), 0);
  const notes = matches.map((b) => b.notes).filter(Boolean).join(', ');
  return { startBalance: start, endBalance: end, notes, exists: true };
}

/**
 * Saves or updates the single unified total balance for a given monthKey
 */
export function updateUnifiedMonthlyBalance(
  existingBalances: MonthlyAccountBalance[],
  monthKey: string,
  startBalance: number,
  endBalance: number,
  notes?: string
): MonthlyAccountBalance[] {
  const filtered = existingBalances.filter((b) => b.month !== monthKey);
  const updatedEntry: MonthlyAccountBalance = {
    id: `bal_${monthKey}`,
    month: monthKey,
    startBalance,
    endBalance,
    notes: notes || '',
  };
  const updatedList = [updatedEntry, ...filtered];
  saveMonthlyBalances(updatedList);
  return updatedList;
}

/**
 * Loads the complete sample dataset into localStorage and activates demo mode
 */
export function loadDemoDataset() {
  const sample = generateSampleData();
  saveTransactions(sample.transactions);
  saveCreditCards(sample.creditCards);
  saveRecurringPayments(sample.recurringPayments);
  saveMonthlyTarget(sample.monthlyTarget);
  saveInvestments(sample.investments);
  saveLoans(sample.loans);
  saveBankAccounts(sample.bankAccounts);
  saveMonthlyBalances(sample.monthlyBalances);
  setDemoModeActive(true);
  setUserOnboarded(true);
  return sample;
}

/**
 * Permanently wipes all personal/sample data and starts with a pristine database
 */
export function clearAllData(): void {
  saveTransactions([]);
  saveCreditCards([]);
  saveRecurringPayments([]);
  saveInvestments([]);
  saveLoans([]);
  saveBankAccounts([]);
  saveMonthlyBalances([]);
  savePaymentMethods(DEFAULT_BASE_PAYMENT_MODES);
  saveMonthlyTarget(DEFAULT_MONTHLY_TARGET);
  setDemoModeActive(false);
  setUserOnboarded(true);
}

// Deprecated alias for backwards-compatibility
export const clearAllPersonalData = clearAllData;
export const resetToDefaults = clearAllData;

/**
 * Checks which recurring payments have already been posted for the given monthKey (YYYY-MM).
 */
export function getRecurringPaymentStatuses(
  recurring: RecurringPayment[] = [],
  transactions: Transaction[] = [],
  monthKey: string = ''
) {
  const recList = Array.isArray(recurring) ? recurring : [];
  const txList = Array.isArray(transactions) ? transactions : [];

  return recList.map((rec) => {
    if (!rec) return { recurring: rec, isPaid: false };
    const recNameLower = (rec.name || '').toLowerCase().trim();

    const found = txList.find((t) => {
      if (!t || t.type !== 'Expense') return false;
      const matchMonth = t.date && t.date.startsWith(monthKey);
      const matchRec =
        (t.recurringId && t.recurringId === rec.id) ||
        (recNameLower && (t.description || '').toLowerCase().trim() === recNameLower);
      return matchMonth && matchRec;
    });

    return {
      recurring: rec,
      isPaid: !!found,
      transaction: found,
    };
  });
}

/**
 * Posts an individual recurring payment to expenses for the specified month
 */
export function postRecurringPaymentToExpenses(
  rec: RecurringPayment,
  monthKey: string,
  existingTransactions: Transaction[]
): Transaction[] {
  const today = getTodayDateString();
  const txDate = today.startsWith(monthKey) ? today : `${monthKey}-01`;

  const newTx: Transaction = {
    id: `tx_rec_${rec.id}_${monthKey}_${Date.now()}`,
    type: 'Expense',
    category: rec.category || 'Subscriptions',
    description: rec.name,
    amount: rec.amount,
    paymentMode: rec.paymentMode || 'UPI',
    date: txDate,
    timestamp: getCurrentTimestampString(),
    remarks: `Auto-posted monthly bill (${rec.validTill || 'Recurring'})`,
    recurringId: rec.id,
  };

  const updated = [newTx, ...existingTransactions];
  saveTransactions(updated);
  return updated;
}

export function exportDatabaseJSON(): void {
  const data = {
    appName: 'Bru Fin',
    version: 2,
    exportedAt: new Date().toISOString(),
    transactions: loadTransactions(),
    creditCards: loadCreditCards(),
    recurringPayments: loadRecurringPayments(),
    monthlyTarget: loadMonthlyTarget(),
    investments: loadInvestments(),
    loans: loadLoans(),
    bankAccounts: loadBankAccounts(),
    monthlyBalances: loadMonthlyBalances(),
    paymentMethods: loadPaymentMethods(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brufin_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsCSV(): void {
  const transactions = loadTransactions();
  const headers = [
    'Timestamp',
    'Expense / Income',
    'Expense Category',
    'Income Category',
    'Description',
    'Amount',
    'Payment mode',
    'Date',
    'Remarks',
  ];

  const rows = transactions.map((t) => {
    const expCat = t.type === 'Expense' ? t.category : '';
    const incCat = t.type === 'Income' ? t.category : '';
    const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    return [
      escape(t.timestamp || t.date),
      escape(t.type),
      escape(expCat),
      escape(incCat),
      escape(t.description),
      t.amount,
      escape(t.paymentMode),
      escape(t.date),
      escape(t.remarks || ''),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brufin_transactions_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// REAL-TIME STORAGE & RAM DIAGNOSTICS
// -------------------------------------------------------------

export interface StorageDiagnostics {
  totalBytes: number;
  totalFormatted: string;
  quotaBytes: number;
  percentOfQuota: number;
  keysCount: number;
  breakdown: {
    name: string;
    key: string;
    bytes: number;
    formatted: string;
    count: number;
  }[];
}

export interface MemoryDiagnostics {
  usedBytes: number;
  usedMB: string;
  totalMB: string;
  limitMB: string;
  percent: number;
  status: 'healthy' | 'moderate' | 'high';
  isSupported: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function getStorageDiagnostics(): StorageDiagnostics {
  let totalBytes = 0;
  const breakdown: StorageDiagnostics['breakdown'] = [];

  const keyMeta = [
    { name: 'Transactions', key: STORAGE_KEYS.TRANSACTIONS, loader: loadTransactions },
    { name: 'Cards', key: STORAGE_KEYS.CARDS, loader: loadCreditCards },
    { name: 'Balances', key: STORAGE_KEYS.BALANCES, loader: loadMonthlyBalances },
    { name: 'Recurring Rules', key: STORAGE_KEYS.RECURRING, loader: loadRecurringPayments },
    { name: 'Investments', key: STORAGE_KEYS.INVESTMENTS, loader: loadInvestments },
    { name: 'Loans & Liabilities', key: STORAGE_KEYS.LOANS, loader: loadLoans },
    { name: 'Payment Methods', key: STORAGE_KEYS.PAYMENT_METHODS, loader: loadPaymentMethods },
  ];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        const val = localStorage.getItem(k) || '';
        // UTF-16 string size in memory: 2 bytes per char
        totalBytes += (k.length + val.length) * 2;
      }
    }

    keyMeta.forEach((meta) => {
      const raw = localStorage.getItem(meta.key) || '';
      const sizeBytes = (meta.key.length + raw.length) * 2;
      let count = 0;
      try {
        const loaded = meta.loader();
        if (Array.isArray(loaded)) count = loaded.length;
        else if (loaded && typeof loaded === 'object') count = Object.keys(loaded).length;
      } catch {
        count = 0;
      }

      breakdown.push({
        name: meta.name,
        key: meta.key,
        bytes: sizeBytes,
        formatted: formatBytes(sizeBytes),
        count,
      });
    });
  } catch (e) {
    console.error('Error computing storage diagnostics', e);
  }

  const quotaBytes = 5 * 1024 * 1024; // Standard 5MB WebView quota
  const percentOfQuota = Math.min(100, (totalBytes / quotaBytes) * 100);

  return {
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    quotaBytes,
    percentOfQuota,
    keysCount: localStorage.length,
    breakdown,
  };
}

export function getMemoryDiagnostics(): MemoryDiagnostics {
  try {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } })?.memory;
    if (mem && mem.usedJSHeapSize) {
      const usedBytes = mem.usedJSHeapSize;
      const totalBytes = mem.totalJSHeapSize || usedBytes;
      const limitBytes = mem.jsHeapSizeLimit || totalBytes * 2;

      const usedMB = (usedBytes / (1024 * 1024)).toFixed(1) + ' MB';
      const totalMB = (totalBytes / (1024 * 1024)).toFixed(1) + ' MB';
      const limitMB = (limitBytes / (1024 * 1024)).toFixed(0) + ' MB';
      const percent = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

      let status: 'healthy' | 'moderate' | 'high' = 'healthy';
      const usedNum = usedBytes / (1024 * 1024);
      if (usedNum > 120) status = 'high';
      else if (usedNum > 60) status = 'moderate';

      return {
        usedBytes,
        usedMB,
        totalMB,
        limitMB,
        percent,
        status,
        isSupported: true,
      };
    }
  } catch {
    // Unsupported browser/engine
  }

  return {
    usedBytes: 0,
    usedMB: '18.4 MB',
    totalMB: '24.0 MB',
    limitMB: '2048 MB',
    percent: 1,
    status: 'healthy',
    isSupported: false,
  };
}

// -------------------------------------------------------------
// 1-YEAR DATA RETENTION & ARCHIVE SYSTEM
// -------------------------------------------------------------

export interface ArchivableInfo {
  count: number;
  transactions: Transaction[];
  cutoffDate: string;
  startDate: string;
  endDate: string;
  totalExpense: number;
  totalIncome: number;
}

/**
 * Returns transactions older than cutoffMonths (default 12 months = 1 year).
 */
export function getArchivableData(cutoffMonths = 12): ArchivableInfo {
  const allTx = loadTransactions();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - cutoffMonths);
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  const older = allTx.filter((t) => t.date && t.date < cutoffStr);

  if (older.length === 0) {
    return {
      count: 0,
      transactions: [],
      cutoffDate: cutoffStr,
      startDate: '',
      endDate: '',
      totalExpense: 0,
      totalIncome: 0,
    };
  }

  const sorted = [...older].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sorted[0].date;
  const endDate = sorted[sorted.length - 1].date;

  const totalExpense = older
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalIncome = older
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return {
    count: older.length,
    transactions: older,
    cutoffDate: cutoffStr,
    startDate,
    endDate,
    totalExpense,
    totalIncome,
  };
}

/**
 * Archives all data older than cutoffMonths (1 year) into a JSON or CSV file,
 * downloads it with an accurate structured filename (e.g. PruFin_Archive_2024-01-01_to_2025-01-01.json),
 * and removes them from the active database to prevent indefinite storage growth.
 */
export function archiveAndExportOldData(format: 'json' | 'csv' = 'json', cutoffMonths = 12): {
  success: boolean;
  count: number;
  fileName?: string;
  message: string;
} {
  const archivable = getArchivableData(cutoffMonths);
  if (archivable.count === 0) {
    return {
      success: false,
      count: 0,
      message: 'No records older than 1 year found. Active database is already optimized!',
    };
  }

  const { transactions: oldTx, startDate, endDate, totalExpense, totalIncome } = archivable;
  const fileName = `PruFin_Archive_${startDate}_to_${endDate}.${format}`;

  if (format === 'json') {
    const archivePayload = {
      archiveTitle: 'PruFin Historical Archive',
      retentionPolicy: '1 Year Retention',
      exportedAt: new Date().toISOString(),
      dateRange: { start: startDate, end: endDate },
      recordsCount: oldTx.length,
      financialSummary: {
        totalExpense,
        totalIncome,
        netDifference: totalIncome - totalExpense,
      },
      transactions: oldTx,
    };

    const blob = new Blob([JSON.stringify(archivePayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const headers = [
      'Timestamp',
      'Expense / Income',
      'Category',
      'Description',
      'Amount',
      'Payment Mode',
      'Date',
      'Remarks',
    ];
    const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const rows = oldTx.map((t) => [
      escape(t.timestamp || t.date),
      escape(t.type),
      escape(t.category),
      escape(t.description),
      t.amount,
      escape(t.paymentMode),
      escape(t.date),
      escape(t.remarks || ''),
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Remove archived transactions from active database
  const allTx = loadTransactions();
  const oldIds = new Set(oldTx.map((t) => t.id));
  const remaining = allTx.filter((t) => !oldIds.has(t.id));
  saveTransactions(remaining);

  // Log in archive history
  saveArchiveRecord({
    id: `arch_${Date.now()}`,
    archivedAt: new Date().toISOString(),
    count: oldTx.length,
    dateRange: `${startDate} to ${endDate}`,
    fileName,
    format,
    totalExpense,
    totalIncome,
  });

  return {
    success: true,
    count: oldTx.length,
    fileName,
    message: `Successfully archived ${oldTx.length} records (${startDate} to ${endDate}) to ${fileName}. Active database pruned!`,
  };
}
