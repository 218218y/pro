import { asRecord } from '../runtime/record.js';
import type {
  PreviewMeshLike,
  PreviewObject3DLike,
  PreviewTHREESurface,
  PreviewValueRecord,
  RenderPreviewOpsDeps,
} from './render_preview_ops_contracts.js';

type PreviewMarkerArgs = PreviewValueRecord & {
  THREE?: unknown;
};

type MarkerMaterialMap = PreviewValueRecord & {
  __matTop?: unknown;
  __matBottom?: unknown;
  __matGroove?: unknown;
  __matMirror?: unknown;
  __matRemove?: unknown;
  __matAdd?: unknown;
  __matCenter?: unknown;
  __ignoreRaycast?: boolean;
};

type MarkerMeshLike = PreviewMeshLike & {
  isMesh?: boolean;
  parent?: PreviewObject3DLike | null;
  userData?: MarkerMaterialMap;
};

type MarkerTHREESurface = PreviewTHREESurface & {
  PlaneGeometry: new (width?: number, height?: number) => unknown;
  MeshBasicMaterial: new (params: PreviewValueRecord) => unknown;
  Mesh: new (geometry: unknown, material: unknown) => MarkerMeshLike;
  DoubleSide: unknown;
};

type WardrobeAttachmentGroup = PreviewObject3DLike & {
  add: (...objs: unknown[]) => unknown;
};

function __argsRecord(args: unknown): PreviewMarkerArgs {
  return asRecord<PreviewMarkerArgs>(args) || {};
}

function __asMarkerMesh(value: unknown): MarkerMeshLike | null {
  const mesh = asRecord<MarkerMeshLike>(value);
  return mesh && typeof mesh.add === 'function' ? mesh : null;
}

function __asWardrobeAttachmentGroup(group: unknown): WardrobeAttachmentGroup | null {
  const wardrobeGroup = asRecord<WardrobeAttachmentGroup>(group);
  return wardrobeGroup && typeof wardrobeGroup.add === 'function' ? wardrobeGroup : null;
}

function __readMarkerTHREE(value: unknown): MarkerTHREESurface | null {
  const THREE = asRecord<MarkerTHREESurface>(value);
  if (!THREE) return null;
  return typeof THREE.PlaneGeometry === 'function' &&
    typeof THREE.MeshBasicMaterial === 'function' &&
    typeof THREE.Mesh === 'function'
    ? THREE
    : null;
}

function __ensureWardrobeAttachment(group: unknown, marker: MarkerMeshLike): MarkerMeshLike {
  marker.userData = marker.userData || {};
  marker.userData.__ignoreRaycast = true;
  marker.raycast = function () {};
  const wardrobeGroup = __asWardrobeAttachmentGroup(group);
  if (wardrobeGroup && marker.parent !== wardrobeGroup) {
    wardrobeGroup.add(marker);
  }
  return marker;
}

function __ensureCachedMarker(
  cacheKey: string,
  wardrobeGroup: unknown,
  readCache: <T = unknown>(key: string) => T | null
): MarkerMeshLike | null {
  const existing = __asMarkerMesh(readCache(cacheKey));
  if (!existing || existing.isMesh !== true) return null;
  return __ensureWardrobeAttachment(wardrobeGroup, existing);
}

function __resolveTHREE(
  App: ReturnType<RenderPreviewOpsDeps['app']>,
  rawArgs: PreviewMarkerArgs,
  assertTHREE: RenderPreviewOpsDeps['assertTHREE'],
  where: string
): MarkerTHREESurface | null {
  const candidate = rawArgs.THREE || assertTHREE(App, where);
  return __readMarkerTHREE(candidate);
}

