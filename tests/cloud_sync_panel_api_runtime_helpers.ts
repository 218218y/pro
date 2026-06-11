import { createCloudSyncPanelApi } from '../esm/native/services/cloud_sync_panel_api.ts';

type AnyRecord = Record<string, unknown>;

type OverrideBag = Record<string, unknown>;

export type CloudSyncPanelApiTestRig = {
  api: ReturnType<typeof createCloudSyncPanelApi>;
  pushed: AnyRecord[];
  patched: AnyRecord[];
  storage: Map<string, string>;
  status: AnyRecord;
  state: {
    currentRoom: string;
    privateRoom: string;
    floatingEnabled: boolean;
    tabsGateSnapshot: { open: boolean; until: number; minutesLeft: number };
  };
  refs: {
    tabsGateOpenRef: { value: boolean };
    tabsGateUntilRef: { value: number };
  };
  sinks: {
    emitFloating(enabled: boolean): void;
    emitTabsGate(snapshot: AnyRecord): void;
  };
};

export function createCloudSyncPanelApiTestRig(overrides: OverrideBag = {}): CloudSyncPanelApiTestRig {
  const pushed: AnyRecord[] = [];
  const patched: AnyRecord[] = [];
  const storage = new Map<string, string>();
  const status = { diagEnabled: false, room: 'public', online: true } as AnyRecord;

  const state = {
    currentRoom: 'public',
    privateRoom: '',
    floatingEnabled: true,
    tabsGateSnapshot: { open: false, until: 0, minutesLeft: 0 },
  };

  const tabsGateOpenRef = { value: false };
  const tabsGateUntilRef = { value: 0 };
  let floatingSubscriber: ((enabled: boolean) => void) | null = null;
  let tabsGateSnapshotSubscriber: ((snapshot: AnyRecord) => void) | null = null;

  const defaults: OverrideBag = {
    App: {} as any,
    cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://example.test/' },
    clientId: 'client-1',
    diagEnabledRef: { value: false },
    tabsGateOpenRef,
    tabsGateUntilRef,
    isTabsGateController: true,
    site2TabsTtlMs: 60000,
    now: () => 1000,
    getSite2TabsGateSnapshot: () => ({ ...state.tabsGateSnapshot }) as any,
    subscribeSite2TabsGateSnapshot: (fn: (snapshot: AnyRecord) => void) => {
      tabsGateSnapshotSubscriber = fn as any;
      return () => {
        if (tabsGateSnapshotSubscriber === fn) tabsGateSnapshotSubscriber = null;
      };
    },
    getCurrentRoom: () => state.currentRoom,
    getPrivateRoom: () => state.privateRoom,
    setPrivateRoom: (value: string) => {
      state.privateRoom = value;
    },
    randomRoomId: () => 'generated-room',
    setRoomInUrl: () => {},
    cloneRuntimeStatus: (next: AnyRecord) => ({ ...next }) as any,
    runtimeStatus: status as any,
    updateDiagEnabled: () => {
      status.diagEnabled = true;
    },
    publishStatus: () => {},
    diag: () => {},
    getDiagStorageMaybe: () => ({ setItem: (key: string, value: string) => storage.set(key, value) }) as any,
    getClipboardMaybe: () =>
      ({
        writeText: async (text: string) => {
          storage.set('clipboard', text);
        },
      }) as any,
    getPromptSinkMaybe: () =>
      ({
        prompt: (_message?: string, value?: string | null) => {
          storage.set('prompt', String(value || ''));
          return value || '';
        },
      }) as any,
    reportNonFatal: () => {},
    toast: () => undefined,
    syncSketchNow: async () => ({ ok: true }),
    getFloatingSketchSyncEnabled: () => state.floatingEnabled,
    setFloatingSketchSyncEnabledState: (enabled: boolean) => {
      const next = !!enabled;
      const changed = state.floatingEnabled !== next;
      state.floatingEnabled = next;
      return changed;
    },
    pushFloatingSketchSyncPinnedNow: async () => ({ ok: true }),
    subscribeFloatingSketchSyncEnabledState: (fn: (enabled: boolean) => void) => {
      floatingSubscriber = fn;
      return () => {
        if (floatingSubscriber === fn) floatingSubscriber = null;
      };
    },
    deleteTemporaryModelsInCloud: async () => ({ ok: true, removed: 1 }),
    deleteTemporaryColorsInCloud: async () => ({ ok: true, removed: 2 }),
    writeSite2TabsGateLocal: (open: boolean, until: number) => {
      tabsGateOpenRef.value = !!open;
      tabsGateUntilRef.value = Number(until) || 0;
      state.tabsGateSnapshot = {
        open: !!open,
        until: Number(until) || 0,
        minutesLeft: open && until > 1000 ? Math.ceil((Number(until) - 1000) / 60000) : 0,
      };
      tabsGateSnapshotSubscriber?.({ ...state.tabsGateSnapshot });
      patched.push({ kind: 'local', open, until });
    },
    patchSite2TabsGateUi: (open: boolean, until: number, by: string) => {
      tabsGateOpenRef.value = !!open;
      tabsGateUntilRef.value = Number(until) || 0;
      state.tabsGateSnapshot = {
        open: !!open,
        until: Number(until) || 0,
        minutesLeft: open && until > 1000 ? Math.ceil((Number(until) - 1000) / 60000) : 0,
      };
      tabsGateSnapshotSubscriber?.({ ...state.tabsGateSnapshot });
      patched.push({ kind: 'ui', open, until, by });
    },
    pushTabsGateNow: async (open: boolean, until: number) => {
      pushed.push({ open, until });
      return { ok: true };
    },
    pullTabsGateOnce: async () => {},
  };

  const api = createCloudSyncPanelApi({ ...(defaults as any), ...(overrides as any) });
  return {
    api,
    pushed,
    patched,
    storage,
    status,
    state,
    refs: { tabsGateOpenRef, tabsGateUntilRef },
    sinks: {
      emitFloating(enabled: boolean) {
        state.floatingEnabled = !!enabled;
        floatingSubscriber?.(!!enabled);
      },
      emitTabsGate(snapshot: AnyRecord) {
        state.tabsGateSnapshot = {
          open: !!snapshot.open,
          until: Number(snapshot.until) || 0,
          minutesLeft: Number(snapshot.minutesLeft) || 0,
        };
        tabsGateSnapshotSubscriber?.({ ...state.tabsGateSnapshot });
      },
    },
  };
}
