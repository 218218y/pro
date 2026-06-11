import type { UnknownRecord } from '../../../types';
import type {
  InteriorObjectLike,
  InteriorTHREESurface,
  InteriorValueRecord,
  RenderInteriorOpsDeps,
} from './render_interior_ops_contracts.js';

type AddOutlinesFn = (obj: InteriorObjectLike) => unknown;
type AddRealisticHangerFn = (
  x: number,
  y: number,
  z: number,
  group: InteriorObjectLike,
  innerW: number,
  single: boolean
) => unknown;
type HangingClothesDepthHint = number | boolean;
type AddHangingClothesFn = (
  x: number,
  y: number,
  z: number,
  width: number,
  group: InteriorObjectLike,
  availableHeight: number,
  depthHint: HangingClothesDepthHint,
  showContentsEnabled: boolean,
  doorStyle: string | null | undefined
) => unknown;

type RodConfigLike = {
  legMat?: unknown;
  rodMat?: unknown;
  intDrawersList?: unknown[];
  intDrawersSlot?: unknown;
  isCustom?: boolean;
  customData?: UnknownRecord & { storage?: unknown };
  layout?: string | null;
};

type RenderInteriorRodArgs = InteriorValueRecord & {
  THREE?: InteriorTHREESurface | null;
  yPos?: unknown;
  enableHangingClothes?: boolean;
  enableSingleHanger?: boolean;
  manualHeightLimit?: unknown;
  cfg?: RodConfigLike | null;
  config?: RodConfigLike | null;
  effectiveBottomY?: unknown;
  localGridStep?: unknown;
  isInternalDrawersEnabled?: boolean;
  intDrawersList?: unknown[];
  intDrawersSlot?: unknown;
  innerW?: unknown;
  internalCenterX?: unknown;
  internalZ?: unknown;
  internalDepth?: unknown;
  doorFrontZ?: unknown;
  wardrobeGroup?: InteriorObjectLike | null;
  addOutlines?: AddOutlinesFn | null;
  showHangerEnabled?: unknown;
  addRealisticHanger?: AddRealisticHangerFn | null;
  showContentsEnabled?: unknown;
  addHangingClothes?: AddHangingClothesFn | null;
  doorStyle?: string | null;
  legMat?: unknown;
  rodMat?: unknown;
};

type RodMaterialCache = InteriorValueRecord & {
  interiorRodMat?: unknown;
};

function isRecord(value: unknown): value is InteriorValueRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isRodArgs(value: unknown): value is RenderInteriorRodArgs {
  return isRecord(value);
}

function readFiniteNumber(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function readOptionalFiniteNumber(value: unknown): number | null {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function resolveRodMaterial(args: {
  THREE: InteriorTHREESurface;
  cache: RodMaterialCache;
  explicitMat?: unknown;
}): unknown {
  const { THREE, cache, explicitMat } = args;
  if (explicitMat != null) return explicitMat;

  if (!cache.interiorRodMat) {
    cache.interiorRodMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2,
    });
  }

  return cache.interiorRodMat;
}

function readDrawerSlots(args: RenderInteriorRodArgs, config: RodConfigLike): number[] {
  if (Array.isArray(args.intDrawersList)) {
    return args.intDrawersList.map(entry => Number(entry)).filter(entry => Number.isFinite(entry));
  }
  if (Array.isArray(config.intDrawersList)) {
    return config.intDrawersList.map(entry => Number(entry)).filter(entry => Number.isFinite(entry));
  }
  const slot = readOptionalFiniteNumber(args.intDrawersSlot ?? config.intDrawersSlot);
  return slot !== null ? [slot] : [];
}

