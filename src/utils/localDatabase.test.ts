import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { Transaction } from '../types';
import { parseHistoricalDataFile } from './archiveImport';

function makeFile(name: string, contents: string): File {
  return new File([contents], name, { type: name.endsWith('.csv') ? 'text/csv' : 'application/json' });
}

describe('local IndexedDB and historical data import', () => {
  it('upgrades the prior database, migrates localStorage, persists updates, and reads export formats', async () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, String(value)),
        removeItem: (key: string) => values.delete(key),
      },
    });

    const legacyTransaction: Transaction = {
      id: 'legacy-1', type: 'Expense', category: 'Food', description: 'Coffee',
      amount: 120, paymentMode: 'UPI', date: '2024-01-05',
    };
    const oldDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('brufin-local', 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => request.result.createObjectStore('sections', { keyPath: 'name' });
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = oldDatabase.transaction('sections', 'readwrite');
      transaction.objectStore('sections').put({ name: 'transactions', value: [legacyTransaction] });
      transaction.objectStore('sections').put({ name: 'monthlyTarget', value: 60000 });
      transaction.oncomplete = () => { oldDatabase.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    });

    let database = await import('./localDatabase');
    await database.initializeLocalDatabase();
    expect(database.getLocalDatabaseData().transactions).toEqual([legacyTransaction]);
    expect(database.getLocalDatabaseData().monthlyTarget).toBe(60000);

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('brufin-local');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Database connection did not close for migration test.'));
    });
    values.set('brufin_transactions_v2', JSON.stringify([legacyTransaction]));
    values.set('brufin_target_v2', '65000');
    vi.resetModules();
    database = await import('./localDatabase');
    await database.initializeLocalDatabase();
    expect(database.getLocalDatabaseData().transactions).toEqual([legacyTransaction]);
    expect(database.getLocalDatabaseData().monthlyTarget).toBe(65000);
    expect(values.has('brufin_transactions_v2')).toBe(false);

    const updated = [{ ...legacyTransaction, description: 'Updated coffee' }];
    await database.saveLocalDatabaseSections({ transactions: updated });
    expect(database.getLocalDatabaseData().transactions).toEqual(updated);
    const persistedRows = await new Promise<unknown>((resolve, reject) => {
      const openRequest = indexedDB.open('brufin-local', 2);
      openRequest.onerror = () => reject(openRequest.error);
      openRequest.onsuccess = () => {
        const readRequest = openRequest.result.transaction('transactions', 'readonly').objectStore('transactions').getAll();
        readRequest.onerror = () => reject(readRequest.error);
        readRequest.onsuccess = () => resolve(readRequest.result);
      };
    });
    expect(persistedRows).toEqual(updated);

    const archiveJson = makeFile('archive.json', JSON.stringify({ transactions: [
      { ...legacyTransaction, id: 'archive-1', date: '2023-12-31' },
    ] }));
    expect(await parseHistoricalDataFile(archiveJson)).toMatchObject([
      { id: 'archive-1', date: '2023-12-31', description: 'Coffee' },
    ]);

    const archiveCsv = makeFile('archive.csv', [
      'Timestamp,Expense / Income,Category,Description,Amount,Payment Mode,Date,Remarks',
      '2023-12-31 12:00:00,Expense,Food,"Coffee, takeaway",120,UPI,2023-12-31,',
    ].join('\n'));
    expect(await parseHistoricalDataFile(archiveCsv)).toMatchObject([
      { type: 'Expense', category: 'Food', description: 'Coffee, takeaway', amount: 120, date: '2023-12-31' },
    ]);
  });
});
