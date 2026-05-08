import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CornerWingCarcassFlowParams } from './corner_wing_carcass_shared.js';

export function applyCornerWingCarcassSelectors(params: CornerWingCarcassFlowParams): void {
  const { ctx, locals, helpers } = params;
  const { THREE, woodThick, startY, wingD, activeWidth, cabinetBodyHeight, __stackKey, wingGroup } = ctx;
  const { App, cornerCells, activeFaceCenter } = locals;
  const { getInternalGridMap } = helpers;

  // Module selectors (hitboxes)
  if (cornerCells.length > 0) {
    for (const cell of cornerCells) {
      const __h = Math.max(woodThick * 2, cell.bodyHeight);
      const __hd = Math.max(CORNER_WING_DIMENSIONS.selector.minDepthM, cell.depth);

      const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.0,
      });
      hitMat.depthWrite = false;
      hitMat.colorWrite = false;
      hitMat.side = THREE.DoubleSide;
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(
            CORNER_WING_DIMENSIONS.selector.minWidthM,
            cell.width - CORNER_WING_DIMENSIONS.selector.widthClearanceM
          ),
          __h,
          __hd
        ),
        hitMat
      );

      hitBox.renderOrder = -1000;
      hitBox.position.set(cell.centerX, startY + __h / 2, -__hd / 2 + (__hd - wingD));
      hitBox.userData = { moduleIndex: cell.key, isModuleSelector: true, __wpStack: __stackKey };
      wingGroup.add(hitBox);
    }
  } else {
    // No cell list means the whole wing remains the selectable/editable target.
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.0,
    });
    hitMat.depthWrite = false;
    hitMat.colorWrite = false;
    hitMat.side = THREE.DoubleSide;
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max(CORNER_WING_DIMENSIONS.selector.fallbackMinWidthM, activeWidth),
        cabinetBodyHeight,
        wingD
      ),
      hitMat
    );
    hitBox.renderOrder = -1000;
    hitBox.position.set(activeFaceCenter, startY + cabinetBodyHeight / 2, -wingD / 2);
    hitBox.userData = { moduleIndex: 'corner', isModuleSelector: true, __wpStack: __stackKey };
    wingGroup.add(hitBox);
  }

  // Internal grid map is used by pick/edit tools. In stack-split, bottom stack uses a separate map.
  const m = getInternalGridMap(App, __stackKey === 'bottom');

  if (cornerCells.length > 0) {
    for (const cell of cornerCells) {
      m[cell.key] = {
        effectiveBottomY: cell.effectiveBottomY,
        effectiveTopY: cell.effectiveTopY,
        localGridStep: cell.localGridStep,
        gridDivisions: cell.gridDivisions,
      };
    }
    // Keep the connector module id mapped so picking on moduleIndex:'corner' still has a grid.
    if (!m['corner']) {
      const c0 = cornerCells[0];
      m['corner'] = {
        effectiveBottomY: c0.effectiveBottomY,
        effectiveTopY: c0.effectiveTopY,
        localGridStep: c0.localGridStep,
        gridDivisions: c0.gridDivisions,
      };
    }

    // New alias for the standalone corner connector (pentagon).
    // We reuse the first wing cell grid so pick/edit tools still behave consistently.
    if (!m['corner_pentagon']) {
      const c0 = cornerCells[0];
      m['corner_pentagon'] = {
        effectiveBottomY: c0.effectiveBottomY,
        effectiveTopY: c0.effectiveTopY,
        localGridStep: c0.localGridStep,
        gridDivisions: c0.gridDivisions,
      };
    }
  }
}
