import type { PreviewMarkerArgs, RenderPreviewMarkerContext } from './render_preview_marker_ops_types.js';
import {
  ensureCachedMarker,
  ensureWardrobeAttachment,
  markerArgsRecord,
  resolveMarkerTHREE,
} from './render_preview_marker_ops_shared.js';
import { createMarkerMaterial } from './render_preview_marker_ops_materials.js';

export function createDoorActionHoverMarkerOwner(ctx: RenderPreviewMarkerContext) {
  function ensureDoorActionHoverMarker(args: PreviewMarkerArgs) {
    const markerArgs = markerArgsRecord(args);
    const App = ctx.app(markerArgs);
    ctx.ops(App);
    const THREE = resolveMarkerTHREE(
      App,
      markerArgs,
      ctx.assertTHREE,
      'native/builder/render_ops.doorActionHoverMarker'
    );
    if (!THREE) return null;

    try {
      const existing = ensureCachedMarker('doorActionHoverMarker', ctx.wardrobeGroup(App), key =>
        ctx.cacheValue(App, key)
      );
      if (existing) return existing;

      const geo = new THREE.PlaneGeometry(1, 1);
      const grooveMat = createMarkerMaterial(THREE, 0x7fd3ff, 0.12);
      const addMat = createMarkerMaterial(THREE, 0x7fd3ff, 0.2);
      const mirrorMat = createMarkerMaterial(THREE, 0xa4c2f4, 0.22);
      const removeMat = createMarkerMaterial(THREE, 0xff6b6b, 0.18);
      const centerMat = createMarkerMaterial(THREE, 0x32c96b, 0.22);

      const mesh = new THREE.Mesh(geo, grooveMat);
      mesh.userData = mesh.userData || {};
      mesh.userData.__matGroove = grooveMat;
      mesh.userData.__matAdd = addMat;
      mesh.userData.__matMirror = mirrorMat;
      mesh.userData.__matRemove = removeMat;
      mesh.userData.__matCenter = centerMat;
      mesh.visible = false;
      mesh.renderOrder = 9999;

      ensureWardrobeAttachment(ctx.wardrobeGroup(App), mesh);
      ctx.writeCacheValue(App, 'doorActionHoverMarker', mesh);
      ctx.addToWardrobe(App, mesh);
      return mesh;
    } catch (e) {
      ctx.renderOpsHandleCatch(App, 'ensureDoorActionHoverMarker', e, undefined, {
        failFast: false,
        throttleMs: 5000,
      });
      return null;
    }
  }

  return { ensureDoorActionHoverMarker };
}
