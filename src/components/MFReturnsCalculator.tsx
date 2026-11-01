import React, { useState, useMemo } from 'react';
import { Calculator, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { formatINR } from '../utils/dateUtils';

interface Props {
  onInvestNow?: () => void;
  className?: string;
}

export const MFReturnsCalculator: React.FC<Props> = ({ onInvestNow, className = '' }) => {
  const [calcType, setCalcType] = useState<'lumpsum' | 'sip'>('lumpsum');
  const [totalInvestment, setTotalInvestment] = useState<number>(25000);
  const [expectedRate, setExpectedRate] = useState<number>(12);
  const [timePeriod, setTimePeriod] = useState<number>(10);

  // Compounding calculations for Lumpsum and monthly SIP
  const { investedAmount, estReturns, totalValue, investedPercent, returnsPercent } = useMemo(() => {
    let invested = totalInvestment;
    let total = 0;
    const r = expectedRate / 100;
    const n = timePeriod;

    if (calcType === 'lumpsum') {
      // Future Value = P * (1 + r)^n
      total = invested * Math.pow(1 + r, n);
    } else {
      // SIP Formula: M * [ ( (1 + i)^n - 1 ) / i ] * (1 + i)
      const monthlyRate = r / 12;
      const totalMonths = n * 12;
      invested = totalInvestment * totalMonths;
      if (monthlyRate > 0) {
        total = totalInvestment * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
      } else {
        total = invested;
      }
    }

    const returns = Math.max(0, total - invested);
    const totalVal = Math.round(total);
    const retPct = totalVal > 0 ? (returns / totalVal) * 100 : 50;
    const invPct = 100 - retPct;

    return {
      investedAmount: Math.round(invested),
      estReturns: Math.round(returns),
      totalValue: totalVal,
      investedPercent: invPct,
      returnsPercent: retPct,
    };
  }, [totalInvestment, expectedRate, timePeriod, calcType]);

  return (
    <div
      className={`p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#22252A] border border-[#FED7B8] dark:border-[#363B44] shadow-sm space-y-5 transition-colors ${className}`}
    >
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FED7B8] dark:border-[#363B44] pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-2xl bg-[#EF6448] text-white flex items-center justify-center shadow-sm shrink-0">
            <Calculator className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F2F3F5] tracking-tight">
              Mutual Fund Returns Calculator
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#A5ACB7]">
              Compounding wealth accumulator for Lumpsum & monthly SIP
            </p>
          </div>
        </div>

        {/* Lumpsum vs SIP Toggle */}
        <div className="flex bg-[#FFF8F3] dark:bg-[#1B1E22] p-1 rounded-xl border border-[#FED7B8] dark:border-[#363B44] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCalcType('lumpsum')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              calcType === 'lumpsum'
                ? 'bg-[#EF6448] text-white shadow-sm'
                : 'text-slate-500 dark:text-[#A5ACB7] hover:text-slate-800 dark:hover:text-[#F2F3F5]'
            }`}
          >
            Lumpsum
          </button>
          <button
            type="button"
            onClick={() => setCalcType('sip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              calcType === 'sip'
                ? 'bg-[#EF6448] text-white shadow-sm'
                : 'text-slate-500 dark:text-[#A5ACB7] hover:text-slate-800 dark:hover:text-[#F2F3F5]'
            }`}
          >
            Monthly SIP
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Column: Range Sliders */}
        <div className="md:col-span-7 space-y-5">
          {/* Slider 1: Investment Amount */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-[#FF927A]">
                {calcType === 'sip' ? 'Monthly investment' : 'Total investment'}
              </span>
              <div className="flex items-center px-3 py-1 rounded-lg bg-[#FED7B8]/30 dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] text-[#59171B] dark:text-[#FF927A] font-extrabold text-sm">
                <span className="mr-1">₹</span>
                <input
                  type="number"
                  value={totalInvestment}
                  onChange={(e) => setTotalInvestment(Math.max(500, parseFloat(e.target.value) || 0))}
                  className="w-24 bg-transparent text-[#59171B] dark:text-[#FF927A] font-bold focus:outline-none text-right"
                />
              </div>
            </div>
            <input
              type="range"
              min="500"
              max={calcType === 'sip' ? 100000 : 1000000}
              step="500"
              value={totalInvestment}
              onChange={(e) => setTotalInvestment(parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>

          {/* Slider 2: Expected return rate (p.a) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-[#FF927A]">
                Expected return rate (p.a)
              </span>
              <div className="flex items-center px-3 py-1 rounded-lg bg-[#FED7B8]/30 dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] text-[#59171B] dark:text-[#FF927A] font-extrabold text-sm">
                <input
                  type="number"
                  step="0.5"
                  value={expectedRate}
                  onChange={(e) => setExpectedRate(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-12 bg-transparent text-[#59171B] dark:text-[#FF927A] font-bold focus:outline-none text-right"
                />
                <span>%</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="0.5"
              value={expectedRate}
              onChange={(e) => setExpectedRate(parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>

          {/* Slider 3: Time period */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-[#FF927A]">Time period</span>
              <div className="flex items-center px-3 py-1 rounded-lg bg-[#FED7B8]/30 dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44] text-[#59171B] dark:text-[#FF927A] font-extrabold text-sm">
                <input
                  type="number"
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 bg-transparent text-[#59171B] dark:text-[#FF927A] font-bold focus:outline-none text-right"
                />
                <span className="ml-1">Yr</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="35"
              step="1"
              value={timePeriod}
              onChange={(e) => setTimePeriod(parseInt(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>
        </div>

        {/* Right Column: Visual Donut Chart */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FFF8F3]/60 dark:bg-[#1B1E22] border border-[#FED7B8] dark:border-[#363B44]">
          {/* Legend */}
          <div className="flex items-center space-x-4 text-[11px] font-medium mb-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FED7B8] dark:bg-[#30353D] border border-[#FED7B8] dark:border-[#363B44]" />
              <span className="text-slate-600 dark:text-[#A5ACB7]">Invested amount</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#59171B] dark:bg-[#B84E3B]" />
              <span className="text-slate-600 dark:text-[#A5ACB7]">Est. returns</span>
            </div>
          </div>

          {/* SVG Donut */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="currentColor"
                className="text-[#FED7B8]/30 dark:text-[#363C3A]"
                strokeWidth="16"
              />
              {/* Invested segment */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#FED7B8"
                className="dark:stroke-[#363C3A]"
                strokeWidth="16"
                strokeDasharray={`${(investedPercent / 100) * 238.76} 238.76`}
                strokeDashoffset="0"
              />
              {/* Returns segment */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#59171B"
                className="dark:stroke-[#EF6448]"
                strokeWidth="16"
                strokeDasharray={`${(returnsPercent / 100) * 238.76} 238.76`}
                strokeDashoffset={`-${(investedPercent / 100) * 238.76}`}
              />
            </svg>
            <div className="absolute flex flex-col items-center text-center px-2 pointer-events-none">
              <span className="text-[10px] text-slate-500 dark:text-[#A5ACB7] uppercase font-bold">
                Total Value
              </span>
              <span className="text-xs font-black text-[#59171B] dark:text-[#F2F3F5]">
                {formatINR(totalValue)}
              </span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                +{returnsPercent.toFixed(0)}% gain
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary & Action Button */}
      <div className="pt-4 border-t border-[#FED7B8] dark:border-[#363B44] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-3 text-left">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-[#A5ACB7] block font-medium">Invested amount</span>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-[#F2F3F5]">
              {formatINR(investedAmount)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-[#A5ACB7] block font-medium">Est. returns</span>
            <span className="text-xs sm:text-sm font-extrabold text-[#59171B] dark:text-[#FF927A]">
              +{formatINR(estReturns)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-[#A5ACB7] block font-medium">Total wealth</span>
            <span className="text-xs sm:text-sm font-extrabold text-[#59171B] dark:text-[#F2F3F5]">
              {formatINR(totalValue)}
            </span>
          </div>
        </div>

        {onInvestNow && (
          <button
            type="button"
            onClick={onInvestNow}
            className="px-6 py-2.5 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white text-xs font-black tracking-wider uppercase transition-all shadow-md self-end sm:self-center cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Add to Portfolio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
