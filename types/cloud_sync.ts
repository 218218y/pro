// Cloud Sync service typing (high-value boundary)
//
// Goal:
// - Give the cloud-sync service a shared typed surface used by the service,
//   React consumers, and runtime-installed app/service slots.
// - Replace duplicated ad-hoc UI CloudSyncApi shapes and generic runtime bags.
// - Keep payload fields permissive where storage/cloud rows are intentionally
//   backward-compatible and may still carry legacy values.

import type { UnknownRecord } from './common';
import type { TimeoutHandleLike } from './state';
import type { SavedColorLike } from './build';
import type { SavedModelLike } from './models';
import type { AppContainer } from './app';

export type CloudSyncOrderEntry = string | number | null;
export type CloudSyncOrderList = CloudSyncOrderEntry[];
export type CloudSyncScalarLike = string | number | boolean | null;
export type CloudSyncJsonLike = UnknownRecord | unknown[] | CloudSyncScalarLike;

export interface CloudSyncPayload extends UnknownRecord {
  savedModels?: SavedModelLike[] | null;
  savedColors?: SavedColorLike[] | null;
  colorSwatchesOrder?: CloudSyncOrderList | null;
  presetOrder?: CloudSyncOrderList | null;
  hiddenPresets?: CloudSyncOrderList | null;
}

export interface CloudSyncStateRow {
  room: string;
  payload: CloudSyncPayload;
  updated_at: string;
}

export interface CloudSyncUpsertResult {
  ok: boolean;
  row?: CloudSyncStateRow | null;
}

export type CloudSyncDeleteTempReason = 'busy' | 'room' | 'write' | 'error' | 'cancelled' | 'not-installed';

export type CloudSyncDeleteTempResult =
  | { ok: true; removed: number }
  | { ok: false; removed: 0; reason: 'busy' | 'room' | 'cancelled' | 'not-installed' }
  | { ok: false; removed: 0; reason: 'write' | 'error'; message?: string };

export type CloudSyncSketchCommandReason = 'noop' | 'room' | 'capture' | 'write' | 'error' | 'not-installed';

export type CloudSyncSketchCommandResult =
  | { ok: true; changed?: boolean; hash?: string; reason?: 'noop' }
  | { ok: false; reason: 'room' | 'capture' | 'write' | 'not-installed' }
  | { ok: false; reason: 'error'; message?: string };

export type CloudSyncTabsGateCommandReason =
  | 'controller-only'
  | 'busy'
  | 'room'
  | 'write'
  | 'sync-failed'
  | 'error'
  | 'not-installed';

export type CloudSyncTabsGateCommandResult =
  | { ok: true; changed?: boolean; open?: boolean; until?: number }
  | {
      ok: false;
      changed?: boolean;
      open?: boolean;
      until?: number;
      reason: 'controller-only' | 'busy' | 'room' | 'not-installed';
    }
  | {
      ok: false;
      changed?: boolean;
      open?: boolean;
      until?: number;
      reason: 'write' | 'sync-failed' | 'error';
      message?: string;
      rolledBack?: boolean;
    };

export type CloudSyncSyncPinCommandReason =
  | 'busy'
  | 'room'
  | 'write'
  | 'sync-failed'
  | 'error'
  | 'not-installed';

export type CloudSyncSyncPinCommandResult =
  | { ok: true; changed?: boolean; enabled?: boolean }
  | {
      ok: false;
      changed?: boolean;
      enabled?: boolean;
      reason: 'busy' | 'room' | 'not-installed';
      rolledBack?: boolean;
    }
  | {
      ok: false;
      changed?: boolean;
      enabled?: boolean;
      reason: 'write' | 'sync-failed' | 'error';
      message?: string;
      rolledBack?: boolean;
    };

export type CloudSyncShareLinkCommandReason =
  | 'missing-link'
  | 'clipboard'
  | 'unavailable'
  | 'error'
  | 'prompt'
  | 'not-installed';

