import type { AnyMap, BackPanelSeg, BoardOp, RenderCarcassRuntime } from './render_carcass_ops_shared.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import {
  readDoorTrimMap,
  buildDoorTrimSurfaceUserData,
  isCabinetBodyDoorTrimSurfacePartId,
  resolveCabinetBodyDoorTrimSurfaceInfo,
} from '../features/door_authoring/api.js';
import { getCfg } from './store_access.js';
import {
  axisAlignedBoxToCenterSize,
  boxFromCenterSize,
  intersectAxisAlignedBoxes,
  resolveActiveRoomColumnCutObstacle,
  resolveRoomColumnAdjustmentGeometry,
  subtractAxisAlignedBox,
} from './room_architecture_geometry.js';
import type { RoomColumnLinerFace } from './room_architecture_geometry.js';
import {
  __asFinite,
  __asString,
  __backPanelMaterial,
  __isLegPlatformSegment,
  __isLegPosition,
  __isPlinthSegment,
  __isRecord,
  __readArray,
} from './render_carcass_ops_shared.js';

function readRecord(value: unknown): AnyMap | null {
  return __isRecord(value) ? value : null;
}

type DoorTrimMapLike = Record<string, unknown>;

function readDoorTrimMapForCarcass(App: RenderCarcassRuntime['App']): DoorTrimMapLike {
  try {
    const config = readRecord(getCfg(App));
    return readDoorTrimMap(config?.doorTrimMap) as DoorTrimMapLike;
  } catch {
    return readDoorTrimMap(null) as DoorTrimMapLike;
  }
}

function applyDoorTrimSurfaceMetrics(mesh: { userData?: AnyMap | null }, bd: BoardOp, partId: string): void {
  const surfaceUserData = buildDoorTrimSurfaceUserData(partId, bd);
  if (!surfaceUserData) return;
  mesh.userData = {
    ...readRecord(mesh.userData),
    ...surfaceUserData,
  };
}

function appendCarcassDoorTrimVisuals(args: {
  runtime: RenderCarcassRuntime;
  mesh: unknown;
  bd: BoardOp;
  partId: string;
  doorTrimMap: DoorTrimMapLike;
}): void {
  const { runtime, mesh, bd, partId, doorTrimMap } = args;
  if (!isCabinetBodyDoorTrimSurfacePartId(partId)) return;
  const surfaceInfo = resolveCabinetBodyDoorTrimSurfaceInfo(partId, bd);
  if (!surfaceInfo) return;
  appendDoorTrimVisuals({
    App: runtime.App,
    THREE: runtime.THREE,
    group: mesh,
    partId,
    trims: doorTrimMap[partId],
    doorWidth: surfaceInfo.doorWidth,
    doorHeight: surfaceInfo.doorHeight,
    doorMeshOffsetX: 0,
    frontZ: surfaceInfo.faceCoord,
    faceSign: surfaceInfo.faceSign,
    surfacePlane: surfaceInfo.plane,
    surfaceFaceCoord: surfaceInfo.faceCoord,
  });
}

const ROOM_COLUMN_LINER_VISIBLE_FACE_INDEX: Readonly<Record<RoomColumnLinerFace, number>> = Object.freeze({
  right: 0,
  left: 1,
  top: 2,
  bottom: 3,
  front: 4,
});

function createRoomColumnLinerMaterial(runtime: RenderCarcassRuntime, face: RoomColumnLinerFace): unknown {
  const { THREE, ctx, sketchMode } = runtime;
  if (sketchMode) return new THREE.MeshBasicMaterial({ color: 0xffffff });

  const masonite = ctx.masoniteMat || ctx.whiteMat || ctx.bodyMat;
  const white = ctx.whiteMat || ctx.bodyMat || ctx.masoniteMat;
  const materials = [masonite, masonite, masonite, masonite, masonite, masonite];
  materials[ROOM_COLUMN_LINER_VISIBLE_FACE_INDEX[face]] = white;
  return materials;
}

