import {
  cloneMaterialRecord,
  cloneMaterialWithSide,
  type CornerWingCarcassFlowParams,
} from './corner_wing_carcass_shared.js';
import {
  type CornerWingCarcassShellMetrics,
  resolveCornerWingWallPlacement,
} from './corner_wing_carcass_shell_metrics.js';

export function applyCornerWingCarcassPanels(
  params: CornerWingCarcassFlowParams,
  metrics: CornerWingCarcassShellMetrics
): void {
  const { ctx, locals, helpers } = params;
  const {
    THREE,
    woodThick,
    startY,
    wingD,
    wingW,
    activeWidth,
    blindWidth,
    cornerConnectorEnabled,
    __mirrorX,
    cabinetBodyHeight,
    getCornerMat,
    bodyMat,
    backPanelMaterialArray,
    addOutlines,
    __sketchMode,
    wingGroup,
  } = ctx;
  const { cornerCells } = locals;
  const { cloneMaybe } = helpers;

  let __backPanelMaterial: unknown = __sketchMode
    ? new THREE.MeshBasicMaterial({ color: 0xffffff })
    : backPanelMaterialArray.map((m: unknown) => cloneMaybe(m));

  const ds = THREE.DoubleSide;
  if (!__sketchMode && __mirrorX === -1 && typeof ds === 'number') {
    const applyDoubleSide = (material: unknown): unknown => {
      const mm = cloneMaterialRecord(material, cloneMaybe);
      if (!mm) return material;
      mm.side = ds;
      return mm;
    };
    if (Array.isArray(__backPanelMaterial)) {
      __backPanelMaterial = __backPanelMaterial.map(applyDoubleSide);
    } else if (__backPanelMaterial && typeof __backPanelMaterial === 'object') {
      __backPanelMaterial = applyDoubleSide(__backPanelMaterial);
    }
  }

  const __backPanelYPad = 0.0;
  const __backPanelZ = metrics.__wingBackPanelCenterZ;

  const __addBackSeg = (
    segW: number,
    bodyH: number,
    centerX: number,
    partId: string,
    moduleIndex?: string
  ) => {
    const h = Number.isFinite(bodyH) && bodyH > 0 ? bodyH : cabinetBodyHeight;
    const w = Number.isFinite(segW) && segW > 0 ? segW : 0.2;

    const panelH = Math.max(0.05, h - __backPanelYPad * 2);
    const panelW = Math.max(0.05, w - 0.002);

    const bp = new THREE.Mesh(
      new THREE.BoxGeometry(panelW, panelH, metrics.__wingBackPanelThick),
      __backPanelMaterial
    );
    bp.position.set(centerX, startY + h / 2, __backPanelZ);
    if (!__sketchMode) {
      bp.castShadow = false;
      bp.receiveShadow = false;
    }

    bp.userData = { partId, moduleIndex: moduleIndex || 'corner', kind: 'backPanel' };
    wingGroup.add(bp);
  };

  if (blindWidth > 0.001) {
    __addBackSeg(blindWidth, cabinetBodyHeight, blindWidth / 2, 'corner_wing_back_blind', 'corner');
  }

  if (cornerCells.length > 0) {
    if (metrics.__wingIsUnifiedCabinet) {
      __addBackSeg(
        activeWidth,
        cabinetBodyHeight,
        blindWidth + activeWidth / 2,
        'corner_wing_back',
        'corner'
      );
    } else {
      for (const cell of cornerCells) {
        const pid = `corner_wing_back_c${cell.idx}`;
        __addBackSeg(cell.width, cell.bodyHeight, cell.centerX, pid, cell.key);
      }
    }
  } else if (activeWidth > 0.01) {
    __addBackSeg(activeWidth, cabinetBodyHeight, blindWidth + activeWidth / 2, 'corner_wing_back', 'corner');
  }

  const __lastCell = cornerCells.length > 0 ? cornerCells[cornerCells.length - 1] : null;
  const __rightH = __lastCell ? Math.max(0.05, __lastCell.bodyHeight) : cabinetBodyHeight;
  const __rightCellD = __lastCell ? Math.max(0.2, __lastCell.depth) : wingD;
  const __rt = resolveCornerWingWallPlacement(params, metrics, __rightCellD, 0.05);

  const __rightId = 'corner_wing_side_right';
  let __rightMat = getCornerMat(__rightId, bodyMat);
  if (__mirrorX === -1 && __rightMat && typeof __rightMat === 'object' && THREE.DoubleSide != null) {
    __rightMat = cloneMaterialWithSide(__rightMat, THREE.DoubleSide, cloneMaybe);
  }
  const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(woodThick, __rightH, __rt.depth), __rightMat);
  rightPanel.position.set(wingW - woodThick / 2, startY + __rightH / 2, __rt.z);
  rightPanel.userData = {
    partId: __rightId,
    moduleIndex: __lastCell ? __lastCell.key : 'corner',
    kind: 'side',
  };
  addOutlines(rightPanel);
  wingGroup.add(rightPanel);

  const __leftCell = cornerCells.length > 0 ? cornerCells[0] : null;
  const __leftH = __leftCell ? Math.max(0.05, __leftCell.bodyHeight) : cabinetBodyHeight;
  const __leftCellD = __leftCell ? Math.max(0.2, __leftCell.depth) : wingD;
  const __lt = resolveCornerWingWallPlacement(params, metrics, __leftCellD, 0.05);

  const __leftId = 'corner_wing_side_left';
  let __leftMat = getCornerMat(__leftId, bodyMat);
  if (__mirrorX === -1 && __leftMat && typeof __leftMat === 'object' && THREE.DoubleSide != null) {
    __leftMat = cloneMaterialWithSide(__leftMat, THREE.DoubleSide, cloneMaybe);
  }
  const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(woodThick, __leftH, __lt.depth), __leftMat);
  const __wingAttachNoZFightingInsetX = cornerConnectorEnabled ? 0.0012 : 0;
  leftPanel.position.set(
    blindWidth + woodThick / 2 + __wingAttachNoZFightingInsetX,
    startY + __leftH / 2,
    __lt.z
  );
  leftPanel.userData = {
    partId: __leftId,
    moduleIndex: __leftCell ? __leftCell.key : 'corner:0',
    kind: 'side',
  };
  addOutlines(leftPanel);
  wingGroup.add(leftPanel);
}
