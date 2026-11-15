import type { AppContainer, UnknownRecord } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import { asRecord } from '../runtime/record.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { __wp_readInteriorModuleConfigRef } from './canvas_picking_local_helpers.js';
import { commitCanvasModuleStructuralPatch } from './canvas_picking_structural_commit.js';
import { createCanvasPickingModulesStructuralPatchMeta } from './canvas_picking_modules_patch_meta.js';
import { isRenderableHitObject, type ModuleKey } from './canvas_picking_hover_targets_shared.js';
import { readSketchFreePlacementTransform } from './canvas_picking_sketch_free_box_hit.js';
import { pickSketchFreeBoxHost } from './canvas_picking_sketch_free_boxes.js';

/** Resolve the foremost visible box part, never a module selector hidden behind a box. */
export type FullBoringBoxTarget = {
  boxId: string;
  moduleKey: ModuleKey;
  isBottom: boolean;
  enabled: boolean;
  bounds: {
    bottomY: number;
    topY: number;
    centerX: number;
    innerW: number;
    internalZ: number;
    internalDepth: number;
    woodThick: number;
  } | null;
  previewParent: unknown | null;
};

export type FullBoringBoxHit =
  { isBoxHit: false; target: null } | { isBoxHit: true; target: FullBoringBoxTarget | null };

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function findBox(cfg: UnknownRecord | null, boxId: string): UnknownRecord | null {
  const boxes = asRecord(cfg?.sketchExtras)?.boxes;
  if (!Array.isArray(boxes)) return null;
  for (const entry of boxes) {
    const box = asRecord(entry);
    if (box && String(box.id) === boxId) return box;
  }
  return null;
}

function readBoxBounds(value: unknown): FullBoringBoxTarget['bounds'] {
  const rec = asRecord(value);
  if (!rec) return null;
  const { bottomY, topY, centerX, innerW, internalZ, internalDepth, woodThick } = rec;
  if (
    !finite(bottomY) ||
    !finite(topY) ||
    !(topY > bottomY) ||
    !finite(centerX) ||
    !positive(innerW) ||
    !finite(internalZ) ||
    !positive(internalDepth) ||
    !positive(woodThick)
  )
    return null;
  return { bottomY, topY, centerX, innerW, internalZ, internalDepth, woodThick };
}

