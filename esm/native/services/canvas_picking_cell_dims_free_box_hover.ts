import type { UnknownRecord } from '../../../types';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import {
  SKETCH_BOX_FREE_VERTICAL_POLICY,
  SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY,
} from '../../shared/dimensions/sketch_box_free_placement_policy.js';
import { __wp_toModuleKey } from './canvas_picking_core_support_numbers.js';
import { hasCellDimsFreeBoxNewDimensionValueChange } from './canvas_picking_cell_dims_free_box_dimension_draft.js';
import {
  readCellDimsFreeBoxIdFromPartId,
  readCellDimsFreeBoxModuleKeyFromPartId,
} from './canvas_picking_cell_dims_free_box_identity.js';
import type { MouseVectorLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';
import type {
  InteriorHoverTarget,
  ModuleKey,
  SelectorLocalBox,
} from './canvas_picking_hover_preview_modes_shared.js';
import { resolveSketchFreeBoxGeometry } from './canvas_picking_sketch_free_boxes.js';
import {
  hasCellDimsFreeBoxHexDraftChange,
  isCellDimsFreeBoxState,
  type CellDimsFreeBoxStackKey,
  type CellDimsFreeBoxState,
} from './canvas_picking_cell_dims_free_box_state.js';

const EPS_CM = 1e-6;
const EPS_M = 1e-6;

type CellDimsFreeBoxViewportRoots = {
  camera: unknown;
  wardrobeGroup: unknown;
};

type CellDimsFreeBoxWardrobeBox = {
  width?: unknown;
  depth?: unknown;
  centerZ?: unknown;
};

export type CellDimsFreeBoxPostClickIdentity = {
  moduleKey: ModuleKey;
  stackKey: CellDimsFreeBoxStackKey;
  freeBoxId: string;
};

export type CellDimsFreeBoxHoverCapabilities = {
  readFreeBoxState: (
    moduleKey: ModuleKey,
    stackKey: CellDimsFreeBoxStackKey,
    boxId: string
  ) => CellDimsFreeBoxState | null;
  readViewportRoots: () => CellDimsFreeBoxViewportRoots;
  measureWardrobeLocalBox: () => CellDimsFreeBoxWardrobeBox | null;
  resolvePostClickIdentity: (ndcX: number, ndcY: number) => CellDimsFreeBoxPostClickIdentity | null;
  raycast: (args: {
    raycaster: RaycasterLike;
    mouse: MouseVectorLike;
    camera: unknown;
    ndcX: number;
    ndcY: number;
    objects: unknown;
    recursive?: boolean;
  }) => RaycastHitLike[];
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

export type CellDimsFreeBoxHitCandidate = {
  boxId: string;
  moduleKey: ModuleKey;
  stackKey: CellDimsFreeBoxStackKey;
  anchor: unknown;
};

export type CellDimsFreeBoxHoverBuildResult = {
  target: InteriorHoverTarget;
  selectorBox: SelectorLocalBox;
  anchorParent: unknown;
};

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

type SelectorBoxMetrics = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

function readCanonicalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readSelectorBoxMetrics(selectorBox: SelectorLocalBox): SelectorBoxMetrics | null {
  const centerX = readCanonicalNumber(selectorBox.centerX);
  const centerY = readCanonicalNumber(selectorBox.centerY);
  const centerZ = readCanonicalNumber(selectorBox.centerZ);
  const width = readCanonicalNumber(selectorBox.width);
  const height = readCanonicalNumber(selectorBox.height);
  const depth = readCanonicalNumber(selectorBox.depth);
  if (
    centerX == null ||
    centerY == null ||
    centerZ == null ||
    width == null ||
    height == null ||
    depth == null ||
    !(width > 0) ||
    !(height > 0) ||
    !(depth > 0)
  ) {
    return null;
  }
  return { centerX, centerY, centerZ, width, height, depth };
}

function readUserData(value: unknown): UnknownRecord | null {
  return asRecord(asRecord(value)?.userData) as UnknownRecord | null;
}

function readParent(value: unknown): unknown {
  return asRecord(value)?.parent ?? null;
}

function isRenderableHitObject(value: unknown): boolean {
  const obj = asRecord(value);
  if (!obj) return false;
  if (obj.type === 'LineSegments' || obj.type === 'Line' || obj.type === 'Sprite') return false;
  const mat = asRecord(obj.material);
  if (mat && mat.visible === false) return false;
  if (mat && mat.opacity === 0) return false;
  return true;
}

function readStackKey(userData: UnknownRecord | null): CellDimsFreeBoxStackKey {
  const raw = userData?.__wpStack ?? userData?.stackKey ?? userData?.stack;
  return raw === 'bottom' ? 'bottom' : 'top';
}

function readCandidateFromObject(obj: unknown): CellDimsFreeBoxHitCandidate | null {
  let cur: unknown = obj;
  for (let depth = 0; cur && depth < 8; depth += 1) {
    const ud = readUserData(cur);
    const partId = readString(ud?.partId);
    const explicitBoxId = readString(ud?.__wpSketchBoxId);
    const isFree =
      ud?.__wpSketchFreePlacement === true || (partId ? partId.startsWith('sketch_box_free_') : false);
    if (isFree) {
      const moduleKey =
        __wp_toModuleKey((ud?.__wpSketchModuleKey ?? ud?.moduleIndex) as never) ??
        (partId ? readCellDimsFreeBoxModuleKeyFromPartId(partId) : null);
      const boxId = explicitBoxId || (partId ? readCellDimsFreeBoxIdFromPartId(partId, moduleKey) : null);
      if (boxId && moduleKey != null) {
        return { boxId, moduleKey, stackKey: readStackKey(ud), anchor: cur };
      }
    }
    cur = readParent(cur);
  }
  return null;
}

export function readCellDimsFreeBoxHitCandidate(
  intersects: readonly unknown[]
): CellDimsFreeBoxHitCandidate | null {
  for (let i = 0; i < intersects.length; i += 1) {
    const hit = asRecord(intersects[i]);
    const obj = hit?.object ?? null;
    if (!isRenderableHitObject(obj)) continue;
    const candidate = readCandidateFromObject(obj);
    if (candidate) return candidate;
  }
  return null;
}

function resolveFreeBoxSelectorBox(args: {
  capabilities: CellDimsFreeBoxHoverCapabilities;
  state: CellDimsFreeBoxState;
}): SelectorLocalBox | null {
  const { capabilities, state } = args;
  const wardrobeBox = capabilities.measureWardrobeLocalBox();
  if (!wardrobeBox) return null;
  const centerX = state.centerX;
  const centerY = state.centerY;
  const heightM = state.heightM;

  const wardrobeWidth = readCanonicalNumber(wardrobeBox.width);
  const wardrobeDepth = readCanonicalNumber(wardrobeBox.depth);
  const wardrobeCenterZ = readCanonicalNumber(wardrobeBox.centerZ);
  if (wardrobeWidth == null || wardrobeDepth == null || wardrobeCenterZ == null) return null;
  const wardrobeBackZ = wardrobeCenterZ - wardrobeDepth / 2;
  const geo = resolveSketchFreeBoxGeometry({
    wardrobeWidth,
    wardrobeDepth,
    backZ: wardrobeBackZ,
    centerX,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    widthM: state.widthM,
    depthM: state.depthM,
  });
  return {
    centerX: geo.centerX,
    centerY,
    centerZ: geo.centerZ,
    width: geo.outerW,
    height: heightM,
    depth: geo.outerD,
  };
}

function buildFreeBoxHoverTarget(args: {
  capabilities: CellDimsFreeBoxHoverCapabilities;
  candidate: CellDimsFreeBoxHitCandidate;
  intersects: RaycastHitLike[];
  anchorParent: unknown;
}): CellDimsFreeBoxHoverBuildResult | null {
  const { capabilities, candidate, intersects, anchorParent } = args;
  const state = capabilities.readFreeBoxState(candidate.moduleKey, candidate.stackKey, candidate.boxId);
  if (!state) return null;
  const selectorBox = resolveFreeBoxSelectorBox({ capabilities, state });
  if (!selectorBox) return null;
  const metrics = readSelectorBoxMetrics(selectorBox);
  if (!metrics) return null;
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const currentBackZ = metrics.centerZ - metrics.depth / 2;
  const target: InteriorHoverTarget = {
    intersects,
    hitModuleKey: candidate.moduleKey,
    hitSelectorObj: (candidate.anchor as never) || null,
    isBottom: candidate.stackKey === 'bottom',
    hitY: metrics.centerY,
    info: {
      __wpCellDimsFreeBox: true,
      __wpCellDimsFreeBoxId: candidate.boxId,
      __wpCellDimsFreeBoxState: state,
      __wpCellDimsFreeBoxSelectorBox: selectorBox,
    },
    bottomY: metrics.centerY - metrics.height / 2,
    topY: metrics.centerY + metrics.height / 2,
    spanH: metrics.height,
    woodThick,
    innerW: Math.max(0.03, metrics.width - woodThick * 2),
    internalCenterX: metrics.centerX,
    internalDepth: Math.max(0.03, metrics.depth - woodThick),
    internalZ: metrics.centerZ,
    backZ: currentBackZ,
    regularDepth: metrics.depth,
  };
  return { target, selectorBox, anchorParent };
}

function findAnchorForFreeBox(root: unknown, boxId: string, moduleKey: ModuleKey): unknown {
  let found: unknown = null;
  const visit = (node: unknown) => {
    if (found) return;
    const ud = readUserData(node);
    const partId = readString(ud?.partId);
    const nodeBoxId = readString(ud?.__wpSketchBoxId);
    const nodeModuleKey = __wp_toModuleKey((ud?.__wpSketchModuleKey ?? ud?.moduleIndex) as never);
    if (
      (nodeBoxId === boxId || (partId && readCellDimsFreeBoxIdFromPartId(partId, moduleKey) === boxId)) &&
      (nodeModuleKey == null || nodeModuleKey === moduleKey)
    ) {
      found = node;
      return;
    }
    const children = asRecord(node)?.children;
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i += 1) visit(children[i]);
    }
  };
  try {
    const traverser = asRecord(root)?.traverse;
    if (typeof traverser === 'function') {
      Reflect.apply(traverser, root, [visit]);
    } else {
      visit(root);
    }
  } catch {
    // ignore stale scene graphs
  }
  return found;
}

