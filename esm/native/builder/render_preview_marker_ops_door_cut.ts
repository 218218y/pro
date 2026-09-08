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
      const alignedMat = createMarkerMaterial(THREE, 0x34d399, 0.3);
      const precisionAddMat = createMarkerMaterial(THREE, 0x7fd3ff, 0.96);
      const precisionRemoveMat = createMarkerMaterial(THREE, 0xff4d4f, 0.98);
      const precisionAlignedMat = createMarkerMaterial(THREE, 0x34d399, 0.98);

      const mesh = new THREE.Mesh(geo, addMat);
      const precisionLine = new THREE.Mesh(geo, precisionAddMat);
      precisionLine.userData = precisionLine.userData || {};
      precisionLine.userData.__ignoreRaycast = true;
      precisionLine.raycast = function () {};
      precisionLine.visible = false;
      precisionLine.renderOrder = 10001;
      mesh.add(precisionLine);

      mesh.userData = mesh.userData || {};
      mesh.userData.__matAdd = addMat;
      mesh.userData.__matRemove = removeMat;
      mesh.userData.__matAligned = alignedMat;
      mesh.userData.__precisionLine = precisionLine;
      mesh.userData.__precisionMatAdd = precisionAddMat;
      mesh.userData.__precisionMatRemove = precisionRemoveMat;
      mesh.userData.__precisionMatAligned = precisionAlignedMat;
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
