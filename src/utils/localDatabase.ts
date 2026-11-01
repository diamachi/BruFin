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
import { DEFAULT_MONTHLY_TARGET } from '../data/dummyData';
import { DEFAULT_BASE_PAYMENT_MODES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './categories';

const DATABASE_NAME = 'brufin-local';
const DATABASE_VERSION = 2;
const SECTION_STORE = 'sections';
const TRANSACTIONS_STORE = 'transactions';

const LEGACY_KEYS = {
  transactions: 'brufin_transactions_v2',
  creditCards: 'brufin_cards_v2',
  recurringPayments: 'brufin_recurring_v2',
  monthlyTarget: 'brufin_target_v2',
  investments: 'brufin_investments_v2',
  loans: 'brufin_loans_v2',
  bankAccounts: 'brufin_accounts_v2',
  monthlyBalances: 'brufin_balances_v2',
  paymentMethods: 'brufin_payment_methods_v2',
  expenseCategories: 'brufin_expense_categories_v2',
  incomeCategories: 'brufin_income_categories_v2',
} as const;

export interface LocalDatabaseData {
  transactions: Transaction[];
  creditCards: CreditCard[];
  recurringPayments: RecurringPayment[];
  monthlyTarget: number;
  investments: InvestmentItem[];
  loans: LoanItem[];
  bankAccounts: BankAccount[];
  monthlyBalances: MonthlyAccountBalance[];
  paymentMethods: PaymentMethodItem[];
  expenseCategories: string[];
  incomeCategories: string[];
}

export type LocalDatabaseUpdates = Partial<LocalDatabaseData>;
type SectionName = keyof LocalDatabaseData;
type StoredSection = { name: SectionName; value: unknown };

const EMPTY_DATA: LocalDatabaseData = {
  transactions: [],
  creditCards: [],
  recurringPayments: [],
  monthlyTarget: DEFAULT_MONTHLY_TARGET,
  investments: [],
  loans: [],
  bankAccounts: [],
  monthlyBalances: [],
  paymentMethods: DEFAULT_BASE_PAYMENT_MODES,
  expenseCategories: EXPENSE_CATEGORIES.map((category) => category.name),
  incomeCategories: INCOME_CATEGORIES.map((category) => category.name),
};

let databasePromise: Promise<IDBDatabase> | null = null;
let cachedData: LocalDatabaseData = { ...EMPTY_DATA };
let isInitialized = false;
let writeQueue: Promise<void> = Promise.resolve();

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      const oldVersion = event.oldVersion;
      if (!database.objectStoreNames.contains(SECTION_STORE)) {
        database.createObjectStore(SECTION_STORE, { keyPath: 'name' });
      }
      if (!database.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        database.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
      }
      if (oldVersion === 1) {
        const upgradeTransaction = request.transaction;
        const oldSections = upgradeTransaction?.objectStore(SECTION_STORE);
        const oldTransactions = oldSections?.get('transactions');
        if (oldSections && oldTransactions) {
          oldTransactions.onsuccess = () => {
            const value = (oldTransactions.result as StoredSection | undefined)?.value;
            if (Array.isArray(value)) {
              const transactionsStore = upgradeTransaction!.objectStore(TRANSACTIONS_STORE);
              value.forEach((item) => {
                if (item && typeof item.id === 'string') transactionsStore.put(item);
              });
            }
            oldSections.delete('transactions');
          };
        }
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error || new Error('Could not open the local database.'));
    request.onblocked = () => reject(new Error('The local database is busy in another app tab. Close other BruFin tabs and retry.'));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

function readLegacyValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function canRemoveLegacyValue(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return true;
    const value = JSON.parse(raw) as unknown;
    if (key === LEGACY_KEYS.monthlyTarget) return typeof value === 'number' && Number.isFinite(value) && value > 0;
    return Array.isArray(value);
  } catch {
    return false;
  }
}

function normalizeSection<K extends SectionName>(name: K, value: unknown): LocalDatabaseData[K] {
  if (name === 'monthlyTarget') {
    return (typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : EMPTY_DATA.monthlyTarget) as LocalDatabaseData[K];
  }
  if (name === 'paymentMethods') {
    return (Array.isArray(value) && value.length > 0 ? value : EMPTY_DATA.paymentMethods) as LocalDatabaseData[K];
  }
  if (name === 'expenseCategories' || name === 'incomeCategories') {
    const uniqueNames = Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))]
      : [];
    return (uniqueNames.length > 0 ? uniqueNames : EMPTY_DATA[name]) as LocalDatabaseData[K];
  }
  return (Array.isArray(value) ? value : EMPTY_DATA[name]) as LocalDatabaseData[K];
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Local database operation failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('Local database operation was cancelled.'));
  });
}

