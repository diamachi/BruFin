import React, { useState, useEffect } from 'react';
import { HardDrive, Cpu, AlertTriangle, X } from 'lucide-react';
import {
  getStorageDiagnostics,
  getMemoryDiagnostics,
  getArchivableData,
  StorageDiagnostics,
  MemoryDiagnostics,
  ArchivableInfo,
} from '../utils/storage';

interface Props {
  onOpenDetails: () => void;
  onDismiss: () => void;
}

export const DiagnosticsBar: React.FC<Props> = ({ onOpenDetails, onDismiss }) => {
  const [storage, setStorage] = useState<StorageDiagnostics | null>(null);
  const [memory, setMemory] = useState<MemoryDiagnostics | null>(null);
  const [archivable, setArchivable] = useState<ArchivableInfo | null>(null);

  useEffect(() => {
    const updateMetrics = () => {
      void getStorageDiagnostics().then(setStorage).catch((error) => console.error('Could not estimate local database storage', error));
      setMemory(getMemoryDiagnostics());
      setArchivable(getArchivableData(12));
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!storage || !memory) return null;

  const ramStatusColor =
    memory.status === 'high'
      ? 'bg-rose-500'
      : memory.status === 'moderate'
      ? 'bg-amber-500'
      : 'bg-emerald-500';
  const capsuleStyle = 'inline-flex items-center gap-1 rounded-full border border-[#E8E1DB] bg-white/90 px-1.5 py-1 text-[9px] font-semibold leading-none text-slate-600 shadow-sm dark:border-[#363B44] dark:bg-[#22252A] dark:text-slate-200 sm:gap-1.5 sm:px-2 sm:text-[10px]';

  return (
    <div className="flex shrink-0 items-center gap-1" aria-label="Local diagnostics">
      <button
        type="button"
        onClick={onOpenDetails}
        className={capsuleStyle}
        title={`Local database storage: ${storage.totalFormatted} (${storage.percentOfQuota.toFixed(1)}% of available quota). Open diagnostics.`}
        aria-label={`Local storage ${storage.totalFormatted}; open diagnostics`}
      >
        <HardDrive className="h-3 w-3 text-[#B87B2E] dark:text-[#FF927A] sm:h-3.5 sm:w-3.5" />
        <span>{storage.totalFormatted}</span>
      </button>

      <button
        type="button"
        onClick={onOpenDetails}
        className={capsuleStyle}
        title={`Estimated memory use: ${memory.usedMB}. Open diagnostics.`}
        aria-label={`RAM ${memory.usedMB}; open diagnostics`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${ramStatusColor}`} />
        <Cpu className="h-3 w-3 text-[#B87B2E] dark:text-[#FF927A] sm:h-3.5 sm:w-3.5" />
        <span>{memory.usedMB}</span>
      </button>

      {archivable && archivable.count > 0 && (
        <button
          type="button"
          onClick={onOpenDetails}
          className="hidden items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-1 text-[9px] font-semibold leading-none text-amber-800 sm:inline-flex dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          title="Older records are ready to review in diagnostics"
        >
          <AlertTriangle className="h-3 w-3" />
          {archivable.count} older
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-[#30353D] dark:hover:text-white"
        title="Hide diagnostics monitor"
        aria-label="Hide diagnostics monitor"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};
