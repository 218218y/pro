import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, MutableRefObject } from 'react';

import type { AppContainer, TabId } from '../../../../types';
import { useApp, useMeta, useModeSelector, useUiSelectorShallow } from './hooks.js';
import {
  VIEWER_MEASUREMENT_MODE_ID,
  clearViewerMeasurementOverlay,
  getModeId,
  isSite2Variant,
} from '../../services/api.js';
import { selectActiveTabId, selectSite2GateState } from './selectors/ui_selectors.js';
import { setUiActiveTab } from './actions/store_actions.js';
import { exitPrimaryMode } from './actions/modes_actions.js';
import {
  prefetchDeferredSidebarTabs,
  TABS,
  getSite2EnabledTabs,
  readEventTargetElement,
} from './sidebar_shared.js';
import { scheduleReactBackgroundWarmup } from './background_warmup.js';
import { warmExportCanvasModule } from './export_actions.js';
import {
  clearSidebarBackgroundExit,
  createSidebarBackgroundExitState,
  scheduleSidebarBackgroundExit,
} from './sidebar_background_exit.js';

export type SidebarViewState = {
  app: AppContainer;
  activeSafe: TabId;
  canRenderTab: (id: TabId) => boolean;
  enabledSet: Set<TabId>;
  enabledTabs: TabId[];
  settingsMounted: boolean;
  sketchMounted: boolean;
  darkMode: boolean;
  gateOpen: boolean;
  isSite2: boolean;
  onSidebarBackgroundClick: (e: MouseEvent<HTMLDivElement>) => void;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  setActiveTab: (id: TabId) => void;
  shouldMountDeferredTabs: boolean;
  site2UiEnabled: boolean;
};

function prefetchSidebarTabIntent(tabId: TabId | null | undefined): void {
  prefetchDeferredSidebarTabs(tabId);
  if (tabId === 'settings') {
    void warmExportCanvasModule().catch(() => undefined);
  }
}

function isViewerMeasurementPrimaryMode(primaryMode: string): boolean {
  return primaryMode === (getModeId('MEASURE') || VIEWER_MEASUREMENT_MODE_ID);
}

function clearViewerMeasurementOnSidebarExit(app: AppContainer, primaryMode: string): void {
  if (!isViewerMeasurementPrimaryMode(primaryMode)) return;
  try {
    clearViewerMeasurementOverlay(app, true);
  } catch {
    // ignore measurement overlay cleanup failures; the primary mode transition still owns the exit.
  }
}

