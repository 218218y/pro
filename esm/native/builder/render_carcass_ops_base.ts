import type { AnyMap, BackPanelSeg, BoardOp, RenderCarcassRuntime } from './render_carcass_ops_shared.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { readDoorTrimMap } from '../features/door_trim.js';
import {
  buildDoorTrimSurfaceUserData,
  isCabinetBodyDoorTrimSurfacePartId,
  resolveCabinetBodyDoorTrimSurfaceInfo,
} from '../features/door_trim_surface_targets.js';
import { readRootState } from '../runtime/root_state_access.js';
import {
  __asFinite,
  __asString,
  __backPanelMaterial,
  __isBoardOp,
  __isLegPosition,
  __isPlinthSegment,
  __isRecord,
  __readArray,
  __readUnknownArray,
} from './render_carcass_ops_shared.js';

type RenderCarcassBaseDeps = {
  isBackPanelSeg: (value: unknown) => value is BackPanelSeg;
};

function readRecord(value: unknown): AnyMap | null {
  return __isRecord(value) ? value : null;
}

type DoorTrimMapLike = Record<string, unknown>;

function readDoorTrimMapForCarcass(App: unknown): DoorTrimMapLike {
  try {
    const rootState = readRecord(readRootState(App));
    const config = readRecord(rootState?.config);
    return readDoorTrimMap(config?.doorTrimMap) as DoorTrimMapLike;
  } catch {
    return readDoorTrimMap(null) as DoorTrimMapLike;
  }
}

function applyDoorTrimSurfaceMetrics(mesh: { userData?: AnyMap | null }, bd: BoardOp, partId: string): void {
  const surfaceUserData = buildDoorTrimSurfaceUserData(partId, bd);
  if (!surfaceUserData) return;
  mesh.userData = {
    ...(readRecord(mesh.userData) || {}),
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

export function createApplyCarcassBaseOps(deps: RenderCarcassBaseDeps) {
  const { isBackPanelSeg } = deps;

  function applyCarcassBaseOps(
    ops: { base?: unknown; boards?: unknown; backPanels?: unknown; backPanel?: BackPanelSeg | null },
    runtime: RenderCarcassRuntime
  ): void {
    applyBaseSupport(ops.base, runtime);
    applyBoards(ops.boards, runtime);
    applyBackPanels(ops.backPanels, ops.backPanel, runtime);
  }

  function applyBaseSupport(base: unknown, runtime: RenderCarcassRuntime): void {
    const { THREE, ctx, addOutlines, wardrobeGroup, reg, App } = runtime;
    const baseRec = readRecord(base);
    if (!baseRec) return;
    const baseKind = baseRec.kind;

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

          const plinthSeg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plMat);
          plinthSeg.position.set(
            Number.isFinite(x) ? x : 0,
            Number.isFinite(y) ? y : h / 2,
            Number.isFinite(z) ? z : 0
          );
          plinthSeg.userData = { partId: pid };
          reg(App, pid, plinthSeg, 'plinth');
          addOutlines(plinthSeg);
          wardrobeGroup.add(plinthSeg);
        }
        return;
      }

      const width = __asFinite(baseRec.width, 0);
      const height = __asFinite(baseRec.height, 0);
      const depth = __asFinite(baseRec.depth, 0);
      const x = __asFinite(baseRec.x, 0);
      const y = __asFinite(baseRec.y, 0);
      const z = __asFinite(baseRec.z, 0);
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), plMat);
      plinth.position.set(x, y, z);
      plinth.userData = { partId: pid };
      reg(App, pid, plinth, 'plinth');
      addOutlines(plinth);
      wardrobeGroup.add(plinth);
      return;
    }

    if (baseKind === 'legs' && ctx.legMat) {
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
        const leg = new THREE.Mesh(legGeometry, ctx.legMat);
        leg.position.set(px, height / 2, pz);
        addOutlines(leg);
        wardrobeGroup.add(leg);
      }
    }
  }

  function applyBoards(boardsIn: unknown, runtime: RenderCarcassRuntime): void {
    const { THREE, ctx, getPartMaterial, sketchMode, addOutlines, wardrobeGroup, reg, App } = runtime;
    const boards = __readArray(boardsIn, __isBoardOp) || [];
    const doorTrimMap = readDoorTrimMapForCarcass(App);
    for (let b = 0; b < boards.length; b += 1) {
      const bd = boards[b];
      if (bd.kind !== 'board') continue;
      const mat = getPartMaterial ? getPartMaterial(__asString(bd.partId)) : ctx.bodyMat;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bd.width, bd.height, bd.depth), mat);
      mesh.position.set(bd.x, bd.y, bd.z);
      const partId = __asString(bd.partId);
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
    backPanelsIn: unknown,
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
    const backPanels = __readUnknownArray(backPanelsIn);
    if (backPanels && backPanels.length) {
      for (let bp = 0; bp < backPanels.length; bp += 1) {
        const seg = backPanels[bp];
        if (!isBackPanelSeg(seg)) continue;
        addBackPanel(seg);
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
