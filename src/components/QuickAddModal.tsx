import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, RotateCcw } from 'lucide-react';
import { Transaction, TransactionType, CreditCard, PaymentMethodItem } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getPaymentModes } from '../utils/categories';
import { getTodayDateString, getCurrentTimestampString } from '../utils/dateUtils';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  recentDescriptions?: string[];
  initialData?: Transaction | null;
  creditCards?: CreditCard[];
  paymentMethods?: PaymentMethodItem[];
}

export const QuickAddModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  recentDescriptions = [],
  initialData = null,
  creditCards = [],
  paymentMethods = [],
}) => {
  const [type, setType] = useState<TransactionType>('Expense');
  const [category, setCategory] = useState<string>('Dining out / Food Delivery');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [customPaymentMode, setCustomPaymentMode] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [remarks, setRemarks] = useState<string>('');
  const [error, setError] = useState<string>('');

  const paymentModes = useMemo(() => getPaymentModes(creditCards, paymentMethods), [creditCards, paymentMethods]);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setCategory(initialData.category);
      setDescription(initialData.description || '');
      setAmount(initialData.amount ? initialData.amount.toString() : '');
      setPaymentMode(initialData.paymentMode || 'UPI');
      setDate(initialData.date || getTodayDateString());
      setRemarks(initialData.remarks || '');
    } else {
      handleClear();
    }
  }, [initialData, isOpen]);

  const handleClear = () => {
    setType('Expense');
    setCategory('Dining out / Food Delivery');
    setCustomCategory('');
    setDescription('');
    setAmount('');
    setPaymentMode('UPI');
    setCustomPaymentMode('');
    setDate(getTodayDateString());
    setRemarks('');
    setError('');
  };

  const categories = type === 'Expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'Expense') {
      setCategory('Dining out / Food Delivery');
    } else {
      setCategory('Salary');
    }
  };

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const finalCategory = category === 'Other' && customCategory.trim() ? customCategory.trim() : category;
    const finalPaymentMode = paymentMode === 'Other' && customPaymentMode.trim() ? customPaymentMode.trim() : paymentMode;

    onSave({
      type,
      category: finalCategory,
      description: description.trim(),
      amount: numAmount,
      paymentMode: finalPaymentMode,
      date: date || getTodayDateString(),
      timestamp: initialData?.timestamp || getCurrentTimestampString(),
      remarks: remarks.trim(),
    });

    handleClear();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 transition-all animate-fadeIn">
      <div 
        className="w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-white dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#FED7B8] dark:border-[#363B44] flex items-center justify-between bg-white dark:bg-[#1B1E22] sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF6448]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {initialData ? 'Edit Entry' : 'Budgeting Form'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#363C3A] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Type Toggle (Expense / Income) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Expense / Income <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-[#17191C] rounded-2xl border border-[#FED7B8] dark:border-[#363B44]">
              <button
                type="button"
                onClick={() => handleTypeChange('Expense')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'Expense'
                    ? 'bg-[#EF6448] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>Expense</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('Income')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'Income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>Income</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 text-xl font-bold">
                ₹
              </div>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError('');
                }}
                className="w-full bg-slate-50 dark:bg-[#17191C] border border-[#FED7B8] dark:border-[#363B44] focus:border-[#EF6448] rounded-2xl pl-9 pr-4 py-3 text-2xl font-black text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
              />
            </div>
            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-xs">
              {[50, 100, 200, 500, 1000, 2000].map((quickVal) => (
                <button
                  key={quickVal}
                  type="button"
                  onClick={() => handleQuickAmount(quickVal)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#17191C] hover:bg-slate-200 dark:hover:bg-[#272B2A] text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap border border-[#FED7B8] dark:border-[#363B44] transition-colors text-[11px] cursor-pointer"
                >
                  +{quickVal}
                </button>
              ))}
            </div>
          </div>

          {/* Category Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {type} Category <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 truncate max-w-[180px]">{category}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
              {categories.map((c) => {
                const isSelected = category === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCategory(c.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#EF6448] text-white border-[#EF6448] font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-[#17191C] border-[#FED7B8] dark:border-[#363B44] hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${c.color}20`, color: c.color }}
                    >
                      <CategoryIcon name={c.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
            {category === 'Other' && (
              <input
                type="text"
                placeholder="Specify other category..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="mt-2 w-full bg-white dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] focus:border-[#EF6448] focus:ring-1 focus:ring-[#EF6448] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] placeholder-slate-400 focus:outline-none"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Chai, Groceries, Rent, Salary..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] focus:border-[#EF6448] focus:ring-1 focus:ring-[#EF6448] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-[#F2F3F5] placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>
            {/* Suggestions */}
            {recentDescriptions.length > 0 && !description && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {recentDescriptions.slice(0, 5).map((desc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDescription(desc)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1B1E22] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-[#FED7B8] dark:border-[#363B44] hover:border-[#EF6448] cursor-pointer"
                  >
                    {desc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Mode (Dynamically includes added cards, removes deleted cards) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Payment Mode <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 truncate max-w-[200px]">{paymentMode}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {paymentModes.map((pm) => {
                const isSelected = paymentMode === pm.name;
                return (
                  <button
                    key={pm.name}
                    type="button"
                    onClick={() => setPaymentMode(pm.name)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EF6448] text-white font-bold border-[#EF6448] shadow-sm'
                        : 'bg-white dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] text-slate-700 dark:text-slate-300 hover:border-[#EF6448]/50'
                    }`}
                  >
                    <CategoryIcon name={pm.icon} className="w-3.5 h-3.5" />
                    <span>{pm.name.replace('Credit Card - ', 'CC: ')}</span>
                  </button>
                );
              })}
            </div>
            {paymentMode === 'Other' && (
              <input
                type="text"
                placeholder="Specify other payment mode..."
                value={customPaymentMode}
                onChange={(e) => setCustomPaymentMode(e.target.value)}
                className="mt-2 w-full bg-white dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] focus:border-[#EF6448] focus:ring-1 focus:ring-[#EF6448] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] placeholder-slate-400 focus:outline-none"
              />
            )}
          </div>

          {/* Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Date (Defaults to Today)
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDate(getTodayDateString())}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1B1E22] text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Today
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] focus:border-[#EF6448] focus:ring-1 focus:ring-[#EF6448] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-[#F2F3F5] focus:outline-none accent-[#EF6448] [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* Remarks / Custom Labels */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Remarks (Custom tags / notes)
            </label>
            <input
              type="text"
              placeholder="e.g. Coupon worked, Split with roommate, Bill #..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-white dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] focus:border-[#EF6448] focus:ring-1 focus:ring-[#EF6448] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-[#F2F3F5] placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#FED7B8] dark:border-[#363B44]">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2.5 rounded-xl border border-[#FED7B8] dark:border-[#363B44] hover:bg-slate-100 dark:hover:bg-[#363C3A] text-slate-600 dark:text-slate-400 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Form</span>
            </button>

            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{initialData ? 'Update Entry' : 'Submit Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
