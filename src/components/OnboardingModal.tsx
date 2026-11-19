/**
 * First-run choices: explore demo data, use standalone storage, or connect to a self-hosted server.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Database, HardDrive, Server, ShieldCheck } from 'lucide-react';
import { BruFinLogo } from './Navbar';
import { ServerSyncPanel } from './ServerSyncPanel';
import type { ServerSyncStatus } from '../utils/serverSync';

interface Props {
  isOpen: boolean;
  onSelectDemo: () => void;
  onSelectFresh: () => void;
  serverStatus: ServerSyncStatus;
  onConnectServer: (serverUrl: string, token: string, strategy: 'server' | 'device') => Promise<void>;
  onDisconnectServer: () => Promise<void>;
}

export const OnboardingModal: React.FC<Props> = ({
  isOpen,
  onSelectDemo,
  onSelectFresh,
  serverStatus,
  onConnectServer,
  onDisconnectServer,
}) => {
  const [showServerSetup, setShowServerSetup] = useState(false);
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fadeIn">
      <div className="max-h-[92vh] w-full max-w-md space-y-5 overflow-y-auto rounded-3xl border border-[#E8E1DB] bg-white p-5 shadow-2xl dark:border-[#363B44] dark:bg-[#22252A] sm:p-6 animate-scaleUp">
        <div className="text-center">
          <div className="mb-2 inline-flex rounded-2xl bg-[var(--brufin-accent-bg)] p-3 text-white shadow-md">
            <BruFinLogo className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#F2F3F5]">
            {showServerSetup ? 'Connect to your server' : 'Welcome to BruFin'}
          </h2>
          <p className="mt-1 text-xs font-medium text-[var(--brufin-accent-ink)]">Brewing Calm Finances · Private by design</p>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {showServerSetup
              ? 'Pair with your self-hosted BruFin server. Your phone keeps a local copy and syncs changes when the server is reachable.'
              : 'Choose where your BruFin data will live and how you want to start.'}
          </p>
        </div>

        {showServerSetup ? (
          <div className="space-y-3">
            <button type="button" onClick={() => setShowServerSetup(false)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[var(--brufin-accent-ink)] dark:text-slate-400">
              <ArrowLeft className="h-4 w-4" />Back to choices
            </button>
            <ServerSyncPanel status={serverStatus} onConnect={onConnectServer} onDisconnect={onDisconnectServer} />
          </div>
        ) : (
          <div className="space-y-3">
            <button onClick={onSelectDemo} className="group relative w-full overflow-hidden rounded-2xl border-2 border-[var(--brufin-accent-border)] bg-gradient-to-br from-[#FFF8F3] to-[#FDF4E7] p-4 text-left transition-all hover:shadow-lg dark:from-[#272B2A] dark:to-[#202322]">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--brufin-accent-ink)]">
                    <Database className="h-4 w-4" />Use demo data and explore
                    <span className="rounded-full bg-[var(--brufin-accent-bg)] px-2 py-0.5 text-[9px] uppercase text-white">Demo</span>
                  </span>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">Load sample transactions, cards, balances, and investments to try the app. Replace them with your own data later.</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--brufin-accent-ink)] transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            <button onClick={onSelectFresh} className="group w-full rounded-2xl border border-[#E8E1DB] bg-white p-4 text-left transition-all hover:border-slate-400 hover:shadow-md dark:border-[#363B44] dark:bg-[#1B1E22] dark:hover:border-slate-600">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-[#F2F3F5]"><HardDrive className="h-4 w-4 text-slate-500" />Use standalone on this device</span>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Start with an empty database stored only on this phone or browser. No server is needed.</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            <button onClick={() => setShowServerSetup(true)} className="group w-full rounded-2xl border border-[#E8E1DB] bg-white p-4 text-left transition-all hover:border-[var(--brufin-accent-border)]/60 hover:shadow-md dark:border-[#363B44] dark:bg-[#1B1E22] dark:hover:border-[var(--brufin-accent-border)]/60">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-[#F2F3F5]"><Server className="h-4 w-4 text-[var(--brufin-accent-ink)]" />Use my server with seamless sync</span>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Set up a fresh server in its browser, then scan its QR with your phone. Changes sync across devices and queue offline.</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 border-t border-[#E8E1DB]/70 pt-3 text-[11px] text-slate-400 dark:border-[#363B44] dark:text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Offline-first · No cloud account required</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};
