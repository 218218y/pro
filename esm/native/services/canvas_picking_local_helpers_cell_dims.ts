import type { AppContainer } from '../../../types';
import {
  WARDROBE_DEFAULTS,
  WARDROBE_LAYOUT_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { InteriorHoverTarget } from './canvas_picking_hover_targets.js';
import { __wp_cfg, __wp_isCornerKey, __wp_ui } from './canvas_picking_core_helpers.js';
import { __wp_readInteriorModuleConfigRef } from './canvas_picking_local_helpers_hover.js';
import {
  readRawNumber,
  readSpecialDimsRecord,
  readUiNumber,
  readUiRaw,
} from './canvas_picking_local_helpers_shared.js';
import { readCornerConfigurationSnapshotForStack } from '../features/modules_configuration/corner_cells_api.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { getActiveOverrideCm, isOverrideActive } from '../features/special_dims/index.js';

function readRecordProp(value: unknown, key: string): unknown {
  return value && typeof value === 'object' && !Array.isArray(value) ? Reflect.get(value, key) : undefined;
}

export function __wp_readCellDimsDraft(App: AppContainer): {
  applyW: number | null;
  applyH: number | null;
  applyD: number | null;
} {
  try {
    const ui = __wp_ui(App);
    const raw = readUiRaw(ui);
    const draftW = readRawNumber(raw, 'cellDimsWidth', NaN);
    const draftH = readRawNumber(raw, 'cellDimsHeight', NaN);
    const draftD = readRawNumber(raw, 'cellDimsDepth', NaN);
    return {
      applyW: Number.isFinite(draftW) && draftW > 0 ? draftW : null,
      applyH: Number.isFinite(draftH) && draftH > 0 ? draftH : null,
      applyD: Number.isFinite(draftD) && draftD > 0 ? draftD : null,
    };
  } catch {
    return { applyW: null, applyH: null, applyD: null };
  }
}

function __wp_readLinearSelectorWidthInputCm(
  App: AppContainer,
  target: InteriorHoverTarget,
  selectorBox: {
    centerX: number;
    centerY: number;
    centerZ: number;
    width: number;
    height: number;
    depth: number;
  }
): number {
  const currentSelectorWcm = Math.max(0, Number(selectorBox.width) * 100);
  if (typeof target.hitModuleKey !== 'number') return currentSelectorWcm;
  try {
    const cfg = __wp_cfg(App);
    const bucket = target.isBottom ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
    const list = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
    const count =
      Array.isArray(list) && list.length > 0 ? list.length : Math.max(1, Math.floor(target.hitModuleKey) + 1);
    const idx = Math.max(0, Math.floor(target.hitModuleKey));
    const woodCm = Math.max(0, Number(target.woodThick) * 100);
    const leftCm = idx === 0 ? woodCm : woodCm / 2;
    const rightCm = idx >= count - 1 ? woodCm : woodCm / 2;
    return currentSelectorWcm + leftCm + rightCm;
  } catch {
    return currentSelectorWcm;
  }
}

export function __wp_getCellDimsHoverOp(
  App: AppContainer,
  target: InteriorHoverTarget,
  selectorBox: {
    centerX: number;
    centerY: number;
    centerZ: number;
    width: number;
    height: number;
    depth: number;
  }
): 'add' | 'remove' {
  try {
    const { applyW, applyH, applyD } = __wp_readCellDimsDraft(App);
    if (applyW == null && applyH == null && applyD == null) return 'add';

    const cfg = __wp_cfg(App);
    const ui = __wp_ui(App);
    const raw = readUiRaw(ui);
    const EPS_CM = WARDROBE_LAYOUT_DIMENSIONS.cellDimsMatchToleranceCm;

    let curW = __wp_readLinearSelectorWidthInputCm(App, target, selectorBox);
    let curH = readRawNumber(raw, 'height', Math.max(0, Number(selectorBox.height) * 100));
    let curD = readRawNumber(raw, 'depth', WARDROBE_DEFAULTS.byType.hinged.depthCm);

    let isCustomW = false;
    let isCustomH = false;
    let isCustomD = false;

    if (__wp_isCornerKey(target.hitModuleKey)) {
      const cornerCfg = readCornerConfigurationSnapshotForStack(cfg, 'top') ?? {};
      const cornerSd = readSpecialDimsRecord(cornerCfg);
      const connSd = readRecordProp(cornerCfg, 'connectorSpecialDims');

      const globalCornerH =
        getActiveOverrideCm(cornerSd, 'heightCm', 'baseHeightCm') ??
        readUiNumber(ui, 'cornerHeight', readRawNumber(raw, 'height', curH));
      const globalCornerD =
        getActiveOverrideCm(cornerSd, 'depthCm', 'baseDepthCm') ??
        readUiNumber(ui, 'cornerDepth', readRawNumber(raw, 'depth', curD));

      if (target.hitModuleKey === 'corner') {
        curW =
          getActiveOverrideCm(connSd, 'widthCm', 'baseWidthCm') ??
          readUiNumber(ui, 'cornerCabinetWallLenCm', readUiNumber(ui, 'cornerCabinetWallLen', curW));
        curH = globalCornerH;
        curD = globalCornerD;
        isCustomW = isOverrideActive(connSd, 'widthCm', 'baseWidthCm');
        isCustomH = isOverrideActive(cornerSd, 'heightCm', 'baseHeightCm');
        isCustomD = isOverrideActive(cornerSd, 'depthCm', 'baseDepthCm');
      } else {
        const cfgRef = __wp_readInteriorModuleConfigRef(App, target.hitModuleKey, target.isBottom);
        const sd = readSpecialDimsRecord(cfgRef);
        curW = getActiveOverrideCm(sd, 'widthCm', 'baseWidthCm') ?? curW;
        curH = getActiveOverrideCm(sd, 'heightCm', 'baseHeightCm') ?? globalCornerH;
        curD = getActiveOverrideCm(sd, 'depthCm', 'baseDepthCm') ?? globalCornerD;
        isCustomW = isOverrideActive(sd, 'widthCm', 'baseWidthCm');
        isCustomH = isOverrideActive(sd, 'heightCm', 'baseHeightCm');
        isCustomD = isOverrideActive(sd, 'depthCm', 'baseDepthCm');
      }
    } else {
      const cfgRef = __wp_readInteriorModuleConfigRef(App, target.hitModuleKey, target.isBottom);
      const sd = readSpecialDimsRecord(cfgRef);
      curW = getActiveOverrideCm(sd, 'widthCm', 'baseWidthCm') ?? curW;
      curH = getActiveOverrideCm(sd, 'heightCm', 'baseHeightCm') ?? readRawNumber(raw, 'height', curH);
      curD = getActiveOverrideCm(sd, 'depthCm', 'baseDepthCm') ?? readRawNumber(raw, 'depth', curD);
      isCustomW = isOverrideActive(sd, 'widthCm', 'baseWidthCm');
      isCustomH = isOverrideActive(sd, 'heightCm', 'baseHeightCm');
      isCustomD = isOverrideActive(sd, 'depthCm', 'baseDepthCm');
    }

    const matchesTargetW = applyW == null ? true : Math.abs(curW - applyW) <= EPS_CM;
    const matchesTargetH = applyH == null ? true : Math.abs(curH - applyH) <= EPS_CM;
    const matchesTargetD = applyD == null ? true : Math.abs(curD - applyD) <= EPS_CM;

    const willChangeW = applyW != null && !matchesTargetW;
    const willChangeH = applyH != null && !matchesTargetH;
    const willChangeD = applyD != null && !matchesTargetD;
    if (willChangeW || willChangeH || willChangeD) return 'add';

    const toggledBackW = applyW != null && isCustomW && matchesTargetW;
    const toggledBackH = applyH != null && isCustomH && matchesTargetH;
    const toggledBackD = applyD != null && isCustomD && matchesTargetD;
    return toggledBackW || toggledBackH || toggledBackD ? 'remove' : 'add';
  } catch {
    return 'add';
  }
}
