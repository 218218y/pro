import { lazy, type ReactElement } from 'react';

import type { TabId } from '../../../../../types';
import type { SketchNoMainWardrobeAction } from '../actions/sketch_no_main_wardrobe_action.js';

import { LazyErrorBoundary } from '../components/index.js';

let designTabViewModulePromise: Promise<typeof import('./DesignTab.view.js')> | null = null;
let interiorTabViewModulePromise: Promise<typeof import('./InteriorTab.view.js')> | null = null;
let sketchTabViewModulePromise: Promise<typeof import('./SketchTab.view.js')> | null = null;
let settingsTabModulePromise: Promise<typeof import('./SettingsTab.js')> | null = null;

function loadDesignTabViewModule(): Promise<typeof import('./DesignTab.view.js')> {
  designTabViewModulePromise ||= import('./DesignTab.view.js');
  return designTabViewModulePromise;
}

function loadInteriorTabViewModule(): Promise<typeof import('./InteriorTab.view.js')> {
  interiorTabViewModulePromise ||= import('./InteriorTab.view.js');
  return interiorTabViewModulePromise;
}

function loadSketchTabViewModule(): Promise<typeof import('./SketchTab.view.js')> {
  sketchTabViewModulePromise ||= import('./SketchTab.view.js');
  return sketchTabViewModulePromise;
}

function loadSettingsTabModule(): Promise<typeof import('./SettingsTab.js')> {
  settingsTabModulePromise ||= import('./SettingsTab.js');
  return settingsTabModulePromise;
}

function prefetchModule(promise: Promise<unknown>): void {
  void promise.catch(() => undefined);
}

export function prefetchDeferredSidebarTabView(tabId: TabId | null | undefined): void {
  if (tabId === 'design') {
    prefetchModule(loadDesignTabViewModule());
    return;
  }
  if (tabId === 'interior') {
    prefetchModule(loadInteriorTabViewModule());
    return;
  }
  if (tabId === 'sketch') {
    prefetchModule(loadSketchTabViewModule());
    return;
  }
  if (tabId === 'settings') prefetchModule(loadSettingsTabModule());
}

const DesignTabViewLazy = lazy(async () => {
  const mod = await loadDesignTabViewModule();
  return { default: mod.DesignTabView };
});

const InteriorTabViewLazy = lazy(async () => {
  const mod = await loadInteriorTabViewModule();
  return { default: mod.InteriorTabView };
});

const SketchTabViewLazy = lazy(async () => {
  const mod = await loadSketchTabViewModule();
  return { default: mod.SketchTabView };
});

const SettingsTabLazy = lazy(async () => {
  const mod = await loadSettingsTabModule();
  return { default: mod.SettingsTab };
});

type DeferredSidebarTabsProps = {
  app: unknown;
  activeTab: TabId;
  canRenderDesign: boolean;
  canRenderInterior: boolean;
  canRenderSettings: boolean;
  canRenderSketch: boolean;
  settingsMounted: boolean;
  sketchMounted: boolean;
  toggleNoMainWardrobe: SketchNoMainWardrobeAction;
  loadInteriorPickingExtension: () => Promise<unknown>;
};

type PickingExtensionLoadState = {
  status: 'pending' | 'ready' | 'error';
  promise: Promise<void>;
  error?: unknown;
};

const pickingExtensionLoadStates = new WeakMap<() => Promise<unknown>, PickingExtensionLoadState>();

function suspendUntilPickingExtensionReady(load: () => Promise<unknown>): void {
  let state = pickingExtensionLoadStates.get(load);
  if (!state) {
    state = { status: 'pending', promise: Promise.resolve() };
    state.promise = load().then(
      () => {
        if (state) state.status = 'ready';
      },
      error => {
        if (state) {
          state.status = 'error';
          state.error = error;
        }
      }
    );
    pickingExtensionLoadStates.set(load, state);
  }
  if (state.status === 'ready') return;
  if (state.status === 'error') throw state.error;
  throw state.promise;
}

function InteriorTabWithPickingExtension(props: {
  active: boolean;
  loadInteriorPickingExtension: () => Promise<unknown>;
}): ReactElement {
  void loadInteriorTabViewModule();
  suspendUntilPickingExtensionReady(props.loadInteriorPickingExtension);
  return <InteriorTabViewLazy active={props.active} />;
}

function SketchTabWithPickingExtension(props: {
  active: boolean;
  toggleNoMainWardrobe: SketchNoMainWardrobeAction;
  loadInteriorPickingExtension: () => Promise<unknown>;
}): ReactElement {
  void loadSketchTabViewModule();
  suspendUntilPickingExtensionReady(props.loadInteriorPickingExtension);
  return <SketchTabViewLazy active={props.active} toggleNoMainWardrobe={props.toggleNoMainWardrobe} />;
}

export function DeferredSidebarTabs(props: DeferredSidebarTabsProps): ReactElement {
  const {
    app,
    activeTab,
    canRenderDesign,
    canRenderInterior,
    canRenderSettings,
    canRenderSketch,
    settingsMounted,
    sketchMounted,
    toggleNoMainWardrobe,
    loadInteriorPickingExtension,
  } = props;

  return (
    <>
      {canRenderDesign ? <DesignTabViewLazy active={activeTab === 'design'} /> : null}
      {canRenderInterior ? (
        <InteriorTabWithPickingExtension
          active={activeTab === 'interior'}
          loadInteriorPickingExtension={loadInteriorPickingExtension}
        />
      ) : null}
      {canRenderSketch && sketchMounted ? (
        <LazyErrorBoundary label="טאב סקיצה" app={app}>
          <SketchTabWithPickingExtension
            active={activeTab === 'sketch'}
            toggleNoMainWardrobe={toggleNoMainWardrobe}
            loadInteriorPickingExtension={loadInteriorPickingExtension}
          />
        </LazyErrorBoundary>
      ) : null}
      {canRenderSettings && settingsMounted ? (
        <LazyErrorBoundary label="טאב הגדרות" app={app}>
          <SettingsTabLazy active={activeTab === 'settings'} />
        </LazyErrorBoundary>
      ) : null}
    </>
  );
}
