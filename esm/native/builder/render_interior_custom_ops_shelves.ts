import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
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

const BRACE_SIDE_GAP = INTERIOR_FITTINGS_DIMENSIONS.shelves.braceSideGapM;
const BRACE_SEAM_PAD = INTERIOR_FITTINGS_DIMENSIONS.shelves.braceSeamPadM;
const BRACE_SEAM_W = Math.max(0, BRACE_SIDE_GAP - 2 * BRACE_SEAM_PAD);
const PIN_RADIUS = INTERIOR_FITTINGS_DIMENSIONS.pins.radiusM;
const PIN_LEN = INTERIOR_FITTINGS_DIMENSIONS.pins.lengthM;
const PIN_EDGE_OFFSET_DEFAULT = INTERIOR_FITTINGS_DIMENSIONS.pins.edgeOffsetDefaultM;
const GLASS_THICK_M = MATERIAL_DIMENSIONS.glassShelf.thicknessM;

function shelfHeightForVariant(variant: ShelfVariant | undefined, woodThick: number): number {
  if (variant === 'glass') return GLASS_THICK_M;
  if (variant === 'double')
    return Math.max(woodThick, woodThick * INTERIOR_FITTINGS_DIMENSIONS.shelves.doubleThicknessMultiplier);
  return woodThick;
}

export function createAddCustomGridShelf(args: {
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
    partId: string
  ) => unknown;
  addFoldedClothes: unknown;
  currentShelfMat: unknown;
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
  internalDepth: number;
  internalZ: number;
  isInternalDrawersEnabled: boolean;
  activeSlots: unknown[];
}) {
  const {
    threeSurface,
    matCache,
    group,
    createBoard,
    addFoldedClothes,
    currentShelfMat,
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
    woodThick,
    internalDepth,
    internalZ,
    isInternalDrawersEnabled,
    activeSlots,
  } = args;

  let braceSeamMat: InteriorMaterialLike | null = null;
  const braceSeamGeoCache: Record<string, unknown> = Object.create(null);
  let pinGeo: unknown = null;
  let pinMat: InteriorMaterialLike | null = null;

  const ensureBraceSeamResources = (depth: number) => {
    if (!threeSurface) return null;
    if (!(BRACE_SEAM_W > 0) || !(depth > 0)) return null;
    if (!braceSeamMat) {
      braceSeamMat = new threeSurface.MeshBasicMaterial({ color: 0x111111 });
      braceSeamMat.__keepMaterial = true;
    }
    const key = String(Math.round(depth * 1000));
    if (!braceSeamGeoCache[key]) {
      braceSeamGeoCache[key] = new threeSurface.BoxGeometry(
        BRACE_SEAM_W,
        woodThick,
        Math.max(
          INTERIOR_FITTINGS_DIMENSIONS.shelves.braceSeamDepthMinM,
          depth - INTERIOR_FITTINGS_DIMENSIONS.shelves.braceSeamDepthInsetM
        )
      );
    }
    return { geo: braceSeamGeoCache[key], mat: braceSeamMat };
  };

  const addBraceDarkSeams = (shelfY: number, shelfZ: number, shelfDepth: number, isBrace: boolean) => {
    if (!isBrace || !threeSurface) return;
    const resources = ensureBraceSeamResources(shelfDepth);
    if (!resources) return;
    const leftFaceX = braceMetrics.leftInnerX;
    const rightFaceX = braceMetrics.rightInnerX;
    if (!Number.isFinite(leftFaceX) || !Number.isFinite(rightFaceX) || !(rightFaceX > leftFaceX)) return;
    const mk = (x: number) => {
      const mesh = new threeSurface.Mesh(resources.geo, resources.mat);
      mesh.position?.set?.(x, shelfY, shelfZ);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.userData = mesh.userData || {};
      mesh.userData.partId = 'all_shelves';
      mesh.userData.__kind = 'brace_seam';
      group.add?.(mesh);
    };
    mk(leftFaceX + BRACE_SEAM_PAD + BRACE_SEAM_W / 2);
    mk(rightFaceX - BRACE_SEAM_PAD - BRACE_SEAM_W / 2);
  };

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
    isBrace: boolean
  ) => {
    if (isBrace || !threeSurface) return;
    if (!(innerW > 0) || !(shelfDepth > 0)) return;
    if (!ensurePinResources()) return;

    const shelfBottom = shelfY - shelfH / 2;
    const yPin = shelfBottom - PIN_RADIUS + INTERIOR_FITTINGS_DIMENSIONS.pins.bottomYOffsetM;
    const backEdge = shelfZ - shelfDepth / 2;
    const frontEdge = shelfZ + shelfDepth / 2;
    const maxOff = shelfDepth / 2 - INTERIOR_FITTINGS_DIMENSIONS.pins.maxDepthSideClearanceM;
    const edgeOff = Math.max(
      INTERIOR_FITTINGS_DIMENSIONS.pins.minEdgeOffsetM,
      Math.min(PIN_EDGE_OFFSET_DEFAULT, maxOff)
    );
    const zBack = backEdge + edgeOff;
    const zFront = frontEdge - edgeOff;

    const mkPin = (x: number, z: number) => {
      const mesh = new threeSurface.Mesh(pinGeo, pinMat);
      if (mesh.rotation) mesh.rotation.z = Math.PI / 2;
      mesh.position?.set?.(x, yPin, z);
      mesh.userData = mesh.userData || {};
      mesh.userData.partId = 'all_shelves';
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
    const maxGrid = Math.max(0, Math.floor(Number(gridDivisions) || 0));

    for (let nextIndex = gridIndex + 1; nextIndex < maxGrid; nextIndex += 1) {
      if (shelfSet[nextIndex]) {
        const nextShelfH = shelfHeightForVariant(shelfVariantByIndex[nextIndex], woodThick);
        topLimitY = effectiveBottomY + nextIndex * localGridStep - nextShelfH / 2;
        break;
      }
    }

    return Math.max(0, topLimitY - shelfTopY - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM);
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
    const shelfH = shelfHeightForVariant(shelfVariant, woodThick);
    const shelfDepth = isBrace ? internalDepth : braceMetrics.regularDepth;
    const shelfZ = isBrace ? internalZ : braceMetrics.regularZ;
    const shelfW = isBrace ? braceMetrics.braceShelfWidth : braceMetrics.regularShelfWidth;
    const shelfX = isBrace ? braceMetrics.braceCenterX : internalCenterX;
    const material = isGlass && glassMat ? glassMat : currentShelfMat;

    const mesh = asMesh(
      createBoard(shelfW, shelfH, shelfDepth, shelfX, shelfY, shelfZ, material, 'all_shelves')
    );

    addBraceDarkSeams(shelfY, shelfZ, shelfDepth, isBrace);
    addShelfPins(shelfY, shelfZ, shelfDepth, shelfH, isBrace);

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
        innerW - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsWidthClearanceM,
        group,
        resolveShelfContentsMaxHeight(gridIndex, shelfY, shelfH),
        shelfDepth
      );
    }
  };
}

