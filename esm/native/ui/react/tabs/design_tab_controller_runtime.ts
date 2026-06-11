import type { AppContainer } from '../../../../../types';

import {
  runHistoryBatch,
  setCfgMap,
  setCfgScalar,
  setUiCorniceType,
  setUiDoorStyle,
} from '../actions/store_actions.js';
import {
  materializeActiveGrooveLinesCountMap,
  patchViaActions,
  readStoreStateMaybe,
  requestBuilderStructuralRefresh,
} from '../../../services/api.js';

import type {
  DesignTabCorniceType,
  DesignTabDoorStyle,
  DesignTabFeatureToggleKey,
} from './design_tab_shared.js';

export type DesignTabControllerRuntime = {
  setDoorStyle: (style: DesignTabDoorStyle) => void;
  setCorniceType: (value: DesignTabCorniceType) => void;
  setFeatureToggle: (key: DesignTabFeatureToggleKey, on: boolean) => void;
  setHasCornice: (checked: boolean) => void;
  setGrooveLinesCount: (count: number) => void;
  resetGrooveLinesCount: () => void;
};

export type CreateDesignTabControllerRuntimeArgs = {
  app: AppContainer;
  setFeatureToggle: (key: DesignTabFeatureToggleKey, on: boolean) => void;
};

export function normalizeDesignTabGrooveLinesCount(count: number): number {
  return Math.max(1, Math.floor(Number(count) || 0));
}

function freezeExistingGrooveLinesCount(app: AppContainer): void {
  setCfgMap(app, 'grooveLinesCountMap', materializeActiveGrooveLinesCountMap(app), {
    source: 'react:design:grooveLinesCount:freezeExisting',
    immediate: true,
  });
}

function applyImmediateStructuralUiMutation(
  app: AppContainer,
  source: string,
  uiPatch: Record<string, unknown>,
  fallback: () => void
): void {
  const meta = { source, immediate: true, noBuild: true };
  const applied = typeof patchViaActions === 'function' ? patchViaActions(app, { ui: uiPatch }, meta) : false;
  if (!applied) fallback();
  if (typeof requestBuilderStructuralRefresh === 'function') {
    requestBuilderStructuralRefresh(app, { source, immediate: false, force: false, triggerRender: false });
  }
}

function readCurrentUiString(app: AppContainer, key: string): string {
  try {
    const state = readStoreStateMaybe(app);
    const ui = state && typeof state === 'object' ? (state as { ui?: Record<string, unknown> }).ui : null;
    const value = ui && typeof ui === 'object' ? ui[key] : '';
    return value == null ? '' : String(value);
  } catch {
    return '';
  }
}

export function createDesignTabControllerRuntime(
  args: CreateDesignTabControllerRuntimeArgs
): DesignTabControllerRuntime {
  const { app, setFeatureToggle } = args;

  return {
    setDoorStyle(style: DesignTabDoorStyle) {
      const next = String(style || '');
      if (!next || readCurrentUiString(app, 'doorStyle') === next) return;
      applyImmediateStructuralUiMutation(app, 'react:design:doorStyle', { doorStyle: next }, () => {
        setUiDoorStyle(app, next, { source: 'react:design:doorStyle', immediate: true, noBuild: true });
      });
    },

    setCorniceType(value: DesignTabCorniceType) {
      const next = String(value || '');
      if (readCurrentUiString(app, 'corniceType') === next) return;
      applyImmediateStructuralUiMutation(app, 'react:design:corniceType', { corniceType: next }, () => {
        setUiCorniceType(app, next, { source: 'react:design:corniceType', immediate: true, noBuild: true });
      });
    },

    setFeatureToggle,

    setHasCornice(checked: boolean) {
      setFeatureToggle('hasCornice', checked);
    },

    setGrooveLinesCount(count: number) {
      const nextValue = normalizeDesignTabGrooveLinesCount(count);
      runHistoryBatch(
        app,
        () => {
          freezeExistingGrooveLinesCount(app);
          setCfgScalar(app, 'grooveLinesCount', nextValue, {
            source: 'react:design:grooveLinesCount',
            immediate: true,
          });
        },
        { source: 'react:design:grooveLinesCount', immediate: true }
      );
    },

    resetGrooveLinesCount() {
      runHistoryBatch(
        app,
        () => {
          freezeExistingGrooveLinesCount(app);
          setCfgScalar(app, 'grooveLinesCount', null, {
            source: 'react:design:grooveLinesCount:reset',
            immediate: true,
          });
        },
        { source: 'react:design:grooveLinesCount:reset', immediate: true }
      );
    },
  };
}
