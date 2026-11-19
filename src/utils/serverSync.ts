/**
 * Optional server synchronization: tracks the common revision, merges local and remote snapshots, and preserves unresolved conflicts for user choice. Standalone use does not require this module to contact a server.
 */
import type { LocalDatabaseData } from './localDatabase';
import { Capacitor } from '@capacitor/core';
import {
  getLocalDatabaseData,
  loadSyncMetadata,
  replaceLocalDatabaseData,
  saveSyncMetadata,
} from './localDatabase';

const CONFIG_KEY = 'brufin_server_sync_config_v1';
const BASE_KEY = 'server_sync_base';
const CONFLICTS_KEY = 'server_sync_conflicts';
const DEVICE_NAME_KEY = 'brufin_device_name_v1';
const ALLOW_HTTP_KEY = 'brufin_allow_http_server_v1';

export interface ServerSyncConfig {
  serverUrl: string;
  token: string;
  clientId: string;
}

export interface ServerDevice {
  clientId: string;
  name: string;
  platform: 'android' | 'ios' | 'web';
  lastSeen: number;
  online: boolean;
}

export interface SyncConflict {
  id: string;
  section: keyof LocalDatabaseData;
  itemKey: string;
  localValue: unknown;
  serverValue: unknown;
  description: string;
}

interface SyncBase {
  revision: number;
  data: LocalDatabaseData;
}

interface ServerState {
  revision: number;
  data: LocalDatabaseData | null;
  updatedAt?: string;
}

export interface ServerSyncStatus {
  configured: boolean;
  state: 'local' | 'setup' | 'syncing' | 'connected' | 'offline' | 'conflict';
  pending: boolean;
  conflicts: SyncConflict[];
  message: string;
  revision?: number;
  lastSyncedAt?: string;
}

const arraySections: (keyof LocalDatabaseData)[] = [
  'transactions', 'creditCards', 'recurringPayments', 'investments', 'loans', 'bankAccounts',
  'monthlyBalances', 'paymentMethods', 'expenseCategories', 'incomeCategories',
];
const listeners = new Set<(status: ServerSyncStatus) => void>();
let status: ServerSyncStatus = {
  configured: false,
  state: 'local',
  pending: false,
  conflicts: [],
  message: 'This device only',
};
let syncPromise: Promise<void> | null = null;
let debounceTimer: number | undefined;
let monitorStarted = false;
let localChangeEpoch = 0;

/** Create id. Uses crypto.randomUUID, Date.now, toString to perform the operation. */
function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

/** Default device name. Uses i.test to perform the operation. */
function defaultDeviceName(): string {
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) return 'Android phone';
  if (typeof navigator !== 'undefined' && /iphone|ipad/i.test(navigator.userAgent)) return 'iPhone or iPad';
  return 'BruFin browser';
}

/** Get server device name. Uses localStorage.getItem, trim, defaultDeviceName to perform the operation. */
export function getServerDeviceName(): string {
  try {
    return localStorage.getItem(DEVICE_NAME_KEY)?.trim() || defaultDeviceName();
  } catch {
    return defaultDeviceName();
  }
}

/** Save server device name. Uses value.replace, trim, slice to perform the operation. */
export function saveServerDeviceName(value: string): string {
  const name = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 48) || defaultDeviceName();
  try { localStorage.setItem(DEVICE_NAME_KEY, name); } catch { /* Browser storage may be unavailable. */ }
  return name;
}

/** Is http server allowed. Uses localStorage.getItem to perform the operation. */
export function isHttpServerAllowed(): boolean {
  try { return localStorage.getItem(ALLOW_HTTP_KEY) === 'true'; } catch { return false; }
}

/** Set http server allowed. Uses localStorage.setItem to perform the operation. */
export function setHttpServerAllowed(allowed: boolean): void {
  try { localStorage.setItem(ALLOW_HTTP_KEY, allowed ? 'true' : 'false'); } catch { /* Browser storage may be unavailable. */ }
}