export function addCustomBaseShelfContents(args: {
  group: InteriorGroupLike;
  addFoldedClothes: unknown;
  braceSet: Record<number, true>;
  shelfSet: Record<number, true>;
  shelfVariantByIndex: Record<number, ShelfVariant>;
  braceMetrics: InteriorCustomBraceMetrics;
  effectiveBottomY: number;
  localGridStep: number;
  internalCenterX: number;
  innerW: number;
  woodThick: number;
  internalDepth: number;
  internalZ: number;
  isInternalDrawersEnabled: boolean;
  activeSlots: unknown[];
}): void {
  const {
    group,
    addFoldedClothes,
    braceSet,
    shelfSet,
    shelfVariantByIndex,
    braceMetrics,
    effectiveBottomY,
    localGridStep,
    internalCenterX,
    innerW,
    woodThick,
    internalDepth,
    internalZ,
    isInternalDrawersEnabled,
    activeSlots,
  } = args;

  if (!shelfSet[1] || !__isFn(addFoldedClothes)) return;
  const hasDrawerInBottomSpace = isInternalDrawersEnabled && activeSlots.indexOf(1) !== -1;
  if (hasDrawerInBottomSpace) return;

  const firstShelfVariant = shelfVariantByIndex[1] || 'regular';
  const firstShelfH = shelfHeightForVariant(firstShelfVariant, woodThick);
  const maxHeight = Math.max(
    0,
    effectiveBottomY +
      localGridStep -
      firstShelfH / 2 -
      effectiveBottomY -
      INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM
  );
  if (!(maxHeight > 0)) return;

  const isBrace = !!braceSet[1] || firstShelfVariant === 'brace';
  const shelfDepth = isBrace ? internalDepth : braceMetrics.regularDepth;
  const shelfZ = isBrace ? internalZ : braceMetrics.regularZ;

  addFoldedClothes(
    internalCenterX,
    effectiveBottomY,
    shelfZ,
    innerW - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsWidthClearanceM,
    group,
    maxHeight,
    shelfDepth
  );
}
