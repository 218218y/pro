import type { AppContainer } from '../../../types';
import { matchRecentSketchHover } from './canvas_picking_sketch_hover_matching.js';
import { commitSketchFreePlacementHoverRecord } from './canvas_picking_sketch_free_commit.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { pickSketchFreeBoxHost } from './canvas_picking_sketch_free_boxes.js';
import { getSketchFreeBoxContentKind } from './canvas_picking_sketch_box_dividers.js';
import {
  __wp_measureWardrobeLocalBox,
  __wp_readSketchHover,
  __wp_writeSketchHover,
  __wp_clearSketchHover,
} from './canvas_picking_projection_runtime.js';

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
