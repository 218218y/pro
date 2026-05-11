import { useCallback, useId, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ChangeEvent, MutableRefObject } from 'react';

import { useApp, useMeta, useUiFeedback, useRuntimeSelector, useUiSelectorShallow } from './hooks.js';
import type { CloudSyncServiceLike, CloudSyncSite2TabsGateSnapshot } from '../../../../types';
import { isSite2Variant, readRuntimeScalarOrDefault, getWindowMaybe } from '../../services/api.js';
import { selectSite2GateState } from './selectors/ui_selectors.js';
import { toggleSketchMode } from './actions/sketch_actions.js';
import { loadFromFileEvent, resetToDefaultProject, saveProject } from './actions/project_actions.js';
import { createProjectUiActionController } from './project_ui_action_controller_runtime.js';
import { setUiOrderPdfEditorOpen } from './actions/store_actions.js';
import { warmOrderPdfOverlayChunk } from './background_warmup.js';
import { getSite2EnabledTabs, readCloudSyncService, readWindowLogoDataUri } from './sidebar_shared.js';
import { createCloudSyncUiActionController } from './cloud_sync_ui_action_controller_runtime.js';
import { runPerfAction } from '../../services/api.js';

export type SidebarHeaderActionsState = {
  app: ReturnType<typeof useApp>;
  meta: ReturnType<typeof useMeta>;
  isSite2: boolean;
  site2GateOpen: boolean;
  site2GateUntil: number;
  site2GateMinutesLeft: number;
  hasAnyTabsConfigured: boolean;
  sketch: boolean;
  logoSrc: string;
  headerLoadInputId: string;
  headerLoadRef: MutableRefObject<HTMLInputElement | null>;
  handleSite2GateToggle: () => void;
  handleResetDefault: () => void;
  handleOpenPdf: () => void;
  handleWarmPdf: () => void;
  handleOpenLoad: () => void;
  handleLoadInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleToggleSketch: () => void;
  handleSaveProject: () => void;
};

const DEFAULT_SITE2_GATE_SNAPSHOT: CloudSyncSite2TabsGateSnapshot = {
  open: false,
  until: 0,
  minutesLeft: 0,
};

function readSite2TabsGateSnapshot(
  api: CloudSyncServiceLike | undefined,
  localState: { open: boolean; untilMs: number }
): CloudSyncSite2TabsGateSnapshot {
  try {
    if (api?.getSite2TabsGateSnapshot) {
      const snapshot = api.getSite2TabsGateSnapshot();
      if (snapshot && typeof snapshot === 'object') {
        return {
          open: !!snapshot.open,
          until: Number(snapshot.until) || 0,
          minutesLeft: Number(snapshot.minutesLeft) || 0,
        };
      }
    }
  } catch {
    // Use the local store snapshot when the service snapshot is unavailable.
  }
  return {
    open: !!localState.open,
    until: Number(localState.untilMs) || 0,
    minutesLeft:
      localState.open && localState.untilMs > Date.now()
        ? Math.ceil((localState.untilMs - Date.now()) / 60000)
        : 0,
  };
}

