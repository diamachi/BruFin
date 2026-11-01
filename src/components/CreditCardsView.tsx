import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CreditCard as CardIcon,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { Transaction, CreditCard } from '../types';
import { formatINR, formatDateLabel, getCurrentMonthKey } from '../utils/dateUtils';
import { getCategoryMeta } from '../utils/categories';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  creditCards: CreditCard[];
  transactions: Transaction[];
  selectedMonth: string;
  onEditTransaction: (t: Transaction) => void;
  onUpdateCreditCards: (cards: CreditCard[]) => void;
}

const COLOR_PRESETS = [
  { name: 'Wine Velvet', colorHex: '#59171B', gradient: 'from-[#59171B] via-[#7B2028] to-[#FED7B8]', pastelBg: 'bg-[#F7F6F3] text-[#59171B] border-[#E8E1DB]', pastelText: 'text-[#59171B]', pastelBorder: 'border-[#E8E1DB]' },
  { name: 'Peach Blush', colorHex: '#FED7B8', gradient: 'from-[#FED7B8] via-[#F8C197] to-[#59171B]', pastelBg: 'bg-[#FED7B8] text-[#59171B] border-[#59171B]', pastelText: 'text-[#59171B]', pastelBorder: 'border-[#59171B]' },
  { name: 'Espresso Mocha', colorHex: '#1F1C19', gradient: 'from-[#2E2822] via-[#1F1C19] to-[#141210]', pastelBg: 'bg-[#2E2822] text-[#FED7B8] border-[#38322B]', pastelText: 'text-[#FED7B8]', pastelBorder: 'border-[#38322B]' },
  { name: 'Honey Gold', colorHex: '#B87B2E', gradient: 'from-[#B87B2E] via-[#D49544] to-[#26211C]', pastelBg: 'bg-[#FDF4E7] text-[#996520] border-[#F5DEBE]', pastelText: 'text-[#996520]', pastelBorder: 'border-[#B87B2E]' },
  { name: 'Amber Roast', colorHex: '#D97706', gradient: 'from-amber-600 via-yellow-700 to-amber-950', pastelBg: 'bg-amber-50 text-amber-950 border-amber-200/80', pastelText: 'text-amber-900', pastelBorder: 'border-amber-300' },
  { name: 'Hazelnut', colorHex: '#7D5A40', gradient: 'from-[#7D5A40] via-[#5C3E29] to-[#141210]', pastelBg: 'bg-[#F8F1EB] text-[#5C3E29] border-[#D9C6B8]', pastelText: 'text-[#5C3E29]', pastelBorder: 'border-[#7D5A40]' },
];

