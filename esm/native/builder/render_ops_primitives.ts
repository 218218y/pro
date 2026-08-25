import { createDoorEdgeHandleProfile } from './edge_handle_profile.js';
import { normalizeHandleFinishColor, resolveHandleFinishPalette } from '../features/finish_palette/api.js';
import {
  EDGE_HANDLE_SIZE_POLICY,
  STANDARD_HANDLE_RENDER_POLICY,
} from '../../shared/dimensions/handle_policy.js';
import { INTERIOR_SHELF_ROUNDED_RENDER_POLICY } from '../../shared/dimensions/interior_fittings_policy.js';
import { getMirrorRenderTarget } from '../runtime/render_access.js';
import { applyShelfExposedEdgeMaterials } from './shelf_front_edge_material.js';
import { getModuleSelectorMaterial } from './module_selector_material.js';
import {
  axisAlignedBoxToCenterSize,
  boxFromCenterSize,
  intersectAxisAlignedBoxes,
  resolveActiveRoomColumnCutObstacle,
  subtractAxisAlignedBox,
} from './room_architecture_geometry.js';

import type {
  AppContainer,
  BuilderCreateBoardArgsLike,
  BuilderCreateDrawerShadowPlaneArgsLike,
  BuilderCreateModuleHitBoxArgsLike,
  BuilderHandleMeshOptionsLike,
  BuilderMaterialSnapshotLike,
  ThreeLike,
} from '../../../types';

type AnyMap = Record<string, unknown>;
type BoundUnknownMethod<Args extends readonly unknown[] = readonly unknown[], Return = unknown> = (
  ...args: Args
) => Return;
type RenderThreeLike = Pick<
  ThreeLike,
  | 'Vector3'
  | 'Box3'
  | 'CylinderGeometry'
  | 'MeshStandardMaterial'
  | 'MeshBasicMaterial'
  | 'BoxGeometry'
  | 'BufferGeometry'
  | 'Float32BufferAttribute'
  | 'Mesh'
  | 'Group'
  | 'DoubleSide'
  | 'FrontSide'
  | 'Shape'
  | 'ExtrudeGeometry'
>;
type RenderCommonArgs = Omit<BuilderCreateBoardArgsLike, 'THREE'> & {
  THREE?: RenderThreeLike | null;
  materialSnapshot?: BuilderMaterialSnapshotLike;
};
type CommonMatsCache = AnyMap & {
  masoniteMat?: unknown;
  whiteMat?: unknown;
  shadowMat?: unknown;
  realMirrorMat?: AnyMap | null;
  sketchMirrorMat?: AnyMap | null;
};
type BoardArgs = Omit<BuilderCreateBoardArgsLike, 'THREE'> & { THREE?: RenderThreeLike | null };
type ModuleHitBoxArgs = Omit<BuilderCreateModuleHitBoxArgsLike, 'THREE'> & { THREE?: RenderThreeLike | null };
type DrawerShadowPlaneArgs = Omit<BuilderCreateDrawerShadowPlaneArgsLike, 'THREE'> & {
  THREE?: RenderThreeLike | null;
};
type HandleMeshOpts = Omit<BuilderHandleMeshOptionsLike, 'THREE'> & { THREE?: RenderThreeLike | null };
type AddGroupLike = { add: BoundUnknownMethod<[obj: unknown]> };

type RoundedShelfSide = 'left' | 'right' | 'both';
type AxisAlignedBoxLike = ReturnType<typeof boxFromCenterSize>;

type RoundedShelfGeometryLike = {
  addGroup: (start: number, count: number, materialIndex?: number) => unknown;
  getAttribute?: (name: string) => unknown;
  setAttribute?: (name: string, attribute: unknown) => unknown;
  setIndex?: (index: unknown) => unknown;
  computeVertexNormals?: () => unknown;
  computeBoundingBox?: () => unknown;
  computeBoundingSphere?: () => unknown;
};

type RoundedShelfFootprintPoint = { x: number; z: number };

type RoundedShelfMaterialGroup = { start: number; count: number; materialIndex: number };

