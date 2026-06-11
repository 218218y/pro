import type { PreviewMarkerArgs, RenderPreviewMarkerContext } from './render_preview_marker_ops_types.js';
import {
  ensureCachedMarker,
  ensureWardrobeAttachment,
  markerArgsRecord,
  resolveMarkerTHREE,
} from './render_preview_marker_ops_shared.js';
import { createMarkerMaterial } from './render_preview_marker_ops_materials.js';

export function createDoorCutHoverMarkerOwner(ctx: RenderPreviewMarkerContext) {
  function ensureDoorCutHoverMarker(args: PreviewMarkerArgs) {
    const markerArgs = markerArgsRecord(args);
    const App = ctx.app(markerArgs);
    ctx.ops(App);
    const THREE = resolveMarkerTHREE(
      App,
      markerArgs,
      ctx.assertTHREE,
      'native/builder/render_ops.doorCutHoverMarker'
    );
    if (!THREE) return null;

    try {
      const existing = ensureCachedMarker('doorCutHoverMarker', ctx.wardrobeGroup(App), key =>
        ctx.cacheValue(App, key)
      );
      if (existing) return existing;

      const geo = new THREE.PlaneGeometry(1, 1);
      const addMat = createMarkerMaterial(THREE, 0x7fd3ff, 0.22);
      const removeMat = createMarkerMaterial(THREE, 0xff6b6b, 0.26);

      const mesh = new THREE.Mesh(geo, addMat);
      mesh.userData = mesh.userData || {};
      mesh.userData.__matAdd = addMat;
      mesh.userData.__matRemove = removeMat;
      mesh.visible = false;
      mesh.renderOrder = 10000;

      ensureWardrobeAttachment(ctx.wardrobeGroup(App), mesh);
      ctx.writeCacheValue(App, 'doorCutHoverMarker', mesh);
      ctx.addToWardrobe(App, mesh);
      return mesh;
    } catch (e) {
      ctx.renderOpsHandleCatch(App, 'ensureDoorCutHoverMarker', e, undefined, {
        failFast: false,
        throttleMs: 5000,
      });
      return null;
    }
  }

  return { ensureDoorCutHoverMarker };
}
