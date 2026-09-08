import type {
  MarkerMeshLike,
  MarkerTHREESurface,
  PreviewMarkerArgs,
  RenderPreviewMarkerContext,
} from './render_preview_marker_ops_types.js';
import {
  ensureCachedMarker,
  ensureWardrobeAttachment,
  markerArgsRecord,
  resolveMarkerTHREE,
} from './render_preview_marker_ops_shared.js';
import { createMarkerMaterial } from './render_preview_marker_ops_materials.js';

const DOOR_CUT_HOVER_VISUAL_VERSION = 2;

function configureDoorCutHoverMarker(THREE: MarkerTHREESurface, mesh: MarkerMeshLike): MarkerMeshLike {
  mesh.userData = mesh.userData || {};
  if (mesh.userData.__doorCutHoverVisualVersion === DOOR_CUT_HOVER_VISUAL_VERSION) return mesh;

  // The marker is the exact cut indicator, not the pointer hit target. Keep it
  // high-contrast because it must remain readable over transparent doors.
  const addMat = createMarkerMaterial(THREE, 0x7fd3ff, 0.9);
  const removeMat = createMarkerMaterial(THREE, 0xff4d4f, 0.94);
  const alignedMat = createMarkerMaterial(THREE, 0x34d399, 0.92);

  // Repair a marker retained by Vite/HMR or a long-lived runtime from the previous
  // broad-band + child-line implementation instead of returning stale cache state.
  const stalePrecisionLine = mesh.userData.__precisionLine;
  if (stalePrecisionLine) {
    const staleLine = stalePrecisionLine as { visible?: boolean };
    staleLine.visible = false;
    mesh.remove?.(stalePrecisionLine);
  }

  delete mesh.userData.__precisionLine;
  delete mesh.userData.__precisionMatAdd;
  delete mesh.userData.__precisionMatRemove;
  delete mesh.userData.__precisionMatAligned;

  mesh.material = addMat;
  mesh.userData.__matAdd = addMat;
  mesh.userData.__matRemove = removeMat;
  mesh.userData.__matAligned = alignedMat;
  mesh.userData.__doorCutHoverVisualVersion = DOOR_CUT_HOVER_VISUAL_VERSION;
  mesh.renderOrder = 10000;
  return mesh;
}

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
      if (existing) return configureDoorCutHoverMarker(THREE, existing);

      const geo = new THREE.PlaneGeometry(1, 1);
      const mesh = configureDoorCutHoverMarker(THREE, new THREE.Mesh(geo, null));
      mesh.visible = false;

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
