import {
  CORNER_CONNECTOR_SHELL_POLICY,
  CORNER_WING_PANEL_POLICY,
} from '../../shared/dimensions/corner_system_policy.js';
import type { CornerWingCarcassFlowParams } from './corner_wing_carcass_shared.js';
import {
  type CornerWingCarcassShellMetrics,
  resolveCornerWingWallPlacement,
} from './corner_wing_carcass_shell_metrics.js';

export function applyCornerWingCarcassDividers(
  params: CornerWingCarcassFlowParams,
  metrics: CornerWingCarcassShellMetrics
): void {
  const { ctx, locals } = params;
  const { THREE, woodThick, startY, __stackKey, bodyMat, getCornerMat, addOutlines, wingGroup } = ctx;
  const { cornerCells } = locals;

  if (cornerCells.length <= 1) return;

  const fullT = Math.max(CORNER_CONNECTOR_SHELL_POLICY.shellBaseMinHeightM, woodThick);
  for (let ci = 1; ci < cornerCells.length; ci++) {
    const leftIdx = Math.max(0, ci - 1);
    const leftCell = cornerCells[leftIdx];
    const rightCell = cornerCells[ci];
    if (!leftCell || !rightCell) continue;
    const x = rightCell.startX;

    const leftNeedsOwn = !!(
      leftCell.__hasActiveSpecialDims ||
      leftCell.__hasActiveDepth ||
      leftCell.__hasActiveHeight
    );
    const rightNeedsOwn = !!(
      rightCell.__hasActiveSpecialDims ||
      rightCell.__hasActiveDepth ||
      rightCell.__hasActiveHeight
    );
    const needsIndependentWalls = leftNeedsOwn || rightNeedsOwn;

    const leftHRaw = leftCell.bodyHeight;
    const rightHRaw = rightCell.bodyHeight;
    const leftH = Math.max(
      CORNER_CONNECTOR_SHELL_POLICY.shellMinWallHeightM,
      leftHRaw - CORNER_CONNECTOR_SHELL_POLICY.shellWallHeightClearanceM
    );
    const rightH = Math.max(
      CORNER_CONNECTOR_SHELL_POLICY.shellMinWallHeightM,
      rightHRaw - CORNER_CONNECTOR_SHELL_POLICY.shellWallHeightClearanceM
    );

    const leftDBase = Math.max(CORNER_WING_PANEL_POLICY.minCellDepthM, leftCell.depth);
    const rightDBase = Math.max(CORNER_WING_PANEL_POLICY.minCellDepthM, rightCell.depth);

    if (!needsIndependentWalls) {
      const divBaseD = Math.max(CORNER_WING_PANEL_POLICY.minCellDepthM, Math.min(leftDBase, rightDBase));
      const __dt = resolveCornerWingWallPlacement(
        params,
        metrics,
        divBaseD,
        CORNER_WING_PANEL_POLICY.minWallDepthM
      );
      const divH = Math.max(
        CORNER_CONNECTOR_SHELL_POLICY.shellMinWallHeightM,
        Math.max(leftHRaw, rightHRaw) - CORNER_CONNECTOR_SHELL_POLICY.shellWallHeightClearanceM
      );
      const divId = `corner_divider_${ci}`;
      const div = new THREE.Mesh(
        new THREE.BoxGeometry(woodThick, divH, __dt.depth),
        getCornerMat(divId, bodyMat)
      );
      div.position.set(x, startY + divH / 2, __dt.z);
      div.userData = {
        partId: divId,
        moduleIndex: `corner:${leftIdx}`,
        kind: 'bodyDivider',
        __wpStack: __stackKey,
      };
      addOutlines(div);
      wingGroup.add(div);
      continue;
    }

    const __ldt = resolveCornerWingWallPlacement(
      params,
      metrics,
      leftDBase,
      CORNER_WING_PANEL_POLICY.minWallDepthM
    );
    const __rdt = resolveCornerWingWallPlacement(
      params,
      metrics,
      rightDBase,
      CORNER_WING_PANEL_POLICY.minWallDepthM
    );

    const lId = `corner_divider_${ci}_L`;
    const lDiv = new THREE.Mesh(new THREE.BoxGeometry(fullT, leftH, __ldt.depth), getCornerMat(lId, bodyMat));
    lDiv.position.set(x - fullT / 2, startY + leftH / 2, __ldt.z);
    lDiv.userData = {
      partId: lId,
      moduleIndex: `corner:${leftIdx}`,
      kind: 'bodyDividerOwn',
      __wpStack: __stackKey,
    };
    addOutlines(lDiv);
    wingGroup.add(lDiv);

    const rId = `corner_divider_${ci}_R`;
    const rDiv = new THREE.Mesh(
      new THREE.BoxGeometry(fullT, rightH, __rdt.depth),
      getCornerMat(rId, bodyMat)
    );
    rDiv.position.set(x + fullT / 2, startY + rightH / 2, __rdt.z);
    rDiv.userData = {
      partId: rId,
      moduleIndex: `corner:${ci}`,
      kind: 'bodyDividerOwn',
      __wpStack: __stackKey,
    };
    addOutlines(rDiv);
    wingGroup.add(rDiv);
  }
}
