import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Smartphone,
  CreditCard,
  Banknote,
  Landmark,
  HelpCircle,
  Wallet,
  Cpu,
  Archive,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { RecurringPayment, PaymentMethodItem } from '../types';
import { formatINR } from '../utils/dateUtils';
import { exportDatabaseJSON, exportTransactionsCSV, APP_SCALE_PRESETS } from '../utils/storage';
import { DEFAULT_BASE_PAYMENT_MODES } from '../utils/categories';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  monthlyTarget: number;
  onUpdateTarget: (target: number) => void;
  recurringPayments: RecurringPayment[];
  onUpdateRecurring: (payments: RecurringPayment[]) => void;
  paymentMethods: PaymentMethodItem[];
  onUpdatePaymentMethods: (methods: PaymentMethodItem[]) => void;
  onImportJSON: (file: File) => void;
  onOpenArchiveImport: (file: File) => void;
  onResetData: () => void;
  isDemoMode?: boolean;
  onLoadDemoData?: () => void;
  onClearDemoData?: () => void;
  balancePromptsEnabled?: boolean;
  onToggleBalancePrompts?: (enabled: boolean) => void;
  diagnosticsEnabled?: boolean;
  onToggleDiagnostics?: (enabled: boolean) => void;
  onOpenDiagnostics?: () => void;
  appScale?: number;
  onUpdateAppScale?: (scale: number) => void;
}