/** Reject an HTTP server URL unless the user has enabled trusted LAN/VPN HTTP connections. */
function assertHttpServerAllowed(serverUrl: string): void {
  if (!Capacitor.isNativePlatform() || !serverUrl.toLowerCase().startsWith('http://')) return;
  if (!isHttpServerAllowed()) {
    throw new Error('This QR uses HTTP. Turn on “Allow HTTP for trusted LAN/VPN” before pairing. HTTP does not encrypt your BruFin data or access token.');
  }
}

/** Parse config. Uses localStorage.getItem, JSON.parse to perform the operation. */
function parseConfig(): ServerSyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ServerSyncConfig>;
    if (typeof value.serverUrl !== 'string' || typeof value.token !== 'string' || typeof value.clientId !== 'string') return null;
    return value as ServerSyncConfig;
  } catch {
    return null;
  }
}

/** Set status. Uses listeners.forEach, listener to perform the operation. */
function setStatus(next: Partial<ServerSyncStatus>) {
  status = { ...status, ...next };
  listeners.forEach((listener) => listener(status));
}

/** Equal. Uses JSON.stringify to perform the operation. */
function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Clone data. Uses JSON.parse, JSON.stringify to perform the operation. */
function cloneData(data: LocalDatabaseData): LocalDatabaseData {
  return JSON.parse(JSON.stringify(data)) as LocalDatabaseData;
}

/** Item key. Uses String to perform the operation. */
function itemKey(section: keyof LocalDatabaseData, item: unknown): string {
  if (section === 'expenseCategories' || section === 'incomeCategories') return String(item);
  return item && typeof item === 'object' && 'id' in item ? String((item as { id: unknown }).id) : '';
}

/** Compare each record against the shared base. Accept one-sided changes and retain competing changes as explicit conflicts. */
function mergeSnapshots(base: LocalDatabaseData, local: LocalDatabaseData, remote: LocalDatabaseData) {
  const merged = cloneData(remote);
  const conflicts: SyncConflict[] = [];
  for (const section of arraySections) {
    const baseItems = base[section] as unknown[];
    const localItems = local[section] as unknown[];
    const remoteItems = remote[section] as unknown[];
    const baseMap = new Map(baseItems.map((item) => [itemKey(section, item), item]));
    const localMap = new Map(localItems.map((item) => [itemKey(section, item), item]));
    const remoteMap = new Map(remoteItems.map((item) => [itemKey(section, item), item]));
    const result = new Map(remoteMap);
    const keys = new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()]);
    for (const key of keys) {
      const baseValue = baseMap.get(key);
      const localValue = localMap.get(key);
      const serverValue = remoteMap.get(key);
      const localChanged = !equal(localValue, baseValue);
      const serverChanged = !equal(serverValue, baseValue);
      if (!localChanged) continue;
      if (!serverChanged || equal(localValue, serverValue)) {
        if (localValue === undefined) result.delete(key);
        else result.set(key, localValue);
        continue;
      }
      conflicts.push({
        id: `${section}:${key}`,
        section,
        itemKey: key,
        localValue: localValue ?? null,
        serverValue: serverValue ?? null,
        description: `${String(section)} · ${key}`,
      });
      // Hold the server copy locally until the user chooses which version to keep.
    }
    (merged as unknown as Record<string, unknown>)[section] = [...result.values()];
  }
  if (!equal(local.monthlyTarget, base.monthlyTarget) && !equal(remote.monthlyTarget, base.monthlyTarget)
      && !equal(local.monthlyTarget, remote.monthlyTarget)) {
    conflicts.push({
      id: 'monthlyTarget:budget',
      section: 'monthlyTarget',
      itemKey: 'budget',
      localValue: local.monthlyTarget,
      serverValue: remote.monthlyTarget,
      description: 'Monthly budget target',
    });
  } else if (!equal(local.monthlyTarget, base.monthlyTarget)) {
    merged.monthlyTarget = local.monthlyTarget;
  }
  return { merged, conflicts };
}

