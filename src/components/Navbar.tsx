import React from 'react';
import { Settings, Calendar, Sun, Moon, ChevronDown, HelpCircle } from 'lucide-react';
import { formatMonthYear } from '../utils/dateUtils';

interface Props {
  selectedMonth: string;
  availableMonths: string[];
  onSelectMonth: (month: string) => void;
  onOpenSettings: () => void;
  onOpenHelp?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onTapCoffee?: () => void;
  children?: React.ReactNode;
}

/**
 * Bru Fin Brand Logo - Warm Wine & Peach / Espresso Mocha
 */
export const BruFinLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <div
    className={`relative ${className} rounded-2xl bg-gradient-to-br from-[#EF6448] via-[#E05338] to-[#FED7B8] dark:from-[#292D34] dark:via-[#202328] dark:to-[#17191C] p-1.5 flex items-center justify-center shadow-md shadow-[#EF6448]/20 dark:shadow-[#17191C]/80 border border-[#E8E1DB]/60 dark:border-[#363B44] text-white dark:text-[#FF927A] shrink-0 select-none transition-transform hover:scale-105`}
  >
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Steam Curves */}
      <path d="M11 5C10.5 7 12 8.5 11.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <path d="M16 4C15.5 6.2 17.5 7.8 16.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21 5C20.5 7 22 8.5 21.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      
      {/* Coffee Cup Body */}
      <path d="M8 12H24C24 12 24.5 21.5 16 21.5C7.5 21.5 8 12 8 12Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      
      {/* Cup Handle */}
      <path d="M23.5 14H25.5C27 14 28 15 28 16.5C28 18 27 19 25.5 19H22.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Saucer */}
      <path d="M7 24.5H25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
      
      {/* Embossed Rupee Sign */}
      <path d="M13.5 14.5H18.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13.5 16.2H18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M15 14.5V19.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M15 14.5C17.2 14.5 17.2 16.5 15 16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.2 17.5L18.2 19.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

export const Navbar: React.FC<Props> = ({
  selectedMonth,
  availableMonths,
  onSelectMonth,
  onOpenSettings,
  onOpenHelp,
  theme,
  onToggleTheme,
  onTapCoffee,
  children,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F7F6F3] dark:bg-[#17191C] border-b border-[#E8E1DB] dark:border-[#363B44] transition-colors duration-200 shadow-[0_1px_15px_-4px_rgba(89,23,27,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] w-full overflow-hidden">
      <div
        className="px-3 sm:px-4"
        style={{
          paddingTop: 'calc(var(--app-safe-top, 0px) + 0.625rem)',
          paddingBottom: '0.625rem',
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand & Coffee Logo (tap coffee to toggle RAM/Storage diagnostics monitor) */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0 shrink">
          <button
            type="button"
            onClick={onTapCoffee}
            title="Tap coffee to toggle Diagnostics Monitor (RAM & Storage)"
            aria-label="Toggle Diagnostics Monitor"
            className="cursor-pointer active:scale-90 transition-transform focus:outline-none rounded-2xl"
          >
            <BruFinLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h1 className="font-black text-slate-900 dark:text-[#F2F3F5] text-base sm:text-lg leading-none tracking-tight flex items-center shrink-0">
                <span>Bru</span>
                <span className="text-[#EF6448] ml-0.5">Fin</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#FED7B8] dark:bg-[#B84E3B]/15 text-[#EF6448] border border-[#E8E1DB] dark:border-[#EF6448]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF6448] mr-1 animate-pulse" />
                Local
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-[#A5ACB7] font-medium tracking-tight mt-0.5 truncate hidden xs:block">
              Brewing calm finances
            </p>
          </div>
        </div>

        {/* Right Controls: Month Filter, Page Guide, Light/Dark Toggle & Settings */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Month Selector Pill */}
          <div className="relative flex items-center shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#EF6448] absolute left-2 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="appearance-none bg-white/95 dark:bg-[#22252A] hover:bg-white dark:hover:bg-[#2B3037] text-slate-800 dark:text-[#F2F3F5] text-[11px] sm:text-xs font-semibold pl-6 pr-5 py-1.5 rounded-xl border border-[#E8E1DB] dark:border-[#363B44] focus:outline-none cursor-pointer transition-colors shadow-sm w-auto min-w-[100px]"
            >
              <option value="All">All Time</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthYear(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#EF6448] absolute right-1.5 pointer-events-none" />
          </div>

          {/* Page Help / Guide Button */}
          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              title="Page Guide & Tips"
              className="p-1.5 sm:p-2 rounded-xl bg-white/95 dark:bg-[#22252A] text-slate-600 dark:text-[#FF927A] hover:text-[#EF6448] dark:hover:text-[#F2F3F5] border border-[#E8E1DB] dark:border-[#363B44] hover:border-[#EF6448] transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 sm:p-2 rounded-xl bg-white/95 dark:bg-[#22252A] text-slate-600 dark:text-[#FF927A] hover:text-[#EF6448] dark:hover:text-[#F2F3F5] border border-[#E8E1DB] dark:border-[#363B44] hover:border-[#EF6448] transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EF6448] hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* Settings / Data Hub */}
          <button
            onClick={onOpenSettings}
            title="Settings & Backup"
            className="p-1.5 sm:p-2 rounded-xl bg-white/95 dark:bg-[#22252A] text-slate-600 dark:text-[#FF927A] hover:text-[#EF6448] dark:hover:text-[#F2F3F5] border border-[#E8E1DB] dark:border-[#363B44] hover:border-[#EF6448] transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
      </div>
      {children}
    </header>
  );
};
