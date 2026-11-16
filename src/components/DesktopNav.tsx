import React from 'react';
import {
  Banknote, CreditCard, LayoutDashboard, Plus, ReceiptText, Settings, TrendingUp, Wallet,
} from 'lucide-react';
import { ViewTab } from '../types';
import { BruFinLogo } from './Navbar';

interface Props {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onOpenQuickAdd: () => void;
  onOpenSettings: () => void;
}

const items: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'balances', label: 'Balances', icon: Wallet },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'investments', label: 'Investments & loans', icon: Banknote },
];

export const DesktopNav: React.FC<Props> = ({ activeTab, onTabChange, onOpenQuickAdd, onOpenSettings }) => (
  <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#E8E1DB] bg-[#F7F6F3] px-4 py-6 dark:border-[#363B44] dark:bg-[#17191C] lg:flex">
    <div className="mb-8 flex items-center gap-3 px-2">
      <BruFinLogo className="h-10 w-10" />
      <div>
        <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-[#F2F3F5]">BruFin</h1>
        <p className="text-[10px] font-medium text-slate-500 dark:text-[#A5ACB7]">Brewing calm finances</p>
      </div>
    </div>
    <button onClick={onOpenQuickAdd} className="mb-6 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#EF6448] text-sm font-bold text-white shadow-md shadow-[#EF6448]/20 transition hover:bg-[#E05338] active:scale-[0.98]">
      <Plus className="h-4 w-4" /> Add transaction
    </button>
    <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Workspace</p>
    <nav aria-label="Main navigation" className="space-y-1">
      {items.map(({ id, label, icon: Icon }) => {
        const selected = activeTab === id || (id === 'investments' && activeTab === 'loans');
        return (
          <button key={id} onClick={() => onTabChange(id)} aria-current={selected ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${selected ? 'bg-[#FCE8DE] text-[#B84E3B] dark:bg-[#B84E3B]/20 dark:text-[#FF927A]' : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#22252A] dark:hover:text-white'}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
    <div className="mt-auto rounded-2xl border border-[#E8E1DB] bg-white/80 p-3 dark:border-[#363B44] dark:bg-[#22252A]">
      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Private by design</p>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">Your records stay on this device or your BruFin server.</p>
      <button onClick={onOpenSettings} className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-slate-500 transition hover:text-[#EF6448] dark:text-slate-400">
        <Settings className="h-3.5 w-3.5" /> Settings
      </button>
    </div>
  </aside>
);
