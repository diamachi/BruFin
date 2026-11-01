import React, { useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Wallet,
  Check,
  Plus,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Banknote,
  Landmark,
  Edit2,
} from 'lucide-react';
import { Transaction, RecurringPayment, CreditCard, BankAccount, MonthlyAccountBalance } from '../types';
import { formatINR, getGreetingMessage, formatDateLabel, formatMonthYear } from '../utils/dateUtils';
import { getCategoryMeta } from '../utils/categories';
import { getRecurringPaymentStatuses, getUnifiedMonthlyBalance } from '../utils/storage';
import { CategoryIcon } from './CategoryIcon';
import { ExpenseDistributionCard } from './ExpenseDistributionCard';

interface Props {
  transactions: Transaction[];
  monthlyTarget: number;
  recurringPayments?: RecurringPayment[];
  creditCards: CreditCard[];
  bankAccounts?: BankAccount[];
  monthlyBalances?: MonthlyAccountBalance[];
  selectedMonth: string; // YYYY-MM or 'All'
  onNavigateToTransactions: () => void;
  onNavigateToIncome: () => void;
  onNavigateToCards: () => void;
  onNavigateToLoans?: () => void;
  onNavigateToBalances?: () => void;
  onOpenQuickAdd: () => void;
  onOpenUpdateBalance?: (monthKey: string) => void;
  onOpenAddRecurring?: () => void;
  onPostRecurring?: (rec: RecurringPayment) => void;
  onPostAllDueRecurring?: () => void;
  onOpenHelp?: () => void;
}

