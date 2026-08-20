import type { ActionMetaLike, AppContainer, MetaActionsNamespaceLike } from '../../../../../types';
import {
  setCfgModulesConfiguration,
  setUiCellDimsDepth,
  setUiCellDimsHeight,
  setUiCellDimsHexDoorWidth,
  setUiCellDimsHexMode,
  setUiCellDimsHexProtrusion,
  setUiCellDimsWidth,
  setUiWidth,
} from '../actions/store_actions.js';
import { applyStructureTemplateRecomputeBatch } from './structure_tab_core.js';
import { setManualWidth } from '../actions/room_actions.js';
import { getCfg as getCfgStore } from '../../store_access.js';
import { exitStructureEditMode, structureTabReportNonFatal } from './structure_tab_shared.js';
import {
  createStructureTabNoBuildImmediateMeta,
  createStructureTabNoBuildNoHistoryImmediateMeta,
  createStructureTabUiOnlyImmediateMeta,
} from './structure_tab_meta.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../../../features/modules_configuration/modules_config_api.js';
import type {
  StructureWorkflowOps,
  StructureWorkflowState,
} from './structure_tab_workflows_controller_runtime.js';
import type { StructureTabViewState } from './use_structure_tab_view_state_contracts.js';
import { getPrimaryMode } from '../actions/modes_actions.js';

export const STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID = 'cell_dims';
export const STRUCTURE_CELL_DIMS_MODE_MESSAGE = 'מצב עריכה: הקלד מידות ואז לחץ על תא או קופסא כדי להחיל';
export const STRUCTURE_HEX_CELL_DIMS_MODE_MESSAGE = 'מצב עריכה: לחץ על תא או קופסא כדי להפוך אותו לתא משושה';

export function exitStructureCellDimsEditModeIfActive(args: {
  app: AppContainer;
  modeId: string;
  source: string;
}): boolean {
  const modeId = String(args.modeId || STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID);
  if (getPrimaryMode(args.app) !== modeId) return false;
  exitStructureEditMode({ app: args.app, modeId, source: args.source });
  return true;
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
      const actionMeta: ActionMetaLike = createStructureTabNoBuildImmediateMeta(meta, source);
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
      const source = `react:structure:cellDims${
        key === 'width'
          ? 'Width'
          : key === 'height'
            ? 'Height'
            : key === 'depth'
              ? 'Depth'
              : key === 'hexProtrusion'
                ? 'HexProtrusion'
                : 'HexDoorWidth'
      }:clear`;
      const actionMeta = createStructureTabUiOnlyImmediateMeta(meta, source);
      if (key === 'width') setUiCellDimsWidth(app, null, actionMeta);
      else if (key === 'height') setUiCellDimsHeight(app, null, actionMeta);
      else if (key === 'depth') setUiCellDimsDepth(app, null, actionMeta);
      else if (key === 'hexProtrusion') {
        setUiCellDimsHexProtrusion(app, null, actionMeta);
        setUiCellDimsHexMode(app, true, actionMeta);
      } else {
        setUiCellDimsHexDoorWidth(app, null, actionMeta);
        setUiCellDimsHexMode(app, true, actionMeta);
      }
    },
    setCellDimsHexMode: on => {
      const source = on ? 'react:structure:cellDimsHex:enter' : 'react:structure:cellDimsHex:exit';
      setUiCellDimsHexMode(app, !!on, createStructureTabUiOnlyImmediateMeta(meta, source));
    },
    setAutoWidth: nextWidth => {
      const source = 'react:structure:width:auto';
      const actionMeta = createStructureTabNoBuildNoHistoryImmediateMeta(meta, source);
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
