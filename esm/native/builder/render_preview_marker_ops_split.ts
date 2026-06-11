import type { PreviewMarkerArgs, RenderPreviewMarkerContext } from './render_preview_marker_ops_types.js';
import {
  ensureCachedMarker,
  ensureWardrobeAttachment,
  markerArgsRecord,
  resolveMarkerTHREE,
} from './render_preview_marker_ops_shared.js';
import { createMarkerMaterial } from './render_preview_marker_ops_materials.js';

export function createSplitHoverMarkerOwner(ctx: RenderPreviewMarkerContext) {
  function ensureSplitHoverMarker(args: PreviewMarkerArgs) {
    const markerArgs = markerArgsRecord(args);
    const App = ctx.app(markerArgs);
    ctx.ops(App);
    const THREE = resolveMarkerTHREE(
      App,
      markerArgs,
      ctx.assertTHREE,
      'native/builder/render_ops.splitHoverMarker'
    );
    if (!THREE) return null;

    try {
      const existing = ensureCachedMarker('splitHoverMarker', ctx.wardrobeGroup(App), key =>
        ctx.cacheValue(App, key)
      );
      if (existing) return existing;

      const geo = new THREE.PlaneGeometry(1, 1);
      const markerColor = 0x7fd3ff;
      const markerOpacity = 0.12;
      const matTop = createMarkerMaterial(THREE, markerColor, markerOpacity);
      const matBottom = createMarkerMaterial(THREE, markerColor, markerOpacity);

      const mesh = new THREE.Mesh(geo, matTop);
      mesh.userData = mesh.userData || {};
      mesh.userData.__matTop = matTop;
      mesh.userData.__matBottom = matBottom;
      mesh.visible = false;
      mesh.renderOrder = 9999;

      ensureWardrobeAttachment(ctx.wardrobeGroup(App), mesh);
      ctx.writeCacheValue(App, 'splitHoverMarker', mesh);
      ctx.addToWardrobe(App, mesh);
      return mesh;
    } catch (e) {
      ctx.renderOpsHandleCatch(App, 'ensureSplitHoverMarker', e, undefined, {
        failFast: false,
        throttleMs: 5000,
      });
      return null;
    }
  }

  return { ensureSplitHoverMarker };
}
