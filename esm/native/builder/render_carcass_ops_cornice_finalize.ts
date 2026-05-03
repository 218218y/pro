import type { RenderCarcassRuntime } from './render_carcass_ops_shared.js';
import type { CorniceMeshLike, CorniceMeshPlacementArgs } from './render_carcass_ops_cornice_types.js';

export function finalizeCorniceMesh(
  mesh: CorniceMeshLike,
  args: CorniceMeshPlacementArgs,
  runtime: RenderCarcassRuntime
): void {
  const { addOutlines, wardrobeGroup, reg, App, sketchMode } = runtime;
  if (args.flipX) mesh.scale.x *= -1;
  if (Number.isFinite(args.rotY) && args.rotY !== 0) mesh.rotation.y = args.rotY;
  mesh.position.set(
    Number.isFinite(args.x) ? args.x : 0,
    Number.isFinite(args.y) ? args.y : (args.fallbackY ?? 0),
    Number.isFinite(args.z) ? args.z : 0
  );
  mesh.userData = { partId: args.segPid };
  reg(App, args.segPid, mesh, 'cornice');
  if (!sketchMode) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  addOutlines(mesh);
  wardrobeGroup.add(mesh);
}
