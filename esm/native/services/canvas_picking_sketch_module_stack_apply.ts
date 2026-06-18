import type { AppContainer } from '../../../types';
import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import {
  readManualLayoutSketchBoxContentHoverIntent,
  readManualLayoutSketchStackHoverIntent,
} from './canvas_picking_manual_layout_sketch_hover_intent.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';
import {
  blockRemovableSideContentBuildIfModuleSideMissing,
  blockRemovableSideContentBuildIfSketchBoxSideMissing,
} from './canvas_picking_removable_part_remove_constraints.js';
import {
  HEX_CELL_DRAWER_ADD_BLOCKED_MESSAGE,
  shouldBlockDrawerBuildInHexCell,
} from '../features/hex_cell/index.js';
import {
  parseSketchExtDrawerCount,
  parseSketchExtDrawerHeightM,
  parseSketchIntDrawerHeightM,
} from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import {
  isSketchInternalDrawersTool,
  resolveSketchExternalDrawerFit,
  resolveSketchInternalDrawerFit,
} from '../features/sketch_drawer_sizing.js';
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
  woodThick?: number;
  hitYClamped: number;
  hoverHost: ManualLayoutSketchHoverHost;
  writeSketchHover: (App: AppContainer, nextHover: RecordMap | null) => void;
};

function readPositiveNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatHeightCm(heightM: number): string {
  const rounded = Math.round(heightM * 1000) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function toastSketchDrawerFitFailure(args: {
  App: AppContainer;
  contentKind: 'drawers' | 'ext_drawers';
  drawerCount: number;
  drawerHeightM: number;
}): void {
  const heightCm = formatHeightCm(args.drawerHeightM);
  if (args.contentKind === 'ext_drawers') {
    __wp_toast(
      args.App,
      `אין מקום בארון זה ל-${args.drawerCount} מגירות חיצוניות לפי סקיצה בגובה ${heightCm} ס"מ.`,
      'error'
    );
    return;
  }
  __wp_toast(args.App, `אין מקום בארון זה ל-2 מגירות פנימיות בגובה ${heightCm} ס"מ.`, 'error');
}

function toastSketchDrawerCollisionFailure(args: {
  App: AppContainer;
  contentKind: 'drawers' | 'ext_drawers';
}): void {
  const label = args.contentKind === 'ext_drawers' ? 'מגירות חיצוניות לפי סקיצה' : 'מגירות פנימיות';
  __wp_toast(
    args.App,
    `אין מקום פנוי בארון זה ל-${label}, כי הן מתנגשות במגירות קיימות או בפריטים קיימים.`,
    'error'
  );
}

function sketchStackFitsTarget(args: {
  contentKind: 'drawers' | 'ext_drawers';
  drawerCount: number;
  drawerHeightM: number;
  availableHeightM: number;
}): boolean {
  if (args.contentKind === 'ext_drawers') {
    return resolveSketchExternalDrawerFit({
      drawerCount: args.drawerCount,
      drawerHeightM: args.drawerHeightM,
      availableHeightM: args.availableHeightM,
    }).fits;
  }
  return resolveSketchInternalDrawerFit({
    drawerHeightM: args.drawerHeightM,
    availableHeightM: args.availableHeightM,
  }).fits;
}

function blockSketchBoxStackCommitIfRemovedSide(args: {
  App: AppContainer;
  cfg: RecordMap;
  box: RecordMap;
  hoverHost: ManualLayoutSketchHoverHost;
  writeSketchHover: CommitSketchModuleStackToolArgs['writeSketchHover'];
}): boolean {
  if (
    !blockRemovableSideContentBuildIfSketchBoxSideMissing({
      App: args.App,
      cfg: args.cfg,
      box: args.box,
      moduleKey: args.hoverHost.moduleKey,
      isBottomStack: args.hoverHost.isBottom,
      freePlacement: false,
    })
  ) {
    return false;
  }
  args.writeSketchHover(args.App, null);
  return true;
}

function blockSketchStackCommitIfRemovedFrameSide(args: {
  App: AppContainer;
  hoverHost: ManualLayoutSketchHoverHost;
  writeSketchHover: CommitSketchModuleStackToolArgs['writeSketchHover'];
}): boolean {
  if (
    !blockRemovableSideContentBuildIfModuleSideMissing({
      App: args.App,
      moduleKey: args.hoverHost.moduleKey,
      isBottomStack: args.hoverHost.isBottom,
    })
  ) {
    return false;
  }
  args.writeSketchHover(args.App, null);
  return true;
}

function blockSketchStackCommitIfHexCell(args: {
  App: AppContainer;
  cfg: RecordMap;
  writeSketchHover: CommitSketchModuleStackToolArgs['writeSketchHover'];
}): boolean {
  if (!shouldBlockDrawerBuildInHexCell(args.cfg)) return false;
  __wp_toast(args.App, HEX_CELL_DRAWER_ADD_BLOCKED_MESSAGE, 'error');
  args.writeSketchHover(args.App, null);
  return true;
}

function blockSketchStackCommitIfNoRoom(args: {
  App: AppContainer;
  contentKind: 'drawers' | 'ext_drawers';
  drawerCount: number;
  drawerHeightM: number;
  availableHeightM: number;
  writeSketchHover: CommitSketchModuleStackToolArgs['writeSketchHover'];
}): boolean {
  if (
    sketchStackFitsTarget({
      contentKind: args.contentKind,
      drawerCount: args.drawerCount,
      drawerHeightM: args.drawerHeightM,
      availableHeightM: args.availableHeightM,
    })
  ) {
    return false;
  }
  toastSketchDrawerFitFailure({
    App: args.App,
    contentKind: args.contentKind,
    drawerCount: args.drawerCount,
    drawerHeightM: args.drawerHeightM,
  });
  args.writeSketchHover(args.App, null);
  return true;
}

function blockSketchStackCommitIfCollision(args: {
  App: AppContainer;
  contentKind: 'drawers' | 'ext_drawers';
  blockedReason?: string | null;
  writeSketchHover: CommitSketchModuleStackToolArgs['writeSketchHover'];
}): boolean {
  if (args.blockedReason !== 'collision') return false;
  toastSketchDrawerCollisionFailure({ App: args.App, contentKind: args.contentKind });
  args.writeSketchHover(args.App, null);
  return true;
}

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
    if (
      boxContentHover?.op !== 'remove' &&
      blockSketchBoxStackCommitIfRemovedSide({
        App: args.App,
        cfg: args.cfg,
        box,
        hoverHost: args.hoverHost,
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    if (
      boxContentHover?.op !== 'remove' &&
      blockSketchBoxStackCommitIfRemovedSide({
        App: args.App,
        cfg: args.cfg,
        box,
        hoverHost: args.hoverHost,
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    if (
      boxContentHover?.op !== 'remove' &&
      blockSketchStackCommitIfHexCell({
        App: args.App,
        cfg: args.cfg,
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    if (
      boxContentHover?.op !== 'remove' &&
      blockSketchStackCommitIfCollision({
        App: args.App,
        contentKind: 'drawers',
        blockedReason: boxContentHover?.blockedReason,
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    if (
      boxContentHover?.op !== 'remove' &&
      blockSketchStackCommitIfNoRoom({
        App: args.App,
        contentKind: 'drawers',
        drawerCount: 2,
        drawerHeightM: parseSketchIntDrawerHeightM(args.tool),
        availableHeightM: Math.max(0, (readPositiveNumber(box.heightM) ?? 0) - args.pad * 2),
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    const nextHover = commitSketchModuleBoxContent({
      App: args.App,
      cfg: args.cfg,
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
    if (
      boxContentHover?.op !== 'remove' &&
      blockSketchStackCommitIfHexCell({
        App: args.App,
        cfg: args.cfg,
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    if (
      boxContentHover?.op !== 'remove' &&
      blockSketchStackCommitIfCollision({
        App: args.App,
        contentKind: 'ext_drawers',
        blockedReason: boxContentHover?.blockedReason,
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    if (
      boxContentHover?.op !== 'remove' &&
      blockSketchStackCommitIfNoRoom({
        App: args.App,
        contentKind: 'ext_drawers',
        drawerCount: parseSketchExtDrawerCount(args.tool),
        drawerHeightM: parseSketchExtDrawerHeightM(args.tool),
        availableHeightM: Math.max(0, (readPositiveNumber(box.heightM) ?? 0) - args.pad * 3),
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    const nextHover = commitSketchModuleBoxContent({
      App: args.App,
      cfg: args.cfg,
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
    const stackHover = args.hoverOk ? readManualLayoutSketchStackHoverIntent(args.hoverRec) : null;
    const drawerHeightM = parseSketchIntDrawerHeightM(args.tool);
    if (
      stackHover?.op !== 'remove' &&
      blockSketchStackCommitIfRemovedFrameSide({
        App: args.App,
        hoverHost: args.hoverHost,
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    if (
      stackHover?.op !== 'remove' &&
      blockSketchStackCommitIfHexCell({
        App: args.App,
        cfg: args.cfg,
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    if (
      stackHover?.op !== 'remove' &&
      blockSketchStackCommitIfCollision({
        App: args.App,
        contentKind: 'drawers',
        blockedReason: stackHover?.blockedReason,
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    if (
      stackHover?.op !== 'remove' &&
      blockSketchStackCommitIfNoRoom({
        App: args.App,
        contentKind: 'drawers',
        drawerCount: 2,
        drawerHeightM,
        availableHeightM: Math.max(0, args.topY - args.bottomY - args.pad * 2),
        writeSketchHover: args.writeSketchHover,
      })
    ) {
      return true;
    }
    const nextHover = commitSketchModuleInternalDrawerStack({
      cfg: args.cfg,
      hoverRec: args.hoverRec,
      hoverOk: args.hoverOk,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      pad: args.pad,
      woodThick: args.woodThick,
      drawerHeightM,
      hitYClamped: args.hitYClamped,
      hoverHost: args.hoverHost,
    });
    if (stackHover?.op !== 'remove' && nextHover == null) {
      toastSketchDrawerCollisionFailure({ App: args.App, contentKind: 'drawers' });
    }
    args.writeSketchHover(args.App, nextHover);
    return true;
  }

  const stackHover = args.hoverOk ? readManualLayoutSketchStackHoverIntent(args.hoverRec) : null;
  const drawerHeightM = parseSketchExtDrawerHeightM(args.tool);
  const requestedDrawerCount = parseSketchExtDrawerCount(args.tool);
  if (
    stackHover?.op !== 'remove' &&
    blockSketchStackCommitIfRemovedFrameSide({
      App: args.App,
      hoverHost: args.hoverHost,
      writeSketchHover: args.writeSketchHover,
    })
  ) {
    return true;
  }
  if (
    stackHover?.op !== 'remove' &&
    blockSketchStackCommitIfHexCell({
      App: args.App,
      cfg: args.cfg,
      writeSketchHover: args.writeSketchHover,
    })
  ) {
    return true;
  }
  if (
    stackHover?.op !== 'remove' &&
    blockSketchStackCommitIfCollision({
      App: args.App,
      contentKind: 'ext_drawers',
      blockedReason: stackHover?.blockedReason,
      writeSketchHover: args.writeSketchHover,
    })
  ) {
    return true;
  }
  if (
    stackHover?.op !== 'remove' &&
    blockSketchStackCommitIfNoRoom({
      App: args.App,
      contentKind: 'ext_drawers',
      drawerCount: requestedDrawerCount,
      drawerHeightM,
      availableHeightM: Math.max(0, args.topY - args.bottomY),
      writeSketchHover: args.writeSketchHover,
    })
  ) {
    return true;
  }
  const nextHover = commitSketchModuleExternalDrawerStack({
    cfg: args.cfg,
    hoverRec: args.hoverRec,
    hoverOk: args.hoverOk,
    requestedDrawerCount,
    drawerHeightM,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    woodThick: args.woodThick,
    hitYClamped: args.hitYClamped,
    hoverHost: args.hoverHost,
  });
  if (stackHover?.op !== 'remove' && nextHover == null) {
    toastSketchDrawerCollisionFailure({ App: args.App, contentKind: 'ext_drawers' });
  }
  args.writeSketchHover(args.App, nextHover);
  return true;
}
