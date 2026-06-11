import type { CorniceOp, RenderCarcassRuntime } from './render_carcass_ops_shared.js';
import { __asFinite } from './render_carcass_ops_shared.js';

export function applyLegacyCornice(
  cornice: CorniceOp,
  pid: string,
  corniceMat: unknown,
  runtime: RenderCarcassRuntime
): void {
  const { THREE, addOutlines, wardrobeGroup, reg, App } = runtime;
  const corniceGeo = new THREE.CylinderGeometry(
    __asFinite(cornice.topRadius, 0),
    __asFinite(cornice.bottomRadius, 0),
    __asFinite(cornice.height, 0),
    Math.max(3, Math.round(__asFinite(cornice.radialSegments, 4)))
  );
  const corniceHolder = new THREE.Group();
  corniceHolder.position.set(__asFinite(cornice.x, 0), __asFinite(cornice.y, 0), __asFinite(cornice.z, 0));
  corniceHolder.scale.set(__asFinite(cornice.scaleX, 1), 1, __asFinite(cornice.scaleZ, 1));
  const corniceMesh = new THREE.Mesh(corniceGeo, corniceMat);
  corniceMesh.rotation.y = __asFinite(cornice.rotationY, 0);
  corniceMesh.userData = { partId: pid };
  reg(App, pid, corniceMesh, 'cornice');
  addOutlines(corniceMesh);
  corniceHolder.add(corniceMesh);
  wardrobeGroup.add(corniceHolder);
}
