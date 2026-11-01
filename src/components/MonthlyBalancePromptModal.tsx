import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Landmark, Calendar, Sparkles, TrendingUp, BellOff } from 'lucide-react';
import { MonthlyAccountBalance } from '../types';
import { formatINR, formatMonthYear } from '../utils/dateUtils';
import { getUnifiedMonthlyBalance, setDismissedBalancePrompt, setBalancePromptsEnabled } from '../utils/storage';

export type BalancePromptMode = 'start_of_month' | 'end_of_month' | 'manual_edit';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string; // YYYY-MM
  mode?: BalancePromptMode;
  monthlyBalances: MonthlyAccountBalance[];
  onSaveBalance: (monthKey: string, startBalance: number, endBalance: number, notes?: string) => void;
  onDisablePrompts?: () => void;
}

export const MonthlyBalancePromptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  monthKey,
  mode = 'manual_edit',
  monthlyBalances,
  onSaveBalance,
  onDisablePrompts,
}) => {
  const current = getUnifiedMonthlyBalance(monthlyBalances, monthKey);

  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStartInput(current.startBalance ? current.startBalance.toString() : '');
      setEndInput(current.endBalance ? current.endBalance.toString() : '');
      setNotes(current.notes || '');
      setError('');
    }
  }, [isOpen, monthKey, current.startBalance, current.endBalance, current.notes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseFloat(startInput) || 0;
    const end = parseFloat(endInput) || 0;

    if (s <= 0 && end <= 0) {
      setError('Please enter at least a starting or ending balance');
      return;
    }

    onSaveBalance(monthKey, s, end, notes.trim());

    // Mark prompt as answered/dismissed for this month
    if (mode === 'start_of_month') {
      setDismissedBalancePrompt(`prompt_start_${monthKey}`);
    } else if (mode === 'end_of_month') {
      setDismissedBalancePrompt(`prompt_end_${monthKey}`);
    }

    onClose();
  };

  const handleDismissLater = () => {
    if (mode === 'start_of_month') {
      setDismissedBalancePrompt(`prompt_start_${monthKey}`);
    } else if (mode === 'end_of_month') {
      setDismissedBalancePrompt(`prompt_end_${monthKey}`);
    }
    onClose();
  };

  const handleTurnOffFeature = () => {
    if (confirm('Turn off monthly start/end balance prompts? You can re-enable this anytime in Settings.')) {
      setBalancePromptsEnabled(false);
      if (onDisablePrompts) onDisablePrompts();
      onClose();
    }
  };

  const diff = (parseFloat(endInput) || 0) - (parseFloat(startInput) || 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fadeIn">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] rounded-3xl shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#FED7B8] dark:border-[#363B44] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EF6448] flex items-center justify-center text-white shadow-sm shrink-0">
              <Landmark className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#EF6448]">
                {mode === 'start_of_month'
                  ? 'Start of Month Balance Check-in ☕'
                  : mode === 'end_of_month'
                  ? 'End of Month Balance Check-in 📊'
                  : 'Update Total Liquid Balance'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {formatMonthYear(monthKey)} • Cash & bank accounts combined
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explanatory Banner for Auto-Prompts */}
        {mode !== 'manual_edit' && (
          <div className="p-3 rounded-2xl bg-[#FFF8F3] dark:bg-[#22252A] border border-[#FED7B8] dark:border-[#363B44] text-xs space-y-1">
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              {mode === 'start_of_month'
                ? `Welcome to ${formatMonthYear(monthKey)}! Log your total starting liquid cash across all bank accounts to track this month's savings growth.`
                : `Closing out ${formatMonthYear(monthKey)}! Enter your closing liquid balance to compute your net cash flow and savings.`}
            </p>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Starting Balance Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Starting Balance (1st of month)
              </label>
              {mode === 'start_of_month' && (
                <span className="text-[10px] font-bold text-[#EF6448]">
                  ★ Current Check-in
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                placeholder="e.g. 150000"
                value={startInput}
                onChange={(e) => {
                  setStartInput(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-[#EF6448]"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Sum of all bank account balances & wallet cash on day 1.
            </p>
          </div>

          {/* 2. Ending Balance Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Ending Balance (End of month)
              </label>
              {mode === 'end_of_month' && (
                <span className="text-[10px] font-bold text-[#EF6448]">
                  ★ Current Check-in
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                placeholder="e.g. 175000"
                value={endInput}
                onChange={(e) => {
                  setEndInput(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-[#EF6448]"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Current or final liquid balance at the close of the month.
            </p>
          </div>

          {/* Net Change Preview */}
          {parseFloat(startInput) > 0 && parseFloat(endInput) > 0 && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#FED7B8]/60 dark:border-[#363B44] flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Net Monthly Cash Flow:</span>
              <span className={`font-black ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {diff >= 0 ? `+${formatINR(diff)}` : `-${formatINR(Math.abs(diff))}`}
              </span>
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Salary credited, bonus, Diwali shopping"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between">
            {mode !== 'manual_edit' ? (
              <button
                type="button"
                onClick={handleTurnOffFeature}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
              >
                Disable prompts
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={mode !== 'manual_edit' ? handleDismissLater : onClose}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold cursor-pointer"
              >
                {mode !== 'manual_edit' ? 'Later' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Balance</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
