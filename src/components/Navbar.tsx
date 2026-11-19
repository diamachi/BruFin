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
  syncLabel?: string;
  syncState?: 'local' | 'setup' | 'syncing' | 'connected' | 'offline' | 'conflict';
  children?: React.ReactNode;
}

/**
 * BruFin brand mark.
 */
export const BruFinLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <div
    className={`relative ${className} rounded-2xl bg-[var(--brufin-accent-bg)] dark:bg-[#292D34] p-1.5 flex items-center justify-center shadow-sm border border-white/25 dark:border-[#434852] text-white dark:text-[var(--brufin-accent-ink)] shrink-0 select-none transition-transform hover:scale-105`}
  >
    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M178 96c-22 36 18 53-3 88M256 76c-22 39 20 58-2 101M334 96c-22 36 18 53-3 88" strokeWidth="27" />
        <path d="M352 218h41c35 0 54 24 54 57s-19 57-54 57h-50" strokeWidth="29" />
        <path d="M122 205h246v55c0 70-44 112-123 112s-123-42-123-112v-55Z" fill="currentColor" strokeWidth="12" />
        <path d="M116 409h282" strokeWidth="30" />
      </g>
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
  syncLabel = 'Local',
  syncState = 'local',
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
        <div className="max-w-7xl mx-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-2">
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
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label={`Server sync status: ${syncLabel}. Open settings.`}
                className={`${syncState === 'local' ? 'hidden sm:inline-flex' : 'inline-flex'} items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border border-[#E8E1DB] dark:border-[#363B44] hover:ring-2 hover:ring-[var(--brufin-accent-ink)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brufin-accent-ink)]/50 ${
                syncState === 'connected' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                syncState === 'offline' || syncState === 'conflict' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                'bg-[var(--brufin-accent-soft)] dark:bg-[var(--brufin-accent-active)]/15 text-[var(--brufin-accent-ink)]'
              }`} title={`Server sync: ${syncLabel}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${syncState === 'connected' ? 'bg-emerald-500' : syncState === 'syncing' ? 'bg-amber-500 animate-pulse' : syncState === 'offline' || syncState === 'conflict' ? 'bg-amber-500' : 'bg-[var(--brufin-accent-bg)]'}`} />
                <span className={syncState === 'local' ? '' : 'hidden sm:inline'}>{syncLabel}</span>
              </button>
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
              className="flex h-[34px] w-[120px] items-center gap-1.5 rounded-xl border border-[#E8E1DB] bg-white/95 px-2 text-left text-[11px] font-semibold text-slate-800 shadow-sm transition-colors hover:border-[#D8C8BC] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brufin-accent-ink)]/50 dark:border-[#363B44] dark:bg-[#22252A] dark:text-[#F2F3F5] dark:hover:border-[#4A505A] dark:hover:bg-[#2B3037] sm:h-[36px] sm:w-[152px] sm:gap-2 sm:px-2.5 sm:text-xs"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--brufin-accent-ink)]" />
              <span className="min-w-0 flex-1 truncate">{formatMonthYearShort(selectedMonth)}</span>
              <ChevronDown className={`h-3 w-3 shrink-0 text-[var(--brufin-accent-ink)] transition-transform duration-200 ${isMonthMenuOpen ? 'rotate-180' : ''}`} />
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
                        ? 'bg-[var(--brufin-accent-selected)] font-bold text-[var(--brufin-accent-ink)] dark:bg-[var(--brufin-accent-active)]/20 dark:text-[var(--brufin-accent-ink)]'
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
                              ? 'bg-[var(--brufin-accent-selected)] font-bold text-[var(--brufin-accent-ink)] dark:bg-[var(--brufin-accent-active)]/20 dark:text-[var(--brufin-accent-ink)]'
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
              className="p-1.5 sm:p-2 rounded-xl bg-white/95 dark:bg-[#22252A] text-slate-600 dark:text-[var(--brufin-accent-ink)] hover:text-[var(--brufin-accent-ink)] dark:hover:text-[#F2F3F5] border border-[#E8E1DB] dark:border-[#363B44] hover:border-[var(--brufin-accent-border)] transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 sm:p-2 rounded-xl bg-white/95 dark:bg-[#22252A] text-slate-600 dark:text-[var(--brufin-accent-ink)] hover:text-[var(--brufin-accent-ink)] dark:hover:text-[#F2F3F5] border border-[#E8E1DB] dark:border-[#363B44] hover:border-[var(--brufin-accent-border)] transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--brufin-accent-ink)] hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* Settings / Data Hub */}
          <button
            onClick={onOpenSettings}
            title="Settings & Backup"
            className="p-1.5 sm:p-2 rounded-xl bg-white/95 dark:bg-[#22252A] text-slate-600 dark:text-[var(--brufin-accent-ink)] hover:text-[var(--brufin-accent-ink)] dark:hover:text-[#F2F3F5] border border-[#E8E1DB] dark:border-[#363B44] hover:border-[var(--brufin-accent-border)] transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
      </div>
    </header>
  );
};
