import { applyOverrideToSpecialDims, assignSpecialDimsToConfig } from '../features/special_dims/index.js';
import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';
import {
  patchCornerConfig,
  syncCornerUi,
  commitCornerHistory,
  refreshCornerStructure,
  showCornerToast,
  reportCornerDimsIssue,
} from './canvas_picking_cell_dims_corner_shared.js';
import type { CornerGlobalDimsTargetState } from './canvas_picking_cell_dims_corner_global_state.js';

export function applyCornerGlobalDimsTargetState(
  ctx: CornerCellDimsContext,
  state: CornerGlobalDimsTargetState
): void {
  const {
    App,
    applyW,
    applyH,
    applyD,
    nextCornerCfg,
    isConnectorHit,
    wallLenBase,
    cornerWBase,
    cornerHBase,
    cornerDBase,
    sd,
    connSd,
  } = ctx;
  const { tgtW, tgtH, tgtD, toggledBackW, toggledBackH, toggledBackD, didToggleBack, uiPatch } = state;

  if (applyH != null) {
    applyOverrideToSpecialDims({
      sd,
      key: 'heightCm',
      baseKey: 'baseHeightCm',
      baseValueCm: cornerHBase,
      targetValueCm: tgtH,
      toggledBack: toggledBackH,
    });
  }
  if (applyD != null) {
    applyOverrideToSpecialDims({
      sd,
      key: 'depthCm',
      baseKey: 'baseDepthCm',
      baseValueCm: cornerDBase,
      targetValueCm: tgtD,
      toggledBack: toggledBackD,
    });
  }
  if (applyW != null) {
    if (isConnectorHit) {
      applyOverrideToSpecialDims({
        sd: connSd,
        key: 'widthCm',
        baseKey: 'baseWidthCm',
        baseValueCm: wallLenBase,
        targetValueCm: tgtW,
        toggledBack: toggledBackW,
      });
    } else {
      applyOverrideToSpecialDims({
        sd,
        key: 'widthCm',
        baseKey: 'baseWidthCm',
        baseValueCm: cornerWBase,
        targetValueCm: tgtW,
        toggledBack: toggledBackW,
      });
    }
  }

  assignSpecialDimsToConfig(nextCornerCfg, sd);
  try {
    const keys = connSd && typeof connSd === 'object' ? Object.keys(connSd) : [];
    if (!keys.length) {
      delete nextCornerCfg.connectorSpecialDims;
    } else {
      nextCornerCfg.connectorSpecialDims = connSd;
    }
  } catch (err) {
    reportCornerDimsIssue(App, err, 'cellDims.corner.connectorSpecialDims.normalize');
  }

  patchCornerConfig(App, nextCornerCfg, 'cellDims.apply.corner', 'cellDims.corner.patchConfig');
  syncCornerUi(App, uiPatch, 'cellDims.apply.corner', 'cellDims.corner.syncUi');

  commitCornerHistory('cellDims.apply.corner', App);
  refreshCornerStructure(App, 'cellDims.apply.corner', 'cellDims.corner.refresh');
  const name = isConnectorHit ? 'הפינה' : 'התוספת';
  const msg = didToggleBack ? `${name} חזרה למידות רגילות` : `הוחל על ${name}`;
  showCornerToast(App, msg, 'cellDims.corner.feedbackToast');
}
