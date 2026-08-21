import type { AppContainer } from '../../../types';

import { getCfg } from '../kernel/api.js';
import { __wp_raycastReuse } from './canvas_picking_core_helpers.js';
import { resolveCellDimsPostClickFreeBoxHoverIdentity } from './canvas_picking_cell_dims_post_click_hover.js';
import type { CellDimsFreeBoxHoverCapabilities } from './canvas_picking_cell_dims_free_box_hover.js';
import { captureCellDimsFreeBoxState } from './canvas_picking_cell_dims_free_box_state.js';
import { __wp_getViewportRoots, __wp_measureWardrobeLocalBox } from './canvas_picking_projection_runtime.js';

const capabilitiesByApp = new WeakMap<AppContainer, CellDimsFreeBoxHoverCapabilities>();

/**
 * AppContainer adapter for Cell Dimensions Free Box hover resolution.
 *
 * The runtime boundary captures config into a typed free-box snapshot; the hover
 * core owns only identity/geometry decisions and receives the five capabilities it needs. This adapter is weakly cached because
 * the path runs on pointer movement and must not allocate a new closure set per frame.
 */
export function createCellDimsFreeBoxHoverCapabilities(App: AppContainer): CellDimsFreeBoxHoverCapabilities {
  const cached = capabilitiesByApp.get(App);
  if (cached) return cached;

  const capabilities: CellDimsFreeBoxHoverCapabilities = {
    readFreeBoxState: (moduleKey, stackKey, boxId) =>
      captureCellDimsFreeBoxState({
        configSnapshot: getCfg(App),
        moduleKey,
        stackKey,
        boxId,
      }),
    readViewportRoots: () => {
      const { camera, wardrobeGroup } = __wp_getViewportRoots(App);
      return { camera, wardrobeGroup };
    },
    measureWardrobeLocalBox: () => __wp_measureWardrobeLocalBox(App),
    resolvePostClickIdentity: (ndcX, ndcY) =>
      resolveCellDimsPostClickFreeBoxHoverIdentity({ App, ndcX, ndcY }),
    raycast: args => __wp_raycastReuse({ App, ...args }),
  };
  capabilitiesByApp.set(App, capabilities);
  return capabilities;
}
