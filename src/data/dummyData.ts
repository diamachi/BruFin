import {
  Transaction,
  CreditCard,
  RecurringPayment,
  InvestmentItem,
  LoanItem,
  BankAccount,
  MonthlyAccountBalance,
} from '../types';

export const DEFAULT_MONTHLY_TARGET = 50000;

/**
 * Dynamically generates sample demo data with realistic dates relative to today.
 * Ensures the dashboard, charts, categories, and monthly velocity are vibrant
 * immediately whenever any user loads demo mode on any date.
 */
export function generateSampleData() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonth = String(currentMonthNum).padStart(2, '0');
  const currentMonthKey = `${currentYear}-${currentMonth}`;

  const prevMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
  const prevMonthKey = `${prevYear}-${prevMonth}`;

  const twoMonthsAgoDate = new Date(currentYear, now.getMonth() - 2, 1);
  const twoMonthsAgoYear = twoMonthsAgoDate.getFullYear();
  const twoMonthsAgoMonth = String(twoMonthsAgoDate.getMonth() + 1).padStart(2, '0');
  const twoMonthsAgoKey = `${twoMonthsAgoYear}-${twoMonthsAgoMonth}`;

  const sampleBankAccounts: BankAccount[] = [
    {
      id: 'demo_acc_hdfc',
      bankName: 'HDFC Bank',
      accountName: 'Salary & Primary',
      accountNumberMask: '•••• 4102',
      color: '#2563EB',
    },
    {
      id: 'demo_acc_icici',
      bankName: 'ICICI Bank',
      accountName: 'Emergency Reserve',
      accountNumberMask: '•••• 8910',
      color: '#D97706',
    },
  ];

  const sampleCreditCards: CreditCard[] = [
    {
      id: 'demo_card_millenia',
      name: 'Credit Card - HDFC Millenia',
      shortName: 'HDFC Millenia',
      bank: 'HDFC Bank',
      last4: '4321',
      limit: 150000,
      statementDay: 15,
      gradient: 'from-blue-600 via-indigo-700 to-slate-900',
      colorHex: '#2563EB',
      pastelBg: 'bg-sky-50 text-sky-950 border-sky-200/80',
      pastelText: 'text-sky-900',
      pastelBorder: 'border-sky-300',
    },
    {
      id: 'demo_card_amazon',
      name: 'Credit Card - Amazon Pay ICICI',
      shortName: 'Amazon Pay ICICI',
      bank: 'ICICI Bank',
      last4: '8765',
      limit: 200000,
      statementDay: 20,
      gradient: 'from-amber-600 via-orange-700 to-stone-900',
      colorHex: '#EA580C',
      pastelBg: 'bg-orange-50 text-orange-950 border-orange-200/80',
      pastelText: 'text-orange-900',
      pastelBorder: 'border-orange-300',
    },
    {
      id: 'demo_card_ace',
      name: 'Credit Card - Axis Ace',
      shortName: 'Axis Ace',
      bank: 'Axis Bank',
      last4: '9012',
      limit: 100000,
      statementDay: 10,
      gradient: 'from-emerald-600 via-teal-700 to-slate-900',
      colorHex: '#059669',
      pastelBg: 'bg-emerald-50 text-emerald-950 border-emerald-200/80',
      pastelText: 'text-emerald-900',
      pastelBorder: 'border-emerald-300',
    },
  ];

  const sampleRecurring: RecurringPayment[] = [
    {
      id: 'demo_rec_spotify',
      name: 'Spotify Family',
      category: 'Subscriptions',
      amount: 179,
      validTill: 'Monthly auto-debit',
      frequency: 'Monthly',
      paymentMode: 'UPI',
    },
    {
      id: 'demo_rec_netflix',
      name: 'Netflix 4K Premium',
      category: 'Subscriptions',
      amount: 649,
      validTill: 'Monthly auto-debit',
      frequency: 'Monthly',
      paymentMode: 'Credit Card - HDFC Millenia',
    },
    {
      id: 'demo_rec_fiber',
      name: 'Airtel Fiber Broadband',
      category: 'Utilities - Electricity / Gas / Internet',
      amount: 899,
      validTill: 'Monthly bill',
      frequency: 'Monthly',
      paymentMode: 'UPI',
    },
    {
      id: 'demo_rec_gym',
      name: 'Fitness Club Gym',
      category: 'Medical',
      amount: 1500,
      validTill: 'Annual package',
      frequency: 'Monthly',
      paymentMode: 'UPI',
    },
  ];

  const sampleInvestments: InvestmentItem[] = [
    {
      id: 'demo_inv_nifty',
      type: 'mutual_fund',
      name: 'UTI Nifty 50 Index Fund',
      institution: 'Zerodha / Coin',
      investedAmount: 60000,
      currentValue: 74800,
      units: 420.5,
      lastUpdated: `${currentMonthKey}-01`,
    },
    {
      id: 'demo_inv_parag',
      type: 'mutual_fund',
      name: 'Parag Parikh Flexi Cap Fund',
      institution: 'Groww',
      investedAmount: 85000,
      currentValue: 106400,
      units: 1140.2,
      lastUpdated: `${currentMonthKey}-01`,
    },
    {
      id: 'demo_inv_fd',
      type: 'fd',
      name: 'HDFC 1-Year Tax-Saver FD',
      institution: 'HDFC Bank',
      investedAmount: 100000,
      currentValue: 107100,
      interestRate: 7.1,
      maturityDate: `${currentYear + 1}-08-15`,
      lastUpdated: `${currentMonthKey}-01`,
    },
    {
      id: 'demo_inv_epf',
      type: 'pf',
      name: "Employees' Provident Fund (EPF)",
      institution: 'EPFO India',
      investedAmount: 160000,
      currentValue: 189400,
      interestRate: 8.25,
      lastUpdated: `${currentMonthKey}-01`,
    },
  ];

  const sampleLoans: LoanItem[] = [
    {
      id: 'demo_loan_car',
      name: 'Hyundai Car / Auto Loan',
      lender: 'HDFC Bank',
      currentPrincipal: 240000,
      interestRate: 8.85,
      monthlyPayment: 8500,
      extraMonthlyPayment: 1500,
      startDate: `${currentYear - 1}-06-01`,
    },
  ];

  const sampleMonthlyBalances: MonthlyAccountBalance[] = [
    // 2 Months Ago
    {
      id: `bal_${twoMonthsAgoKey}`,
      month: twoMonthsAgoKey,
      startBalance: 160000,
      endBalance: 175000,
      notes: 'Quarterly bonus & positive savings',
    },
    // Previous Month
    {
      id: `bal_${prevMonthKey}`,
      month: prevMonthKey,
      startBalance: 175000,
      endBalance: 193500,
      notes: 'Net positive savings +₹18,500',
    },
    // Current Month
    {
      id: `bal_${currentMonthKey}`,
      month: currentMonthKey,
      startBalance: 193500,
      endBalance: 207000,
      notes: 'Salary credited, rent & bills paid',
    },
  ];

  const sampleTransactions: Transaction[] = [
    // Current Month Transactions
    {
      id: 'demo_tx_1',
      type: 'Income',
      category: 'Salary',
      description: 'Monthly Corporate Salary',
      amount: 75000,
      paymentMode: 'Debit Card',
      date: `${currentMonthKey}-01`,
      timestamp: `${currentMonthKey}-01 09:30:00`,
      remarks: 'Direct bank credit',
    },
    {
      id: 'demo_tx_2',
      type: 'Expense',
      category: 'Rent / Maintenance',
      description: 'Apartment Monthly Rent',
      amount: 18000,
      paymentMode: 'UPI',
      date: `${currentMonthKey}-02`,
      timestamp: `${currentMonthKey}-02 10:15:00`,
      remarks: 'Transferred via UPI',
    },
    {
      id: 'demo_tx_3',
      type: 'Expense',
      category: 'Groceries',
      description: 'Supermarket Organic Produce & Staples',
      amount: 3450,
      paymentMode: 'Credit Card - Amazon Pay ICICI',
      date: `${currentMonthKey}-04`,
      timestamp: `${currentMonthKey}-04 17:40:00`,
      remarks: '5% cashback applied',
    },
    {
      id: 'demo_tx_4',
      type: 'Expense',
      category: 'Dining out / Food Delivery',
      description: 'Blue Tokai Coffee & Bakery',
      amount: 420,
      paymentMode: 'UPI',
      date: `${currentMonthKey}-06`,
      timestamp: `${currentMonthKey}-06 11:20:00`,
      remarks: 'Espresso + croissant',
    },
    {
      id: 'demo_tx_5',
      type: 'Expense',
      category: 'Utilities - Electricity / Gas / Internet',
      description: 'Power & Electricity Board Bill',
      amount: 2150,
      paymentMode: 'UPI',
      date: `${currentMonthKey}-09`,
      timestamp: `${currentMonthKey}-09 14:00:00`,
      remarks: 'Paid on time',
    },
    {
      id: 'demo_tx_6',
      type: 'Expense',
      category: 'Travel / Transit / Fuel',
      description: 'Fuel Refill & Metro Card Recharge',
      amount: 1800,
      paymentMode: 'Credit Card - Axis Ace',
      date: `${currentMonthKey}-12`,
      timestamp: `${currentMonthKey}-12 18:30:00`,
      remarks: 'HP Petrol station',
    },
    {
      id: 'demo_tx_7',
      type: 'Expense',
      category: 'Dining out / Food Delivery',
      description: 'Weekend Family Dinner',
      amount: 1480,
      paymentMode: 'Credit Card - HDFC Millenia',
      date: `${currentMonthKey}-15`,
      timestamp: `${currentMonthKey}-15 21:00:00`,
      remarks: 'Italian bistro',
    },
    {
      id: 'demo_tx_8',
      type: 'Income',
      category: 'Freelance / Consulting',
      description: 'UI/UX Design Advisory Stint',
      amount: 12000,
      paymentMode: 'UPI',
      date: `${currentMonthKey}-18`,
      timestamp: `${currentMonthKey}-18 16:20:00`,
      remarks: 'Client invoice paid',
    },
    {
      id: 'demo_tx_9',
      type: 'Expense',
      category: 'Shopping',
      description: 'Tech Accessories & Ergonomic Mouse',
      amount: 2499,
      paymentMode: 'Credit Card - Amazon Pay ICICI',
      date: `${currentMonthKey}-20`,
      timestamp: `${currentMonthKey}-20 13:10:00`,
      remarks: '',
    },
    {
      id: 'demo_tx_10',
      type: 'Expense',
      category: 'Subscriptions',
      description: 'Spotify Family Plan',
      amount: 179,
      paymentMode: 'UPI',
      date: `${currentMonthKey}-22`,
      timestamp: `${currentMonthKey}-22 08:00:00`,
      remarks: 'Auto-posted recurring bill',
      recurringId: 'demo_rec_spotify',
    },

    // Previous Month Transactions (for Trends & Comparison)
    {
      id: 'demo_tx_prev_1',
      type: 'Income',
      category: 'Salary',
      description: 'Monthly Corporate Salary',
      amount: 75000,
      paymentMode: 'Debit Card',
      date: `${prevMonthKey}-01`,
      timestamp: `${prevMonthKey}-01 09:30:00`,
      remarks: '',
    },
    {
      id: 'demo_tx_prev_2',
      type: 'Expense',
      category: 'Rent / Maintenance',
      description: 'Apartment Monthly Rent',
      amount: 18000,
      paymentMode: 'UPI',
      date: `${prevMonthKey}-02`,
      timestamp: `${prevMonthKey}-02 10:00:00`,
      remarks: '',
    },
    {
      id: 'demo_tx_prev_3',
      type: 'Expense',
      category: 'Groceries',
      description: 'Monthly Pantry & Hypermarket Restock',
      amount: 4900,
      paymentMode: 'Credit Card - Amazon Pay ICICI',
      date: `${prevMonthKey}-05`,
      timestamp: `${prevMonthKey}-05 18:00:00`,
      remarks: '',
    },
    {
      id: 'demo_tx_prev_4',
      type: 'Expense',
      category: 'Dining out / Food Delivery',
      description: 'Dining & Weekend Lunches',
      amount: 2850,
      paymentMode: 'Credit Card - HDFC Millenia',
      date: `${prevMonthKey}-12`,
      timestamp: `${prevMonthKey}-12 19:40:00`,
      remarks: '',
    },
    {
      id: 'demo_tx_prev_5',
      type: 'Expense',
      category: 'Utilities - Electricity / Gas / Internet',
      description: 'Utility & Internet Bills',
      amount: 2350,
      paymentMode: 'UPI',
      date: `${prevMonthKey}-16`,
      timestamp: `${prevMonthKey}-16 11:00:00`,
      remarks: '',
    },
    {
      id: 'demo_tx_prev_6',
      type: 'Expense',
      category: 'Travel / Transit / Fuel',
      description: 'City Commute & Cab Rides',
      amount: 1650,
      paymentMode: 'UPI',
      date: `${prevMonthKey}-21`,
      timestamp: `${prevMonthKey}-21 14:15:00`,
      remarks: '',
    },
    {
      id: 'demo_tx_prev_7',
      type: 'Expense',
      category: 'Shopping',
      description: 'Wardrobe & Apparel Autumn Sale',
      amount: 3200,
      paymentMode: 'Credit Card - HDFC Millenia',
      date: `${prevMonthKey}-25`,
      timestamp: `${prevMonthKey}-25 17:00:00`,
      remarks: '',
    },
  ];

  return {
    transactions: sampleTransactions,
    creditCards: sampleCreditCards,
    recurringPayments: sampleRecurring,
    monthlyTarget: DEFAULT_MONTHLY_TARGET,
    investments: sampleInvestments,
    loans: sampleLoans,
    bankAccounts: sampleBankAccounts,
    monthlyBalances: sampleMonthlyBalances,
  };
}
