import { getInternalGridMap } from '../runtime/cache_access.js';
import { __wp_toModuleKey, __wp_ui } from './canvas_picking_core_helpers.js';
import {
  __wp_clearSketchHover,
  __wp_isViewportRoot,
  __wp_measureObjectLocalBox,
  __wp_parseSketchBoxToolSpec,
  __wp_projectWorldPointToLocal,
  __wp_readSketchHover,
  __wp_resolveSketchBoxGeometry,
  __wp_tryCommitSketchFreePlacementFromHover,
} from './canvas_picking_local_helpers.js';
import { tryHandleManualLayoutSketchToolClick } from './canvas_picking_manual_layout_sketch_tools.js';
import { readActiveManualTool } from './canvas_picking_manual_tool_access.js';
import {
  fillManualLayoutShelves,
  normalizeManualLayoutShelfVariant,
  toggleManualLayoutRod,
  toggleManualLayoutShelf,
  toggleManualLayoutStorage,
} from './canvas_picking_manual_layout_config_ops.js';
import {
  type CanvasLayoutEditClickArgs,
  readGridBounds,
  readGridInfo,
  readHitPointY,
  readRecordString,
} from './canvas_picking_layout_edit_flow_shared.js';

function readFiniteRecordNumber(value: unknown, key: string): number | null {
  const raw = value && typeof value === 'object' ? Reflect.get(value, key) : undefined;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function resolveCurrentToolDivisions(ui: unknown): number {
  const raw = readFiniteRecordNumber(ui, 'currentGridDivisions') ?? 6;
  return raw >= 2 && raw <= 8 ? raw : 6;
}

function resolveManualLayoutShelfVariant(ui: unknown) {
  return normalizeManualLayoutShelfVariant(readRecordString(ui, 'currentGridShelfVariant'));
}

function resolveManualLayoutToggleIndex(args: {
  manualTool: string | null;
  hitY: number;
  bottomY: number;
  totalHeight: number;
  divisions: number;
}): number | null {
  const { manualTool, hitY, bottomY, totalHeight, divisions } = args;
  const safeStep = totalHeight / divisions;
  const relativeY = hitY - bottomY;

  if (manualTool === 'shelf') {
    if (divisions <= 1) return null;
    let shelfIndex = Math.round(relativeY / safeStep);
    if (shelfIndex < 1) shelfIndex = 1;
    if (shelfIndex > divisions - 1) shelfIndex = divisions - 1;
    return shelfIndex - 1;
  }

  let gridIndex = Math.ceil(relativeY / safeStep);
  if (gridIndex < 1) gridIndex = 1;
  if (gridIndex > divisions) gridIndex = divisions;
  return gridIndex - 1;
}

export function tryHandleCanvasManualLayoutClick(args: CanvasLayoutEditClickArgs): boolean {
  const {
    App,
    foundModuleIndex,
    __activeModuleKey,
    __isBottomStack,
    __isManualLayoutMode,
    moduleHitY,
    intersects,
    __patchConfigForKey,
    __getActiveConfigRef,
  } = args;

  if (!__isManualLayoutMode || foundModuleIndex === null) return false;

  (() => {
    const configRef = __getActiveConfigRef();
    const mapKey = foundModuleIndex;
    const gridMap = getInternalGridMap(App, __isBottomStack);
    const gridInfo = readGridInfo(gridMap, mapKey);
    const gridBounds = readGridBounds(gridInfo, configRef?.savedDims);
    if (!gridBounds) return;
    const { topY, bottomY } = gridBounds;

    const ui = __wp_ui(App);
    const currentToolDivs = resolveCurrentToolDivisions(ui);
    const shelfVariant = resolveManualLayoutShelfVariant(ui);
    const savedDivs =
      configRef && configRef.gridDivisions ? Number(configRef.gridDivisions) : currentToolDivs;
    const isNewLayout = !(configRef && configRef.isCustom) || savedDivs !== currentToolDivs;

    const manualTool = readActiveManualTool(App);
    const __mt = typeof manualTool === 'string' ? String(manualTool) : '';
    if (
      tryHandleManualLayoutSketchToolClick({
        App,
        manualTool,
        __mt,
        __activeModuleKey,
        __isBottomStack,
        topY,
        bottomY,
        mapKey,
        __gridMap: gridMap,
        moduleHitY,
        intersects,
        __patchConfigForKey,
        __wp_tryCommitSketchFreePlacementFromHover,
        __wp_readSketchHover,
        __wp_clearSketchHover,
        __wp_toModuleKey,
        __wp_measureObjectLocalBox,
        __wp_projectWorldPointToLocal,
        __wp_parseSketchBoxToolSpec,
        __wp_resolveSketchBoxGeometry,
        __wp_isViewportRoot,
      })
    ) {
      return;
    }

    if (isNewLayout && manualTool === 'shelf') {
      __patchConfigForKey(
        __activeModuleKey,
        cfg => {
          fillManualLayoutShelves(cfg, {
            divs: currentToolDivs,
            shelfVariant,
            topY,
            bottomY,
          });
        },
        { source: 'manualLayout.fillAllShelves', immediate: true }
      );
      return;
    }

    const totalHeight = topY - bottomY;
    const hitY = moduleHitY ?? readHitPointY(intersects[0]);
    if (typeof hitY !== 'number') return;

    const arrayIdx = resolveManualLayoutToggleIndex({
      manualTool,
      hitY,
      bottomY,
      totalHeight,
      divisions: currentToolDivs,
    });
    if (arrayIdx == null) return;

    __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        const savedDivsInner = cfg.gridDivisions ? Number(cfg.gridDivisions) : currentToolDivs;
        const reset = !cfg.isCustom || savedDivsInner !== currentToolDivs;

        if (manualTool === 'storage') {
          toggleManualLayoutStorage(cfg, {
            divs: currentToolDivs,
            topY,
            bottomY,
            reset,
          });
          return;
        }

        if (manualTool === 'shelf') {
          toggleManualLayoutShelf(cfg, {
            divs: currentToolDivs,
            topY,
            bottomY,
            reset,
            arrayIdx,
            shelfVariant,
          });
          return;
        }

        if (manualTool === 'rod') {
          toggleManualLayoutRod(cfg, {
            divs: currentToolDivs,
            topY,
            bottomY,
            reset,
            arrayIdx,
          });
        }
      },
      { source: 'manualLayout.toggleItem', immediate: true }
    );
  })();

  return true;
}