export type CloudSyncShareLinkCommandResult =
  | { ok: true; copied?: true; prompted?: true; link?: string }
  | { ok: false; reason: 'missing-link' | 'clipboard' | 'unavailable' | 'not-installed'; link?: string }
  | { ok: false; reason: 'prompt' | 'error'; link?: string; message?: string };

export type CloudSyncRoomModeCommandReason = 'error' | 'not-installed';

export type CloudSyncRoomModeCommandResult =
  | { ok: true; changed: boolean; mode: 'public' | 'private'; room: string; shareLink: string }
  | { ok: false; mode: 'public' | 'private'; reason: 'not-installed' }
  | { ok: false; mode: 'public' | 'private'; reason: 'error'; message?: string }
  | {
      ok: false;
      changed: boolean;
      mode: 'public' | 'private';
      room: string;
      shareLink: string;
      reason: 'error';
      message?: string;
    };

export interface CloudSyncStorageValueStoreLike {
  getItem?: (key: string) => string | null | undefined;
  setItem?: (key: string, value: string) => unknown;
}

export interface CloudSyncSessionStorageLike extends CloudSyncStorageValueStoreLike {}

export interface CloudSyncClipboardLike {
  writeText?: (text: string) => Promise<unknown> | unknown;
}

export interface CloudSyncPromptSinkLike {
  prompt?: (message?: string, defaultValue?: string) => string | null | undefined;
}

export interface CloudSyncRef<T> {
  value: T;
}

export interface CloudSyncPanelConfig extends UnknownRecord {
  publicRoom: string;
  roomParam: string;
  privateRoom?: string;
  shareBaseUrl?: string;
}

export interface CloudSyncNonFatalReportOptions extends UnknownRecord {
  throttleMs?: number;
  noConsole?: boolean;
}

export interface CloudSyncLocalCollections {
  m: SavedModelLike[];
  c: SavedColorLike[];
  o: CloudSyncOrderList;
  p: CloudSyncOrderList;
  h: CloudSyncOrderList;
}

export interface CloudSyncTabsGatePayload extends UnknownRecord {
  tabsGateOpen?: boolean | number | string | null;
  tabsGateUntil?: number | string | null;
  tabsGateRev?: number | string | null;
  tabsGateBy?: string | null;
}

export interface CloudSyncTabsGateState {
  open: boolean;
  until: number;
  rev: number;
  by: string;
}

export interface CloudSyncSyncPinPayload extends UnknownRecord {
  syncPinEnabled?: boolean | number | string | null;
  syncPinRev?: number | string | null;
  syncPinBy?: string | null;
}

export interface CloudSyncSyncPinState {
  enabled: boolean;
  rev: number;
  by: string;
}

export interface CloudSyncSketchPayload extends UnknownRecord {
  sketchRev?: number | string | null;
  sketchHash?: string | null;
  sketchBy?: string | null;
  sketch?: CloudSyncJsonLike;
}

export interface CloudSyncSketchState {
  rev: number;
  hash: string;
  by: string;
  sketch: unknown;
}

export type CloudSyncRealtimeHintScope = 'all' | 'main' | 'sketch' | 'tabsGate' | 'floatingSync';

export interface CloudSyncRealtimeHintPayload extends UnknownRecord {
  scope: CloudSyncRealtimeHintScope;
  room?: string;
  row?: string;
  by?: string;
  ts?: number;
}

export type CloudSyncRealtimeSubscribeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED' | '';

export interface CloudSyncRealtimeStatus extends UnknownRecord {
  enabled: boolean;
  mode: 'broadcast';
  state: string;
  channel: string;
}

export interface CloudSyncPollingStatus extends UnknownRecord {
  active: boolean;
  intervalMs: number;
  reason: string;
}

export interface CloudSyncRuntimeStatus extends UnknownRecord {
  room: string;
  clientId: string;
  instanceId: string;
  realtime: CloudSyncRealtimeStatus;
  polling: CloudSyncPollingStatus;
  lastPullAt: number;
  lastPushAt: number;
  lastRealtimeEventAt: number;
  lastError: string;
  diagEnabled?: boolean;
}

export interface CloudSyncFetchResponseLike {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}