export function createBuilderRenderInteriorRodOps(deps: RenderInteriorOpsDeps) {
  const __app = deps.app;
  const __ops = deps.ops;
  const __wardrobeGroup = deps.wardrobeGroup;
  const __three = deps.three;
  const __matCache = deps.matCache;
  const __renderOpsHandleCatch = deps.renderOpsHandleCatch;

  // Stage 3G-6: Centralized rod + hanger + hanging-clothes rendering.
  // Moves the legacy createRod closure out of BuilderCore.

  function createRodWithContents(args: RenderInteriorRodArgs | unknown) {
    const safeArgs = isRodArgs(args) ? args : {};
    const App = __app(safeArgs);
    __ops(App);

    const THREE = safeArgs.THREE;
    if (!THREE || !THREE.Mesh || !THREE.CylinderGeometry) return false;

    const yPos = readFiniteNumber(safeArgs.yPos, Number.NaN);
    if (!Number.isFinite(yPos)) return false;

    let enableHangingClothes = safeArgs.enableHangingClothes !== false;
    const enableSingleHanger = safeArgs.enableSingleHanger !== false;
    const manualHeightLimit = readOptionalFiniteNumber(safeArgs.manualHeightLimit);

    const effectiveBottomY = readFiniteNumber(safeArgs.effectiveBottomY);
    const localGridStep = readFiniteNumber(safeArgs.localGridStep);
    const innerW = readFiniteNumber(safeArgs.innerW);
    const internalCenterX = readFiniteNumber(safeArgs.internalCenterX);
    const internalZ = readFiniteNumber(safeArgs.internalZ);
    const internalDepth = readOptionalFiniteNumber(safeArgs.internalDepth);
    const doorFrontZ = readOptionalFiniteNumber(safeArgs.doorFrontZ);

    const group = safeArgs.wardrobeGroup || __wardrobeGroup(App);
    if (!group || typeof group.add !== 'function') return false;

    const addOutlines = safeArgs.addOutlines;
    const showHangerEnabled = !!safeArgs.showHangerEnabled;
    const showContentsEnabled = !!safeArgs.showContentsEnabled;
    const addRealisticHanger = safeArgs.addRealisticHanger;
    const addHangingClothes = safeArgs.addHangingClothes;
    const doorStyle = safeArgs.doorStyle;

    const cfg = safeArgs.cfg || {};
    const config = safeArgs.config || {};

    const isInternalDrawersEnabled = safeArgs.isInternalDrawersEnabled === true;
    const activeSlots = isInternalDrawersEnabled ? readDrawerSlots(safeArgs, config) : [];

    if (
      isInternalDrawersEnabled &&
      activeSlots.length &&
      Number.isFinite(localGridStep) &&
      localGridStep > 0
    ) {
      for (let slotIndex = 0; slotIndex < activeSlots.length; slotIndex++) {
        const activeSlot = activeSlots[slotIndex];
        const drawerBottomY = effectiveBottomY + (activeSlot - 1) * localGridStep - 0.05;
        const drawerTopY = effectiveBottomY + activeSlot * localGridStep + 0.05;
        if (yPos >= drawerBottomY && yPos <= drawerTopY) {
          return true;
        }
      }
    }

    let availableHeight = manualHeightLimit != null ? manualHeightLimit : yPos - effectiveBottomY;

    const hasStorageBarrier =
      (config.isCustom && !!config.customData?.storage) ||
      config.layout === 'storage_shelf' ||
      config.layout === 'storage';

    if (
      isInternalDrawersEnabled &&
      activeSlots.length &&
      Number.isFinite(localGridStep) &&
      localGridStep > 0
    ) {
      let highestDrawerBelowRodY = effectiveBottomY;
      for (let index = 0; index < activeSlots.length; index++) {
        const slot = activeSlots[index];
        const drawerTopEdge = effectiveBottomY + slot * localGridStep;
        if (drawerTopEdge < yPos && drawerTopEdge > highestDrawerBelowRodY) {
          highestDrawerBelowRodY = drawerTopEdge;
        }
      }
      if (yPos - highestDrawerBelowRodY < 0.75) enableHangingClothes = false;
      if (manualHeightLimit == null) availableHeight = yPos - highestDrawerBelowRodY;
    }

    const rodMat = resolveRodMaterial({
      THREE,
      cache: __matCache(App),
      explicitMat: safeArgs.rodMat ?? cfg.rodMat,
    });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, innerW - 0.04, 12), rodMat);
    if (!rod.position || !rod.rotation || typeof rod.position.set !== 'function') return false;
    rod.rotation.z = Math.PI / 2;
    rod.position.set(internalCenterX, yPos, internalZ);
    if (typeof addOutlines === 'function') {
      addOutlines(rod);
    }
    group.add(rod);

    if (showHangerEnabled && enableSingleHanger && typeof addRealisticHanger === 'function') {
      addRealisticHanger(internalCenterX, yPos, internalZ, group, innerW, true);
    }

    if (showContentsEnabled && enableHangingClothes && typeof addHangingClothes === 'function') {
      let depthHint: HangingClothesDepthHint = hasStorageBarrier;
      let depthLimit = Infinity;

      if (internalDepth != null) {
        depthLimit = Math.min(depthLimit, internalDepth - 0.04);
      }

      if (doorFrontZ != null) {
        const availFront = doorFrontZ - 0.025 - internalZ;
        if (Number.isFinite(availFront)) depthLimit = Math.min(depthLimit, 2 * availFront);
      }

      if (hasStorageBarrier) depthLimit = Math.min(depthLimit, 0.3);

      if (Number.isFinite(depthLimit) && depthLimit > 0) {
        depthHint = Math.min(0.45, Math.max(0.12, depthLimit));
      }

      addHangingClothes(
        internalCenterX,
        yPos,
        internalZ,
        innerW - 0.06,
        group,
        availableHeight,
        depthHint,
        showContentsEnabled,
        doorStyle
      );
    }

    return true;
  }

  return {
    createRodWithContents,
  };
}
