import {
  INTERIOR_ROD_CONTENT_CLEARANCE_POLICY,
  INTERIOR_ROD_DEPTH_CLEARANCE_POLICY,
  INTERIOR_ROD_RENDER_POLICY,
} from '../../shared/dimensions/interior_fittings_policy.js';
import {
  canSingleHangerFitBelowRod,
  resolveInteriorRodAvailableHeight,
} from './render_interior_rod_clearance.js';
import { resolveHorizontalSpanAgainstRoomColumnCut } from './room_architecture_geometry.js';
import { appendInteriorRodEndSupports } from './interior_rod_support_visuals.js';
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
  policy: { showHangerEnabled: boolean; sketchMode: boolean; addOutlines: AddOutlinesFn | null }
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
  policy: {
    showContentsEnabled: boolean;
    doorStyle: string;
    sketchMode: boolean;
    addOutlines: AddOutlinesFn | null;
  }
) => unknown;

type RodConfigLike = {
  legMat?: unknown;
  rodMat?: unknown;
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
  effectiveTopY?: unknown;
  gridDivisions?: unknown;
  woodThick?: unknown;
  shelfThick?: unknown;
  isInternalDrawersEnabled?: boolean;
  innerW?: unknown;
  internalCenterX?: unknown;
  internalZ?: unknown;
  internalDepth?: unknown;
  doorFrontZ?: unknown;
  wardrobeGroup?: InteriorObjectLike | null;
  addOutlines?: AddOutlinesFn | null;
  sketchMode?: boolean;
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

function readFiniteNumber(value: unknown, defaultValue = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

function readOptionalFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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

export function createBuilderRenderInteriorRodOps(deps: RenderInteriorOpsDeps) {
  const __app = deps.app;
  const __ops = deps.ops;
  const __wardrobeGroup = deps.wardrobeGroup;
  const __three = deps.three;
  const __matCache = deps.matCache;
  const __renderOpsHandleCatch = deps.renderOpsHandleCatch;

  // Centralized rod, hanger, and hanging-clothes rendering.

  function createRodWithContents(args: unknown) {
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
    const effectiveTopY = readOptionalFiniteNumber(safeArgs.effectiveTopY);
    const gridDivisions = readOptionalFiniteNumber(safeArgs.gridDivisions);
    const woodThick = readOptionalFiniteNumber(safeArgs.woodThick);
    const shelfThick = readOptionalFiniteNumber(safeArgs.shelfThick);
    const innerW = readFiniteNumber(safeArgs.innerW);
    const internalCenterX = readFiniteNumber(safeArgs.internalCenterX);
    const internalZ = readFiniteNumber(safeArgs.internalZ);
    const internalDepth = readOptionalFiniteNumber(safeArgs.internalDepth);
    const doorFrontZ = readOptionalFiniteNumber(safeArgs.doorFrontZ);

    const group = safeArgs.wardrobeGroup || __wardrobeGroup(App);
    if (!group || typeof group.add !== 'function') return false;

    const addOutlines = safeArgs.addOutlines;
    const sketchMode = safeArgs.sketchMode === true;
    const showHangerEnabled = !!safeArgs.showHangerEnabled;
    const showContentsEnabled = !!safeArgs.showContentsEnabled;
    const addRealisticHanger = safeArgs.addRealisticHanger;
    const addHangingClothes = safeArgs.addHangingClothes;
    const doorStyle = safeArgs.doorStyle;

    const cfg = safeArgs.cfg || {};
    const config = safeArgs.config || {};

    let availableHeight = resolveInteriorRodAvailableHeight({
      config,
      yPos,
      effectiveBottomY,
      effectiveTopY,
      localGridStep,
      gridDivisions,
      manualHeightLimit,
      woodThick,
      shelfThick,
    });

    const hasStorageBarrier =
      (config.isCustom && !!config.customData?.storage) ||
      config.layout === 'storage_shelf' ||
      config.layout === 'storage';

    const sourceRodLength = innerW - INTERIOR_ROD_RENDER_POLICY.widthClearanceM;
    if (!(sourceRodLength > 0)) return true;

    const rodSpan = resolveHorizontalSpanAgainstRoomColumnCut(App, {
      centerX: internalCenterX,
      centerY: yPos,
      centerZ: internalZ,
      length: sourceRodLength,
      halfHeight: INTERIOR_ROD_RENDER_POLICY.radiusM,
      halfDepth: INTERIOR_ROD_RENDER_POLICY.radiusM,
      minUsableLength: INTERIOR_ROD_RENDER_POLICY.columnCutMinUsableLengthM,
    });
    if (!rodSpan) return true;

    const rodMat = resolveRodMaterial({
      THREE,
      cache: __matCache(App),
      explicitMat: safeArgs.rodMat ?? cfg.rodMat,
    });
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(
        INTERIOR_ROD_RENDER_POLICY.radiusM,
        INTERIOR_ROD_RENDER_POLICY.radiusM,
        rodSpan.length,
        INTERIOR_ROD_RENDER_POLICY.radialSegments
      ),
      rodMat
    );
    if (!rod.position || !rod.rotation || typeof rod.position.set !== 'function') return false;
    rod.rotation.z = Math.PI / 2;
    rod.position.set(rodSpan.centerX, yPos, internalZ);
    rod.userData = {
      ...rod.userData,
      __kind: 'wardrobe_rod',
      __wpMeasurementIgnoreInteriorBoundary: true,
    };
    if (typeof addOutlines === 'function') {
      addOutlines(rod);
    }
    group.add(rod);
    const sourceRodMinX = internalCenterX - sourceRodLength / 2;
    const sourceRodMaxX = internalCenterX + sourceRodLength / 2;
    const rodWasCutAtNegativeEnd = rodSpan.minX > sourceRodMinX + 1e-6;
    const rodWasCutAtPositiveEnd = rodSpan.maxX < sourceRodMaxX - 1e-6;
    appendInteriorRodEndSupports({
      THREE,
      parent: group,
      material: rodMat,
      centerX: rodSpan.centerX,
      centerY: yPos,
      centerZ: internalZ,
      rodLength: rodSpan.length,
      rodRadius: INTERIOR_ROD_RENDER_POLICY.radiusM,
      axis: 'x',
      negativeMountCoord: rodWasCutAtNegativeEnd ? rodSpan.minX : internalCenterX - innerW / 2,
      positiveMountCoord: rodWasCutAtPositiveEnd ? rodSpan.maxX : internalCenterX + innerW / 2,
      addOutlines:
        typeof addOutlines === 'function' ? support => addOutlines(support as InteriorObjectLike) : null,
    });

    const singleHangerAvailableHeight = resolveInteriorRodAvailableHeight({
      config,
      yPos,
      effectiveBottomY,
      effectiveTopY,
      localGridStep,
      gridDivisions,
      manualHeightLimit,
      woodThick,
      shelfThick,
      shelfBlockerMode: 'surface',
    });

    const canRenderSingleHanger = canSingleHangerFitBelowRod({
      availableHeight: singleHangerAvailableHeight,
      moduleWidth: rodSpan.length,
    });

    if (
      showHangerEnabled &&
      enableSingleHanger &&
      canRenderSingleHanger &&
      typeof addRealisticHanger === 'function'
    ) {
      addRealisticHanger(rodSpan.centerX, yPos, internalZ, group, rodSpan.length, {
        showHangerEnabled,
        sketchMode,
        addOutlines: typeof addOutlines === 'function' ? addOutlines : null,
      });
    }

    if (showContentsEnabled && enableHangingClothes && typeof addHangingClothes === 'function') {
      if (typeof doorStyle !== 'string') {
        throw new TypeError('[render_interior_rod_ops] doorStyle is required for hanging contents');
      }
      let depthHint: HangingClothesDepthHint = hasStorageBarrier;
      let depthLimit = Infinity;

      if (internalDepth != null) {
        depthLimit = Math.min(
          depthLimit,
          internalDepth - INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.depthBackClearanceM
        );
      }

      if (doorFrontZ != null) {
        const availFront = doorFrontZ - INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.doorFrontClearanceM - internalZ;
        if (Number.isFinite(availFront)) depthLimit = Math.min(depthLimit, 2 * availFront);
      }

      if (hasStorageBarrier)
        depthLimit = Math.min(depthLimit, INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.storageDepthLimitM);

      if (Number.isFinite(depthLimit) && depthLimit > 0) {
        depthHint = Math.min(
          INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.depthHintMaxM,
          Math.max(INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.depthHintMinM, depthLimit)
        );
      }

      const hangingContentsWidth =
        rodSpan.length - INTERIOR_ROD_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM;
      if (hangingContentsWidth > 0) {
        addHangingClothes(
          rodSpan.centerX,
          yPos,
          internalZ,
          hangingContentsWidth,
          group,
          availableHeight,
          depthHint,
          {
            showContentsEnabled,
            doorStyle,
            sketchMode,
            addOutlines: typeof addOutlines === 'function' ? addOutlines : null,
          }
        );
      }
    }

    return true;
  }

  return {
    createRodWithContents,
  };
}