const METHOD_ICON_OPTIONS = [
  { label: 'UPI / Digital', icon: 'Smartphone', type: 'digital' as const },
  { label: 'Card / Debit', icon: 'CreditCard', type: 'bank' as const },
  { label: 'Cash', icon: 'Banknote', type: 'cash' as const },
  { label: 'Bank / Net Banking', icon: 'Landmark', type: 'bank' as const },
  { label: 'Wallet', icon: 'Wallet', type: 'digital' as const },
  { label: 'Other', icon: 'HelpCircle', type: 'other' as const },
];

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  monthlyTarget,
  onUpdateTarget,
  recurringPayments,
  onUpdateRecurring,
  paymentMethods,
  onUpdatePaymentMethods,
  onImportJSON,
  onOpenArchiveImport,
  onResetData,
  isDemoMode = false,
  onLoadDemoData,
  onClearDemoData,
  balancePromptsEnabled = true,
  onToggleBalancePrompts,
  diagnosticsEnabled = true,
  onToggleDiagnostics,
  onOpenDiagnostics,
  appScale = 1.0,
  onUpdateAppScale,
}) => {
  const [targetInput, setTargetInput] = useState(monthlyTarget.toString());
  useEffect(() => {
    if (isOpen) setTargetInput(monthlyTarget.toString());
  }, [isOpen, monthlyTarget]);
  const [targetSaved, setTargetSaved] = useState(false);

  // New recurring payment form state
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recValidity, setRecValidity] = useState('');

  // Payment method form state
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodIcon, setNewMethodIcon] = useState('Smartphone');
  const [newMethodType, setNewMethodType] = useState<'digital' | 'bank' | 'cash' | 'credit' | 'other'>('digital');

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(targetInput);
    if (!isNaN(val) && val > 0) {
      onUpdateTarget(val);
      setTargetSaved(true);
      setTimeout(() => setTargetSaved(false), 2000);
    }
  };

  const handleAddRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(recAmount);
    if (!recName.trim() || isNaN(num) || num <= 0) return;

    const newRec: RecurringPayment = {
      id: `rec_${Date.now()}`,
      name: recName.trim(),
      category: 'Subscriptions',
      amount: num,
      validTill: recValidity.trim() || 'Active',
      frequency: 'Monthly',
      paymentMode: 'UPI',
    };

    onUpdateRecurring([...recurringPayments, newRec]);
    setRecName('');
    setRecAmount('');
    setRecValidity('');
    setShowAddRecurring(false);
  };

  const handleDeleteRecurring = (id: string) => {
    onUpdateRecurring(recurringPayments.filter((r) => r.id !== id));
  };

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newMethodName.trim();
    if (!cleanName) return;

    // Check duplicate
    if (paymentMethods.some((pm) => pm.name.toLowerCase() === cleanName.toLowerCase())) {
      alert('This payment method already exists');
      return;
    }

    const newMethod: PaymentMethodItem = {
      id: `pm_${Date.now()}`,
      name: cleanName,
      type: newMethodType,
      icon: newMethodIcon,
      isCustom: true,
    };

    onUpdatePaymentMethods([...paymentMethods, newMethod]);
    setNewMethodName('');
    setShowAddPaymentMethod(false);
  };

  const handleDeletePaymentMethod = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from payment options? It will no longer appear in the expenses and income logs.`)) {
      const updated = paymentMethods.filter((pm) => pm.id !== id);
      onUpdatePaymentMethods(updated);
    }
  };

  const handleResetDefaultPaymentMethods = () => {
    if (confirm('Reset payment methods back to the standard defaults (UPI, Debit Card, Cash, Net Banking, Other)?')) {
      onUpdatePaymentMethods(DEFAULT_BASE_PAYMENT_MODES);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSON(file);
    }
  };

  const handleHistoricalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onOpenArchiveImport(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 flex items-center justify-center animate-fadeIn">
      <div 
        className="w-full max-w-lg max-h-[88vh] my-auto bg-[#F7F6F3] dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-[#F2F3F5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E8E1DB] dark:border-[#363B44] flex items-center justify-between bg-[#F7F6F3] dark:bg-[#22252A]">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-[#EF6448]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-[#F2F3F5] tracking-tight">Settings & Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#363C3A] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. Monthly Expense Target */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
              Monthly Budget Target
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              The spending limit target for the month (defaults to ₹50,000 from Excel).
            </p>
            <form onSubmit={handleSaveTarget} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
              >
                {targetSaved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
                <span>{targetSaved ? 'Saved' : 'Save'}</span>
              </button>
            </form>
          </div>

          {/* Display & Text Size Scaling */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Type className="w-4 h-4 text-[#EF6448]" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
                  Display & Text Size
                </h3>
              </div>
              <span className="text-xs font-bold text-[#EF6448] bg-[#EF6448]/15 px-2 py-0.5 rounded-full border border-[#EF6448]/30">
                {Math.round(appScale * 100)}%
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Scale up buttons, text, and tap targets if the default interface is too small to read comfortably.
            </p>

            {/* Scale Segmented Presets */}
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-[#F7F6F3] dark:bg-[#1B1E22] rounded-xl border border-[#E8E1DB] dark:border-[#363B44]">
              {APP_SCALE_PRESETS.map((preset) => {
                const isSelected = Math.abs(appScale - preset.value) < 0.02;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onUpdateAppScale?.(preset.value)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EF6448] text-white font-bold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{preset.label}</div>
                    <div className="text-[9px] opacity-80 truncate">{preset.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Continuous Slider for Fine Tuning */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <ZoomOut className="w-3 h-3" /> Compact (85%)
                </span>
                <span className="flex items-center gap-1">
                  Larger (135%) <ZoomIn className="w-3 h-3" />
                </span>
              </div>
              <input
                type="range"
                min="0.85"
                max="1.35"
                step="0.05"
                value={appScale}
                onChange={(e) => onUpdateAppScale?.(parseFloat(e.target.value))}
                className="w-full accent-[#EF6448] cursor-pointer"
              />
            </div>

            {/* Quick Live Preview Box */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1B1E22] border border-dashed border-[#E8E1DB] dark:border-[#363B44] flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>☕ BruFin Preview</span>
                  <span className="text-[9px] font-normal px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Live
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  ₹17,153 Free to spend • 29 days left
                </div>
              </div>
              {Math.abs(appScale - 1.0) > 0.02 && (
                <button
                  type="button"
                  onClick={() => onUpdateAppScale?.(1.0)}
                  className="text-[10px] font-bold text-[#EF6448] hover:underline cursor-pointer"
                >
                  Reset (100%)
                </button>
              )}
            </div>
          </div>

          {/* Monthly Balance Check-in Prompts Toggle */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] flex items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <Landmark className="w-4 h-4 text-[#EF6448]" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
                  Monthly Balance Check-in Prompts
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Prompt at the start & end of every month to record your total liquid balance.
              </p>
            </div>
            {onToggleBalancePrompts && (
              <button
                type="button"
                onClick={() => onToggleBalancePrompts(!balancePromptsEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  balancePromptsEnabled ? 'bg-[#EF6448]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                title="Toggle monthly balance check-in prompts"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-[#1B1E22] shadow ring-0 transition duration-200 ease-in-out ${
                    balancePromptsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          </div>

          {/* Storage & RAM Live Monitor Toggle */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-[#EF6448]" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
                    Storage & RAM Monitor
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Shows live memory usage & storage quota at the top of the app to check for leaks.
                </p>
              </div>
              {onToggleDiagnostics && (
                <button
                  type="button"
                  onClick={() => onToggleDiagnostics(!diagnosticsEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    diagnosticsEnabled ? 'bg-[#EF6448]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  title="Toggle storage and RAM diagnostics bar"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-[#1B1E22] shadow ring-0 transition duration-200 ease-in-out ${
                      diagnosticsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              )}
            </div>

            {onOpenDiagnostics && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDiagnostics();
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#F7F6F3] dark:bg-[#1B1E22] hover:bg-slate-100 dark:hover:bg-[#363C3A] border border-[#E8E1DB] dark:border-[#363B44] text-slate-700 dark:text-[#F2F3F5] text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5 text-[#EF6448]" />
                <span>Open Storage & 1-Year Retention Center</span>
              </button>
            )}
          </div>

          {/* 2. Manage Pre-Existing Payment Methods */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
                  Payment Methods
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pre-existing channels (UPI, Cash, Sodexo, etc.). Credit cards are managed in Cards tab.
                </p>
              </div>
              <button
                onClick={() => setShowAddPaymentMethod(!showAddPaymentMethod)}
                className="text-xs text-[#EF6448] hover:opacity-80 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddPaymentMethod ? 'Cancel' : 'Add Method'}</span>
              </button>
            </div>

            {/* Inline Add Method Form */}
            {showAddPaymentMethod && (
              <form onSubmit={handleAddPaymentMethod} className="p-3.5 rounded-xl bg-[#F7F6F3] dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] space-y-3 animate-fadeIn">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Method Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sodexo Meal Card, Cheque, Forex Card..."
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                    className="w-full bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Icon Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {METHOD_ICON_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setNewMethodIcon(opt.icon);
                          setNewMethodType(opt.type);
                        }}
                        className={`p-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                          newMethodIcon === opt.icon
                            ? 'bg-[#EF6448] text-white border-[#EF6448] shadow-sm font-bold'
                            : 'bg-slate-50 dark:bg-[#1B1E22] border-[#E8E1DB] dark:border-[#363B44] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <CategoryIcon name={opt.icon} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Save Payment Method
                </button>
              </form>
            )}

            {/* List of active payment methods */}
            <div className="space-y-1.5 pt-1">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#1B1E22] text-slate-600 dark:text-slate-300 flex items-center justify-center">
                      <CategoryIcon name={pm.icon || 'CreditCard'} className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {pm.name}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {pm.type || 'Custom'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePaymentMethod(pm.id, pm.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title={`Remove ${pm.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleResetDefaultPaymentMethods}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Default Methods</span>
              </button>
            </div>
          </div>

          {/* 3. Manage Recurring Payments */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
                  Recurring Payments
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Fixed subscriptions & bills</p>
              </div>
              <button
                onClick={() => setShowAddRecurring(!showAddRecurring)}
                className="text-xs text-[#EF6448] hover:opacity-80 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddRecurring ? 'Cancel' : 'Add Bill'}</span>
              </button>
            </div>

            {showAddRecurring && (
              <form onSubmit={handleAddRecurring} className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] space-y-2 animate-fadeIn">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name (e.g. Netflix)"
                    value={recName}
                    onChange={(e) => setRecName(e.target.value)}
                    className="w-full bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    className="w-full bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Validity (e.g. Till Dec 2026)"
                  value={recValidity}
                  onChange={(e) => setRecValidity(e.target.value)}
                  className="w-full bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-lg bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Add Recurring Payment
                </button>
              </form>
            )}

            <div className="divide-y divide-slate-200/80 dark:divide-[#363B44]">
              {recurringPayments.map((r) => (
                <div key={r.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.name}</span>
                    <span className="text-[10px] text-slate-500 block">{r.validTill}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white">{formatINR(r.amount)}</span>
                    <button
                      onClick={() => handleDeleteRecurring(r.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Demo Mode & Database State */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
                  Database & Demo Data
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Manage sample preview vs clean personal database
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDemoMode
                  ? 'bg-amber-50 dark:bg-[#B84E3B]/15 text-[#996520] dark:text-[#FF927A] border-[#F5DEBE] dark:border-[#EF6448]/30'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
              }`}>
                {isDemoMode ? '🟡 Demo Mode Active' : '🟢 Personal Database'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {isDemoMode ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all sample demo data and start fresh with an empty database?')) {
                      if (onClearDemoData) onClearDemoData();
                      onClose();
                    }
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Demo & Start Fresh</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Load sample demo data? This is great for exploring all features, but will replace current records.')) {
                      if (onLoadDemoData) onLoadDemoData();
                      onClose();
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#F7F6F3] dark:bg-[#1B1E22] hover:bg-slate-100 dark:hover:bg-[#363C3A] border border-[#E8E1DB] dark:border-[#363B44] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5 text-[#B87B2E] dark:text-[#FF927A]" />
                  <span>Load Sample Demo Data</span>
                </button>
              )}
            </div>
          </div>

          {/* 5. Backup & Export / Import */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
              Backup & Data Portability
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              All your financial data is stored 100% offline on this device.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={exportDatabaseJSON}
                className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#1B1E22] hover:bg-slate-100 dark:hover:bg-[#363C3A] border border-[#E8E1DB] dark:border-[#363B44] text-left transition-colors flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#EF6448] shrink-0" />
                <span>Export JSON Backup</span>
              </button>

              <button
                onClick={exportTransactionsCSV}
                className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#1B1E22] hover:bg-slate-100 dark:hover:bg-[#363C3A] border border-[#E8E1DB] dark:border-[#363B44] text-left transition-colors flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#EF6448] shrink-0" />
                <span>Export to Excel / CSV</span>
              </button>
            </div>

            <div className="pt-2">
              <label className="block p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#1B1E22] hover:bg-slate-100 dark:hover:bg-[#363C3A] border border-dashed border-[#E8E1DB] dark:border-[#363B44] text-center cursor-pointer transition-colors text-xs text-slate-600 dark:text-slate-300 font-semibold">
                <Upload className="w-4 h-4 text-[#EF6448] inline mr-2" />
                <span>Import JSON Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <label className="block cursor-pointer rounded-xl border border-dashed border-[#E8E1DB] bg-[#F7F6F3] p-3 text-center text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-[#363B44] dark:bg-[#1B1E22] dark:text-slate-300 dark:hover:bg-[#363C3A]">
              <Archive className="mr-2 inline h-4 w-4 text-[#EF6448]" />
              <span>View or Restore Historical JSON / CSV</span>
              <input type="file" accept=".json,.csv,application/json,text/csv" onChange={handleHistoricalFileChange} className="hidden" />
            </label>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Supports BruFin archive exports, BruFin CSV exports, and JSON files containing a transactions array.</p>
          </div>

          {/* 5. Delete Data */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 space-y-2">
            <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />
              <span>Delete All Personal Data</span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Permanently wipes all transactions, account balances, loans, and investments stored on this device.
              Ensures zero personal information remains.
            </p>
            <button
              onClick={() => {
                if (confirm('Permanently delete all your personal financial data from this device? This will erase all transactions and records completely.')) {
                  onResetData();
                  onClose();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
