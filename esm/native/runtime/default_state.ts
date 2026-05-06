// Default state factory for the root store.
// Extracted from platform installer to keep platform.js smaller and make the
// state shape reusable/inspectable.
//
// Design goals:
// - No side-effects on import
// - Returns a fresh object each call (no shared references)

import type { RootStateLike } from '../../../types';

import {
  DEFAULT_CHEST_DRAWERS_COUNT,
  DEFAULT_CORNER_DOORS,
  DEFAULT_CORNER_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  DEFAULT_WIDTH,
  HINGED_DEFAULT_DEPTH,
  BASE_LEG_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

export function createDefaultState(opts?: { noneMode?: string }): RootStateLike {
  opts = opts && typeof opts === 'object' ? opts : {};
  const NONE = typeof opts.noneMode === 'string' && opts.noneMode ? opts.noneMode : 'none';

  return {
    ui: {
      // Core structural inputs (single source-of-truth for build essentials).
      // Must match the default values in index_pro.html inputs.
      raw: {
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        depth: HINGED_DEFAULT_DEPTH,
        doors: DEFAULT_HINGED_DOORS,
        chestDrawersCount: DEFAULT_CHEST_DRAWERS_COUNT,
        stackSplitLowerHeight: DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
        stackSplitLowerDepth: HINGED_DEFAULT_DEPTH,
        stackSplitLowerWidth: DEFAULT_WIDTH,
        stackSplitLowerDoors: DEFAULT_HINGED_DOORS,

        // Stack split linking policy (lower values are linked to overall unless manual is true).
        stackSplitLowerDepthManual: false,
        stackSplitLowerWidthManual: false,
        stackSplitLowerDoorsManual: false,
      },

      // Sidebar tab state (React + legacy DOM share this, store-first).
      activeTab: 'structure',

      // Builder UI defaults (must exist for first render; no DOM fallbacks).
      doorStyle: 'flat',
      singleDoorPos: 'left',
      structureSelect: '',
      cornerWidth: DEFAULT_CORNER_WIDTH,
      // Corner wardrobe (independent controls)
      cornerDoors: DEFAULT_CORNER_DOORS,
      cornerHeight: DEFAULT_HEIGHT,
      cornerDepth: HINGED_DEFAULT_DEPTH,
      baseType: 'plinth',
      baseLegStyle: 'tapered',
      baseLegColor: 'black',
      baseLegHeightCm: BASE_LEG_DIMENSIONS.defaults.heightCm,
      baseLegWidthCm: BASE_LEG_DIMENSIONS.defaults.taperedWidthCm,
      // Sliding wardrobes: top/bottom rails finish (default requested: nickel).
      slidingTracksColor: 'nickel',
      colorChoice: '#ffffff',
      customColor: '#ffffff',
      groovesEnabled: false,
      splitDoors: false,
      internalDrawersEnabled: false,
      hasCornice: false,
      // Split wardrobe into 2 stacked units (lower has base + custom depth, upper has no base).
      stackSplitEnabled: false,
      showContents: false,

      // View/UI toggles (defaults must match index_pro.html "checked" states)
      showHanger: true,
      showDimensions: true,
      globalClickMode: true,

      // Additional toggles (default off)
      notesEnabled: false,
      sketchMode: false,
      multiColorEnabled: false,
      handleControl: false,
      hingeDirection: false,
      removeDoorsEnabled: false,
      cornerMode: false,
      isChestMode: false,
      lightingControl: false,

      // UI-only state (ephemeral, not persisted). Kept here to avoid legacy uiState globals.
      currentLayoutType: 'shelves',
      currentGridDivisions: 6,
      currentGridShelfVariant: 'regular',
      currentExtDrawerType: 'regular',
      currentExtDrawerCount: 1,
      perCellGridMap: {},
      activeGridCellId: null,
      currentCurtainChoice: 'none',
      currentMirrorDraftHeightCm: '',
      currentMirrorDraftWidthCm: '',
      currentFloorType: 'parquet',
      // Default wall color should match the "אפור גרפיט" preset.
      lastSelectedWallColor: '#37474f',
      lastSelectedFloorStyleId: null,
      lastSelectedFloorStyleIdByType: {},
      lastLightPreset: 'default',
    },
    config: {
      modulesConfiguration: [
        // LEFT (index 0): "תלייה" עם 2 מדפים עליונים
        {
          layout: 'hanging_top2',
          extDrawersCount: 0,
          hasShoeDrawer: false,
          intDrawersSlot: 0,
          isCustom: false,
          customData: {
            shelves: [false, false, false, false, false, false],
            rods: [false, false, false, false, false, false],
            storage: false,
          },
        },

        // RIGHT (index 1): מדפים
        {
          layout: 'shelves',
          extDrawersCount: 0,
          hasShoeDrawer: false,
          intDrawersSlot: 0,
          isCustom: false,
          customData: {
            shelves: [false, false, false, false, false, false],
            rods: [false, false, false, false, false, false],
            storage: false,
          },
        },
      ],
      stackSplitLowerModulesConfiguration: [
        // Split-lower defaults are INDEPENDENT from the upper wardrobe.
        // Default request: 2 shelves in every cell of the lower unit.
        {
          layout: 'shelves',
          extDrawersCount: 0,
          hasShoeDrawer: false,
          intDrawersSlot: 0,
          isCustom: true,
          gridDivisions: 6,
          customData: {
            // 2 shelves (indices 2 and 4 out of 1..5) => 3 compartments.
            shelves: [false, true, false, true, false, false],
            rods: [false, false, false, false, false, false],
            storage: false,
          },
        },
        {
          layout: 'shelves',
          extDrawersCount: 0,
          hasShoeDrawer: false,
          intDrawersSlot: 0,
          isCustom: true,
          gridDivisions: 6,
          customData: {
            shelves: [false, true, false, true, false, false],
            rods: [false, false, false, false, false, false],
            storage: false,
          },
        },
      ],
      cornerConfiguration: {},
      groovesMap: {},
      grooveLinesCountMap: {},
      splitDoorsMap: {},
      removedDoorsMap: {},
      drawerDividersMap: {},
      individualColors: {},
      doorStyleMap: {},
      handlesMap: {},
      hingeMap: {},
      curtainMap: {},
      mirrorLayoutMap: {},
      doorTrimMap: {},
      savedColors: [],
      preChestState: null,
      isLibraryMode: false,
      wardrobeType: 'hinged',
      globalHandleType: 'standard',
      isMultiColorMode: false,
      showDimensions: true,
      isManualWidth: false,
      customUploadedDataURL: null,
      grooveLinesCount: null,
    },
    mode: {
      primary: NONE,
      opts: {},
    },
    runtime: {
      doorsOpen: false,
      doorsLastToggleTime: 0,
      sketchMode: false,
      restoring: false,
      systemReady: false,

      // QA/debug flags (store.runtime-only; no legacy flags root-slot)
      failFast: false,
      verboseConsoleErrors: true,
      verboseConsoleErrorsDedupeMs: 4000,
      debug: false,

      // old-backed transient state (single source-of-truth via store.runtime + proxies)
      globalClickMode: true,
      roomDesignActive: true,
      notesPicking: false,

      paintColor: null,
      handlesType: 'standard',
      interiorManualTool: null,
      drawersOpenId: null,

      wardrobeWidthM: null,
      wardrobeHeightM: null,
      wardrobeDepthM: null,
      wardrobeDoorsCount: null,
    },
    meta: { version: 0, updatedAt: 0, dirty: false },
  };
}
