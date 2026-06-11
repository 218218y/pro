import type { AppContainer } from '../../../types';
import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import { readManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  parseSketchExtDrawerCount,
  parseSketchExtDrawerHeightM,
  parseSketchIntDrawerHeightM,
} from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import {
  commitSketchModuleExternalDrawerStack,
  commitSketchModuleInternalDrawerStack,
} from './canvas_picking_sketch_module_stack_commit.js';
import {
  commitSketchModuleBoxContent,
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
} from './canvas_picking_sketch_box_content_commit.js';

type RecordMap = Record<string, unknown>;

type CommitSketchModuleStackToolArgs = {
  App: AppContainer;
  cfg: RecordMap;
  tool: string;
  hoverOk: boolean;
  hoverRec: RecordMap;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  hitYClamped: number;
  hoverHost: ManualLayoutSketchHoverHost;
  writeSketchHover: (App: AppContainer, nextHover: RecordMap | null) => void;
};

export function tryCommitSketchModuleStackTool(args: CommitSketchModuleStackToolArgs): boolean {
  const isDrawers = isSketchInternalDrawersTool(args.tool);
  const isExtDrawers = args.tool.startsWith('sketch_ext_drawers:');
  if (!isDrawers && !isExtDrawers) return false;

  const boxContentHover = args.hoverOk ? readManualLayoutSketchBoxContentHoverIntent(args.hoverRec) : null;
  const hoverContentKind =
    boxContentHover && !boxContentHover.freePlacement ? boxContentHover.contentKind : '';
  const hoverBoxId = boxContentHover && !boxContentHover.freePlacement ? boxContentHover.boxId : '';

  if (isDrawers && hoverContentKind === 'drawers' && hoverBoxId) {
    const boxes = ensureSketchModuleBoxes(args.cfg);
    const box = findSketchModuleBoxById(boxes, hoverBoxId, { freePlacement: false });
    if (!box) return true;
    const nextHover = commitSketchModuleBoxContent({
      box,
      boxId: hoverBoxId,
      contentKind: 'drawers',
      hoverRec: args.hoverRec,
      hoverMode: 'manual-toggle',
      hoverHost: args.hoverHost,
    });
    args.writeSketchHover(args.App, nextHover);
    return true;
  }

  if (isExtDrawers && hoverContentKind === 'ext_drawers' && hoverBoxId) {
    const boxes = ensureSketchModuleBoxes(args.cfg);
    const box = findSketchModuleBoxById(boxes, hoverBoxId, { freePlacement: false });
    if (!box) return true;
    const nextHover = commitSketchModuleBoxContent({
      box,
      boxId: hoverBoxId,
      contentKind: 'ext_drawers',
      hoverRec: args.hoverRec,
      hoverMode: 'manual-toggle',
      hoverHost: args.hoverHost,
    });
    args.writeSketchHover(args.App, nextHover);
    return true;
  }

  if (isDrawers) {
    const nextHover = commitSketchModuleInternalDrawerStack({
      cfg: args.cfg,
      hoverRec: args.hoverRec,
      hoverOk: args.hoverOk,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      pad: args.pad,
      drawerHeightM: parseSketchIntDrawerHeightM(args.tool),
      hitYClamped: args.hitYClamped,
      hoverHost: args.hoverHost,
    });
    args.writeSketchHover(args.App, nextHover);
    return true;
  }

  const nextHover = commitSketchModuleExternalDrawerStack({
    cfg: args.cfg,
    hoverRec: args.hoverRec,
    hoverOk: args.hoverOk,
    requestedDrawerCount: parseSketchExtDrawerCount(args.tool),
    drawerHeightM: parseSketchExtDrawerHeightM(args.tool),
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    hitYClamped: args.hitYClamped,
    hoverHost: args.hoverHost,
  });
  args.writeSketchHover(args.App, nextHover);
  return true;
}