export function createBuilderRenderPreviewMarkerOps(deps: RenderPreviewOpsDeps) {
  const __app = deps.app;
  const __ops = deps.ops;
  const __cacheValue = deps.cacheValue;
  const __writeCacheValue = deps.writeCacheValue;
  const __wardrobeGroup = deps.wardrobeGroup;
  const __addToWardrobe = deps.addToWardrobe;
  const __renderOpsHandleCatch = deps.renderOpsHandleCatch;
  const assertTHREE = deps.assertTHREE;

  function ensureSplitHoverMarker(args: PreviewMarkerArgs) {
    const markerArgs = __argsRecord(args);
    const App = __app(markerArgs);
    __ops(App);
    const THREE = __resolveTHREE(App, markerArgs, assertTHREE, 'native/builder/render_ops.splitHoverMarker');
    if (!THREE) return null;

    try {
      const existing = __ensureCachedMarker('splitHoverMarker', __wardrobeGroup(App), key =>
        __cacheValue(App, key)
      );
      if (existing) return existing;

      const geo = new THREE.PlaneGeometry(1, 1);

      // Subtle, consistent highlight (same color for top/bottom).
      // We keep two materials for compatibility, but they are visually identical.
      const markerColor = 0x7fd3ff;
      const markerOpacity = 0.12;
      const matTop = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: markerOpacity,
        // PlaneGeometry is single-sided by default. Some door fronts (notably the corner connector)
        // can face away from the default camera direction depending on left/right configuration.
        // Render both sides so the hover highlight is always visible.
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });
      const matBottom = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: markerOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });

      const mesh = new THREE.Mesh(geo, matTop);
      mesh.userData = mesh.userData || {};
      mesh.userData.__matTop = matTop;
      mesh.userData.__matBottom = matBottom;
      mesh.visible = false;
      mesh.renderOrder = 9999;

      __ensureWardrobeAttachment(__wardrobeGroup(App), mesh);
      __writeCacheValue(App, 'splitHoverMarker', mesh);
      __addToWardrobe(App, mesh);
      return mesh;
    } catch (e) {
      __renderOpsHandleCatch(App, 'ensureSplitHoverMarker', e, undefined, {
        failFast: false,
        throttleMs: 5000,
      });
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Door action hover marker (Stage 5B)
  // - Used by groove / remove-door modes to provide a clear visual target.
  // - Also reused by custom split-cut hover (thin line marker).
  // ---------------------------------------------------------------------------

  function ensureDoorActionHoverMarker(args: PreviewMarkerArgs) {
    const markerArgs = __argsRecord(args);
    const App = __app(markerArgs);
    __ops(App);
    const THREE = __resolveTHREE(
      App,
      markerArgs,
      assertTHREE,
      'native/builder/render_ops.doorActionHoverMarker'
    );
    if (!THREE) return null;

    try {
      const existing = __ensureCachedMarker('doorActionHoverMarker', __wardrobeGroup(App), key =>
        __cacheValue(App, key)
      );
      if (existing) return existing;

      const geo = new THREE.PlaneGeometry(1, 1);
      // Two families of styles live on the same marker:
      // - edit/remove door actions (groove/remove)
      // - paint hover previews (add/remove + dedicated mirror placement preview)
      const grooveColor = 0x7fd3ff;
      const addColor = 0x7fd3ff;
      const mirrorColor = 0xa4c2f4;
      const removeColor = 0xff6b6b;
      const centerColor = 0x32c96b;

      const grooveMat = new THREE.MeshBasicMaterial({
        color: grooveColor,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });
      const addMat = new THREE.MeshBasicMaterial({
        color: addColor,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });
      const mirrorMat = new THREE.MeshBasicMaterial({
        color: mirrorColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });
      const removeMat = new THREE.MeshBasicMaterial({
        color: removeColor,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });
      const centerMat = new THREE.MeshBasicMaterial({
        color: centerColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });

      const mesh = new THREE.Mesh(geo, grooveMat);
      mesh.userData = mesh.userData || {};
      mesh.userData.__matGroove = grooveMat;
      mesh.userData.__matAdd = addMat;
      mesh.userData.__matMirror = mirrorMat;
      mesh.userData.__matRemove = removeMat;
      mesh.userData.__matCenter = centerMat;
      mesh.visible = false;
      mesh.renderOrder = 9999;

      __ensureWardrobeAttachment(__wardrobeGroup(App), mesh);
      __writeCacheValue(App, 'doorActionHoverMarker', mesh);
      __addToWardrobe(App, mesh);
      return mesh;
    } catch (e) {
      __renderOpsHandleCatch(App, 'ensureDoorActionHoverMarker', e, undefined, {
        failFast: false,
        throttleMs: 5000,
      });
      return null;
    }
  }

  function ensureDoorCutHoverMarker(args: PreviewMarkerArgs) {
    const markerArgs = __argsRecord(args);
    const App = __app(markerArgs);
    __ops(App);
    const THREE = __resolveTHREE(
      App,
      markerArgs,
      assertTHREE,
      'native/builder/render_ops.doorCutHoverMarker'
    );
    if (!THREE) return null;

    try {
      const existing = __ensureCachedMarker('doorCutHoverMarker', __wardrobeGroup(App), key =>
        __cacheValue(App, key)
      );
      if (existing) return existing;

      const geo = new THREE.PlaneGeometry(1, 1);
      const addColor = 0x7fd3ff;
      const removeColor = 0xff6b6b;

      const addMat = new THREE.MeshBasicMaterial({
        color: addColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });
      const removeMat = new THREE.MeshBasicMaterial({
        color: removeColor,
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });

      const mesh = new THREE.Mesh(geo, addMat);
      mesh.userData = mesh.userData || {};
      mesh.userData.__matAdd = addMat;
      mesh.userData.__matRemove = removeMat;
      mesh.visible = false;
      mesh.renderOrder = 10000;

      __ensureWardrobeAttachment(__wardrobeGroup(App), mesh);
      __writeCacheValue(App, 'doorCutHoverMarker', mesh);
      __addToWardrobe(App, mesh);
      return mesh;
    } catch (e) {
      __renderOpsHandleCatch(App, 'ensureDoorCutHoverMarker', e, undefined, {
        failFast: false,
        throttleMs: 5000,
      });
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Sketch placement preview (hover ghost)
  // Used by the "סקיצה" tab (manual_layout + sketch_* tools).
  // Lives in RenderOps so Services/UI can stay THREE-light.
  // ---------------------------------------------------------------------------

  return {
    ensureSplitHoverMarker,
    ensureDoorActionHoverMarker,
    ensureDoorCutHoverMarker,
  };
}
