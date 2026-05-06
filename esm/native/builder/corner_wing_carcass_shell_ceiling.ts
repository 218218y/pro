import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CornerWingCarcassFlowParams } from './corner_wing_carcass_shared.js';
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
    cornerConnectorEnabled,
    cabinetBodyHeight,
    getCornerMat,
    bodyMat,
    addOutlines,
    wingGroup,
  } = ctx;
  const { cornerCells } = locals;

  if (cornerCells.length <= 0) return;

  const __wingCeilMat = getCornerMat('corner_ceil', bodyMat);
  const __wingAttachNoZFightingInsetX = cornerConnectorEnabled
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
    const __rightInsetX = woodThick;
    const topW = Math.max(
      CORNER_WING_DIMENSIONS.ceiling.minWidthM,
      activeWidth - __leftInsetX - __rightInsetX - CORNER_WING_DIMENSIONS.ceiling.widthClearanceM
    );
    const topX = blindWidth + __leftInsetX + topW / 2;
    const topY = startY + cabinetBodyHeight - woodThick / 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(topW, woodThick, __hz.depth), __wingCeilMat);
    top.position.set(topX, topY, __hz.z);
    top.userData = { partId: 'corner_wing_ceil', moduleIndex: 'corner', kind: 'bodyCeil' };
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
    const __rightInsetX = __isLast ? woodThick : woodThick / 2;

    const topW = Math.max(
      CORNER_WING_DIMENSIONS.ceiling.minWidthM,
      __cellW - __leftInsetX - __rightInsetX - CORNER_WING_DIMENSIONS.ceiling.widthClearanceM
    );
    const topX = __cellStartX + __leftInsetX + topW / 2;
    const topY = startY + __h - woodThick / 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(topW, woodThick, __hz.depth), __wingCeilMat);
    top.position.set(topX, topY, __hz.z);
    top.userData = {
      partId: `corner_cell_top_c${cell.idx}`,
      moduleIndex: cell.key,
      kind: 'cellTop',
    };
    addOutlines(top);
    wingGroup.add(top);
  }
}
