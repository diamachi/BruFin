import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, CreditCard, RecurringPayment, InvestmentItem, LoanItem, MonthlyAccountBalance, ViewTab, PaymentMethodItem } from './types';
import {
  loadTransactions,
  saveTransactions,
  loadCreditCards,
  saveCreditCards,
  loadRecurringPayments,
  saveRecurringPayments,
  loadMonthlyTarget,
  saveMonthlyTarget,
  loadInvestments,
  saveInvestments,
  loadLoans,
  saveLoans,
  loadMonthlyBalances,
  saveMonthlyBalances,
  loadPaymentMethods,
  savePaymentMethods,
  saveDatabaseSections,
  postRecurringPaymentToExpenses,
  getRecurringPaymentStatuses,
  clearAllData,
  hasUserOnboarded,
  isDemoModeActive,
  loadDemoDataset,
  isBalancePromptsEnabled,
  setBalancePromptsEnabled,
  getDismissedBalancePrompts,
  getUnifiedMonthlyBalance,
  updateUnifiedMonthlyBalance,
  isDiagnosticsEnabled,
  setDiagnosticsEnabled,
  loadAppScale,
  saveAppScale,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DiagnosticsBar } from './components/DiagnosticsBar';
import { QuickAddModal } from './components/QuickAddModal';
import { AddRecurringModal } from './components/AddRecurringModal';
import { MonthlyBalancePromptModal, BalancePromptMode } from './components/MonthlyBalancePromptModal';
import { Smartphone, Monitor } from 'lucide-react';
import { getCurrentMonthKey } from './utils/dateUtils';
import { parseHistoricalDataFile } from './utils/archiveImport';

const ArchiveViewerModal = React.lazy(() => import('./components/ArchiveViewerModal').then((module) => ({ default: module.ArchiveViewerModal })));
const DiagnosticsModal = React.lazy(() => import('./components/DiagnosticsModal').then((module) => ({ default: module.DiagnosticsModal })));
const DashboardView = React.lazy(() => import('./components/DashboardView').then((module) => ({ default: module.DashboardView })));
const ExpensesView = React.lazy(() => import('./components/ExpensesView').then((module) => ({ default: module.ExpensesView })));
const IncomeView = React.lazy(() => import('./components/IncomeView').then((module) => ({ default: module.IncomeView })));
const BalancesView = React.lazy(() => import('./components/BalancesView').then((module) => ({ default: module.BalancesView })));
const CreditCardsView = React.lazy(() => import('./components/CreditCardsView').then((module) => ({ default: module.CreditCardsView })));
const InvestmentsView = React.lazy(() => import('./components/InvestmentsView').then((module) => ({ default: module.InvestmentsView })));
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal })));
const PageHelpModal = React.lazy(() => import('./components/PageHelpModal').then((module) => ({ default: module.PageHelpModal })));
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal').then((module) => ({ default: module.OnboardingModal })));

