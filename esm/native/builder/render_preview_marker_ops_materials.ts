import type { MarkerTHREESurface } from './render_preview_marker_ops_types.js';

export function createMarkerMaterial(THREE: MarkerTHREESurface, color: number, opacity: number): unknown {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
  });
}
