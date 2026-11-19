import React, { useEffect, useState } from 'react';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import QRCode from 'qrcode';
import { Check, Cloud, CloudOff, LoaderCircle, QrCode, RefreshCw, ScanLine, ShieldCheck, Unplug, X } from 'lucide-react';
import {
  createServerPairingCode,
  claimServerBootstrap,
  exchangeServerPairingCode,
  getConnectedServerDevices,
  getServerDeviceName,
  getServerSyncConfig,
  isServerBootstrapAvailable,
  isHttpServerAllowed,
  resolveServerSyncConflict,
  saveServerDeviceName,
  setHttpServerAllowed,
  syncNow,
} from '../utils/serverSync';
import type { ServerDevice, ServerSyncStatus } from '../utils/serverSync';

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

function isLoopbackAddress(value: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function lastSeenLabel(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp * 1000) / 60_000));
  if (minutes < 1) return 'Seen just now';
  if (minutes < 60) return `Seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Seen ${hours}h ago`;
  return `Seen ${Math.floor(hours / 24)}d ago`;
}

export const ServerSyncPanel: React.FC<Props> = ({ status, onConnect, onDisconnect }) => {
  const savedConfig = getServerSyncConfig();
  const [serverUrl, setServerUrl] = useState(savedConfig?.serverUrl || (!Capacitor.isNativePlatform() ? window.location.origin : ''));
  const [token, setToken] = useState(savedConfig?.token || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualSetupOpen, setManualSetupOpen] = useState(!Capacitor.isNativePlatform());
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);
  const [checkingBootstrap, setCheckingBootstrap] = useState(false);
  const [allowHttp, setAllowHttp] = useState(isHttpServerAllowed());
  const [deviceName, setDeviceName] = useState(getServerDeviceName());
  const [devices, setDevices] = useState<ServerDevice[]>([]);
  const [pairQr, setPairQr] = useState<string | null>(null);
  const [pairExpiresAt, setPairExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const current = getServerSyncConfig();
    if (current) {
      setServerUrl(current.serverUrl);
      setToken(current.token);
    }
  }, [status.configured]);

  useEffect(() => {
    if (!status.configured) {
      setDevices([]);
      return;
    }
    let active = true;
    const refreshDevices = () => {
      void getConnectedServerDevices().then((connectedDevices) => {
        if (active) setDevices(connectedDevices);
      }).catch(() => { /* Keep the last known device list while offline. */ });
    };
    refreshDevices();
    const timer = window.setInterval(refreshDevices, 20_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [status.configured]);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || status.configured || !serverUrl || serverUrl.replace(/\/$/, '') !== window.location.origin.replace(/\/$/, '')) return;
    let active = true;
    setCheckingBootstrap(true);
    void isServerBootstrapAvailable(serverUrl).then((available) => {
      if (!active) return;
      setBootstrapAvailable(available);
      if (available) setManualSetupOpen(false);
    }).finally(() => {
      if (active) setCheckingBootstrap(false);
    });
    return () => { active = false; };
  }, [serverUrl, status.configured]);

  useEffect(() => {
    if (!pairExpiresAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((pairExpiresAt * 1000 - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (!remaining) setPairQr(null);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [pairExpiresAt]);

  const connect = async (strategy: 'server' | 'device') => {
    if (Capacitor.isNativePlatform() && serverUrl.toLowerCase().startsWith('http://') && !allowHttp) {
      setError('This server uses HTTP. Enable “Allow HTTP for trusted LAN/VPN” before connecting.');
      return;
    }
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

  const claimAndConnect = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const claimedToken = await claimServerBootstrap(serverUrl);
      setToken(claimedToken);
      await onConnect(serverUrl, claimedToken, 'server');
      setBootstrapAvailable(false);
      setSuccess('Server is ready. Use Settings to show the QR code for your phone.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not set up this BruFin server.');
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

  const makePairingQr = async () => {
    const config = getServerSyncConfig();
    const activeServerUrl = config?.serverUrl || serverUrl;
    const activeToken = config?.token || token;
    if (!activeServerUrl || !activeToken) {
      setError('Enter the server URL and access token before generating a pairing QR.');
      return;
    }
    if (isLoopbackAddress(activeServerUrl)) {
      setError('A phone cannot reach localhost on this computer. Open BruFin using this computer’s LAN or VPN address, then generate the QR again.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const pairing = await createServerPairingCode(activeServerUrl, activeToken);
      const payload = JSON.stringify({ type: 'brufin-pair', version: 1, serverUrl: activeServerUrl, code: pairing.code });
      setPairQr(await QRCode.toDataURL(payload, { width: 280, margin: 2, errorCorrectionLevel: 'M' }));
      setPairExpiresAt(pairing.expiresAt);
      setSuccess('Pairing QR ready. It expires in 5 minutes and works once.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create a pairing QR.');
    } finally {
      setBusy(false);
    }
  };

  const scanPairingQr = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (!Capacitor.isNativePlatform()) throw new Error('Scan pairing QR codes in the BruFin Android app.');
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) throw new Error('This device does not have a supported camera scanner.');
      if (Capacitor.getPlatform() === 'android') {
        const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        if (!available) {
          await BarcodeScanner.installGoogleBarcodeScannerModule();
          throw new Error('The QR scanner is being installed by Google Play services. Try scanning again in a moment.');
        }
      }
      const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode], autoZoom: true });
      const raw = barcodes[0]?.rawValue;
      if (!raw) throw new Error('No QR code was read. Try again with the QR fully in view.');
      const payload = JSON.parse(raw) as { type?: unknown; version?: unknown; serverUrl?: unknown; code?: unknown };
      if (payload.type !== 'brufin-pair' || payload.version !== 1 || typeof payload.serverUrl !== 'string' || typeof payload.code !== 'string') {
        throw new Error('This is not a valid BruFin pairing QR.');
      }
      if (payload.serverUrl.toLowerCase().startsWith('http://') && !allowHttp) {
        throw new Error('This QR uses HTTP. Enable “Allow HTTP for trusted LAN/VPN” below before scanning again.');
      }
      const pairedToken = await exchangeServerPairingCode(payload.serverUrl, payload.code);
      setServerUrl(payload.serverUrl);
      setToken(pairedToken);
      setManualSetupOpen(false);
      setSuccess('Server paired. Choose whether to use the server data or upload this device’s data.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not scan the pairing QR.');
    } finally {
      setBusy(false);
    }
  };

  const saveDeviceName = async () => {
    const saved = saveServerDeviceName(deviceName);
    setDeviceName(saved);
    if (status.configured) {
      try { setDevices(await getConnectedServerDevices()); } catch { /* A later refresh will retry. */ }
    }
  };

  const updateHttpPreference = (enabled: boolean) => {
    setAllowHttp(enabled);
    setHttpServerAllowed(enabled);
    if (status.configured) void syncNow();
  };

  const labelClass = status.state === 'connected'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : status.state === 'conflict'
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
      : status.state === 'offline'
        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
        : 'bg-[var(--brufin-warm-soft)] text-[var(--brufin-warm-ink)] dark:bg-[var(--brufin-accent-active)]/15 dark:text-[var(--brufin-accent-ink)]';

  return (
    <section className="space-y-3 rounded-2xl border border-[#E8E1DB] bg-white p-4 dark:border-[#363B44] dark:bg-[#22252A]" aria-labelledby="server-sync-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brufin-warm-soft)] text-[var(--brufin-accent-ink)] dark:bg-[var(--brufin-accent-active)]/15 dark:text-[var(--brufin-accent-ink)]"><Cloud className="h-4 w-4" /></span>
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

      {Capacitor.isNativePlatform() && <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 dark:border-amber-900/70 dark:bg-amber-950/15">
        <label className="flex cursor-pointer items-start gap-2 text-[11px] font-bold text-slate-800 dark:text-slate-100">
          <input type="checkbox" checked={allowHttp} onChange={(event) => updateHttpPreference(event.target.checked)} className="mt-0.5 accent-[var(--brufin-accent-bg)]" />
          <span>Allow HTTP for trusted LAN/VPN</span>
        </label>
        <p className="mt-1 pl-5 text-[10px] leading-relaxed text-amber-900 dark:text-amber-200">HTTP does not encrypt your access token or finance data. Enable only on a trusted home network or VPN; use HTTPS on public networks.</p>
      </div>}

      {status.configured && <div className="space-y-2 rounded-xl border border-[#E8E1DB] bg-[#FAF9F7] p-3 dark:border-[#363B44] dark:bg-[#1B1E22]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">Connected devices</p>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">{devices.filter((device) => device.online).length} online</span>
        </div>
        <label className="block space-y-1"><span className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">This device name</span><input value={deviceName} maxLength={48} onChange={(event) => setDeviceName(event.target.value)} onBlur={() => void saveDeviceName()} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="w-full rounded-lg border border-[#E8E1DB] bg-white px-2.5 py-2 text-[11px] text-slate-800 outline-none focus:border-[var(--brufin-accent-border)] dark:border-[#363B44] dark:bg-[#22252A] dark:text-slate-100" /></label>
        {devices.length > 0 ? <ul className="space-y-1.5">{devices.map((device) => <li key={device.clientId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 dark:bg-[#22252A]">
          <div className="min-w-0"><p className="truncate text-[10px] font-semibold text-slate-800 dark:text-slate-100">{device.name}{device.clientId === getServerSyncConfig()?.clientId ? <span className="ml-1 text-slate-400">(this device)</span> : ''}</p><p className="text-[9px] text-slate-500 dark:text-slate-400">{device.online ? 'Connected now' : lastSeenLabel(device.lastSeen)}</p></div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${device.online ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{device.online ? 'Online' : 'Offline'}</span>
        </li>)}</ul> : <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">This device will appear here after its next sync.</p>}
      </div>}

      {status.conflicts.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-300/70 bg-amber-50/70 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Both this device and the server changed the same item.</p>
          {status.conflicts.map((conflict) => (
            <div key={conflict.id} className="rounded-lg bg-white/80 p-2.5 dark:bg-[#1B1E22]">
              <p className="mb-2 truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{conflict.description}</p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void resolveServerSyncConflict(conflict.id, 'local')} className="flex-1 rounded-lg bg-[var(--brufin-accent-bg)] px-2 py-1.5 text-left text-[10px] font-bold text-white disabled:opacity-50">This device<span className="mt-0.5 block truncate font-medium opacity-85">{previewValue(conflict.localValue)}</span></button>
                <button type="button" disabled={busy} onClick={() => void resolveServerSyncConflict(conflict.id, 'server')} className="flex-1 rounded-lg border border-[#E8E1DB] px-2 py-1.5 text-left text-[10px] font-bold text-slate-700 dark:border-[#363B44] dark:text-slate-200 disabled:opacity-50">Server<span className="mt-0.5 block truncate font-medium opacity-75">{previewValue(conflict.serverValue)}</span></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!status.configured || status.state === 'setup' ? (
        <div className="space-y-2">
          {Capacitor.isNativePlatform() && <>
            <button type="button" disabled={busy} onClick={() => void scanPairingQr()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brufin-accent-bg)] px-3 py-3 text-xs font-bold text-white hover:bg-[var(--brufin-accent-bg-hover)] disabled:opacity-50"><ScanLine className="h-4 w-4" />{busy ? 'Connecting…' : 'Scan server QR'}</button>
            <button type="button" onClick={() => setManualSetupOpen((open) => !open)} className="w-full py-1 text-[10px] font-semibold text-slate-500 underline decoration-dotted underline-offset-2 dark:text-slate-400">{manualSetupOpen ? 'Hide manual setup' : 'Set up manually instead'}</button>
          </>}
          {!Capacitor.isNativePlatform() && bootstrapAvailable && <div className="space-y-2 rounded-xl border border-[var(--brufin-accent-border)]/25 bg-[#FFF8F3] p-3 dark:bg-[#2A2523]">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-[#F2F3F5]">First time on this server?</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">Set it up here, then open Settings to show a QR code for BruFin on your phone. No token lookup needed.</p>
              <p className="mt-1.5 text-[9px] leading-relaxed text-amber-800 dark:text-amber-300">This one-time setup is available to whoever reaches the empty server first. Use it only on your private LAN or VPN.</p>
            </div>
            <button type="button" disabled={busy} onClick={() => void claimAndConnect()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brufin-accent-bg)] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[var(--brufin-accent-bg-hover)] disabled:opacity-50"><ShieldCheck className="h-4 w-4" />{busy ? 'Setting up…' : 'Set up this server'}</button>
            <button type="button" onClick={() => setManualSetupOpen(true)} className="w-full py-0.5 text-[10px] font-semibold text-slate-500 underline decoration-dotted underline-offset-2 dark:text-slate-400">Use an access token instead</button>
          </div>}
          {!Capacitor.isNativePlatform() && checkingBootstrap && !bootstrapAvailable && <p className="text-[10px] text-slate-500 dark:text-slate-400">Checking whether this server needs first-time setup…</p>}
          {manualSetupOpen && <div className="space-y-2">
            <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Server URL</span><input value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} placeholder="http://192.168.1.20:8780" inputMode="url" autoCapitalize="none" autoCorrect="off" className="w-full rounded-xl border border-[#E8E1DB] bg-[#F7F6F3] px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[var(--brufin-accent-border)] dark:border-[#363B44] dark:bg-[#1B1E22] dark:text-[#F2F3F5]" />{!Capacitor.isNativePlatform() && isLoopbackAddress(serverUrl) && <span className="block text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">For phone pairing, open this page with the server’s LAN/VPN address; localhost only works on this computer.</span>}</label>
            <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Access token</span><input value={token} onChange={(event) => setToken(event.target.value)} type="password" autoComplete="current-password" placeholder="Server access token" className="w-full rounded-xl border border-[#E8E1DB] bg-[#F7F6F3] px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[var(--brufin-accent-border)] dark:border-[#363B44] dark:bg-[#1B1E22] dark:text-[#F2F3F5]" /></label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" disabled={busy || !serverUrl || !token} onClick={() => void connect('server')} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E8E1DB] px-3 py-2.5 text-[11px] font-bold text-slate-700 hover:border-[var(--brufin-accent-border)] dark:border-[#363B44] dark:text-slate-200 disabled:opacity-50"><Cloud className="h-3.5 w-3.5" />Use server data</button><button type="button" disabled={busy || !serverUrl || !token} onClick={() => { if (confirm('Upload this device’s current BruFin data to the server? If the server already has data, its current snapshot will be replaced.')) void connect('device'); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brufin-accent-bg)] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[var(--brufin-accent-bg-hover)] disabled:opacity-50"><ShieldCheck className="h-3.5 w-3.5" />Upload this device</button></div>
            {!Capacitor.isNativePlatform() && <button type="button" disabled={busy || !serverUrl || !token} onClick={() => void makePairingQr()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E1DB] px-3 py-2.5 text-[11px] font-bold text-slate-700 hover:border-[var(--brufin-accent-border)] dark:border-[#363B44] dark:text-slate-200 disabled:opacity-50"><QrCode className="h-4 w-4" />Generate phone pairing QR</button>}
          </div>}
          {serverUrl && token && !status.configured && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" disabled={busy} onClick={() => void connect('server')} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E8E1DB] px-3 py-2.5 text-[11px] font-bold text-slate-700 hover:border-[var(--brufin-accent-border)] dark:border-[#363B44] dark:text-slate-200 disabled:opacity-50"><Cloud className="h-3.5 w-3.5" />Use server data</button><button type="button" disabled={busy} onClick={() => { if (confirm('Upload this device’s current BruFin data to the server? If the server already has data, its current snapshot will be replaced.')) void connect('device'); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brufin-accent-bg)] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[var(--brufin-accent-bg-hover)] disabled:opacity-50"><ShieldCheck className="h-3.5 w-3.5" />Upload this device</button></div>}
        </div>
      ) : (
        <div className="space-y-2">
          {!Capacitor.isNativePlatform() && <button type="button" disabled={busy} onClick={() => void makePairingQr()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E1DB] px-3 py-2.5 text-[11px] font-bold text-slate-700 hover:border-[var(--brufin-accent-border)] dark:border-[#363B44] dark:text-slate-200 disabled:opacity-50"><QrCode className="h-4 w-4" />Show QR to pair a phone</button>}
          <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void syncNow()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--brufin-accent-bg)] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[var(--brufin-accent-bg-hover)] disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Sync now</button><button type="button" disabled={busy} onClick={() => void disconnect()} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E8E1DB] px-3 py-2.5 text-[11px] font-bold text-slate-600 dark:border-[#363B44] dark:text-slate-300 disabled:opacity-50"><Unplug className="h-3.5 w-3.5" />Disconnect</button></div>
        </div>
      )}
      {pairQr && <div className="relative flex flex-col items-center gap-2 rounded-2xl border border-[#E8E1DB] bg-[#F7F6F3] p-3 dark:border-[#363B44] dark:bg-[#1B1E22]">
        <button type="button" aria-label="Close pairing QR" onClick={() => setPairQr(null)} className="absolute right-2 top-2 rounded-lg p-1 text-slate-500 hover:bg-white dark:hover:bg-[#363B44]"><X className="h-4 w-4" /></button>
        <img src={pairQr} alt="One-time BruFin device pairing QR code" className="h-56 w-56 rounded-xl bg-white p-2" />
        <p className="text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300">Scan with BruFin on the phone · expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</p>
        <p className="text-center text-[9px] text-slate-500 dark:text-slate-400">One use only. Keep this QR private and close it after pairing.</p>
      </div>}
      {error && <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
      {success && <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300" role="status">{success}</p>}
      <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">Use a private LAN/VPN address or HTTPS URL. The server page displays a short-lived one-time QR code; it does not contain your server token.</p>
    </section>
  );
};
