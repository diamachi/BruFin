import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Zap,
  Tag,
  CreditCard,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatINR, formatMonthYear, formatDateLabel, getTodayDateString } from '../utils/dateUtils';
import { EXPENSE_CATEGORIES, getCategoryMeta } from '../utils/categories';
import { CategoryIcon } from './CategoryIcon';

export type DistributionFilterMode = 'monthly' | 'day_wise' | 'specific_date';
export type DistributionChartMode = 'category' | 'method';

interface Props {
  transactions: Transaction[];
  selectedMonth: string; // YYYY-MM or 'All'
  onNavigateToExpenses?: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

const METHOD_COLORS = [
  'var(--chart-color-1)',
  'var(--chart-color-2)',
  'var(--chart-color-3)',
  'var(--chart-color-4)',
  'var(--chart-color-5)',
  'var(--chart-color-6)',
  'var(--chart-color-7)',
  'var(--chart-color-8)',
  'var(--chart-color-9)',
  'var(--chart-color-10)',
  'var(--chart-color-11)',
  'var(--chart-color-12)',
  'var(--chart-color-13)',
];

const getCategoryChartColor = (name: string) => {
  const knownIndex = EXPENSE_CATEGORIES.findIndex((category) => category.name.toLowerCase() === name.toLowerCase());
  if (knownIndex >= 0) return METHOD_COLORS[knownIndex % METHOD_COLORS.length];

  let hash = 0;
  for (const character of name.toLowerCase()) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return METHOD_COLORS[Math.abs(hash) % METHOD_COLORS.length];
};

export const ExpenseDistributionCard: React.FC<Props> = ({
  transactions,
  selectedMonth,
  onNavigateToExpenses,
  onEditTransaction,
  title = 'Expense Distribution',
  subtitle,
  className = '',
}) => {
  const [filterMode, setFilterMode] = useState<DistributionFilterMode>('monthly');
  const [chartMode, setChartMode] = useState<DistributionChartMode>('category');
  const [specificDate, setSpecificDate] = useState<string>(() => {
    // If selectedMonth is current, default to today; otherwise default to 1st of selectedMonth
    const today = getTodayDateString();
    if (selectedMonth !== 'All' && !today.startsWith(selectedMonth)) {
      return `${selectedMonth}-01`;
    }
    return today;
  });

  // Calculate elapsed days in the period for Day-wise burn velocity
  const { daysElapsed } = useMemo(() => {
    const today = new Date();
    if (selectedMonth === 'All') {
      const dates = transactions.filter((t) => t.type === 'Expense' && t.date).map((t) => t.date).sort();
      if (dates.length === 0) return { daysElapsed: 1 };
      const [year, month, day] = dates[0].split('-').map(Number);
      const firstExpense = new Date(year, month - 1, day);
      const elapsed = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - firstExpense.getTime()) / 86_400_000) + 1;
      return { daysElapsed: Math.max(1, elapsed) };
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(y, m, 0).getDate();
    const isCurrent = today.getFullYear() === y && today.getMonth() + 1 === m;
    const elapsed = isCurrent ? Math.min(today.getDate(), totalDays) : totalDays;
    return { daysElapsed: Math.max(1, elapsed) };
  }, [selectedMonth, transactions]);

