import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { RenderSketchBoxContentsArgs } from './render_interior_sketch_boxes_shared.js';
import type { SketchDrawerExtra, SketchInternalDrawerOp } from './render_interior_sketch_shared.js';

import { asRecordArray } from './render_interior_sketch_shared.js';
import { asRecord as readRecord } from '../runtime/record.js';
import {
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  readSketchDrawerHeightMFromItem,
  resolveSketchInternalDrawerMetrics,
} from '../features/sketch_drawer_sizing.js';

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
  const { box, boxPid, centerY, height, halfH, boxMat, geometry, innerBottomY, innerTopY } = shell;
  const boxDrawers = asRecordArray<SketchDrawerExtra>(box.drawers);
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
      const metrics = resolveSketchInternalDrawerMetrics({
        drawerHeightM: readSketchDrawerHeightMFromItem(drawer, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M),
        availableHeightM: Math.max(0, innerTopY - innerBottomY),
      });
      const singleDrawerH = metrics.drawerH;
      const drawerGap = metrics.drawerGap;
      const stackH = metrics.stackH;
      const clampBaseY = (y: number) => {
        const lo = innerBottomY;
        const hi = innerTopY - stackH;
        return Math.max(lo, Math.min(hi, y));
      };
      const clampCenterY = (yCenter: number) => {
        const lo = innerBottomY + stackH / 2;
        const hi = innerTopY - stackH / 2;
        if (!(hi > lo)) return Math.max(innerBottomY, Math.min(innerTopY, yCenter));
        return Math.max(lo, Math.min(hi, yCenter));
      };

      const nCenter = typeof drawer.yNormC === 'number' ? drawer.yNormC : Number(drawer.yNormC);
      const nBase = typeof drawer.yNorm === 'number' ? drawer.yNorm : Number(drawer.yNorm);
      let baseY0: number | null = null;
      if (Number.isFinite(nCenter)) {
        const center0 = centerY - halfH + Math.max(0, Math.min(1, nCenter)) * height;
        const clampedCenter = clampCenterY(center0);
        baseY0 = clampedCenter - stackH / 2;
      } else if (Number.isFinite(nBase)) {
        baseY0 = centerY - halfH + Math.max(0, Math.min(1, nBase)) * height;
      }
      if (baseY0 == null) continue;
      const baseY = clampBaseY(baseY0);
      const drawerIdRaw = drawer.id;
      const drawerId = drawerIdRaw != null ? String(drawerIdRaw) : String(drawerIndex);
      const partId = `${boxPid}_int_drawers_${drawerId}`;
      const spanSource = readRecord(drawer);
      if (!spanSource) continue;
      const span = resolveBoxDrawerSpan(spanSource);
      const width = Math.max(drawerDims.internalWidthMinM, span.innerW - drawerDims.internalWidthClearanceM);
      const depth = Math.max(
        drawerDims.internalDepthMinM,
        geometry.innerD - drawerDims.internalDepthClearanceM
      );
      const drawerBottomLift = Math.min(
        drawerDims.internalBottomLiftMaxM,
        woodThick * drawerDims.internalBottomLiftWoodRatio
      );
      for (let stackIndex = 0; stackIndex < 2; stackIndex++) {
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
          z: geometry.innerBackZ + geometry.innerD / 2,
          openZ: geometry.innerBackZ + geometry.innerD / 2 + drawerDims.internalOpenOffsetZM,
          hasDivider: false,
          dividerKey: partId,
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
