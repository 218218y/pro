import type { AppContainer } from '../../../types';
import { getWardrobeGroup } from '../runtime/render_access.js';
import { __wp_measureObjectLocalBox } from './canvas_picking_projection_runtime_box_object.js';
import { isNoMainWardrobeSketchMode } from './canvas_picking_sketch_free_box_no_main.js';
import { __readNoMainWorkspaceBox } from './canvas_picking_projection_runtime_box_no_main_workspace.js';
import { __measureWardrobeSceneLocalBox } from './canvas_picking_projection_runtime_box_wardrobe_scene.js';
import type { __ProjectionLocalBox } from './canvas_picking_projection_runtime_box_shared.js';

export { __wp_measureObjectLocalBox } from './canvas_picking_projection_runtime_box_object.js';

export function __wp_measureWardrobeLocalBox(App: AppContainer): __ProjectionLocalBox | null {
  try {
    // In no-main sketch mode the workspace cache is the canonical cabinet frame.
    // Scene bounds can contain free-box decorations/content and therefore must not redefine
    // the Z origin that the same free box uses for hover and content placement.
    const noMainWorkspaceBox = isNoMainWardrobeSketchMode(App) ? __readNoMainWorkspaceBox(App) : null;
    if (noMainWorkspaceBox) return noMainWorkspaceBox;

    const wardrobeGroup = getWardrobeGroup(App);
    const sceneBox = __measureWardrobeSceneLocalBox(App, wardrobeGroup);
    if (sceneBox) return sceneBox;

    return __wp_measureObjectLocalBox(App, wardrobeGroup, wardrobeGroup);
  } catch {
    return null;
  }
}
