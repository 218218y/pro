import type { AppContainer } from '../../../types';
import { getWardrobeGroup } from '../runtime/render_access.js';
import { __wp_measureObjectLocalBox } from './canvas_picking_projection_runtime_box_object.js';
import { __readNoMainWardrobeFallbackBox } from './canvas_picking_projection_runtime_box_wardrobe_fallback.js';
import { __measureWardrobeSceneLocalBox } from './canvas_picking_projection_runtime_box_wardrobe_scene.js';
import type { __ProjectionLocalBox } from './canvas_picking_projection_runtime_box_shared.js';

export { __wp_measureObjectLocalBox } from './canvas_picking_projection_runtime_box_object.js';

export function __wp_measureWardrobeLocalBox(App: AppContainer): __ProjectionLocalBox | null {
  try {
    const wardrobeGroup = getWardrobeGroup(App);
    const sceneBox = __measureWardrobeSceneLocalBox(App, wardrobeGroup);
    if (sceneBox) return sceneBox;

    const fallbackBox = __readNoMainWardrobeFallbackBox(App);
    if (fallbackBox) return fallbackBox;

    return __wp_measureObjectLocalBox(App, wardrobeGroup, wardrobeGroup);
  } catch {
    return null;
  }
}
