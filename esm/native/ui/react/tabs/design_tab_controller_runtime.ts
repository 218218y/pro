import { readCorniceDimensionCm } from '../../../../shared/dimensions/carcass_cornice_render_policy.js';
import type { CorniceDimensionsCm } from '../../../../../types/cornice_type.js';
import type { AppContainer, ConfigStateLike, GrooveOrientation, UiStateLike } from '../../../../../types';

import {
  applyProjectConfigSnapshot,
  patchUi,
  runHistoryBatch,
  setCfgScalar,
  setUiCorniceType,
  setUiDoorStyle,
  setUiScalarSoft,
} from '../actions/store_actions.js';
import {
  applyStructuralConfigMutation,
  applyStructuralUiMutation,
  createStructuralMutationMeta,
} from '../actions/structural_build_refresh_actions.js';
import { buildLibraryUpperDoorStyleMap } from '../../../features/library_preset/library_preset.js';
import { readDesignTabRoundedFrameSideSelection } from './design_tab_view_state_runtime.js';
import {
  materializeActiveGrooveLinesCountMap,
  readStoreStateMaybe,
  replaceDoorGrooveLinesCountMap,
  replaceRoundedFrameSideShelvesMap,
} from '../../../services/api.js';

import type {
  DesignTabCorniceType,
  DesignTabDoorStyle,
  DesignTabFeatureToggleKey,
} from './design_tab_shared.js';

export type DesignTabControllerRuntime = {
  setDoorStyle: (style: DesignTabDoorStyle) => void;
  setCorniceType: (value: DesignTabCorniceType) => void;
  setCorniceDimension: (key: keyof CorniceDimensionsCm, value: number | undefined) => void;
  setFeatureToggle: (key: DesignTabFeatureToggleKey, on: boolean) => void;
  setHasCornice: (checked: boolean) => void;
  setGrooveLinesCount: (count: number) => void;
  resetGrooveLinesCount: () => void;
  toggleGrooveManual: () => void;
  setDoorCutArch: (arched: boolean) => void;
  setDoorGrooveArch: (arched: boolean) => void;
  setGrooveDraftHeightCm: (value: string) => void;
  setGrooveDraftWidthCm: (value: string) => void;
  setGrooveOrientation: (orientation: GrooveOrientation) => void;
  toggleRoundedFrameSideShelves: () => void;
};

export type CreateDesignTabControllerRuntimeArgs = {
  app: AppContainer;
  setFeatureToggle: (key: DesignTabFeatureToggleKey, on: boolean) => void;
};

const COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS = { buildTiming: 'coalesced' } as const;

export function normalizeDesignTabGrooveLinesCount(count: number): number {
  return Math.max(1, Math.floor(Number(count) || 0));
}

function freezeExistingGrooveLinesCount(app: AppContainer): void {
  const source = 'react:design:grooveLinesCount:freezeExisting';
  const nextMap = materializeActiveGrooveLinesCountMap(app);
  applyStructuralConfigMutation(
    app,
    source,
    { grooveLinesCountMap: nextMap },
    meta => {
      replaceDoorGrooveLinesCountMap(app, nextMap, meta);
    },
    COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS
  );
}

