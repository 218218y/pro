import type { AppContainer, UnknownRecord } from '../../../types';
import type { ModuleKey } from './canvas_picking_manual_layout_sketch_contracts.js';
import { getModulesActions } from '../runtime/actions_access_domains.js';
import { asRecord } from '../runtime/record.js';
import {
  commitSketchModuleBoxContent,
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
} from './canvas_picking_sketch_box_content_commit.js';

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
  | { committed: false }
  | { committed: true; nextHover: RecordMap | null };

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

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}

function readRecordString(record: unknown, key: string): string | null {
  return readString(readRecordValue(record, key));
}

function createRandomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

function commitSketchFreePlacementContent(args: {
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
    box,
    boxId: args.boxId,
    contentKind: args.contentKind,
    hoverRec: args.hoverRec,
    floorY: args.floorY,
    hoverMode: 'free-toggle',
  });
}

function commitSketchFreePlacementBox(args: { cfg: RecordMap; hoverRec: RecordMap }): boolean {
  const centerX = readRecordNumber(args.hoverRec, 'xCenter');
  const centerY = readRecordNumber(args.hoverRec, 'yCenter');
  const heightM = readRecordNumber(args.hoverRec, 'heightM');
  const widthM = readRecordNumber(args.hoverRec, 'widthM');
  const depthM = readRecordNumber(args.hoverRec, 'depthM');
  const removeId = readRecordString(args.hoverRec, 'removeId') || '';
  if (
    centerX == null ||
    centerY == null ||
    heightM == null ||
    !(heightM > 0) ||
    widthM == null ||
    !(widthM > 0) ||
    depthM == null ||
    !(depthM > 0)
  ) {
    return false;
  }

  const list = ensureSketchModuleBoxes(args.cfg);
  if (removeId) {
    const idx = list.findIndex(
      it => it.freePlacement === true && it.id != null && String(it.id) === removeId
    );
    if (idx >= 0) {
      list.splice(idx, 1);
      return true;
    }
  }

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
): RecordMap {
  return {
    ts: args.ts ?? Date.now(),
    tool: args.tool,
    moduleKey: args.host.moduleKey,
    isBottom: args.host.isBottom,
    hostModuleKey: args.host.moduleKey,
    hostIsBottom: args.host.isBottom,
    kind: 'box',
    op: args.op,
    freePlacement: true,
    xCenter: args.previewX,
    yCenter: args.previewY,
    heightM: args.previewH,
    widthM: args.previewW,
    depthM: args.previewD,
    removeId: args.removeId ?? null,
  };
}

export function commitSketchFreePlacementHoverRecord(
  args: CommitSketchFreePlacementHoverRecordArgs
): CommitSketchFreePlacementHoverRecordResult {
  const mods = getModulesActions(args.App);
  if (!mods || typeof mods.patchForStack !== 'function') return { committed: false };

  const hoverKind = readRecordString(args.hoverRec, 'kind') || '';
  const contentKind = typeof args.freeBoxContentKind === 'string' ? args.freeBoxContentKind : '';
  const floorY = typeof args.floorY === 'number' ? args.floorY : NaN;

  if (
    contentKind &&
    hoverKind === 'box_content' &&
    args.hoverRec.freePlacement === true &&
    typeof args.hoverRec.boxId === 'string'
  ) {
    const hoverContentKind = readRecordString(args.hoverRec, 'contentKind') || '';
    if (hoverContentKind !== contentKind) return { committed: false };

    let nextHover: RecordMap | null = null;
    let touched = false;
    mods.patchForStack(
      args.host.isBottom ? 'bottom' : 'top',
      args.host.moduleKey,
      (cfg: RecordMap) => {
        nextHover = commitSketchFreePlacementContent({
          cfg,
          boxId: String(args.hoverRec.boxId),
          contentKind,
          hoverRec: args.hoverRec,
          floorY,
        });
        touched = true;
      },
      { source: args.contentSource || 'manualSketchBoxContentFree', immediate: true }
    );
    return touched ? { committed: true, nextHover } : { committed: false };
  }

  if (!(hoverKind === 'box' && args.hoverRec.freePlacement === true)) {
    return { committed: false };
  }

  let committed = false;
  mods.patchForStack(
    args.host.isBottom ? 'bottom' : 'top',
    args.host.moduleKey,
    (cfg: RecordMap) => {
      committed = commitSketchFreePlacementBox({ cfg, hoverRec: args.hoverRec });
    },
    { source: args.boxSource || 'manualSketchBoxFree', immediate: true }
  );
  return committed ? { committed: true, nextHover: null } : { committed: false };
}
