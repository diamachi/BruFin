import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  LayoutDashboard,
  Landmark,
  Receipt,
  TrendingDown,
  CreditCard,
  TrendingUp,
  Coins,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { ViewTab } from '../types';

interface PageHelpInfo {
  title: string;
  tagline: string;
  icon: React.ElementType;
  whatItDoes: string[];
  howToUse: string[];
  proTip: string;
}

const HELP_DATA: Record<string, PageHelpInfo> = {
  dashboard: {
    title: 'Monitor',
    tagline: 'Your overall financial cockpit for the month',
    icon: LayoutDashboard,
    whatItDoes: [
      'Summarizes total monthly spend against your preset budget target.',
      'Displays liquid cash & bank balances at the beginning and end of month.',
      'Shows credit card total usage, available limit, and pending bills.',
      'Highlights upcoming recurring bills that require settlement.',
    ],
    howToUse: [
      'Select any month from the top date picker to review historic performance.',
      'Set your monthly budget in Settings to see spend pacing.',
      'Tap on any card to dive directly into detailed sub-pages.',
    ],
    proTip: 'Keep your start-of-month and end-of-month liquid balances recorded so you can track actual savings rate.',
  },
  expenses: {
    title: 'Expenses',
    tagline: 'Log, filter, and track daily spending effortlessly',
    icon: Receipt,
    whatItDoes: [
      'Chronological list of all expenses with daily totals.',
      'Search instantly by description, category, or payment method.',
      'One-tap recurring bills section: post monthly bills with a single tap.',
    ],
    howToUse: [
      'Tap the center (+) button at the bottom of the screen to add an expense.',
      'Tap any expense card to view or edit details.',
      'Check off recurring bills at the beginning of each month with "Post All".',
    ],
    proTip: 'Use consistent merchant tags or descriptions to filter easily during monthly reviews.',
  },
  cards: {
    title: 'Credit Cards',
    tagline: 'Card balances, statement cycles, and limit health',
    icon: CreditCard,
    whatItDoes: [
      'Visual interactive credit cards matching your physical cards.',
      'Tracks total current limit vs available limit.',
      'Displays billing cycle, statement date, and due date countdowns.',
    ],
    howToUse: [
      'Tap "+ Add Card" to track a new credit card.',
      'Swipe or click card indicators to flip between cards.',
      'Record payments or adjust credit limits anytime via Edit.',
    ],
    proTip: 'Keep credit utilization under 30% of each card limit for a strong CIBIL score.',
  },
  investments: {
    title: 'Investments & Loans',
    tagline: 'Net worth building, portfolio assets, and debt elimination',
    icon: TrendingUp,
    whatItDoes: [
      'Tracks total invested capital across Mutual Funds, FDs, PF, and Stocks.',
      'Loans / EMI payoff accelerator: calculates debt-free date and interest saved.',
      'Mutual Fund compounding calculator: projects SIP & lumpsum wealth creation.',
    ],
    howToUse: [
      'Switch between Investments, Loans/EMI, and Estimate returns using the sub-tabs.',
      'Tap "+ Add Fund" or "+ Add FD" to record your principal invested amounts.',
      'Use the Loan Payoff Accelerator slider to see how extra EMI saves lakhs in interest.',
    ],
    proTip: 'Increasing monthly SIP by just 10% each year can more than double your 15-year final wealth.',
  },
  balances: {
    title: 'Bank & Cash Balances',
    tagline: 'Liquid cash reserves across checking accounts & wallets',
    icon: Landmark,
    whatItDoes: [
      'Tracks total opening and closing bank balances for each calendar month.',
      'Calculates real monthly net cash flow (inflow vs outflow).',
    ],
    howToUse: [
      'At the 1st of each month, record your opening bank balance.',
      'At the end of the month, update closing balances to confirm actual savings.',
    ],
    proTip: 'Reconciling opening and closing balances is the fastest way to detect untracked cash leakages.',
  },
  income: {
    title: 'Income Streams',
    tagline: 'Salary, freelance earnings, interest, and dividends',
    icon: Coins,
    whatItDoes: [
      'Records salary, bonuses, interest, cashback, and business revenue.',
      'Categorizes streams to measure active vs passive income share.',
    ],
    howToUse: [
      'Use Quick Add (+) and select "Income" to log salary or extra earnings.',
      'Filter income streams by source or payment method.',
    ],
    proTip: 'Aim to grow secondary and passive income streams to cover your fixed recurring bills.',
  },
};

interface Props {
  tab: ViewTab;
  isOpen: boolean;
  onClose: () => void;
}

export const PageHelpModal: React.FC<Props> = ({ tab, isOpen, onClose }) => {
  if (!isOpen) return null;

  const info = HELP_DATA[tab] || HELP_DATA.dashboard;
  const Icon = info.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFF8F3] dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#FED7B8] dark:border-[#363C3A] pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EF6448] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Icon className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F4F6F5] tracking-tight">
                  {info.title}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EF6448]/15 text-[#EF6448] border border-[#EF6448]/30">
                  Help & Guide
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#A0A8A5] mt-0.5 font-medium">
                {info.tagline}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-[#F4F6F5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: What this page does */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#EF6448] uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>What This Page Does</span>
          </h4>
          <ul className="space-y-1.5 bg-white/70 dark:bg-[#1C1F1E] p-3 rounded-2xl border border-[#FED7B8] dark:border-[#363C3A] text-xs text-slate-700 dark:text-[#E8DDD2]">
            {info.whatItDoes.map((item, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF6448] shrink-0 mt-1.5" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 2: How to use it */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#EF6448] uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>How to Use It</span>
          </h4>
          <ol className="space-y-2 bg-white/70 dark:bg-[#1C1F1E] p-3 rounded-2xl border border-[#FED7B8] dark:border-[#363C3A] text-xs text-slate-700 dark:text-[#F4F6F5]">
            {info.howToUse.map((step, idx) => (
              <li key={idx} className="flex items-start space-x-2.5">
                <span className="w-4 h-4 rounded-full bg-[#EF6448]/15 text-[#EF6448] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Section 3: Pro-tip */}
        <div className="p-3 rounded-2xl bg-[#FED7B8]/30 dark:bg-[#1C1F1E] border border-[#FED7B8] dark:border-[#363C3A] flex items-start space-x-2.5 text-xs">
          <Lightbulb className="w-4 h-4 text-[#EF6448] shrink-0 mt-0.5" />
          <p className="text-slate-800 dark:text-[#F4F6F5] leading-relaxed">
            <strong className="font-bold text-[#EF6448]">Pro Tip: </strong>
            {info.proTip}
          </p>
        </div>

        {/* Footer Close Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
