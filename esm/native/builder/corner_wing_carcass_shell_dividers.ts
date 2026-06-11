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
  const { THREE, woodThick, startY, bodyMat, getCornerMat, addOutlines, wingGroup } = ctx;
  const { cornerCells } = locals;

  if (cornerCells.length <= 1) return;

  const fullT = Math.max(0.001, woodThick);
  for (let ci = 1; ci < cornerCells.length; ci++) {
    const x = cornerCells[ci].startX;
    const leftIdx = Math.max(0, ci - 1);
    const leftCell = cornerCells[leftIdx];
    const rightCell = cornerCells[ci];

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
    const leftH = Math.max(0.05, leftHRaw - 0.002);
    const rightH = Math.max(0.05, rightHRaw - 0.002);

    const leftDBase = Math.max(0.2, leftCell.depth);
    const rightDBase = Math.max(0.2, rightCell.depth);

    if (!needsIndependentWalls) {
      const divBaseD = Math.max(0.2, Math.min(leftDBase, rightDBase));
      const __dt = resolveCornerWingWallPlacement(params, metrics, divBaseD, 0.05);
      const divH = Math.max(0.05, Math.max(leftHRaw, rightHRaw) - 0.002);
      const divId = `corner_divider_${ci}`;
      const div = new THREE.Mesh(
        new THREE.BoxGeometry(woodThick, divH, __dt.depth),
        getCornerMat(divId, bodyMat)
      );
      div.position.set(x, startY + divH / 2, __dt.z);
      div.userData = { partId: divId, moduleIndex: `corner:${leftIdx}`, kind: 'bodyDivider' };
      addOutlines(div);
      wingGroup.add(div);
      continue;
    }

    const __ldt = resolveCornerWingWallPlacement(params, metrics, leftDBase, 0.05);
    const __rdt = resolveCornerWingWallPlacement(params, metrics, rightDBase, 0.05);

    const lId = `corner_divider_${ci}_L`;
    const lDiv = new THREE.Mesh(new THREE.BoxGeometry(fullT, leftH, __ldt.depth), getCornerMat(lId, bodyMat));
    lDiv.position.set(x - fullT / 2, startY + leftH / 2, __ldt.z);
    lDiv.userData = { partId: lId, moduleIndex: `corner:${leftIdx}`, kind: 'bodyDividerOwn' };
    addOutlines(lDiv);
    wingGroup.add(lDiv);

    const rId = `corner_divider_${ci}_R`;
    const rDiv = new THREE.Mesh(
      new THREE.BoxGeometry(fullT, rightH, __rdt.depth),
      getCornerMat(rId, bodyMat)
    );
    rDiv.position.set(x + fullT / 2, startY + rightH / 2, __rdt.z);
    rDiv.userData = { partId: rId, moduleIndex: `corner:${ci}`, kind: 'bodyDividerOwn' };
    addOutlines(rDiv);
    wingGroup.add(rDiv);
  }
}
