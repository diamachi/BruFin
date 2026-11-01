import React from 'react';
import { LayoutDashboard, ReceiptText, Plus, CreditCard, TrendingUp } from 'lucide-react';
import { ViewTab } from '../types';

interface Props {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onOpenQuickAdd: () => void;
}

export const BottomNav: React.FC<Props> = ({ activeTab, onTabChange, onOpenQuickAdd }) => {
  const isExpensesActive = activeTab === 'expenses' || activeTab === 'transactions';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-auto">
      <div
        className="max-w-md mx-auto px-4 pt-1"
        style={{
          paddingBottom: 'calc(var(--app-safe-bottom, 0px) + 0.75rem)',
        }}
      >
        <nav className="relative bg-white/98 dark:bg-[#22252A]/98 border border-[#FED7B8] dark:border-[#363B44] rounded-3xl shadow-xl dark:shadow-[0_8px_30px_rgba(0,0,0,0.7)] px-2 py-1.5 grid grid-cols-2 items-center transition-colors">
          {/* Left Half: Monitor & Expenses */}
          <div className="flex items-center justify-around pr-7">
            {/* 1. Monitor */}
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-[#EF6448] font-bold'
                  : 'text-slate-500/70 dark:text-[#A5ACB7] hover:text-[#EF6448] dark:hover:text-[#F2F3F5]'
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 transition-transform ${activeTab === 'dashboard' ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-1 font-semibold">Monitor</span>
            </button>

            {/* 2. Expenses */}
            <button
              onClick={() => onTabChange('expenses')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 cursor-pointer ${
                isExpensesActive
                  ? 'text-[#EF6448] font-bold'
                  : 'text-slate-500/70 dark:text-[#A5ACB7] hover:text-[#EF6448] dark:hover:text-[#F2F3F5]'
              }`}
            >
              <ReceiptText className={`w-5 h-5 transition-transform ${isExpensesActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-1 font-semibold">Expenses</span>
            </button>
          </div>

          {/* Absolute Center FAB: Mathematically dead-centered on the nav pill */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-20 pointer-events-auto">
            <button
              onClick={onOpenQuickAdd}
              className="w-14 h-14 rounded-full bg-[#EF6448] hover:bg-[#E05338] text-white shadow-xl shadow-[#EF6448]/35 hover:scale-105 active:scale-95 transition-all flex items-center justify-center border-4 border-white dark:border-[#202322] cursor-pointer"
              title="Add Expense or Income"
            >
              <Plus className="w-7 h-7 stroke-[3.5] text-white" />
            </button>
          </div>

          {/* Right Half: Cards & Invest */}
          <div className="flex items-center justify-around pl-7">
            {/* 3. Cards */}
            <button
              onClick={() => onTabChange('cards')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'cards'
                  ? 'text-[#EF6448] font-bold'
                  : 'text-slate-500/70 dark:text-[#A5ACB7] hover:text-[#EF6448] dark:hover:text-[#F2F3F5]'
              }`}
            >
              <CreditCard className={`w-5 h-5 transition-transform ${activeTab === 'cards' ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-1 font-semibold">Cards</span>
            </button>

            {/* 4. Invest */}
            <button
              onClick={() => onTabChange('investments')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'investments'
                  ? 'text-[#EF6448] font-bold'
                  : 'text-slate-500/70 dark:text-[#A5ACB7] hover:text-[#EF6448] dark:hover:text-[#F2F3F5]'
              }`}
            >
              <TrendingUp className={`w-5 h-5 transition-transform ${activeTab === 'investments' ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-1 font-semibold">Invest</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};