export const DashboardView: React.FC<Props> = ({
  transactions,
  monthlyTarget,
  recurringPayments = [],
  creditCards,
  bankAccounts = [],
  monthlyBalances = [],
  selectedMonth,
  onNavigateToTransactions,
  onNavigateToIncome,
  onNavigateToCards,
  onNavigateToLoans,
  onNavigateToBalances,
  onOpenQuickAdd,
  onOpenUpdateBalance,
  onOpenAddRecurring,
  onPostRecurring,
  onPostAllDueRecurring,
  onOpenHelp,
}) => {
  const greeting = getGreetingMessage();

  const activeMonthKey = selectedMonth === 'All'
    ? (transactions[0]?.date ? transactions[0].date.substring(0, 7) : new Date().toISOString().substring(0, 7))
    : selectedMonth;

  const currentMonthTransactions = transactions.filter(
    (t) => t.date && t.date.startsWith(activeMonthKey)
  );

  const totalExpense = currentMonthTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpense;
  const remainingBudget = monthlyTarget - totalExpense;
  const isBudgetOvershot = remainingBudget < 0;
  const targetSpentPercent = Math.min(100, Math.round((totalExpense / (monthlyTarget || 1)) * 100));

  // Credit card spending for the month
  const ccSpending = currentMonthTransactions
    .filter((t) => t.type === 'Expense' && t.paymentMode.toLowerCase().includes('credit card'))
    .reduce((sum, t) => sum + t.amount, 0);

  // Recurring payments status for current active month
  const recurringStatuses = getRecurringPaymentStatuses(recurringPayments, transactions, activeMonthKey);
  const dueRecurringCount = recurringStatuses.filter((s) => !s.isPaid).length;
  const recurringTotal = recurringPayments.reduce((sum, r) => sum + r.amount, 0);

  // Unified Bank & Cash Balance for active month (single total balance)
  const unifiedBal = useMemo(() => {
    return getUnifiedMonthlyBalance(monthlyBalances, activeMonthKey);
  }, [monthlyBalances, activeMonthKey]);

  const unifiedDiff = unifiedBal.endBalance - unifiedBal.startBalance;
  const currentLiquidDisplay = unifiedBal.endBalance > 0
    ? unifiedBal.endBalance
    : (unifiedBal.startBalance > 0 ? unifiedBal.startBalance : 0);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Greeting & EOM Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] shadow-sm flex items-center justify-between gap-3 transition-colors">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-[#A0A8A5] text-[11px] font-semibold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Monitor • {greeting.dateText}</span>
          </div>
          <p className="text-slate-900 dark:text-[#F4F6F5] text-sm sm:text-base font-bold truncate">
            {greeting.daysLeft === 0 ? "Today is month end!" : `${greeting.daysLeft} more days to EOM`}
          </p>
        </div>
        <div className="flex items-center space-x-3 text-right shrink-0">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-[#A0A8A5] block uppercase font-bold">Target</span>
            <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200">{formatINR(monthlyTarget)}</span>
          </div>
        </div>
      </div>

      {/* 2. Budget Health Card with Direct Link to Expenses Page */}
      <div className={`p-5 rounded-3xl border transition-all shadow-sm dark:shadow-xl ${
        isBudgetOvershot
          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
          : 'bg-white dark:bg-[#272B2A] border-[#FED7B8] dark:border-[#363C3A]'
      }`}>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A0A8A5]">
            Monthly Target Status
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${
            isBudgetOvershot
              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'
              : 'bg-[#FDF4E7] dark:bg-[#EF6448]/15 text-[#996520] dark:text-[#EF6448] border-[#F5DEBE] dark:border-[#EF6448]/30'
          }`}>
            {isBudgetOvershot ? (
              <>
                <AlertCircle className="w-3 h-3" />
                <span>Overshot</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>On Track</span>
              </>
            )}
          </span>
        </div>

        {/* Dynamic Status Message */}
        <div className="mb-4">
          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isBudgetOvershot ? 'text-rose-700 dark:text-rose-400' : 'text-[#996520] dark:text-[#EF6448]'
          }`}>
            {isBudgetOvershot
              ? `Overshot by ${formatINR(Math.abs(remainingBudget))}`
              : `Free to spend ${formatINR(remainingBudget)}`}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isBudgetOvershot
              ? `Spending exceeded monthly target of ${formatINR(monthlyTarget)}.`
              : `${formatINR(remainingBudget)} remaining of ${formatINR(monthlyTarget)} target.`}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 mb-5">
          <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <button
              onClick={onNavigateToTransactions}
              className="hover:text-slate-900 dark:hover:text-white underline decoration-slate-400/50 underline-offset-2 flex items-center gap-1 transition-colors"
            >
              <span>Spent: {formatINR(totalExpense)}</span>
              <ArrowRight className="w-3 h-3 inline" />
            </button>
            <span>{targetSpentPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-[#1C1F1E] rounded-full overflow-hidden p-0.5 border border-[#FED7B8] dark:border-[#363C3A]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                targetSpentPercent > 100
                  ? 'bg-rose-500 dark:bg-rose-400'
                  : targetSpentPercent > 80
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-[#B87B2E] dark:bg-[#EF6448]'
              }`}
              style={{ width: `${Math.min(100, targetSpentPercent)}%` }}
            />
          </div>
        </div>

        {/* Quick Navigate Buttons: Expenses & Income */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-[#363C3A]">
          <button
            onClick={onNavigateToTransactions}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1C1F1E] hover:bg-slate-100 dark:hover:bg-[#363C3A]/60 border border-[#FED7B8] dark:border-[#363C3A] flex items-center justify-between text-left transition-all group"
          >
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3 text-rose-500" /> Expenses
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">{formatINR(totalExpense)}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors" />
          </button>

          <button
            onClick={onNavigateToIncome}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1C1F1E] hover:bg-slate-100 dark:hover:bg-[#363C3A]/60 border border-[#FED7B8] dark:border-[#363C3A] flex items-center justify-between text-left transition-all group"
          >
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-[#996520] dark:text-[#EF6448]" /> Income
              </span>
              <span className="text-xs font-extrabold text-[#996520] dark:text-[#EF6448] block mt-0.5">{formatINR(totalIncome)}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* 3. Dedicated Income Card */}
      <div
        onClick={onNavigateToIncome}
        className="p-4 rounded-3xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all shadow-sm flex items-center justify-between group"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#FDF4E7] dark:bg-[#EF6448]/15 text-[#996520] dark:text-[#EF6448] flex items-center justify-center border border-[#F5DEBE] dark:border-[#EF6448]/30">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-[#996520] dark:group-hover:text-[#EF6448] transition-colors">
              Income Stream Overview
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Salary, refunds, dividends & earnings
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-base font-black text-[#996520] dark:text-[#EF6448]">{formatINR(totalIncome)}</span>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* 4. Unified Expense Distribution (Monthly, Day-wise, Specific Date) */}
      <ExpenseDistributionCard
        transactions={transactions}
        selectedMonth={selectedMonth}
        onNavigateToExpenses={onNavigateToTransactions}
      />

      {/* 6. Unified Bank & Cash Balances Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#EF6448] flex items-center justify-center text-white shadow-sm shrink-0">
              <Landmark className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-black text-slate-800 dark:text-white tracking-tight">
                  Bank & Cash Balance
                </h3>
                {unifiedBal.exists && unifiedDiff !== 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    unifiedDiff >= 0
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                  }`}>
                    {unifiedDiff >= 0 ? `+${formatINR(unifiedDiff)}` : `-${formatINR(Math.abs(unifiedDiff))}`}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {selectedMonth === 'All' ? 'Latest recorded month' : formatMonthYear(activeMonthKey)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-black text-[#EF6448] block">
              {formatINR(currentLiquidDisplay)}
            </span>
            <span className="text-[9px] text-slate-400">Total Liquid</span>
          </div>
        </div>

        {/* 2-Column Start & End Balance Display */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1C1F1E] border border-[#FED7B8]/60 dark:border-[#363C3A]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Starting (1st of month)
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {unifiedBal.startBalance > 0 ? formatINR(unifiedBal.startBalance) : '₹0 (Unset)'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1C1F1E] border border-[#FED7B8]/60 dark:border-[#363C3A]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ending / Current
              </span>
              {unifiedDiff !== 0 && (
                <span className={`text-[9px] font-bold ${unifiedDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {unifiedDiff >= 0 ? `+${formatINR(unifiedDiff)}` : `-${formatINR(Math.abs(unifiedDiff))}`}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {unifiedBal.endBalance > 0 ? formatINR(unifiedBal.endBalance) : (unifiedBal.startBalance > 0 ? formatINR(unifiedBal.startBalance) : '₹0 (Unset)')}
            </span>
          </div>
        </div>

        {unifiedBal.notes && (
          <p className="text-[10px] text-slate-400 italic px-1">
            "{unifiedBal.notes}"
          </p>
        )}

        {/* Action Button & History Link */}
        <div className="flex items-center justify-between pt-1">
          {onNavigateToBalances ? (
            <button
              onClick={onNavigateToBalances}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <span>Balance History</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <span />
          )}

          {onOpenUpdateBalance && (
            <button
              onClick={() => onOpenUpdateBalance(activeMonthKey)}
              className="px-3 py-1.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-[11px] font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Edit2 className="w-3 h-3 stroke-[2.5]" />
              <span>Update Balance</span>
            </button>
          )}
        </div>
      </div>

      {/* 7. Quick Portfolio Teasers (Cards & Loans) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Credit Card Quick Teaser */}
        <div
          onClick={onNavigateToCards}
          className="p-4 rounded-2xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1C1F1E] text-slate-700 dark:text-slate-300 flex items-center justify-center border border-[#FED7B8] dark:border-[#363C3A]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-white">Credit Cards</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{creditCards.length} cards tracked</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{formatINR(ccSpending)}</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Loans & Liabilities Teaser */}
        {onNavigateToLoans && (
          <div
            onClick={onNavigateToLoans}
            className="p-4 rounded-2xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800/40">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Loans & Debt</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Payoff Predictor</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Schedule</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
