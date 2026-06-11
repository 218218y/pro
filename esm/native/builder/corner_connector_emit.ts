// Corner connector emission owner.
//
// Keep the public pentagon connector layer focused on orchestration while
// setup / shell policy and the dedicated interior / door / cornice flows live
// in focused helpers.

import {
  readMapOrEmpty,
  isSplitEnabledInMap,
  isSplitExplicitInMap,
  isSplitBottomEnabledInMap,
  readSplitPosListFromMap,
} from '../runtime/maps_access.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { getCfg } from './store_access.js';
import { MODES, reportErrorThrottled } from '../runtime/api.js';
import { addToWardrobeGroup } from '../runtime/render_access.js';
import { getOrCreateCacheRecord } from './corner_cache.js';
import {
  __isLongEdgeHandleVariantForPart,
  __topSplitHandleInsetForPart,
  __edgeHandleLongLiftAbsYForCell,
  __edgeHandleLongLiftAbsYForCornerCells,
  __edgeHandleAlignedBaseAbsYForCornerCells,
  __clampHandleAbsYForPart,
  isRecord,
  asRecord,
  readNumFrom,
  cloneMaybe,
} from './corner_geometry_plan.js';

import { isPrimaryMode, type CornerOpsEmitContext } from './corner_ops_emit_common.js';
import { createCornerConnectorSetup } from './corner_connector_emit_shared.js';
import { buildCornerConnectorShell } from './corner_connector_emit_shell.js';
import { applyCornerConnectorInteriorFlow } from './corner_connector_interior_emit.js';
import { applyCornerConnectorDoorFlow } from './corner_connector_door_emit.js';
import { applyCornerConnectorCornice } from './corner_connector_cornice_emit.js';

export function emitCornerConnector(ctx: CornerOpsEmitContext): void {
  const setup = createCornerConnectorSetup(ctx);
  if (!setup) return;

  const shell = buildCornerConnectorShell(setup);
  const { App, wingGroup, __applyStableShadowsToModule } = ctx;
  const { mx, L, Dmain, shape, pts, interiorX, interiorZ, cornerGroup, showFrontPanel } = setup;
  const { panelThick, backPanelThick, backPanelOutsideInsetZ, addEdgePanel } = shell;

  applyCornerConnectorInteriorFlow({
    ctx,
    locals: {
      mx,
      L,
      Dmain,
      shape,
      pts,
      interiorX,
      interiorZ,
      panelThick,
      backPanelThick,
      __backPanelOutsideInsetZ: backPanelOutsideInsetZ,
      cornerGroup,
    },
    helpers: { reportErrorThrottled },
  });

  applyCornerConnectorDoorFlow({
    ctx,
    locals: {
      pts,
      interiorX,
      interiorZ,
      panelThick,
      showFrontPanel,
      cornerGroup,
      addEdgePanel,
    },
    helpers: {
      getCfg,
      readMapOrEmpty,
      isSplitEnabledInMap,
      isSplitExplicitInMap,
      isSplitBottomEnabledInMap,
      readSplitPosListFromMap,
      readModulesConfigurationListFromConfigSnapshot,
      getOrCreateCacheRecord,
      MODES,
      isPrimaryMode,
      __isLongEdgeHandleVariantForPart,
      __topSplitHandleInsetForPart,
      __edgeHandleLongLiftAbsYForCell,
      __edgeHandleLongLiftAbsYForCornerCells,
      __edgeHandleAlignedBaseAbsYForCornerCells,
      __clampHandleAbsYForPart,
      isRecord,
      asRecord,
      readNumFrom,
      cloneMaybe,
      reportErrorThrottled,
    },
  });

  applyCornerConnectorCornice({
    ctx,
    locals: {
      pts,
      panelThick,
      backPanelThick,
      showFrontPanel,
      cornerGroup,
      interiorX,
      interiorZ,
      mx,
      L,
    },
    helpers: { readNumFrom, asRecord, reportErrorThrottled },
  });

  __applyStableShadowsToModule(cornerGroup);
  if (!addToWardrobeGroup(App, cornerGroup)) wingGroup.add(cornerGroup);
}
