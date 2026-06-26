import type { SketchModuleBoxContentLike } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { ManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  createRandomId,
  ensureSketchBoxContentList,
} from './canvas_picking_sketch_box_content_commit_boxes.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';
import { buildToggleHoverRecord } from './canvas_picking_sketch_box_content_commit_toggle.js';
import { inferSketchStackVerticalAnchorFromNormalizedItem } from '../features/sketch_stack_positioning.js';
import {
  markSketchInternalDrawersDirty,
  resolveSketchInternalDrawerMetrics,
} from '../features/sketch_drawer_sizing.js';
import {
  removeSketchShelvesOverlappingInternalDrawerCassette,
  resolveInternalDrawerCassetteMetrics,
  resolveInternalDrawerCassettePanelThickness,
} from '../features/sketch_internal_drawer_cassette.js';
import {
  SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND,
  SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY,
  createSketchBoxRegularExternalDrawerItem,
  normalizeSketchBoxRegularExternalDrawerCount,
  normalizeStoredSketchBoxRegularExternalDrawerCount,
  removeSketchBoxRegularExternalDrawersInCell,
} from '../features/sketch_box_regular_external_drawers.js';

function readPositiveNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function removeBoxShelvesForInternalDrawerCassette(args: {
  box: Record<string, unknown>;
  item: SketchModuleBoxContentLike;
  stackH: number | null;
  drawerHeightM: number | null;
  woodThick: unknown;
}): void {
  const shelves = Array.isArray(args.box.shelves) ? args.box.shelves : null;
  if (!shelves?.length) return;
  const boxH = readPositiveNumber(args.box.heightM);
  if (boxH == null) return;
  const stackH =
    readPositiveNumber(args.stackH) ??
    resolveSketchInternalDrawerMetrics({
      drawerHeightM: args.drawerHeightM ?? undefined,
      availableHeightM: boxH,
    }).stackH;
  if (!(stackH > 0)) return;
  const centerNorm = readFiniteNumber(args.item.yNormC);
  const baseNorm = readFiniteNumber(args.item.yNorm);
  const baseY =
    baseNorm != null ? Math.max(0, Math.min(1, baseNorm)) * boxH : (centerNorm ?? 0.5) * boxH - stackH / 2;
  const cassetteMetrics = resolveInternalDrawerCassetteMetrics({
    baseY,
    drawerStackH: stackH,
    panelThicknessM: resolveInternalDrawerCassettePanelThickness(args.woodThick),
  });
  removeSketchShelvesOverlappingInternalDrawerCassette({
    shelves,
    cassetteMinY: cassetteMetrics.minY,
    cassetteMaxY: cassetteMetrics.maxY,
    bottomY: 0,
    spanH: boxH,
    woodThick: args.woodThick,
    xNorm: readFiniteNumber(args.item.xNorm),
    matchXNorm: true,
  });
}

function clampNorm(value: number | null, defaultValue: number): number {
  return value != null ? Math.max(0, Math.min(1, value)) : defaultValue;
}

