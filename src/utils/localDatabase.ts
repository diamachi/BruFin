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
import { DEFAULT_BASE_PAYMENT_MODES } from './categories';

const DATABASE_NAME = 'brufin-local';
const DATABASE_VERSION = 2;
const SECTION_STORE = 'sections';
const TRANSACTIONS_STORE = 'transactions';

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

function normalizeSection<K extends SectionName>(name: K, value: unknown): LocalDatabaseData[K] {
  if (name === 'monthlyTarget') {
    return (typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : EMPTY_DATA.monthlyTarget) as LocalDatabaseData[K];
  }
  if (name === 'paymentMethods') {
    return (Array.isArray(value) && value.length > 0 ? value : EMPTY_DATA.paymentMethods) as LocalDatabaseData[K];
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

  const loaded: LocalDatabaseData = { ...EMPTY_DATA, transactions };
  for (const section of sections) {
    if (section.name in EMPTY_DATA) {
      (loaded as unknown as Record<string, unknown>)[section.name] = normalizeSection(section.name, section.value);
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
