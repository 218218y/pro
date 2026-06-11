import type { AppContainer } from '../../../types';
import { matchRecentSketchHover } from './canvas_picking_sketch_hover_matching.js';
import { commitSketchFreePlacementHoverRecord } from './canvas_picking_sketch_free_commit.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { pickSketchFreeBoxHost } from './canvas_picking_sketch_free_boxes.js';
import { getSketchFreeBoxContentKind } from './canvas_picking_sketch_box_dividers.js';
import { isSketchFreeBoxUnderWardrobeColumn } from './canvas_picking_sketch_free_box_shared.js';
import { isNoMainWardrobeSketchMode } from './canvas_picking_sketch_free_box_no_main.js';
import {
  __wp_measureWardrobeLocalBox,
  __wp_readSketchHover,
  __wp_writeSketchHover,
  __wp_clearSketchHover,
} from './canvas_picking_projection_runtime.js';

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readRecordValue(record: unknown, key: string): unknown {
  return record && typeof record === 'object' && !Array.isArray(record) ? Reflect.get(record, key) : null;
}

function isBlockedFreeBoxAddHover(hoverRec: unknown, wardrobeBox: unknown): boolean {
  if (!wardrobeBox || typeof wardrobeBox !== 'object' || Array.isArray(wardrobeBox)) return false;
  if (readRecordValue(hoverRec, 'kind') !== 'box') return false;
  if (readRecordValue(hoverRec, 'freePlacement') !== true) return false;
  if (readRecordValue(hoverRec, 'op') === 'remove') return false;

  const xCenter = readNumber(readRecordValue(hoverRec, 'xCenter'));
  const yCenter = readNumber(readRecordValue(hoverRec, 'yCenter'));
  const heightM = readNumber(readRecordValue(hoverRec, 'heightM'));
  if (xCenter == null || yCenter == null || heightM == null) return false;

  const measuredWardrobeBox = wardrobeBox as {
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  };
  return isSketchFreeBoxUnderWardrobeColumn({
    planeX: xCenter,
    planeY: yCenter,
    boxH: heightM,
    wardrobeBox: measuredWardrobeBox,
  });
}

export type SketchBoxFreePlacementCommitDeps = {
  matchRecentSketchHover: typeof matchRecentSketchHover;
  commitSketchFreePlacementHoverRecord: typeof commitSketchFreePlacementHoverRecord;
  pickSketchFreeBoxHost: typeof pickSketchFreeBoxHost;
  getSketchFreeBoxContentKind: typeof getSketchFreeBoxContentKind;
  measureWardrobeLocalBox: typeof __wp_measureWardrobeLocalBox;
  readSketchHover: typeof __wp_readSketchHover;
  writeSketchHover: typeof __wp_writeSketchHover;
  clearSketchHover: typeof __wp_clearSketchHover;
  toModuleKey: typeof __wp_toModuleKey;
};

export function tryCommitSketchFreePlacementFromHoverWithDeps(
  App: AppContainer,
  manualTool: unknown,
  deps: SketchBoxFreePlacementCommitDeps
): boolean {
  const tool = typeof manualTool === 'string' ? String(manualTool) : '';
  if (!tool) return false;

  const host = deps.pickSketchFreeBoxHost(App);
  const hoverRec = deps.matchRecentSketchHover({
    hover: deps.readSketchHover(App),
    tool,
    host,
    toModuleKey: deps.toModuleKey,
  });
  if (!host || !hoverRec) return false;

  const wardrobeBox = deps.measureWardrobeLocalBox(App);
  const floorY = wardrobeBox
    ? Math.max(0, Number(wardrobeBox.centerY) - Number(wardrobeBox.height) / 2)
    : NaN;
  if (!isNoMainWardrobeSketchMode(App) && isBlockedFreeBoxAddHover(hoverRec, wardrobeBox)) {
    deps.clearSketchHover(App);
    return false;
  }
  const commit = deps.commitSketchFreePlacementHoverRecord({
    App,
    host,
    hoverRec,
    freeBoxContentKind: deps.getSketchFreeBoxContentKind(tool),
    floorY,
  });
  if (!commit.committed) return false;
  if (commit.nextHover) deps.writeSketchHover(App, commit.nextHover);
  else deps.clearSketchHover(App);
  return true;
}

export function tryCommitSketchFreePlacementFromHover(App: AppContainer, manualTool: unknown): boolean {
  return tryCommitSketchFreePlacementFromHoverWithDeps(App, manualTool, {
    matchRecentSketchHover,
    commitSketchFreePlacementHoverRecord,
    pickSketchFreeBoxHost,
    getSketchFreeBoxContentKind,
    measureWardrobeLocalBox: __wp_measureWardrobeLocalBox,
    readSketchHover: __wp_readSketchHover,
    writeSketchHover: __wp_writeSketchHover,
    clearSketchHover: __wp_clearSketchHover,
    toModuleKey: __wp_toModuleKey,
  });
}
