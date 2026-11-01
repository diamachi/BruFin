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
import {
  getLocalDatabaseData,
  initializeLocalDatabase,
  replaceLocalDatabaseData,
  saveLocalDatabaseSections,
} from './localDatabase';
import type { LocalDatabaseUpdates } from './localDatabase';

const STORAGE_KEYS = {
  IS_DEMO_MODE: 'brufin_is_demo_mode_v2',
  HAS_ONBOARDED: 'brufin_has_onboarded_v2',
  BALANCE_PROMPTS_ENABLED: 'brufin_balance_prompts_enabled_v2',
  DISMISSED_PROMPTS: 'brufin_dismissed_balance_prompts_v2',
  SHOW_DIAGNOSTICS: 'brufin_show_diagnostics_v2',
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

export { initializeLocalDatabase };

export function saveDatabaseSections(updates: LocalDatabaseUpdates): Promise<void> {
  return saveLocalDatabaseSections(updates);
}

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
  return getLocalDatabaseData().transactions;
}

export function saveTransactions(transactions: Transaction[]): Promise<void> {
  return saveLocalDatabaseSections({ transactions: transactions || [] });
}

export function loadCreditCards(): CreditCard[] {
  return getLocalDatabaseData().creditCards;
}

export function saveCreditCards(cards: CreditCard[]): Promise<void> {
  return saveLocalDatabaseSections({ creditCards: cards || [] });
}

export function loadRecurringPayments(): RecurringPayment[] {
  return getLocalDatabaseData().recurringPayments;
}

export function saveRecurringPayments(recurring: RecurringPayment[]): Promise<void> {
  return saveLocalDatabaseSections({ recurringPayments: recurring || [] });
}

export function loadMonthlyTarget(): number {
  return getLocalDatabaseData().monthlyTarget;
}

export function saveMonthlyTarget(target: number): Promise<void> {
  return saveLocalDatabaseSections({ monthlyTarget: target || DEFAULT_MONTHLY_TARGET });
}

export function loadInvestments(): InvestmentItem[] {
  return getLocalDatabaseData().investments;
}

export function saveInvestments(investments: InvestmentItem[]): Promise<void> {
  return saveLocalDatabaseSections({ investments: investments || [] });
}

export function loadLoans(): LoanItem[] {
  return getLocalDatabaseData().loans;
}

export function saveLoans(loans: LoanItem[]): Promise<void> {
  return saveLocalDatabaseSections({ loans: loans || [] });
}

export function loadPaymentMethods(): PaymentMethodItem[] {
  return getLocalDatabaseData().paymentMethods;
}

export function savePaymentMethods(methods: PaymentMethodItem[]): Promise<void> {
  return saveLocalDatabaseSections({ paymentMethods: methods || DEFAULT_BASE_PAYMENT_MODES });
}

export function loadBankAccounts(): BankAccount[] {
  return getLocalDatabaseData().bankAccounts;
}

export function saveBankAccounts(accounts: BankAccount[]): Promise<void> {
  return saveLocalDatabaseSections({ bankAccounts: accounts || [] });
}

export function loadMonthlyBalances(): MonthlyAccountBalance[] {
  return getLocalDatabaseData().monthlyBalances;
}

export function saveMonthlyBalances(balances: MonthlyAccountBalance[]): Promise<void> {
  return saveLocalDatabaseSections({ monthlyBalances: balances });
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
  return updatedList;
}

/**
 * Loads the complete sample dataset into localStorage and activates demo mode
 */
export async function loadDemoDataset() {
  const sample = generateSampleData();
  await replaceLocalDatabaseData({
    transactions: sample.transactions,
    creditCards: sample.creditCards,
    recurringPayments: sample.recurringPayments,
    monthlyTarget: sample.monthlyTarget,
    investments: sample.investments,
    loans: sample.loans,
    bankAccounts: sample.bankAccounts,
    monthlyBalances: sample.monthlyBalances,
    paymentMethods: DEFAULT_BASE_PAYMENT_MODES,
  });
  setDemoModeActive(true);
  setUserOnboarded(true);
  return sample;
}

/**
 * Permanently wipes all personal/sample data and starts with a pristine database
 */
