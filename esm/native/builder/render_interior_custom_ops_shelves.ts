import {
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
  INTERIOR_SHELF_PIN_RENDER_POLICY,
} from '../../shared/dimensions/interior_fittings_policy.js';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import {
  SHELF_GROUP_PART_ID,
  createModuleShelfPartId,
  markShelfBoardUserData,
  resolveShelfPartMaterial,
} from '../features/part_identity/api.js';
import type { AppContainer, BuilderCreateBoardOptions, RoomArchitecturePlan } from '../../../types';
import type {
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorTHREESurface,
} from './render_interior_ops_contracts.js';
import {
  __isFn,
  asMaterial,
  asMesh,
  isRecord,
  type InteriorCustomBraceMetrics,
  type ShelfVariant,
} from './render_interior_custom_ops_shared.js';
import type {
  RemovedFrameSideShelfExposure,
  RemovedFrameSideShelfRounding,
} from './removed_frame_side_brace_shelves.js';
import { boxFromCenterSize, intersectsActiveRoomColumnCutObstacle } from './room_architecture_geometry.js';

const PIN_RADIUS = INTERIOR_SHELF_PIN_RENDER_POLICY.radiusM;
const PIN_LEN = INTERIOR_SHELF_PIN_RENDER_POLICY.lengthM;
const PIN_EDGE_OFFSET_DEFAULT = INTERIOR_SHELF_PIN_RENDER_POLICY.edgeOffsetDefaultM;
const GLASS_THICK_M = MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM;

function shelfHeightForVariant(variant: ShelfVariant | undefined, shelfThick: number): number {
  if (variant === 'glass') return GLASS_THICK_M;
  if (variant === 'double')
    return Math.max(shelfThick, shelfThick * INTERIOR_SHELF_GEOMETRY_POLICY.doubleThicknessMultiplier);
  return shelfThick;
}