const BOX_FACE_MATERIAL_INDEX = Object.freeze({
  positiveX: 0,
  negativeX: 1,
  positiveY: 2,
  negativeY: 3,
  positiveZ: 4,
  negativeZ: 5,
});

type RoundedShelfAttachedSide = 'left' | 'right' | null;

type RenderOpsPrimitiveDeps = {
  __app: (ctx: unknown) => AppContainer;
  __ops: (App: AppContainer) => unknown;
  __commonArgs: (value: unknown) => RenderCommonArgs;
  __handleMeshOpts: (value: unknown) => HandleMeshOpts;
  __boardArgs: (value: unknown) => BoardArgs;
  __moduleHitBoxArgs: (value: unknown) => ModuleHitBoxArgs;
  __drawerShadowPlaneArgs: (value: unknown) => DrawerShadowPlaneArgs;
  __number: (value: unknown, defaultValue?: number) => number;
  __isFn: (value: unknown) => value is BoundUnknownMethod;
  __wardrobeGroup: (App: AppContainer) => AddGroupLike | null;
  __matCache: (App: AppContainer) => CommonMatsCache;
};

export function createBuilderRenderPrimitiveOps(deps: RenderOpsPrimitiveDeps) {
  const {
    __app,
    __ops,
    __commonArgs,
    __handleMeshOpts,
    __boardArgs,
    __moduleHitBoxArgs,
    __drawerShadowPlaneArgs,
    __number,
    __isFn,
    __wardrobeGroup,
    __matCache,
  } = deps;

  function getCommonMats(argsIn: unknown) {
    const App = __app(argsIn);
    __ops(App);
    const args = __commonArgs(argsIn);
    const THREE = args.THREE;
    if (!THREE) return {};
    const cache = __matCache(App);
    if (!cache.masoniteMat)
      cache.masoniteMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 });
    if (!cache.whiteMat) {
      cache.whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    }
    if (!cache.shadowMat) {
      cache.shadowMat = new THREE.MeshBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
    }
    return cache;
  }

  function getMirrorMaterial(argsIn: unknown) {
    const App = __app(argsIn);
    const args = __commonArgs(argsIn);
    const THREE = args.THREE;
    if (!THREE) return null;
    const materialSnapshot = args.materialSnapshot;
    if (!materialSnapshot) {
      throw new TypeError('[render_ops.getMirrorMaterial] materialSnapshot is required');
    }

    const cache = __matCache(App);
    if (materialSnapshot.sketchMode) {
      if (!cache.sketchMirrorMat) {
        cache.sketchMirrorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        cache.sketchMirrorMat.userData = { __keepMaterial: true };
      }
      return cache.sketchMirrorMat;
    }
    const rt = getMirrorRenderTarget(App);
    const tex = rt && rt.texture ? rt.texture : null;

    if (!cache.realMirrorMat) {
      cache.realMirrorMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.01,
        envMap: tex,
        envMapIntensity: 1.0,
        side: THREE.FrontSide,
      });
      cache.realMirrorMat.userData = { __keepMaterial: true };
    }

    if (tex && cache.realMirrorMat.envMap !== tex) {
      cache.realMirrorMat.envMap = tex;
      cache.realMirrorMat.needsUpdate = true;
    }

    return cache.realMirrorMat || null;
  }

  function readRoundedShelfSide(value: unknown): RoundedShelfSide | null {
    return value === 'left' || value === 'right' || value === 'both' ? value : null;
  }

  function resolveRoundedShelfRadius(args: BoardArgs, w: number, d: number): number {
    const requested =
      typeof args.roundedShelfRadius === 'number' && Number.isFinite(args.roundedShelfRadius)
        ? args.roundedShelfRadius
        : INTERIOR_SHELF_ROUNDED_RENDER_POLICY.roundedCornerRadiusM;
    const maxRadius = Math.max(0, Math.min(w, d) / 2 - 0.001);
    return Math.max(0.001, Math.min(requested, maxRadius));
  }

  function resolveRoundedShelfSegments(args: BoardArgs): number {
    const raw =
      typeof args.roundedShelfSegments === 'number' && Number.isFinite(args.roundedShelfSegments)
        ? args.roundedShelfSegments
        : INTERIOR_SHELF_ROUNDED_RENDER_POLICY.roundedCornerSegments;
    return Math.max(4, Math.min(48, Math.round(raw)));
  }

  function pushRoundedShelfArcPoints(
    points: RoundedShelfFootprintPoint[],
    cx: number,
    cz: number,
    radius: number,
    fromAngle: number,
    toAngle: number,
    segments: number
  ): void {
    const safeSegments = Math.max(1, Math.round(segments));
    for (let i = 1; i <= safeSegments; i += 1) {
      const t = i / safeSegments;
      const angle = fromAngle + (toAngle - fromAngle) * t;
      points.push({ x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius });
    }
  }

  function isSameRoundedShelfPoint(a: RoundedShelfFootprintPoint, b: RoundedShelfFootprintPoint): boolean {
    const tolerance = 1e-7;
    return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.z - b.z) <= tolerance;
  }

  function normalizeRoundedShelfFootprint(
    points: RoundedShelfFootprintPoint[]
  ): RoundedShelfFootprintPoint[] {
    const normalized: RoundedShelfFootprintPoint[] = [];
    for (const point of points) {
      const prev = normalized[normalized.length - 1];
      if (!prev || !isSameRoundedShelfPoint(prev, point)) normalized.push(point);
    }
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if (normalized.length > 1 && first && last && isSameRoundedShelfPoint(first, last)) {
      normalized.pop();
    }
    return normalized;
  }

  function createRoundedShelfFootprint(args: BoardArgs, w: number, d: number): RoundedShelfFootprintPoint[] {
    const side = readRoundedShelfSide(args.roundedShelfSide);
    if (!side) throw new Error('[builder/render_ops] rounded shelf side is required');

    const radius = resolveRoundedShelfRadius(args, w, d);
    const segments = resolveRoundedShelfSegments(args);
    const left = -w / 2;
    const right = w / 2;
    const back = -d / 2;
    const front = d / 2;
    const points: RoundedShelfFootprintPoint[] = [];

    const leftCenterX = left + radius;
    const rightCenterX = right - radius;
    const frontCenterZ = front - radius;

    if (side === 'left') {
      points.push({ x: left + radius, z: front });
      points.push({ x: right, z: front });
      points.push({ x: right, z: back });
      points.push({ x: left, z: back });
      points.push({ x: left, z: front - radius });
      pushRoundedShelfArcPoints(points, leftCenterX, frontCenterZ, radius, Math.PI, Math.PI / 2, segments);
      return normalizeRoundedShelfFootprint(points);
    }

    if (side === 'right') {
      points.push({ x: left, z: front });
      points.push({ x: right - radius, z: front });
      pushRoundedShelfArcPoints(points, rightCenterX, frontCenterZ, radius, Math.PI / 2, 0, segments);
      points.push({ x: right, z: back });
      points.push({ x: left, z: back });
      return normalizeRoundedShelfFootprint(points);
    }

    points.push({ x: left + radius, z: front });
    points.push({ x: right - radius, z: front });
    pushRoundedShelfArcPoints(points, rightCenterX, frontCenterZ, radius, Math.PI / 2, 0, segments);
    points.push({ x: right, z: back });
    points.push({ x: left, z: back });
    points.push({ x: left, z: front - radius });
    pushRoundedShelfArcPoints(points, leftCenterX, frontCenterZ, radius, Math.PI, Math.PI / 2, segments);
    return normalizeRoundedShelfFootprint(points);
  }

  function resolveRoundedShelfAttachedSide(side: RoundedShelfSide): RoundedShelfAttachedSide {
    if (side === 'left') return 'right';
    if (side === 'right') return 'left';
    return null;
  }

  function shouldOmitRoundedShelfSideFace(
    a: RoundedShelfFootprintPoint,
    b: RoundedShelfFootprintPoint,
    attachedSide: RoundedShelfAttachedSide,
    w: number
  ): boolean {
    if (!attachedSide) return false;
    const targetX = attachedSide === 'left' ? -w / 2 : w / 2;
    const tolerance = 1e-7;
    return Math.abs(a.x - targetX) <= tolerance && Math.abs(b.x - targetX) <= tolerance;
  }

  function resolveRoundedShelfSideMaterialIndex(
    a: RoundedShelfFootprintPoint,
    b: RoundedShelfFootprintPoint,
    w: number,
    d: number
  ): number {
    // Keep the same six-material order as THREE.BoxGeometry:
    // +X, -X, +Y, -Y, +Z (front), -Z (back). Curved corner faces continue
    // the visible front edge, so they intentionally use the +Z material.
    const tolerance = 1e-7;
    const left = -w / 2;
    const right = w / 2;
    const back = -d / 2;
    const front = d / 2;
    const bothAt = (first: number, second: number, target: number) =>
      Math.abs(first - target) <= tolerance && Math.abs(second - target) <= tolerance;

    if (bothAt(a.z, b.z, front)) return BOX_FACE_MATERIAL_INDEX.positiveZ;
    if (bothAt(a.z, b.z, back)) return BOX_FACE_MATERIAL_INDEX.negativeZ;
    if (bothAt(a.x, b.x, right)) return BOX_FACE_MATERIAL_INDEX.positiveX;
    if (bothAt(a.x, b.x, left)) return BOX_FACE_MATERIAL_INDEX.negativeX;
    return BOX_FACE_MATERIAL_INDEX.positiveZ;
  }

  function appendRoundedShelfMaterialGroup(
    groups: RoundedShelfMaterialGroup[],
    start: number,
    count: number,
    materialIndex: number
  ): void {
    if (!(count > 0)) return;
    const previous = groups[groups.length - 1];
    if (previous && previous.materialIndex === materialIndex && previous.start + previous.count === start) {
      previous.count += count;
      return;
    }
    groups.push({ start, count, materialIndex });
  }

  function clampRoundedShelfUv(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  function pushRoundedShelfVertex(
    positions: number[],
    normals: number[],
    uvs: number[],
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    u: number,
    v: number
  ): void {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    uvs.push(clampRoundedShelfUv(u), clampRoundedShelfUv(v));
  }

  function pushRoundedShelfPlanarVertex(
    positions: number[],
    normals: number[],
    uvs: number[],
    point: RoundedShelfFootprintPoint,
    y: number,
    nx: number,
    ny: number,
    nz: number,
    w: number,
    d: number
  ): void {
    pushRoundedShelfVertex(
      positions,
      normals,
      uvs,
      point.x,
      y,
      point.z,
      nx,
      ny,
      nz,
      (point.x + w / 2) / w,
      (point.z + d / 2) / d
    );
  }

  function pushRoundedShelfPlanarTriangle(
    positions: number[],
    normals: number[],
    uvs: number[],
    a: RoundedShelfFootprintPoint,
    yA: number,
    b: RoundedShelfFootprintPoint,
    yB: number,
    c: RoundedShelfFootprintPoint,
    yC: number,
    nx: number,
    ny: number,
    nz: number,
    w: number,
    d: number
  ): void {
    pushRoundedShelfPlanarVertex(positions, normals, uvs, a, yA, nx, ny, nz, w, d);
    pushRoundedShelfPlanarVertex(positions, normals, uvs, b, yB, nx, ny, nz, w, d);
    pushRoundedShelfPlanarVertex(positions, normals, uvs, c, yC, nx, ny, nz, w, d);
  }

  function resolveRoundedShelfSideUv(
    point: RoundedShelfFootprintPoint,
    dx: number,
    dz: number,
    w: number,
    d: number
  ): number {
    return Math.abs(dx) >= Math.abs(dz) ? (point.x + w / 2) / w : (point.z + d / 2) / d;
  }

  function pushRoundedShelfSideTriangle(
    positions: number[],
    normals: number[],
    uvs: number[],
    a: RoundedShelfFootprintPoint,
    yA: number,
    uA: number,
    vA: number,
    b: RoundedShelfFootprintPoint,
    yB: number,
    uB: number,
    vB: number,
    c: RoundedShelfFootprintPoint,
    yC: number,
    uC: number,
    vC: number,
    nx: number,
    ny: number,
    nz: number
  ): void {
    pushRoundedShelfVertex(positions, normals, uvs, a.x, yA, a.z, nx, ny, nz, uA, vA);
    pushRoundedShelfVertex(positions, normals, uvs, b.x, yB, b.z, nx, ny, nz, uB, vB);
    pushRoundedShelfVertex(positions, normals, uvs, c.x, yC, c.z, nx, ny, nz, uC, vC);
  }

  function createRoundedShelfGeometry(
    THREE: RenderThreeLike,
    args: BoardArgs,
    w: number,
    h: number,
    d: number
  ) {
    const side = readRoundedShelfSide(args.roundedShelfSide);
    if (!side) throw new Error('[builder/render_ops] rounded shelf side is required');
    if (!THREE.BufferGeometry || !THREE.Float32BufferAttribute) {
      throw new Error(
        '[builder/render_ops] rounded shelf geometry requires THREE.BufferGeometry and THREE.Float32BufferAttribute'
      );
    }
    if (!(w > 0) || !(h > 0) || !(d > 0)) {
      throw new Error('[builder/render_ops] rounded shelf dimensions must be positive');
    }

    const points = createRoundedShelfFootprint(args, w, d);
    if (points.length < 4) throw new Error('[builder/render_ops] rounded shelf footprint is invalid');

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const materialGroups: RoundedShelfMaterialGroup[] = [];
    const topY = h / 2;
    const bottomY = -h / 2;
    const center: RoundedShelfFootprintPoint = {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
    };

    const topStart = positions.length / 3;
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      const next = points[(i + 1) % points.length];
      if (!point || !next) continue;
      pushRoundedShelfPlanarTriangle(
        positions,
        normals,
        uvs,
        center,
        topY,
        point,
        topY,
        next,
        topY,
        0,
        1,
        0,
        w,
        d
      );
    }
    appendRoundedShelfMaterialGroup(
      materialGroups,
      topStart,
      positions.length / 3 - topStart,
      BOX_FACE_MATERIAL_INDEX.positiveY
    );

    const bottomStart = positions.length / 3;
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      const next = points[(i + 1) % points.length];
      if (!point || !next) continue;
      pushRoundedShelfPlanarTriangle(
        positions,
        normals,
        uvs,
        center,
        bottomY,
        next,
        bottomY,
        point,
        bottomY,
        0,
        -1,
        0,
        w,
        d
      );
    }
    appendRoundedShelfMaterialGroup(
      materialGroups,
      bottomStart,
      positions.length / 3 - bottomStart,
      BOX_FACE_MATERIAL_INDEX.negativeY
    );

    const attachedSide = resolveRoundedShelfAttachedSide(side);
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if (!a || !b || shouldOmitRoundedShelfSideFace(a, b, attachedSide, w)) continue;

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (!(len > 0)) continue;
      const nx = -dz / len;
      const nz = dx / len;

      const uA = resolveRoundedShelfSideUv(a, dx, dz, w, d);
      const uB = resolveRoundedShelfSideUv(b, dx, dz, w, d);
      const vBottom = 0;
      const vTop = 1;
      const groupStart = positions.length / 3;
      pushRoundedShelfSideTriangle(
        positions,
        normals,
        uvs,
        a,
        bottomY,
        uA,
        vBottom,
        b,
        bottomY,
        uB,
        vBottom,
        b,
        topY,
        uB,
        vTop,
        nx,
        0,
        nz
      );
      pushRoundedShelfSideTriangle(
        positions,
        normals,
        uvs,
        a,
        bottomY,
        uA,
        vBottom,
        b,
        topY,
        uB,
        vTop,
        a,
        topY,
        uA,
        vTop,
        nx,
        0,
        nz
      );
      appendRoundedShelfMaterialGroup(
        materialGroups,
        groupStart,
        positions.length / 3 - groupStart,
        resolveRoundedShelfSideMaterialIndex(a, b, w, d)
      );
    }

    const geometry = new THREE.BufferGeometry() as RoundedShelfGeometryLike;
    if (typeof geometry.addGroup !== 'function') {
      throw new Error('[builder/render_ops] rounded shelf geometry requires THREE.BufferGeometry.addGroup');
    }
    geometry.setAttribute?.('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute?.('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute?.('uv', new THREE.Float32BufferAttribute(uvs, 2));
    for (const group of materialGroups) {
      geometry.addGroup(group.start, group.count, group.materialIndex);
    }
    geometry.computeBoundingBox?.();
    geometry.computeBoundingSphere?.();
    return geometry;
  }

  function createBoardGeometry(THREE: RenderThreeLike, args: BoardArgs, w: number, h: number, d: number) {
    if (args.shape === 'rounded_shelf') return createRoundedShelfGeometry(THREE, args, w, h, d);
    return new THREE.BoxGeometry(w, h, d);
  }

  function bindSplitBoardRenderProperty(
    group: AnyMap,
    children: AnyMap[],
    key: 'castShadow' | 'receiveShadow' | 'renderOrder',
    initialValue: boolean | number
  ): void {
    let currentValue: boolean | number = initialValue;
    Object.defineProperty(group, key, {
      configurable: true,
      enumerable: true,
      get: () => currentValue,
      set: (value: boolean | number) => {
        currentValue = value;
        for (const child of children) child[key] = value;
      },
    });
    for (const child of children) child[key] = initialValue;
  }

  function resolveClippedBoardPieceMaterial(
    material: unknown,
    piece: AxisAlignedBoxLike,
    source: AxisAlignedBoxLike
  ): unknown {
    if (!Array.isArray(material) || material.length < 6) return material;
    const tolerance = 1e-7;
    const neutral = material[2] ?? material[5] ?? material[0];
    return [
      Math.abs(piece.maxX - source.maxX) <= tolerance ? material[0] : neutral,
      Math.abs(piece.minX - source.minX) <= tolerance ? material[1] : neutral,
      Math.abs(piece.maxY - source.maxY) <= tolerance ? material[2] : neutral,
      Math.abs(piece.minY - source.minY) <= tolerance ? material[3] : neutral,
      Math.abs(piece.maxZ - source.maxZ) <= tolerance ? material[4] : neutral,
      Math.abs(piece.minZ - source.minZ) <= tolerance ? material[5] : neutral,
    ];
  }

  function createHandleMesh(
    type: string,
    w: number,
    h: number,
    isLeftHinge: boolean,
    optsIn: BuilderHandleMeshOptionsLike | null | undefined
  ) {
    const App = __app(optsIn);
    __ops(App);
    const opts = __handleMeshOpts(optsIn);
    const THREE = opts.THREE;
    const addOutlines = opts.addOutlines;
    if (!THREE) return null;
    if (type === 'none') return null;

    const handleColor = normalizeHandleFinishColor(opts.handleColor);
    const palette = resolveHandleFinishPalette(handleColor);

    const handleGroup = new THREE.Group();
    handleGroup.userData = handleGroup.userData || {};
    handleGroup.userData.__kind = 'handle';
    handleGroup.userData.handleType = type;
    handleGroup.userData.__keepMaterialSubtree = true;

    if (type === 'edge') {
      const handleH =
        opts.edgeHandleVariant === 'long'
          ? EDGE_HANDLE_SIZE_POLICY.longLengthM
          : EDGE_HANDLE_SIZE_POLICY.shortLengthM;
      const mat = new THREE.MeshStandardMaterial({
        color: palette.hex,
        emissive: palette.emissiveHex,
        emissiveIntensity: 0.08,
        roughness: palette.roughness,
        metalness: palette.metalness,
      });
      const xPos = isLeftHinge
        ? w - EDGE_HANDLE_SIZE_POLICY.renderPrimitiveDoorAnchorInsetM
        : -w + EDGE_HANDLE_SIZE_POLICY.renderPrimitiveDoorAnchorInsetM;
      const profile = createDoorEdgeHandleProfile({
        THREE,
        material: mat,
        length: handleH,
        anchorX: xPos,
        isLeftHinge,
      });
      if (profile) handleGroup.add(profile);
      return handleGroup;
    }

    const handleGeo = new THREE.BoxGeometry(
      STANDARD_HANDLE_RENDER_POLICY.doorWidthM,
      STANDARD_HANDLE_RENDER_POLICY.doorHeightM,
      STANDARD_HANDLE_RENDER_POLICY.doorDepthM
    );
    const mesh = new THREE.Mesh(
      handleGeo,
      new THREE.MeshStandardMaterial({
        color: palette.hex,
        emissive: palette.emissiveHex,
        emissiveIntensity: 0.08,
        roughness: palette.roughness,
        metalness: palette.metalness,
      })
    );
    mesh.userData = mesh.userData || {};
    mesh.userData.__keepMaterial = true;
    const offset = STANDARD_HANDLE_RENDER_POLICY.doorOffsetM;
    const xPos = isLeftHinge ? w - offset : -w + offset;
    mesh.position.set(xPos, 0, STANDARD_HANDLE_RENDER_POLICY.frontZM);
    if (__isFn(addOutlines)) addOutlines(mesh);
    handleGroup.add(mesh);
    return handleGroup;
  }

  function createBoard(argsIn: BuilderCreateBoardArgsLike | null | undefined) {
    const App = __app(argsIn);
    __ops(App);
    const args = __boardArgs(argsIn);
    const roomArchitecturePlan = argsIn?.roomArchitecturePlan;
    if (!roomArchitecturePlan) {
      throw new Error('[builder/render_ops_primitives] createBoard: roomArchitecturePlan missing');
    }
    const THREE = args.THREE;
    if (!THREE) return null;
    const wardrobeGroup = __wardrobeGroup(App);
    if (!wardrobeGroup) return null;

    const w = __number(args.w);
    const h = __number(args.h);
    const d = __number(args.d);
    const x = __number(args.x);
    const y = __number(args.y);
    const z = __number(args.z);
    const mat = applyShelfExposedEdgeMaterials(args.mat || null, args.shelfExposedSide);
    const partId = args.partId || null;
    const sketchMode = !!args.sketchMode;
    const addOutlines = args.addOutlines;

    const sourceBox = boxFromCenterSize({ x, y, z, width: w, height: h, depth: d });
    const obstacle = resolveActiveRoomColumnCutObstacle(roomArchitecturePlan);
    const intersection = obstacle ? intersectAxisAlignedBoxes(sourceBox, obstacle) : null;

    if (!intersection) {
      const mesh = new THREE.Mesh(createBoardGeometry(THREE, args, w, h, d), mat);
      mesh.position.set(x, y, z);
      if (!sketchMode) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      if (partId) mesh.userData = { partId };
      if (__isFn(addOutlines)) addOutlines(mesh);
      wardrobeGroup.add(mesh);
      return mesh;
    }

    const cutObstacle = obstacle as NonNullable<typeof obstacle>;
    let pieces = subtractAxisAlignedBox(sourceBox, cutObstacle);
    if (args.shape === 'rounded_shelf' && intersection.maxZ < sourceBox.maxZ - 1e-7) {
      const rearSource: AxisAlignedBoxLike = { ...sourceBox, maxZ: intersection.maxZ };
      const frontSlab: AxisAlignedBoxLike = { ...sourceBox, minZ: intersection.maxZ };
      pieces = [...subtractAxisAlignedBox(rearSource, cutObstacle), frontSlab];
    }
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const sharedUserData: AnyMap = partId
      ? { partId, __wpRoomColumnAdjusted: true }
      : { __wpRoomColumnAdjusted: true };
    group.userData = sharedUserData;

    const splitChildren: AnyMap[] = [];
    for (const pieceBox of pieces) {
      const piece = axisAlignedBoxToCenterSize(pieceBox);
      const preservesRoundedFront =
        args.shape === 'rounded_shelf' &&
        Math.abs(piece.width - w) <= 1e-7 &&
        Math.abs(piece.height - h) <= 1e-7 &&
        Math.abs(pieceBox.maxZ - sourceBox.maxZ) <= 1e-7;
      const pieceGeometry = preservesRoundedFront
        ? createBoardGeometry(THREE, args, piece.width, piece.height, piece.depth)
        : new THREE.BoxGeometry(piece.width, piece.height, piece.depth);
      const pieceMaterial = resolveClippedBoardPieceMaterial(mat, pieceBox, sourceBox);
      const child = new THREE.Mesh(pieceGeometry, pieceMaterial);
      child.position.set(piece.x - x, piece.y - y, piece.z - z);
      child.userData = sharedUserData;
      if (!sketchMode) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (__isFn(addOutlines)) addOutlines(child);
      group.add(child);
      splitChildren.push(child as unknown as AnyMap);
    }

    bindSplitBoardRenderProperty(group as unknown as AnyMap, splitChildren, 'castShadow', !sketchMode);
    bindSplitBoardRenderProperty(group as unknown as AnyMap, splitChildren, 'receiveShadow', !sketchMode);
    bindSplitBoardRenderProperty(group as unknown as AnyMap, splitChildren, 'renderOrder', 0);

    wardrobeGroup.add(group);
    return group;
  }

  function createModuleHitBox(argsIn: BuilderCreateModuleHitBoxArgsLike | null | undefined) {
    const App = __app(argsIn);
    __ops(App);
    const args = __moduleHitBoxArgs(argsIn);
    const THREE = args.THREE;
    if (!THREE) return null;
    const wardrobeGroup = __wardrobeGroup(App);
    if (!wardrobeGroup) return null;

    const modWidth = __number(args.modWidth);
    const cabinetBodyHeight = __number(args.cabinetBodyHeight);
    const D = __number(args.D);
    const x = __number(args.x);
    const y = __number(args.y);
    const z = __number(args.z);
    const moduleIndex = args.moduleIndex;

    const hitMaterial = getModuleSelectorMaterial(
      App,
      'standard',
      () =>
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
    );
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(modWidth, cabinetBodyHeight, D), hitMaterial);
    hitBox.position.set(x, y, z);
    const __wpStack = typeof args.__wpStack === 'string' ? String(args.__wpStack) : undefined;
    hitBox.userData = { moduleIndex, isModuleSelector: true, __wpStack };
    wardrobeGroup.add(hitBox);
    return hitBox;
  }

  function createDrawerShadowPlane(argsIn: BuilderCreateDrawerShadowPlaneArgsLike | null | undefined) {
    const App = __app(argsIn);
    __ops(App);
    const args = __drawerShadowPlaneArgs(argsIn);
    const THREE = args.THREE;
    if (!THREE) return null;
    const wardrobeGroup = __wardrobeGroup(App);
    if (!wardrobeGroup) return null;

    const externalW = __number(args.externalW);
    const shadowH = __number(args.shadowH, 0.008);
    const shadowY = __number(args.shadowY);
    const externalCenterX = __number(args.externalCenterX);
    const D = __number(args.D);
    const frontZ = typeof args.frontZ === 'number' && Number.isFinite(args.frontZ) ? args.frontZ : null;
    const shadowMat = args.shadowMat || null;

    const shadowPlane = new THREE.Mesh(new THREE.BoxGeometry(externalW - 0.01, shadowH, 0.01), shadowMat);
    shadowPlane.position.set(externalCenterX, shadowY, (frontZ != null ? frontZ : D / 2) + 0.005);
    shadowPlane.name = 'wp_drawer_shadow_plane';
    shadowPlane.userData = shadowPlane.userData || {};
    shadowPlane.userData.kind = 'drawerShadowPlane';
    shadowPlane.userData.hideWhenOpen = true;
    wardrobeGroup.add(shadowPlane);
    return shadowPlane;
  }

  return {
    getCommonMats,
    getMirrorMaterial,
    createHandleMesh,
    createBoard,
    createModuleHitBox,
    createDrawerShadowPlane,
  };
}
