import { CreditCard, PaymentMethodItem } from '../types';

export const EXPENSE_CATEGORIES = [
  { name: 'Dining out / Food Delivery', icon: 'Utensils', color: '#EF6448', bg: 'bg-orange-50 dark:bg-[#EF6448]/15 text-orange-700 dark:text-[#EF6448]' },
  { name: 'Groceries', icon: 'ShoppingCart', color: '#8C6845', bg: 'bg-[#FDF6F0] dark:bg-[#1C1F1E] text-[#7A532E] dark:text-[#D4A373]' },
  { name: 'Rent / Maintenance', icon: 'Home', color: '#6E6259', bg: 'bg-[#FFF8F3] dark:bg-[#1C1F1E] text-slate-700 dark:text-[#F4F6F5]' },
  { name: 'Utilities - Electricity / Gas / Internet', icon: 'Zap', color: '#C28E58', bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' },
  { name: 'Commute', icon: 'Car', color: '#7D6B5C', bg: 'bg-[#F8F1EB] dark:bg-[#1C1F1E] text-[#635345] dark:text-[#A0A8A5]' },
  { name: 'Subscriptions', icon: 'Tv', color: '#8B5A70', bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300' },
  { name: 'Clothes / Accessories / Personal Items', icon: 'Sparkles', color: '#B86B77', bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300' },
  { name: 'Medical', icon: 'HeartPulse', color: '#B05A5A', bg: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' },
  { name: 'Gifts', icon: 'Gift', color: '#A85A48', bg: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300' },
  { name: 'Travel', icon: 'Plane', color: '#A65B2E', bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' },
  { name: 'Insurance', icon: 'ShieldCheck', color: '#7D7065', bg: 'bg-[#FFF8F3] dark:bg-[#1C1F1E] text-slate-700 dark:text-[#F4F6F5]' },
  { name: 'Loan EMI', icon: 'BadgePercent', color: '#EF6448', bg: 'bg-[#FED7B8]/40 dark:bg-[#EF6448]/15 text-[#EF6448]' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#78716C', bg: 'bg-stone-100 dark:bg-[#1C1F1E] text-stone-700 dark:text-stone-300' },
];

export const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#EF6448', bg: 'bg-[#FDF4E7] dark:bg-[#EF6448]/15 text-[#996520] dark:text-[#EF6448]' },
  { name: 'Cashback / Refunds', icon: 'RefreshCw', color: '#C47D52', bg: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300' },
  { name: 'Interest', icon: 'TrendingUp', color: '#EF6448', bg: 'bg-[#FDF4E7] dark:bg-[#EF6448]/15 text-[#996520] dark:text-[#EF6448]' },
  { name: 'Dividend', icon: 'Award', color: '#C28E58', bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' },
  { name: 'Gifts', icon: 'Gift', color: '#B86B77', bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#78716C', bg: 'bg-stone-100 dark:bg-[#1C1F1E] text-stone-700 dark:text-stone-300' },
];

export const DEFAULT_BASE_PAYMENT_MODES: PaymentMethodItem[] = [
  { id: 'pm_upi', name: 'UPI', type: 'digital', icon: 'Smartphone' },
  { id: 'pm_debit', name: 'Debit Card', type: 'bank', icon: 'CreditCard' },
  { id: 'pm_cash', name: 'Cash', type: 'cash', icon: 'Banknote' },
  { id: 'pm_netbanking', name: 'Net Banking', type: 'bank', icon: 'Landmark' },
  { id: 'pm_other', name: 'Other', type: 'other', icon: 'HelpCircle' }
];

export function getPaymentModes(creditCards?: CreditCard[], baseMethods?: PaymentMethodItem[]) {
  const base = (baseMethods && baseMethods.length > 0) ? baseMethods : DEFAULT_BASE_PAYMENT_MODES;
  const cardList = creditCards || [];

  const cardModes = cardList.map((c) => ({
    id: c.id,
    name: `Credit Card - ${c.shortName || c.name.replace('Credit Card - ', '')}`,
    type: 'credit' as const,
    icon: 'CreditCard',
    cardId: c.id,
  }));

  const nonOther = base.filter((m) => m.name.toLowerCase() !== 'other');
  const otherItem = base.find((m) => m.name.toLowerCase() === 'other');

  return [
    ...nonOther,
    ...cardModes,
    ...(otherItem ? [otherItem] : [{ id: 'pm_other', name: 'Other', type: 'other' as const, icon: 'HelpCircle' }])
  ];
}

export const PAYMENT_MODES = getPaymentModes();

export function getCategoryMeta(categoryName: string, isIncome: boolean = false) {
  const list = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const match = list.find(c => c.name.toLowerCase() === categoryName.toLowerCase())
    || (isIncome ? EXPENSE_CATEGORIES.find(c => c.name.toLowerCase() === categoryName.toLowerCase()) : INCOME_CATEGORIES.find(c => c.name.toLowerCase() === categoryName.toLowerCase()));

  if (match) return match;
  return { name: categoryName, icon: isIncome ? 'TrendingUp' : 'Tag', color: '#637081', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
}
