export type TransactionType = 'Expense' | 'Income';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  paymentMode: string;
  date: string; // YYYY-MM-DD
  timestamp?: string; // YYYY-MM-DD HH:MM:SS
  remarks?: string;
  recurringId?: string; // Links to recurring payment if auto-posted
}

export interface CreditCard {
  id: string;
  name: string; // matches paymentMode in sheet e.g. "Credit Card - SBI Cashback"
  shortName: string;
  bank: string;
  last4: string;
  limit: number;
  statementDay: number; // day of month, e.g. 20
  gradient: string;
  colorHex: string;
  pastelBg: string;
  pastelText: string;
  pastelBorder: string;
  customImageUrl?: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  category: string;
  amount: number; // Monthly bill amount (e.g. ₹1,500)
  validTill: string; // e.g. "Ongoing" or "Nov 2026"
  frequency: string; // "Monthly"
  paymentMode: string;
  dueDay?: number; // Day of month (1-31)
  autoPost?: boolean;
  // Enhanced intuitive billing configuration:
  billingType?: 'monthly' | 'total_split'; // 'monthly' = ₹X/mo, 'total_split' = ₹Total over N months
  totalAmount?: number; // Total amount if split across months (e.g. ₹60,000)
  durationMonths?: number; // Total months (e.g. 6 or 12)
  startMonth?: string; // YYYY-MM
}

export type InvestmentType = 'mutual_fund' | 'fd' | 'stock' | 'pf';

export interface InvestmentItem {
  id: string;
  type: InvestmentType;
  name: string;
  institution?: string;
  investedAmount: number;
  currentValue: number;
  interestRate?: number; // % p.a. for FD / PF
  maturityDate?: string; // For FD
  units?: number;
  lastUpdated: string;
}

export interface LoanItem {
  id: string;
  name: string;
  lender: string;
  currentPrincipal: number;
  originalAmount?: number;
  interestRate: number; // % p.a.
  monthlyPayment: number; // EMI
  extraMonthlyPayment?: number;
  startDate?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumberMask: string;
  color: string;
}

export interface MonthlyAccountBalance {
  id: string;
  month: string; // YYYY-MM
  startBalance: number;
  endBalance: number;
  notes?: string;
  accountId?: string; // Optional for backwards compatibility
}

export type ViewTab = 'dashboard' | 'expenses' | 'balances' | 'transactions' | 'income' | 'cards' | 'investments' | 'loans';

export interface CategoryMeta {
  name: string;
  iconName: string;
  color: string;
  bgColor: string;
}

export interface FilterState {
  month: string; // "All" or "YYYY-MM"
  type: 'All' | 'Expense' | 'Income';
  category: string;
  paymentMode: string;
  searchQuery: string;
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  type?: 'digital' | 'bank' | 'cash' | 'credit' | 'other';
  icon?: string;
  isCustom?: boolean;
}
