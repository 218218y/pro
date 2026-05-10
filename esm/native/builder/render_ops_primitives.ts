import { createDoorEdgeHandleProfile } from './edge_handle_profile.js';
import { normalizeHandleFinishColor, resolveHandleFinishPalette } from '../features/handle_finish_shared.js';
import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getMirrorRenderTarget } from '../runtime/render_access.js';

import type {
  AppContainer,
  BuilderCreateBoardArgsLike,
  BuilderCreateDrawerShadowPlaneArgsLike,
  BuilderCreateModuleHitBoxArgsLike,
  BuilderHandleMeshOptionsLike,
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
  | 'Mesh'
  | 'Group'
  | 'DoubleSide'
  | 'FrontSide'
  | 'Shape'
  | 'ExtrudeGeometry'
>;
type RenderCommonArgs = Omit<BuilderCreateBoardArgsLike, 'THREE'> & { THREE?: RenderThreeLike | null };
type CommonMatsCache = AnyMap & {
  masoniteMat?: unknown;
  whiteMat?: unknown;
  shadowMat?: unknown;
  realMirrorMat?: AnyMap | null;
};
type BoardArgs = Omit<BuilderCreateBoardArgsLike, 'THREE'> & { THREE?: RenderThreeLike | null };
type ModuleHitBoxArgs = Omit<BuilderCreateModuleHitBoxArgsLike, 'THREE'> & { THREE?: RenderThreeLike | null };
type DrawerShadowPlaneArgs = Omit<BuilderCreateDrawerShadowPlaneArgsLike, 'THREE'> & {
  THREE?: RenderThreeLike | null;
};
type HandleMeshOpts = Omit<BuilderHandleMeshOptionsLike, 'THREE'> & { THREE?: RenderThreeLike | null };
type AddGroupLike = { add: BoundUnknownMethod<[obj: unknown]> };

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

    const cache = __matCache(App);
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

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
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
