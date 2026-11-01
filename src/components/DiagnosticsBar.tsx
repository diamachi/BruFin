import React, { useState, useEffect } from 'react';
import { HardDrive, Cpu, AlertTriangle } from 'lucide-react';
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
}

export const DiagnosticsBar: React.FC<Props> = ({ onOpenDetails }) => {
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
  const capsuleStyle = 'inline-flex items-center gap-1.5 rounded-full border border-[#E8E1DB] bg-white/80 px-2 py-1.5 text-[10px] font-semibold leading-none text-slate-600 shadow-sm dark:border-[#363B44] dark:bg-[#25292F]/90 dark:text-slate-200';

  return (
    <div className="w-[min(17rem,calc(100vw-1.5rem))] space-y-2" aria-label="Local diagnostics">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.12em] text-slate-500 dark:text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${ramStatusColor}`} />
          LIVE DEVICE HEALTH
        </div>
        <button
          type="button"
          onClick={onOpenDetails}
          className="text-[10px] font-bold text-[#C94F39] transition-colors hover:text-[#EF6448] dark:text-[#FF927A] dark:hover:text-[#FFB09D]"
        >
          Details
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenDetails}
          className={capsuleStyle}
          title={`Local database storage: ${storage.totalFormatted} (${storage.percentOfQuota.toFixed(1)}% of available quota). Open diagnostics.`}
          aria-label={`Local storage ${storage.totalFormatted}; open diagnostics`}
        >
          <HardDrive className="h-3.5 w-3.5 text-[#B87B2E] dark:text-[#FF927A]" />
          <span>Storage {storage.totalFormatted}</span>
        </button>

        <button
          type="button"
          onClick={onOpenDetails}
          className={capsuleStyle}
          title={`Estimated memory use: ${memory.usedMB}. Open diagnostics.`}
          aria-label={`RAM ${memory.usedMB}; open diagnostics`}
        >
          <Cpu className="h-3.5 w-3.5 text-[#B87B2E] dark:text-[#FF927A]" />
          <span>RAM {memory.usedMB}</span>
        </button>

        {archivable && archivable.count > 0 && (
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-semibold leading-none text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
            title="Older records are ready to review in diagnostics"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {archivable.count} older
          </button>
        )}
      </div>
    </div>
  );
};
