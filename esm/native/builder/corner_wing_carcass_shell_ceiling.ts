import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CornerWingCarcassFlowParams } from './corner_wing_carcass_shared.js';
import { addCornerHexHorizontalBoard } from './corner_wing_hex_cell_geometry.js';
import {
  type CornerWingCarcassShellMetrics,
  resolveCornerWingHorizPlacement,
} from './corner_wing_carcass_shell_metrics.js';

export function applyCornerWingCarcassCeiling(
  params: CornerWingCarcassFlowParams,
  metrics: CornerWingCarcassShellMetrics
): void {
  const { ctx, locals } = params;
  const {
    THREE,
    woodThick,
    startY,
    wingD,
    activeWidth,
    blindWidth,
    cornerConnectorActive,
    cabinetBodyHeight,
    __stackKey,
    __stackSplitUnifiedFrame,
    getCornerMat,
    bodyMat,
    addOutlines,
    wingGroup,
  } = ctx;
  const { cornerCells } = locals;

  if (cornerCells.length <= 0) return;

  // In a unified stack-split frame the physical board between the lower and
  // upper corner cabinets is emitted by the upper stack as the paintable
  // middle-floor board. Emitting the lower stack ceiling as well creates two
  // coplanar boards at the seam, which causes z-fighting once only one of them
  // receives an individual material.
  if (__stackSplitUnifiedFrame && __stackKey === 'bottom') return;

  const __wingCeilMat = getCornerMat('corner_ceil', bodyMat);
  const __wingAttachNoZFightingInsetX = cornerConnectorActive
    ? CORNER_WING_DIMENSIONS.ceiling.noZFightAttachInsetM
    : 0;

  if (metrics.__wingIsUnifiedCabinet) {
    const __hz = resolveCornerWingHorizPlacement(
      params,
      metrics,
      wingD,
      CORNER_WING_DIMENSIONS.ceiling.minDepthM
    );
    const __leftInsetX = woodThick + __wingAttachNoZFightingInsetX;
    // activeWidth is already measured up to the inside face of the right side panel.
    // Do not subtract the outer side thickness again, otherwise the roof stops one
    // board-thickness before the right side and leaves a visible air strip.
    const __rightInsetX = 0;
    const topW = Math.max(
      CORNER_WING_DIMENSIONS.ceiling.minWidthM,
      activeWidth - __leftInsetX - __rightInsetX - CORNER_WING_DIMENSIONS.ceiling.widthClearanceM
    );
    const topX = blindWidth + __leftInsetX + topW / 2;
    const topY = startY + cabinetBodyHeight - woodThick / 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(topW, woodThick, __hz.depth), __wingCeilMat);
    top.position.set(topX, topY, __hz.z);
    top.userData = {
      partId: 'corner_wing_ceil',
      moduleIndex: 'corner',
      kind: 'bodyCeil',
      __wpStack: __stackKey,
    };
    addOutlines(top);
    wingGroup.add(top);
    return;
  }

  for (const cell of cornerCells) {
    const cellD = Math.max(CORNER_WING_DIMENSIONS.selector.minDepthM, cell.depth);
    const __hz = resolveCornerWingHorizPlacement(
      params,
      metrics,
      cellD,
      CORNER_WING_DIMENSIONS.ceiling.minDepthM
    );
    const __h = Math.max(woodThick * 2, cell.bodyHeight);

    const __cellW = Math.max(CORNER_WING_DIMENSIONS.ceiling.minWidthM, cell.width);
    const __cellStartX = cell.startX;
    const __idx = cell.idx;
    const __isFirst = __idx === 0;
    const __isLast = __idx === cornerCells.length - 1;

    const __leftInsetX = __isFirst ? woodThick + __wingAttachNoZFightingInsetX : woodThick / 2;
    // Cell spans are derived from activeWidth, whose right boundary is the inside
    // face of the right side panel. Internal seams still stop at the divider face,
    // but the last roof segment must continue all the way to that side panel.
    const __rightInsetX = __isLast ? 0 : woodThick / 2;

    const topW = Math.max(
      CORNER_WING_DIMENSIONS.ceiling.minWidthM,
      __cellW - __leftInsetX - __rightInsetX - CORNER_WING_DIMENSIONS.ceiling.widthClearanceM
    );
    const topX = __cellStartX + __leftInsetX + topW / 2;
    const topY = startY + __h - woodThick / 2;
    const partId = `corner_cell_top_c${cell.idx}`;
    if (
      cell.__hexCellGeometry &&
      addCornerHexHorizontalBoard({
        params,
        metrics,
        cell,
        partId,
        y: topY,
        material: __wingCeilMat,
      })
    ) {
      continue;
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(topW, woodThick, __hz.depth), __wingCeilMat);
    top.position.set(topX, topY, __hz.z);
    top.userData = {
      partId,
      moduleIndex: cell.key,
      kind: 'cellTop',
      __wpStack: __stackKey,
    };
    addOutlines(top);
    wingGroup.add(top);
  }
}