export function resolveFullBoringBoxHit(args: {
  App: AppContainer;
  intersects: readonly RaycastHitLike[];
  preferredBottom?: boolean;
}): FullBoringBoxHit {
  let firstObject: unknown = null;
  for (const hit of args.intersects) {
    const object = hit?.object;
    if (!isRenderableHitObject(object ?? null)) continue;
    firstObject = object;
    break;
  }
  if (!firstObject) return { isBoxHit: false, target: null };

  let boxId: string | null = null;
  let moduleKeyRaw: unknown = null;
  let bounds: FullBoringBoxTarget['bounds'] = null;
  let stackHint: boolean | null = null;
  let node = asRecord(firstObject);
  for (let depth = 0; node && depth < 20; depth++) {
    const ud = asRecord(node.userData);
    if (ud) {
      if (typeof ud.__wpSketchBoxId === 'string') boxId ??= ud.__wpSketchBoxId;
      if (moduleKeyRaw == null) moduleKeyRaw = ud.__wpSketchModuleKey;
      if (!bounds) bounds = readBoxBounds(ud.__wpFullBoringBox);
      if (ud.__wpStack === 'bottom') stackHint ??= true;
      if (ud.__wpStack === 'top') stackHint ??= false;
    }
    node = asRecord(node.parent);
  }
  if (!boxId) return { isBoxHit: false, target: null };

  // Lower-stack box meshes identify their module as `lower_N`, unlike top-stack `N`.
  // Recover both the canonical module key and stack from the pick metadata.
  const lowerMatch = typeof moduleKeyRaw === 'string' ? /^lower_(\d+)$/.exec(moduleKeyRaw) : null;
  const parsedModuleKey = lowerMatch ? Number(lowerMatch[1]) : __wp_toModuleKey(moduleKeyRaw);
  const freeHost = parsedModuleKey == null ? pickSketchFreeBoxHost(args.App) : null;
  const moduleKey = parsedModuleKey ?? freeHost?.moduleKey ?? null;
  if (moduleKey == null) return { isBoxHit: true, target: null };
  const topBox = findBox(__wp_readInteriorModuleConfigRef(args.App, moduleKey, false), boxId);
  const bottomBox = findBox(__wp_readInteriorModuleConfigRef(args.App, moduleKey, true), boxId);
  if (!topBox && !bottomBox) return { isBoxHit: true, target: null };

  // Never redirect a known bottom-stack hit to a similarly named top-stack box.
  const isBottom = lowerMatch
    ? true
    : topBox === null
      ? true
      : bottomBox === null
        ? false
        : (stackHint ?? args.preferredBottom ?? false);
  const box = isBottom ? bottomBox : topBox;
  if (!box) return { isBoxHit: true, target: null };

  const transform = readSketchFreePlacementTransform(firstObject);
  const previewParent = transform?.wall !== 'back' ? (transform?.owner ?? null) : null;
  const projectedBounds =
    bounds && transform && transform.wall !== 'back'
      ? {
          ...bounds,
          centerX: bounds.centerX - transform.pivotX,
          internalZ: bounds.internalZ - transform.pivotZ,
        }
      : bounds;
  return {
    isBoxHit: true,
    target: {
      boxId,
      moduleKey,
      isBottom,
      enabled: box.fullShelfPinBoring === true,
      bounds: projectedBounds,
      previewParent,
    },
  };
}

/** Return true even for stale box hits so a click can never silently toggle its enclosing wardrobe. */
export function tryToggleFullBoringSketchBox(args: {
  App: AppContainer;
  intersects: readonly RaycastHitLike[];
  preferredBottom?: boolean;
}): boolean {
  const hit = resolveFullBoringBoxHit(args);
  if (!hit.isBoxHit) return false;
  if (!hit.target) return true;
  const { boxId, moduleKey, isBottom } = hit.target;
  commitCanvasModuleStructuralPatch({
    App: args.App,
    stack: isBottom ? 'bottom' : 'top',
    moduleKey,
    mutate(cfg) {
      const box = findBox(cfg, boxId);
      if (!box) return false;
      box.fullShelfPinBoring = box.fullShelfPinBoring !== true;
      return true;
    },
    meta: createCanvasPickingModulesStructuralPatchMeta('fullShelfPinBoring.boxToggle'),
    op: 'fullShelfPinBoring.boxToggle',
  });
  return true;
}

export function previewFullBoringSketchBox(args: {
  App: AppContainer;
  intersects: readonly RaycastHitLike[];
  wardrobeGroup: unknown;
  setLayoutPreview: ((payload: Record<string, unknown>) => unknown) | null;
  hideLayoutPreview?: () => void;
}): boolean {
  const hit = resolveFullBoringBoxHit(args);
  if (!hit.isBoxHit) return false;
  const target = hit.target;
  if (!target?.bounds || !args.setLayoutPreview) {
    args.hideLayoutPreview?.();
    return true;
  }
  const { bottomY, topY, centerX, innerW, internalZ, internalDepth, woodThick } = target.bounds;
  args.setLayoutPreview({
    App: args.App,
    THREE: getThreeMaybe(args.App),
    anchorParent: target.previewParent ?? args.wardrobeGroup,
    x: centerX,
    innerW,
    internalZ,
    internalDepth,
    woodThick,
    shelfYs: [],
    rodYs: [],
    storageBarrier: null,
    boringBounds: { bottomY, topY },
    op: target.enabled ? 'remove' : 'add',
  });
  return true;
}
