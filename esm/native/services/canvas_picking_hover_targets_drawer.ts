import { getDrawersArray } from '../runtime/render_access.js';
import {
  asHitObject,
  type DrawerHoverPreviewTarget,
  isRenderableHitObject,
  type ResolveDrawerHoverPreviewTargetArgs,
  readParent,
} from './canvas_picking_hover_targets_shared.js';

export function resolveDrawerHoverPreviewTarget(
  args: ResolveDrawerHoverPreviewTargetArgs
): DrawerHoverPreviewTarget | null {
  const {
    App,
    raycaster,
    mouse,
    ndcX,
    ndcY,
    getViewportRoots,
    raycastReuse,
    projectWorldPointToLocal,
    measureObjectLocalBox,
  } = args;
  try {
    const { camera, wardrobeGroup } = getViewportRoots(App);
    if (!camera || !wardrobeGroup) return null;
    const intersects = raycastReuse({
      App,
      raycaster,
      mouse,
      camera,
      ndcX,
      ndcY,
      objects: [wardrobeGroup],
      recursive: true,
    });
    const drawersArray = getDrawersArray(App);
    for (let i = 0; i < intersects.length; i++) {
      const hit = intersects[i];
      const obj = asHitObject(hit?.object);
      if (!isRenderableHitObject(obj)) continue;

      let curr = obj;
      let foundDrawer = null;
      while (curr) {
        const match = drawersArray.find(d => d && d.group === curr);
        if (match) {
          foundDrawer = match || null;
          break;
        }
        curr = curr.parent || null;
      }
      if (!foundDrawer || !foundDrawer.group) continue;

      const parent = readParent(foundDrawer.group) || wardrobeGroup;
      const box = measureObjectLocalBox(App, foundDrawer.group, parent);
      if (!box || !(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) continue;
      const localPoint = projectWorldPointToLocal(App, hit.point || null, parent);
      if (!localPoint) continue;

      const withinX = Math.abs(Number(localPoint.x) - Number(box.centerX)) <= Number(box.width) / 2 + 0.01;
      const withinY = Math.abs(Number(localPoint.y) - Number(box.centerY)) <= Number(box.height) / 2 + 0.01;
      if (!withinX || !withinY) continue;

      const frontZ = Number(box.centerZ) + Number(box.depth) / 2;
      const frontThreshold = Math.max(0.01, Math.min(Number(box.depth) * 0.28, 0.08));
      const nearFront = Number(localPoint.z) >= frontZ - frontThreshold;
      if (!nearFront) continue;

      return { drawer: foundDrawer, parent, box };
    }
  } catch {
    // ignore
  }
  return null;
}
