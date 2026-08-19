import type { AppContainer, UnknownRecord } from '../../../types';
import type { ModuleKey } from './canvas_picking_manual_layout_sketch_contracts.js';
import { asRecord } from '../runtime/record.js';
import {
  decodeSketchBoxContentCommandHover,
  isStrictSketchBoxContentKind,
} from './canvas_picking_sketch_box_content_command.js';
import {
  decodeSketchStructuralCommandHover,
  isStrictSketchStructuralContentKind,
} from './canvas_picking_sketch_structural_command.js';
import {
  commitSketchModuleBoxContent,
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
} from './canvas_picking_sketch_box_content_commit.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';
import {
  readRoomArchitectureForDrawerGuard,
  ROOM_COLUMN_DRAWER_ADD_BLOCKED_MESSAGE,
  shouldBlockFreeBoxDrawerBuildForRoomColumn,
} from './canvas_picking_drawer_mode_flow_shared.js';
import { createSketchHoverHostIdentity } from './canvas_picking_sketch_hover_identity.js';
import {
  createSketchFreeBoxPlacementCommandEnvelope,
  decodeSketchFreeBoxPlacementHover,
  type SketchFreeBoxPlacementCommand,
} from './canvas_picking_sketch_free_box_command.js';
import { toastSketchBoxContentBlocked } from './canvas_picking_sketch_box_content_blocked.js';
import { createCanvasPickingModulesStructuralPatchMeta } from './canvas_picking_modules_patch_meta.js';
import { commitCanvasModuleStructuralPatch } from './canvas_picking_structural_commit.js';

type RecordMap = UnknownRecord;

export type SketchFreePlacementHostLike = {
  moduleKey: ModuleKey;
  isBottom: boolean;
};

type CommitSketchFreePlacementHoverRecordArgs = {
  App: AppContainer;
  host: SketchFreePlacementHostLike;
  hoverRec: RecordMap;
  freeBoxContentKind?: string | null;
  floorY?: number;
  contentSource?: string;
  boxSource?: string;
};

export type CommitSketchFreePlacementHoverRecordResult =
  { committed: false } | { committed: true; nextHover: RecordMap | null; blockedByRoomColumn?: true };

function isDrawerFreeBoxContentKind(contentKind: string): boolean {
  return contentKind === 'drawers' || contentKind === 'ext_drawers' || contentKind === 'regular_ext_drawers';
}

function readRecordString(record: unknown, key: string): string | null {
  const value = asRecord(record)?.[key];
  return typeof value === 'string' && value ? value : null;
}

type CreateSketchFreePlacementBoxHoverRecordArgs = {
  tool: string;
  host: SketchFreePlacementHostLike;
  op: 'add' | 'remove';
  previewX: number;
  previewY: number;
  previewH: number;
  previewW: number;
  previewD: number;
  placementWall?: 'back' | 'left' | 'right';
  removeId?: string | null | undefined;
  ts?: number;
};

function createRandomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

function commitSketchFreePlacementContent(args: {
  App: AppContainer;
  host: SketchFreePlacementHostLike;
  cfg: RecordMap;
  boxId: string;
  contentKind: string;
  hoverRec: RecordMap;
  floorY: number;
}): { found: boolean; nextHover: RecordMap | null; blockedByRoomColumn?: true } {
  const boxes = ensureSketchModuleBoxes(args.cfg);
  const box = findSketchModuleBoxById(boxes, args.boxId, { freePlacement: true });
  if (!box) return { found: false, nextHover: null };

  const decoded = decodeSketchBoxContentCommandHover(args.hoverRec);
  if (
    decoded.ok &&
    decoded.value.command.op === 'add' &&
    isDrawerFreeBoxContentKind(args.contentKind) &&
    shouldBlockFreeBoxDrawerBuildForRoomColumn({
      App: args.App,
      roomArchitecture: readRoomArchitectureForDrawerGuard(args.App),
      box,
    })
  ) {
    __wp_toast(args.App, ROOM_COLUMN_DRAWER_ADD_BLOCKED_MESSAGE, 'error');
    return { found: true, nextHover: null, blockedByRoomColumn: true };
  }

  return {
    found: true,
    nextHover: commitSketchModuleBoxContent({
      App: args.App,
      cfg: args.cfg,
      box,
      boxId: args.boxId,
      contentKind: args.contentKind,
      hoverRec: args.hoverRec,
      floorY: args.floorY,
      hoverMode: 'free-toggle',
      hoverHost: { tool: readRecordString(args.hoverRec, 'tool') || '', ...args.host },
    }),
  };
}

function commitSketchFreePlacementBox(args: {
  cfg: RecordMap;
  command: SketchFreeBoxPlacementCommand;
}): boolean {
  const list = ensureSketchModuleBoxes(args.cfg);
  if (args.command.kind === 'remove-free-box') {
    const boxId = args.command.boxId;
    const index = list.findIndex(
      item => item.freePlacement === true && item.id != null && String(item.id) === boxId
    );
    if (index < 0) return false;
    list.splice(index, 1);
    return true;
  }

  const { centerX, centerY, heightM, widthM, depthM, placementWall } = args.command.geometry;
  list.push({
    id: createRandomId('sbf'),
    freePlacement: true,
    absX: centerX,
    absY: centerY,
    heightM,
    widthM,
    depthM,
    placementWall: placementWall === 'left' || placementWall === 'right' ? placementWall : 'back',
  });
  return true;
}