function removeBoxContentById(list: SketchModuleBoxContentLike[], removeId: string): boolean {
  if (!removeId) return false;
  const idx = list.findIndex(it => it.id != null && String(it.id) === removeId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  return true;
}

function removeBoxContentFromExistingList(
  box: Record<string, unknown>,
  key: string,
  removeId: string
): boolean {
  const raw = box[key];
  return Array.isArray(raw) ? removeBoxContentById(raw as SketchModuleBoxContentLike[], removeId) : false;
}

function removeSketchExternalDrawerContentById(args: {
  box: Record<string, unknown>;
  extDrawers: SketchModuleBoxContentLike[];
  removeId: string;
}): boolean {
  return (
    removeBoxContentById(args.extDrawers, args.removeId) ||
    removeBoxContentFromExistingList(args.box, SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY, args.removeId)
  );
}

function findBoxContentById(
  list: SketchModuleBoxContentLike[],
  itemId: string
): SketchModuleBoxContentLike | null {
  if (!itemId) return null;
  return list.find(it => it.id != null && String(it.id) === itemId) || null;
}

function upsertRegularExternalDrawerItem(args: {
  list: SketchModuleBoxContentLike[];
  box: Record<string, unknown>;
  removeId: string;
  contentXNorm: number | null;
  boxYNorm: number | null;
  boxBaseYNorm: number | null;
  drawerCount: number;
  hasShoeDrawer: boolean;
}): SketchModuleBoxContentLike | null {
  if (args.drawerCount <= 0 && !args.hasShoeDrawer) {
    removeBoxContentById(args.list, args.removeId);
    return null;
  }

  const existing = findBoxContentById(args.list, args.removeId);
  const item = createSketchBoxRegularExternalDrawerItem({
    id: existing?.id != null && String(existing.id) ? String(existing.id) : createRandomId('sbrd'),
    xNorm: args.contentXNorm ?? (existing?.xNorm as number | null | undefined),
    yNormC: args.boxYNorm ?? (existing?.yNormC as number | null | undefined),
    yNorm: args.boxBaseYNorm ?? (existing?.yNorm as number | null | undefined),
    count: args.drawerCount,
    hasShoeDrawer: args.hasShoeDrawer,
  }) as SketchModuleBoxContentLike;

  removeSketchBoxRegularExternalDrawersInCell(
    args.box,
    {
      xNorm: item.xNorm as number | null,
      yNormC: item.yNormC as number | null,
    },
    String(item.id)
  );

  const targetList = Array.isArray(args.box[SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY])
    ? (args.box[SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY] as SketchModuleBoxContentLike[])
    : args.list;
  const current = findBoxContentById(targetList, String(item.id));
  if (current) Object.assign(current, item);
  else targetList.push(item);
  return current || item;
}

function inferCommittedBoxDrawerAnchor(args: {
  yNormC: number;
  yNorm?: number;
}): ReturnType<typeof inferSketchStackVerticalAnchorFromNormalizedItem> {
  return inferSketchStackVerticalAnchorFromNormalizedItem({
    item: { yNormC: args.yNormC, yNorm: args.yNorm },
    stackH: 0,
    totalHeight: 1,
  });
}

function buildDrawerItem(args: {
  idPrefix: string;
  boxYNorm: number | null;
  boxBaseYNorm: number | null;
  contentXNorm: number | null;
  drawerCount?: number;
  drawerHeightM?: number | null;
  stackH?: number | null;
}): SketchModuleBoxContentLike {
  const yNormC = clampNorm(args.boxYNorm, 0.5);
  const yNorm = args.boxBaseYNorm != null ? clampNorm(args.boxBaseYNorm, 0.5) : undefined;
  const item: SketchModuleBoxContentLike = {
    id: createRandomId(args.idPrefix),
    yNormC,
    yNorm,
    yAnchor: inferCommittedBoxDrawerAnchor({ yNormC, yNorm }),
  };
  if (args.contentXNorm != null) item.xNorm = clampNorm(args.contentXNorm, 0.5);
  if (args.drawerCount != null) item.count = args.drawerCount;
  if (args.drawerHeightM != null && Number.isFinite(args.drawerHeightM) && args.drawerHeightM > 0) {
    item.drawerHeightM = args.drawerHeightM;
  }
  return item;
}

export function tryCommitSketchBoxDrawerContent(args: {
  commitArgs: CommitSketchModuleBoxContentArgs;
  hoverIntent: ManualLayoutSketchBoxContentHoverIntent | null;
  hoverOp: 'add' | 'remove';
}): { handled: boolean; nextHover: Record<string, unknown> | null } {
  const { commitArgs, hoverIntent, hoverOp } = args;
  const hoverMode = commitArgs.hoverMode || 'none';
  const hoverHost = commitArgs.hoverHost || null;
  const boxId = commitArgs.boxId;
  const contentXNorm = hoverIntent?.contentXNorm ?? null;
  const boxYNorm = hoverIntent?.boxYNorm ?? null;
  const boxBaseYNorm = hoverIntent?.boxBaseYNorm ?? null;
  const removeId = hoverIntent?.removeId || '';
  const drawerHeightM = hoverIntent?.drawerHeightM ?? hoverIntent?.drawerH ?? null;
  const drawerH = hoverIntent?.drawerH ?? drawerHeightM;
  const stackH = hoverIntent?.stackH ?? null;

  if (commitArgs.contentKind === 'drawers') {
    const list = ensureSketchBoxContentList(commitArgs.box, 'drawers');
    if (hoverOp === 'remove') {
      removeBoxContentById(list, removeId);
      if (commitArgs.cfg) markSketchInternalDrawersDirty(commitArgs.cfg);
      return {
        handled: true,
        nextHover: buildToggleHoverRecord({
          hoverMode,
          hoverRec: commitArgs.hoverRec,
          hoverHost,
          boxId,
          contentKind: 'drawers',
          op: 'add',
          removeId: '',
          drawerHeightM,
          drawerH,
        }),
      };
    }

    const item = buildDrawerItem({
      idPrefix: 'sd',
      boxYNorm,
      boxBaseYNorm,
      contentXNorm,
      drawerHeightM,
      stackH,
    });
    removeBoxShelvesForInternalDrawerCassette({
      box: commitArgs.box as Record<string, unknown>,
      item,
      stackH,
      drawerHeightM,
      woodThick: (commitArgs.hoverRec as Record<string, unknown>).woodThick,
    });
    list.push(item);
    if (commitArgs.cfg) markSketchInternalDrawersDirty(commitArgs.cfg);
    return {
      handled: true,
      nextHover: buildToggleHoverRecord({
        hoverMode,
        hoverRec: commitArgs.hoverRec,
        hoverHost,
        boxId,
        contentKind: 'drawers',
        op: 'remove',
        removeId: String(item.id),
        drawerHeightM,
        drawerH,
      }),
    };
  }

  if (commitArgs.contentKind === 'ext_drawers') {
    const list = ensureSketchBoxContentList(commitArgs.box, 'extDrawers');
    const drawerCountRaw = hoverIntent?.drawerCount ?? null;
    const drawerCount = drawerCountRaw != null ? Math.max(1, Math.min(5, Math.floor(drawerCountRaw))) : 1;
    if (hoverOp === 'remove') {
      removeSketchExternalDrawerContentById({
        box: commitArgs.box as Record<string, unknown>,
        extDrawers: list,
        removeId,
      });
      return {
        handled: true,
        nextHover: buildToggleHoverRecord({
          hoverMode,
          hoverRec: commitArgs.hoverRec,
          hoverHost,
          boxId,
          contentKind: 'ext_drawers',
          op: 'add',
          removeId: '',
          drawerCount,
          drawerHeightM,
          drawerH,
        }),
      };
    }

    const item = buildDrawerItem({
      idPrefix: 'sed',
      boxYNorm,
      boxBaseYNorm,
      contentXNorm,
      drawerCount,
      drawerHeightM,
      stackH,
    });
    list.push(item);
    return {
      handled: true,
      nextHover: buildToggleHoverRecord({
        hoverMode,
        hoverRec: commitArgs.hoverRec,
        hoverHost,
        boxId,
        contentKind: 'ext_drawers',
        op: 'remove',
        removeId: String(item.id),
        drawerCount,
        drawerHeightM,
        drawerH,
      }),
    };
  }

  if (commitArgs.contentKind === SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND) {
    const list = ensureSketchBoxContentList(commitArgs.box, SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY);
    const hasExplicitShoe = hoverIntent?.hasShoeDrawer != null;
    const hasShoeDrawer = hasExplicitShoe ? hoverIntent?.hasShoeDrawer === true : false;
    const drawerCount = hasExplicitShoe
      ? normalizeStoredSketchBoxRegularExternalDrawerCount(hoverIntent?.drawerCount ?? null)
      : normalizeSketchBoxRegularExternalDrawerCount(hoverIntent?.drawerCount ?? null);

    if (!hasExplicitShoe && hoverOp === 'remove') {
      removeBoxContentById(list, removeId);
      return {
        handled: true,
        nextHover: buildToggleHoverRecord({
          hoverMode,
          hoverRec: commitArgs.hoverRec,
          hoverHost,
          boxId,
          contentKind: SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND,
          op: 'add',
          removeId: '',
          drawerCount,
          drawerHeightM,
          drawerH,
        }),
      };
    }

    const item = upsertRegularExternalDrawerItem({
      list,
      box: commitArgs.box as Record<string, unknown>,
      removeId,
      contentXNorm,
      boxYNorm,
      boxBaseYNorm,
      drawerCount,
      hasShoeDrawer,
    });

    return {
      handled: true,
      nextHover: item
        ? buildToggleHoverRecord({
            hoverMode,
            hoverRec: commitArgs.hoverRec,
            hoverHost,
            boxId,
            contentKind: SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND,
            op: 'remove',
            removeId: String(item.id),
            drawerCount,
            drawerHeightM,
            drawerH,
          })
        : buildToggleHoverRecord({
            hoverMode,
            hoverRec: commitArgs.hoverRec,
            hoverHost,
            boxId,
            contentKind: SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND,
            op: 'add',
            removeId: '',
            drawerCount,
            drawerHeightM,
            drawerH,
          }),
    };
  }

  return { handled: false, nextHover: null };
}
