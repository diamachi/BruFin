import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Calculator, CalendarClock, Repeat } from 'lucide-react';
import { RecurringPayment, CreditCard, PaymentMethodItem } from '../types';
import { EXPENSE_CATEGORIES, getPaymentModes } from '../utils/categories';
import { formatINR, getCurrentMonthKey } from '../utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: RecurringPayment) => void;
  initialData?: RecurringPayment | null;
  creditCards?: CreditCard[];
  paymentMethods?: PaymentMethodItem[];
}

export const AddRecurringModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  creditCards = [],
  paymentMethods = [],
}) => {
  // Mode: 'monthly' (Fixed amount every month) or 'total_split' (Total amount / N months)
  const [billingMode, setBillingMode] = useState<'monthly' | 'total_split'>(
    initialData?.billingType || (initialData?.totalAmount ? 'total_split' : 'monthly')
  );

  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || 'Subscriptions');
  const [monthlyAmount, setMonthlyAmount] = useState(initialData?.amount ? initialData.amount.toString() : '');
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount ? initialData.totalAmount.toString() : '');
  const [durationMonths, setDurationMonths] = useState(initialData?.durationMonths ? initialData.durationMonths.toString() : '6');
  const [isOngoing, setIsOngoing] = useState(!initialData?.durationMonths && (!initialData?.validTill || initialData?.validTill.toLowerCase() === 'ongoing'));
  const [paymentMode, setPaymentMode] = useState(initialData?.paymentMode || 'UPI');
  const [dueDay, setDueDay] = useState(initialData?.dueDay ? initialData.dueDay.toString() : '5');
  const [error, setError] = useState('');

  // Sync when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCategory(initialData.category || 'Subscriptions');
      setMonthlyAmount(initialData.amount ? initialData.amount.toString() : '');
      setTotalAmount(initialData.totalAmount ? initialData.totalAmount.toString() : '');
      setDurationMonths(initialData.durationMonths ? initialData.durationMonths.toString() : '6');
      setIsOngoing(!initialData.durationMonths && (!initialData.validTill || initialData.validTill.toLowerCase() === 'ongoing'));
      setPaymentMode(initialData.paymentMode || 'UPI');
      setDueDay(initialData.dueDay ? initialData.dueDay.toString() : '5');
      setBillingMode(initialData.billingType || (initialData.totalAmount ? 'total_split' : 'monthly'));
    } else {
      setName('');
      setCategory('Subscriptions');
      setMonthlyAmount('');
      setTotalAmount('');
      setDurationMonths('6');
      setIsOngoing(true);
      setPaymentMode('UPI');
      setDueDay('5');
      setBillingMode('monthly');
      setError('');
    }
  }, [initialData, isOpen]);

  const paymentModes = useMemo(() => getPaymentModes(creditCards, paymentMethods), [creditCards, paymentMethods]);

  // Computed monthly amount based on mode
  const computedMonthly = useMemo(() => {
    if (billingMode === 'monthly') {
      return parseFloat(monthlyAmount) || 0;
    }
    const tot = parseFloat(totalAmount) || 0;
    const mos = parseInt(durationMonths) || 1;
    return mos > 0 ? Math.round(tot / mos) : 0;
  }, [billingMode, monthlyAmount, totalAmount, durationMonths]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a bill or subscription name (e.g. Netflix, Rent, Wifi)');
      return;
    }

    let finalMonthly = 0;
    let finalTotal: number | undefined;
    let finalMonths: number | undefined;
    let validityText = 'Ongoing';

    const currentYearMonth = getCurrentMonthKey();

    if (billingMode === 'total_split') {
      const tot = parseFloat(totalAmount);
      const mos = parseInt(durationMonths);
      if (isNaN(tot) || tot <= 0) {
        setError('Please enter a valid total amount');
        return;
      }
      if (isNaN(mos) || mos <= 0) {
        setError('Please enter the number of months (e.g. 6 or 12)');
        return;
      }
      finalTotal = tot;
      finalMonths = mos;
      finalMonthly = Math.round(tot / mos);
      validityText = `${mos} Mos (Split ₹${tot.toLocaleString('en-IN')})`;
    } else {
      const mo = parseFloat(monthlyAmount);
      if (isNaN(mo) || mo <= 0) {
        setError('Please enter a valid monthly bill amount');
        return;
      }
      finalMonthly = mo;
      if (!isOngoing) {
        const mos = parseInt(durationMonths) || 12;
        finalMonths = mos;
        validityText = `${mos} Months`;
      } else {
        validityText = 'Ongoing';
      }
    }

    onSave({
      id: initialData?.id || `rec_${Date.now()}`,
      name: name.trim(),
      category,
      amount: finalMonthly,
      totalAmount: finalTotal,
      durationMonths: finalMonths,
      billingType: billingMode,
      startMonth: initialData?.startMonth || currentYearMonth,
      validTill: validityText,
      frequency: 'Monthly',
      paymentMode,
      dueDay: parseInt(dueDay) || 5,
    });

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 flex items-center justify-center animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-3xl shadow-2xl p-5 space-y-4 max-h-[88vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E1DB] dark:border-[#363B44] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#59171B] dark:text-[#FF927A] flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-[#8C2735] dark:text-[#FF927A]" />
              <span>{initialData ? 'Edit Recurring Bill' : 'Add Monthly Recurring Bill'}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Shows as a one-tap card at the start of each month
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#363C3A]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* 1. Mode Selector: Monthly vs Split Total */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            How is this bill calculated?
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-[#22252A] rounded-2xl border border-[#E8E1DB]/40 dark:border-[#363B44]">
            <button
              type="button"
              onClick={() => setBillingMode('monthly')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                billingMode === 'monthly'
                  ? 'bg-white dark:bg-[#1B1E22] text-[#59171B] dark:text-[#FF927A] shadow-sm border border-[#E8E1DB] dark:border-[#363B44]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Fixed / Monthly</span>
            </button>
            <button
              type="button"
              onClick={() => setBillingMode('total_split')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                billingMode === 'total_split'
                  ? 'bg-white dark:bg-[#1B1E22] text-[#59171B] dark:text-[#FF927A] shadow-sm border border-[#E8E1DB] dark:border-[#363B44]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Total & Months</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Bill Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Bill / Subscription Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Netflix, House Rent, Gym, Wifi, Maid..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#EF6448]"
              required
            />
          </div>

          {/* Amount Inputs based on Mode */}
          {billingMode === 'monthly' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Monthly Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="1500"
                    value={monthlyAmount}
                    onChange={(e) => {
                      setMonthlyAmount(e.target.value);
                      setError('');
                    }}
                    className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-[#EF6448]"
                    required
                  />
                </div>
              </div>

              {/* Duration: Ongoing vs Months */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#1B1E22] rounded-xl border border-[#E8E1DB]/50 dark:border-[#363B44]">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ongoing-check"
                    checked={isOngoing}
                    onChange={(e) => setIsOngoing(e.target.checked)}
                    className="w-4 h-4 rounded text-[#EF6448] focus:ring-[#EF6448] border-[#E8E1DB]"
                  />
                  <label htmlFor="ongoing-check" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Ongoing indefinite bill (no end date)
                  </label>
                </div>
                {!isOngoing && (
                  <div className="flex items-center space-x-1 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      className="w-14 bg-white dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-lg px-2 py-1 text-xs text-center font-bold text-slate-900 dark:text-white"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">mos</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3 rounded-2xl bg-[#F7F6F3] dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44]">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Total Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      placeholder="60000"
                      value={totalAmount}
                      onChange={(e) => {
                        setTotalAmount(e.target.value);
                        setError('');
                      }}
                      className="w-full bg-white dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl pl-7 pr-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Split Across (Months) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="6"
                    value={durationMonths}
                    onChange={(e) => {
                      setDurationMonths(e.target.value);
                      setError('');
                    }}
                    className="w-full bg-white dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold text-center focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Calculated Monthly Banner */}
              <div className="p-2 rounded-xl bg-white/80 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Monthly Commitment:
                </span>
                <span className="text-xs font-black text-[#59171B] dark:text-[#FF927A]">
                  {formatINR(computedMonthly)} / month
                </span>
              </div>
            </div>
          )}

          {/* Due Day & Payment Mode */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Due Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="5"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
              />
              <div className="flex gap-1 mt-1">
                {[1, 5, 10, 15, 25].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDueDay(d.toString())}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                      dueDay === d.toString()
                        ? 'bg-[#EF6448] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-[#1B1E22] text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {d}th
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white font-medium focus:outline-none"
              >
                {paymentModes.map((pm) => (
                  <option key={pm.name} value={pm.name}>{pm.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white font-medium focus:outline-none"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Live Preview Card */}
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-[#1B1E22]/60 border border-amber-200/60 dark:border-[#363B44] flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-[10px] text-amber-800 dark:text-[#FF927A] font-bold uppercase block tracking-wider">
                Monthly Card Preview
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {name || 'Bill Name'} • Due on {dueDay || '5'}th
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Via {paymentMode} • {category}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-black text-[#59171B] dark:text-[#FF927A] block">
                {formatINR(computedMonthly)}
              </span>
              <span className="text-[9px] text-slate-400">per month</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{initialData ? 'Update Bill' : 'Save Recurring Bill'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