export function createSketchFreePlacementBoxHoverRecord(
  args: CreateSketchFreePlacementBoxHoverRecordArgs
): RecordMap | null {
  const command: SketchFreeBoxPlacementCommand | null =
    args.op === 'remove'
      ? typeof args.removeId === 'string' && args.removeId.trim()
        ? { kind: 'remove-free-box', boxId: args.removeId.trim() }
        : null
      : {
          kind: 'create-free-box',
          geometry: {
            centerX: args.previewX,
            centerY: args.previewY,
            heightM: args.previewH,
            widthM: args.previewW,
            depthM: args.previewD,
            ...(args.placementWall === 'left' || args.placementWall === 'right'
              ? { placementWall: args.placementWall }
              : {}),
          },
        };
  if (!command) return null;
  return {
    ts: args.ts ?? Date.now(),
    tool: args.tool,
    ...createSketchHoverHostIdentity(args.host),
    kind: 'box',
    freePlacement: true,
    freeBoxPlacementCommand: createSketchFreeBoxPlacementCommandEnvelope(command),
  };
}

export function commitSketchFreePlacementHoverRecord(
  args: CommitSketchFreePlacementHoverRecordArgs
): CommitSketchFreePlacementHoverRecordResult {
  const contentKind = typeof args.freeBoxContentKind === 'string' ? args.freeBoxContentKind : '';
  const floorY = typeof args.floorY === 'number' ? args.floorY : NaN;
  const stack = args.host.isBottom ? 'bottom' : 'top';

  const strictHover = decodeSketchBoxContentCommandHover(args.hoverRec);
  if (contentKind && strictHover.ok) {
    const { command, contentKind: commandContentKind } = strictHover.value;
    if (!isStrictSketchBoxContentKind(contentKind) || commandContentKind !== contentKind)
      return { committed: false };
    if (!command.freePlacement) return { committed: false };
    if (command.blockedReason) {
      // Consume blocked free-box clicks so routing cannot fall through to a module behind the box.
      toastSketchBoxContentBlocked(args.App, contentKind, command.blockedReason);
      return { committed: true, nextHover: null };
    }

    let nextHover: RecordMap | null = null;
    let blockedByRoomColumn = false;
    const outcome = commitCanvasModuleStructuralPatch({
      App: args.App,
      stack,
      moduleKey: args.host.moduleKey,
      mutate: cfg => {
        const result = commitSketchFreePlacementContent({
          App: args.App,
          host: args.host,
          cfg,
          boxId: command.boxId,
          contentKind,
          hoverRec: args.hoverRec,
          floorY,
        });
        if (!result.found) return false;
        if (result.blockedByRoomColumn) {
          blockedByRoomColumn = true;
          return false;
        }
        nextHover = result.nextHover;
        return true;
      },
      meta: createCanvasPickingModulesStructuralPatchMeta(args.contentSource || 'manualSketchBoxContentFree'),
      op: 'sketchFree.content',
    });
    if (blockedByRoomColumn) return { committed: true, nextHover: null, blockedByRoomColumn: true };
    return outcome.committed && outcome.changed ? { committed: true, nextHover } : { committed: false };
  }

  const structuralHover = decodeSketchStructuralCommandHover(args.hoverRec);
  if (contentKind && structuralHover.ok) {
    const { command, contentKind: commandContentKind } = structuralHover.value;
    if (!isStrictSketchStructuralContentKind(contentKind) || commandContentKind !== contentKind)
      return { committed: false };
    if (!command.freePlacement) return { committed: false };
    if (command.blockedReason) {
      toastSketchBoxContentBlocked(args.App, contentKind, command.blockedReason);
      return { committed: true, nextHover: null };
    }

    let nextHover: RecordMap | null = null;
    const outcome = commitCanvasModuleStructuralPatch({
      App: args.App,
      stack,
      moduleKey: args.host.moduleKey,
      mutate: cfg => {
        const result = commitSketchFreePlacementContent({
          App: args.App,
          host: args.host,
          cfg,
          boxId: command.boxId,
          contentKind,
          hoverRec: args.hoverRec,
          floorY,
        });
        if (!result.found) return false;
        nextHover = result.nextHover;
        return true;
      },
      meta: createCanvasPickingModulesStructuralPatchMeta(args.contentSource || 'manualSketchBoxContentFree'),
      op: 'sketchFree.structuralContent',
    });
    return outcome.committed && outcome.changed ? { committed: true, nextHover } : { committed: false };
  }

  const placement = decodeSketchFreeBoxPlacementHover(args.hoverRec);
  if (!placement.ok) return { committed: false };

  const outcome = commitCanvasModuleStructuralPatch({
    App: args.App,
    stack,
    moduleKey: args.host.moduleKey,
    mutate: cfg => commitSketchFreePlacementBox({ cfg, command: placement.value }),
    meta: createCanvasPickingModulesStructuralPatchMeta(args.boxSource || 'manualSketchBoxFree'),
    op: 'sketchFree.box',
  });
  return outcome.committed && outcome.changed ? { committed: true, nextHover: null } : { committed: false };
}