export const CreditCardsView: React.FC<Props> = ({
  creditCards,
  transactions,
  selectedMonth,
  onEditTransaction,
  onUpdateCreditCards,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCardPickerOpen, setIsCardPickerOpen] = useState(false);
  const cardPickerRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [formBank, setFormBank] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formLast4, setFormLast4] = useState('');
  const [formLimit, setFormLimit] = useState('');
  const [formStatementDay, setFormStatementDay] = useState('20');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Calculate card stats
  const cardStats = useMemo(() => {
    return creditCards.map((card) => {
      const today = new Date();
      const [selectedYear, selectedMonthNumber] = (selectedMonth === 'All' ? getCurrentMonthKey() : selectedMonth).split('-').map(Number);
      const selectedIsCurrent = selectedMonth === 'All';
      const statementMonthDate = selectedIsCurrent && today.getDate() <= card.statementDay
        ? new Date(today.getFullYear(), today.getMonth() - 1, 1)
        : new Date(selectedYear, selectedMonthNumber - 1, 1);
      const statementYear = statementMonthDate.getFullYear();
      const statementMonthIndex = statementMonthDate.getMonth();
      const endDay = Math.min(card.statementDay, new Date(statementYear, statementMonthIndex + 1, 0).getDate());
      const end = new Date(statementYear, statementMonthIndex, endDay);
      const priorStatementDay = Math.min(card.statementDay, new Date(statementYear, statementMonthIndex, 0).getDate());
      const start = new Date(statementYear, statementMonthIndex - 1, priorStatementDay);
      start.setDate(start.getDate() + 1);
      const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const cycleStart = dateKey(start);
      const cycleEnd = dateKey(end);
      const cardExpenses = transactions.filter((t) => {
        const matchesMonth = !!t.date && t.date >= cycleStart && t.date <= cycleEnd;
        const modeLower = (t.paymentMode || '').toLowerCase();
        const shortLower = card.shortName.toLowerCase();
        const nameLower = card.name.toLowerCase();
        const matchesMode =
          modeLower.includes(shortLower) ||
          modeLower.includes(nameLower) ||
          (card.shortName === 'OneCard' && modeLower.includes('onecard')) ||
          (card.shortName === 'Federal Scapia' && modeLower.includes('scapia'));
        return matchesMonth && matchesMode && t.type === 'Expense';
      });

      const spent = cardExpenses.reduce((sum, t) => sum + t.amount, 0);
      const remaining = Math.max(0, card.limit - spent);
      const utilization = card.limit > 0 ? (spent / card.limit) * 100 : 0;

      return {
        ...card,
        spent,
        remaining,
        utilization,
        expenses: cardExpenses,
        cycleStart,
        cycleEnd,
      };
    });
  }, [creditCards, transactions, selectedMonth]);

  // Keep index in valid bounds
  const safeIndex = cardStats.length > 0 ? Math.min(currentIndex, cardStats.length - 1) : 0;
  const activeCard = cardStats[safeIndex];

  useEffect(() => {
    if (!isCardPickerOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!cardPickerRef.current?.contains(event.target as Node)) setIsCardPickerOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCardPickerOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCardPickerOpen]);

  const handlePrev = () => {
    if (cardStats.length === 0) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cardStats.length - 1));
  };

  const handleNext = () => {
    if (cardStats.length === 0) return;
    setCurrentIndex((prev) => (prev < cardStats.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleOpenAdd = () => {
    setEditingCard(null);
    setFormBank('');
    setFormShortName('');
    setFormLast4('');
    setFormLimit('');
    setFormStatementDay('20');
    setSelectedColor(COLOR_PRESETS[0]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (card: CreditCard) => {
    setEditingCard(card);
    setFormBank(card.bank);
    setFormShortName(card.shortName);
    setFormLast4(card.last4);
    setFormLimit(card.limit ? card.limit.toString() : '');
    setFormStatementDay(card.statementDay ? card.statementDay.toString() : '20');
    const matchedColor = COLOR_PRESETS.find(c => c.colorHex === card.colorHex) || COLOR_PRESETS[0];
    setSelectedColor(matchedColor);
    setIsModalOpen(true);
  };

  const handleDeleteCard = (card: CreditCard) => {
    const confirmMsg = `Remove ${card.shortName}? This will also remove it from the payment options in expenses.`;
    if (confirm(confirmMsg)) {
      const updated = creditCards.filter((c) => c.id !== card.id);
      onUpdateCreditCards(updated);
      if (currentIndex >= updated.length) {
        setCurrentIndex(Math.max(0, updated.length - 1));
      }
    }
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    const shortNameClean = formShortName.trim();
    const bankClean = formBank.trim() || 'Bank';
    const limitNum = parseFloat(formLimit) || 100000;
    const stmtDayNum = parseInt(formStatementDay) || 20;
    const last4Clean = formLast4.trim().replace(/\D/g, '').slice(-4) || '0000';

    if (!shortNameClean) return;

    if (editingCard) {
      const updated = creditCards.map((c) =>
        c.id === editingCard.id
          ? {
              ...c,
              name: `Credit Card - ${shortNameClean}`,
              shortName: shortNameClean,
              bank: bankClean,
              last4: last4Clean,
              limit: limitNum,
              statementDay: stmtDayNum,
              colorHex: selectedColor.colorHex,
              gradient: selectedColor.gradient,
              pastelBg: selectedColor.pastelBg,
              pastelText: selectedColor.pastelText,
              pastelBorder: selectedColor.pastelBorder,
            }
          : c
      );
      onUpdateCreditCards(updated);
    } else {
      const newCard: CreditCard = {
        id: `card_${Date.now()}`,
        name: `Credit Card - ${shortNameClean}`,
        shortName: shortNameClean,
        bank: bankClean,
        last4: last4Clean,
        limit: limitNum,
        statementDay: stmtDayNum,
        colorHex: selectedColor.colorHex,
        gradient: selectedColor.gradient,
        pastelBg: selectedColor.pastelBg,
        pastelText: selectedColor.pastelText,
        pastelBorder: selectedColor.pastelBorder,
      };
      const updated = [...creditCards, newCard];
      onUpdateCreditCards(updated);
      setCurrentIndex(updated.length - 1);
    }

    setIsModalOpen(false);
  };

  const totalSpentAcrossAll = cardStats.reduce((sum, c) => sum + c.spent, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Overview Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#F2F3F5] tracking-tight">Credit Cards</h2>
            <p className="text-[11px] text-slate-500 dark:text-[#A5ACB7]">
              Total Spend: <strong className="text-slate-800 dark:text-[#FF927A]">{formatINR(totalSpentAcrossAll)}</strong> ({selectedMonth === 'All' ? 'All Time' : selectedMonth})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {cardStats.length > 0 && (
            <span className="text-[11px] text-slate-400 dark:text-[#A5ACB7] font-mono">
              {safeIndex + 1} / {cardStats.length}
            </span>
          )}
          <button
            onClick={handleOpenAdd}
            className="px-3 py-1.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold shadow-sm flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Card</span>
          </button>
        </div>
      </div>

      {/* 2. Empty State if no cards exist */}
      {cardStats.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm space-y-3">
          <CardIcon className="w-12 h-12 text-slate-400 dark:text-[#FF927A]/60 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-[#F2F3F5]">No Credit Cards Added</h3>
          <p className="text-xs text-slate-500 dark:text-[#A5ACB7] max-w-xs mx-auto">
            Add your cards to track monthly limits, statement cycles, and have them automatically appear as payment options in expenses.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Add Your First Card
          </button>
        </div>
      ) : (
        /* 3. Single Swipable Card with Outline */
        activeCard && (
          <div className="space-y-3">
            {cardStats.length > 1 && (
              <div ref={cardPickerRef} className="relative z-20">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isCardPickerOpen}
                  onClick={() => setIsCardPickerOpen((open) => !open)}
                  className="w-full min-h-12 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm hover:border-[#EF6448]/60 dark:hover:border-[#EF6448]/60 transition-colors"
                >
                  <span className="min-w-0 flex items-center gap-3 text-left">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FDF4E7] dark:bg-[#EF6448]/15 text-[#996520] dark:text-[#FF927A] shrink-0">
                      <CardIcon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-[#F2F3F5] truncate">{activeCard.shortName}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-[#A5ACB7] truncate">{activeCard.bank} ···· {activeCard.last4}</span>
                    </span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-[#A5ACB7] shrink-0 transition-transform duration-200 ${isCardPickerOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCardPickerOpen && (
                  <div
                    role="listbox"
                    aria-label="Choose a credit card"
                    className="absolute left-0 right-0 top-full mt-2 p-1.5 rounded-2xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-xl shadow-slate-900/10 dark:shadow-black/30 animate-fadeIn"
                  >
                    {cardStats.map((card, index) => {
                      const isSelected = card.id === activeCard.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setCurrentIndex(index);
                            setIsCardPickerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                            isSelected
                              ? 'bg-[#FDF4E7] dark:bg-[#EF6448]/15'
                              : 'hover:bg-slate-50 dark:hover:bg-[#2B3037]'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className={`block text-xs font-bold truncate ${isSelected ? 'text-[#996520] dark:text-[#FF927A]' : 'text-slate-800 dark:text-[#F2F3F5]'}`}>
                              {card.shortName}
                            </span>
                            <span className="block text-[10px] text-slate-500 dark:text-[#A5ACB7] truncate">{card.bank} ···· {card.last4}</span>
                          </span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#EF6448] shrink-0" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-full rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] p-6 shadow-md dark:shadow-2xl transition-all duration-300 backdrop-blur-md select-none"
            >
              {/* Top row: Name, Statement cycle & Actions */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-widest block">
                    {activeCard.bank}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F2F3F5] tracking-tight">
                    {activeCard.shortName}
                  </h3>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-[#FF927A] bg-[#F7F6F3] dark:bg-[#1B1E22] px-2.5 py-1 rounded-full border border-[#E8E1DB] dark:border-[#363B44]">
                    Stmt: {activeCard.statementDay}th
                  </span>
                  <button
                    onClick={() => handleOpenEdit(activeCard)}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#363C3A] text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F3F5] transition-colors"
                    title="Edit Card"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(activeCard)}
                    className="p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Remove Card"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Middle: Spent prominent number */}
              <div className="space-y-1 mb-6">
                <span className="text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider block">
                  Spent this cycle
                </span>
                <span className="block text-[10px] text-slate-400 dark:text-[#A5ACB7]">{formatDateLabel(activeCard.cycleStart)} – {formatDateLabel(activeCard.cycleEnd)}</span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-[#F2F3F5] tracking-tight">
                    {formatINR(activeCard.spent)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-[#A5ACB7] font-medium">
                    / {formatINR(activeCard.limit)} limit
                  </span>
                </div>
              </div>

              {/* Hairline Utilization Bar */}
              <div className="space-y-1.5 mb-5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-[#996520] dark:text-[#FF927A]">
                    {formatINR(activeCard.remaining)} Available
                  </span>
                  <span className="text-slate-500 dark:text-[#A5ACB7]">
                    {activeCard.utilization.toFixed(1)}% used
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#F7F6F3] dark:bg-[#1B1E22] rounded-full overflow-hidden border border-[#E8E1DB] dark:border-[#363B44]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      activeCard.utilization > 70
                        ? 'bg-rose-500'
                        : activeCard.utilization > 30
                        ? 'bg-[#4A3B28]'
                        : 'bg-[#B87B2E] dark:bg-[#B84E3B]'
                    }`}
                    style={{ width: `${Math.min(100, activeCard.utilization)}%` }}
                  />
                </div>
              </div>

              {/* Bottom: Card number mask */}
              <div className="flex justify-between items-center pt-2 border-t border-[#E8E1DB] dark:border-[#363B44] text-[11px] font-mono text-slate-500 dark:text-[#A5ACB7]">
                <span>•••• •••• •••• {activeCard.last4}</span>
                <span className="text-[10px] text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider font-sans">
                  {activeCard.expenses.length} transaction{activeCard.expenses.length !== 1 ? 's' : ''}
                </span>
              </div>

            </div>
          </div>
        )
      )}

      {/* 4. Filtered Transactions for this single active card */}
      {activeCard && (
        <div className="p-5 rounded-3xl bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
              {activeCard.shortName} Expenses
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-[#A5ACB7]">
              Total: {formatINR(activeCard.spent)}
            </span>
          </div>

          {activeCard.expenses.length === 0 ? (
            <div className="text-center py-8 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] text-xs text-slate-500 dark:text-[#A5ACB7]">
              No transactions recorded for this card in {selectedMonth === 'All' ? 'the log' : selectedMonth}.
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] divide-y divide-slate-200/80 dark:divide-[#363B44] overflow-hidden">
              {activeCard.expenses.map((t) => {
                const meta = getCategoryMeta(t.category);
                return (
                  <div
                    key={t.id}
                    onClick={() => onEditTransaction(t)}
                    className="p-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#363C3A]/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                      >
                        <CategoryIcon name={meta.icon} className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 dark:text-[#F2F3F5] truncate">
                          {t.description || t.category}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-[#A5ACB7]">
                          {formatDateLabel(t.date)} {t.remarks && `• ${t.remarks}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 shrink-0">
                      -{formatINR(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Modal to Add or Edit Credit Card */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 flex items-center justify-center animate-fadeIn">
          <div 
            className="w-full max-w-md max-h-[88vh] overflow-y-auto my-auto bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] rounded-3xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8E1DB] dark:border-[#363B44] pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F2F3F5]">
                  {editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#A5ACB7]">
                  Card will automatically be added to expenses payment options
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-[#F2F3F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                  Card Nickname / Display Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Millennia, SBI Cashback, Amex Gold"
                  value={formShortName}
                  onChange={(e) => setFormShortName(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                  Bank / Issuer
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI Card, ICICI, Axis"
                  value={formBank}
                  onChange={(e) => setFormBank(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                    Credit Limit (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={formLimit}
                    onChange={(e) => setFormLimit(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] font-bold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                    Statement Day (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="20"
                    value={formStatementDay}
                    onChange={(e) => setFormStatementDay(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-[#A5ACB7] uppercase tracking-wider mb-1">
                  Last 4 Digits
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 4521"
                  value={formLast4}
                  onChange={(e) => setFormLast4(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-[#F2F3F5] font-mono focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-between">
                {editingCard && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteCard(editingCard);
                      setIsModalOpen(false);
                    }}
                    className="text-rose-500 hover:text-rose-600 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Card</span>
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 dark:text-[#A5ACB7] text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-bold shadow-sm transition-all"
                  >
                    Save Card
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
