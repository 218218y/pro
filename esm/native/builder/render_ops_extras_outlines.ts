import type { ThreeLike } from '../../../types/index.js';
import type { AppLike, GeometryLike, MaterialLike } from './render_ops_extras_shared.js';
import {
  ensureRenderOpsExtrasRuntime,
  ensureRenderOpsExtrasTHREE,
  readRenderOpsExtrasContextApp,
  readMeshLike,
  readRecord,
  touchRenderOpsMeta,
} from './render_ops_extras_shared.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';

type ThreeOutlineSurface = ThreeLike & {
  LineBasicMaterial: new (opts: Record<string, unknown>) => MaterialLike;
  MeshBasicMaterial: new (opts: Record<string, unknown>) => MaterialLike;
  EdgesGeometry: new (geometry: unknown) => GeometryLike;
  LineSegments: new (geometry: unknown, material: unknown) => import('../../../types/index.js').Object3DLike;
};

function isThreeOutlineSurface(value: unknown): value is ThreeOutlineSurface {
  const rec = readRecord(value);
  return !!(
    rec &&
    typeof rec.LineBasicMaterial === 'function' &&
    typeof rec.MeshBasicMaterial === 'function' &&
    typeof rec.EdgesGeometry === 'function' &&
    typeof rec.LineSegments === 'function'
  );
}

export function addOutlines(mesh: unknown, ctx: unknown): void {
  const runtime = ensureRenderOpsExtrasRuntime(readRenderOpsExtrasContextApp(ctx));
  const { App, renderCache, renderMaterials, renderMeta } = runtime;
  if (!readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false)) return;

  const target = readMeshLike(mesh);
  if (!target || !target.geometry) return;

  const THREEBase = ensureRenderOpsExtrasTHREE(App);
  if (!isThreeOutlineSurface(THREEBase))
    throw new Error('[render_ops_extras] THREE outline surface unavailable');
  const THREE = THREEBase;

  target.userData = target.userData || {};
  if (target.userData.__wpHasOutline) return;
  target.userData.__wpHasOutline = true;

  if (!renderMaterials.outlineLineMaterial) {
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    material.userData = material.userData || {};
    material.userData.isCached = true;
    renderMaterials.outlineLineMaterial = material;
  }

  if (!renderMaterials.sketchFillMaterial) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    material.userData = material.userData || {};
    material.userData.isCached = true;
    renderMaterials.sketchFillMaterial = material;
  }

  const geometryUuid = typeof target.geometry.uuid === 'string' ? target.geometry.uuid : '';
  const key = `edges:${geometryUuid}`;
  let edges = renderCache.edgesGeometryCache.get(key) || null;

  if (edges) {
    touchRenderOpsMeta(App, renderMeta.edges, key);
  } else {
    const geometry = new THREE.EdgesGeometry(target.geometry);
    geometry.userData = geometry.userData || {};
    geometry.userData.isCached = true;
    edges = geometry;
    renderCache.edgesGeometryCache.set(key, geometry);
    touchRenderOpsMeta(App, renderMeta.edges, key);
  }

  const line = new THREE.LineSegments(edges, renderMaterials.outlineLineMaterial);
  target.add(line);

  if (!Array.isArray(target.material)) target.material = renderMaterials.sketchFillMaterial;
  else target.material = target.material.map(() => renderMaterials.sketchFillMaterial);
}

export function createAddOutlinesImpl(App: AppLike) {
  return (mesh: unknown) => addOutlines(mesh, { App });
}
