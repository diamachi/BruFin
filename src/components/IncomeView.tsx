import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  X,
  Plus,
  Coins,
  ArrowLeft,
} from 'lucide-react';
import { Transaction, CreditCard, PaymentMethodItem } from '../types';
import { formatINR, formatDateLabel } from '../utils/dateUtils';
import { getCategoryMeta, INCOME_CATEGORIES, getPaymentModes } from '../utils/categories';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  transactions: Transaction[];
  selectedMonth: string;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenQuickAdd: () => void;
  onBackToMonitor: () => void;
  creditCards?: CreditCard[];
  paymentMethods?: PaymentMethodItem[];
}

export const IncomeView: React.FC<Props> = ({
  transactions,
  selectedMonth,
  onEditTransaction,
  onDeleteTransaction,
  onOpenQuickAdd,
  onBackToMonitor,
  creditCards = [],
  paymentMethods = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const paymentModes = useMemo(() => getPaymentModes(creditCards, paymentMethods), [creditCards, paymentMethods]);

  // Income-only transactions
  const incomeTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === 'Income');
  }, [transactions]);

  // Filtered income transactions
  const filtered = useMemo(() => {
    return incomeTransactions.filter((t) => {
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
  }, [incomeTransactions, selectedMonth, categoryFilter, paymentModeFilter, searchQuery]);

  // Total Income
  const totalIncome = filtered.reduce((sum, t) => sum + t.amount, 0);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      const dateKey = t.date || 'Unknown Date';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filtered]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
  }, [groupedByDate]);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Header Overview Bar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onBackToMonitor}
              className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Monitor</span>
            </button>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF4E7] dark:bg-[#B84E3B]/15 text-[#996520] dark:text-[#FF927A] border border-[#F5DEBE] dark:border-[#EF6448]/30">
            {selectedMonth === 'All' ? 'All Time' : selectedMonth}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Inflows Received
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#996520] dark:text-[#FF927A] tracking-tight">
              +{formatINR(totalIncome)}
            </span>
          </div>
          <button
            onClick={onOpenQuickAdd}
            className="px-3.5 py-2 rounded-2xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search salary, cashbacks, refunds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] focus:border-slate-400 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-2xl border transition-colors flex items-center justify-center cursor-pointer ${
              showFilters || categoryFilter !== 'All' || paymentModeFilter !== 'All'
                ? 'bg-[#EF6448] text-white border-[#EF6448]'
                : 'bg-white dark:bg-[#22252A] border-[#E8E1DB] dark:border-[#363B44] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Filter Income"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Expandable Advanced Filters */}
        {showFilters && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] space-y-3 shadow-sm animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Income Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-2.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {INCOME_CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Received Via
                </label>
                <select
                  value={paymentModeFilter}
                  onChange={(e) => setPaymentModeFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-2.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="All">All Channels</option>
                  {paymentModes.map((pm) => (
                    <option key={pm.name} value={pm.name}>{pm.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setCategoryFilter('All');
                  setPaymentModeFilter('All');
                  setSearchQuery('');
                }}
                className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 font-medium"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Income Transaction List Grouped by Date */}
      {sortedDates.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] space-y-3">
          <Coins className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 text-xs">No income entries match your search filters.</p>
          <button
            onClick={onOpenQuickAdd}
            className="px-4 py-2 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            Add Income Entry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateStr) => {
            const items = groupedByDate[dateStr];
            const dayIncome = items.reduce((sum, t) => sum + t.amount, 0);

            return (
              <div key={dateStr} className="space-y-1.5">
                {/* Date Header */}
                <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>{formatDateLabel(dateStr)}</span>
                  <span className="text-[#996520] dark:text-[#FF927A]">+{formatINR(dayIncome)}</span>
                </div>

                {/* Date Items */}
                <div className="rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm overflow-hidden">
                  {items.map((t) => {
                    const meta = getCategoryMeta(t.category, true);

                    return (
                      <div
                        key={t.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#363C3A]/40 transition-colors group"
                      >
                        {/* Left: Icon & Details */}
                        <div className="flex items-center space-x-3 truncate mr-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                            style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                          >
                            <CategoryIcon name={meta.icon} className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {t.description || t.category}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                              <span className="font-medium text-[#996520] dark:text-[#FF927A]">{t.category}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#1B1E22] text-slate-700 dark:text-slate-300">
                                {t.paymentMode}
                              </span>
                              {t.remarks && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-500 dark:text-slate-400 italic truncate max-w-[140px]">
                                    "{t.remarks}"
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Actions */}
                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="text-sm sm:text-base font-black text-[#996520] dark:text-[#FF927A]">
                            +{formatINR(t.amount)}
                          </span>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditTransaction(t)}
                              title="Edit"
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#363C3A] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete income "${t.description || t.category}"?`)) {
                                  onDeleteTransaction(t.id);
                                }
                              }}
                              title="Delete"
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#363C3A] text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
