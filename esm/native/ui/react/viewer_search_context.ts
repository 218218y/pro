import type { RootStateLike } from '../../../../types';
import { selectWardrobeType } from './selectors/config_selectors.js';
import { readUiRawIntFromSnapshot } from './selectors/ui_raw_selectors.js';
import { deriveStructureTabSelectionState } from './tabs/structure_tab_view_state_runtime.js';
import { readDesignTabRoundedFrameSideSelection } from './tabs/design_tab_view_state_runtime.js';
import type { ViewerSearchContextKey } from './viewer_search_catalog.js';

/** Availability follows the same store-derived conditions as the actual tab controls. */
export function selectViewerSearchContext(state: RootStateLike): Record<ViewerSearchContextKey, boolean> {
  const { ui, config } = state;
  const wardrobeType = selectWardrobeType(config);
  const doors = readUiRawIntFromSnapshot(ui, 'doors', 4);
  const isSliding = wardrobeType === 'sliding';
  const isChest = !!ui.isChestMode;
  const mainAbsent = !isSliding && !isChest && doors === 0;
  const selection = deriveStructureTabSelectionState({
    wardrobeType,
    doors,
    structureSelectRaw: typeof ui.structureSelect === 'string' ? ui.structureSelect : '',
  });
  return {
    main: !mainAbsent,
    cabinet: !mainAbsent && !isChest,
    dimensions: !mainAbsent || !!ui.cornerMode,
    'wardrobe-dimensions': !isChest && (!mainAbsent || !!ui.cornerMode),
    'not-chest': !isChest,
    'drawer-runners': isChest || !isSliding,
    hinged: !isSliding,
    sliding: isSliding,
    'structure-pattern': !mainAbsent && selection.shouldShowStructureButtons,
    'single-door': !mainAbsent && selection.shouldShowSingleDoor,
    'hinge-direction': !mainAbsent && selection.shouldShowHingeBtn,
    'removed-side': readDesignTabRoundedFrameSideSelection(config).partIds.length > 0,
    'chest-entry': !isSliding && !mainAbsent,
    'corner-entry': !isChest && !(mainAbsent && !ui.cornerMode),
  };
}

export function viewerSearchContextKeys(
  context: Record<ViewerSearchContextKey, boolean>
): ReadonlySet<ViewerSearchContextKey> {
  return new Set((Object.keys(context) as ViewerSearchContextKey[]).filter(key => context[key]));
}
