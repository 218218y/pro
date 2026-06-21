import { createDoorEdgeHandleProfile } from './edge_handle_profile.js';
import { normalizeHandleFinishColor, resolveHandleFinishPalette } from '../features/handle_finish_shared.js';
import {
  HANDLE_DIMENSIONS,
  INTERIOR_FITTINGS_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getMirrorRenderTarget } from '../runtime/render_access.js';

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

type RoundedShelfGeometryLike = {
  getAttribute?: (name: string) => unknown;
  setAttribute?: (name: string, attribute: unknown) => unknown;
  setIndex?: (index: number[] | unknown) => unknown;
  computeVertexNormals?: () => unknown;
  computeBoundingBox?: () => unknown;
  computeBoundingSphere?: () => unknown;
};

type RoundedShelfFootprintPoint = { x: number; z: number };

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
        : INTERIOR_FITTINGS_DIMENSIONS.shelves.roundedCornerRadiusM;
    const maxRadius = Math.max(0, Math.min(w, d) / 2 - 0.001);
    return Math.max(0.001, Math.min(requested, maxRadius));
  }

  function resolveRoundedShelfSegments(args: BoardArgs): number {
    const raw =
      typeof args.roundedShelfSegments === 'number' && Number.isFinite(args.roundedShelfSegments)
        ? args.roundedShelfSegments
        : INTERIOR_FITTINGS_DIMENSIONS.shelves.roundedCornerSegments;
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
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      const prev = normalized[normalized.length - 1];
      if (!prev || !isSameRoundedShelfPoint(prev, point)) normalized.push(point);
    }
    if (normalized.length > 1 && isSameRoundedShelfPoint(normalized[0], normalized[normalized.length - 1])) {
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
    const topY = h / 2;
    const bottomY = -h / 2;
    const center: RoundedShelfFootprintPoint = {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
    };

    for (let i = 0; i < points.length; i += 1) {
      const next = points[(i + 1) % points.length];
      pushRoundedShelfPlanarTriangle(
        positions,
        normals,
        uvs,
        center,
        topY,
        points[i],
        topY,
        next,
        topY,
        0,
        1,
        0,
        w,
        d
      );
      pushRoundedShelfPlanarTriangle(
        positions,
        normals,
        uvs,
        center,
        bottomY,
        next,
        bottomY,
        points[i],
        bottomY,
        0,
        -1,
        0,
        w,
        d
      );
    }

    const attachedSide = resolveRoundedShelfAttachedSide(side);
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if (shouldOmitRoundedShelfSideFace(a, b, attachedSide, w)) continue;

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
    }

    const geometry = new THREE.BufferGeometry() as RoundedShelfGeometryLike;
    geometry.setAttribute?.('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute?.('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute?.('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeBoundingBox?.();
    geometry.computeBoundingSphere?.();
    return geometry;
  }

  function createBoardGeometry(THREE: RenderThreeLike, args: BoardArgs, w: number, h: number, d: number) {
    if (args.shape === 'rounded_shelf') return createRoundedShelfGeometry(THREE, args, w, h, d);
    return new THREE.BoxGeometry(w, h, d);
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
          ? HANDLE_DIMENSIONS.edge.longLengthM
          : HANDLE_DIMENSIONS.edge.shortLengthM;
      const mat = new THREE.MeshStandardMaterial({
        color: palette.hex,
        emissive: palette.emissiveHex,
        emissiveIntensity: 0.08,
        roughness: palette.roughness,
        metalness: palette.metalness,
      });
      const xPos = isLeftHinge
        ? w - HANDLE_DIMENSIONS.edge.renderPrimitiveDoorAnchorInsetM
        : -w + HANDLE_DIMENSIONS.edge.renderPrimitiveDoorAnchorInsetM;
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
      HANDLE_DIMENSIONS.standard.doorWidthM,
      HANDLE_DIMENSIONS.standard.doorHeightM,
      HANDLE_DIMENSIONS.standard.doorDepthM
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
    const offset = HANDLE_DIMENSIONS.standard.doorOffsetM;
    const xPos = isLeftHinge ? w - offset : -w + offset;
    mesh.position.set(xPos, 0, HANDLE_DIMENSIONS.standard.frontZM);
    if (__isFn(addOutlines)) addOutlines(mesh);
    handleGroup.add(mesh);
    return handleGroup;
  }

  function createBoard(argsIn: BuilderCreateBoardArgsLike | null | undefined) {
    const App = __app(argsIn);
    __ops(App);
    const args = __boardArgs(argsIn);
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
    const mat = args.mat || null;
    const partId = args.partId || null;
    const sketchMode = !!args.sketchMode;
    const addOutlines = args.addOutlines;

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

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(modWidth, cabinetBodyHeight, D),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
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