async function writeSectionsDirect(
  database: IDBDatabase,
  data: LocalDatabaseUpdates,
  previousTransactions: Transaction[] = []
): Promise<void> {
  const transaction = database.transaction([SECTION_STORE, TRANSACTIONS_STORE], 'readwrite');
  const sectionStore = transaction.objectStore(SECTION_STORE);
  for (const [name, value] of Object.entries(data) as [SectionName, LocalDatabaseData[SectionName]][]) {
    if (name === 'transactions') {
      const transactionsStore = transaction.objectStore(TRANSACTIONS_STORE);
      const nextTransactions = value as Transaction[];
      const nextById = new Map(nextTransactions.map((item) => [item.id, item]));
      previousTransactions.forEach((item) => {
        if (!nextById.has(item.id)) transactionsStore.delete(item.id);
      });
      const previousById = new Map(previousTransactions.map((item) => [item.id, item]));
      nextTransactions.forEach((item) => {
        if (JSON.stringify(previousById.get(item.id)) !== JSON.stringify(item)) transactionsStore.put(item);
      });
    } else {
      sectionStore.put({ name, value } satisfies StoredSection);
    }
  }
  await waitForTransaction(transaction);
}

export async function initializeLocalDatabase(): Promise<void> {
  if (isInitialized) return;
  const database = await openDatabase();
  const readTransaction = database.transaction([SECTION_STORE, TRANSACTIONS_STORE], 'readonly');
  const sectionRequest = readTransaction.objectStore(SECTION_STORE).getAll() as IDBRequest<StoredSection[]>;
  const transactionsRequest = readTransaction.objectStore(TRANSACTIONS_STORE).getAll() as IDBRequest<Transaction[]>;
  const { sections, transactions } = await new Promise<{ sections: StoredSection[]; transactions: Transaction[] }>((resolve, reject) => {
    let sectionRows: StoredSection[] | undefined;
    let transactionRows: Transaction[] | undefined;
    const finish = () => {
      if (sectionRows && transactionRows) resolve({ sections: sectionRows, transactions: transactionRows });
    };
    sectionRequest.onsuccess = () => { sectionRows = sectionRequest.result || []; finish(); };
    transactionsRequest.onsuccess = () => { transactionRows = transactionsRequest.result || []; finish(); };
    sectionRequest.onerror = () => reject(sectionRequest.error || new Error('Could not read local database sections.'));
    transactionsRequest.onerror = () => reject(transactionsRequest.error || new Error('Could not read local transactions.'));
  });

  let loaded: LocalDatabaseData;
  if (sections.length > 0 || transactions.length > 0) {
    loaded = { ...EMPTY_DATA, transactions };
    for (const section of sections) {
      if (section.name in EMPTY_DATA) {
        (loaded as unknown as Record<string, unknown>)[section.name] = normalizeSection(section.name, section.value);
      }
    }
  } else {
    // One-time migration from the app's previous localStorage layout.
    loaded = {
      transactions: readLegacyValue(LEGACY_KEYS.transactions, []),
      creditCards: readLegacyValue(LEGACY_KEYS.creditCards, []),
      recurringPayments: readLegacyValue(LEGACY_KEYS.recurringPayments, []),
      monthlyTarget: readLegacyValue(LEGACY_KEYS.monthlyTarget, DEFAULT_MONTHLY_TARGET),
      investments: readLegacyValue(LEGACY_KEYS.investments, []),
      loans: readLegacyValue(LEGACY_KEYS.loans, []),
      bankAccounts: readLegacyValue(LEGACY_KEYS.bankAccounts, []),
      monthlyBalances: readLegacyValue(LEGACY_KEYS.monthlyBalances, []),
      paymentMethods: readLegacyValue(LEGACY_KEYS.paymentMethods, DEFAULT_BASE_PAYMENT_MODES),
      expenseCategories: readLegacyValue(LEGACY_KEYS.expenseCategories, EMPTY_DATA.expenseCategories),
      incomeCategories: readLegacyValue(LEGACY_KEYS.incomeCategories, EMPTY_DATA.incomeCategories),
    };
    loaded = Object.fromEntries(
      Object.entries(loaded).map(([name, value]) => [name, normalizeSection(name as SectionName, value)])
    ) as unknown as LocalDatabaseData;
    await writeSectionsDirect(database, loaded, []);

    // Remove old copies only after the IndexedDB transaction has committed.
    for (const key of Object.values(LEGACY_KEYS)) {
      if (!canRemoveLegacyValue(key)) continue;
      try { localStorage.removeItem(key); } catch { /* IndexedDB copy is already committed. */ }
    }
  }

  cachedData = loaded;
  isInitialized = true;
}

export function getLocalDatabaseData(): LocalDatabaseData {
  if (!isInitialized) throw new Error('Local database has not finished initializing.');
  return cachedData;
}

export function saveLocalDatabaseSections(updates: LocalDatabaseUpdates): Promise<void> {
  if (!isInitialized) return Promise.reject(new Error('Local database has not finished initializing.'));
  const normalized = Object.fromEntries(
    Object.entries(updates).map(([name, value]) => [name, normalizeSection(name as SectionName, value)])
  ) as LocalDatabaseUpdates;

  const operation = writeQueue.then(async () => {
    const database = await openDatabase();
    await writeSectionsDirect(database, normalized, cachedData.transactions);
    cachedData = { ...cachedData, ...normalized };
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}

export function replaceLocalDatabaseData(data: LocalDatabaseData): Promise<void> {
  return saveLocalDatabaseSections(data);
}
