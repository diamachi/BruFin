import React, { useEffect, useRef, useState } from 'react';
import { Settings, Calendar, Sun, Moon, ChevronDown, HelpCircle, Check } from 'lucide-react';
import { formatMonthYear, formatMonthYearShort } from '../utils/dateUtils';

interface Props {
  selectedMonth: string;
  availableMonths: string[];
  onSelectMonth: (month: string) => void;
  onOpenSettings: () => void;
  onOpenHelp?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onTapCoffee?: () => void;
  diagnosticsExpanded?: boolean;
  children?: React.ReactNode;
}

/**
 * BruFin brand mark.
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
  diagnosticsExpanded = false,
  children,
}) => {
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const monthMenuRef = useRef<HTMLDivElement>(null);
  const monthTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMonthMenuOpen) return;

    requestAnimationFrame(() => {
      monthMenuRef.current
        ?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]')
        ?.focus({ preventScroll: true });
    });

    const handlePointerDown = (event: PointerEvent) => {
      if (!monthMenuRef.current?.contains(event.target as Node)) setIsMonthMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMonthMenuOpen(false);
        monthTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMonthMenuOpen]);

  const monthsByYear = availableMonths.reduce<Record<string, string[]>>((groups, month) => {
    const year = month.slice(0, 4);
    (groups[year] ??= []).push(month);
    return groups;
  }, {});

  return (
    <header className="sticky top-0 z-30 w-full bg-[#F7F6F3] dark:bg-[#17191C] border-b border-[#E8E1DB] dark:border-[#363B44] transition-colors duration-200 shadow-[0_1px_15px_-4px_rgba(89,23,27,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
      <div
        className="px-3 sm:px-4"
        style={{
          paddingTop: 'calc(var(--app-safe-top, 0px) + 0.625rem)',
          paddingBottom: '0.625rem',
        }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-2">
        {/* Brand & Coffee Logo (tap coffee to toggle RAM/Storage diagnostics monitor) */}
        <div className="relative flex items-center space-x-1.5 sm:space-x-2.5 min-w-0 shrink">
          <button
            type="button"
            onClick={onTapCoffee}
            title={diagnosticsExpanded ? 'Collapse diagnostics monitor' : 'Expand diagnostics monitor'}
            aria-label={diagnosticsExpanded ? 'Collapse diagnostics monitor' : 'Expand diagnostics monitor'}
            aria-expanded={diagnosticsExpanded}
            aria-controls="diagnostics-dropdown"
            className="relative cursor-pointer active:scale-90 transition-transform focus:outline-none rounded-2xl"
          >
            <BruFinLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h1 className="font-black text-slate-900 dark:text-[#F2F3F5] text-base sm:text-lg leading-none tracking-tight flex items-center shrink-0">
                BruFin
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

          {children && (
            <div
              id="diagnostics-dropdown"
              aria-hidden={!diagnosticsExpanded}
              inert={!diagnosticsExpanded}
              className={`absolute left-0 top-full z-50 w-max max-w-[calc(100vw-1.5rem)] overflow-hidden pt-2 transition-[max-height,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                diagnosticsExpanded
                  ? 'max-h-40 translate-y-0 opacity-100'
                  : 'pointer-events-none max-h-0 -translate-y-1 opacity-0'
              }`}
            >
              <div className="rounded-2xl border border-[#E8E1DB]/90 bg-[#F7F6F3]/95 p-2.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:border-[#363B44]/90 dark:bg-[#202328]/95 dark:shadow-black/40">
                {children}
              </div>
            </div>
          )}
        </div>

        {/* Centered global month filter */}
        <div className="relative flex items-center justify-self-center" ref={monthMenuRef}>
            <button
              ref={monthTriggerRef}
              type="button"
              onClick={() => setIsMonthMenuOpen((open) => !open)}
              aria-label={`Filter by month, currently ${formatMonthYear(selectedMonth)}`}
              aria-haspopup="listbox"
              aria-expanded={isMonthMenuOpen}
              aria-controls="month-selector-listbox"
              className="flex h-[34px] w-[120px] items-center gap-1.5 rounded-xl border border-[#E8E1DB] bg-white/95 px-2 text-left text-[11px] font-semibold text-slate-800 shadow-sm transition-colors hover:border-[#D8C8BC] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF6448]/50 dark:border-[#363B44] dark:bg-[#22252A] dark:text-[#F2F3F5] dark:hover:border-[#4A505A] dark:hover:bg-[#2B3037] sm:h-[36px] sm:w-[152px] sm:gap-2 sm:px-2.5 sm:text-xs"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[#EF6448]" />
              <span className="min-w-0 flex-1 truncate">{formatMonthYearShort(selectedMonth)}</span>
              <ChevronDown className={`h-3 w-3 shrink-0 text-[#EF6448] transition-transform duration-200 ${isMonthMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <div
              id="month-selector-listbox"
              role="listbox"
              aria-label="Choose a month"
              aria-hidden={!isMonthMenuOpen}
              inert={!isMonthMenuOpen}
              onKeyDown={(event) => {
                if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                const options = Array.from(
                  monthMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []
                );
                if (!options.length) return;
                event.preventDefault();
                const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);
                const nextIndex = event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? options.length - 1
                    : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
                options[nextIndex].focus();
              }}
              className={`absolute right-0 top-full z-50 w-56 max-w-[calc(100vw-1.5rem)] overflow-hidden pt-2 transition-[max-height,opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
                isMonthMenuOpen
                  ? 'max-h-[min(70vh,24rem)] translate-y-0 opacity-100'
                  : 'pointer-events-none max-h-0 -translate-y-1 opacity-0'
              }`}
            >
              <div className="overflow-hidden rounded-2xl border border-[#E8E1DB] bg-[#F7F6F3]/95 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:border-[#363B44] dark:bg-[#202328]/95 dark:shadow-black/40">
                <div className="px-2.5 pb-1.5 pt-2 text-[9px] font-bold tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  FILTER BY MONTH
                </div>
                <div className="max-h-[min(60vh,20rem)] overflow-y-auto overscroll-contain scrollbar-none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedMonth === 'All'}
                    onClick={() => {
                      onSelectMonth('All');
                      setIsMonthMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                      selectedMonth === 'All'
                        ? 'bg-[#FCE8DE] font-bold text-[#B84E3B] dark:bg-[#B84E3B]/20 dark:text-[#FF927A]'
                        : 'font-medium text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-[#2B3037]'
                    }`}
                  >
                    <span>All Time</span>
                    {selectedMonth === 'All' && <Check className="h-3.5 w-3.5" />}
                  </button>

                  {Object.entries(monthsByYear).map(([year, months]) => (
                    <div key={year} role="group" aria-label={year}>
                      <div className="px-2.5 pb-1 pt-3 text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500">
                        {year}
                      </div>
                      {months.map((month) => (
                        <button
                          key={month}
                          type="button"
                          role="option"
                          aria-selected={selectedMonth === month}
                          onClick={() => {
                            onSelectMonth(month);
                            setIsMonthMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                            selectedMonth === month
                              ? 'bg-[#FCE8DE] font-bold text-[#B84E3B] dark:bg-[#B84E3B]/20 dark:text-[#FF927A]'
                              : 'font-medium text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-[#2B3037]'
                          }`}
                        >
                          <span>{formatMonthYear(month).replace(/\s+\d{4}$/, '')}</span>
                          {selectedMonth === month && <Check className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

        </div>

        {/* Right Controls: Page Guide, Light/Dark Toggle & Settings */}
        <div className="flex items-center justify-self-end gap-1 sm:gap-1.5 shrink-0">
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
    </header>
  );
};
