import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp,
  PieChart,
  Plus,
  Landmark,
  ShieldCheck,
  Building,
  Edit2,
  Trash2,
  X,
  Banknote,
  Calculator,
} from 'lucide-react';
import { InvestmentItem, InvestmentType, LoanItem } from '../types';
import { formatINR } from '../utils/dateUtils';
import { LoansView } from './LoansView';
import { MFReturnsCalculator } from './MFReturnsCalculator';

export type InvestSubTab = 'investments' | 'loans' | 'calculator';

interface Props {
  investments: InvestmentItem[];
  onUpdateInvestments: (items: InvestmentItem[]) => void;
  loans?: LoanItem[];
  onUpdateLoans?: (loans: LoanItem[]) => void;
  initialSubTab?: InvestSubTab;
  onOpenHelp?: () => void;
}

export const InvestmentsView: React.FC<Props> = ({
  investments,
  onUpdateInvestments,
  loans = [],
  onUpdateLoans = () => {},
  initialSubTab = 'investments',
  onOpenHelp,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<InvestSubTab>(initialSubTab);

  // Modal state for adding/editing investments
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvestmentItem | null>(null);
  const [formType, setFormType] = useState<InvestmentType>('mutual_fund');
  const [formName, setFormName] = useState('');
  const [formInstitution, setFormInstitution] = useState('');
  const [formInvested, setFormInvested] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formMaturity, setFormMaturity] = useState('');

  // Aggregate portfolio by type
  const mutualFunds = investments.filter((i) => i.type === 'mutual_fund');
  const fds = investments.filter((i) => i.type === 'fd');
  const pfs = investments.filter((i) => i.type === 'pf');
  const stocks = investments.filter((i) => i.type === 'stock');

  const totalPortfolioInvested = investments.reduce((sum, i) => sum + i.investedAmount, 0);

  // Handlers for manual investment updates
  const handleOpenAddModal = (type: InvestmentType) => {
    setEditingItem(null);
    setFormType(type);
    setFormName('');
    setFormInstitution('');
    setFormInvested('');
    setFormRate(type === 'fd' ? '7.1' : type === 'pf' ? '8.25' : '');
    setFormMaturity('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: InvestmentItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormName(item.name);
    setFormInstitution(item.institution || '');
    setFormInvested(item.investedAmount.toString());
    setFormRate(item.interestRate ? item.interestRate.toString() : '');
    setFormMaturity(item.maturityDate || '');
    setIsModalOpen(true);
  };

  const handleSaveInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    const invNum = parseFloat(formInvested) || 0;
    const rateNum = parseFloat(formRate) || undefined;

    if (!formName.trim()) return;

    if (editingItem) {
      const updated = investments.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              name: formName.trim(),
              institution: formInstitution.trim(),
              investedAmount: invNum,
              currentValue: invNum,
              interestRate: rateNum,
              maturityDate: formMaturity || undefined,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          : i
      );
      onUpdateInvestments(updated);
    } else {
      const newItem: InvestmentItem = {
        id: `inv_${Date.now()}`,
        type: formType,
        name: formName.trim(),
        institution: formInstitution.trim(),
        investedAmount: invNum,
        currentValue: invNum,
        interestRate: rateNum,
        maturityDate: formMaturity || undefined,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
      onUpdateInvestments([...investments, newItem]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteInvestment = (id: string) => {
    if (confirm('Delete this investment item?')) {
      onUpdateInvestments(investments.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub-Tab Navigation Switch: Investments vs Loans vs MF Returns Calc */}
      <div className="flex bg-[#FFF8F3] dark:bg-[#1C1F1E] p-1 rounded-2xl border border-[#FED7B8] dark:border-[#363C3A] shadow-sm gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('investments')}
          className={`flex-1 py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer min-w-0 ${
            activeSubTab === 'investments'
              ? 'bg-[#EF6448] text-white shadow-sm'
              : 'text-slate-500 dark:text-[#A0A8A5] hover:text-slate-900 dark:hover:text-[#F4F6F5]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Investments</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('loans')}
          className={`flex-1 py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer min-w-0 ${
            activeSubTab === 'loans'
              ? 'bg-[#EF6448] text-white shadow-sm'
              : 'text-slate-500 dark:text-[#A0A8A5] hover:text-slate-900 dark:hover:text-[#F4F6F5]'
          }`}
        >
          <Banknote className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Loans / EMI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('calculator')}
          className={`flex-1 py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer min-w-0 ${
            activeSubTab === 'calculator'
              ? 'bg-[#EF6448] text-white shadow-sm'
              : 'text-slate-500 dark:text-[#A0A8A5] hover:text-slate-900 dark:hover:text-[#F4F6F5]'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Estimate returns</span>
        </button>
      </div>

      {/* Sub-Tab 1: Investments Portfolio & Asset Breakdown */}
      {activeSubTab === 'investments' && (
        <div className="space-y-6 animate-fadeIn">
          {/* 1. Net Worth Portfolio Overview Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] shadow-sm space-y-3">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-[#FDF4E7] dark:bg-[#1C1F1E] text-[#EF6448] shrink-0">
                <TrendingUp className="w-5 h-5 text-[#EF6448]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-[#F4F6F5] tracking-tight truncate">
                  Total Portfolio Invested
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#A0A8A5] truncate">
                  Across {investments.length} active holdings in 4 asset classes
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8F3]/60 dark:bg-[#1C1F1E] border border-[#FED7B8] dark:border-[#363C3A]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-[#A0A8A5] uppercase tracking-wider block">
                Total Invested Capital
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#59171B] dark:text-[#EF6448] mt-1 block">
                {formatINR(totalPortfolioInvested)}
              </span>
            </div>
          </div>

          {/* 2. Asset Class Breakdown Cards */}
          <div className="space-y-4">
            {/* MUTUAL FUNDS SECTION */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-[#EF6448]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6F5] tracking-tight">Mutual Funds</h3>
                    <p className="text-[10px] text-slate-500 dark:text-[#A0A8A5]">{mutualFunds.length} active holdings</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAddModal('mutual_fund')}
                  className="text-xs text-[#EF6448] hover:opacity-80 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Fund</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#363C3A]">
                {mutualFunds.map((fund) => (
                  <div key={fund.id} className="py-2.5 px-2 hover:bg-slate-50/60 dark:hover:bg-[#363C3A]/30 rounded-2xl transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-[#F4F6F5] truncate">{fund.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-[#A0A8A5] mt-0.5 truncate">
                        {fund.institution || 'Mutual Fund'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2.5 shrink-0">
                      <span className="text-xs font-black text-slate-900 dark:text-[#F4F6F5]">
                        {formatINR(fund.investedAmount)}
                      </span>
                      <button onClick={() => handleOpenEditModal(fund)} className="text-slate-400 hover:text-[#EF6448] p-1 cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FIXED DEPOSITS SECTION */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Landmark className="w-4 h-4 text-[#EF6448]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6F5] tracking-tight">Fixed Deposits (FDs)</h3>
                    <p className="text-[10px] text-slate-500 dark:text-[#A0A8A5]">{fds.length} active deposits</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAddModal('fd')}
                  className="text-xs text-[#EF6448] hover:opacity-80 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add FD</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#363C3A]">
                {fds.map((fd) => (
                  <div key={fd.id} className="py-2.5 px-2 hover:bg-slate-50/60 dark:hover:bg-[#363C3A]/30 rounded-2xl transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-[#F4F6F5] truncate">{fd.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-[#A0A8A5] mt-0.5 truncate">
                        {fd.interestRate ? `${fd.interestRate}% p.a.` : 'Fixed Deposit'} {fd.maturityDate && `• Due ${fd.maturityDate}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2.5 shrink-0">
                      <span className="text-xs font-black text-slate-900 dark:text-[#F4F6F5]">
                        {formatINR(fd.investedAmount)}
                      </span>
                      <button onClick={() => handleOpenEditModal(fd)} className="text-slate-400 hover:text-[#EF6448] p-1 cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PROVIDENT FUND (PF / EPF / PPF) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-[#EF6448]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6F5] tracking-tight">Provident Fund (EPF / PPF)</h3>
                    <p className="text-[10px] text-slate-500 dark:text-[#A0A8A5]">Govt guaranteed retirement corpus</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAddModal('pf')}
                  className="text-xs text-[#EF6448] hover:opacity-80 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Update PF</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#363C3A]">
                {pfs.map((pf) => (
                  <div key={pf.id} className="py-2.5 px-2 hover:bg-slate-50/60 dark:hover:bg-[#363C3A]/30 rounded-2xl transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-[#F4F6F5] truncate">{pf.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-[#A0A8A5] mt-0.5 truncate">
                        {pf.interestRate || 8.25}% p.a. {pf.institution && `• ${pf.institution}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2.5 shrink-0">
                      <span className="text-xs font-black text-[#59171B] dark:text-[#EF6448]">
                        {formatINR(pf.investedAmount)}
                      </span>
                      <button onClick={() => handleOpenEditModal(pf)} className="text-slate-400 hover:text-[#EF6448] p-1 cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* STOCKS SECTION */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-[#EF6448]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6F5] tracking-tight">Direct Stocks & Equity</h3>
                    <p className="text-[10px] text-slate-500 dark:text-[#A0A8A5]">Currently ₹0 • Ready for future investments</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAddModal('stock')}
                  className="text-xs text-[#EF6448] hover:opacity-80 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stock</span>
                </button>
              </div>

              {stocks.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1C1F1E] border border-[#FED7B8] dark:border-[#363C3A] text-center space-y-1.5">
                  <p className="text-xs text-slate-700 dark:text-[#EF6448] font-medium">No direct stock holdings yet</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#A0A8A5]">
                    Total Stock Value: ₹0. When you purchase equities, tap "Add Stock" to track your portfolio.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#363C3A]">
                  {stocks.map((stock) => (
                    <div key={stock.id} className="py-2.5 px-2 hover:bg-slate-50/60 dark:hover:bg-[#363C3A]/30 rounded-2xl transition-colors flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-[#F4F6F5] truncate">{stock.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-[#A0A8A5] mt-0.5 truncate">
                          {stock.institution || 'Direct Equity'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2.5 shrink-0">
                        <span className="text-xs font-black text-slate-900 dark:text-[#F4F6F5]">
                          {formatINR(stock.investedAmount)}
                        </span>
                        <button onClick={() => handleOpenEditModal(stock)} className="text-slate-400 hover:text-[#EF6448] p-1 cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
    </div>
  )}

      {/* Sub-Tab 2: Loans & EMI Payoff Tracker */}
      {activeSubTab === 'loans' && (
        <div className="animate-fadeIn">
          <LoansView
            loans={loans}
            onUpdateLoans={onUpdateLoans}
            onNavigateToInvestments={() => setActiveSubTab('investments')}
            onOpenHelp={onOpenHelp}
          />
        </div>
      )}

      {/* Sub-Tab 3: Mutual Fund Compounding Returns Calculator */}
      {activeSubTab === 'calculator' && (
        <div className="animate-fadeIn">
          <MFReturnsCalculator
            onInvestNow={() => {
              setActiveSubTab('investments');
              handleOpenAddModal('mutual_fund');
            }}
          />
        </div>
      )}

      {/* MODAL FOR ADDING / EDITING INVESTMENTS */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 flex items-center justify-center animate-fadeIn">
          <div className="w-full max-w-md max-h-[88vh] overflow-y-auto my-auto bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#FED7B8] dark:border-[#363C3A] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6F5]">
                {editingItem ? 'Edit Investment' : `Add ${formType.replace('_', ' ').toUpperCase()}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-[#F4F6F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A0A8A5] uppercase tracking-wider mb-1">
                  Name / Scheme
                </label>
                <input
                  type="text"
                  placeholder="e.g. Parag Parikh Flexi Cap, HDFC Bank FD..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1C1F1E] border border-[#FED7B8] dark:border-[#363C3A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F4F6F5]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A0A8A5] uppercase tracking-wider mb-1">
                    Invested Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formInvested}
                    onChange={(e) => setFormInvested(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full bg-slate-50 dark:bg-[#1C1F1E] border border-[#FED7B8] dark:border-[#363C3A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F4F6F5] font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A0A8A5] uppercase tracking-wider mb-1">
                    Platform / Institution
                  </label>
                  <input
                    type="text"
                    value={formInstitution}
                    onChange={(e) => setFormInstitution(e.target.value)}
                    placeholder="e.g. Groww, Zerodha, HDFC"
                    className="w-full bg-slate-50 dark:bg-[#1C1F1E] border border-[#FED7B8] dark:border-[#363C3A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F4F6F5]"
                  />
                </div>
              </div>

              {(formType === 'fd' || formType === 'pf') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A0A8A5] uppercase tracking-wider mb-1">
                      Interest Rate (% p.a.)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={formRate}
                      onChange={(e) => setFormRate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1C1F1E] border border-[#FED7B8] dark:border-[#363C3A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F4F6F5]"
                    />
                  </div>
                  {formType === 'fd' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A0A8A5] uppercase tracking-wider mb-1">
                        Maturity Date
                      </label>
                      <input
                        type="date"
                        value={formMaturity}
                        onChange={(e) => setFormMaturity(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#1C1F1E] border border-[#FED7B8] dark:border-[#363C3A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-[#F4F6F5]"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-between">
                {editingItem && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteInvestment(editingItem.id);
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
                    className="px-4 py-2 rounded-xl text-slate-500 dark:text-[#A0A8A5] text-xs font-medium"
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
