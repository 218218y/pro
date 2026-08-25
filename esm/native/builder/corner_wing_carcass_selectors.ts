import { CORNER_WING_SELECTOR_POLICY } from '../../shared/dimensions/corner_system_policy.js';
import { getCornerHexHitDepth } from './corner_wing_hex_cell_geometry.js';
import { getModuleSelectorMaterial } from './module_selector_material.js';
import type { CornerWingCarcassFlowParams } from './corner_wing_carcass_shared.js';

export function applyCornerWingCarcassSelectors(params: CornerWingCarcassFlowParams): void {
  const { ctx, locals, helpers } = params;
  const { THREE, woodThick, startY, wingD, activeWidth, cabinetBodyHeight, __stackKey, wingGroup } = ctx;
  const { App, cornerCells, activeFaceCenter } = locals;
  const { getInternalGridMap } = helpers;

  // Module selectors (hitboxes) share one App-owned material across rebuilds.
  const hitMat = getModuleSelectorMaterial(App, 'picking-only', () => {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.0,
    });
    material.depthWrite = false;
    material.colorWrite = false;
    material.side = THREE.DoubleSide;
    return material;
  });
  const firstCornerCell = cornerCells[0];
  if (firstCornerCell) {
    for (const cell of cornerCells) {
      const __h = Math.max(woodThick * 2, cell.bodyHeight);
      const __hd = getCornerHexHitDepth(cell);

      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(
            CORNER_WING_SELECTOR_POLICY.minWidthM,
            cell.width - CORNER_WING_SELECTOR_POLICY.widthClearanceM
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
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max(CORNER_WING_SELECTOR_POLICY.fallbackMinWidthM, activeWidth),
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

  const firstGridCell = cornerCells[0];
  if (firstGridCell) {
    for (const cell of cornerCells) {
      m[cell.key] = {
        effectiveBottomY: cell.effectiveBottomY,
        effectiveTopY: cell.effectiveTopY,
        localGridStep: cell.localGridStep,
        gridDivisions: cell.gridDivisions,
        woodThick,
        startY,
      };
    }
    // Keep the connector module id mapped so picking on moduleIndex:'corner' still has a grid.
    if (!m['corner']) {
      m['corner'] = {
        effectiveBottomY: firstGridCell.effectiveBottomY,
        effectiveTopY: firstGridCell.effectiveTopY,
        localGridStep: firstGridCell.localGridStep,
        gridDivisions: firstGridCell.gridDivisions,
        woodThick,
        startY,
      };
    }

    // New alias for the standalone corner connector (pentagon).
    // We reuse the first wing cell grid so pick/edit tools still behave consistently.
    if (!m['corner_pentagon']) {
      m['corner_pentagon'] = {
        effectiveBottomY: firstGridCell.effectiveBottomY,
        effectiveTopY: firstGridCell.effectiveTopY,
        localGridStep: firstGridCell.localGridStep,
        gridDivisions: firstGridCell.gridDivisions,
        woodThick,
        startY,
      };
    }
  }
}
