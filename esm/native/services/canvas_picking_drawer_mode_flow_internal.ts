import type { AppContainer, ModuleConfigLike } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import { getTools } from '../runtime/service_access.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { __wp_ui } from './canvas_picking_core_helpers.js';
import type { ModuleKey, PatchConfigForKeyFn } from './canvas_picking_drawer_mode_flow_shared.js';
import { asInternalGridInfo } from './canvas_picking_drawer_mode_flow_shared.js';

export function tryHandleInternalDrawerModeClick(args: {
  App: AppContainer;
  foundModuleIndex: ModuleKey | 'corner' | null;
  activeModuleKey: ModuleKey | 'corner' | null;
  isBottomStack: boolean;
  isManualLayoutMode: boolean;
  isIntDrawerEditMode: boolean;
  moduleHitY: number | null;
  intersects: RaycastHitLike[];
  patchConfigForKey: PatchConfigForKeyFn;
}): boolean {
  const {
    App,
    foundModuleIndex,
    activeModuleKey,
    isBottomStack,
    isManualLayoutMode,
    isIntDrawerEditMode,
    moduleHitY,
    intersects,
    patchConfigForKey,
  } = args;
  if (!isIntDrawerEditMode || foundModuleIndex === null) return false;

  const internalGridMap = getInternalGridMap(App, isBottomStack);
  const info = asInternalGridInfo(internalGridMap[foundModuleIndex]);
  if (!info) return true;

  const firstHitPoint = intersects[0]?.point;
  const firstHitY = typeof firstHitPoint?.y === 'number' ? firstHitPoint.y : null;
  const y = moduleHitY !== null ? moduleHitY : firstHitY;
  if (typeof y !== 'number') return true;

  const bottomY = typeof info.effectiveBottomY === 'number' ? info.effectiveBottomY : 0;
  const topY = typeof info.effectiveTopY === 'number' ? info.effectiveTopY : bottomY + 1;
  if (!(topY > bottomY)) return true;
  const relativeY = y - bottomY;

  const ui = __wp_ui(App);
  const toolDivsRaw = ui && typeof ui.currentGridDivisions === 'number' ? ui.currentGridDivisions : 6;
  const toolDivs = toolDivsRaw >= 2 && toolDivsRaw <= 8 ? toolDivsRaw : 6;

  const tools = getTools(App);
  const manualTool = typeof tools.getInteriorManualTool === 'function' ? tools.getInteriorManualTool() : null;
  const targetDivisions =
    isManualLayoutMode && (manualTool === 'shelf' || manualTool === 'rod')
      ? toolDivs
      : info.gridDivisions || 6;

  const step = (topY - bottomY) / targetDivisions;
  let gridIndex = Math.ceil(relativeY / step);
  if (gridIndex < 1) gridIndex = 1;
  if (gridIndex > targetDivisions) gridIndex = targetDivisions;

  patchConfigForKey(
    activeModuleKey,
    (cfg: ModuleConfigLike) => {
      if (!Array.isArray(cfg.intDrawersList)) cfg.intDrawersList = [];
      const list = cfg.intDrawersList;
      const existingIdx = list.indexOf(gridIndex);
      if (existingIdx > -1) list.splice(existingIdx, 1);
      else list.push(gridIndex);
      if (cfg.intDrawersSlot) cfg.intDrawersSlot = 0;
    },
    { source: 'intDrawers.toggle', immediate: true }
  );

  return true;
}