export function createAddCustomGridShelf(args: {
  App: AppContainer;
  roomArchitecturePlan: RoomArchitecturePlan;
  threeSurface: InteriorTHREESurface | null;
  matCache: unknown;
  group: InteriorGroupLike;
  createBoard: (
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: unknown,
    partId: string,
    options?: BuilderCreateBoardOptions | null
  ) => unknown;
  addFoldedClothes: unknown;
  contentsPolicy: unknown;
  currentShelfMat: unknown;
  currentBraceShelfMat?: unknown;
  moduleKey: string;
  getPartMaterial?: (partId: string) => unknown;
  getPartColorValue?: (partId: string) => unknown;
  braceSet: Record<number, true>;
  shelfSet: Record<number, true>;
  shelfVariantByIndex: Record<number, ShelfVariant>;
  braceMetrics: InteriorCustomBraceMetrics;
  effectiveBottomY: number;
  effectiveTopY: number;
  localGridStep: number;
  gridDivisions: number;
  internalCenterX: number;
  innerW: number;
  woodThick: number;
  shelfThick: number;
  internalDepth: number;
  internalZ: number;
  isInternalDrawersEnabled: boolean;
  activeSlots: unknown[];
  shelfExposedSide?: RemovedFrameSideShelfExposure | null;
  roundedShelfSide?: RemovedFrameSideShelfRounding | null;
}) {
  const {
    App,
    roomArchitecturePlan,
    threeSurface,
    matCache,
    group,
    createBoard,
    addFoldedClothes,
    contentsPolicy,
    currentShelfMat,
    currentBraceShelfMat,
    moduleKey,
    getPartMaterial,
    getPartColorValue,
    braceSet,
    shelfSet,
    shelfVariantByIndex,
    braceMetrics,
    effectiveBottomY,
    effectiveTopY,
    localGridStep,
    gridDivisions,
    internalCenterX,
    innerW,
    shelfThick,
    internalDepth,
    internalZ,
    isInternalDrawersEnabled,
    activeSlots,
    shelfExposedSide,
    roundedShelfSide,
  } = args;

  let pinGeo: unknown = null;
  let pinMat: InteriorMaterialLike | null = null;

  function ensurePinResources(): boolean {
    if (!threeSurface) return false;
    if (!pinGeo) pinGeo = new threeSurface.CylinderGeometry(PIN_RADIUS, PIN_RADIUS, PIN_LEN, 12);
    if (!pinMat)
      pinMat = new threeSurface.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.35, metalness: 0.8 });
    return true;
  }

  const addShelfPins = (
    shelfY: number,
    shelfZ: number,
    shelfDepth: number,
    shelfH: number,
    isBrace: boolean,
    shelfPartId: string
  ) => {
    if (isBrace || !threeSurface) return;
    if (!(innerW > 0) || !(shelfDepth > 0)) return;
    if (!ensurePinResources()) return;

    const shelfBottom = shelfY - shelfH / 2;
    const yPin = shelfBottom - PIN_RADIUS + INTERIOR_SHELF_PIN_RENDER_POLICY.bottomYOffsetM;
    const backEdge = shelfZ - shelfDepth / 2;
    const frontEdge = shelfZ + shelfDepth / 2;
    const maxOff = shelfDepth / 2 - INTERIOR_SHELF_PIN_RENDER_POLICY.maxDepthSideClearanceM;
    const edgeOff = Math.max(
      INTERIOR_SHELF_PIN_RENDER_POLICY.minEdgeOffsetM,
      Math.min(PIN_EDGE_OFFSET_DEFAULT, maxOff)
    );
    const zBack = backEdge + edgeOff;
    const zFront = frontEdge - edgeOff;

    const mkPin = (x: number, z: number) => {
      if (
        intersectsActiveRoomColumnCutObstacle(
          roomArchitecturePlan,
          boxFromCenterSize({
            x,
            y: yPin,
            z,
            width: PIN_LEN,
            height: PIN_RADIUS * 2,
            depth: PIN_RADIUS * 2,
          })
        )
      ) {
        return;
      }
      const mesh = new threeSurface.Mesh(pinGeo, pinMat);
      if (mesh.rotation) mesh.rotation.z = Math.PI / 2;
      mesh.position?.set?.(x, yPin, z);
      mesh.userData = mesh.userData || {};
      mesh.userData.partId = shelfPartId;
      markShelfBoardUserData(mesh.userData, { groupPartId: SHELF_GROUP_PART_ID });
      mesh.userData.__kind = 'shelf_pin';
      const material = asMaterial(mesh.material);
      if (material) material.__keepMaterial = true;
      group.add?.(mesh);
    };

    mkPin(braceMetrics.leftInnerX + PIN_LEN / 2, zBack);
    mkPin(braceMetrics.leftInnerX + PIN_LEN / 2, zFront);
    mkPin(braceMetrics.rightInnerX - PIN_LEN / 2, zBack);
    mkPin(braceMetrics.rightInnerX - PIN_LEN / 2, zFront);
  };

  function resolveShelfContentsMaxHeight(gridIndex: number, shelfY: number, shelfH: number): number {
    const shelfTopY = shelfY + shelfH / 2;
    let topLimitY = effectiveTopY;
    const maxGrid = Math.max(0, Math.floor(gridDivisions));

    for (let nextIndex = gridIndex + 1; nextIndex < maxGrid; nextIndex += 1) {
      if (shelfSet[nextIndex]) {
        const nextShelfH = shelfHeightForVariant(shelfVariantByIndex[nextIndex], shelfThick);
        topLimitY = effectiveBottomY + nextIndex * localGridStep - nextShelfH / 2;
        break;
      }
    }

    return Math.max(
      0,
      topLimitY - shelfTopY - INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM
    );
  }

  let glassMat: InteriorMaterialLike | null = null;
  try {
    const cache = isRecord(matCache) ? matCache : null;
    if (threeSurface && cache) {
      if (!cache.__customGlassShelfMat) {
        const customGlassShelfMat = new threeSurface.MeshStandardMaterial({
          color: 0xf2fbff,
          transparent: true,
          opacity: 0.25,
          roughness: 0.15,
          metalness: 0.0,
        });
        const glassMaterial = asMaterial(customGlassShelfMat);
        if (glassMaterial) {
          glassMaterial.depthWrite = false;
          glassMaterial.side = threeSurface.DoubleSide;
          glassMaterial.premultipliedAlpha = true;
        }
        cache.__customGlassShelfMat = customGlassShelfMat;
      }
      glassMat = asMaterial(cache.__customGlassShelfMat);
    }
  } catch {
    glassMat = null;
  }

  return function addGridShelf(gridIndex: number, variant: ShelfVariant | undefined): void {
    const shelfY = effectiveBottomY + gridIndex * localGridStep;
    const shelfVariant = typeof variant === 'string' ? variant : 'regular';
    const isBrace = !!braceSet[gridIndex] || shelfVariant === 'brace';
    const isGlass = shelfVariant === 'glass';
    const shelfH = shelfHeightForVariant(shelfVariant, shelfThick);
    const shelfDepth = isBrace ? internalDepth : braceMetrics.regularDepth;
    const shelfZ = isBrace ? internalZ : braceMetrics.regularZ;
    const shelfW = isBrace ? braceMetrics.braceShelfWidth : braceMetrics.regularShelfWidth;
    const shelfX = isBrace ? braceMetrics.braceCenterX : internalCenterX;
    const shelfPartId = createModuleShelfPartId(moduleKey, gridIndex);
    const material =
      isGlass && glassMat
        ? glassMat
        : resolveShelfPartMaterial({
            partId: shelfPartId,
            currentShelfMat: isBrace ? currentBraceShelfMat || currentShelfMat : currentShelfMat,
            getPartColorValue,
            getPartMaterial,
          });

    const shelfOptions: BuilderCreateBoardOptions | null =
      isBrace && shelfExposedSide
        ? {
            shelfExposedSide,
            ...(roundedShelfSide ? { shape: 'rounded_shelf' as const, roundedShelfSide } : {}),
          }
        : null;
    const mesh = asMesh(
      createBoard(shelfW, shelfH, shelfDepth, shelfX, shelfY, shelfZ, material, shelfPartId, shelfOptions)
    );

    if (mesh && typeof mesh === 'object') {
      mesh.userData = mesh.userData || {};
      markShelfBoardUserData(mesh.userData, {
        groupPartId: SHELF_GROUP_PART_ID,
        shelfIndex: gridIndex,
        variant: shelfVariant,
        isBrace,
        exposedSide: shelfOptions?.shelfExposedSide,
        roundedSide: shelfOptions?.roundedShelfSide,
      });
    }

    addShelfPins(shelfY, shelfZ, shelfDepth, shelfH, isBrace, shelfPartId);

    if (isGlass && mesh && typeof mesh === 'object') {
      mesh.userData = mesh.userData || {};
      if (mesh.userData) mesh.userData.__keepMaterial = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 2;
    }

    const hasDrawerAbove = isInternalDrawersEnabled && activeSlots.indexOf(gridIndex + 1) !== -1;
    const hasDrawerHere = isInternalDrawersEnabled && activeSlots.indexOf(gridIndex) !== -1;
    if (!hasDrawerAbove && !hasDrawerHere && __isFn(addFoldedClothes)) {
      addFoldedClothes(
        internalCenterX,
        shelfY + shelfH / 2,
        shelfZ,
        innerW - INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM,
        group,
        resolveShelfContentsMaxHeight(gridIndex, shelfY, shelfH),
        shelfDepth,
        contentsPolicy
      );
    }
  };
}

