import type { LocalDatabaseData } from './localDatabase';
import {
  getLocalDatabaseData,
  loadSyncMetadata,
  replaceLocalDatabaseData,
  saveSyncMetadata,
} from './localDatabase';

const CONFIG_KEY = 'brufin_server_sync_config_v1';
const BASE_KEY = 'server_sync_base';
const CONFLICTS_KEY = 'server_sync_conflicts';

export interface ServerSyncConfig {
  serverUrl: string;
  token: string;
  clientId: string;
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

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

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

function setStatus(next: Partial<ServerSyncStatus>) {
  status = { ...status, ...next };
  listeners.forEach((listener) => listener(status));
}

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function cloneData(data: LocalDatabaseData): LocalDatabaseData {
  return JSON.parse(JSON.stringify(data)) as LocalDatabaseData;
}

function itemKey(section: keyof LocalDatabaseData, item: unknown): string {
  if (section === 'expenseCategories' || section === 'incomeCategories') return String(item);
  return item && typeof item === 'object' && 'id' in item ? String((item as { id: unknown }).id) : '';
}

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

async function request<T>(path: string, init: RequestInit = {}, config = parseConfig()): Promise<T> {
  if (!config) throw new Error('Connect this device to your BruFin server in Settings.');
  const response = await fetch(`${config.serverUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 409) {
    throw new Error(typeof payload.error === 'string' ? payload.error : `Server returned HTTP ${response.status}`);
  }
  return { ...payload, _status: response.status } as T;
}

async function getRemote(config?: ServerSyncConfig | null): Promise<ServerState> {
  return request<ServerState>('/api/state', {}, config);
}

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

async function setBase(revision: number, data: LocalDatabaseData) {
  await saveSyncMetadata<SyncBase>(BASE_KEY, { revision, data: cloneData(data) });
}

async function applyRemoteData(data: LocalDatabaseData) {
  await replaceLocalDatabaseData(data);
}

export function getServerSyncConfig(): ServerSyncConfig | null {
  return parseConfig();
}

export function getServerSyncStatus(): ServerSyncStatus {
  const configured = !!parseConfig();
  return { ...status, configured, conflicts: status.conflicts };
}

export function subscribeToServerSync(listener: (value: ServerSyncStatus) => void): () => void {
  listeners.add(listener);
  listener(getServerSyncStatus());
  return () => listeners.delete(listener);
}

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

export async function disconnectServerSync() {
  localStorage.removeItem(CONFIG_KEY);
  await saveSyncMetadata(CONFLICTS_KEY, [] satisfies SyncConflict[]);
  setStatus({ configured: false, state: 'local', pending: false, conflicts: [], message: 'This device only', revision: undefined });
}

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

export function startServerSyncMonitor() {
  if (monitorStarted || typeof window === 'undefined') return;
  monitorStarted = true;
  const onChange = () => {
    if (!parseConfig()) return;
    localChangeEpoch += 1;
    setStatus({ pending: true, message: 'Changes saved · waiting to sync' });
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => { void syncNow(); }, 700);
  };
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
