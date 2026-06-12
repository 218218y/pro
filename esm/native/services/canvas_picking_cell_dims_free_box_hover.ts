import type { AppContainer, UnknownRecord } from '../../../types';
import { MATERIAL_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getCfg } from '../kernel/api.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { getActiveOverrideCm } from '../features/special_dims/index.js';
import { hasHexCellDraftConfigChange, moduleHasHexCell } from '../features/hex_cell/index.js';
import { asRecord } from '../runtime/record.js';
import { __wp_raycastReuse, __wp_toModuleKey } from './canvas_picking_core_helpers.js';
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
import { __wp_getViewportRoots, __wp_measureWardrobeLocalBox } from './canvas_picking_projection_runtime.js';
import { resolveSketchFreeBoxGeometry } from './canvas_picking_sketch_free_boxes.js';
import { resolveCellDimsPostClickFreeBoxHoverIdentity } from './canvas_picking_cell_dims_post_click_hover.js';

const EPS_CM = 1e-6;
const EPS_M = 1e-6;

type StackKey = 'top' | 'bottom';

export type CellDimsFreeBoxHitCandidate = {
  boxId: string;
  moduleKey: ModuleKey;
  stackKey: StackKey;
  anchor: unknown;
};

export type CellDimsFreeBoxHoverBuildResult = {
  target: InteriorHoverTarget;
  selectorBox: SelectorLocalBox;
};

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function readPositiveM(record: UnknownRecord | null, key: string): number | null {
  const n = readFiniteNumber(record ? record[key] : null);
  return n != null && n > 0 ? n : null;
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

function readStackKey(userData: UnknownRecord | null): StackKey {
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

function readModuleConfig(App: AppContainer, moduleKey: ModuleKey, stackKey: StackKey): UnknownRecord | null {
  if (typeof moduleKey !== 'number') return null;
  try {
    const cfg = asRecord(getCfg(App));
    const bucket = stackKey === 'bottom' ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
    const list = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
    return asRecord(list[Math.max(0, Math.floor(moduleKey))]) as UnknownRecord | null;
  } catch {
    return null;
  }
}

function readFreeBoxesFromModule(cfgMod: UnknownRecord | null): UnknownRecord[] {
  const boxes = asRecord(cfgMod?.sketchExtras)?.boxes;
  return Array.isArray(boxes)
    ? boxes
        .map(item => asRecord(item))
        .filter((item): item is UnknownRecord => !!item && item.freePlacement === true)
    : [];
}

function findFreeBoxById(boxes: UnknownRecord[], boxId: string): UnknownRecord | null {
  for (let i = 0; i < boxes.length; i += 1) {
    const rec = boxes[i];
    const id = rec.id != null ? String(rec.id) : String(i);
    if (id === boxId) return rec;
  }
  return null;
}

function resolveFreeBoxSelectorBox(args: { App: AppContainer; box: UnknownRecord }): SelectorLocalBox | null {
  const { App, box } = args;
  const wardrobeBox = __wp_measureWardrobeLocalBox(App);
  if (!wardrobeBox) return null;
  const centerX = readFiniteNumber(box.absX);
  const centerY = readFiniteNumber(box.absY);
  const heightM = readPositiveM(box, 'heightM') ?? readPositiveM(box, 'hM');
  if (centerX == null || centerY == null || heightM == null) return null;

  const wardrobeBackZ = Number(wardrobeBox.centerZ) - Number(wardrobeBox.depth) / 2;
  if (!Number.isFinite(wardrobeBackZ)) return null;
  const geo = resolveSketchFreeBoxGeometry({
    wardrobeWidth: Number(wardrobeBox.width) || 0,
    wardrobeDepth: Number(wardrobeBox.depth) || 0,
    backZ: wardrobeBackZ,
    centerX,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    widthM: readPositiveM(box, 'widthM') ?? readPositiveM(box, 'wM'),
    depthM: readPositiveM(box, 'depthM') ?? readPositiveM(box, 'dM'),
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
  App: AppContainer;
  candidate: CellDimsFreeBoxHitCandidate;
  intersects: RaycastHitLike[];
}): CellDimsFreeBoxHoverBuildResult | null {
  const { App, candidate, intersects } = args;
  const cfgMod = readModuleConfig(App, candidate.moduleKey, candidate.stackKey);
  const box = findFreeBoxById(readFreeBoxesFromModule(cfgMod), candidate.boxId);
  if (!box) return null;
  const selectorBox = resolveFreeBoxSelectorBox({ App, box });
  if (!selectorBox) return null;
  const woodThick = MATERIAL_DIMENSIONS.wood.thicknessM;
  const currentBackZ = Number(selectorBox.centerZ) - Number(selectorBox.depth) / 2;
  const target: InteriorHoverTarget = {
    intersects,
    hitModuleKey: candidate.moduleKey,
    hitSelectorObj: (candidate.anchor as never) || null,
    isBottom: candidate.stackKey === 'bottom',
    hitY: Number(selectorBox.centerY),
    info: {
      __wpCellDimsFreeBox: true,
      __wpCellDimsFreeBoxId: candidate.boxId,
      __wpCellDimsFreeBoxRecord: box,
      __wpCellDimsFreeBoxSelectorBox: selectorBox,
    },
    bottomY: Number(selectorBox.centerY) - Number(selectorBox.height) / 2,
    topY: Number(selectorBox.centerY) + Number(selectorBox.height) / 2,
    spanH: Number(selectorBox.height),
    woodThick,
    innerW: Math.max(0.03, Number(selectorBox.width) - woodThick * 2),
    internalCenterX: Number(selectorBox.centerX),
    internalDepth: Math.max(0.03, Number(selectorBox.depth) - woodThick),
    internalZ: Number(selectorBox.centerZ),
    backZ: currentBackZ,
    regularDepth: Number(selectorBox.depth),
  };
  return { target, selectorBox };
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
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): CellDimsFreeBoxHoverBuildResult | null {
  const { App, ndcX, ndcY, raycaster, mouse } = args;
  try {
    const roots = __wp_getViewportRoots(App);
    const camera = roots.camera;
    const wardrobeGroup = roots.wardrobeGroup;
    if (!wardrobeGroup) return null;

    const pending = resolveCellDimsPostClickFreeBoxHoverIdentity({ App, ndcX, ndcY });
    if (pending) {
      return buildFreeBoxHoverTarget({
        App,
        candidate: {
          boxId: pending.freeBoxId,
          moduleKey: pending.moduleKey,
          stackKey: pending.stackKey,
          anchor: findAnchorForFreeBox(wardrobeGroup, pending.freeBoxId, pending.moduleKey),
        },
        intersects: [],
      });
    }

    if (!camera) return null;
    const intersects = __wp_raycastReuse({
      App,
      raycaster,
      mouse,
      camera,
      ndcX,
      ndcY,
      objects: [wardrobeGroup],
      recursive: true,
    });
    const candidate = readCellDimsFreeBoxHitCandidate(intersects);
    return candidate ? buildFreeBoxHoverTarget({ App, candidate, intersects }) : null;
  } catch {
    return null;
  }
}

function readSpecialDims(target: InteriorHoverTarget): UnknownRecord | null {
  return asRecord(asRecord(target.info)?.__wpCellDimsFreeBoxRecord)?.specialDims as UnknownRecord | null;
}

function resolveTargetDimensionCm(args: {
  target: InteriorHoverTarget;
  currentCm: number;
  applyCm: number | null | undefined;
  specialKey: 'widthCm' | 'heightCm' | 'depthCm';
  baseKey: 'baseWidthCm' | 'baseHeightCm' | 'baseDepthCm';
}): number {
  const { target, currentCm, applyCm, specialKey, baseKey } = args;
  if (applyCm == null || !Number.isFinite(applyCm) || !(applyCm > 0)) return currentCm;
  const sd = readSpecialDims(target);
  const active = getActiveOverrideCm(sd, specialKey, baseKey);
  if (active != null && Math.abs(applyCm - active) <= EPS_CM) {
    const base = readFiniteNumber(sd?.[baseKey]);
    return base != null && base > 0 ? base : currentCm;
  }
  return applyCm;
}

function resolveFreeBoxWorkspacePad(boxHeightM: number): number {
  const dims = SKETCH_BOX_DIMENSIONS.freePlacement;
  return Math.min(
    dims.workspaceClampPadMaxM,
    Math.max(dims.workspaceClampPadMinM, boxHeightM * dims.workspaceClampPadHeightRatio)
  );
}

function resolveTargetCenterY(selectorBox: SelectorLocalBox, targetHeightM: number): number {
  const centerY = Number(selectorBox.centerY);
  const currentHeightM = Number(selectorBox.height);
  if (!Number.isFinite(centerY) || !Number.isFinite(currentHeightM) || !(currentHeightM > 0)) {
    return centerY;
  }
  const roomFloorY = SKETCH_BOX_DIMENSIONS.freePlacement.roomFloorY;
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
  applyD: number | null | undefined
): SelectorLocalBox | null {
  if (asRecord(target.info)?.__wpCellDimsFreeBox !== true) return null;
  const currentWcm = Math.max(0, Number(selectorBox.width) * 100);
  const currentHcm = Math.max(0, Number(selectorBox.height) * 100);
  const currentDcm = Math.max(0, Number(selectorBox.depth) * 100);
  const targetWm = Math.max(
    0.03,
    resolveTargetDimensionCm({
      target,
      currentCm: currentWcm,
      applyCm: applyW,
      specialKey: 'widthCm',
      baseKey: 'baseWidthCm',
    }) / 100
  );
  const targetHm = Math.max(
    0.03,
    resolveTargetDimensionCm({
      target,
      currentCm: currentHcm,
      applyCm: applyH,
      specialKey: 'heightCm',
      baseKey: 'baseHeightCm',
    }) / 100
  );
  const targetDm = Math.max(
    0.024,
    resolveTargetDimensionCm({
      target,
      currentCm: currentDcm,
      applyCm: applyD,
      specialKey: 'depthCm',
      baseKey: 'baseDepthCm',
    }) / 100
  );
  const currentBackZ = Number(selectorBox.centerZ) - Number(selectorBox.depth) / 2;
  return {
    centerX: Number(selectorBox.centerX),
    centerY: resolveTargetCenterY(selectorBox, targetHm),
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
}): boolean {
  const { target, selectorBox, applyW, applyH, applyD } = args;
  const next = resolveCellDimsFreeBoxPreviewTargetBox(target, selectorBox, applyW, applyH, applyD);
  if (!next) return false;
  return (
    Math.abs(Number(next.width) - Number(selectorBox.width)) > EPS_M ||
    Math.abs(Number(next.height) - Number(selectorBox.height)) > EPS_M ||
    Math.abs(Number(next.depth) - Number(selectorBox.depth)) > EPS_M
  );
}

type FreeBoxDimIntent = 'add' | 'remove' | null;

function resolveFreeBoxDimIntent(args: {
  target: InteriorHoverTarget;
  currentCm: number;
  applyCm?: number | null;
  specialKey: 'widthCm' | 'heightCm' | 'depthCm';
  baseKey: 'baseWidthCm' | 'baseHeightCm' | 'baseDepthCm';
}): FreeBoxDimIntent {
  const { target, currentCm, applyCm, specialKey, baseKey } = args;
  if (applyCm == null || !Number.isFinite(applyCm) || !(applyCm > 0)) return null;
  const sd = readSpecialDims(target);
  const active = getActiveOverrideCm(sd, specialKey, baseKey);
  if (active != null && Math.abs(applyCm - active) <= EPS_CM) return 'remove';
  return Math.abs(currentCm - applyCm) > EPS_CM ? 'add' : null;
}

function resolveFreeBoxDimsIntent(args: {
  target: InteriorHoverTarget;
  selectorBox: SelectorLocalBox;
  applyW?: number | null;
  applyH?: number | null;
  applyD?: number | null;
}): FreeBoxDimIntent {
  const intents = [
    resolveFreeBoxDimIntent({
      target: args.target,
      currentCm: Math.max(0, Number(args.selectorBox.width) * 100),
      applyCm: args.applyW,
      specialKey: 'widthCm',
      baseKey: 'baseWidthCm',
    }),
    resolveFreeBoxDimIntent({
      target: args.target,
      currentCm: Math.max(0, Number(args.selectorBox.height) * 100),
      applyCm: args.applyH,
      specialKey: 'heightCm',
      baseKey: 'baseHeightCm',
    }),
    resolveFreeBoxDimIntent({
      target: args.target,
      currentCm: Math.max(0, Number(args.selectorBox.depth) * 100),
      applyCm: args.applyD,
      specialKey: 'depthCm',
      baseKey: 'baseDepthCm',
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
}): 'add' | 'remove' | null {
  const box = asRecord(asRecord(args.target.info)?.__wpCellDimsFreeBoxRecord);
  if (!box) return null;
  const dimChange = hasFreeBoxDimChange(args);
  const dimIntent = resolveFreeBoxDimsIntent(args);
  if (args.hexCellMode) {
    if (!moduleHasHexCell(box)) return 'add';
    const moduleWidthCm =
      args.applyW != null && Number.isFinite(args.applyW)
        ? args.applyW
        : Number(args.selectorBox.width) * 100;
    const hexChange = hasHexCellDraftConfigChange({
      cfgMod: box,
      protrusionCm: args.hexCellProtrusionCm,
      doorWidthCm: args.hexCellDoorWidthCm,
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
  return asRecord(target?.info)?.__wpCellDimsFreeBox === true;
}
