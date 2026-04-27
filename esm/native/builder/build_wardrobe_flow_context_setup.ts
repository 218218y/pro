import { readFunction } from './build_flow_readers.js';
import { prepareBuildScene } from './pre_build_reset.js';
import { buildChestModeIfNeeded } from './chest_mode_pipeline.js';
import { pickChestModeUi } from './build_wardrobe_flow_context_ui.js';
import { resolveBuildWardrobeContextReaders } from './build_wardrobe_flow_context_readers.js';

import type { AppContainer, ProjectSavedNotesLike } from '../../../types';
import type { PreparedBuildWardrobeFlow } from './build_wardrobe_flow_prepare.js';

type BuildStringNormalizer = (value: unknown, fallback?: string) => string;

function fallbackToBuildString(value: unknown, fallback?: string): string {
  if (value == null) return fallback || '';
  return String(value);
}

function createBuildStringNormalizer(App: AppContainer | null | undefined): BuildStringNormalizer {
  const platformStringify = App?.util?.str;
  if (typeof platformStringify !== 'function') return fallbackToBuildString;
  return (value: unknown, fallback?: string): string => platformStringify(value, fallback || '');
}

export type PreparedBuildWardrobeContextSetup = {
  notesToPreserve: ProjectSavedNotesLike | null;
  calculateModuleStructureFn: ReturnType<
    typeof resolveBuildWardrobeContextReaders
  >['calculateModuleStructureFn'];
  getMaterialFn: ReturnType<typeof resolveBuildWardrobeContextReaders>['getMaterialFn'];
  addOutlinesMesh: ReturnType<typeof resolveBuildWardrobeContextReaders>['addOutlinesMesh'];
  toStr: BuildStringNormalizer;
};

export function prepareBuildWardrobeContextSetup(
  prepared: PreparedBuildWardrobeFlow
): PreparedBuildWardrobeContextSetup | null {
  const { App, label, deps, buildState, widthCm, heightCm, depthCm, chestDrawersCount, sketchMode } =
    prepared;
  const { cleanGroup, getNotesForSave, calculateModuleStructure, getMaterial, addOutlines, buildChestOnly } =
    deps;
  const { state, ui } = buildState;

  const readers = resolveBuildWardrobeContextReaders({
    label,
    sketchMode,
    calculateModuleStructure,
    getMaterial,
    addOutlines,
  });

  const pre = prepareBuildScene({
    App,
    state,
    cleanGroup: readFunction<(g: unknown) => void>(cleanGroup),
    getNotesForSave: readFunction<() => ProjectSavedNotesLike>(getNotesForSave),
  });

  const notesToPreserve = pre && pre.notesToPreserve ? pre.notesToPreserve : null;

  if (
    buildChestModeIfNeeded({
      App,
      ui: pickChestModeUi(ui),
      widthCm,
      heightCm,
      depthCm,
      drawersCount: chestDrawersCount,
      buildChestOnly:
        readFunction<
          (args: {
            H: number;
            totalW: number;
            D: number;
            drawersCount: number;
            baseType: string;
            baseLegStyle: string;
            baseLegColor: string;
            baseLegHeightCm: number | string;
            baseLegWidthCm?: number | string;
            colorChoice: string;
            customColor: string;
          }) => void
        >(buildChestOnly) || undefined,
    })
  ) {
    return null;
  }

  return {
    notesToPreserve,
    calculateModuleStructureFn: readers.calculateModuleStructureFn,
    getMaterialFn: readers.getMaterialFn,
    addOutlinesMesh: readers.addOutlinesMesh,
    toStr: createBuildStringNormalizer(App),
  };
}
