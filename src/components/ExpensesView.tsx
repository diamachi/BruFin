import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  X,
  Clock,
  Zap,
  Plus,
  CheckCircle2,
  Receipt,
  Repeat,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Transaction, CreditCard, PaymentMethodItem, RecurringPayment } from '../types';
import { formatINR, formatDateLabel, formatMonthYear, getTodayDateString, getCurrentMonthKey } from '../utils/dateUtils';
import { getCategoryMeta, EXPENSE_CATEGORIES, getPaymentModes } from '../utils/categories';
import { getRecurringPaymentStatuses } from '../utils/storage';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  transactions: Transaction[];
  recurringPayments: RecurringPayment[];
  selectedMonth: string;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenQuickAdd: () => void;
  onOpenAddRecurring: () => void;
  onPostRecurring: (rec: RecurringPayment) => void;
  onPostAllDueRecurring: () => void;
  creditCards?: CreditCard[];
  paymentMethods?: PaymentMethodItem[];
  onOpenHelp?: () => void;
}

export const ExpensesView: React.FC<Props> = ({
  transactions,
  recurringPayments,
  selectedMonth,
  onEditTransaction,
  onDeleteTransaction,
  onOpenQuickAdd,
  onOpenAddRecurring,
  onPostRecurring,
  onPostAllDueRecurring,
  creditCards = [],
  paymentMethods = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showAllRecurringRules, setShowAllRecurringRules] = useState(false);

  const activeMonthKey = selectedMonth === 'All'
    ? (transactions[0]?.date ? transactions[0].date.substring(0, 7) : getCurrentMonthKey())
    : selectedMonth;

  const paymentModes = useMemo(() => getPaymentModes(creditCards, paymentMethods), [creditCards, paymentMethods]);

  // Recurring bills status for this month
  const recurringStatuses = useMemo(() => {
    return getRecurringPaymentStatuses(recurringPayments, transactions, activeMonthKey);
  }, [recurringPayments, transactions, activeMonthKey]);

  // Pending recurring bills that have NOT been added yet this month
  const pendingRecurringBills = useMemo(() => {
    return recurringStatuses.filter((s) => s.isActive && !s.isPaid);
  }, [recurringStatuses]);

  const totalPendingAmount = useMemo(() => {
    return pendingRecurringBills.reduce((sum, s) => sum + s.recurring.amount, 0);
  }, [pendingRecurringBills]);

  // Filtered expense transactions only
  const expenseTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Must be an Expense
      if (t.type !== 'Expense') return false;

      // Month filter
      if (selectedMonth !== 'All' && (!t.date || !t.date.startsWith(selectedMonth))) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'All' && t.category !== categoryFilter) {
        return false;
      }

      // Payment mode filter
      if (paymentModeFilter !== 'All' && t.paymentMode !== paymentModeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = (t.description || '').toLowerCase().includes(query);
        const catMatch = (t.category || '').toLowerCase().includes(query);
        const modeMatch = (t.paymentMode || '').toLowerCase().includes(query);
        const remMatch = (t.remarks || '').toLowerCase().includes(query);
        const dateMatch = (t.date || '').includes(query);
        if (!descMatch && !catMatch && !modeMatch && !remMatch && !dateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedMonth, categoryFilter, paymentModeFilter, searchQuery]);

  // Aggregate stats
  const totalExpenseAmount = useMemo(() => {
    return expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [expenseTransactions]);

  // Compute days in period & days elapsed for accurate daily average
  const { daysElapsed } = useMemo(() => {
    const today = new Date();
    if (selectedMonth === 'All') {
      const dates = new Set(expenseTransactions.map((t) => t.date));
      const count = Math.max(1, dates.size);
      return { daysElapsed: count };
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(y, m, 0).getDate();
    const isCurrent = today.getFullYear() === y && today.getMonth() + 1 === m;
    const elapsed = isCurrent ? Math.min(today.getDate(), totalDays) : totalDays;
    return {
      daysElapsed: Math.max(1, elapsed),
    };
  }, [selectedMonth, expenseTransactions]);

  const avgDailyTotal = Math.round(totalExpenseAmount / daysElapsed);

  // Sorted expenses newest first
  const sortedExpenses = useMemo(() => {
    return [...expenseTransactions].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });
  }, [expenseTransactions]);

  // Group sorted expenses by date with daily totals
  const groupedByDate = useMemo(() => {
    const groups: { dateKey: string; items: Transaction[]; total: number }[] = [];
    const map = new Map<string, Transaction[]>();

    sortedExpenses.forEach((t) => {
      const key = t.date || 'Unknown Date';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(t);
    });

    map.forEach((items, dateKey) => {
      const total = items.reduce((sum, t) => sum + t.amount, 0);
      groups.push({ dateKey, items, total });
    });

    return groups;
  }, [sortedExpenses]);

  const formatDateHeader = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unknown Date') return 'Other Expenses';
    const today = getTodayDateString();
    if (dateStr === today) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yStr) return 'Yesterday';
    return formatDateLabel(dateStr);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Page Header & Stats Banner (Zero clutter, no redundant add/help buttons) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#22252A] border border-[#FED7B8] dark:border-[#363B44] shadow-sm transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 text-slate-500 dark:text-[#A5ACB7] text-[11px] font-semibold uppercase tracking-wider">
              <Receipt className="w-3.5 h-3.5 text-[#EF6448] shrink-0" />
              <span className="truncate">Expenses • {selectedMonth === 'All' ? 'All Time' : formatMonthYear(selectedMonth)}</span>
            </div>
            <p className="text-2xl font-black text-[#EF6448] mt-1 tracking-tight">
              {formatINR(totalExpenseAmount)}
            </p>
          </div>
        </div>

        {/* Sub-bar with clean stats */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#FED7B8]/40 dark:border-[#363B44]/60 text-xs">
          <span className="text-[11px] text-slate-500 dark:text-[#A5ACB7]">
            {expenseTransactions.length} {expenseTransactions.length === 1 ? 'transaction' : 'transactions'}
          </span>
          <span className="text-slate-300 dark:text-[#4A5250]">•</span>
          <span className="text-[11px] font-bold text-slate-700 dark:text-[#F2F3F5]">
            Avg: <strong className="text-[#EF6448]">~{formatINR(avgDailyTotal)}</strong>/day
          </span>
        </div>
      </div>

      {/* 2. RECURRING BILLS CARD: Shows unposted bills at the start of month, disappears when added */}
      {pendingRecurringBills.length > 0 ? (
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#FFF8F3] via-white to-[#FDF2E9] dark:from-[#272B2A] dark:via-[#202328] dark:to-[#1C1F1E] border-2 border-[#FED7B8] dark:border-[#363B44] shadow-md space-y-3.5 animate-fadeIn">
          {/* Card Header: Single row, clean title with count, zero clutter */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-[#EF6448] flex items-center justify-center text-white shrink-0">
                <Clock className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F2F3F5] leading-tight truncate">
                    Recurring Bills Due
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EF6448]/15 text-[#EF6448] shrink-0">
                    {pendingRecurringBills.length}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#A5ACB7] mt-0.5 truncate">
                  Total due: <strong className="text-slate-800 dark:text-[#F2F3F5] font-bold">{formatINR(totalPendingAmount)}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onPostAllDueRecurring}
              className="px-3 py-1.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-[11px] font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
              title="Post all due recurring bills to this month's expenses"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Post All</span>
            </button>
          </div>

          {/* Pending Bills List: Tap "+ Add" and it disappears from this list! */}
          <div className="space-y-2">
            {pendingRecurringBills.map(({ recurring: r }) => (
              <div
                key={r.id}
                className="p-3 rounded-2xl bg-white dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] shadow-sm flex items-center justify-between gap-2 transition-all hover:border-[#EF6448]/50"
              >
                <div className="min-w-0 flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF8F3] dark:bg-[#22252A] flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 border border-[#FED7B8]/60 dark:border-[#363B44]">
                    <CategoryIcon name={getCategoryMeta(r.category).icon} className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {r.name}
                      </h4>
                      {r.dueDay && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold shrink-0">
                          Due {r.dueDay}th
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {r.paymentMode.replace('Credit Card - ', 'CC: ')} • {r.validTill || 'Recurring'}
                    </p>
                  </div>
                </div>

                {/* Amount and High-Contrast Add Button */}
                <div className="flex items-center space-x-2.5 shrink-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {formatINR(r.amount)}
                  </span>
                  <button
                    onClick={() => onPostRecurring(r)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-[11px] font-black shadow-sm flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                    title="Add this bill to expenses"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="text-[10px]">Bills disappear from here as soon as you add them.</span>
            <button
              onClick={onOpenAddRecurring}
              className="text-[#EF6448] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add New Rule</span>
            </button>
          </div>
        </div>
      ) : (
        /* When all bills are posted or none due, show a clean, subtle bar with manage rules toggle */
        <div className="p-3 rounded-2xl bg-white dark:bg-[#22252A] border border-[#FED7B8] dark:border-[#363B44] shadow-sm flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {recurringPayments.length > 0
                ? `All ${recurringPayments.length} monthly recurring bills recorded for ${formatMonthYear(activeMonthKey)}`
                : 'No recurring bills tracked yet'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {recurringPayments.length > 0 && (
              <button
                onClick={() => setShowAllRecurringRules(!showAllRecurringRules)}
                className="px-2 py-1 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1C1F1E] flex items-center gap-1 cursor-pointer"
              >
                <span>{showAllRecurringRules ? 'Hide Rules' : 'View Rules'}</span>
                {showAllRecurringRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            <button
              onClick={onOpenAddRecurring}
              className="px-2.5 py-1 rounded-xl bg-[#FFF8F3] dark:bg-[#1B1E22] text-[#EF6448] border border-[#FED7B8] dark:border-[#363B44] hover:bg-[#FED7B8]/30 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ New Bill</span>
            </button>
          </div>
        </div>
      )}

      {/* Collapsible View of All Configured Recurring Rules */}
      {showAllRecurringRules && recurringPayments.length > 0 && (
        <div className="p-4 rounded-3xl bg-white dark:bg-[#22252A] border border-[#FED7B8] dark:border-[#363B44] shadow-sm space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#FED7B8]/40 dark:border-[#363B44] pb-2">
            <span className="text-xs font-bold text-[#EF6448] flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              <span>All Active Recurring Rules ({recurringPayments.length})</span>
            </span>
            <button
              onClick={onOpenAddRecurring}
              className="text-[10px] font-bold text-[#EF6448] hover:underline cursor-pointer"
            >
              + Add Bill
            </button>
          </div>

          <div className="space-y-1.5">
            {recurringStatuses.map(({ recurring: r, isPaid, isActive }) => (
              <div
                key={r.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1B1E22] border border-[#FED7B8]/50 dark:border-[#363B44] flex items-center justify-between text-xs"
              >
                <div className="truncate pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{r.name}</span>
                    {!isActive ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">Inactive</span>
                    ) : isPaid ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-bold">
                        ✓ Recorded this month
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 font-bold">
                        Due
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {r.validTill} • Due on {r.dueDay || '5'}th via {r.paymentMode.replace('Credit Card - ', 'CC: ')}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900 dark:text-white">{formatINR(r.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Search and Category Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search expenses by title, category, payment mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#22252A] border border-[#FED7B8] dark:border-[#363B44] rounded-2xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EF6448] shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-2xl border transition-all cursor-pointer ${
              showFilters || categoryFilter !== 'All' || paymentModeFilter !== 'All'
                ? 'bg-[#EF6448] text-white border-[#EF6448]'
                : 'bg-white dark:bg-[#22252A] text-slate-600 dark:text-slate-400 border-[#FED7B8] dark:border-[#363B44]'
            }`}
            title="Filter options"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Dropdowns */}
        {showFilters && (
          <div className="p-3 rounded-2xl bg-white dark:bg-[#22252A] border border-[#FED7B8] dark:border-[#363B44] shadow-sm space-y-2.5 animate-fadeIn text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentModeFilter}
                  onChange={(e) => setPaymentModeFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="All">All Payment Modes</option>
                  {paymentModes.map((pm) => (
                    <option key={pm.name} value={pm.name}>{pm.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {(categoryFilter !== 'All' || paymentModeFilter !== 'All') && (
              <button
                onClick={() => {
                  setCategoryFilter('All');
                  setPaymentModeFilter('All');
                }}
                className="text-[11px] font-bold text-[#EF6448] hover:underline block ml-auto cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Complete Scrollable Expense List (Grouped by Date, Minimal Cards) */}
      <div className="space-y-4">
        {groupedByDate.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-[#22252A] border border-[#FED7B8] dark:border-[#363B44] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FFF8F3] dark:bg-[#1B1E22] flex items-center justify-center mx-auto text-[#EF6448]">
              <Receipt className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No expenses found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {searchQuery || categoryFilter !== 'All' || paymentModeFilter !== 'All'
                  ? 'Try clearing the search or category filter.'
                  : 'Tap the + button below to add an expense.'}
              </p>
            </div>
          </div>
        ) : (
          groupedByDate.map(({ dateKey, items, total }) => (
            <div key={dateKey} className="space-y-1.5">
              {/* Clean Date Header with Day Total */}
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                  {formatDateHeader(dateKey)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  {items.length} {items.length === 1 ? 'item' : 'items'} • {formatINR(total)}
                </span>
              </div>

              {/* Minimal Expense Cards */}
              <div className="space-y-1.5">
                {items.map((t) => {
                  const meta = getCategoryMeta(t.category);
                  return (
                    <div
                      key={t.id}
                      onClick={() => onEditTransaction(t)}
                      className="p-3 rounded-2xl bg-white dark:bg-[#22252A] border border-[#FED7B8]/70 dark:border-[#363B44] shadow-xs flex items-center justify-between gap-3 transition-all hover:border-[#EF6448]/50 cursor-pointer active:scale-[0.99]"
                    >
                      {/* Left: Category Icon with subtle color tint + Clean Title & Meta */}
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5"
                          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                        >
                          <CategoryIcon name={meta.icon} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F2F3F5] truncate leading-tight">
                            {t.description || t.category}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-[#A5ACB7] mt-0.5 truncate">
                            {t.category} • {t.paymentMode.replace('Credit Card - ', 'CC: ')}
                          </p>
                        </div>
                      </div>

                      {/* Right: Bold Amount + Minimal Delete Action */}
                      <div className="flex items-center space-x-2.5 shrink-0">
                        <span className="text-xs sm:text-sm font-black text-[#EF6448]">
                          -{formatINR(t.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTransaction(t.id);
                          }}
                          className="p-1 rounded-lg text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