export interface CloudSyncFetchLike {
  (input: string, init?: RequestInit): Promise<CloudSyncFetchResponseLike>;
}

export interface CloudSyncProjectExportResultLike extends UnknownRecord {
  jsonStr?: string;
  projectData?: unknown;
}

export interface CloudSyncProjectIoLike extends UnknownRecord {
  exportCurrentProject?: (meta?: UnknownRecord) => CloudSyncProjectExportResultLike | null | undefined;
}

export interface CloudSyncRealtimeTransportLike extends UnknownRecord {
  disconnect?: () => unknown;
}

export interface CloudSyncRealtimeChannelBroadcastConfigLike extends UnknownRecord {
  self?: boolean;
  ack?: boolean;
}

export interface CloudSyncRealtimeChannelConfigLike extends UnknownRecord {
  private?: boolean;
  broadcast?: CloudSyncRealtimeChannelBroadcastConfigLike;
}

export interface CloudSyncRealtimeChannelOptionsLike extends UnknownRecord {
  config?: CloudSyncRealtimeChannelConfigLike;
}

export interface CloudSyncRealtimeChannelLike extends UnknownRecord {
  on?: (type: string, filterOrConfig: unknown, handler: (ev: unknown) => void) => unknown;
  subscribe?: (handler: (status: unknown) => void) => unknown;
  send?: (payload: unknown) => Promise<unknown> | unknown;
}

export interface CloudSyncRealtimeClientLike extends UnknownRecord {
  channel?: (
    name: string,
    opts?: CloudSyncRealtimeChannelOptionsLike
  ) => CloudSyncRealtimeChannelLike | null | undefined;
  removeChannel?: (channel: CloudSyncRealtimeChannelLike | unknown) => unknown;
  realtime?: CloudSyncRealtimeTransportLike;
}

export interface CloudSyncRealtimeModuleLike extends UnknownRecord {
  createClient?: (url: string, key: string, opt?: UnknownRecord) => CloudSyncRealtimeClientLike;
  default?: UnknownRecord & {
    createClient?: (url: string, key: string, opt?: UnknownRecord) => CloudSyncRealtimeClientLike;
  };
}

export interface CloudSyncStorageEventLike extends UnknownRecord {
  key?: string | null;
}

export interface CloudSyncTestHooksLike extends UnknownRecord {
  createSupabaseClient?: (url: string, key: string, opt?: UnknownRecord) => CloudSyncRealtimeClientLike;
}

export interface CloudSyncServiceStateLike extends UnknownRecord {
  status?: CloudSyncRuntimeStatus;
  dispose?: () => void;
  installedAt?: number;
  panelApi?: CloudSyncServiceLike;
  __testHooks?: CloudSyncTestHooksLike;
  __publicationEpoch?: number;
  __disposePublicationEpoch?: number;
}

export type CloudSyncDiagPayload = string | number | boolean | null | undefined | UnknownRecord;
export type CloudSyncDiagFn = (event: string, payload?: CloudSyncDiagPayload) => void;

export interface CloudSyncSite2TabsGateSnapshot extends UnknownRecord {
  open: boolean;
  until: number;
  minutesLeft: number;
}

