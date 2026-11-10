import type { Object3DLike, ThreeLike } from '../../../types';
import { EDGE_HANDLE_PROFILE_RENDER_POLICY } from '../../shared/dimensions/handle_policy.js';

type EdgeHandleProfileArgs = {
  THREE: Pick<ThreeLike, 'Group' | 'Mesh' | 'BoxGeometry'>;
  material: unknown;
  length: number;
  frontThicknessM?: number | undefined;
  sliding?: boolean;
};

/** Section origin is the intersection of the panel edge and front surface. */
function createEdgeHandleProfile(
  { THREE, material, length, frontThicknessM, sliding }: EdgeHandleProfileArgs,
  axis: 'x' | 'y',
  inwardSign: 1 | -1
): Object3DLike {
  const policy = EDGE_HANDLE_PROFILE_RENDER_POLICY;
  const t: number = policy.metalThicknessM;
  const board: number = frontThicknessM ?? policy.nominalFrontThicknessM;
  const projection = sliding ? policy.slidingGripProjectionM : policy.gripProjectionM;
  const group = new THREE.Group();

  function section(name: string, min: number, max: number, back: number, front: number): void {
    const cross = max - min;
    const across = (inwardSign * (min + max)) / 2;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(axis === 'x' ? cross : length, axis === 'y' ? cross : length, front - back),
      material
    );
    mesh.name = name;
    mesh.userData = { __keepMaterial: true };
    mesh.position.set(axis === 'x' ? across : 0, axis === 'y' ? across : 0, (back + front) / 2);
    group.add(mesh);
  }

  section('edge-handle-back-flange', -t, policy.backFlangeInsetM, -board - t, -board);
  section('edge-handle-web', -t, 0, -board, projection);
  section('edge-handle-grip', 0, policy.gripInsetM, projection - t, projection);
  return group;
}

export function createDoorEdgeHandleProfile(
  args: EdgeHandleProfileArgs & { isLeftHinge: boolean }
): Object3DLike {
  return createEdgeHandleProfile(args, 'x', args.isLeftHinge ? -1 : 1);
}

export function createDrawerEdgeHandleProfile(args: EdgeHandleProfileArgs): Object3DLike {
  return createEdgeHandleProfile(args, 'y', -1);
}
