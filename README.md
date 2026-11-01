# Finman - Aesthetic Local Android Personal Finance App

A standalone, aesthetic, and **100% portable & local** Android finance tracker that combines the data modeling and analytics of **`Budget Tracker.xlsx`** with the streamlined entry workflow of the **`Budgeting.pdf` Google Form**.

---

## 🌟 App Structure & Features

### 1. 📱 Clean Single Bottom Navigation Bar
Only **one** navigation bar exists across the entire app at the bottom:
- **Monitor**: Central financial dashboard tracking monthly budget target vs expenses, interactive category distribution, income stream card, recent velocity trends, and recurring commitments.
- **Balances**: Record and track bank account balances at the start and end of every month with visual net difference ($\Delta$) trends.
- **(+) Quick Add FAB**: Instant transaction entry form matching `Budgeting.pdf`.
- **Cards**: Minimalist, swipeable credit cards (1 card in view at a time with swipe indicators and filtered transactions).
- **Invest**: Mutual fund returns calculator, mutual fund holdings, fixed deposits, provident fund, and stock portfolios.

### 2. 🏛️ Bank Balances & Monthly Net Delta (`Balances` Tab)
- **Stating Balances**: State your Opening Balance (Start of Month) and Closing Balance (End of Month) for each bank account (HDFC, SBI, ICICI, or custom accounts).
- **Net Wealth Difference ($\Delta$)**:
  - Automatically calculates $\text{Closing} - \text{Opening}$ for each account and in total across all accounts.
  - Highlights whether your cash reserves expanded ($+\text{₹}$) or experienced a net drawdown ($-\text{₹}$).
- **Monthly Difference Trends**:
  - Multi-month trend visual showing the net difference month-over-month.
  - Quick insights into your monthly cash accumulation velocity.

### 3. 📝 Budgeting Quick-Add Form (From `Budgeting.pdf`)
- **Expense vs. Income Switcher**: One-tap toggle with animated state indicators.
- **Full Category Taxonomy**:
  - *Expense*: Dining out / Food Delivery, Groceries, Rent / Maintenance, Utilities, Commute, Subscriptions, Clothes / Personal, Medical, Gifts, Travel, Insurance, Loan EMI, Other.
  - *Income*: Salary, Cashback / Refunds, Interest, Dividend, Gifts, Other.
- **Quick Amount Chips**: Instant +50, +100, +200, +500, +1000, +2000 increment buttons.
- **Smart Description Autocomplete**: Suggests recent descriptions from your historical logs.
- **Payment Mode Selector**: Includes UPI, Cash, Debit Card, and all credit cards.
- **Date & Remarks**: Autofills to today; lets you add custom filter tags and notes.

### 4. 💳 Minimalist Swipable Credit Cards
- **Clean Outline & Minimal Info**: Only 1 card in view at a time with swipe indicators (`• • • •`).
- **Displays What Matters**: Bank and card name, statement billing cycle day, spent this cycle, remaining limit, and a hairline utilization bar.
- Filtered transactions for the active card are displayed directly below.

### 5. 💼 Investments Portfolio & Calculator
- **Mutual Fund Returns Calculator**: Exact replica of your uploaded design with interactive sliders, Donut visual, and Lumpsum / SIP compounding.
- **Asset Classes**: Mutual Funds, Fixed Deposits (FDs), Provident Fund (EPF/PPF), and Stocks (initialized to ₹0).

---

## 🚀 How to Run & Build

### 1. Instant Run on Mac (Zero Dependencies)
```bash
./run_portable.sh
```
Opens in your browser at `http://localhost:5173`.

### 2. Install on Android Phone (10 Seconds)
1. Ensure your phone is on the same Wi-Fi.
2. Open Chrome on Android and visit:
   ```text
   http://<YOUR_LOCAL_IP>:5173
   ```
3. Tap **⋮** $\rightarrow$ **"Install app"** (or **"Add to Home Screen"**).

### 3. Build Native Android APK with Local JDK
```bash
./build_apk.sh
```
Compiles the debug APK using the local JDK at `./jdk`.
