import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  HardDrive,
  Cpu,
  Archive,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileJson,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import {
  getStorageDiagnostics,
  getMemoryDiagnostics,
  getArchivableData,
  archiveAndExportOldData,
  getArchiveHistory,
  formatBytes,
  StorageDiagnostics,
  MemoryDiagnostics,
  ArchivableInfo,
  ArchiveRecord,
} from '../utils/storage';
import { formatINR } from '../utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onToggleDiagnostics: (enabled: boolean) => void;
  isDiagnosticsActive: boolean;
}

export const DiagnosticsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onToggleDiagnostics,
  isDiagnosticsActive,
}) => {
  const [storage, setStorage] = useState<StorageDiagnostics | null>(null);
  const [memory, setMemory] = useState<MemoryDiagnostics | null>(null);
  const [archivable, setArchivable] = useState<ArchivableInfo | null>(null);
  const [archiveHistory, setArchiveHistory] = useState<ArchiveRecord[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const refreshMetrics = async () => {
    const nextStorage = await getStorageDiagnostics();
    setStorage(nextStorage);
    setMemory(getMemoryDiagnostics());
    setArchivable(getArchivableData(12));
    setArchiveHistory(getArchiveHistory());
  };

  useEffect(() => {
    if (isOpen) {
      void refreshMetrics();
      const interval = setInterval(refreshMetrics, 2500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen || !storage || !memory) return null;

  const handleArchive = (format: 'json' | 'csv') => {
    const res = archiveAndExportOldData(format, 12);
    setActionMessage(res.message);
    void refreshMetrics();
    setTimeout(() => setActionMessage(null), 6000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fadeIn">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#22252A] border border-[#E8E1DB] dark:border-[#363B44] rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E1DB] dark:border-[#363B44] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EF6448] text-white flex items-center justify-center shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#59171B] dark:text-[#F2F3F5]">
                System & Storage Inspector
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#A5ACB7]">
                Live RAM monitor, local storage & historical exports
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={refreshMetrics}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1C1F1E] text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              title="Refresh Metrics"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1C1F1E] text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toast / Message */}
        {actionMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* 1. Live RAM / Heap Monitor */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[#59171B] dark:text-[#FF927A]" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
                JavaScript Memory & Leak Checker
              </h4>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                memory.status === 'healthy'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : memory.status === 'moderate'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{memory.status === 'healthy' ? 'Healthy (No Leaks)' : `${memory.status} Load`}</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#22252A] border border-slate-200/80 dark:border-[#363B44]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Used Heap</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-[#F2F3F5] mt-0.5 block font-mono">
                {memory.usedMB}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#22252A] border border-slate-200/80 dark:border-[#363B44]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Heap</span>
              <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-0.5 block font-mono">
                {memory.totalMB}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#22252A] border border-slate-200/80 dark:border-[#363B44]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Max Limit</span>
              <span className="text-sm font-extrabold text-slate-500 dark:text-slate-400 mt-0.5 block font-mono">
                {memory.limitMB}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-[#A5ACB7] italic">
            {memory.isSupported
              ? 'Monitoring real-time Chromium / Android WebView V8 garbage collection heap.'
              : 'Performance memory API active in simulation / standard secure sandbox context.'}
          </p>
        </div>

        {/* 2. Storage Quota & Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-[#59171B] dark:text-[#FF927A]" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
                Internal Storage Quota
              </h4>
            </div>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-[#F2F3F5]">
              {storage.totalFormatted} / {storage.quotaBytes ? formatBytes(storage.quotaBytes) : 'quota unavailable'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#22252A] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#59171B] dark:bg-[#B84E3B] transition-all duration-300"
                style={{ width: `${Math.max(2, storage.percentOfQuota)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-[#A5ACB7]">
              <span>{storage.quotaBytes ? `Using ${storage.percentOfQuota.toFixed(2)}% of browser storage` : 'Browser quota estimate unavailable'}</span>
              <span>{storage.quotaBytes ? `${formatBytes(Math.max(0, storage.quotaBytes - storage.totalBytes))} free` : ''}</span>
            </div>
          </div>

          {/* Key Breakdown */}
          <div className="divide-y divide-slate-200/80 dark:divide-[#363B44] pt-1">
            {storage.breakdown.map((item) => (
              <div key={item.key} className="py-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {item.name} <span className="text-[10px] text-slate-400 font-normal">({item.count} records)</span>
                </span>
                <span className="font-mono text-slate-600 dark:text-[#A5ACB7] font-semibold">
                  {item.formatted}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Historical export section */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-[#E8E1DB] dark:border-[#363B44] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Archive className="w-4 h-4 text-[#59171B] dark:text-[#FF927A]" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5] uppercase tracking-wider">
                Historical Data Export
              </h4>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-[#A5ACB7] leading-relaxed">
            BruFin keeps your records on this device. Export older records as a backup whenever you need one; exporting never deletes data.
          </p>

          {/* Status of Archivable Records */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#22252A] border border-slate-200/80 dark:border-[#363B44] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-[#F2F3F5]">
                  Records Older Than 1 Year:
                </span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[11px] font-extrabold ${
                    archivable && archivable.count > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}
                >
                  {archivable?.count || 0} items
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#A5ACB7] mt-0.5">
                {archivable && archivable.count > 0
                  ? `From ${archivable.startDate} to ${archivable.endDate} (${formatINR(archivable.totalExpense)} spent)`
                  : 'All your current transactions are within the 1-year window.'}
              </p>
            </div>

            {/* Archive Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                disabled={!archivable || archivable.count === 0}
                onClick={() => handleArchive('json')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                  archivable && archivable.count > 0
                    ? 'bg-[#59171B] dark:bg-[#B84E3B] text-white hover:opacity-90'
                    : 'bg-slate-200 dark:bg-[#1B1E22] text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-800'
                }`}
                title="Download older records as a JSON backup"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <button
                disabled={!archivable || archivable.count === 0}
                onClick={() => handleArchive('csv')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                  archivable && archivable.count > 0
                    ? 'bg-white dark:bg-[#17191C] border border-[#E8E1DB] dark:border-[#363B44] text-slate-800 dark:text-[#F2F3F5] hover:bg-slate-50'
                    : 'bg-slate-200 dark:bg-[#1B1E22] text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-800'
                }`}
                title="Download older records as a CSV file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-[#A5ACB7] flex items-center gap-1 font-mono">
            <Download className="w-3 h-3 text-[#59171B] dark:text-[#FF927A]" />
            <span>Exports are local downloads. Exporting does not remove records from this device.</span>
          </div>

          {/* Previous Archives Log */}
          {archiveHistory.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Archive History
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {archiveHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2 rounded-lg bg-white dark:bg-[#22252A] border border-slate-200/80 dark:border-[#363B44] flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white">{rec.fileName}</span>
                      <p className="text-[10px] text-slate-400">
                        {rec.count} records • {rec.dateRange}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(rec.archivedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Controls & Visibility Toggle */}
        <div className="pt-2 border-t border-[#E8E1DB] dark:border-[#363B44] flex items-center justify-between">
          <button
            onClick={() => onToggleDiagnostics(!isDiagnosticsActive)}
            className="text-xs font-semibold text-slate-600 dark:text-[#A5ACB7] hover:text-[#59171B] dark:hover:text-[#EF6448] flex items-center gap-1.5 transition-colors"
          >
            {isDiagnosticsActive ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Diagnostics Bar: Visible at Top</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-400" />
                <span>Diagnostics Bar: Hidden</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
