import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, X, Download, RotateCcw } from 'lucide-react';
import { Transaction } from '../types';
import { formatDateLabel, formatINR } from '../utils/dateUtils';

interface Props {
  transactions: Transaction[] | null;
  existingTransactions: Transaction[];
  onClose: () => void;
  onRestore: (transactions: Transaction[]) => Promise<void>;
}

function signature(transaction: Transaction): string {
  return [transaction.date, transaction.type, transaction.amount, transaction.description.trim().toLowerCase(), transaction.paymentMode.trim().toLowerCase(), transaction.category.trim().toLowerCase()].join('|');
}

export const ArchiveViewerModal: React.FC<Props> = ({ transactions, existingTransactions, onClose, onRestore }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const { newTransactions, duplicateCount, totalIncome, totalExpense } = useMemo(() => {
    const existingIds = new Set(existingTransactions.map((item) => item.id));
    const existingSignatureCounts = new Map<string, number>();
    existingTransactions.forEach((item) => {
      const key = signature(item);
      existingSignatureCounts.set(key, (existingSignatureCounts.get(key) || 0) + 1);
    });
    const newRows: Transaction[] = [];
    (transactions || []).forEach((item) => {
      const key = signature(item);
      const count = existingSignatureCounts.get(key) || 0;
      if (existingIds.has(item.id) || count > 0) {
        if (count > 0) existingSignatureCounts.set(key, count - 1);
        return;
      }
      newRows.push(item);
      existingIds.add(item.id);
    });
    return {
      newTransactions: newRows,
      duplicateCount: (transactions?.length || 0) - newRows.length,
      totalIncome: (transactions || []).filter((item) => item.type === 'Income').reduce((sum, item) => sum + item.amount, 0),
      totalExpense: (transactions || []).filter((item) => item.type === 'Expense').reduce((sum, item) => sum + item.amount, 0),
    };
  }, [transactions, existingTransactions]);

  if (!transactions) return null;

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await onRestore(newTransactions);
      setRestoreMessage(`Restored ${newTransactions.length} transactions.`);
    } catch (error) {
      console.error('Could not restore archive', error);
      setRestoreMessage('Could not save these records. Please retry.');
    } finally {
      setIsRestoring(false);
    }
  };

  const dateRange = transactions.length
    ? `${formatDateLabel([...transactions].sort((a, b) => a.date.localeCompare(b.date))[0].date)} – ${formatDateLabel([...transactions].sort((a, b) => b.date.localeCompare(a.date))[0].date)}`
    : 'No transactions';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="archive-viewer-title">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#FED7B8] bg-white shadow-2xl dark:border-[#363B44] dark:bg-[#22252A]">
        <header className="flex items-center justify-between border-b border-[#FED7B8] p-4 dark:border-[#363B44]">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-[#EF6448]" />
            <div>
              <h2 id="archive-viewer-title" className="font-bold">Historical data preview</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{transactions.length} records · {dateRange}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-[#363C3A]" aria-label="Close archive preview"><X className="h-4 w-4" /></button>
        </header>

        <div className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#1B1E22]">Income <strong className="mt-1 block">{formatINR(totalIncome)}</strong></div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#1B1E22]">Expenses <strong className="mt-1 block">{formatINR(totalExpense)}</strong></div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#1B1E22]">Already in BruFin <strong className="mt-1 block">{duplicateCount}</strong></div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
          <table className="w-full min-w-[540px] text-left text-xs">
            <thead className="sticky top-0 bg-white text-slate-500 dark:bg-[#22252A] dark:text-slate-400">
              <tr><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Description</th><th className="p-2">Category</th><th className="p-2 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {transactions.slice(0, 200).map((item, index) => (
                <tr key={`${item.id}-${index}`} className="border-t border-slate-100 dark:border-[#363B44]">
                  <td className="whitespace-nowrap p-2">{formatDateLabel(item.date)}</td>
                  <td className="p-2">{item.type}</td>
                  <td className="max-w-56 truncate p-2">{item.description || '—'}</td>
                  <td className="p-2">{item.category}</td>
                  <td className="whitespace-nowrap p-2 text-right">{formatINR(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length > 200 && <p className="mt-2 text-center text-xs text-slate-500">Showing the first 200 records. Restoring will include all {transactions.length}.</p>}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#FED7B8] p-4 dark:border-[#363B44]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Duplicate rows are skipped when you restore this archive.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-[#363B44]">Close</button>
            <button onClick={() => void handleRestore()} disabled={isRestoring || newTransactions.length === 0} className="flex items-center gap-1.5 rounded-xl bg-[#59171B] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {isRestoring ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Restore {newTransactions.length} new
            </button>
          </div>
        </footer>
        {restoreMessage && <div className="px-4 pb-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">{restoreMessage}</div>}
      </div>
    </div>,
    document.body
  );
};
