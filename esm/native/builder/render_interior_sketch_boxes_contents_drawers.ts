import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { RenderSketchBoxContentsArgs } from './render_interior_sketch_boxes_shared.js';
import type {
  SketchDrawerExtra,
  SketchExternalDrawerExtra,
  SketchInternalDrawerOp,
} from './render_interior_sketch_shared.js';

import { asRecordArray } from './render_interior_sketch_shared.js';
import { readSketchBoxRegularExternalDrawersForRender } from '../features/sketch_box_regular_external_drawers.js';
import { asRecord as readRecord } from '../runtime/record.js';
import {
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  readSketchDrawerHeightMFromItem,
  resolveSketchInternalDrawerMetrics,
  sketchStackFitsAvailableHeight,
} from '../features/sketch_drawer_sizing.js';
import { resolveSketchStackCenterYFromNormalizedItem } from '../features/sketch_stack_positioning.js';
import { hasSketchDrawerDivider } from './render_interior_sketch_drawer_dividers.js';
import {
  resolveSketchBoxUsableContentCenterZ,
  resolveSketchBoxUsableContentDepth,
} from './render_interior_sketch_boxes_contents_depth.js';
import {
  buildSketchExternalDrawerCollisionRanges,
  sketchStackRangeOverlaps,
} from './render_interior_sketch_stack_collision.js';
import {
  pickSketchBoxVerticalSegment,
  resolveSketchBoxVerticalSegments,
  type SketchBoxSegment,
  type SketchBoxVerticalSegment,
} from './render_interior_sketch_layout.js';

function readFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function shouldRenderBoxInternalDrawers(input: RenderSketchBoxContentsArgs['args']['input']): boolean {
  return input.isInternalDrawersEnabled;
}

function readDrawerCenterNorm(item: unknown): number | null {
  const rec = readRecord(item);
  if (!rec) return null;
  return readFiniteNumber(rec.yNormC) ?? readFiniteNumber(rec.yNorm);
}

function resolveDrawerVerticalSegment(args: {
  item: unknown;
  shell: RenderSketchBoxContentsArgs['shell'];
  boxDividers: RenderSketchBoxContentsArgs['boxDividers'];
  boxHorizontalDividers: RenderSketchBoxContentsArgs['boxHorizontalDividers'];
  woodThick: number;
}): SketchBoxVerticalSegment | null {
  const boxHorizontalDividers = Array.isArray(args.boxHorizontalDividers) ? args.boxHorizontalDividers : [];
  if (!boxHorizontalDividers.length) return null;
  const yNorm = readDrawerCenterNorm(args.item);
  if (yNorm == null) return null;
  const rec = readRecord(args.item);
  const verticalSegments = resolveSketchBoxVerticalSegments({
    dividers: boxHorizontalDividers,
    verticalDividers: Array.isArray(args.boxDividers) ? args.boxDividers : [],
    boxCenterX: args.shell.geometry.centerX,
    innerW: args.shell.geometry.innerW,
    boxCenterY: args.shell.centerY,
    innerH: args.shell.sideH,
    woodThick: args.woodThick,
    xNorm: rec?.xNorm,
  });
  return verticalSegments.length
    ? pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: args.shell.centerY,
        innerH: args.shell.sideH,
        yNorm,
      })
    : null;
}

function itemMatchesDrawerCell(args: {
  item: unknown;
  activeSegment: SketchBoxSegment | null;
  activeVerticalSegment: SketchBoxVerticalSegment | null;
  resolveBoxDrawerSpan: RenderSketchBoxContentsArgs['resolveBoxDrawerSpan'];
  shell: RenderSketchBoxContentsArgs['shell'];
  boxDividers: RenderSketchBoxContentsArgs['boxDividers'];
  boxHorizontalDividers: RenderSketchBoxContentsArgs['boxHorizontalDividers'];
  woodThick: number;
}): boolean {
  const rec = readRecord(args.item);
  if (!rec) return false;
  if (args.activeSegment) {
    const itemSegment = args.resolveBoxDrawerSpan(rec).segment;
    if (!itemSegment || itemSegment.index !== args.activeSegment.index) return false;
  }
  if (args.activeVerticalSegment) {
    const itemVerticalSegment = resolveDrawerVerticalSegment({
      item: args.item,
      shell: args.shell,
      boxDividers: args.boxDividers,
      boxHorizontalDividers: args.boxHorizontalDividers,
      woodThick: args.woodThick,
    });
    if (!itemVerticalSegment || itemVerticalSegment.index !== args.activeVerticalSegment.index) return false;
  }
  return true;
}