function useSite2TabsGateSnapshot(
  api: CloudSyncServiceLike | undefined,
  localState: { open: boolean; untilMs: number }
): CloudSyncSite2TabsGateSnapshot {
  const cachedSnapshotRef = useRef<CloudSyncSite2TabsGateSnapshot | null>(null);

  const getSnapshot = useCallback((): CloudSyncSite2TabsGateSnapshot => {
    const next = readSite2TabsGateSnapshot(api, localState);
    const prev = cachedSnapshotRef.current;
    if (
      prev &&
      prev.open === next.open &&
      prev.until === next.until &&
      prev.minutesLeft === next.minutesLeft
    ) {
      return prev;
    }
    cachedSnapshotRef.current = next;
    return next;
  }, [api, localState]);

  const subscribe = useCallback(
    (cb: () => void) => {
      try {
        if (api?.subscribeSite2TabsGateSnapshot) {
          const unsub = api.subscribeSite2TabsGateSnapshot(() => cb());
          return typeof unsub === 'function' ? unsub : () => undefined;
        }
      } catch {
        return () => undefined;
      }
      return () => undefined;
    },
    [api]
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return snapshot || DEFAULT_SITE2_GATE_SNAPSHOT;
}

export function useSidebarHeaderActions(): SidebarHeaderActionsState {
  const app = useApp();
  const meta = useMeta();
  const fb = useUiFeedback();
  const isSite2 = useMemo(() => isSite2Variant(app), [app]);
  const cloudSync = useMemo(() => readCloudSyncService(app) || undefined, [app]);

  const localSite2GateState = useUiSelectorShallow(selectSite2GateState);
  const {
    open: site2GateOpen,
    until: site2GateUntil,
    minutesLeft: site2GateMinutesLeft,
  } = useSite2TabsGateSnapshot(cloudSync, localSite2GateState);

  const enabledTabs = useMemo(() => getSite2EnabledTabs(app), [app]);
  const hasAnyTabsConfigured = enabledTabs.length > 0;
  const sketch = useRuntimeSelector(rt => !!readRuntimeScalarOrDefault(rt, 'sketchMode', false));

  const logoSrc = useMemo(() => {
    try {
      const w = getWindowMaybe(app);
      const uri = readWindowLogoDataUri(w);
      return uri || 'logo.png';
    } catch {
      return 'logo.png';
    }
  }, [app]);

  const headerReactId = useId();
  const headerLoadInputId = useMemo(
    () => `wp-r-header-project-load-${String(headerReactId).replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    [headerReactId]
  );
  const headerLoadRef = useRef<HTMLInputElement | null>(null);
  const projectUiController = useMemo(
    () =>
      createProjectUiActionController({
        app,
        fb,
        loadFromFileEvent,
        resetToDefaultProject,
        saveProject,
      }),
    [app, fb]
  );
  const cloudSyncUiController = useMemo(() => createCloudSyncUiActionController({ app, fb }), [app, fb]);

  const handleSite2GateToggle = useCallback(() => {
    void runPerfAction(
      app,
      'cloudSync.site2TabsGate.toggle',
      () =>
        cloudSyncUiController.toggleSite2TabsGate(
          !site2GateOpen,
          meta.uiOnlyImmediate('react:site2:tabsGate')
        ),
      { detail: { nextOpen: !site2GateOpen } }
    );
  }, [app, cloudSyncUiController, meta, site2GateOpen]);

  const handleResetDefault = useCallback(() => {
    void projectUiController.resetToDefault();
  }, [projectUiController]);

  const handleOpenPdf = useCallback(() => {
    runPerfAction(
      app,
      'orderPdf.open',
      () => setUiOrderPdfEditorOpen(app, true, meta.uiOnly(undefined, 'react:header:pdf')),
      {
        detail: { source: 'header' },
      }
    );
  }, [app, meta]);

  const handleWarmPdf = useCallback(() => {
    void warmOrderPdfOverlayChunk().catch(() => undefined);
  }, []);

  const handleOpenLoad = useCallback(() => {
    projectUiController.openLoadInput(headerLoadRef);
  }, [projectUiController]);

  const handleLoadInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      await projectUiController.handleLoadInputChange(e);
    },
    [projectUiController]
  );

  const handleToggleSketch = useCallback(() => {
    runPerfAction(app, 'ui.header.sketch.toggle', () =>
      toggleSketchMode(app, { source: 'react:header:sketch' })
    );
  }, [app]);

  const handleSaveProject = useCallback(() => {
    projectUiController.saveProject();
  }, [projectUiController]);

  return {
    app,
    meta,
    isSite2,
    site2GateOpen,
    site2GateUntil,
    site2GateMinutesLeft,
    hasAnyTabsConfigured,
    sketch,
    logoSrc,
    headerLoadInputId,
    headerLoadRef,
    handleSite2GateToggle,
    handleResetDefault,
    handleOpenPdf,
    handleWarmPdf,
    handleOpenLoad,
    handleLoadInputChange,
    handleToggleSketch,
    handleSaveProject,
  };
}