  // Filtered expense transactions according to the active filter mode
  const activeExpenses = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'Expense') return false;

      if (filterMode === 'specific_date') {
        return t.date === specificDate;
      }

      // For 'monthly' and 'day_wise', filter by selectedMonth
      if (selectedMonth !== 'All' && (!t.date || !t.date.startsWith(selectedMonth))) {
        return false;
      }

      return true;
    });
  }, [transactions, selectedMonth, filterMode, specificDate]);

  const totalExpenseAmount = useMemo(() => {
    return activeExpenses.reduce((sum, t) => sum + t.amount, 0);
  }, [activeExpenses]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    activeExpenses.forEach((t) => {
      if (!map[t.category]) map[t.category] = { amount: 0, count: 0 };
      map[t.category].amount += t.amount;
      map[t.category].count += 1;
    });

    return Object.entries(map)
      .map(([name, data]) => {
        const percent = totalExpenseAmount > 0 ? (data.amount / totalExpenseAmount) * 100 : 0;
        const avgDaily = Math.round(data.amount / daysElapsed);
        const meta = getCategoryMeta(name);
        const color = getCategoryChartColor(name);
        return { name, amount: data.amount, count: data.count, percent, avgDaily, meta, color };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [activeExpenses, totalExpenseAmount, daysElapsed]);

  // Payment Method breakdown
  const methodBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    activeExpenses.forEach((t) => {
      const mode = t.paymentMode || 'Other';
      if (!map[mode]) map[mode] = { amount: 0, count: 0 };
      map[mode].amount += t.amount;
      map[mode].count += 1;
    });

    return Object.entries(map)
      .map(([name, data], idx) => {
        const percent = totalExpenseAmount > 0 ? (data.amount / totalExpenseAmount) * 100 : 0;
        const avgDaily = Math.round(data.amount / daysElapsed);
        const color = METHOD_COLORS[idx % METHOD_COLORS.length];
        return { name, amount: data.amount, count: data.count, percent, avgDaily, color };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [activeExpenses, totalExpenseAmount, daysElapsed]);

  // Helpers to shift specific date by +/- 1 day
  const handleShiftDate = (days: number) => {
    const d = new Date(specificDate);
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSpecificDate(`${y}-${m}-${day}`);
  };

  const handleSetToday = () => {
    setSpecificDate(getTodayDateString());
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm space-y-4 transition-colors ${className}`}
    >
      {/* Top Header: Title, Subtitle, and Optional "View All" link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-2xl bg-[#59171B] dark:bg-[#B84E3B] text-white flex items-center justify-center shadow-sm shrink-0">
            <BarChart3 className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-[#F2F3F5] tracking-tight">
                {title}
              </h3>
              {filterMode === 'monthly' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                  {selectedMonth === 'All' ? 'All Time' : formatMonthYear(selectedMonth)}
                </span>
              )}
              {filterMode === 'day_wise' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {daysElapsed} {daysElapsed === 1 ? 'day' : 'days'} velocity
                </span>
              )}
              {filterMode === 'specific_date' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                  Single Day
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-[#A5ACB7]">
              {subtitle ||
                (filterMode === 'monthly'
                  ? 'Monthly totals & distribution'
                  : filterMode === 'day_wise'
                  ? 'Average daily velocity across categories'
                  : `Expenses on ${formatDateLabel(specificDate)}`)}
            </p>
          </div>
        </div>

        {onNavigateToExpenses && (
          <button
            onClick={onNavigateToExpenses}
            className="self-start sm:self-auto text-xs font-bold text-[#59171B] dark:text-[#FF927A] hover:underline flex items-center gap-1 active:scale-95 transition-transform"
          >
            <span>Expenses Tab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Primary Filter Tabs: Monthly vs Day-wise vs Specific Date */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[#E8E1DB]/40 dark:border-[#363B44] py-2.5">
        {/* Time Filters */}
        <div className="flex bg-[#F7F6F3] dark:bg-[#1B1E22] p-1 rounded-xl border border-[#E8E1DB] dark:border-[#363B44] text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setFilterMode('monthly')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              filterMode === 'monthly'
                ? 'bg-[#59171B] text-[#FED7B8] dark:bg-[#B84E3B] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-[#A5ACB7] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Monthly</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('day_wise')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              filterMode === 'day_wise'
                ? 'bg-[#59171B] text-[#FED7B8] dark:bg-[#B84E3B] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-[#A5ACB7] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Day-wise</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('specific_date')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              filterMode === 'specific_date'
                ? 'bg-[#59171B] text-[#FED7B8] dark:bg-[#B84E3B] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-[#A5ACB7] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            <span>Specific Date</span>
          </button>
        </div>

        {/* View Toggle: By Category vs By Method */}
        <div className="flex bg-[#F7F6F3] dark:bg-[#1B1E22] p-1 rounded-xl border border-[#E8E1DB] dark:border-[#363B44] text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setChartMode('category')}
            className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              chartMode === 'category'
                ? 'bg-[#59171B] text-[#FED7B8] dark:bg-[#B84E3B] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-[#A5ACB7] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>Category</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('method')}
            className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              chartMode === 'method'
                ? 'bg-[#59171B] text-[#FED7B8] dark:bg-[#B84E3B] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-[#A5ACB7] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>Method</span>
          </button>
        </div>
      </div>

      {/* Specific Date Picker Toolbar (visible when 'specific_date' is active) */}
      {filterMode === 'specific_date' && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] flex flex-wrap items-center justify-between gap-2 text-xs animate-fadeIn">
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 rounded-xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] hover:bg-slate-100 dark:hover:bg-[#2B3037] text-slate-700 dark:text-white transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-1.5 rounded-xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] hover:bg-slate-100 dark:hover:bg-[#2B3037] text-slate-700 dark:text-white transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSetToday}
              className="px-2 py-1 rounded-xl bg-[#F7F6F3] dark:bg-[#22252A] text-[#59171B] dark:text-[#FF927A] border border-[#E8E1DB] dark:border-[#363B44] text-[10px] font-bold hover:bg-[#FED7B8]/40 transition-colors"
            >
              Today
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {formatDateLabel(specificDate)} •{' '}
            <span className="font-bold text-[#59171B] dark:text-[#FF927A]">
              {formatINR(totalExpenseAmount)}
            </span>
          </div>
        </div>
      )}

      {/* Content Area: Chart & Breakdown or Empty State */}
      {activeExpenses.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-2xl bg-slate-50/60 dark:bg-[#1B1E22]/60 border border-dashed border-[#E8E1DB] dark:border-[#363B44] text-slate-400 dark:text-slate-500 text-xs space-y-1.5">
          <Sparkles className="w-5 h-5 mx-auto text-slate-400/70" />
          <p className="font-semibold text-slate-600 dark:text-slate-400">
            {filterMode === 'specific_date'
              ? `No expenses recorded on ${formatDateLabel(specificDate)}`
              : 'No expenses recorded for this period.'}
          </p>
          <p className="text-[10px]">
            {filterMode === 'specific_date' ? 'Select another date or add an expense for this day.' : 'Tap + to add your first expense.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 py-1">
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {chartMode === 'category' ? 'Spending by Category' : 'Spending by Payment Method'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {activeExpenses.length} {activeExpenses.length === 1 ? 'transaction' : 'transactions'}
                {filterMode === 'day_wise' ? ` · ${daysElapsed} ${daysElapsed === 1 ? 'day' : 'days'}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 dark:text-[#A5ACB7] uppercase tracking-wider">
                {filterMode === 'day_wise' ? 'Daily Average' : 'Total'}
              </p>
              <p className="text-sm font-black text-[#59171B] dark:text-[#FF927A] tracking-tight">
                {formatINR(filterMode === 'day_wise' ? Math.round(totalExpenseAmount / daysElapsed) : totalExpenseAmount)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
              {(chartMode === 'category' ? categoryBreakdown : methodBreakdown).map((item: any) => {
                const color = item.color;
                return (
                  <div
                    key={item.name}
                    className="p-2.5 rounded-2xl bg-slate-50/70 dark:bg-[#1B1E22] border border-[#E8E1DB]/50 dark:border-[#363B44] space-y-2 transition-all hover:border-[#59171B]/40 dark:hover:border-[#EF6448]/40"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5 truncate">
                        {item.meta ? (
                          <div
                            className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-[#30353D] flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5"
                            style={{ color }}
                          >
                            <CategoryIcon name={item.meta.icon} className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        )}
                        <div className="truncate">
                          <span className="font-bold text-slate-800 dark:text-[#F2F3F5] truncate block">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-[#A5ACB7]">
                            {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="flex items-center justify-end space-x-1.5">
                          <span className="font-black text-slate-900 dark:text-white">
                            {formatINR(item.amount)}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-[#22252A] text-slate-700 dark:text-[#FF927A]">
                            {item.percent.toFixed(1)}%
                          </span>
                        </div>
                        {filterMode === 'day_wise' && (
                          <div className="text-[10px] font-bold text-[#59171B] dark:text-[#FF927A]">
                            ~{formatINR(item.avgDaily)}/day
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ranked share bar */}
                    <div
                      className="w-full h-2 bg-slate-200/80 dark:bg-[#30353D] rounded-full overflow-hidden"
                      role="progressbar"
                      aria-label={`${item.name} share of expenses`}
                      aria-valuenow={Math.round(item.percent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.percent))}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Specific Date: List of transactions on that date */}
          {filterMode === 'specific_date' && activeExpenses.length > 0 && (
            <div className="pt-2 border-t border-[#E8E1DB]/40 dark:border-[#363B44] space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Transactions on {formatDateLabel(specificDate)} ({activeExpenses.length})
              </span>
              <div className="space-y-1.5">
                {activeExpenses.map((t) => {
                  const meta = getCategoryMeta(t.category);
                  return (
                    <div
                      key={t.id}
                      onClick={() => onEditTransaction?.(t)}
                      className={`p-2.5 rounded-xl bg-white dark:bg-[#22252A] border border-[#E8E1DB]/60 dark:border-[#363B44] flex items-center justify-between gap-2 transition-all ${
                        onEditTransaction ? 'cursor-pointer hover:border-[#59171B] dark:hover:border-[#EF6448]' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                        >
                          <CategoryIcon name={meta.icon} className="w-3 h-3" />
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-800 dark:text-white truncate block">
                            {t.description || t.category}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {t.paymentMode || 'Cash'} {t.remarks ? `• ${t.remarks}` : ''}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#59171B] dark:text-[#FF927A] shrink-0">
                        {formatINR(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
