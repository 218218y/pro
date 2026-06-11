import type { ActionMetaLike, AppContainer, MetaActionsNamespaceLike } from '../../../../../types';
import {
  setCfgModulesConfiguration,
  setUiCellDimsDepth,
  setUiCellDimsHeight,
  setUiCellDimsWidth,
  setUiWidth,
} from '../actions/store_actions.js';
import { applyStructureTemplateRecomputeBatch } from './structure_tab_core.js';
import { setManualWidth } from '../actions/room_actions.js';
import { getCfg as getCfgStore } from '../../store_access.js';
import { structureTabReportNonFatal } from './structure_tab_shared.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../../../features/modules_configuration/modules_config_api.js';
import type {
  StructureWorkflowOps,
  StructureWorkflowState,
} from './structure_tab_workflows_controller_runtime.js';
import type { StructureTabViewState } from './use_structure_tab_view_state_contracts.js';

export const STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID = 'cell_dims';
export const STRUCTURE_CELL_DIMS_MODE_MESSAGE = 'מצב עריכה: הקלד מידות ואז לחץ על תא בארון כדי להחיל';

function readNoBuildNoHistoryImmediateMeta(meta: MetaActionsNamespaceLike, source: string): ActionMetaLike {
  if (typeof meta.noHistoryImmediate === 'function') {
    return meta.noBuild(meta.noHistoryImmediate(source), source);
  }
  return meta.noBuild(meta.noHistory({ immediate: true, source }, source), source);
}

export function createStructureWorkflowState(state: StructureTabViewState): StructureWorkflowState {
  return {
    isLibraryMode: state.isLibraryMode,
    wardrobeType: state.wardrobeType,
    width: state.width,
    height: state.height,
    depth: state.depth,
    doors: state.doors,
    stackSplitEnabled: state.stackSplitEnabled,
    stackSplitLowerHeight: state.stackSplitLowerHeight,
    stackSplitLowerDepth: state.stackSplitLowerDepth,
    stackSplitLowerWidth: state.stackSplitLowerWidth,
    stackSplitLowerDoors: state.stackSplitLowerDoors,
    stackSplitLowerDepthManual: state.stackSplitLowerDepthManual,
    stackSplitLowerWidthManual: state.stackSplitLowerWidthManual,
    stackSplitLowerDoorsManual: state.stackSplitLowerDoorsManual,
    modulesCount: state.modulesCount,
  };
}

export function createStructureWorkflowOps(
  app: AppContainer,
  meta: MetaActionsNamespaceLike
): StructureWorkflowOps {
  return {
    getModulesConfiguration: () =>
      readModulesConfigurationListFromConfigSnapshot(getCfgStore(app), 'modulesConfiguration'),
    commitModulesConfiguration: (nextList, source) => {
      const actionMeta: ActionMetaLike = meta.noBuildImmediate(source);
      applyStructureTemplateRecomputeBatch({
        app,
        source,
        meta: actionMeta,
        statePatch: { config: { modulesConfiguration: nextList } },
        mutate: () => {
          setCfgModulesConfiguration(app, nextList, actionMeta);
        },
      });
    },
    clearCellDim: key => {
      const source = `react:structure:cellDims${key === 'width' ? 'Width' : key === 'height' ? 'Height' : 'Depth'}:clear`;
      const actionMeta = meta.uiOnlyImmediate(source);
      if (key === 'width') setUiCellDimsWidth(app, null, actionMeta);
      else if (key === 'height') setUiCellDimsHeight(app, null, actionMeta);
      else setUiCellDimsDepth(app, null, actionMeta);
    },
    setAutoWidth: nextWidth => {
      const source = 'react:structure:width:auto';
      const actionMeta = readNoBuildNoHistoryImmediateMeta(meta, source);
      applyStructureTemplateRecomputeBatch({
        app,
        source,
        meta: actionMeta,
        uiPatch: { raw: { width: nextWidth } },
        statePatch: { config: { isManualWidth: false }, ui: { raw: { width: nextWidth } } },
        mutate: () => {
          setManualWidth(app, false, actionMeta);
          setUiWidth(app, nextWidth, actionMeta);
        },
      });
    },
    reportNonFatal: structureTabReportNonFatal,
  };
}
