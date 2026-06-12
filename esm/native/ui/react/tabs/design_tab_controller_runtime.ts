import type { AppContainer } from '../../../../../types';

import {
  runHistoryBatch,
  setCfgMap,
  setCfgScalar,
  setUiCorniceType,
  setUiDoorStyle,
} from '../actions/store_actions.js';
import { applyImmediateStructuralUiMutation } from '../actions/structural_build_refresh_actions.js';
import {
  ROUNDED_FRAME_SIDE_SHELVES_MAP_NAME,
  readRemovedFrameSidePartIds,
} from '../../../features/removable_parts.js';
import { materializeActiveGrooveLinesCountMap, readStoreStateMaybe } from '../../../services/api.js';

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
  toggleRoundedFrameSideShelves: () => void;
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

function readCurrentConfigRecord(app: AppContainer): Record<string, unknown> {
  try {
    const state = readStoreStateMaybe(app);
    const config =
      state && typeof state === 'object' ? (state as { config?: Record<string, unknown> }).config : null;
    return config && typeof config === 'object' ? config : {};
  } catch {
    return {};
  }
}

function readCurrentRoundedFrameSideShelvesMap(app: AppContainer): Record<string, unknown> {
  const cfg = readCurrentConfigRecord(app);
  const map = cfg[ROUNDED_FRAME_SIDE_SHELVES_MAP_NAME];
  return map && typeof map === 'object' && !Array.isArray(map) ? { ...(map as Record<string, unknown>) } : {};
}

function readRemovedFrameSidePartIdList(app: AppContainer): string[] {
  return readRemovedFrameSidePartIds(readCurrentConfigRecord(app));
}

export function createDesignTabControllerRuntime(
  args: CreateDesignTabControllerRuntimeArgs
): DesignTabControllerRuntime {
  const { app, setFeatureToggle } = args;

  return {
    setDoorStyle(style: DesignTabDoorStyle) {
      const next = String(style || '');
      if (!next || readCurrentUiString(app, 'doorStyle') === next) return;
      applyImmediateStructuralUiMutation(app, 'react:design:doorStyle', { doorStyle: next }, meta => {
        setUiDoorStyle(app, next, meta);
      });
    },

    setCorniceType(value: DesignTabCorniceType) {
      const next = String(value || '');
      if (readCurrentUiString(app, 'corniceType') === next) return;
      applyImmediateStructuralUiMutation(app, 'react:design:corniceType', { corniceType: next }, meta => {
        setUiCorniceType(app, next, meta);
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

    toggleRoundedFrameSideShelves() {
      const partIds = readRemovedFrameSidePartIdList(app);
      if (!partIds.length) return;

      const current = readCurrentRoundedFrameSideShelvesMap(app);
      const allRounded = partIds.every(partId => current[partId] === true);
      const nextMap = { ...current };
      for (const partId of partIds) nextMap[partId] = allRounded ? null : true;

      runHistoryBatch(
        app,
        () => {
          setCfgMap(app, ROUNDED_FRAME_SIDE_SHELVES_MAP_NAME, nextMap, {
            source: 'react:design:roundedFrameSideShelves',
            immediate: true,
          });
        },
        { source: 'react:design:roundedFrameSideShelves', immediate: true }
      );
    },
  };
}
