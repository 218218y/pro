// Native Builder: internal drawers pipeline (ESM)
//
// Extracted from `builder/core.js` to keep the core loop focused and avoid
// adding UI/DOM readback paths.
//
// Responsibilities:
// - Decide whether a slot has internal drawers
// - Compute deterministic ops via builderCorePure
// - Apply ops via builderRenderOps
//
// Notes:
// - Pure ESM: no implicit globals, no DOM access.

import { computeInternalDrawersOpsForSlot } from './pure_api.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { reportError } from '../runtime/errors.js';
import type {
  AppContainer,
  ApplyInternalDrawersArgsLike,
  BuilderContentsSurfaceLike,
  BuilderCreateInternalDrawerBoxFn,
  BuilderInternalDrawerCreator,
  BuilderInternalDrawerSlotMetaLike,
  BuilderOutlineFn,
  BuilderPartMaterialResolver,
  InternalDrawerOpLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types';

type DrawerDividersMapLike = Record<string, unknown>;

type InternalDrawersConfigLike = {
  drawerDividersMap?: DrawerDividersMapLike | null;
  intDrawersList?: unknown[];
  intDrawersSlot?: unknown;
};

type InternalDrawerCreatorParams = {
  App?: AppContainer | null;
  THREE?: ThreeLike;
  cfg?: InternalDrawersConfigLike | null;
  config?: InternalDrawersConfigLike | null;
  moduleIndex?: number;
  keyPrefix?: string;
  effectiveBottomY?: number;
  localGridStep?: number;
  drawerSizingGridStep?: number;
  internalCenterX?: number;
  internalZ?: number;
  internalDepth?: number;
  innerW?: number;
  isInternalDrawersEnabled?: boolean;
  wardrobeGroup?: unknown;
  createInternalDrawerBox?: BuilderCreateInternalDrawerBoxFn | null;
  addOutlines?: BuilderOutlineFn | null;
  getPartMaterial?: BuilderPartMaterialResolver | null;
  bodyMat?: unknown;
  showContentsEnabled?: boolean;
  addFoldedClothes?: BuilderContentsSurfaceLike['addFoldedClothes'];
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readDrawerDividersMap(value: unknown): DrawerDividersMapLike {
  return isRecord(value) ? value : {};
}

function readActiveDrawerSlots(config: InternalDrawersConfigLike | null | undefined): number[] {
  if (!config) return [];
  if (Array.isArray(config.intDrawersList)) {
    return config.intDrawersList.map(entry => Number(entry)).filter(entry => Number.isFinite(entry));
  }
  const slot = Number(config.intDrawersSlot);
  return Number.isFinite(slot) ? [slot] : [];
}

type RenderOpsWithInternalDrawers = {
  applyInternalDrawersOps?: (args: ApplyInternalDrawersArgsLike) => unknown;
};

function readRenderOpsWithInternalDrawers(value: unknown): RenderOpsWithInternalDrawers | null {
  if (!isRecord(value)) return null;
  const applyOps = value.applyInternalDrawersOps;
  if (typeof applyOps !== 'function') return null;
  return {
    applyInternalDrawersOps: (args: ApplyInternalDrawersArgsLike) => Reflect.apply(applyOps, value, [args]),
  };
}

export function makeInternalDrawerCreator(params: InternalDrawerCreatorParams): BuilderInternalDrawerCreator {
  const {
    App,
    THREE,
    cfg,
    config,
    wardrobeGroup,
    createInternalDrawerBox,
    addOutlines,
    getPartMaterial,
    bodyMat,
    addFoldedClothes,
  } = params;

  const moduleIndex = typeof params.moduleIndex === 'number' ? params.moduleIndex : -1;
  const keyPrefix = typeof params.keyPrefix === 'string' ? params.keyPrefix : '';
  const effectiveBottomY = typeof params.effectiveBottomY === 'number' ? params.effectiveBottomY : 0;
  const localGridStep = typeof params.localGridStep === 'number' ? params.localGridStep : 0;
  const drawerSizingGridStep =
    typeof params.drawerSizingGridStep === 'number' ? params.drawerSizingGridStep : 0;
  const internalCenterX = typeof params.internalCenterX === 'number' ? params.internalCenterX : 0;
  const internalZ = typeof params.internalZ === 'number' ? params.internalZ : 0;
  const internalDepth = typeof params.internalDepth === 'number' ? params.internalDepth : 0;
  const innerW = typeof params.innerW === 'number' ? params.innerW : 0;
  const isInternalDrawersEnabled = params.isInternalDrawersEnabled === true;
  const showContentsEnabled = params.showContentsEnabled === true;

  if (!THREE) throw new Error('[builder/internal_drawers_pipeline] THREE missing');

  const drawerDividersMap = readDrawerDividersMap(cfg?.drawerDividersMap);

  return function checkAndCreateInternalDrawer(
    slotIndex: number,
    slotMeta?: BuilderInternalDrawerSlotMetaLike
  ): boolean {
    if (!isInternalDrawersEnabled) return false;

    const activeSlots = readActiveDrawerSlots(config);
    if (!activeSlots.length || !activeSlots.includes(slotIndex)) return false;

    const divKey = `${keyPrefix}div_int_${moduleIndex}_slot_${slotIndex}`;
    const hasDivider = !!drawerDividersMap[divKey];

    let ops: InternalDrawerOpLike[] | null = null;
    try {
      ops = computeInternalDrawersOpsForSlot({
        moduleIndex,
        slotIndex,
        keyPrefix,
        effectiveBottomY,
        localGridStep,
        drawerSizingGridStep,
        internalCenterX,
        internalZ,
        internalDepth,
        innerW,
        hasDivider,
        slotAvailableHeight:
          slotMeta && typeof slotMeta.slotAvailableHeight === 'number'
            ? slotMeta.slotAvailableHeight
            : undefined,
      });
    } catch (e) {
      try {
        if (App) {
          reportError(App, e, {
            where: 'native/builder/internal_drawers_pipeline.computeInternalDrawersOpsForSlot',
            divKey,
            slotIndex,
            keyPrefix,
          });
        }
      } catch (_) {}
      throw e;
    }

    if (!Array.isArray(ops) || !ops.length) {
      throw new Error('[WardrobePro] internal drawers ops empty for ' + String(divKey));
    }

    const ro = readRenderOpsWithInternalDrawers(getBuilderRenderOps(App));
    if (!ro || typeof ro.applyInternalDrawersOps !== 'function') {
      throw new Error('[WardrobePro] internal drawers ops missing: applyInternalDrawersOps');
    }

    try {
      ro.applyInternalDrawersOps({
        THREE,
        ops,
        wardrobeGroup,
        createInternalDrawerBox,
        addOutlines,
        getPartMaterial,
        bodyMat,
        showContentsEnabled,
        addFoldedClothes,
      });
      return true;
    } catch (e) {
      try {
        if (App) {
          reportError(App, e, {
            where: 'native/builder/internal_drawers_pipeline.applyInternalDrawersOps',
            divKey,
          });
        }
      } catch (_) {}
      throw e;
    }
  };
}