export async function clearAllData(): Promise<void> {
  await replaceLocalDatabaseData({
    transactions: [],
    creditCards: [],
    recurringPayments: [],
    investments: [],
    loans: [],
    bankAccounts: [],
    monthlyBalances: [],
    paymentMethods: DEFAULT_BASE_PAYMENT_MODES,
    monthlyTarget: DEFAULT_MONTHLY_TARGET,
  });
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
    if (!rec) return { recurring: rec, isPaid: false, isActive: false };
    const recNameLower = (rec.name || '').toLowerCase().trim();

    const exactFound = txList.find((t) => {
      if (!t || t.type !== 'Expense') return false;
      const matchMonth = t.date && t.date.startsWith(monthKey);
      return matchMonth && t.recurringId === rec.id;
    });
    const uniqueLegacyName = recNameLower && recList.filter((item) => item.name.toLowerCase().trim() === recNameLower).length === 1;
    const found = exactFound || (uniqueLegacyName ? txList.find((t) =>
      t?.type === 'Expense' && t.date?.startsWith(monthKey) && t.description?.toLowerCase().trim() === recNameLower
    ) : undefined);
    const [startYear, startMonthNum] = (rec.startMonth || '').split('-').map(Number);
    const [targetYear, targetMonthNum] = monthKey.split('-').map(Number);
    const monthOffset = startYear && targetYear ? (targetYear - startYear) * 12 + targetMonthNum - startMonthNum : 0;
    const duration = Number(rec.durationMonths) || 0;
    const isActive = !rec.startMonth || (monthKey >= rec.startMonth && (!duration || monthOffset < duration));

    return {
      recurring: rec,
      isPaid: isActive && !!found,
      isActive,
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
  const status = getRecurringPaymentStatuses([rec], existingTransactions, monthKey)[0];
  if (!status?.isActive || status.isPaid) return existingTransactions;
  const today = getTodayDateString();
  const txDate = today.startsWith(monthKey) ? today : `${monthKey}-01`;

  const newTx: Transaction = {
    id: `tx_rec_${rec.id}_${monthKey}`,
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
  return updated;
}

export function exportDatabaseJSON(): void {
  const data = {
    appName: 'BruFin',
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
  a.download = `brufin_backup_${getTodayDateString()}.json`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
    const escape = (value: unknown) => {
      let val = String(value ?? '');
      if (/^[\s\u0000-\u001f]*[=+@-]/.test(val)) val = `'${val}`;
      return `"${val.replace(/"/g, '""')}"`;
    };
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
  a.download = `brufin_transactions_${getTodayDateString()}.csv`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

export async function getStorageDiagnostics(): Promise<StorageDiagnostics> {
  const data = getLocalDatabaseData();
  const sectionMeta: { name: string; key: keyof typeof data; value: unknown }[] = [
    { name: 'Transactions', key: 'transactions', value: data.transactions },
    { name: 'Cards', key: 'creditCards', value: data.creditCards },
    { name: 'Balances', key: 'monthlyBalances', value: data.monthlyBalances },
    { name: 'Recurring Rules', key: 'recurringPayments', value: data.recurringPayments },
    { name: 'Investments', key: 'investments', value: data.investments },
    { name: 'Loans & Liabilities', key: 'loans', value: data.loans },
    { name: 'Payment Methods', key: 'paymentMethods', value: data.paymentMethods },
  ];
  const breakdown = sectionMeta.map(({ name, key, value }) => {
    const bytes = new Blob([JSON.stringify(value)]).size;
    return { name, key, bytes, formatted: formatBytes(bytes), count: Array.isArray(value) ? value.length : 1 };
  });
  const estimatedBytes = breakdown.reduce((sum, item) => sum + item.bytes, 0);
  let usage = estimatedBytes;
  let quota = 0;
  try {
    const estimate = await navigator.storage?.estimate();
    usage = estimate?.usage ?? usage;
    quota = estimate?.quota ?? 0;
  } catch {
    // Quota estimates are not available in every WebView.
  }
  return {
    totalBytes: usage,
    totalFormatted: formatBytes(usage),
    quotaBytes: quota,
    percentOfQuota: quota > 0 ? Math.min(100, (usage / quota) * 100) : 0,
    keysCount: breakdown.length,
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
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

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
 * and keeps them in the active database until the user explicitly deletes them.
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
  const fileName = `BruFin_Archive_${startDate}_to_${endDate}.${format}`;

  if (format === 'json') {
    const archivePayload = {
      archiveTitle: 'BruFin Historical Export',
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
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
    const escape = (value: unknown) => {
      let val = String(value ?? '');
      if (/^[\s\u0000-\u001f]*[=+@-]/.test(val)) val = `'${val}`;
      return `"${val.replace(/"/g, '""')}"`;
    };
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
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return {
    success: true,
    count: oldTx.length,
    fileName,
    message: `Exported ${oldTx.length} records (${startDate} to ${endDate}) to ${fileName}. Records remain safely in your active data.`,
  };
}
