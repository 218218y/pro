import type { AppContainer } from '../../../types';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import {
  estimateVisibleModuleFrontZ,
  readInteriorModuleConfigRef,
  resolveDrawerHoverPreviewTarget,
  resolveInteriorHoverTarget,
} from './canvas_picking_hover_targets.js';
import type { InteriorHoverTarget } from './canvas_picking_hover_targets.js';
import {
  __wp_getViewportRoots,
  __wp_isViewportRoot,
  __wp_measureObjectLocalBox,
  __wp_projectWorldPointToLocal,
} from './canvas_picking_local_helpers_runtime.js';
import { __wp_raycastReuse, __wp_toModuleKey } from './canvas_picking_core_helpers.js';

export const __wp_resolveInteriorHoverTarget = (
  App: AppContainer,
  raycaster: RaycasterLike,
  mouse: MouseVectorLike,
  ndcX: number,
  ndcY: number
): InteriorHoverTarget | null =>
  resolveInteriorHoverTarget({
    App,
    raycaster,
    mouse,
    ndcX,
    ndcY,
    getViewportRoots: __wp_getViewportRoots,
    raycastReuse: __wp_raycastReuse,
    isViewportRoot: __wp_isViewportRoot,
    toModuleKey: __wp_toModuleKey,
    projectWorldPointToLocal: __wp_projectWorldPointToLocal,
    measureObjectLocalBox: __wp_measureObjectLocalBox,
  });

export const __wp_estimateVisibleModuleFrontZ = (
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
): number =>
  estimateVisibleModuleFrontZ({
    App,
    target,
    selectorBox,
    isViewportRoot: __wp_isViewportRoot,
    toModuleKey: __wp_toModuleKey,
    projectWorldPointToLocal: __wp_projectWorldPointToLocal,
    measureObjectLocalBox: __wp_measureObjectLocalBox,
  });

export const __wp_resolveDrawerHoverPreviewTarget = (
  App: AppContainer,
  raycaster: RaycasterLike,
  mouse: MouseVectorLike,
  ndcX: number,
  ndcY: number
) =>
  resolveDrawerHoverPreviewTarget({
    App,
    raycaster,
    mouse,
    ndcX,
    ndcY,
    getViewportRoots: __wp_getViewportRoots,
    raycastReuse: __wp_raycastReuse,
    projectWorldPointToLocal: __wp_projectWorldPointToLocal,
    measureObjectLocalBox: __wp_measureObjectLocalBox,
  });

export const __wp_readInteriorModuleConfigRef = readInteriorModuleConfigRef;
