import { CARCASS_CORNICE_RENDER_POLICY } from '../../shared/dimensions/carcass_cornice_render_policy.js';
import type {
  CornerCorniceOp,
  CornerCornicePlan,
  CornerCorniceProfileOp,
  CornerCorniceWaveOp,
} from './corner_cornice_ir.js';
import { isCornerCornicePlan } from './corner_cornice_ir.js';

type PositionAttributeLike = {
  count: number;
  needsUpdate?: boolean;
  getX(index: number): number;
  getY?(index: number): number;
  getZ(index: number): number;
  setZ(index: number, value: number): void;
};

type ShapeLike = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
};

type GeometryLike = {
  translate?(x: number, y: number, z: number): void;
  computeVertexNormals?(): void;
  getAttribute?(name: string): unknown;
};

type MeshLike = {
  position: { set(x: number, y: number, z: number): void };
  rotation: { y: number };
  scale: { x: number };
  userData: Record<string, unknown>;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

type ThreeCornerCorniceLike = {
  Shape: new () => ShapeLike;
  ExtrudeGeometry: new (
    shape: ShapeLike,
    options: { depth: number; bevelEnabled: boolean; steps?: number }
  ) => GeometryLike;
  BoxGeometry: new (width: number, height: number, depth: number) => unknown;
  Mesh: new (geometry: unknown, material: unknown) => MeshLike;
};

export type CornerCorniceRenderRuntime = {
  THREE: unknown;
  group: { add(object: unknown): void };
  bodyMat: unknown;
  getCornerMat(partId: string, defaultMaterial: unknown): unknown;
  addOutlines(mesh: unknown): void;
  sketchMode: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function resolveThree(value: unknown): ThreeCornerCorniceLike | null {
  const record = asRecord(value);
  return record &&
    typeof record.Shape === 'function' &&
    typeof record.ExtrudeGeometry === 'function' &&
    typeof record.BoxGeometry === 'function' &&
    typeof record.Mesh === 'function'
    ? (value as ThreeCornerCorniceLike)
    : null;
}

function readPositionAttribute(value: unknown): PositionAttributeLike | null {
  const record = asRecord(value);
  return record &&
    typeof record.count === 'number' &&
    typeof record.getX === 'function' &&
    typeof record.getZ === 'function' &&
    typeof record.setZ === 'function'
    ? (value as PositionAttributeLike)
    : null;
}

function finalizeMesh(mesh: MeshLike, op: CornerCorniceOp, runtime: CornerCorniceRenderRuntime): void {
  if (op.flipX === true) mesh.scale.x *= -1;
  mesh.rotation.y = op.rotationY;
  mesh.position.set(op.x, op.y, op.z);
  mesh.userData = { partId: op.partId };
  if (!runtime.sketchMode) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  runtime.addOutlines(mesh);
  runtime.group.add(mesh);
}

function materialFor(op: CornerCorniceOp, runtime: CornerCorniceRenderRuntime): unknown {
  const base = runtime.getCornerMat('corner_cornice', runtime.bodyMat);
  return runtime.getCornerMat(op.partId, base);
}

function createProfileMesh(
  three: ThreeCornerCorniceLike,
  op: CornerCorniceProfileOp,
  runtime: CornerCorniceRenderRuntime
): MeshLike | null {
  if (op.profile.length < 3 || !(op.length > 0)) return null;
  const first = op.profile[0];
  const shape = new three.Shape();
  shape.moveTo(first.x, first.y);
  for (let index = 1; index < op.profile.length; index += 1) {
    const point = op.profile[index];
    shape.lineTo(point.x, point.y);
  }
  shape.lineTo(first.x, first.y);

  const geometry = new three.ExtrudeGeometry(shape, { depth: op.length, bevelEnabled: false, steps: 1 });
  geometry.translate?.(0, 0, -op.length / 2);
  applyProfileMiter(geometry, op);
  geometry.computeVertexNormals?.();
  return new three.Mesh(geometry, materialFor(op, runtime));
}

function applyProfileMiter(geometry: GeometryLike, op: CornerCorniceProfileOp): void {
  const startTrim = op.miterStartTrim ?? 0;
  const endTrim = op.miterEndTrim ?? 0;
  if (!(startTrim > 0 || endTrim > 0)) return;

  let xOuter = -Infinity;
  for (const point of op.profile) xOuter = Math.max(xOuter, point.x);
  const corniceProfile = CARCASS_CORNICE_RENDER_POLICY.profile;
  if (!(Number.isFinite(xOuter) && xOuter > 0)) xOuter = corniceProfile.minOverhangM;

  const position = readPositionAttribute(geometry.getAttribute?.('position'));
  if (!position) return;

  const zPos = op.length / 2;
  const zNeg = -op.length / 2;
  const epsZ = corniceProfile.miterEpsilonZM;
  const miterMode = op.miterMode ?? 'inner_trim';
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const profileBaseY =
    op.miterProfileBaseY ??
    (() => {
      let minPositiveY = Infinity;
      for (const point of op.profile) {
        if (point.y > 0) minPositiveY = Math.min(minPositiveY, point.y);
      }
      return Number.isFinite(minPositiveY)
        ? minPositiveY + corniceProfile.baseBandEpsilonM
        : corniceProfile.baseBandEpsilonM;
    })();
  const baseSealEpsilon = op.miterBaseSealEpsilon ?? corniceProfile.baseSealEpsilonM;

  for (let index = 0; index < position.count; index += 1) {
    const vx = position.getX(index);
    const vy = typeof position.getY === 'function' ? position.getY(index) : NaN;
    const vz = position.getZ(index);
    if (!Number.isFinite(vx) || !Number.isFinite(vz)) continue;
    const innerTrimT = clamp01(1 - vx / xOuter);
    const outerExtendT = clamp01(vx / xOuter);
    const sealBase = Number.isFinite(vy) && vy <= profileBaseY && vx <= 0;

    if (endTrim > 0 && Math.abs(vz - zPos) < epsZ) {
      if (miterMode === 'outer_extend') {
        position.setZ(index, vz + endTrim * outerExtendT);
      } else {
        let zNew = vz - endTrim * innerTrimT;
        if (sealBase) zNew = Math.min(zPos, zNew + baseSealEpsilon);
        position.setZ(index, zNew);
      }
    }
    if (startTrim > 0 && Math.abs(vz - zNeg) < epsZ) {
      if (miterMode === 'outer_extend') {
        position.setZ(index, vz - startTrim * outerExtendT);
      } else {
        let zNew = vz + startTrim * innerTrimT;
        if (sealBase) zNew = Math.max(zNeg, zNew - baseSealEpsilon);
        position.setZ(index, zNew);
      }
    }
  }
  position.needsUpdate = true;
}

function createWaveMesh(
  three: ThreeCornerCorniceLike,
  op: CornerCorniceWaveOp,
  runtime: CornerCorniceRenderRuntime
): MeshLike {
  const halfLength = op.length / 2;
  const shape = new three.Shape();
  shape.moveTo(-halfLength, 0);
  shape.lineTo(halfLength, 0);
  for (let index = op.samples; index >= 0; index -= 1) {
    const u = index / op.samples;
    const x = -halfLength + u * op.length;
    const theta = 2 * Math.PI * op.waveCycles * u;
    const dip = (op.waveAmp * (1 - Math.cos(theta))) / 2;
    shape.lineTo(x, op.heightMax - dip);
  }
  shape.lineTo(-halfLength, 0);
  const geometry = new three.ExtrudeGeometry(shape, { depth: op.depth, bevelEnabled: false, steps: 1 });
  geometry.computeVertexNormals?.();
  return new three.Mesh(geometry, materialFor(op, runtime));
}

export function renderCornerCornicePlan(plan: CornerCornicePlan, runtime: CornerCorniceRenderRuntime): void {
  if (!isCornerCornicePlan(plan)) return;
  const three = resolveThree(runtime.THREE);
  if (!three) return;

  for (const op of plan.operations) {
    let mesh: MeshLike | null = null;
    if (op.kind === 'corner_profile') {
      mesh = createProfileMesh(three, op, runtime);
    } else if (op.kind === 'corner_wave') {
      mesh = createWaveMesh(three, op, runtime);
    } else {
      mesh = new three.Mesh(new three.BoxGeometry(op.width, op.height, op.depth), materialFor(op, runtime));
    }
    if (mesh) finalizeMesh(mesh, op, runtime);
  }
}
