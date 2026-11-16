import React, { useEffect, useState } from 'react';
import { Check, Cloud, CloudOff, LoaderCircle, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import {
  getServerSyncConfig,
  resolveServerSyncConflict,
  syncNow,
} from '../utils/serverSync';
import type { ServerSyncStatus } from '../utils/serverSync';

interface Props {
  status: ServerSyncStatus;
  onConnect: (serverUrl: string, token: string, strategy: 'server' | 'device') => Promise<void>;
  onDisconnect: () => Promise<void>;
}

const stateLabel: Record<ServerSyncStatus['state'], string> = {
  local: 'This device only',
  setup: 'Choose sync direction',
  syncing: 'Syncing',
  connected: 'Connected',
  offline: 'Offline · queued',
  conflict: 'Review conflicts',
};

function previewValue(value: unknown): string {
  if (value === null || value === undefined) return 'Deleted';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const parts = [item.description, item.name, item.date, typeof item.amount === 'number' ? `₹${item.amount.toLocaleString('en-IN')}` : null]
      .filter((part): part is string => typeof part === 'string' && !!part.trim());
    return parts.length ? parts.join(' · ') : JSON.stringify(value).slice(0, 90);
  }
  return String(value);
}

export const ServerSyncPanel: React.FC<Props> = ({ status, onConnect, onDisconnect }) => {
  const savedConfig = getServerSyncConfig();
  const [serverUrl, setServerUrl] = useState(savedConfig?.serverUrl || '');
  const [token, setToken] = useState(savedConfig?.token || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const current = getServerSyncConfig();
    if (current) {
      setServerUrl(current.serverUrl);
      setToken(current.token);
    }
  }, [status.configured]);

  const connect = async (strategy: 'server' | 'device') => {
    if (strategy === 'server' && !confirm('Load the server copy onto this device? If the server is empty, this device’s current data will initialize it. If the server already has data, this device’s current local data will be replaced. Export a backup first if you need both copies.')) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await onConnect(serverUrl, token, strategy);
      setSuccess(strategy === 'server' ? 'This device now uses the server copy.' : 'This device’s data was uploaded to the server.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect to the BruFin server.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect this device from the server? Its local data will remain on this device.')) return;
    setBusy(true);
    setError(null);
    try {
      await onDisconnect();
      setToken('');
      setSuccess('Disconnected. This device will keep using its local data.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not disconnect this device.');
    } finally {
      setBusy(false);
    }
  };

  const labelClass = status.state === 'connected'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : status.state === 'conflict'
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
      : status.state === 'offline'
        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
        : 'bg-[#FDF4E7] text-[#996520] dark:bg-[#B84E3B]/15 dark:text-[#FF927A]';

  return (
    <section className="space-y-3 rounded-2xl border border-[#E8E1DB] bg-white p-4 dark:border-[#363B44] dark:bg-[#22252A]" aria-labelledby="server-sync-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDF4E7] text-[#EF6448] dark:bg-[#B84E3B]/15 dark:text-[#FF927A]"><Cloud className="h-4 w-4" /></span>
          <div>
            <h3 id="server-sync-title" className="text-sm font-bold text-slate-900 dark:text-[#F2F3F5]">Self-hosted server</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Keep this device in sync with your private BruFin server.</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${labelClass}`}>
          {status.state === 'syncing' && <LoaderCircle className="mr-1 inline h-3 w-3 animate-spin" />}
          {status.state === 'offline' && <CloudOff className="mr-1 inline h-3 w-3" />}
          {status.state === 'connected' && <Check className="mr-1 inline h-3 w-3" />}
          {stateLabel[status.state]}
        </span>
      </div>

      <p className="rounded-xl bg-[#F7F6F3] px-3 py-2 text-[11px] leading-relaxed text-slate-600 dark:bg-[#1B1E22] dark:text-slate-300" role="status">
        {status.message}
        {status.pending && status.state !== 'conflict' && <span> Your edits are saved locally and will retry automatically.</span>}
      </p>

      {status.conflicts.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-300/70 bg-amber-50/70 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Both this device and the server changed the same item.</p>
          {status.conflicts.map((conflict) => (
            <div key={conflict.id} className="rounded-lg bg-white/80 p-2.5 dark:bg-[#1B1E22]">
              <p className="mb-2 truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{conflict.description}</p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void resolveServerSyncConflict(conflict.id, 'local')} className="flex-1 rounded-lg bg-[#EF6448] px-2 py-1.5 text-left text-[10px] font-bold text-white disabled:opacity-50">This device<span className="mt-0.5 block truncate font-medium opacity-85">{previewValue(conflict.localValue)}</span></button>
                <button type="button" disabled={busy} onClick={() => void resolveServerSyncConflict(conflict.id, 'server')} className="flex-1 rounded-lg border border-[#E8E1DB] px-2 py-1.5 text-left text-[10px] font-bold text-slate-700 dark:border-[#363B44] dark:text-slate-200 disabled:opacity-50">Server<span className="mt-0.5 block truncate font-medium opacity-75">{previewValue(conflict.serverValue)}</span></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Server URL</span>
        <input value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} placeholder="https://brufin.your-home.net" inputMode="url" autoCapitalize="none" autoCorrect="off" className="w-full rounded-xl border border-[#E8E1DB] bg-[#F7F6F3] px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#EF6448] dark:border-[#363B44] dark:bg-[#1B1E22] dark:text-[#F2F3F5]" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Access token</span>
        <input value={token} onChange={(event) => setToken(event.target.value)} type="password" autoComplete="current-password" placeholder="BRUFIN_API_TOKEN from your server" className="w-full rounded-xl border border-[#E8E1DB] bg-[#F7F6F3] px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#EF6448] dark:border-[#363B44] dark:bg-[#1B1E22] dark:text-[#F2F3F5]" />
      </label>

      {!status.configured || status.state === 'setup' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" disabled={busy || !serverUrl || !token} onClick={() => void connect('server')} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E8E1DB] px-3 py-2.5 text-[11px] font-bold text-slate-700 hover:border-[#EF6448] dark:border-[#363B44] dark:text-slate-200 disabled:opacity-50"><Cloud className="h-3.5 w-3.5" />Use server data</button>
          <button type="button" disabled={busy || !serverUrl || !token} onClick={() => { if (confirm('Upload this device’s current BruFin data to the server? If the server already has data, its current snapshot will be replaced.')) void connect('device'); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#EF6448] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[#E05338] disabled:opacity-50"><ShieldCheck className="h-3.5 w-3.5" />Upload this device</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => void syncNow()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#EF6448] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[#E05338] disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Sync now</button>
          <button type="button" disabled={busy} onClick={() => void disconnect()} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E8E1DB] px-3 py-2.5 text-[11px] font-bold text-slate-600 dark:border-[#363B44] dark:text-slate-300 disabled:opacity-50"><Unplug className="h-3.5 w-3.5" />Disconnect</button>
        </div>
      )}
      {error && <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
      {success && <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300" role="status">{success}</p>}
      <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">Use a private LAN/VPN address or HTTPS URL. The token grants access to your financial data and is stored on this device.</p>
    </section>
  );
};