export function useSidebarViewState(): SidebarViewState {
  const app = useApp();
  const meta = useMeta();

  const isSite2 = useMemo(() => isSite2Variant(app), [app]);
  const {
    open: site2GateOpen,
    storeActive,
    darkMode,
  } = useUiSelectorShallow(ui => ({
    open: selectSite2GateState(ui).open,
    storeActive: selectActiveTabId(ui),
    darkMode: typeof ui.darkMode === 'boolean' ? ui.darkMode : false,
  }));
  const gateOpen = isSite2 ? site2GateOpen : true;
  const enabledTabs = useMemo(() => (isSite2 ? getSite2EnabledTabs(app) : []), [isSite2, app]);
  const enabledSet = useMemo(() => new Set(enabledTabs), [enabledTabs]);
  const primaryMode = useModeSelector(mode => String(mode.primary || 'none'));
  const active = storeActive;
  const visibleTabs = useMemo(() => TABS.slice(), []);
  const activeSafe = useMemo<TabId>(() => {
    try {
      const cur = active;
      const has = visibleTabs.some(t => t.id === cur);
      if (has) return cur;
      return visibleTabs[0]?.id || 'interior';
    } catch {
      return 'interior';
    }
  }, [active, visibleTabs]);

  useEffect(() => {
    try {
      if (!isSite2) return;
      if (!gateOpen) return;
      if (!enabledTabs.length) return;
      if (enabledSet.has(active)) return;

      const next = enabledTabs[0];
      if (next) {
        setUiActiveTab(app, next, meta.uiOnlyImmediate('react:site2:clampActiveTab'));
      }
    } catch {
      // ignore
    }
  }, [isSite2, gateOpen, enabledTabs, enabledSet, active, app, meta]);

  useEffect(() => {
    try {
      if (!activeSafe) return;
      if (activeSafe === active) return;
      if (isSite2 && !enabledSet.has(activeSafe)) return;
      setUiActiveTab(app, activeSafe, meta.uiOnlyImmediate('react:tabs:clampRemoved'));
    } catch {
      // ignore
    }
  }, [active, activeSafe, isSite2, enabledSet, app, meta]);

  const [settingsEverMounted, setSettingsEverMounted] = useState(false);
  const [sketchEverMounted, setSketchEverMounted] = useState(false);
  const [deferredTabsEverMounted, setDeferredTabsEverMounted] = useState(false);
  const settingsMounted = settingsEverMounted || activeSafe === 'settings';
  const sketchMounted = sketchEverMounted || activeSafe === 'sketch';
  const shouldMountDeferredTabs = deferredTabsEverMounted || activeSafe !== 'structure';

  useEffect(() => {
    if (activeSafe === 'settings') setSettingsEverMounted(true);
    if (activeSafe === 'sketch') setSketchEverMounted(true);
    if (activeSafe !== 'structure') setDeferredTabsEverMounted(true);
  }, [activeSafe]);

  useEffect(() => {
    return scheduleReactBackgroundWarmup(app);
  }, [app]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const backgroundExitStateRef = useRef(createSidebarBackgroundExitState());

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [activeSafe]);

  useEffect(() => {
    if (primaryMode && primaryMode !== 'none') return;
    clearSidebarBackgroundExit(app, backgroundExitStateRef.current);
  }, [app, primaryMode]);

  useEffect(() => {
    return () => {
      clearSidebarBackgroundExit(app, backgroundExitStateRef.current);
    };
  }, [app]);

  const setActiveTab = useCallback(
    (id: TabId) => {
      if (isSite2 && !enabledSet.has(id)) return;
      if (primaryMode && primaryMode !== 'none') {
        try {
          clearViewerMeasurementOnSidebarExit(app, primaryMode);
          exitPrimaryMode(app, undefined, {
            closeDoors: true,
            cursor: 'default',
            source: 'react:tabs:set:exitPrimaryMode',
          });
        } catch {
          // ignore tab-level edit-mode exit failures; switching the tab should continue.
        }
      }
      prefetchSidebarTabIntent(id);
      setUiActiveTab(app, id, meta.uiOnlyImmediate('react:tabs:set'));
    },
    [isSite2, enabledSet, primaryMode, app, meta]
  );

  const onSidebarBackgroundClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      try {
        if (!primaryMode || primaryMode === 'none') return;

        const target = readEventTargetElement(e.target);
        if (!target || typeof target.closest !== 'function') return;

        const ignoreSel =
          'button, a, input, select, textarea, label, [role="button"], [role="textbox"], [data-no-dismiss-edit="1"]';
        if (target.closest(ignoreSel)) return;
        if (target.closest('.wp-r-header') || target.closest('.wp-r-tabs')) return;

        scheduleSidebarBackgroundExit({
          App: app,
          state: backgroundExitStateRef.current,
          exitPrimaryMode: () => {
            try {
              clearViewerMeasurementOnSidebarExit(app, primaryMode);
              exitPrimaryMode(app, undefined, {
                closeDoors: true,
                cursor: 'default',
                source: 'react:sidebar:bgclick',
              });
            } catch {
              // ignore
            }
          },
        });
      } catch {
        // ignore
      }
    },
    [primaryMode, app]
  );

  const site2UiEnabled = !isSite2 || (gateOpen && enabledTabs.length > 0);
  const canRenderTab = useCallback(
    (id: TabId) => (!isSite2 ? true : enabledSet.has(id)),
    [isSite2, enabledSet]
  );

  return {
    app,
    activeSafe,
    canRenderTab,
    enabledSet,
    enabledTabs,
    settingsMounted,
    sketchMounted,
    darkMode,
    gateOpen,
    isSite2,
    onSidebarBackgroundClick,
    scrollRef,
    setActiveTab,
    shouldMountDeferredTabs,
    site2UiEnabled,
  };
}