export function renderSketchBoxDrawerContents(args: RenderSketchBoxContentsArgs): void {
  const { shell, resolveBoxDrawerSpan } = args;
  const {
    App,
    input,
    group,
    woodThick,
    moduleIndex,
    THREE,
    isFn,
    renderOpsHandleCatch,
    applyInternalDrawersOps,
    getPartMaterial,
  } = args.args;
  const { box, boxPid, centerY, height, halfH, boxMat, innerBottomY, innerTopY } = shell;
  const usableContentDepth = resolveSketchBoxUsableContentDepth({
    shell,
    input,
    woodThick,
  });
  const boxDrawers = shouldRenderBoxInternalDrawers(input)
    ? asRecordArray<SketchDrawerExtra>(box.drawers)
    : [];
  const boxExtDrawers = asRecordArray<SketchExternalDrawerExtra>(box.extDrawers).concat(
    readSketchBoxRegularExternalDrawersForRender(box) as SketchExternalDrawerExtra[]
  );
  const drawerDims = DRAWER_DIMENSIONS.sketch;
  if (!boxDrawers.length) return;

  try {
    const createInternalDrawerBox = input.createInternalDrawerBox;
    const addOutlines = input.addOutlines;
    const showContentsEnabled = !!input.showContentsEnabled;
    const addFoldedClothes = input.addFoldedClothes;

    if (!(isFn(createInternalDrawerBox) && THREE)) return;

    const drawerOps: SketchInternalDrawerOp[] = [];
    const moduleKeyForUd: string | number = input.moduleKey != null ? String(input.moduleKey) : moduleIndex;
    for (let drawerIndex = 0; drawerIndex < boxDrawers.length; drawerIndex++) {
      const drawer = boxDrawers[drawerIndex] || null;
      if (!drawer) continue;
      const spanSource = readRecord(drawer);
      if (!spanSource) continue;
      const span = resolveBoxDrawerSpan(spanSource);
      const verticalSegment = resolveDrawerVerticalSegment({
        item: drawer,
        shell,
        boxDividers: args.boxDividers,
        boxHorizontalDividers: args.boxHorizontalDividers,
        woodThick,
      });
      const cellBottomY = verticalSegment ? verticalSegment.bottomY : innerBottomY;
      const cellTopY = verticalSegment ? verticalSegment.topY : innerTopY;
      const availableStackHeightM = Math.max(0, cellTopY - cellBottomY);
      const metrics = resolveSketchInternalDrawerMetrics({
        drawerHeightM: readSketchDrawerHeightMFromItem(drawer, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M),
      });
      const singleDrawerH = metrics.drawerH;
      const drawerGap = metrics.drawerGap;
      const stackH = metrics.stackH;
      if (!sketchStackFitsAvailableHeight(stackH, availableStackHeightM)) continue;
      const clampBaseY = (y: number) => {
        const lo = cellBottomY;
        const hi = cellTopY - stackH;
        return Math.max(lo, Math.min(hi, y));
      };
      const centerY0 = resolveSketchStackCenterYFromNormalizedItem({
        item: drawer,
        bottomY: centerY - halfH,
        topY: centerY + halfH,
        totalHeight: height,
        stackH,
        pad: woodThick,
      });
      const baseY0: number | null = centerY0 == null ? null : centerY0 - stackH / 2;
      if (baseY0 == null) continue;
      const baseY = clampBaseY(baseY0);
      const externalBlockers = buildSketchExternalDrawerCollisionRanges({
        extDrawers: boxExtDrawers.filter(extDrawer =>
          itemMatchesDrawerCell({
            item: extDrawer,
            activeSegment: span.segment,
            activeVerticalSegment: verticalSegment,
            resolveBoxDrawerSpan,
            shell,
            boxDividers: args.boxDividers,
            boxHorizontalDividers: args.boxHorizontalDividers,
            woodThick,
          })
        ),
        bottomY: centerY - halfH,
        topY: centerY + halfH,
        totalHeight: height,
        pad: woodThick,
      });
      if (
        sketchStackRangeOverlaps(
          {
            id: drawer.id != null ? String(drawer.id) : String(drawerIndex),
            minY: baseY,
            maxY: baseY + stackH,
          },
          externalBlockers
        )
      ) {
        continue;
      }
      const drawerIdRaw = drawer.id;
      const drawerId = drawerIdRaw != null ? String(drawerIdRaw) : String(drawerIndex);
      const stackPartId = `${boxPid}_int_drawers_${drawerId}`;
      const stackKey =
        typeof moduleKeyForUd === 'string' && moduleKeyForUd.startsWith('lower_') ? 'bottom' : 'top';
      const width = Math.max(drawerDims.internalWidthMinM, span.innerW - drawerDims.internalWidthClearanceM);
      const depth = Math.min(
        usableContentDepth,
        Math.max(drawerDims.internalDepthMinM, usableContentDepth - drawerDims.internalDepthClearanceM)
      );
      const drawerClosedZ = resolveSketchBoxUsableContentCenterZ(shell, usableContentDepth);
      const drawerBottomLift = Math.min(
        drawerDims.internalBottomLiftMaxM,
        woodThick * drawerDims.internalBottomLiftWoodRatio
      );
      for (let stackIndex = 0; stackIndex < 2; stackIndex++) {
        const drawerSlot = stackIndex === 0 ? 'lower' : 'upper';
        const partId = `${stackPartId}_${drawerSlot}`;
        const hasDivider = hasSketchDrawerDivider({ input, partId });
        const yFinal =
          stackIndex === 0
            ? baseY + singleDrawerH / 2 + drawerBottomLift
            : baseY + singleDrawerH + drawerGap + singleDrawerH / 2;
        drawerOps.push({
          kind: 'internal_drawer',
          partId,
          drawerIndex: stackIndex,
          moduleIndex: moduleKeyForUd,
          slotIndex: 0,
          width,
          height: singleDrawerH,
          depth,
          x: span.innerCenterX,
          y: yFinal,
          z: drawerClosedZ,
          openZ: drawerClosedZ + drawerDims.internalOpenOffsetZM,
          hasDivider,
          dividerKey: partId,
          sketchBoxId: shell.boxId,
          sketchModuleKey: moduleKeyForUd,
          sketchFreePlacement: shell.isFreePlacement === true,
          sketchStack: stackKey,
        });
      }
    }

    if (!drawerOps.length) return;
    applyInternalDrawersOps({
      App,
      THREE,
      ops: drawerOps,
      wardrobeGroup: group,
      createInternalDrawerBox,
      addOutlines,
      getPartMaterial,
      bodyMat: boxMat,
      showContentsEnabled,
      addFoldedClothes,
    });
  } catch (err) {
    renderOpsHandleCatch(App, 'applyInteriorSketchExtras.boxDrawers', err, undefined, {
      failFast: false,
      throttleMs: 5000,
    });
  }
}
