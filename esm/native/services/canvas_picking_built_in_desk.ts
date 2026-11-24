import type { AppContainer, SketchPlacementPreviewArgsLike, UnknownRecord } from '../../../types';
import type {
  BuiltInDeskHost,
  BuiltInDeskOptions,
  BuiltInDeskPlacement,
} from '../../../types/built_in_desk.js';
import {
  BUILT_IN_DESK_TOOL_PREFIX,
  BUILT_IN_DESK_DIMENSIONS,
  planBuiltInDesk,
  readBuiltInDeskPlacement,
  readBuiltInDeskTool,
} from '../../shared/built_in_desk.js';
import { asRecord } from '../runtime/record.js';
import { __wp_raycastReuse, __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { isRenderableHitObject, type ModuleKey } from './canvas_picking_hover_targets_shared.js';
import {
  __wp_clearSketchHover,
  __wp_getViewportRoots,
  __wp_projectWorldPointToLocal,
  __wp_readInteriorModuleConfigRef,
} from './canvas_picking_local_helpers.js';
import { readActiveManualTool } from './canvas_picking_manual_tool_access.js';
import {
  makePreviewArgs,
  readManualLayoutSketchPreviewFns,
} from './canvas_picking_manual_layout_sketch_hover_tools_shared.js';
import { createCanvasPickingModulesStructuralPatchMeta } from './canvas_picking_modules_patch_meta.js';
import { readSketchFreePlacementTransform } from './canvas_picking_sketch_free_box_hit.js';
import { commitCanvasModuleStructuralPatch } from './canvas_picking_structural_commit.js';
import { resetCanvasPickingEmptyClick } from './canvas_picking_click_empty.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import type { HitObjectLike, RaycastHitLike } from './canvas_picking_engine.js';

function readDeskOwner(config: UnknownRecord | null, boxId: string | undefined): UnknownRecord | null {
  const extras = asRecord(config?.sketchExtras);
  if (boxId === undefined) return extras;
  const boxes: unknown[] = Array.isArray(extras?.boxes) ? extras.boxes : [];
  for (const item of boxes) {
    const box = asRecord(item);
    if (box && String(box.id) === boxId) return box;
  }
  return null;
}

function readDeskHit(hit: RaycastHitLike) {
  for (let node: HitObjectLike | null | undefined = hit.object; node; node = node.parent) {
    const host = asRecord<BuiltInDeskHost>(node.userData?.__wpBuiltInDeskHost);
    if (!host || !node.parent) continue;
    return {
      hit,
      host,
      anchorParent: node.parent,
      hitDesk: typeof node.userData?.__wpBuiltInDeskId === 'string',
    };
  }
  return null;
}

function sameDesk(a: BuiltInDeskPlacement | null, b: BuiltInDeskPlacement | null): boolean {
  const defaultClearanceCm = BUILT_IN_DESK_DIMENSIONS.doorOpeningClearanceM * 100;
  return (
    a?.lengthCm === b?.lengthCm &&
    a?.drawerCount === b?.drawerCount &&
    a?.support === b?.support &&
    (a?.doorClearanceAboveCm ?? defaultClearanceCm) === (b?.doorClearanceAboveCm ?? defaultClearanceCm) &&
    (a?.doorClearanceBelowCm ?? defaultClearanceCm) === (b?.doorClearanceBelowCm ?? defaultClearanceCm) &&
    a?.topNorm === b?.topNorm &&
    a?.drawerSide === b?.drawerSide
  );
}

function findDeskHit(intersects: readonly RaycastHitLike[]) {
  const foremost = intersects.find(
    hit => !hit.object.userData?.__ignoreRaycast && isRenderableHitObject(hit.object)
  );
  const direct = foremost && readDeskHit(foremost);
  if (direct) return direct;
  const selector = intersects.find(hit => hit.object.userData?.isModuleSelector);
  return selector ? readDeskHit(selector) : null;
}

export function resolveBuiltInDeskEdit(args: {
  App: AppContainer;
  options: BuiltInDeskOptions;
  intersects: readonly RaycastHitLike[];
  projectPoint: typeof __wp_projectWorldPointToLocal;
  readConfig: (App: AppContainer, key: ModuleKey, isBottom: boolean) => UnknownRecord | null;
}) {
  const target = findDeskHit(args.intersects);
  if (!target || !target.hit.point || !target.host.geometry) return null;
  const { App, options } = args;
  const { host, hit, anchorParent } = target;
  const moduleKey = __wp_toModuleKey(host.moduleKey);
  if (moduleKey == null || (host.stack !== 'top' && host.stack !== 'bottom')) return null;
  const config = args.readConfig(App, moduleKey, host.stack === 'bottom');
  const owner = readDeskOwner(config, host.boxId);
  if (!config || (host.boxId !== undefined && !owner)) return null;
  const geometry = host.geometry;
  const point = args.projectPoint(App, hit.point, anchorParent);
  if (!point || !(geometry.topY > geometry.bottomY)) return null;
  const transform = readSketchFreePlacementTransform(hit.object);
  const pivotX = transform?.pivotX ?? 0;
  const pivotZ = transform?.pivotZ ?? 0;
  const centerX = (geometry.leftX + geometry.rightX) / 2;
  const current = readBuiltInDeskPlacement(owner?.builtInDesk);
  if (target.hitDesk && !current) return null;
  const drawerSide =
    current?.drawerSide ?? geometry.preferredDrawerSide ?? (point.x + pivotX < centerX ? 'left' : 'right');
  const topNorm =
    target.hitDesk && current
      ? current.topNorm
      : Math.min(1, Math.max(0, (point.y - geometry.bottomY) / (geometry.topY - geometry.bottomY)));
  const placement = { ...options, topNorm, drawerSide };
  const plan = planBuiltInDesk(geometry, placement);
  if (!plan) return null;
  const remove = target.hitDesk && sameDesk(current, placement);
  return { anchorParent, host, moduleKey, current, placement, plan, pivotX, pivotZ, remove };
}

type DeskEdit = NonNullable<ReturnType<typeof resolveBuiltInDeskEdit>>;

export function commitBuiltInDeskEdit(App: AppContainer, edit: DeskEdit): void {
  const { host, moduleKey, placement, current, remove } = edit;
  const op = remove ? 'builtInDesk.remove' : 'builtInDesk.place';
  if (!remove && sameDesk(current, placement)) return;
  commitCanvasModuleStructuralPatch({
    App,
    moduleKey,
    stack: host.stack,
    op,
    meta: createCanvasPickingModulesStructuralPatchMeta(op),
    mutate(config) {
      if (host.boxId === undefined) config.sketchExtras ??= {};
      const owner = readDeskOwner(config, host.boxId);
      if (!owner) return false;
      if (!sameDesk(readBuiltInDeskPlacement(owner.builtInDesk), current)) return false;
      if (remove) delete owner.builtInDesk;
      else owner.builtInDesk = placement;
      return true;
    },
  });
}

function makeDeskPreview(App: AppContainer, edit: DeskEdit): SketchPlacementPreviewArgsLike {
  const { plan, anchorParent, host, pivotX, pivotZ } = edit;
  const { top } = plan;
  const frontZ = top.z + top.depth / 2 - pivotZ + 0.015;
  const centerX = (host.geometry.leftX + host.geometry.rightX) / 2 - pivotX;
  const boards = [plan.top, plan.bottom, plan.back, ...plan.drawers];
  if (plan.support) boards.push(plan.support);
  const previewBoards = boards.map(board => ({
    ...board,
    x: board.x - pivotX,
    z: board.z - pivotZ,
  }));
  return {
    ...makePreviewArgs(App),
    kind: 'built_in_desk',
    op: edit.remove ? 'remove' : 'add',
    anchorParent,
    x: top.x - pivotX,
    y: top.y,
    z: top.z - pivotZ,
    w: top.width,
    d: top.depth,
    deskPreviewBoards: previewBoards,
    clearanceMeasurements: [
      {
        startX: centerX,
        endX: centerX,
        startY: BUILT_IN_DESK_DIMENSIONS.floorY,
        endY: plan.surfaceY,
        z: frontZ,
        label: `${Math.round((plan.surfaceY - BUILT_IN_DESK_DIMENSIONS.floorY) * 1000) / 10} ס״מ`,
        labelFaceSign: 1,
        styleKey: 'cell',
        role: 'cell',
      },
    ],
  };
}

export function previewBuiltInDesk(args: {
  App: AppContainer;
  tool: string;
  intersects: readonly RaycastHitLike[];
  setPreview: ((args: SketchPlacementPreviewArgsLike) => unknown) | null;
  clearPreview: () => void;
}): boolean {
  if (!args.tool.startsWith(BUILT_IN_DESK_TOOL_PREFIX)) return false;
  const options = readBuiltInDeskTool(args.tool);
  const edit =
    options &&
    resolveBuiltInDeskEdit({
      App: args.App,
      options,
      intersects: args.intersects,
      projectPoint: __wp_projectWorldPointToLocal,
      readConfig: __wp_readInteriorModuleConfigRef,
    });
  if (edit && args.setPreview) args.setPreview(makeDeskPreview(args.App, edit));
  else args.clearPreview();
  return true;
}

export function tryHandleBuiltInDeskClick(args: CanvasPickingClickRouteArgs): boolean {
  if (!args.modeState.__isManualLayoutMode) return false;
  const { App, ndcX, ndcY, raycaster, mouse } = args;
  const tool = readActiveManualTool(App);
  if (!tool?.startsWith(BUILT_IN_DESK_TOOL_PREFIX)) return false;
  const options = readBuiltInDeskTool(tool);
  const { wardrobeGroup, camera } = __wp_getViewportRoots(App);
  if (!options || !wardrobeGroup || !camera) return true;
  const intersects = __wp_raycastReuse({
    App,
    ndcX,
    ndcY,
    raycaster,
    mouse,
    camera,
    objects: [wardrobeGroup],
  });
  const edit = resolveBuiltInDeskEdit({
    App,
    options,
    intersects,
    projectPoint: __wp_projectWorldPointToLocal,
    readConfig: __wp_readInteriorModuleConfigRef,
  });
  if (edit) {
    commitBuiltInDeskEdit(App, edit);
    __wp_clearSketchHover(App);
    readManualLayoutSketchPreviewFns(App).hidePreview?.(makePreviewArgs(App));
  } else {
    resetCanvasPickingEmptyClick(args);
  }
  return true;
}