export function resolveCellDimsFreeBoxHoverTarget(args: {
  capabilities: CellDimsFreeBoxHoverCapabilities;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): CellDimsFreeBoxHoverBuildResult | null {
  const { capabilities, ndcX, ndcY, raycaster, mouse } = args;
  try {
    const roots = capabilities.readViewportRoots();
    const camera = roots.camera;
    const wardrobeGroup = roots.wardrobeGroup;
    if (!wardrobeGroup) return null;

    const pending = capabilities.resolvePostClickIdentity(ndcX, ndcY);
    if (pending) {
      return buildFreeBoxHoverTarget({
        capabilities,
        candidate: {
          boxId: pending.freeBoxId,
          moduleKey: pending.moduleKey,
          stackKey: pending.stackKey,
          anchor: findAnchorForFreeBox(wardrobeGroup, pending.freeBoxId, pending.moduleKey),
        },
        intersects: [],
        anchorParent: wardrobeGroup,
      });
    }

    if (!camera) return null;
    const intersects = capabilities.raycast({
      raycaster,
      mouse,
      camera,
      ndcX,
      ndcY,
      objects: [wardrobeGroup],
      recursive: true,
    });
    const candidate = readCellDimsFreeBoxHitCandidate(intersects);
    return candidate
      ? buildFreeBoxHoverTarget({ capabilities, candidate, intersects, anchorParent: wardrobeGroup })
      : null;
  } catch {
    return null;
  }
}

function readFreeBoxState(target: InteriorHoverTarget): CellDimsFreeBoxState | null {
  const state = target.info.__wpCellDimsFreeBoxState;
  return isCellDimsFreeBoxState(state) ? state : null;
}

function readDimensionState(
  target: InteriorHoverTarget,
  dimension: 'width' | 'height' | 'depth'
): CellDimsFreeBoxState['width'] | null {
  return readFreeBoxState(target)?.[dimension] ?? null;
}

function resolveTargetDimensionCm(args: {
  target: InteriorHoverTarget;
  currentCm: number;
  applyCm: number | null | undefined;
  dimension: 'width' | 'height' | 'depth';
  allowToggleBack: boolean;
}): number {
  const { target, currentCm, applyCm, dimension, allowToggleBack } = args;
  if (applyCm == null || !Number.isFinite(applyCm) || !(applyCm > 0)) return currentCm;
  const snapshot = readDimensionState(target, dimension);
  if (allowToggleBack && snapshot?.activeCm != null && Math.abs(applyCm - snapshot.activeCm) <= EPS_CM) {
    return snapshot.baseCm != null && snapshot.baseCm > 0 ? snapshot.baseCm : currentCm;
  }
  return applyCm;
}

function resolveFreeBoxWorkspacePad(boxHeightM: number): number {
  return Math.min(
    SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadMaxM,
    Math.max(
      SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadMinM,
      boxHeightM * SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadHeightRatio
    )
  );
}

function resolveTargetCenterY(current: SelectorBoxMetrics, targetHeightM: number): number {
  const { centerY, height: currentHeightM } = current;
  const roomFloorY = SKETCH_BOX_FREE_VERTICAL_POLICY.roomFloorY;
  const oldPad = resolveFreeBoxWorkspacePad(currentHeightM);
  const newPad = resolveFreeBoxWorkspacePad(targetHeightM);
  const oldBottomY = centerY - currentHeightM / 2;
  const newBottomY = centerY - targetHeightM / 2;
  const wasFloorAligned = oldBottomY <= roomFloorY + oldPad + EPS_M;
  if (!wasFloorAligned && newBottomY >= roomFloorY + newPad - EPS_M) return centerY;
  return roomFloorY + newPad + targetHeightM / 2;
}

export function resolveCellDimsFreeBoxPreviewTargetBox(
  target: InteriorHoverTarget,
  selectorBox: SelectorLocalBox,
  applyW: number | null | undefined,
  applyH: number | null | undefined,
  applyD: number | null | undefined,
  minWidthM: number,
  minHeightM: number,
  minDepthM: number
): SelectorLocalBox | null {
  if (target.info.__wpCellDimsFreeBox !== true) return null;
  const current = readSelectorBoxMetrics(selectorBox);
  if (!current) return null;
  const currentWcm = Math.max(0, current.width * 100);
  const currentHcm = Math.max(0, current.height * 100);
  const currentDcm = Math.max(0, current.depth * 100);
  const allowDimensionToggleBack = !hasCellDimsFreeBoxNewDimensionValueChange(
    [
      { currentCm: currentWcm, targetCm: applyW },
      { currentCm: currentHcm, targetCm: applyH },
      { currentCm: currentDcm, targetCm: applyD },
    ],
    EPS_CM
  );
  const targetWm = Math.max(
    minWidthM,
    resolveTargetDimensionCm({
      target,
      currentCm: currentWcm,
      applyCm: applyW,
      dimension: 'width',
      allowToggleBack: allowDimensionToggleBack,
    }) / 100
  );
  const targetHm = Math.max(
    minHeightM,
    resolveTargetDimensionCm({
      target,
      currentCm: currentHcm,
      applyCm: applyH,
      dimension: 'height',
      allowToggleBack: allowDimensionToggleBack,
    }) / 100
  );
  const targetDm = Math.max(
    minDepthM,
    resolveTargetDimensionCm({
      target,
      currentCm: currentDcm,
      applyCm: applyD,
      dimension: 'depth',
      allowToggleBack: allowDimensionToggleBack,
    }) / 100
  );
  const currentBackZ = current.centerZ - current.depth / 2;
  return {
    centerX: current.centerX,
    centerY: resolveTargetCenterY(current, targetHm),
    centerZ: currentBackZ + targetDm / 2,
    width: targetWm,
    height: targetHm,
    depth: targetDm,
  };
}

function hasFreeBoxDimChange(args: {
  target: InteriorHoverTarget;
  selectorBox: SelectorLocalBox;
  applyW?: number | null;
  applyH?: number | null;
  applyD?: number | null;
  previewTargetBox: SelectorLocalBox;
}): boolean {
  const { selectorBox, previewTargetBox: next } = args;
  const current = readSelectorBoxMetrics(selectorBox);
  if (!current) return false;
  return (
    Math.abs(next.width - current.width) > EPS_M ||
    Math.abs(next.height - current.height) > EPS_M ||
    Math.abs(next.depth - current.depth) > EPS_M
  );
}

type FreeBoxDimIntent = 'add' | 'remove' | null;

function resolveFreeBoxDimIntent(args: {
  target: InteriorHoverTarget;
  currentCm: number;
  applyCm: number | null | undefined;
  dimension: 'width' | 'height' | 'depth';
}): FreeBoxDimIntent {
  const { target, currentCm, applyCm, dimension } = args;
  if (applyCm == null || !Number.isFinite(applyCm) || !(applyCm > 0)) return null;
  const snapshot = readDimensionState(target, dimension);
  if (snapshot?.activeCm != null && Math.abs(applyCm - snapshot.activeCm) <= EPS_CM) return 'remove';
  return Math.abs(currentCm - applyCm) > EPS_CM ? 'add' : null;
}

function resolveFreeBoxDimsIntent(args: {
  target: InteriorHoverTarget;
  selectorBox: SelectorLocalBox;
  applyW?: number | null;
  applyH?: number | null;
  applyD?: number | null;
}): FreeBoxDimIntent {
  const current = readSelectorBoxMetrics(args.selectorBox);
  if (!current) return null;
  const intents = [
    resolveFreeBoxDimIntent({
      target: args.target,
      currentCm: Math.max(0, current.width * 100),
      applyCm: args.applyW,
      dimension: 'width',
    }),
    resolveFreeBoxDimIntent({
      target: args.target,
      currentCm: Math.max(0, current.height * 100),
      applyCm: args.applyH,
      dimension: 'height',
    }),
    resolveFreeBoxDimIntent({
      target: args.target,
      currentCm: Math.max(0, current.depth * 100),
      applyCm: args.applyD,
      dimension: 'depth',
    }),
  ];
  if (intents.includes('add')) return 'add';
  if (intents.includes('remove')) return 'remove';
  return null;
}

export function resolveCellDimsFreeBoxHoverOp(args: {
  target: InteriorHoverTarget;
  selectorBox: SelectorLocalBox;
  applyW?: number | null;
  applyH?: number | null;
  applyD?: number | null;
  hexCellMode?: boolean | null;
  hexCellProtrusionCm?: number | null;
  hexCellDoorWidthCm?: number | null;
  previewTargetBox: SelectorLocalBox;
}): 'add' | 'remove' | null {
  const state = readFreeBoxState(args.target);
  if (!state) return null;
  const current = readSelectorBoxMetrics(args.selectorBox);
  if (!current) return null;
  const dimChange = hasFreeBoxDimChange(args);
  const dimIntent = resolveFreeBoxDimsIntent(args);
  if (args.hexCellMode) {
    if (!state.hexCell.enabled) return 'add';
    const moduleWidthCm =
      args.applyW != null && Number.isFinite(args.applyW) ? args.applyW : current.width * 100;
    const hexChange = hasCellDimsFreeBoxHexDraftChange({
      state,
      ...(args.hexCellProtrusionCm !== undefined ? { protrusionCm: args.hexCellProtrusionCm } : {}),
      ...(args.hexCellDoorWidthCm !== undefined ? { doorWidthCm: args.hexCellDoorWidthCm } : {}),
      moduleWidthCm,
      toleranceCm: EPS_CM,
    });
    if (dimIntent === 'remove' && !hexChange) return 'remove';
    return dimChange || hexChange ? 'add' : 'remove';
  }
  if (dimIntent) return dimIntent;
  if (dimChange) return 'add';
  return 'add';
}

export function isCellDimsFreeBoxTarget(target: InteriorHoverTarget | null | undefined): boolean {
  return target?.info.__wpCellDimsFreeBox === true;
}
