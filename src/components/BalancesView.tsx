import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Calendar,
  X,
  Check,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { MonthlyAccountBalance } from '../types';
import { formatINR, formatMonthYear, getCurrentMonthKey } from '../utils/dateUtils';
import { getUnifiedMonthlyBalance, updateUnifiedMonthlyBalance } from '../utils/storage';

interface Props {
  monthlyBalances: MonthlyAccountBalance[];
  selectedMonth: string;
  onUpdateBalances: (balances: MonthlyAccountBalance[]) => void;
  onOpenHelp?: () => void;
}

export const BalancesView: React.FC<Props> = ({
  monthlyBalances,
  selectedMonth,
  onUpdateBalances,
  onOpenHelp,
}) => {
  // Active month key (if selectedMonth is All, pick latest recorded month or current month)
  const activeMonth = useMemo(() => {
    if (selectedMonth !== 'All') return selectedMonth;
    const months = Array.from(new Set(monthlyBalances.map((b) => b.month))).sort().reverse();
    return months[0] || getCurrentMonthKey();
  }, [selectedMonth, monthlyBalances]);

  // Modal states for editing a month's balance
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [targetMonth, setTargetMonth] = useState(activeMonth);
  const [inputStart, setInputStart] = useState<string>('');
  const [inputEnd, setInputEnd] = useState<string>('');
  const [inputNotes, setInputNotes] = useState<string>('');

  // Active month balance
  const activeBal = useMemo(() => {
    return getUnifiedMonthlyBalance(monthlyBalances, activeMonth);
  }, [monthlyBalances, activeMonth]);

  const activeDiff = activeBal.endBalance - activeBal.startBalance;
  const activePct = activeBal.startBalance > 0 ? (activeDiff / activeBal.startBalance) * 100 : 0;

  // Multi-month history list (sorted descending by month)
  const allMonths = useMemo(() => {
    const monthSet = Array.from(new Set(monthlyBalances.map((b) => b.month)));
    if (!monthSet.includes(activeMonth)) monthSet.push(activeMonth);
    return monthSet.sort().reverse().map((m) => {
      const b = getUnifiedMonthlyBalance(monthlyBalances, m);
      const diff = b.endBalance - b.startBalance;
      const pct = b.startBalance > 0 ? (diff / b.startBalance) * 100 : 0;
      return {
        month: m,
        startBalance: b.startBalance,
        endBalance: b.endBalance,
        difference: diff,
        percentChange: pct,
        notes: b.notes,
        isPositive: diff >= 0,
      };
    });
  }, [monthlyBalances, activeMonth]);

  // Open edit modal
  const handleOpenEdit = (m: string) => {
    setTargetMonth(m);
    const existing = getUnifiedMonthlyBalance(monthlyBalances, m);
    setInputStart(existing.startBalance ? existing.startBalance.toString() : '');
    setInputEnd(existing.endBalance ? existing.endBalance.toString() : '');
    setInputNotes(existing.notes || '');
    setIsEditModalOpen(true);
  };

  // Save monthly balance
  const handleSaveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseFloat(inputStart) || 0;
    const end = parseFloat(inputEnd) || 0;

    const updated = updateUnifiedMonthlyBalance(monthlyBalances, targetMonth, s, end, inputNotes);
    onUpdateBalances(updated);
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm flex items-center justify-between transition-colors">
        <div>
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Landmark className="w-3.5 h-3.5 text-[#EF6448]" />
            <span>Bank & Cash Balance • {formatMonthYear(activeMonth)}</span>
          </div>
          <p className="text-xl font-black text-[#EF6448] mt-0.5">
            {formatINR(activeBal.endBalance || activeBal.startBalance)}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Total liquid reserve across banks & cash
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenEdit(activeMonth)}
            className="px-3.5 py-2 rounded-2xl bg-[#EF6448] hover:bg-[#E05338] text-white font-bold text-xs shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Update Balance</span>
          </button>
        </div>
      </div>

      {/* 2. Month Overview Card: Starting vs Ending vs Difference */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {formatMonthYear(activeMonth)} Cash Flow Snapshot
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            activeDiff >= 0
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
          }`}>
            {activeDiff >= 0 ? `+${formatINR(activeDiff)} (+${activePct.toFixed(1)}%)` : `-${formatINR(Math.abs(activeDiff))} (${activePct.toFixed(1)}%)`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB]/60 dark:border-[#363B44]">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Starting (1st of month)
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
              {activeBal.startBalance > 0 ? formatINR(activeBal.startBalance) : 'Not recorded'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB]/60 dark:border-[#363B44]">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Ending (End of month)
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
              {activeBal.endBalance > 0 ? formatINR(activeBal.endBalance) : (activeBal.startBalance > 0 ? formatINR(activeBal.startBalance) : 'Not recorded')}
            </span>
          </div>
        </div>

        {activeBal.notes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic px-1">
            "{activeBal.notes}"
          </p>
        )}
      </div>

      {/* 3. Monthly Balance History Table/Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-[#59171B] dark:text-[#FF927A]" />
            <span>Monthly Balance History</span>
          </div>
          <button
            onClick={() => {
              const today = new Date();
              const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
              handleOpenEdit(getCurrentMonthKey(previousMonth));
            }}
            className="text-[11px] font-bold text-[#59171B] dark:text-[#FF927A] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add Month Record</span>
          </button>
        </div>

        <div className="space-y-2">
          {allMonths.map((m) => (
            <div
              key={m.month}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm flex items-center justify-between gap-3 transition-colors hover:border-[#59171B]/40"
            >
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {formatMonthYear(m.month)}
                  </h4>
                  {m.difference !== 0 && (
                    <span className={`text-[10px] font-bold ${
                      m.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {m.isPositive ? `+${formatINR(m.difference)}` : `-${formatINR(Math.abs(m.difference))}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>Start: {m.startBalance > 0 ? formatINR(m.startBalance) : '—'}</span>
                  <span>•</span>
                  <span>End: {m.endBalance > 0 ? formatINR(m.endBalance) : '—'}</span>
                </div>
                {m.notes && (
                  <p className="text-[10px] text-slate-400 italic truncate mt-0.5">
                    {m.notes}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleOpenEdit(m.month)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1F1E] shrink-0"
                title="Edit this month"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Monthly Balance Modal */}
      {isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 flex items-center justify-center animate-fadeIn">
          <div
            className="w-full max-w-md max-h-[88vh] overflow-y-auto my-auto bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] rounded-3xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8E1DB] dark:border-[#363B44] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#59171B] dark:text-[#FF927A]">
                  Update Liquid Balance
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatMonthYear(targetMonth)} • Cash in bank accounts & wallet
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Starting Balance (1st of month)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={inputStart}
                    onChange={(e) => setInputStart(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Ending Balance (End of month)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 175000"
                    value={inputEnd}
                    onChange={(e) => setInputEnd(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Notes / Context (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Salary credited, bonus, trip expense"
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Balance</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
