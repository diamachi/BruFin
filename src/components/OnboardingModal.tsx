import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowRight, ShieldCheck, Database, Check } from 'lucide-react';
import { BruFinLogo } from './Navbar';

interface Props {
  isOpen: boolean;
  onSelectDemo: () => void;
  onSelectFresh: () => void;
}

export const OnboardingModal: React.FC<Props> = ({
  isOpen,
  onSelectDemo,
  onSelectFresh,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#272B2A] border border-[#FED7B8] dark:border-[#363C3A] rounded-3xl shadow-2xl p-6 space-y-6 animate-scaleUp">
        {/* App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-[#EF6448] text-white shadow-md mb-1">
            <BruFinLogo className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-[#F4F6F5] tracking-tight">
            Welcome to Bru Fin
          </h2>
          <p className="text-xs text-[#EF6448] font-medium">
            Brewing Calm Finances • Local-First & Private
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed pt-1">
            Your financial data stays 100% on this device. Choose how you would like to begin:
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Option 1: Demo Mode */}
          <button
            onClick={onSelectDemo}
            className="w-full p-4 rounded-2xl text-left bg-gradient-to-br from-[#FFF8F3] to-[#FDF4E7] dark:from-[#272B2A] dark:to-[#202322] border-2 border-[#EF6448] hover:shadow-lg transition-all group relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1 pr-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-[#EF6448]">
                    Explore with Demo Data
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#EF6448] text-white">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Pre-loads realistic sample transactions, cards, bank balances, and investments so you can test all features right away.
                </p>
                <p className="text-[10px] text-[#EF6448] font-semibold pt-1">
                  ✓ Delete sample data & start fresh anytime with 1 tap
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#EF6448] text-white flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform mt-0.5">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>

          {/* Option 2: Clean Slate */}
          <button
            onClick={onSelectFresh}
            className="w-full p-4 rounded-2xl text-left bg-white dark:bg-[#1C1F1E] border border-[#FED7B8] dark:border-[#363C3A] hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1 pr-3">
                <span className="text-sm font-bold text-slate-800 dark:text-[#F4F6F5] block">
                  Start Fresh (Empty Database)
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Start with a completely blank database to immediately begin logging your own personal accounts and expenses.
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1C1F1E] text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform mt-0.5">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        </div>

        {/* Privacy Note */}
        <div className="pt-2 border-t border-[#FED7B8]/70 dark:border-[#363C3A] flex items-center justify-center space-x-2 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Zero cloud tracking • Offline-first • Open source</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