export interface CloudSyncPanelApiDeps extends UnknownRecord {
  App: AppContainer;
  cfg: CloudSyncPanelConfig;
  clientId: string;
  diagEnabledRef: CloudSyncRef<boolean>;
  tabsGateOpenRef: CloudSyncRef<boolean>;
  tabsGateUntilRef: CloudSyncRef<number>;
  getSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot;
  subscribeSite2TabsGateSnapshot: (
    fn: (snapshot: CloudSyncSite2TabsGateSnapshot) => void
  ) => (() => void) | void;
  isTabsGateController: boolean;
  site2TabsTtlMs: number;
  now: () => number;
  getCurrentRoom: () => string;
  getPrivateRoom: () => string;
  setPrivateRoom: (value: string) => void;
  randomRoomId: () => string;
  setRoomInUrl: (app: AppContainer, param: string, value: string | null) => void;
  cloneRuntimeStatus: (status: CloudSyncRuntimeStatus) => CloudSyncRuntimeStatus;
  runtimeStatus: CloudSyncRuntimeStatus;
  updateDiagEnabled: () => void;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
  getDiagStorageMaybe: () => CloudSyncStorageValueStoreLike | null;
  getClipboardMaybe: () => CloudSyncClipboardLike | null;
  getPromptSinkMaybe: () => CloudSyncPromptSinkLike | null;
  reportNonFatal: (
    app: AppContainer,
    op: string,
    err: unknown,
    opts?: CloudSyncNonFatalReportOptions
  ) => void;
  toast: (app: AppContainer, message: string, type?: string) => unknown;
  syncSketchNow: () => Promise<CloudSyncSketchCommandResult>;
  getFloatingSketchSyncEnabled: () => boolean;
  setFloatingSketchSyncEnabledState: (enabled: boolean) => boolean;
  pushFloatingSketchSyncPinnedNow: (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>;
  subscribeFloatingSketchSyncEnabledState: (fn: (enabled: boolean) => void) => () => void;
  deleteTemporaryModelsInCloud: () => Promise<CloudSyncDeleteTempResult>;
  deleteTemporaryColorsInCloud: () => Promise<CloudSyncDeleteTempResult>;
  writeSite2TabsGateLocal: (open: boolean, until: number) => void;
  patchSite2TabsGateUi: (open: boolean, until: number, by: string) => void;
  pushTabsGateNow: (open: boolean, until: number) => Promise<CloudSyncTabsGateCommandResult>;
  pullTabsGateOnce: (isInitial: boolean) => Promise<void>;
  setTimeoutFn?: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn?: (id: TimeoutHandleLike) => void;
}

export interface CloudSyncRoomStatusSnapshot extends UnknownRecord {
  room: string;
  isPublic: boolean | null;
  status: string;
}

export interface CloudSyncPanelSnapshot extends CloudSyncRoomStatusSnapshot {
  floatingSync: boolean;
}

export interface CloudSyncServiceLike extends UnknownRecord {
  getCurrentRoom?: () => string;
  getPublicRoom?: () => string;
  getRoomParam?: () => string;
  getSyncRuntimeStatus?: () => CloudSyncRuntimeStatus;
  setDiagnosticsEnabled?: (enabled: boolean) => void;
  getPanelSnapshot?: () => CloudSyncPanelSnapshot;
  subscribePanelSnapshot?: (fn: (snapshot: CloudSyncPanelSnapshot) => void) => void | (() => void);
  goPublic?: () => CloudSyncRoomModeCommandResult;
  goPrivate?: () => CloudSyncRoomModeCommandResult;
  getShareLink?: () => string;
  copyShareLink?: () => Promise<CloudSyncShareLinkCommandResult>;
  syncSketchNow?: () => Promise<CloudSyncSketchCommandResult>;
  isFloatingSketchSyncEnabled?: () => boolean;
  setFloatingSketchSyncEnabled?: (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>;
  toggleFloatingSketchSyncEnabled?: () => Promise<CloudSyncSyncPinCommandResult>;
  subscribeFloatingSketchSyncEnabled?: (fn: (enabled: boolean) => void) => void | (() => void);
  deleteTemporaryModels?: () => Promise<CloudSyncDeleteTempResult>;
  deleteTemporaryColors?: () => Promise<CloudSyncDeleteTempResult>;
  isSite2TabsGateEnabled?: () => boolean;
  getSite2TabsGateSnapshot?: () => CloudSyncSite2TabsGateSnapshot;
  subscribeSite2TabsGateSnapshot?: (
    fn: (snapshot: CloudSyncSite2TabsGateSnapshot) => void
  ) => void | (() => void);
  getSite2TabsGateOpen?: () => boolean;
  getSite2TabsGateUntil?: () => number;
  setSite2TabsGateOpen?: (open: boolean) => Promise<CloudSyncTabsGateCommandResult>;
  toggleSite2TabsGateOpen?: () => Promise<CloudSyncTabsGateCommandResult>;
}
