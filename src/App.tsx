import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, CreditCard, RecurringPayment, InvestmentItem, LoanItem, BankAccount, MonthlyAccountBalance, ViewTab, PaymentMethodItem } from './types';
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
  loadBankAccounts,
  saveBankAccounts,
  loadMonthlyBalances,
  saveMonthlyBalances,
  loadPaymentMethods,
  savePaymentMethods,
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
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { DashboardView } from './components/DashboardView';
import { ExpensesView } from './components/ExpensesView';
import { IncomeView } from './components/IncomeView';
import { BalancesView } from './components/BalancesView';
import { CreditCardsView } from './components/CreditCardsView';
import { InvestmentsView } from './components/InvestmentsView';
import { QuickAddModal } from './components/QuickAddModal';
import { SettingsModal } from './components/SettingsModal';
import { AddRecurringModal } from './components/AddRecurringModal';
import { PageHelpModal } from './components/PageHelpModal';
import { OnboardingModal } from './components/OnboardingModal';
import { MonthlyBalancePromptModal, BalancePromptMode } from './components/MonthlyBalancePromptModal';
import { Smartphone, Monitor } from 'lucide-react';

export const App: React.FC = () => {
  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('brufin_theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('brufin_theme', theme);
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
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => loadBankAccounts());
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyAccountBalance[]>(() => loadMonthlyBalances());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>(() => loadPaymentMethods());

  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);

  // Monthly balance prompt states
  const [balancePromptsEnabled, setBalancePromptsEnabledState] = useState<boolean>(() => isBalancePromptsEnabled());
  const [isBalancePromptOpen, setIsBalancePromptOpen] = useState(false);
  const [balancePromptMode, setBalancePromptMode] = useState<BalancePromptMode>('start_of_month');
  const [balancePromptMonthKey, setBalancePromptMonthKey] = useState<string>(() => new Date().toISOString().substring(0, 7));

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

  const handleDataPruned = () => {
    setTransactions(loadTransactions());
    showToast('Historical records archived and active database pruned!');
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
    return months[0] || new Date().toISOString().substring(0, 7);
  });

  // Unique recent descriptions for autocompletion
  const recentDescriptions = useMemo(() => {
    const descs = Array.from(new Set(transactions.map((t) => t.description).filter(Boolean)));
    return descs.slice(0, 10);
  }, [transactions]);

  // Handlers
  const handleSaveTransaction = (transactionData: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      const updated = transactions.map((t) =>
        t.id === editingTransaction.id ? { ...transactionData, id: editingTransaction.id } : t
      );
      setTransactions(updated);
      saveTransactions(updated);
      setEditingTransaction(null);
      showToast('Transaction updated');
    } else {
      const newTransaction: Transaction = {
        ...transactionData,
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
      const updated = [newTransaction, ...transactions];
      setTransactions(updated);
      saveTransactions(updated);
      showToast('Transaction recorded locally');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    saveTransactions(updated);
    showToast('Transaction deleted');
  };

  const handleUpdateTarget = (target: number) => {
    setMonthlyTarget(target);
    saveMonthlyTarget(target);
    showToast(`Monthly budget target set to ₹ ${target.toLocaleString('en-IN')}`);
  };

  const handleUpdateRecurring = (payments: RecurringPayment[]) => {
    setRecurringPayments(payments);
    saveRecurringPayments(payments);
    showToast('Recurring payments updated');
  };

  const handleSaveNewRecurring = (rec: RecurringPayment) => {
    const exists = recurringPayments.find((r) => r.id === rec.id);
    let updated: RecurringPayment[];
    if (exists) {
      updated = recurringPayments.map((r) => (r.id === rec.id ? rec : r));
    } else {
      updated = [...recurringPayments, rec];
    }
    setRecurringPayments(updated);
    saveRecurringPayments(updated);
    showToast(`Saved recurring bill: ${rec.name}`);
  };

  const handlePostRecurring = (rec: RecurringPayment) => {
    const monthKey = selectedMonth === 'All' ? new Date().toISOString().substring(0, 7) : selectedMonth;
    const updated = postRecurringPaymentToExpenses(rec, monthKey, transactions);
    setTransactions(updated);
    saveTransactions(updated);
    showToast(`Posted ${rec.name} (₹${rec.amount}) to expenses`);
  };

  const handlePostAllDueRecurring = () => {
    const monthKey = selectedMonth === 'All' ? new Date().toISOString().substring(0, 7) : selectedMonth;
    const statuses = getRecurringPaymentStatuses(recurringPayments, transactions, monthKey);
    const unposted = statuses.filter((s) => !s.isPaid);

    if (unposted.length === 0) {
      showToast('All recurring bills are already posted for this month!');
      return;
    }

    let currentTx = [...transactions];
    unposted.forEach(({ recurring: rec }) => {
      currentTx = postRecurringPaymentToExpenses(rec, monthKey, currentTx);
    });

    setTransactions(currentTx);
    saveTransactions(currentTx);
    showToast(`Posted ${unposted.length} recurring bills to expenses!`);
  };

  const handleUpdateInvestments = (items: InvestmentItem[]) => {
    setInvestments(items);
    saveInvestments(items);
    showToast('Investments updated');
  };

  const handleUpdateCreditCards = (cards: CreditCard[]) => {
    setCreditCards(cards);
    saveCreditCards(cards);
    showToast('Credit cards updated');
  };

  const handleUpdatePaymentMethods = (methods: PaymentMethodItem[]) => {
    setPaymentMethods(methods);
    savePaymentMethods(methods);
    showToast('Payment methods updated');
  };

  const handleUpdateLoans = (items: LoanItem[]) => {
    setLoans(items);
    saveLoans(items);
    showToast('Loans updated');
  };

  const handleUpdateBalances = (bals: MonthlyAccountBalance[]) => {
    setMonthlyBalances(bals);
    saveMonthlyBalances(bals);
    showToast('Bank balances updated');
  };

  const handleOpenUpdateBalance = (monthKey: string) => {
    setBalancePromptMonthKey(monthKey);
    setBalancePromptMode('manual_edit');
    setIsBalancePromptOpen(true);
  };

  const handleSaveUnifiedBalance = (mKey: string, start: number, end: number, notes?: string) => {
    const updated = updateUnifiedMonthlyBalance(monthlyBalances, mKey, start, end, notes);
    setMonthlyBalances(updated);
    showToast(`Saved liquid balance for ${mKey}`);
  };

  const handleToggleBalancePrompts = (enabled: boolean) => {
    setBalancePromptsEnabled(enabled);
    setBalancePromptsEnabledState(enabled);
    showToast(enabled ? 'Monthly balance prompts turned on' : 'Monthly balance prompts turned off');
  };

  const handleUpdateAccounts = (accs: BankAccount[]) => {
    setBankAccounts(accs);
    saveBankAccounts(accs);
    showToast('Bank account added');
  };

  const handleImportJSON = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        saveTransactions(data.transactions);
      }
      if (data.creditCards && Array.isArray(data.creditCards)) {
        setCreditCards(data.creditCards);
        saveCreditCards(data.creditCards);
      }
      if (data.recurringPayments && Array.isArray(data.recurringPayments)) {
        setRecurringPayments(data.recurringPayments);
        saveRecurringPayments(data.recurringPayments);
      }
      if (data.monthlyTarget) {
        setMonthlyTarget(data.monthlyTarget);
        saveMonthlyTarget(data.monthlyTarget);
      }
      if (data.investments && Array.isArray(data.investments)) {
        setInvestments(data.investments);
        saveInvestments(data.investments);
      }
      if (data.loans && Array.isArray(data.loans)) {
        setLoans(data.loans);
        saveLoans(data.loans);
      }
      if (data.bankAccounts && Array.isArray(data.bankAccounts)) {
        setBankAccounts(data.bankAccounts);
        saveBankAccounts(data.bankAccounts);
      }
      if (data.monthlyBalances && Array.isArray(data.monthlyBalances)) {
        setMonthlyBalances(data.monthlyBalances);
        saveMonthlyBalances(data.monthlyBalances);
      }
      if (data.paymentMethods && Array.isArray(data.paymentMethods)) {
        setPaymentMethods(data.paymentMethods);
        savePaymentMethods(data.paymentMethods);
      }
      showToast('Database backup imported successfully!');
      setIsSettingsOpen(false);
    } catch (e) {
      alert('Failed to import backup file. Invalid format.');
    }
  };

  // Onboarding & Demo Dataset Handlers
  const handleSelectDemo = () => {
    const data = loadDemoDataset();
    setTransactions(data.transactions);
    setCreditCards(data.creditCards);
    setRecurringPayments(data.recurringPayments);
    setMonthlyTarget(data.monthlyTarget);
    setInvestments(data.investments);
    setLoans(data.loans);
    setBankAccounts(data.bankAccounts);
    setMonthlyBalances(data.monthlyBalances);
    setIsDemoMode(true);
    setHasOnboarded(true);
    showToast('Loaded demo data! Tap "Clear Demo" whenever you are ready to start fresh.');
  };

  const handleSelectFresh = () => {
    clearAllData();
    setTransactions([]);
    setCreditCards([]);
    setRecurringPayments([]);
    setInvestments([]);
    setLoans([]);
    setBankAccounts([]);
    setMonthlyBalances([]);
    setIsDemoMode(false);
    setHasOnboarded(true);
    showToast('Clean slate ready! Add your first account or transaction.');
  };

  const handleClearDemoAndStartFresh = () => {
    if (confirm('Clear demo data and start fresh? This will delete all sample records and create a clean database for your personal use.')) {
      clearAllData();
      setTransactions([]);
      setCreditCards([]);
      setRecurringPayments([]);
      setInvestments([]);
      setLoans([]);
      setBankAccounts([]);
      setMonthlyBalances([]);
      setIsDemoMode(false);
      showToast('Demo data cleared! Your private database is ready.');
    }
  };

  const handleLoadDemoData = () => {
    const data = loadDemoDataset();
    setTransactions(data.transactions);
    setCreditCards(data.creditCards);
    setRecurringPayments(data.recurringPayments);
    setMonthlyTarget(data.monthlyTarget);
    setInvestments(data.investments);
    setLoans(data.loans);
    setBankAccounts(data.bankAccounts);
    setMonthlyBalances(data.monthlyBalances);
    setIsDemoMode(true);
    showToast('Sample demo data loaded successfully!');
  };

  // Permanently delete all personal data
  const handleDeleteAllPersonalData = () => {
    clearAllData();
    setTransactions([]);
    setCreditCards([]);
    setRecurringPayments([]);
    setMonthlyBalances([]);
    setInvestments([]);
    setLoans([]);
    setBankAccounts([]);
    setIsDemoMode(false);
    showToast('All data has been permanently cleared from this device');
  };

  return (
    <div className="min-h-screen bg-[#FFF8F3] dark:bg-[#202322] text-slate-800 dark:text-[#F4F6F5] flex flex-col justify-between selection:bg-[#FED7B8] selection:text-[#202322] dark:selection:bg-[#EF6448]/30 dark:selection:text-[#EF6448] font-sans antialiased transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[#EF6448] text-white text-xs font-semibold shadow-xl border border-[#FED7B8] dark:border-[#363C3A] backdrop-blur-md animate-bounce"
          style={{
            top: 'calc(var(--app-safe-top, 0px) + 4.5rem)',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Phone Frame Toggle on Desktop */}
      <div className="hidden lg:flex fixed right-4 bottom-4 z-40 items-center space-x-2 bg-white/90 dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] rounded-2xl p-1.5 shadow-xl">
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
            ? 'max-w-md my-6 rounded-[40px] border-8 border-[#FED7B8] dark:border-[#363C3A] shadow-2xl overflow-hidden bg-[#FFF8F3] dark:bg-[#202322] relative min-h-[820px]'
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
          totalTransactionsCount={transactions.length}
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
          <div className="bg-gradient-to-r from-[#FDF4E7] via-[#FFF8F3] to-[#FDF4E7] dark:from-[#272B2A] dark:via-[#202322] dark:to-[#272B2A] border-b border-[#FED7B8] dark:border-[#363C3A] px-4 py-2 flex items-center justify-between gap-2.5 text-xs animate-fadeIn">
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
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              monthlyTarget={monthlyTarget}
              recurringPayments={recurringPayments}
              creditCards={creditCards}
              bankAccounts={bankAccounts}
              monthlyBalances={monthlyBalances}
              selectedMonth={selectedMonth}
              onNavigateToTransactions={() => setActiveTab('expenses')}
              onNavigateToIncome={() => setActiveTab('income')}
              onNavigateToCards={() => setActiveTab('cards')}
              onNavigateToLoans={() => setActiveTab('loans')}
              onNavigateToBalances={() => setActiveTab('balances')}
              onOpenQuickAdd={() => {
                setEditingTransaction(null);
                setIsQuickAddOpen(true);
              }}
              onOpenUpdateBalance={handleOpenUpdateBalance}
              onOpenAddRecurring={() => setIsAddRecurringOpen(true)}
              onPostRecurring={handlePostRecurring}
              onPostAllDueRecurring={handlePostAllDueRecurring}
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
              onOpenQuickAdd={() => {
                setEditingTransaction(null);
                setIsQuickAddOpen(true);
              }}
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

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        monthlyTarget={monthlyTarget}
        onUpdateTarget={handleUpdateTarget}
        recurringPayments={recurringPayments}
        onUpdateRecurring={handleUpdateRecurring}
        paymentMethods={paymentMethods}
        onUpdatePaymentMethods={handleUpdatePaymentMethods}
        onImportJSON={handleImportJSON}
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
      />

      {/* System Diagnostics & 1-Year Retention Center Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        onToggleDiagnostics={handleToggleDiagnostics}
        isDiagnosticsActive={isDiagnosticsActive}
        onDataPruned={handleDataPruned}
      />

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

      <PageHelpModal
        tab={activeTab}
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* First-time Welcome & Onboarding Modal */}
      <OnboardingModal
        isOpen={!hasOnboarded}
        onSelectDemo={handleSelectDemo}
        onSelectFresh={handleSelectFresh}
      />
    </div>
  );
};

export default App;
