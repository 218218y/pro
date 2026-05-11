import { getBuilderCreateDoorVisual } from '../runtime/builder_service_access.js';
import { resolveDoorVisualStyle } from './render_door_ops_shared.js';
import { readDrawerConfig, resolveDrawerVisualState } from './render_drawer_ops_shared.js';
import { getMirrorMaterialFromServices } from './visuals_chest_mode_runtime.js';

import type {
  AppContainer,
  BuilderCreateDoorVisualFn,
  ConfigStateLike,
  Object3DLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types/index.js';

type ChestDrawerFrontVisualArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  cfg: ConfigStateLike;
  drawerId: string;
  drawerWidth: number;
  drawerHeight: number;
  drawerThickness: number;
  frontMaterial: unknown;
  bodyMaterial: unknown;
  globalFrontMaterial: unknown;
  doorStyle: unknown;
  isGroovesEnabled: boolean;
  getPartColorValue: (partId: string) => unknown;
  addOutlines?: ((mesh: unknown) => unknown) | null;
};

function readUserData(node: Object3DLike): UnknownRecord {
  const current = node.userData;
  if (current && typeof current === 'object' && !Array.isArray(current)) return current as UnknownRecord;
  const next: UnknownRecord = {};
  node.userData = next;
  return next;
}

function tagChestDrawerFrontLeaf(args: {
  node: Object3DLike;
  drawerId: string;
  drawerWidth: number;
  drawerHeight: number;
}): void {
  const userData = readUserData(args.node);
  userData.partId = args.drawerId;
  userData.__doorWidth = args.drawerWidth;
  userData.__doorHeight = args.drawerHeight;
}

function createPlainChestDrawerFront(args: ChestDrawerFrontVisualArgs): Object3DLike {
  const mesh = new args.THREE.Mesh(
    new args.THREE.BoxGeometry(args.drawerWidth, args.drawerHeight, args.drawerThickness),
    args.frontMaterial
  );
  tagChestDrawerFrontLeaf({
    node: mesh,
    drawerId: args.drawerId,
    drawerWidth: args.drawerWidth,
    drawerHeight: args.drawerHeight,
  });
  if (args.addOutlines) args.addOutlines(mesh);
  return mesh;
}

function readChestDrawerCreateDoorVisual(App: AppContainer): BuilderCreateDoorVisualFn | null {
  try {
    return getBuilderCreateDoorVisual(App);
  } catch {
    return null;
  }
}

export function createChestDrawerFrontVisual(args: ChestDrawerFrontVisualArgs): Object3DLike {
  const createDoorVisual = readChestDrawerCreateDoorVisual(args.App);
  if (!createDoorVisual) return createPlainChestDrawerFront(args);

  const cfg = readDrawerConfig(args.cfg);
  const drawerVisualState = resolveDrawerVisualState(cfg, args.drawerId, args.getPartColorValue);
  const drawerWoodMat = args.frontMaterial || args.bodyMaterial;
  const drawerMirrorMat = drawerVisualState.isMirror
    ? getMirrorMaterialFromServices(args.App, args.THREE) || drawerWoodMat
    : drawerWoodMat;
  const effectiveDrawerFrameStyleRaw = resolveDoorVisualStyle(
    null,
    args.doorStyle || 'flat',
    cfg.doorStyleMap,
    args.drawerId
  );
  const effectiveDrawerFrameStyle =
    effectiveDrawerFrameStyleRaw === 'glass' ? 'profile' : effectiveDrawerFrameStyleRaw;
  const effectiveDrawerStyle = drawerVisualState.isGlass ? 'glass' : effectiveDrawerFrameStyle;
  const grooveKey = `groove_${args.drawerId}`;
  const hasGroove =
    !!args.isGroovesEnabled &&
    !drawerVisualState.isGlass &&
    !drawerVisualState.isMirror &&
    !!cfg.groovesMap &&
    cfg.groovesMap[grooveKey] != null;

  const visual = createDoorVisual(
    args.drawerWidth,
    args.drawerHeight,
    args.drawerThickness,
    drawerVisualState.isMirror ? drawerMirrorMat : drawerWoodMat,
    effectiveDrawerStyle,
    hasGroove,
    drawerVisualState.isMirror,
    drawerVisualState.isGlass ? drawerVisualState.curtainType : null,
    drawerVisualState.isMirror ? drawerWoodMat : args.globalFrontMaterial,
    1,
    false,
    null,
    args.drawerId,
    drawerVisualState.isGlass ? { glassFrameStyle: effectiveDrawerFrameStyle } : null
  );

  tagChestDrawerFrontLeaf({
    node: visual,
    drawerId: args.drawerId,
    drawerWidth: args.drawerWidth,
    drawerHeight: args.drawerHeight,
  });
  return visual;
}