export const App: React.FC = () => {
  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return localStorage.getItem('brufin_theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    try { localStorage.setItem('brufin_theme', theme); } catch { /* Keep the theme active for this session. */ }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Dynamic UI Scaling (Display & Text Size for accessibility)
  const [appScale, setAppScaleState] = useState<number>(() => loadAppScale());

  useEffect(() => {
    try {
      (document.documentElement.style as any).zoom = appScale;
      document.documentElement.style.fontSize = `${appScale * 100}%`;
      document.documentElement.style.setProperty('--app-scale', appScale.toString());
    } catch (e) {
      console.error('Failed to apply display zoom scale', e);
    }
  }, [appScale]);

  const handleUpdateAppScale = (newScale: number) => {
    const clamped = Math.max(0.8, Math.min(1.5, Math.round(newScale * 100) / 100));
    setAppScaleState(clamped);
    saveAppScale(clamped);
  };

  // Onboarding & Demo Mode state
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => hasUserOnboarded());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => isDemoModeActive());

  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [creditCards, setCreditCards] = useState<CreditCard[]>(() => loadCreditCards());
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>(() => loadRecurringPayments());
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => loadMonthlyTarget());
  const [investments, setInvestments] = useState<InvestmentItem[]>(() => loadInvestments());
  const [loans, setLoans] = useState<LoanItem[]>(() => loadLoans());
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyAccountBalance[]>(() => loadMonthlyBalances());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>(() => loadPaymentMethods());

  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [archivePreview, setArchivePreview] = useState<Transaction[] | null>(null);
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);

  // Monthly balance prompt states
  const [balancePromptsEnabled, setBalancePromptsEnabledState] = useState<boolean>(() => isBalancePromptsEnabled());
  const [isBalancePromptOpen, setIsBalancePromptOpen] = useState(false);
  const [balancePromptMode, setBalancePromptMode] = useState<BalancePromptMode>('start_of_month');
  const [balancePromptMonthKey, setBalancePromptMonthKey] = useState<string>(() => getCurrentMonthKey());

  // Storage & RAM diagnostics state
  const [isDiagnosticsActive, setIsDiagnosticsActive] = useState<boolean>(() => isDiagnosticsEnabled());
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);

  const handleToggleDiagnostics = (enabled: boolean) => {
    setIsDiagnosticsActive(enabled);
    setDiagnosticsEnabled(enabled);
    showToast(enabled ? 'Diagnostics monitor enabled at top' : 'Diagnostics monitor hidden');
  };

  const handleTapCoffee = () => {
    setIsDiagnosticsActive((prev) => {
      const next = !prev;
      setDiagnosticsEnabled(next);
      showToast(next ? '⚡ Diagnostics Monitor ON (RAM & Storage)' : 'Diagnostics Monitor OFF');
      return next;
    });
  };


  // Automatic Start / End of Month Balance Check-in trigger
  useEffect(() => {
    if (!balancePromptsEnabled || !hasOnboarded) return;

    const today = new Date();
    const year = today.getFullYear();
    const monthNum = today.getMonth() + 1;
    const currentMonthKey = `${year}-${monthNum.toString().padStart(2, '0')}`;
    const currentDay = today.getDate();
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const daysLeft = lastDayOfMonth - currentDay;

    const dismissed = getDismissedBalancePrompts();
    const currentBal = getUnifiedMonthlyBalance(monthlyBalances, currentMonthKey);

    // 1. Check Start of Month: Days 1 to 5
    if (currentDay <= 5) {
      const promptId = `prompt_start_${currentMonthKey}`;
      if (!dismissed.includes(promptId) && (!currentBal.exists || currentBal.startBalance <= 0)) {
        setBalancePromptMonthKey(currentMonthKey);
        setBalancePromptMode('start_of_month');
        setIsBalancePromptOpen(true);
        return;
      }
    }

    // 2. Check End of Month: Last 4 days (daysLeft <= 4)
    if (daysLeft <= 4) {
      const promptId = `prompt_end_${currentMonthKey}`;
      if (!dismissed.includes(promptId) && (!currentBal.exists || currentBal.endBalance <= 0)) {
        setBalancePromptMonthKey(currentMonthKey);
        setBalancePromptMode('end_of_month');
        setIsBalancePromptOpen(true);
        return;
      }
    }
  }, [hasOnboarded, balancePromptsEnabled, monthlyBalances]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const persistWrite = async (write: Promise<void>): Promise<boolean> => {
    try {
      await write;
      return true;
    } catch (error) {
      console.error('Local database write failed', error);
      showToast('Could not save to this device. Please retry and export a backup.');
      return false;
    }
  };

  // Compute available months from transactions & balances
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        monthSet.add(t.date.substring(0, 7));
      }
    });
    monthlyBalances.forEach((b) => {
      if (b.month) monthSet.add(b.month);
    });
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [transactions, monthlyBalances]);

  // Default selected month to the latest available month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const months = Array.from(
      new Set(
        loadTransactions()
          .map((t) => t.date?.substring(0, 7))
          .filter(Boolean)
      )
    ).sort((a, b) => (b as string).localeCompare(a as string));
    return months[0] || getCurrentMonthKey();
  });

  // Unique recent descriptions for autocompletion
  const recentDescriptions = useMemo(() => {
    const descs = Array.from(new Set(transactions.map((t) => t.description).filter(Boolean)));
    return descs.slice(0, 10);
  }, [transactions]);

  // Handlers
  const handleSaveTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      const updated = transactions.map((t) =>
        t.id === editingTransaction.id ? { ...transactionData, id: editingTransaction.id } : t
      );
      if (!(await persistWrite(saveTransactions(updated)))) return;
      setTransactions(updated);
      setEditingTransaction(null);
      showToast('Transaction updated');
    } else {
      const newTransaction: Transaction = {
        ...transactionData,
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
      const updated = [newTransaction, ...transactions];
      if (!(await persistWrite(saveTransactions(updated)))) return;
      setTransactions(updated);
      showToast('Transaction recorded locally');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    if (!(await persistWrite(saveTransactions(updated)))) return;
    setTransactions(updated);
    showToast('Transaction deleted');
  };

  const handleUpdateTarget = async (target: number) => {
    if (!(await persistWrite(saveMonthlyTarget(target)))) return;
    setMonthlyTarget(target);
    showToast(`Monthly budget target set to ₹ ${target.toLocaleString('en-IN')}`);
  };

  const handleUpdateRecurring = async (payments: RecurringPayment[]) => {
    if (!(await persistWrite(saveRecurringPayments(payments)))) return;
    setRecurringPayments(payments);
    showToast('Recurring payments updated');
  };

  const handleSaveNewRecurring = async (rec: RecurringPayment) => {
    const exists = recurringPayments.find((r) => r.id === rec.id);
    let updated: RecurringPayment[];
    if (exists) {
      updated = recurringPayments.map((r) => (r.id === rec.id ? rec : r));
    } else {
      updated = [...recurringPayments, rec];
    }
    if (!(await persistWrite(saveRecurringPayments(updated)))) return;
    setRecurringPayments(updated);
    showToast(`Saved recurring bill: ${rec.name}`);
  };

  const handlePostRecurring = async (rec: RecurringPayment) => {
    const monthKey = selectedMonth === 'All' ? getCurrentMonthKey() : selectedMonth;
    const updated = postRecurringPaymentToExpenses(rec, monthKey, transactions);
    if (!(await persistWrite(saveTransactions(updated)))) return;
    setTransactions(updated);
    showToast(`Posted ${rec.name} (₹${rec.amount}) to expenses`);
  };

  const handlePostAllDueRecurring = async () => {
    const monthKey = selectedMonth === 'All' ? getCurrentMonthKey() : selectedMonth;
    const statuses = getRecurringPaymentStatuses(recurringPayments, transactions, monthKey);
    const unposted = statuses.filter((s) => s.isActive && !s.isPaid);

    if (unposted.length === 0) {
      showToast('All recurring bills are already posted for this month!');
      return;
    }

    let currentTx = [...transactions];
    unposted.forEach(({ recurring: rec }) => {
      currentTx = postRecurringPaymentToExpenses(rec, monthKey, currentTx);
    });

    if (!(await persistWrite(saveTransactions(currentTx)))) return;
    setTransactions(currentTx);
    showToast(`Posted ${unposted.length} recurring bills to expenses!`);
  };

  const handleUpdateInvestments = async (items: InvestmentItem[]) => {
    if (!(await persistWrite(saveInvestments(items)))) return;
    setInvestments(items);
    showToast('Investments updated');
  };

  const handleUpdateCreditCards = async (cards: CreditCard[]) => {
    if (!(await persistWrite(saveCreditCards(cards)))) return;
    setCreditCards(cards);
    showToast('Credit cards updated');
  };

  const handleUpdatePaymentMethods = async (methods: PaymentMethodItem[]) => {
    if (!(await persistWrite(savePaymentMethods(methods)))) return;
    setPaymentMethods(methods);
    showToast('Payment methods updated');
  };

  const handleUpdateLoans = async (items: LoanItem[]) => {
    if (!(await persistWrite(saveLoans(items)))) return;
    setLoans(items);
    showToast('Loans updated');
  };

  const handleUpdateBalances = async (bals: MonthlyAccountBalance[]) => {
    if (!(await persistWrite(saveMonthlyBalances(bals)))) return;
    setMonthlyBalances(bals);
    showToast('Bank balances updated');
  };

  const handleOpenUpdateBalance = (monthKey: string) => {
    setBalancePromptMonthKey(monthKey);
    setBalancePromptMode('manual_edit');
    setIsBalancePromptOpen(true);
  };

  const handleSaveUnifiedBalance = async (mKey: string, start: number, end: number, notes?: string) => {
    const updated = updateUnifiedMonthlyBalance(monthlyBalances, mKey, start, end, notes);
    if (!(await persistWrite(saveMonthlyBalances(updated)))) return;
    setMonthlyBalances(updated);
    showToast(`Saved liquid balance for ${mKey}`);
  };

  const handleToggleBalancePrompts = (enabled: boolean) => {
    setBalancePromptsEnabled(enabled);
    setBalancePromptsEnabledState(enabled);
    showToast(enabled ? 'Monthly balance prompts turned on' : 'Monthly balance prompts turned off');
  };

  const handleImportJSON = async (file: File) => {
    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Backup must be an object');
      const backup = data as Record<string, unknown>;
      if (backup.version !== 2) throw new Error('Unsupported backup version');
      const arrayFields = ['transactions', 'creditCards', 'recurringPayments', 'investments', 'loans', 'bankAccounts', 'monthlyBalances', 'paymentMethods'];
      for (const field of arrayFields) {
        if (backup[field] !== undefined && !Array.isArray(backup[field])) throw new Error(`Invalid ${field}`);
      }
      if (backup.monthlyTarget !== undefined && (typeof backup.monthlyTarget !== 'number' || !Number.isFinite(backup.monthlyTarget) || backup.monthlyTarget <= 0)) {
        throw new Error('Invalid monthly target');
      }
      const txRows = (backup.transactions || []) as unknown[];
      if (txRows.some((row) => !row || typeof row !== 'object' || typeof (row as any).id !== 'string' || !['Expense', 'Income'].includes((row as any).type) || typeof (row as any).date !== 'string' || !Number.isFinite((row as any).amount))) {
        throw new Error('Invalid transaction record');
      }
      const updates: Record<string, unknown> = {};
      for (const field of arrayFields) if (backup[field] !== undefined) updates[field] = backup[field];
      if (backup.monthlyTarget !== undefined) updates.monthlyTarget = backup.monthlyTarget;
      await saveDatabaseSections(updates as Parameters<typeof saveDatabaseSections>[0]);
      if (backup.transactions !== undefined) setTransactions(backup.transactions as Transaction[]);
      if (backup.creditCards !== undefined) setCreditCards(backup.creditCards as CreditCard[]);
      if (backup.recurringPayments !== undefined) setRecurringPayments(backup.recurringPayments as RecurringPayment[]);
      if (backup.monthlyTarget !== undefined) setMonthlyTarget(backup.monthlyTarget as number);
      if (backup.investments !== undefined) setInvestments(backup.investments as InvestmentItem[]);
      if (backup.loans !== undefined) setLoans(backup.loans as LoanItem[]);
      if (backup.monthlyBalances !== undefined) setMonthlyBalances(backup.monthlyBalances as MonthlyAccountBalance[]);
      if (backup.paymentMethods !== undefined) setPaymentMethods(backup.paymentMethods as PaymentMethodItem[]);
      showToast('Database backup imported successfully!');
      setIsSettingsOpen(false);
    } catch (e) {
      alert(`Backup import failed: ${e instanceof Error ? e.message : 'Invalid format or storage unavailable.'}`);
    }
  };

  const handleOpenArchiveImport = async (file: File) => {
    try {
      const archived = await parseHistoricalDataFile(file);
      if (archived.length === 0) {
        showToast('This file contains no transactions to preview.');
        return;
      }
      setIsSettingsOpen(false);
      setArchivePreview(archived);
    } catch (error) {
      alert(`Could not open historical data: ${error instanceof Error ? error.message : 'Unsupported file format.'}`);
    }
  };

  const handleRestoreArchive = async (archived: Transaction[]) => {
    const merged = [...transactions, ...archived].sort((a, b) =>
      b.date.localeCompare(a.date) || (b.timestamp || '').localeCompare(a.timestamp || '')
    );
    await saveTransactions(merged);
    setTransactions(merged);
    setArchivePreview(null);
    showToast(`Restored ${archived.length} historical transactions to this device.`);
  };

  // Onboarding & Demo Dataset Handlers
  const handleSelectDemo = async () => {
    let data;
    try { data = await loadDemoDataset(); } catch (error) {
      console.error(error);
      showToast('Could not load demo data into local storage.');
      return;
    }
    setTransactions(data.transactions);
    setCreditCards(data.creditCards);
    setRecurringPayments(data.recurringPayments);
    setMonthlyTarget(data.monthlyTarget);
    setInvestments(data.investments);
    setLoans(data.loans);
    setMonthlyBalances(data.monthlyBalances);
    setIsDemoMode(true);
    setHasOnboarded(true);
    showToast('Loaded demo data! Tap "Clear Demo" whenever you are ready to start fresh.');
  };

  const handleSelectFresh = async () => {
    try { await clearAllData(); } catch (error) {
      console.error(error);
      showToast('Could not initialize the local database.');
      return;
    }
    setTransactions([]);
    setCreditCards([]);
    setRecurringPayments([]);
    setInvestments([]);
    setLoans([]);
    setMonthlyBalances([]);
    setMonthlyTarget(loadMonthlyTarget());
    setPaymentMethods(loadPaymentMethods());
    setSelectedMonth(getCurrentMonthKey());
    setIsDemoMode(false);
    setHasOnboarded(true);
    showToast('Clean slate ready! Add your first account or transaction.');
  };

  const handleClearDemoAndStartFresh = async () => {
    if (confirm('Clear demo data and start fresh? This will delete all sample records and create a clean database for your personal use.')) {
      try { await clearAllData(); } catch (error) {
        console.error(error);
        showToast('Could not clear the local database.');
        return;
      }
      setTransactions([]);
      setCreditCards([]);
      setRecurringPayments([]);
      setInvestments([]);
      setLoans([]);
      setMonthlyBalances([]);
      setMonthlyTarget(loadMonthlyTarget());
      setPaymentMethods(loadPaymentMethods());
      setSelectedMonth(getCurrentMonthKey());
      setIsDemoMode(false);
      showToast('Demo data cleared! Your private database is ready.');
    }
  };

  const handleLoadDemoData = async () => {
    let data;
    try { data = await loadDemoDataset(); } catch (error) {
      console.error(error);
      showToast('Could not load demo data into local storage.');
      return;
    }
    setTransactions(data.transactions);
    setCreditCards(data.creditCards);
    setRecurringPayments(data.recurringPayments);
    setMonthlyTarget(data.monthlyTarget);
    setInvestments(data.investments);
    setLoans(data.loans);
    setMonthlyBalances(data.monthlyBalances);
    setIsDemoMode(true);
    showToast('Sample demo data loaded successfully!');
  };

  // Permanently delete all personal data
  const handleDeleteAllPersonalData = async () => {
    try { await clearAllData(); } catch (error) {
      console.error(error);
      showToast('Could not clear the local database.');
      return;
    }
    setTransactions([]);
    setCreditCards([]);
    setRecurringPayments([]);
    setMonthlyBalances([]);
    setInvestments([]);
    setLoans([]);
    setMonthlyTarget(loadMonthlyTarget());
    setPaymentMethods(loadPaymentMethods());
    setSelectedMonth(getCurrentMonthKey());
    setIsDemoMode(false);
    showToast('All data has been permanently cleared from this device');
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] dark:bg-[#17191C] text-slate-800 dark:text-[#F2F3F5] flex flex-col justify-between selection:bg-[#FED7B8] selection:text-[#202322] dark:selection:bg-[#EF6448]/30 dark:selection:text-[#EF6448] font-sans antialiased transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[#EF6448] text-white text-xs font-semibold shadow-xl border border-[#E8E1DB] dark:border-[#363B44] backdrop-blur-md animate-bounce"
          style={{
            top: 'calc(var(--app-safe-top, 0px) + 4.5rem)',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Phone Frame Toggle on Desktop */}
      <div className="hidden lg:flex fixed right-4 bottom-4 z-40 items-center space-x-2 bg-white/90 dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] rounded-2xl p-1.5 shadow-xl">
        <button
          onClick={() => setIsPhoneFrame(false)}
          className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
            !isPhoneFrame ? 'bg-[#EF6448] text-white' : 'text-slate-500 hover:text-[#EF6448]'
          }`}
          title="Responsive View"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Full Width</span>
        </button>
        <button
          onClick={() => setIsPhoneFrame(true)}
          className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
            isPhoneFrame ? 'bg-[#EF6448] text-white' : 'text-slate-500 hover:text-[#EF6448]'
          }`}
          title="Mobile Device Mockup"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Phone Frame</span>
        </button>
      </div>

      {/* Main Container */}
      <div
        className={`w-full mx-auto transition-all duration-300 flex-1 flex flex-col ${
          isPhoneFrame
            ? 'max-w-md my-6 rounded-[40px] border-8 border-[#E8E1DB] dark:border-[#363B44] shadow-2xl overflow-hidden bg-[#F7F6F3] dark:bg-[#17191C] relative min-h-[820px]'
            : 'max-w-2xl'
        }`}
      >
        {/* Top App Bar with Light/Dark Mode Switcher */}
        <Navbar
          selectedMonth={selectedMonth}
          availableMonths={availableMonths}
          onSelectMonth={setSelectedMonth}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onTapCoffee={handleTapCoffee}
        >
          {/* Real-time Storage & RAM Leak Diagnostics Bar (docked below top status bar) */}
          {isDiagnosticsActive && (
            <DiagnosticsBar
              onOpenDetails={() => setIsDiagnosticsModalOpen(true)}
              onDismiss={() => handleToggleDiagnostics(false)}
            />
          )}
        </Navbar>

        {/* Demo Mode Notice Banner */}
        {isDemoMode && (
          <div className="bg-gradient-to-r from-[#FDF4E7] via-[#FFF8F3] to-[#FDF4E7] dark:from-[#272B2A] dark:via-[#202328] dark:to-[#272B2A] border-b border-[#E8E1DB] dark:border-[#363B44] px-4 py-2 flex items-center justify-between gap-2.5 text-xs animate-fadeIn">
            <div className="flex items-center space-x-2 truncate">
              <span className="text-sm">☕</span>
              <span className="font-bold text-[#EF6448]">Demo Mode:</span>
              <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">
                Previewing sample records
              </span>
            </div>
            <button
              onClick={handleClearDemoAndStartFresh}
              className="px-2.5 py-1 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white font-bold text-[10px] shadow-sm shrink-0 transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>Clear & Start Fresh</span>
            </button>
          </div>
        )}

        {/* View Content */}
        <main
          className="flex-1 px-4 pt-4"
          style={{ paddingBottom: 'calc(var(--app-safe-bottom, 0px) + 7rem)' }}
        >
          <React.Suspense fallback={<div className="py-10 text-center text-sm text-slate-500">Loading view…</div>}>
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              monthlyTarget={monthlyTarget}
              creditCards={creditCards}
              monthlyBalances={monthlyBalances}
              selectedMonth={selectedMonth}
              onNavigateToTransactions={() => setActiveTab('expenses')}
              onNavigateToIncome={() => setActiveTab('income')}
              onNavigateToCards={() => setActiveTab('cards')}
              onNavigateToLoans={() => setActiveTab('loans')}
              onNavigateToBalances={() => setActiveTab('balances')}
              onOpenUpdateBalance={handleOpenUpdateBalance}
            />
          )}

          {(activeTab === 'expenses' || activeTab === 'transactions') && (
            <ExpensesView
              transactions={transactions}
              recurringPayments={recurringPayments}
              selectedMonth={selectedMonth}
              onEditTransaction={(t) => {
                setEditingTransaction(t);
                setIsQuickAddOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenAddRecurring={() => setIsAddRecurringOpen(true)}
              onPostRecurring={handlePostRecurring}
              onPostAllDueRecurring={handlePostAllDueRecurring}
              creditCards={creditCards}
              paymentMethods={paymentMethods}
            />
          )}

          {activeTab === 'balances' && (
            <BalancesView
              monthlyBalances={monthlyBalances}
              selectedMonth={selectedMonth}
              onUpdateBalances={handleUpdateBalances}
            />
          )}

          {activeTab === 'income' && (
            <IncomeView
              transactions={transactions}
              selectedMonth={selectedMonth}
              onEditTransaction={(t) => {
                setEditingTransaction(t);
                setIsQuickAddOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenQuickAdd={() => {
                setEditingTransaction(null);
                setIsQuickAddOpen(true);
              }}
              onBackToMonitor={() => setActiveTab('dashboard')}
              creditCards={creditCards}
              paymentMethods={paymentMethods}
            />
          )}

          {activeTab === 'cards' && (
            <CreditCardsView
              creditCards={creditCards}
              transactions={transactions}
              selectedMonth={selectedMonth}
              onEditTransaction={(t) => {
                setEditingTransaction(t);
                setIsQuickAddOpen(true);
              }}
              onUpdateCreditCards={handleUpdateCreditCards}
            />
          )}

          {activeTab === 'investments' && (
            <InvestmentsView
              investments={investments}
              onUpdateInvestments={handleUpdateInvestments}
              loans={loans}
              onUpdateLoans={handleUpdateLoans}
            />
          )}

          {activeTab === 'loans' && (
            <InvestmentsView
              investments={investments}
              onUpdateInvestments={handleUpdateInvestments}
              loans={loans}
              onUpdateLoans={handleUpdateLoans}
              initialSubTab="loans"
            />
          )}
          </React.Suspense>
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenQuickAdd={() => {
            setEditingTransaction(null);
            setIsQuickAddOpen(true);
          }}
        />
      </div>

      {/* Modals */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          setIsQuickAddOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        recentDescriptions={recentDescriptions}
        initialData={editingTransaction}
        creditCards={creditCards}
        paymentMethods={paymentMethods}
      />

      <AddRecurringModal
        isOpen={isAddRecurringOpen}
        onClose={() => setIsAddRecurringOpen(false)}
        onSave={handleSaveNewRecurring}
        creditCards={creditCards}
        paymentMethods={paymentMethods}
      />

      {isSettingsOpen && <React.Suspense fallback={null}><SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        monthlyTarget={monthlyTarget}
        onUpdateTarget={handleUpdateTarget}
        recurringPayments={recurringPayments}
        onUpdateRecurring={handleUpdateRecurring}
        paymentMethods={paymentMethods}
        onUpdatePaymentMethods={handleUpdatePaymentMethods}
        onImportJSON={handleImportJSON}
        onOpenArchiveImport={handleOpenArchiveImport}
        onResetData={handleDeleteAllPersonalData}
        isDemoMode={isDemoMode}
        onLoadDemoData={handleLoadDemoData}
        onClearDemoData={handleClearDemoAndStartFresh}
        balancePromptsEnabled={balancePromptsEnabled}
        onToggleBalancePrompts={handleToggleBalancePrompts}
        diagnosticsEnabled={isDiagnosticsActive}
        onToggleDiagnostics={handleToggleDiagnostics}
        onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
        appScale={appScale}
        onUpdateAppScale={handleUpdateAppScale}
      /></React.Suspense>}

      {archivePreview && (
        <React.Suspense fallback={null}>
          <ArchiveViewerModal
            transactions={archivePreview}
            existingTransactions={transactions}
            onClose={() => setArchivePreview(null)}
            onRestore={handleRestoreArchive}
          />
        </React.Suspense>
      )}

      {/* System Diagnostics & 1-Year Retention Center Modal */}
      {isDiagnosticsModalOpen && <React.Suspense fallback={null}><DiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        onToggleDiagnostics={handleToggleDiagnostics}
        isDiagnosticsActive={isDiagnosticsActive}
      /></React.Suspense>}

      {/* Monthly Balance Prompt / Manual Edit Modal */}
      <MonthlyBalancePromptModal
        isOpen={isBalancePromptOpen}
        onClose={() => setIsBalancePromptOpen(false)}
        monthKey={balancePromptMonthKey}
        mode={balancePromptMode}
        monthlyBalances={monthlyBalances}
        onSaveBalance={handleSaveUnifiedBalance}
        onDisablePrompts={() => handleToggleBalancePrompts(false)}
      />

      {isHelpOpen && <React.Suspense fallback={null}><PageHelpModal
        tab={activeTab}
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      /></React.Suspense>}

      {/* First-time Welcome & Onboarding Modal */}
      {!hasOnboarded && <React.Suspense fallback={null}><OnboardingModal
        isOpen={!hasOnboarded}
        onSelectDemo={handleSelectDemo}
        onSelectFresh={handleSelectFresh}
      /></React.Suspense>}
    </div>
  );
};

export default App;