export function addCustomBaseShelfContents(args: {
  group: InteriorGroupLike;
  addFoldedClothes: unknown;
  contentsPolicy: unknown;
  braceSet: Record<number, true>;
  shelfSet: Record<number, true>;
  shelfVariantByIndex: Record<number, ShelfVariant>;
  braceMetrics: InteriorCustomBraceMetrics;
  effectiveBottomY: number;
  localGridStep: number;
  internalCenterX: number;
  innerW: number;
  woodThick: number;
  shelfThick: number;
  internalDepth: number;
  internalZ: number;
  isInternalDrawersEnabled: boolean;
  activeSlots: unknown[];
}): void {
  const {
    group,
    addFoldedClothes,
    contentsPolicy,
    braceSet,
    shelfSet,
    shelfVariantByIndex,
    braceMetrics,
    effectiveBottomY,
    localGridStep,
    internalCenterX,
    innerW,
    shelfThick,
    internalDepth,
    internalZ,
    isInternalDrawersEnabled,
    activeSlots,
  } = args;

  if (!shelfSet[1] || !__isFn(addFoldedClothes)) return;
  const hasDrawerInBottomSpace = isInternalDrawersEnabled && activeSlots.indexOf(1) !== -1;
  if (hasDrawerInBottomSpace) return;

  const firstShelfVariant = shelfVariantByIndex[1] || 'regular';
  const firstShelfH = shelfHeightForVariant(firstShelfVariant, shelfThick);
  const maxHeight = Math.max(
    0,
    effectiveBottomY +
      localGridStep -
      firstShelfH / 2 -
      effectiveBottomY -
      INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM
  );
  if (!(maxHeight > 0)) return;

  const isBrace = !!braceSet[1] || firstShelfVariant === 'brace';
  const shelfDepth = isBrace ? internalDepth : braceMetrics.regularDepth;
  const shelfZ = isBrace ? internalZ : braceMetrics.regularZ;

  addFoldedClothes(
    internalCenterX,
    effectiveBottomY,
    shelfZ,
    innerW - INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM,
    group,
    maxHeight,
    shelfDepth,
    contentsPolicy
  );
}
