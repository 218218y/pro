import type { AppContainer, UnknownRecord } from '../../../types';
import type { ModuleKey } from './canvas_picking_manual_layout_sketch_contracts.js';
import { getModulesActions } from '../runtime/actions_access_domains.js';
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
import { createSketchHoverHostIdentity } from './canvas_picking_sketch_hover_identity.js';
import {
  createSketchFreeBoxPlacementCommandEnvelope,
  decodeSketchFreeBoxPlacementHover,
  type SketchFreeBoxPlacementCommand,
} from './canvas_picking_sketch_free_box_command.js';
import { toastSketchBoxContentBlocked } from './canvas_picking_sketch_box_content_blocked.js';
import { createCanvasPickingModulesStructuralPatchMeta } from './canvas_picking_modules_patch_meta.js';

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
  { committed: false } | { committed: true; nextHover: RecordMap | null };

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
  removeId?: string | null;
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
}): RecordMap | null {
  const boxes = ensureSketchModuleBoxes(args.cfg);
  const box = findSketchModuleBoxById(boxes, args.boxId, { freePlacement: true });
  if (!box) return null;

  return commitSketchModuleBoxContent({
    App: args.App,
    cfg: args.cfg,
    box,
    boxId: args.boxId,
    contentKind: args.contentKind,
    hoverRec: args.hoverRec,
    floorY: args.floorY,
    hoverMode: 'free-toggle',
    hoverHost: { tool: readRecordString(args.hoverRec, 'tool') || '', ...args.host },
  });
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

  const { centerX, centerY, heightM, widthM, depthM } = args.command.geometry;
  list.push({
    id: createRandomId('sbf'),
    freePlacement: true,
    absX: centerX,
    absY: centerY,
    heightM,
    widthM,
    depthM,
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
  const mods = getModulesActions(args.App);
  if (!mods || typeof mods.patchForStack !== 'function') return { committed: false };

  const contentKind = typeof args.freeBoxContentKind === 'string' ? args.freeBoxContentKind : '';
  const floorY = typeof args.floorY === 'number' ? args.floorY : NaN;

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
    let touched = false;
    mods.patchForStack(
      args.host.isBottom ? 'bottom' : 'top',
      args.host.moduleKey,
      (cfg: RecordMap) => {
        nextHover = commitSketchFreePlacementContent({
          App: args.App,
          host: args.host,
          cfg,
          boxId: command.boxId,
          contentKind,
          hoverRec: args.hoverRec,
          floorY,
        });
        touched = true;
      },
      createCanvasPickingModulesStructuralPatchMeta(args.contentSource || 'manualSketchBoxContentFree')
    );
    return touched ? { committed: true, nextHover } : { committed: false };
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
    let touched = false;
    mods.patchForStack(
      args.host.isBottom ? 'bottom' : 'top',
      args.host.moduleKey,
      (cfg: RecordMap) => {
        nextHover = commitSketchFreePlacementContent({
          App: args.App,
          host: args.host,
          cfg,
          boxId: command.boxId,
          contentKind,
          hoverRec: args.hoverRec,
          floorY,
        });
        touched = true;
      },
      createCanvasPickingModulesStructuralPatchMeta(args.contentSource || 'manualSketchBoxContentFree')
    );
    return touched ? { committed: true, nextHover } : { committed: false };
  }

  const placement = decodeSketchFreeBoxPlacementHover(args.hoverRec);
  if (!placement.ok) return { committed: false };

  let committed = false;
  mods.patchForStack(
    args.host.isBottom ? 'bottom' : 'top',
    args.host.moduleKey,
    (cfg: RecordMap) => {
      committed = commitSketchFreePlacementBox({ cfg, command: placement.value });
    },
    createCanvasPickingModulesStructuralPatchMeta(args.boxSource || 'manualSketchBoxFree')
  );
  return committed ? { committed: true, nextHover: null } : { committed: false };
}
