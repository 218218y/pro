import { readFunction } from './build_flow_readers.js';
import { pickChestModeUi } from './build_wardrobe_flow_context_ui.js';
import { resolveBuildWardrobeContextReaders } from './build_wardrobe_flow_context_readers.js';
import { createBuildStringNormalizer } from './build_string_normalizer.js';

import type {
  BuilderContentsRenderPolicy,
  ConfigStateLike,
  ProjectSavedNotesLike,
  UnknownRecord,
} from '../../../types';
import type { PreparedBuildWardrobeFlow } from './build_wardrobe_flow_prepare.js';

export type PreparedBuildWardrobeContextSetup = {
  notesToPreserve: ProjectSavedNotesLike | null;
  calculateModuleStructureFn: ReturnType<
    typeof resolveBuildWardrobeContextReaders
  >['calculateModuleStructureFn'];
  getMaterialFn: ReturnType<typeof resolveBuildWardrobeContextReaders>['getMaterialFn'];
  addOutlinesMesh: ReturnType<typeof resolveBuildWardrobeContextReaders>['addOutlinesMesh'];
  toStr: ReturnType<typeof createBuildStringNormalizer>;
};

export function prepareBuildWardrobeContextSetup(
  prepared: PreparedBuildWardrobeFlow
): PreparedBuildWardrobeContextSetup | null {
  const {
    label,
    deps,
    orchestration,
    buildState,
    widthCm,
    heightCm,
    depthCm,
    chestDrawersCount,
    sketchMode,
    renderPolicy,
  } = prepared;
  const { cleanGroup, getNotesForSave, calculateModuleStructure, getMaterial, buildChestOnly } = deps;
  const { state, ui, cfgSnapshot } = buildState;

  const readers = resolveBuildWardrobeContextReaders({
    label,
    sketchMode,
    cfgSnapshot,
    calculateModuleStructure,
    getMaterial,
    addOutlines: renderPolicy.addOutlines,
  });

  const pre = orchestration.prepareScene({
    state,
    cleanGroup: readFunction<(g: unknown) => void>(cleanGroup),
    getNotesForSave: readFunction<() => ProjectSavedNotesLike>(getNotesForSave),
  });

  const notesToPreserve = pre && pre.notesToPreserve ? pre.notesToPreserve : null;

  const buildChestOnlyFn =
    readFunction<
      (args: {
        H: number;
        totalW: number;
        D: number;
        drawersCount: number;
        baseType: string;
        baseLegStyle: string;
        baseLegColor: string;
        baseLegPlatformMode: string;
        baseLegPlatformSideMode?: string;
        baseLegPlatformSideOverhangCm?: number;
        baseLegPlatformFrontOverhangCm?: number;
        basePlinthHeightCm: number;
        baseLegHeightCm: number;
        baseLegWidthCm?: number;
        colorChoice: string;
        customColor: string;
        doorStyle: string;
        isGroovesEnabled: boolean;
        chestCommodeEnabled: boolean;
        chestCommodeMirrorHeightCm: number;
        chestCommodeMirrorWidthCm: number;
        cfgSnapshot: ConfigStateLike | UnknownRecord;
        renderPolicy: BuilderContentsRenderPolicy;
      }) => void
    >(buildChestOnly);

  if (
    orchestration.buildChestModeIfNeeded({
      ui: pickChestModeUi(ui),
      widthCm,
      heightCm,
      depthCm,
      drawersCount: chestDrawersCount,
      cfgSnapshot,
      ...(buildChestOnlyFn ? { buildChestOnly: buildChestOnlyFn } : {}),
      renderPolicy,
    })
  ) {
    return null;
  }

  return {
    notesToPreserve,
    calculateModuleStructureFn: readers.calculateModuleStructureFn,
    getMaterialFn: readers.getMaterialFn,
    addOutlinesMesh: readers.addOutlinesMesh,
    toStr: createBuildStringNormalizer(),
  };
}
