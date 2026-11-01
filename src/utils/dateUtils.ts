export function formatINR(amount: number, showDecimals: boolean = false): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? 2 : (abs % 1 === 0 ? 0 : 2),
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(abs);

  return isNegative ? `-${formatted}` : formatted;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentTimestampString(): string {
  const d = new Date();
  const dateStr = getTodayDateString();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

export function getDaysToEOM(dateObj: Date = new Date()): number {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = dateObj.getDate();
  return Math.max(0, lastDay - currentDay);
}

export function getGreetingMessage(dateObj: Date = new Date()): { dateText: string; daysLeft: number } {
  const days = getDaysToEOM(dateObj);
  const options: Intl.DateTimeFormatOptions = { month: '2-digit', day: '2-digit', year: 'numeric' };
  const dateText = dateObj.toLocaleDateString('en-US', options);
  return { dateText, daysLeft: days };
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function getMonthYearKey(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.substring(0, 7); // YYYY-MM
}

export function formatMonthYear(monthKey: string): string {
  if (!monthKey || monthKey === 'All') return 'All Time';
  const parts = monthKey.split('-');
  if (parts.length < 2) return monthKey;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatMonthYearShort(monthKey: string): string {
  if (!monthKey || monthKey === 'All') return 'All Time';
  const parts = monthKey.split('-');
  if (parts.length < 2) return monthKey;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
