import { lazy, type ReactElement } from 'react';

import type { TabId } from '../../../../../types';
import type { SketchNoMainWardrobeAction } from '../actions/sketch_no_main_wardrobe_action.js';

import { LazyErrorBoundary } from '../components/index.js';

const DesignTabViewLazy = lazy(async () => {
  const mod = await import('./DesignTab.view.js');
  return { default: mod.DesignTabView };
});

const InteriorTabViewLazy = lazy(async () => {
  const mod = await import('./InteriorTab.view.js');
  return { default: mod.InteriorTabView };
});

const SketchTabViewLazy = lazy(async () => {
  const mod = await import('./SketchTab.view.js');
  return { default: mod.SketchTabView };
});

const SettingsTabLazy = lazy(async () => {
  const mod = await import('./SettingsTab.js');
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
};

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
  } = props;

  return (
    <>
      {canRenderDesign ? <DesignTabViewLazy active={activeTab === 'design'} /> : null}
      {canRenderInterior ? <InteriorTabViewLazy active={activeTab === 'interior'} /> : null}
      {canRenderSketch && sketchMounted ? (
        <LazyErrorBoundary label="טאב סקיצה" app={app}>
          <SketchTabViewLazy active={activeTab === 'sketch'} toggleNoMainWardrobe={toggleNoMainWardrobe} />
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
