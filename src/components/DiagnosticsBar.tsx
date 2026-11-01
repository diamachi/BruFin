import React, { useState, useEffect } from 'react';
import { HardDrive, Cpu, AlertTriangle, ChevronRight, X } from 'lucide-react';
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

  const updateMetrics = () => {
    setStorage(getStorageDiagnostics());
    setMemory(getMemoryDiagnostics());
    setArchivable(getArchivableData(12));
  };

  useEffect(() => {
    updateMetrics();
    // Poll every 3 seconds to observe live RAM and storage dynamics
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

  return (
    <div className="w-full bg-[#59171B] dark:bg-[#181A1A] text-white border-t border-[#FED7B8]/30 dark:border-[#363C3A] px-3 sm:px-4 py-1.5 transition-colors shadow-sm text-[11px] font-mono">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Clickable Status Chips */}
        <button
          onClick={onOpenDetails}
          className="flex-1 flex items-center gap-2.5 truncate hover:opacity-85 text-left transition-opacity"
          title="Click to view full System Diagnostics, RAM Monitor & 1-Year Archival"
        >
          {/* Storage Badge */}
          <div className="flex items-center space-x-1 shrink-0">
            <HardDrive className="w-3.5 h-3.5 text-[#FED7B8] dark:text-[#EF6448]" />
            <span className="text-[#FED7B8] dark:text-[#F4F6F5] font-semibold">
              {storage.totalFormatted}
            </span>
            <span className="text-white/60 dark:text-[#A0A8A5] text-[10px]">
              ({storage.percentOfQuota.toFixed(1)}%)
            </span>
          </div>

          <span className="text-white/30 dark:text-white/20">•</span>

          {/* RAM Badge */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <Cpu className="w-3.5 h-3.5 text-[#FED7B8] dark:text-[#EF6448]" />
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ramStatusColor}`}
              />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${ramStatusColor}`} />
            </span>
            <span className="text-[#FED7B8] dark:text-[#F4F6F5] font-semibold">
              RAM: {memory.usedMB}
            </span>
          </div>

          {/* Archivable Alert if older than 1 year */}
          {archivable && archivable.count > 0 && (
            <div className="hidden sm:flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 text-[10px] shrink-0 font-sans">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{archivable.count} &gt; 1yr</span>
            </div>
          )}

          <ChevronRight className="w-3 h-3 text-white/50 dark:text-[#A0A8A5] ml-auto shrink-0" />
        </button>

        {/* Dismiss / Hide Button */}
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 dark:hover:bg-[#363C3A] transition-colors shrink-0"
          title="Hide Diagnostics Bar (re-enable in Settings anytime)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