/** Send an authenticated server request with device headers and translate HTTP failures into caller-visible errors. */
async function request<T>(path: string, init: RequestInit = {}, config = parseConfig()): Promise<T> {
  if (!config) throw new Error('Connect this device to your BruFin server in Settings.');
  assertHttpServerAllowed(config.serverUrl);
  let response: Response;
  try {
    response = await fetch(`${config.serverUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'X-BruFin-Client-Id': config.clientId,
        'X-BruFin-Device-Name': getServerDeviceName(),
        'X-BruFin-Platform': Capacitor.getPlatform(),
        ...init.headers,
      },
    });
  } catch {
    throw new Error(`Could not reach BruFin at ${config.serverUrl}. Check the server address and port 8780, and make sure this phone can reach it on the same LAN or VPN.`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 409) {
    throw new Error(typeof payload.error === 'string' ? payload.error : `Server returned HTTP ${response.status}`);
  }
  return { ...payload, _status: response.status } as T;
}

/** Get remote. Returns the value derived from the inputs and state below. */
async function getRemote(config?: ServerSyncConfig | null): Promise<ServerState> {
  return request<ServerState>('/api/state', {}, config);
}

/** Push snapshot. Uses parseConfig, Error, JSON.stringify to perform the operation. */
async function pushSnapshot(data: LocalDatabaseData, baseRevision: number, config?: ServerSyncConfig | null) {
  const activeConfig = config || parseConfig();
  if (!activeConfig) throw new Error('No server configured.');
  const response = await request<ServerState & { _status?: number }>('/api/state', {
    method: 'POST',
    body: JSON.stringify({
      baseRevision,
      mutationId: `${activeConfig.clientId}_${createId()}`,
      data,
    }),
  }, activeConfig);
  return response;
}

/** Set base. Uses cloneData to perform the operation. */
async function setBase(revision: number, data: LocalDatabaseData) {
  await saveSyncMetadata<SyncBase>(BASE_KEY, { revision, data: cloneData(data) });
}

/** Apply remote data. Uses replaceLocalDatabaseData to perform the operation. */
async function applyRemoteData(data: LocalDatabaseData) {
  await replaceLocalDatabaseData(data);
}

/** Get server sync config. Uses parseConfig to perform the operation. */
export function getServerSyncConfig(): ServerSyncConfig | null {
  return parseConfig();
}

/** Get connected server devices. Uses Array.isArray to perform the operation. */
export async function getConnectedServerDevices(): Promise<ServerDevice[]> {
  const payload = await request<{ devices?: ServerDevice[] }>('/api/devices');
  return Array.isArray(payload.devices) ? payload.devices : [];
}

/** Is server bootstrap available. Uses serverUrlInput.trim, replace, i.test to perform the operation. */
export async function isServerBootstrapAvailable(serverUrlInput: string): Promise<boolean> {
  const serverUrl = serverUrlInput.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(serverUrl)) return false;
  try {
    const response = await fetch(`${serverUrl}/api/health`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload.bootstrapAvailable === true;
  } catch {
    return false;
  }
}

/** Claim server bootstrap. Uses serverUrlInput.trim, replace, i.test to perform the operation. */
export async function claimServerBootstrap(serverUrlInput: string): Promise<string> {
  const serverUrl = serverUrlInput.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(serverUrl)) throw new Error('Enter a valid BruFin server URL.');
  const response = await fetch(`${serverUrl}/api/bootstrap/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.token !== 'string') {
    throw new Error(typeof payload.error === 'string' ? payload.error : `Could not set up this server (HTTP ${response.status}).`);
  }
  return payload.token as string;
}

/** Request a short-lived pairing code from the authenticated server for displaying in a QR code. */
export async function createServerPairingCode(serverUrlInput: string, tokenInput: string) {
  const serverUrl = serverUrlInput.trim().replace(/\/+$/, '');
  const token = tokenInput.trim();
  if (!/^https?:\/\//i.test(serverUrl) || !token) throw new Error('Connect to your server before pairing another device.');
  const response = await fetch(`${serverUrl}/api/pairing`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.code !== 'string' || typeof payload.expiresAt !== 'number') {
    throw new Error(typeof payload.error === 'string' ? payload.error : `Could not create a pairing code (HTTP ${response.status}).`);
  }
  return { code: payload.code as string, expiresAt: payload.expiresAt as number };
}

/** Exchange the scanned pairing code for server credentials so the phone can establish its connection. */
export async function exchangeServerPairingCode(serverUrlInput: string, code: string): Promise<string> {
  const serverUrl = serverUrlInput.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(serverUrl)) throw new Error('The pairing QR contains an invalid server URL.');
  assertHttpServerAllowed(serverUrl);
  let response: Response;
  try {
    response = await fetch(`${serverUrl}/api/pairing/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch {
    throw new Error(`Could not reach the server at ${serverUrl}. Verify that the phone and server share the same LAN/VPN and that the configured port is open.`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.token !== 'string') {
    throw new Error(typeof payload.error === 'string' ? payload.error : `Could not pair with the server (HTTP ${response.status}).`);
  }
  return payload.token as string;
}

/** Get server sync status. Uses parseConfig to perform the operation. */
export function getServerSyncStatus(): ServerSyncStatus {
  const configured = !!parseConfig();
  return { ...status, configured, conflicts: status.conflicts };
}

/** Subscribe to server sync. Uses listeners.add, listener, getServerSyncStatus to perform the operation. */
export function subscribeToServerSync(listener: (value: ServerSyncStatus) => void): () => void {
  listeners.add(listener);
  listener(getServerSyncStatus());
  return () => listeners.delete(listener);
}

/** Validate and save the server connection, then initialize synchronization using the selected source of data. */
export async function configureServerSync(
  serverUrlInput: string,
  tokenInput: string,
  strategy: 'server' | 'device'
): Promise<void> {
  const serverUrl = serverUrlInput.trim().replace(/\/+$/, '');
  const token = tokenInput.trim();
  if (!/^https?:\/\//i.test(serverUrl)) throw new Error('Enter a server URL beginning with http:// or https://');
  if (!token) throw new Error('Enter the server access token.');
  const config: ServerSyncConfig = {
    serverUrl,
    token,
    clientId: createId(),
  };
  setStatus({ state: 'syncing', message: 'Connecting to BruFin server…', configured: true });
  try {
    const remote = await getRemote(config);
    const local = cloneData(getLocalDatabaseData());
    await saveSyncMetadata(CONFLICTS_KEY, [] satisfies SyncConflict[]);
    let selectedData: LocalDatabaseData;
    if (strategy === 'server' && remote.data) {
      selectedData = remote.data;
      await applyRemoteData(selectedData);
    } else {
      selectedData = local;
      const result = await pushSnapshot(local, remote.revision, config);
      if (result._status === 409) throw new Error('The server changed during setup. Try connecting again.');
      selectedData = result.data || local;
      await setBase(result.revision, selectedData);
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      setStatus({ state: 'connected', pending: false, conflicts: [], revision: result.revision, message: 'Connected · up to date', lastSyncedAt: new Date().toISOString() });
      return;
    }
    await setBase(remote.revision, selectedData);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    setStatus({ state: 'connected', pending: false, conflicts: [], revision: remote.revision, message: 'Connected · up to date', lastSyncedAt: new Date().toISOString() });
  } catch (error) {
    setStatus({ configured: false, state: 'local', pending: false, message: 'Could not connect. Check the URL and token.' });
    throw error;
  }
}

/** Disconnect server sync. Uses localStorage.removeItem, saveSyncMetadata, setStatus to perform the operation. */
export async function disconnectServerSync() {
  localStorage.removeItem(CONFIG_KEY);
  await saveSyncMetadata(CONFLICTS_KEY, [] satisfies SyncConflict[]);
  setStatus({ configured: false, state: 'local', pending: false, conflicts: [], message: 'This device only', revision: undefined });
}

/** Run a single shared synchronization attempt: fetch the remote revision, merge snapshots, and push changes while retaining offline work. */
export async function syncNow(): Promise<void> {
  if (syncPromise) return syncPromise;
  const config = parseConfig();
  if (!config) {
    setStatus({ configured: false, state: 'local', pending: false, message: 'This device only' });
    return;
  }
  const startEpoch = localChangeEpoch;
  syncPromise = (async () => {
    const storedConflicts = (await loadSyncMetadata<SyncConflict[]>(CONFLICTS_KEY)) || [];
    if (storedConflicts.length > 0) {
      setStatus({ configured: true, state: 'conflict', pending: true, conflicts: storedConflicts, message: `${storedConflicts.length} sync conflict${storedConflicts.length === 1 ? '' : 's'} need review` });
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus({ configured: true, state: 'offline', pending: true, message: 'Offline · changes saved on this device' });
      return;
    }
    setStatus({ configured: true, state: 'syncing', message: 'Syncing with BruFin server…' });
    try {
      let base = await loadSyncMetadata<SyncBase>(BASE_KEY);
      if (!base) {
        setStatus({ configured: true, state: 'setup', pending: false, message: 'Choose how to connect this device in Settings' });
        return;
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const local = cloneData(getLocalDatabaseData());
        const remote = await getRemote(config);
        if (!remote.data) {
          const initial = await pushSnapshot(local, remote.revision, config);
          if (initial._status === 409) continue;
          await setBase(initial.revision, initial.data || local);
          setStatus({ configured: true, state: 'connected', pending: false, conflicts: [], revision: initial.revision, message: 'Connected · up to date', lastSyncedAt: new Date().toISOString() });
          return;
        }
        const localChanged = !equal(local, base.data);
        const serverChanged = remote.revision !== base.revision;
        if (!localChanged && serverChanged) {
          await applyRemoteData(remote.data);
          await setBase(remote.revision, remote.data);
          setStatus({ configured: true, state: 'connected', pending: false, conflicts: [], revision: remote.revision, message: 'Connected · up to date', lastSyncedAt: new Date().toISOString() });
          return;
        }
        if (localChanged && serverChanged) {
          const { merged, conflicts } = mergeSnapshots(base.data, local, remote.data);
          if (conflicts.length) {
            await applyRemoteData(merged);
            await setBase(remote.revision, remote.data);
            await saveSyncMetadata(CONFLICTS_KEY, conflicts);
            setStatus({ configured: true, state: 'conflict', pending: true, conflicts, revision: remote.revision, message: `${conflicts.length} sync conflict${conflicts.length === 1 ? '' : 's'} need review` });
            return;
          }
          if (equal(merged, remote.data)) {
            await applyRemoteData(remote.data);
            await setBase(remote.revision, remote.data);
            setStatus({ configured: true, state: 'connected', pending: false, conflicts: [], revision: remote.revision, message: 'Connected · up to date', lastSyncedAt: new Date().toISOString() });
            return;
          }
          await applyRemoteData(merged);
          const pushed = await pushSnapshot(merged, remote.revision, config);
          if (pushed._status === 409) continue;
          await setBase(pushed.revision, pushed.data || merged);
          setStatus({ configured: true, state: 'connected', pending: false, conflicts: [], revision: pushed.revision, message: 'Connected · up to date', lastSyncedAt: new Date().toISOString() });
          return;
        }
        if (localChanged) {
          const pushed = await pushSnapshot(local, remote.revision, config);
          if (pushed._status === 409) continue;
          await setBase(pushed.revision, pushed.data || local);
          setStatus({ configured: true, state: 'connected', pending: false, conflicts: [], revision: pushed.revision, message: 'Connected · up to date', lastSyncedAt: new Date().toISOString() });
          return;
        }
        if (serverChanged) await applyRemoteData(remote.data);
        await setBase(remote.revision, remote.data);
        setStatus({ configured: true, state: 'connected', pending: false, conflicts: [], revision: remote.revision, message: 'Connected · up to date', lastSyncedAt: new Date().toISOString() });
        return;
      }
      throw new Error('The server kept changing. Wait a moment, then sync again.');
    } catch (error) {
      setStatus({ configured: true, state: 'offline', pending: true, message: error instanceof Error ? `Sync pending · ${error.message}` : 'Sync pending · server unavailable' });
    }
  })().finally(() => {
    syncPromise = null;
    if (localChangeEpoch !== startEpoch && parseConfig() && status.state !== 'conflict') {
      window.setTimeout(() => { void syncNow(); }, 100);
    }
  });
  return syncPromise;
}

/** Apply the chosen local or server value, persist the remaining conflicts, and resume synchronization. */
export async function resolveServerSyncConflict(conflictId: string, choice: 'local' | 'server') {
  const conflicts = (await loadSyncMetadata<SyncConflict[]>(CONFLICTS_KEY)) || [];
  const conflict = conflicts.find((item) => item.id === conflictId);
  if (!conflict) return;
  if (choice === 'local') {
    const data = cloneData(getLocalDatabaseData());
    if (conflict.section === 'monthlyTarget') {
      data.monthlyTarget = Number(conflict.localValue);
    } else {
      const current = data[conflict.section] as unknown[];
      const withoutItem = current.filter((item) => itemKey(conflict.section, item) !== conflict.itemKey);
      const nextValue = conflict.localValue;
      (data as unknown as Record<string, unknown>)[conflict.section] = nextValue === null ? withoutItem : [...withoutItem, nextValue];
    }
    await replaceLocalDatabaseData(data);
  }
  const remaining = conflicts.filter((item) => item.id !== conflictId);
  await saveSyncMetadata(CONFLICTS_KEY, remaining);
  setStatus({ conflicts: remaining, state: remaining.length ? 'conflict' : 'syncing', pending: true, message: remaining.length ? `${remaining.length} sync conflicts need review` : 'Applying your choice…' });
  if (remaining.length === 0) await syncNow();
}

/** Subscribe to local data and connectivity changes, debouncing writes and retrying synchronization after reconnection. */
export function startServerSyncMonitor() {
  if (monitorStarted || typeof window === 'undefined') return;
  monitorStarted = true;
  /** On change. Uses parseConfig, setStatus, window.clearTimeout to perform the operation. */
  const onChange = () => {
    if (!parseConfig()) return;
    localChangeEpoch += 1;
    setStatus({ pending: true, message: 'Changes saved · waiting to sync' });
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => { void syncNow(); }, 700);
  };
  /** On reconnect. Uses syncNow, window.addEventListener, void to perform the operation. */
  const onReconnect = () => { void syncNow(); };
  window.addEventListener('brufin:data-changed', onChange);
  window.addEventListener('online', onReconnect);
  window.addEventListener('focus', onReconnect);
  void (async () => {
    const conflicts = (await loadSyncMetadata<SyncConflict[]>(CONFLICTS_KEY)) || [];
    if (conflicts.length) setStatus({ configured: true, state: 'conflict', pending: true, conflicts, message: `${conflicts.length} sync conflicts need review` });
    else if (parseConfig()) void syncNow();
    window.setInterval(() => { if (document.visibilityState === 'visible' && parseConfig()) void syncNow(); }, 30_000);
  })();
}