function readCurrentUiString(app: AppContainer, key: keyof UiStateLike): string {
  try {
    const value = readStoreStateMaybe(app)?.ui?.[key];
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

function readCurrentConfigRecord(app: AppContainer): ConfigStateLike {
  try {
    return readStoreStateMaybe(app)?.config ?? {};
  } catch {
    return {};
  }
}

export function createDesignTabControllerRuntime(
  args: CreateDesignTabControllerRuntimeArgs
): DesignTabControllerRuntime {
  const { app, setFeatureToggle } = args;

  return {
    setDoorStyle(style: DesignTabDoorStyle) {
      const next = String(style || '');
      if (!next) return;
      const source = 'react:design:doorStyle';
      const state = readStoreStateMaybe(app);
      const uiChanged = state?.ui?.doorStyle !== next;
      const cfg = state?.config;
      const upperDoorStyleMap = cfg?.isLibraryMode
        ? buildLibraryUpperDoorStyleMap(
            cfg.doorStyleMap,
            state?.ui?.raw?.doors,
            cfg.wardrobeType === 'sliding' ? 'sliding' : 'hinged',
            style
          )
        : null;
      if (!uiChanged && !upperDoorStyleMap) return;

      const updateUiStyle = () =>
        applyStructuralUiMutation(
          app,
          source,
          { doorStyle: next },
          meta => setUiDoorStyle(app, next, meta),
          COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS
        );
      if (!upperDoorStyleMap) {
        updateUiStyle();
        return;
      }

      // Root actions.patch rejects config map writes. Use the semantic config
      // snapshot writer, with one history entry and one coalesced rebuild.
      runHistoryBatch(
        app,
        () => {
          applyProjectConfigSnapshot(
            app,
            { doorStyleMap: upperDoorStyleMap },
            createStructuralMutationMeta(source, {
              buildTiming: uiChanged ? 'none' : 'coalesced',
            })
          );
          if (uiChanged) updateUiStyle();
        },
        createStructuralMutationMeta(source, COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS)
      );
    },

    setCorniceType(value: DesignTabCorniceType) {
      const next = String(value || '');
      if (readCurrentUiString(app, 'corniceType') === next) return;
      applyStructuralUiMutation(
        app,
        'react:design:corniceType',
        { corniceType: next },
        meta => {
          setUiCorniceType(app, next, meta);
        },
        COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS
      );
    },

    setCorniceDimension(key, value) {
      const next = readCorniceDimensionCm(key, value);
      if (value !== undefined && next === null) return;
      const current = readStoreStateMaybe(app)?.ui?.corniceDimensions;
      if ((current?.[key] ?? null) === next) return;
      const patch = { corniceDimensions: { [key]: next } };
      applyStructuralUiMutation(
        app,
        'react:design:corniceDimensions',
        patch,
        meta => patchUi(app, patch, meta),
        COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS
      );
    },

    setFeatureToggle,

    setHasCornice(checked: boolean) {
      setFeatureToggle('hasCornice', checked);
    },

    setGrooveLinesCount(count: number) {
      const nextValue = normalizeDesignTabGrooveLinesCount(count);
      const source = 'react:design:grooveLinesCount';
      runHistoryBatch(
        app,
        () => {
          freezeExistingGrooveLinesCount(app);
          applyStructuralConfigMutation(
            app,
            source,
            { grooveLinesCount: nextValue },
            meta => {
              setCfgScalar(app, 'grooveLinesCount', nextValue, meta);
            },
            COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS
          );
        },
        createStructuralMutationMeta(source, COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS)
      );
    },

    resetGrooveLinesCount() {
      const source = 'react:design:grooveLinesCount:reset';
      runHistoryBatch(
        app,
        () => {
          freezeExistingGrooveLinesCount(app);
          applyStructuralConfigMutation(
            app,
            source,
            { grooveLinesCount: null },
            meta => {
              setCfgScalar(app, 'grooveLinesCount', null, meta);
            },
            COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS
          );
        },
        createStructuralMutationMeta(source, COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS)
      );
    },

    setDoorCutArch(arched: boolean) {
      setUiScalarSoft(app, 'doorCutArch', arched);
    },

    setDoorGrooveArch(arched: boolean) {
      setUiScalarSoft(app, 'doorGrooveArch', arched);
    },

    toggleGrooveManual() {
      const ui = readStoreStateMaybe(app)?.ui;
      setUiScalarSoft(app, 'grooveManualEnabled', !(ui?.grooveManualEnabled === true));
    },

    setGrooveDraftHeightCm(value: string) {
      setUiScalarSoft(app, 'currentGrooveDraftHeightCm', String(value ?? ''));
    },

    setGrooveDraftWidthCm(value: string) {
      setUiScalarSoft(app, 'currentGrooveDraftWidthCm', String(value ?? ''));
    },

    setGrooveOrientation(orientation: GrooveOrientation) {
      setUiScalarSoft(
        app,
        'currentGrooveOrientation',
        orientation === 'horizontal' ? 'horizontal' : 'vertical'
      );
    },

    toggleRoundedFrameSideShelves() {
      const {
        partIds,
        shelvesMap: current,
        mapName,
      } = readDesignTabRoundedFrameSideSelection(readCurrentConfigRecord(app));
      if (!partIds.length) return;
      const allRounded = partIds.every(partId => current[partId] === true);
      const nextMap = { ...current };
      for (const partId of partIds) nextMap[partId] = allRounded ? null : true;

      const source = 'react:design:roundedFrameSideShelves';
      runHistoryBatch(
        app,
        () => {
          applyStructuralConfigMutation(
            app,
            source,
            { [mapName]: nextMap },
            meta => {
              replaceRoundedFrameSideShelvesMap(app, nextMap, meta);
            },
            COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS
          );
        },
        createStructuralMutationMeta(source, COALESCED_DESIGN_STRUCTURAL_BUILD_OPTIONS)
      );
    },
  };
}