export function createApplyCarcassBaseOps() {
  function applyCarcassBaseOps(
    ops: {
      base?: unknown;
      boards?: BoardOp[] | null;
      backPanels?: BackPanelSeg[] | null;
      backPanel?: BackPanelSeg | null;
    },
    runtime: RenderCarcassRuntime
  ): void {
    applyBaseSupport(ops.base, runtime);
    applyBoards(ops.boards, runtime);
    applyBackPanels(ops.backPanels, ops.backPanel, runtime);
    applyRoomColumnLiners(runtime);
  }

  function addBaseRectangularPart(args: {
    runtime: RenderCarcassRuntime;
    width: number;
    height: number;
    depth: number;
    x: number;
    y: number;
    z: number;
    material: unknown;
    partId: string;
    registryKind: 'plinth' | 'body';
    obstacle: ReturnType<typeof resolveActiveRoomColumnCutObstacle>;
  }): void {
    const { runtime, width, height, depth, x, y, z, material, partId, registryKind, obstacle } = args;
    const { THREE, addOutlines, wardrobeGroup, reg, App } = runtime;
    const sourceBox = boxFromCenterSize({ x, y, z, width, height, depth });
    const intersection = obstacle ? intersectAxisAlignedBoxes(sourceBox, obstacle) : null;

    if (!intersection || !obstacle) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      mesh.userData = { partId };
      reg(App, partId, mesh, registryKind);
      addOutlines(mesh);
      wardrobeGroup.add(mesh);
      return;
    }

    const pieces = subtractAxisAlignedBox(sourceBox, obstacle);
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.userData = { partId, __wpRoomColumnAdjusted: true };
    reg(App, partId, group, registryKind);

    for (let i = 0; i < pieces.length; i += 1) {
      const piece = axisAlignedBoxToCenterSize(pieces[i]);
      const child = new THREE.Mesh(new THREE.BoxGeometry(piece.width, piece.height, piece.depth), material);
      child.position.set(piece.x - x, piece.y - y, piece.z - z);
      child.userData = group.userData;
      addOutlines(child);
      group.add(child);
    }

    wardrobeGroup.add(group);
  }

  function applyRoomColumnLiners(runtime: RenderCarcassRuntime): void {
    const { THREE, wardrobeGroup, sketchMode, App } = runtime;
    const adjustment = resolveRoomColumnAdjustmentGeometry(App);
    if (!adjustment || adjustment.linerPanels.length === 0) return;

    const group = new THREE.Group();
    group.userData = {
      __kind: 'room_column_liner',
      __wpRoomColumnLiner: true,
      ignorePicking: true,
    };

    for (let i = 0; i < adjustment.linerPanels.length; i += 1) {
      const panel = adjustment.linerPanels[i];
      const piece = axisAlignedBoxToCenterSize(panel.box);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(piece.width, piece.height, piece.depth),
        createRoomColumnLinerMaterial(runtime, panel.face)
      );
      mesh.position.set(piece.x, piece.y, piece.z);
      mesh.userData = {
        ...group.userData,
        __wpRoomColumnLinerFace: panel.face,
      };
      if (!sketchMode) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      group.add(mesh);
    }

    wardrobeGroup.add(group);
  }

  function applyBaseSupport(base: unknown, runtime: RenderCarcassRuntime): void {
    const { THREE, ctx, addOutlines, wardrobeGroup, App } = runtime;
    const baseRec = readRecord(base);
    if (!baseRec) return;
    const baseKind = baseRec.kind;
    const obstacle = resolveActiveRoomColumnCutObstacle(App);

    if (baseKind === 'plinth') {
      const pid = __asString(baseRec.partId, 'plinth_color');
      const plMat = ctx.plinthMat || (runtime.getPartMaterial ? runtime.getPartMaterial(pid) : null);
      const segments = __readArray(baseRec.segments, __isPlinthSegment);

      if (segments && segments.length) {
        for (let si = 0; si < segments.length; si += 1) {
          const seg = segments[si];
          const w = __asFinite(seg.width);
          const h = __asFinite(seg.height);
          const d = __asFinite(seg.depth);
          const x = __asFinite(seg.x);
          const y = __asFinite(seg.y);
          const z = __asFinite(seg.z);
          if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(d)) continue;

          addBaseRectangularPart({
            runtime,
            width: w,
            height: h,
            depth: d,
            x: Number.isFinite(x) ? x : 0,
            y: Number.isFinite(y) ? y : h / 2,
            z: Number.isFinite(z) ? z : 0,
            material: plMat,
            partId: pid,
            registryKind: 'plinth',
            obstacle,
          });
        }
        return;
      }

      const width = __asFinite(baseRec.width, 0);
      const height = __asFinite(baseRec.height, 0);
      const depth = __asFinite(baseRec.depth, 0);
      const x = __asFinite(baseRec.x, 0);
      const y = __asFinite(baseRec.y, 0);
      const z = __asFinite(baseRec.z, 0);
      addBaseRectangularPart({
        runtime,
        width,
        height,
        depth,
        x,
        y,
        z,
        material: plMat,
        partId: pid,
        registryKind: 'plinth',
        obstacle,
      });
      return;
    }

    if (baseKind === 'legs' || baseKind === 'leg_platforms') {
      const platforms = __readArray(baseRec.platforms, __isLegPlatformSegment) || [];
      for (let i = 0; i < platforms.length; i += 1) {
        const platform = platforms[i];
        const width = __asFinite(platform.width);
        const height = __asFinite(platform.height);
        const depth = __asFinite(platform.depth);
        if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(depth)) continue;

        const x = __asFinite(platform.x, 0);
        const y = __asFinite(platform.y, height / 2);
        const z = __asFinite(platform.z, 0);
        const pid = __asString(platform.partId, 'base_leg_platform');
        const platformMat = (runtime.getPartMaterial ? runtime.getPartMaterial(pid) : null) || ctx.bodyMat;
        addBaseRectangularPart({
          runtime,
          width,
          height,
          depth,
          x,
          y,
          z,
          material: platformMat,
          partId: pid,
          registryKind: 'body',
          obstacle,
        });
      }
      if (baseKind !== 'legs' || !ctx.legMat) return;

      const geo = readRecord(baseRec.geo);
      const height = __asFinite(baseRec.height, 0);
      const shape = __asString(geo?.shape, 'round');
      const legGeometry =
        shape === 'square'
          ? new THREE.BoxGeometry(
              Math.max(0.001, __asFinite(geo?.width, 0.035)),
              height,
              Math.max(0.001, __asFinite(geo?.depth, 0.035))
            )
          : new THREE.CylinderGeometry(
              __asFinite(geo?.topRadius, 0),
              __asFinite(geo?.bottomRadius, 0),
              height,
              Math.max(3, Math.round(__asFinite(geo?.radialSegments, 8)))
            );
      const positions = __readArray(baseRec.positions, __isLegPosition) || [];
      for (let i = 0; i < positions.length; i += 1) {
        const p = positions[i];
        if (!p) continue;
        const px = __asFinite(p.x);
        const pz = __asFinite(p.z);
        if (!Number.isFinite(px) || !Number.isFinite(pz)) continue;
        const legHalfWidth =
          shape === 'square'
            ? Math.max(0.001, __asFinite(geo?.width, 0.035)) / 2
            : Math.max(__asFinite(geo?.topRadius, 0), __asFinite(geo?.bottomRadius, 0));
        const legHalfDepth =
          shape === 'square' ? Math.max(0.001, __asFinite(geo?.depth, 0.035)) / 2 : legHalfWidth;
        const legBox = boxFromCenterSize({
          x: px,
          y: height / 2,
          z: pz,
          width: legHalfWidth * 2,
          height,
          depth: legHalfDepth * 2,
        });
        if (obstacle && intersectAxisAlignedBoxes(legBox, obstacle)) continue;

        const leg = new THREE.Mesh(legGeometry, ctx.legMat);
        leg.position.set(px, height / 2, pz);
        addOutlines(leg);
        wardrobeGroup.add(leg);
      }
    }
  }

  function applyBoards(boardsIn: BoardOp[] | null | undefined, runtime: RenderCarcassRuntime): void {
    const { THREE, ctx, getPartMaterial, sketchMode, addOutlines, wardrobeGroup, reg, App } = runtime;
    const boards = boardsIn || [];
    const doorTrimMap = readDoorTrimMapForCarcass(App);
    for (let b = 0; b < boards.length; b += 1) {
      const bd = boards[b];
      if (bd.kind !== 'board') continue;
      const mat = getPartMaterial ? getPartMaterial(__asString(bd.partId)) : ctx.bodyMat;
      const partId = __asString(bd.partId);
      const sourceBox = boxFromCenterSize({
        x: bd.x,
        y: bd.y,
        z: bd.z,
        width: bd.width,
        height: bd.height,
        depth: bd.depth,
      });
      const obstacle = resolveActiveRoomColumnCutObstacle(App);
      const intersection = obstacle ? intersectAxisAlignedBoxes(sourceBox, obstacle) : null;

      if (intersection && obstacle) {
        const pieces = subtractAxisAlignedBox(sourceBox, obstacle);
        const group = new THREE.Group();
        group.position.set(bd.x, bd.y, bd.z);
        const sharedUserData: AnyMap = partId
          ? { partId, __wpRoomColumnAdjusted: true }
          : { __wpRoomColumnAdjusted: true };
        group.userData = sharedUserData;
        if (partId) {
          applyDoorTrimSurfaceMetrics(group, bd, partId);
          reg(App, partId, group, 'body');
        }

        for (let i = 0; i < pieces.length; i += 1) {
          const piece = axisAlignedBoxToCenterSize(pieces[i]);
          const child = new THREE.Mesh(new THREE.BoxGeometry(piece.width, piece.height, piece.depth), mat);
          child.position.set(piece.x - bd.x, piece.y - bd.y, piece.z - bd.z);
          child.userData = group.userData;
          if (!sketchMode) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          addOutlines(child);
          group.add(child);
        }

        appendCarcassDoorTrimVisuals({ runtime, mesh: group, bd, partId, doorTrimMap });
        wardrobeGroup.add(group);
        continue;
      }

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bd.width, bd.height, bd.depth), mat);
      mesh.position.set(bd.x, bd.y, bd.z);
      if (partId) {
        mesh.userData = { partId };
        applyDoorTrimSurfaceMetrics(mesh, bd, partId);
        reg(App, partId, mesh, 'body');
      }
      if (!sketchMode) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      addOutlines(mesh);
      appendCarcassDoorTrimVisuals({ runtime, mesh, bd, partId, doorTrimMap });
      wardrobeGroup.add(mesh);
    }
  }

  function applyBackPanels(
    backPanelsIn: BackPanelSeg[] | null | undefined,
    backPanel: BackPanelSeg | null | undefined,
    runtime: RenderCarcassRuntime
  ): void {
    const { THREE, ctx, sketchMode, wardrobeGroup, getPartMaterial, addOutlines, reg, App } = runtime;
    const material = __backPanelMaterial(ctx, THREE, sketchMode);
    const isWoodBackPanel = (seg: BackPanelSeg): boolean =>
      seg.__wpWoodBackPanel === true || seg.material === 'wood';
    const addBackPanel = (seg: BackPanelSeg): void => {
      const partId = __asString(seg.partId);
      const woodBack = isWoodBackPanel(seg);
      const panelMaterial =
        woodBack && partId
          ? (getPartMaterial ? getPartMaterial(partId) : ctx.bodyMat) || ctx.bodyMat
          : material;
      const sourceBox = boxFromCenterSize({
        x: seg.x,
        y: seg.y,
        z: seg.z,
        width: seg.width,
        height: seg.height,
        depth: seg.depth,
      });
      const obstacle = resolveActiveRoomColumnCutObstacle(App);
      const intersection = obstacle ? intersectAxisAlignedBoxes(sourceBox, obstacle) : null;

      if (intersection && obstacle) {
        const pieces = subtractAxisAlignedBox(sourceBox, obstacle);
        const group = new THREE.Group();
        group.position.set(seg.x, seg.y, seg.z);
        const sharedUserData: AnyMap = {
          ...(woodBack && partId ? { partId, kind: 'backPanel', __wpWoodBackPanel: true } : {}),
          __wpRoomColumnAdjusted: true,
        };
        group.userData = sharedUserData;
        if (woodBack && partId) reg(App, partId, group, 'body');

        for (let i = 0; i < pieces.length; i += 1) {
          const piece = axisAlignedBoxToCenterSize(pieces[i]);
          const child = new THREE.Mesh(
            new THREE.BoxGeometry(piece.width, piece.height, piece.depth),
            panelMaterial
          );
          child.position.set(piece.x - seg.x, piece.y - seg.y, piece.z - seg.z);
          child.userData = sharedUserData;
          if (woodBack && partId) addOutlines(child);
          if (!sketchMode) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          group.add(child);
        }

        wardrobeGroup.add(group);
        return;
      }

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(seg.width, seg.height, seg.depth), panelMaterial);
      mesh.position.set(seg.x, seg.y, seg.z);
      if (woodBack && partId) {
        mesh.userData = { partId, kind: 'backPanel', __wpWoodBackPanel: true };
        reg(App, partId, mesh, 'body');
        addOutlines(mesh);
      }
      if (!sketchMode) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      wardrobeGroup.add(mesh);
    };
    const backPanels = backPanelsIn;
    if (backPanels && backPanels.length) {
      for (let bp = 0; bp < backPanels.length; bp += 1) {
        addBackPanel(backPanels[bp]);
      }
      return;
    }

    if (!backPanel || backPanel.kind !== 'back_panel') return;
    addBackPanel(backPanel);
  }

  return {
    applyCarcassBaseOps,
  };
}
