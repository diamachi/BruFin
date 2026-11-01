import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Banknote,
  Plus,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  Zap,
  TrendingDown,
} from 'lucide-react';
import { LoanItem } from '../types';
import { formatINR, getTodayDateString } from '../utils/dateUtils';

interface Props {
  loans: LoanItem[];
  onUpdateLoans: (loans: LoanItem[]) => void;
}

export const LoansView: React.FC<Props> = ({ loans, onUpdateLoans }) => {
  const [selectedLoanId, setSelectedLoanId] = useState<string>(loans[0]?.id || '');
  const [extraPayment, setExtraPayment] = useState<number>(1000);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formLender, setFormLender] = useState('');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formPayment, setFormPayment] = useState('');

  const activeLoan = loans.find((l) => l.id === selectedLoanId) || loans[0];

  // Payoff calculations
  const calculation = useMemo(() => {
    if (!activeLoan) return null;

    const P = activeLoan.currentPrincipal;
    const annualRate = activeLoan.interestRate;
    const monthlyRate = annualRate / 12 / 100;
    const baseM = activeLoan.monthlyPayment;
    const totalM = baseM + extraPayment;

    // Minimum payment check
    const minInterest = P * monthlyRate;
    if (![P, annualRate, baseM, totalM].every(Number.isFinite) || P <= 0 || annualRate < 0 || baseM <= 0 || totalM <= 0 || baseM <= minInterest) {
      return {
        isValid: false,
        error: `Monthly payment of ${formatINR(baseM)} is less than monthly interest of ${formatINR(minInterest)}. The loan balance will grow.`,
      };
    }

    // Standard payoff (without extra payment)
    const baseMonths = monthlyRate === 0 ? P / baseM : -Math.log(1 - (P * monthlyRate) / baseM) / Math.log(1 + monthlyRate);
    const baseTotalInterest = monthlyRate === 0 ? 0 : baseMonths * baseM - P;

    // Accelerated payoff (with extra payment)
    const accelMonths = monthlyRate === 0 ? P / totalM : -Math.log(1 - (P * monthlyRate) / totalM) / Math.log(1 + monthlyRate);
    const accelTotalInterest = monthlyRate === 0 ? 0 : accelMonths * totalM - P;

    const monthsSaved = Math.max(0, Math.round(baseMonths - accelMonths));
    const interestSaved = Math.max(0, Math.round(baseTotalInterest - accelTotalInterest));

    // Target payoff date
    const today = new Date();
    const payoffDate = new Date(today.getFullYear(), today.getMonth() + Math.ceil(accelMonths), 1);
    const payoffDateStr = payoffDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const totalMonths = Math.ceil(accelMonths);
    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;
    const durationText = years > 0
      ? `${years} yr${years > 1 ? 's' : ''} ${remainingMonths > 0 ? `${remainingMonths} mo` : ''}`
      : `${totalMonths} months`;

    return {
      isValid: true,
      totalMonths,
      durationText,
      payoffDateStr,
      totalInterest: Math.round(accelTotalInterest),
      totalPayment: Math.round(P + accelTotalInterest),
      monthsSaved,
      interestSaved,
    };
  }, [activeLoan, extraPayment]);

  const totalOutstanding = loans.reduce((sum, l) => sum + l.currentPrincipal, 0);
  const totalMonthlyEMI = loans.reduce((sum, l) => sum + l.monthlyPayment, 0);

  const handleOpenAdd = () => {
    setEditingLoan(null);
    setFormName('');
    setFormLender('');
    setFormPrincipal('');
    setFormRate('9.5');
    setFormPayment('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loan: LoanItem) => {
    setEditingLoan(loan);
    setFormName(loan.name);
    setFormLender(loan.lender || '');
    setFormPrincipal(loan.currentPrincipal.toString());
    setFormRate(loan.interestRate.toString());
    setFormPayment(loan.monthlyPayment.toString());
    setIsModalOpen(true);
  };

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const principal = parseFloat(formPrincipal) || 0;
    const rate = parseFloat(formRate) || 0;
    const payment = parseFloat(formPayment) || 0;

    if (!formName.trim() || !Number.isFinite(principal) || principal <= 0 || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(payment) || payment <= 0) return;

    if (editingLoan) {
      const updated = loans.map((l) =>
        l.id === editingLoan.id
          ? {
              ...l,
              name: formName.trim(),
              lender: formLender.trim(),
              currentPrincipal: principal,
              interestRate: rate,
              monthlyPayment: payment,
            }
          : l
      );
      onUpdateLoans(updated);
    } else {
      const newLoan: LoanItem = {
        id: `loan_${Date.now()}`,
        name: formName.trim(),
        lender: formLender.trim(),
        originalAmount: principal,
        currentPrincipal: principal,
        interestRate: rate,
        monthlyPayment: payment,
        startDate: getTodayDateString(),
      };
      onUpdateLoans([...loans, newLoan]);
      setSelectedLoanId(newLoan.id);
    }

    setIsModalOpen(false);
  };

  const handleDeleteLoan = (id: string) => {
    if (confirm('Delete this loan?')) {
      const updated = loans.filter((l) => l.id !== id);
      onUpdateLoans(updated);
      if (selectedLoanId === id) {
        setSelectedLoanId(updated[0]?.id || '');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Global Debt Overview */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#F2F3F5] tracking-tight">Loans & Debt Payoff</h2>
              <p className="text-[10px] text-slate-500 dark:text-[#A5ACB7]">Track liabilities and early payoff schedule</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleOpenAdd}
              className="text-xs text-rose-600 dark:text-rose-400 hover:opacity-80 font-semibold flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Loan</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44]">
            <span className="text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider block">
              Total Outstanding Debt
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
              {formatINR(totalOutstanding)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-[#A5ACB7] mt-0.5 block">
              Across {loans.length} active loan{loans.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44]">
            <span className="text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider block">
              Monthly EMI Commitment
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-[#F2F3F5] mt-1 block">
              {formatINR(totalMonthlyEMI)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-[#A5ACB7] mt-0.5 block">
              Due each month
            </span>
          </div>
        </div>
      </div>

      {/* 2. Select Loan to Predict */}
      {loans.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <TrendingDown className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-[#F2F3F5]">No Loans Tracked</h3>
          <p className="text-xs text-slate-500 dark:text-[#A5ACB7] max-w-xs mx-auto">
            Add a loan or mortgage to calculate early payoff dates, interest savings, and simulate extra monthly prepayments.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold shadow-sm transition-all"
          >
            + Add Your First Loan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {loans.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLoanId(l.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border shrink-0 flex items-center gap-2 ${
                  l.id === activeLoan?.id
                    ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/50 shadow-sm'
                    : 'bg-white dark:bg-[#1B1E22] border-[#E8E1DB] dark:border-[#363B44] text-slate-600 dark:text-[#A5ACB7] hover:text-slate-900 dark:hover:text-[#F2F3F5]'
                }`}
              >
                <span>{l.name}</span>
                <span className="text-[10px] font-normal opacity-75">({formatINR(l.currentPrincipal)})</span>
              </button>
            ))}
          </div>

          {activeLoan && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm space-y-6">
              {/* Active Loan Details Header */}
              <div className="flex items-center justify-between border-b border-[#E8E1DB] dark:border-[#363B44] pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F2F3F5] tracking-tight">{activeLoan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#A5ACB7]">
                    Lender: {activeLoan.lender || 'Bank'} • Interest: {activeLoan.interestRate}% p.a.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenEdit(activeLoan)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-[#1B1E22] hover:bg-slate-200 dark:hover:bg-[#363C3A] text-slate-600 dark:text-[#FF927A] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Payoff Prediction Big Display */}
              {calculation && calculation.isValid ? (
                <div className="space-y-6">
                  {/* Debt-free Announcement */}
                  <div className="p-4 rounded-2xl bg-[#FDF4E7] dark:bg-[#1B1E22] border border-[#F5DEBE] dark:border-[#363B44] flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#996520] dark:text-[#FF927A] uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Debt-Free Target Date
                      </span>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F2F3F5]">
                        {calculation.payoffDateStr}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-[#A5ACB7]">
                        Total time remaining: <strong className="text-slate-800 dark:text-[#F2F3F5]">{calculation.durationText}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 dark:text-[#A5ACB7] block uppercase font-bold">Total Interest</span>
                      <span className="text-base font-bold text-rose-600 dark:text-rose-400">{formatINR(calculation.totalInterest)}</span>
                    </div>
                  </div>

                  {/* Simulator Slider: "What if you pay extra?" */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-[#EF6448]">
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Payoff Accelerator Simulator</span>
                      </div>
                      <span className="text-xs font-black text-[#EF6448] px-2.5 py-1 rounded-lg bg-[#EF6448]/15 border border-[#EF6448]/30">
                        +{formatINR(extraPayment)} / mo
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="range"
                        min="0"
                        max="15000"
                        step="500"
                        value={extraPayment}
                        onChange={(e) => setExtraPayment(parseFloat(e.target.value))}
                        className="w-full cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-[#A5ACB7] font-medium px-0.5">
                        <span>+₹0</span>
                        <span>+₹7,500</span>
                        <span>+₹15,000 / mo</span>
                      </div>
                    </div>

                    {extraPayment > 0 && calculation.monthsSaved > 0 && (
                      <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] text-xs text-slate-700 dark:text-[#F2F3F5] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 animate-fadeIn">
                        <span>⚡ You become debt-free <strong className="text-[#EF6448]">{calculation.monthsSaved} months sooner</strong></span>
                        <span className="text-[#EF6448] font-bold">Save {formatINR(calculation.interestSaved)}</span>
                      </div>
                    )}
                  </div>

                  {/* Metric Breakdown Table */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44]">
                      <span className="text-[10px] text-slate-500 dark:text-[#A5ACB7] block uppercase font-medium">Principal</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-[#F2F3F5]">{formatINR(activeLoan.currentPrincipal)}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44]">
                      <span className="text-[10px] text-slate-500 dark:text-[#A5ACB7] block uppercase font-medium">Total Interest</span>
                      <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">{formatINR(calculation.totalInterest)}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44]">
                      <span className="text-[10px] text-slate-500 dark:text-[#A5ACB7] block uppercase font-medium">Total Paid</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F2F3F5]">{formatINR(calculation.totalPayment)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                  {calculation?.error || 'Unable to calculate payoff schedule.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal for adding/editing loan */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 flex items-center justify-center animate-fadeIn">
          <div className="w-full max-w-md max-h-[88vh] overflow-y-auto my-auto bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E1DB] dark:border-[#363B44] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#F2F3F5]">
                {editingLoan ? 'Edit Loan' : 'Add New Loan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-[#F2F3F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                  Loan Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Personal Loan, Car Loan, Tech Loan..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F2F3F5]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                  Lender / Bank
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI, ICICI..."
                  value={formLender}
                  onChange={(e) => setFormLender(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F2F3F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                    Current Principal (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={formPrincipal}
                    onChange={(e) => setFormPrincipal(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                    Interest Rate (% p.a.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 10.5"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                  Monthly Payment (EMI) (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 4500"
                  value={formPayment}
                  onChange={(e) => setFormPayment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] font-bold"
                  required
                />
              </div>

              <div className="pt-2 flex justify-between">
                {editingLoan && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteLoan(editingLoan.id);
                      setIsModalOpen(false);
                    }}
                    className="text-rose-500 hover:text-rose-600 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 dark:text-[#A5ACB7] text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold shadow-sm transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
