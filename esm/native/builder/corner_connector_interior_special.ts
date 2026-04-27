// Corner connector interior special-layout helpers.
//
// Keep the public connector interior seam focused on orchestration while the
// pentagon post / shelf / folded-contents policy lives here.

import type {
  CornerConnectorInteriorFlowParams,
  CornerConnectorInteriorEmitters,
  P2,
} from './corner_connector_interior_shared.js';

export type CornerConnectorSpecialInteriorFlowParams = CornerConnectorInteriorFlowParams & {
  emitters: Pick<CornerConnectorInteriorEmitters, 'emitFoldedClothes'>;
};

export type CornerConnectorSpecialMetrics = {
  depth: number;
  backInset: number;
  sideInset: number;
  floorTopY: number;
  ceilBottomY: number;
  availH: number;
  postHClamped: number;
  needH: number;
  shelf1BottomY: number;
  shelf2BottomY: number;
  wallX: number;
  postX: number;
};

type FoldedClothesSurfacePlan = {
  x: number;
  y: number;
  z: number;
  width: number;
  maxHeight: number;
  maxDepth: number;
  op: string;
};

function readCentimetersAsMeters(raw: unknown, fallbackMeters: number): number {
  const parsed = parseFloat(String(raw));
  return Number.isFinite(parsed) ? parsed / 100 : fallbackMeters;
}

export function resolveCornerConnectorSpecialMetrics(args: {
  uiAny: CornerConnectorInteriorFlowParams['ctx']['uiAny'];
  mx: CornerConnectorInteriorFlowParams['locals']['mx'];
  L: number;
  Dmain: number;
  woodThick: number;
  startY: number;
  wingH: number;
  panelThick: number;
  backPanelThick: number;
  backPanelOutsideInsetZ: number;
}): CornerConnectorSpecialMetrics | null {
  const {
    uiAny,
    mx,
    L,
    Dmain,
    woodThick,
    startY,
    wingH,
    panelThick,
    backPanelThick,
    backPanelOutsideInsetZ,
  } = args;

  const postDepthCmRaw = uiAny.cornerPentSpecialPostDepthCm ?? uiAny.cornerPentPostDepthCm ?? 55;
  const postHeightCmRaw = uiAny.cornerPentSpecialPostHeightCm ?? uiAny.cornerPentPostHeightCm ?? 180;
  const topCellHCmRaw = uiAny.cornerPentSpecialTopCellHeightCm ?? uiAny.cornerPentTopCellHeightCm ?? 30;
  const postOffsetFromWallCmRaw =
    uiAny.cornerPentSpecialPostOffsetFromWallCm ?? uiAny.cornerPentPostOffsetFromWallCm;

  const postDepth = readCentimetersAsMeters(postDepthCmRaw, 0.55);
  const postH = readCentimetersAsMeters(postHeightCmRaw, 1.8);
  const cellH = readCentimetersAsMeters(topCellHCmRaw, 0.3);

  const depth = Math.max(0.05, Math.min(Dmain, postDepth));
  const backInset = Math.max(
    0,
    Math.min(Math.min(L, depth) - 0.02, backPanelThick + backPanelOutsideInsetZ + 0.0006)
  );
  const sideInset = Math.max(0, panelThick + 0.0006);

  const floorTopY = startY + woodThick;
  const ceilBottomY = startY + wingH - woodThick;
  const availH = Math.max(0, ceilBottomY - floorTopY);
  if (availH < 0.35) return null;

  const postHClamped = Math.max(0.2, Math.min(postH, Math.max(0.2, availH - 2 * (cellH + woodThick))));
  const needH = postHClamped + 2 * (cellH + woodThick);
  const shelf1BottomY = floorTopY + postHClamped;
  const shelf2BottomY = shelf1BottomY + woodThick + cellH;

  const wallX = mx(-L);
  let postX = wallX / 2;

  if (typeof postOffsetFromWallCmRaw !== 'undefined') {
    const off = readCentimetersAsMeters(postOffsetFromWallCmRaw, Number.NaN);
    if (Number.isFinite(off)) {
      const t = Math.max(0.05, Math.min(0.95, off / Math.max(0.001, L)));
      postX = wallX + (0 - wallX) * t;
    }
  }

  const minX = Math.min(wallX, 0);
  const maxX = Math.max(wallX, 0);
  postX = Math.max(minX + 0.03, Math.min(maxX - 0.03, postX));

  return {
    depth,
    backInset,
    sideInset,
    floorTopY,
    ceilBottomY,
    availH,
    postHClamped,
    needH,
    shelf1BottomY,
    shelf2BottomY,
    wallX,
    postX,
  };
}

export function createEqualShelfBottomYs(args: {
  enabled: boolean;
  floorTopY: number;
  targetTop: number;
  woodThick: number;
}): number[] {
  const { enabled, floorTopY, targetTop, woodThick } = args;
  if (!enabled) return [];
  const spanH = Math.max(0, targetTop - floorTopY);
  if (spanH < 0.35) return [];

  const net = spanH - 3 * woodThick;
  if (net <= 0.12) return [];
  const space = net / 4;
  const bottoms: number[] = [];

  for (let i = 1; i <= 3; i++) {
    const by = floorTopY + i * space + (i - 1) * woodThick;
    if (by + woodThick <= targetTop - 0.002) bottoms.push(by);
  }
  return bottoms;
}

export function createInsetPolygon(
  polygon: readonly P2[],
  interiorPoint: { x: number; z: number },
  edgeInsets: readonly number[]
): P2[] | null {
  const n = polygon.length;
  if (n < 3) return null;

  const lines: Array<{ nx: number; nz: number; c: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (!Number.isFinite(len) || len <= 1e-6) return null;

    const nux = -dz / len;
    const nuz = dx / len;
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const vix = interiorPoint.x - midX;
    const viz = interiorPoint.z - midZ;
    const dot = nux * vix + nuz * viz;
    const sign = dot >= 0 ? 1 : -1;
    const nx = nux * sign;
    const nz = nuz * sign;
    const d = Math.max(0, Number(edgeInsets[i] ?? 0));
    const c = nx * a.x + nz * a.z + d;
    lines.push({ nx, nz, c });
  }

  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = lines[(i - 1 + n) % n];
    const cur = lines[i];
    const det = prev.nx * cur.nz - prev.nz * cur.nx;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-10) return null;
    const x = (prev.c * cur.nz - prev.nz * cur.c) / det;
    const z = (prev.nx * cur.c - prev.c * cur.nx) / det;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    out.push({ x, z });
  }
  return out;
}

function createShapeFromPolygon(
  THREE: CornerConnectorInteriorFlowParams['ctx']['THREE'],
  polygon: readonly P2[] | null | undefined
): unknown | null {
  if (!Array.isArray(polygon) || polygon.length < 3) return null;
  const shape = new THREE.Shape();
  shape.moveTo(polygon[0].x, polygon[0].z);
  for (let i = 1; i < polygon.length; i++) shape.lineTo(polygon[i].x, polygon[i].z);
  shape.lineTo(polygon[0].x, polygon[0].z);
  return shape;
}

function emitFoldedClothesPlan(
  plan: FoldedClothesSurfacePlan,
  parentGroup: CornerConnectorInteriorFlowParams['locals']['cornerGroup'],
  emitFoldedClothes: CornerConnectorInteriorEmitters['emitFoldedClothes'],
  reportErrorThrottled: CornerConnectorInteriorFlowParams['helpers']['reportErrorThrottled'],
  App: unknown
): void {
  if (!emitFoldedClothes) return;
  try {
    emitFoldedClothes(plan.x, plan.y, plan.z, plan.width, parentGroup, plan.maxHeight, plan.maxDepth);
  } catch (error) {
    reportErrorThrottled(App, error, { where: 'corner_ops_emit', op: plan.op, throttleMs: 4000 });
  }
}

function emitFoldedClothesPlans(
  plans: readonly FoldedClothesSurfacePlan[],
  parentGroup: CornerConnectorInteriorFlowParams['locals']['cornerGroup'],
  emitFoldedClothes: CornerConnectorInteriorEmitters['emitFoldedClothes'],
  reportErrorThrottled: CornerConnectorInteriorFlowParams['helpers']['reportErrorThrottled'],
  App: unknown
): void {
  for (const plan of plans) {
    emitFoldedClothesPlan(plan, parentGroup, emitFoldedClothes, reportErrorThrottled, App);
  }
}

function createLeftShelvesContentsPlan(args: {
  postX: number;
  wallX: number;
  depth: number;
  backInset: number;
  floorTopY: number;
  shelf1BottomY: number;
  woodThick: number;
  leftShelfBottomYs: readonly number[];
}): FoldedClothesSurfacePlan[] {
  const { postX, wallX, depth, backInset, floorTopY, shelf1BottomY, woodThick, leftShelfBottomYs } = args;
  const width = Math.abs(postX - wallX);
  const usableDepth = Math.max(0, depth - backInset);
  if (!(width > 0.28) || !(usableDepth > 0.18)) return [];

  const centerX = (postX + wallX) / 2;
  const centerZ = backInset + usableDepth / 2;
  const shelfBottomYs = leftShelfBottomYs.slice().sort((a, b) => a - b);
  const plans: FoldedClothesSurfacePlan[] = [];

  const firstStop = shelfBottomYs.length ? shelfBottomYs[0] : shelf1BottomY;
  const floorMaxHeight = firstStop - floorTopY - 0.02;
  if (floorMaxHeight > 0.08) {
    plans.push({
      x: centerX,
      y: floorTopY + 0.002,
      z: centerZ,
      width: Math.max(0.2, width - 0.06),
      maxHeight: Math.max(0.12, Math.min(0.65, floorMaxHeight)),
      maxDepth: usableDepth,
      op: 'special:leftSurface:floor',
    });
  }

  for (let i = 0; i < shelfBottomYs.length; i++) {
    const topY = shelfBottomYs[i] + woodThick;
    const nextStop = i + 1 < shelfBottomYs.length ? shelfBottomYs[i + 1] : shelf1BottomY;
    const maxHeight = nextStop - topY - 0.02;
    if (maxHeight > 0.08) {
      plans.push({
        x: centerX,
        y: topY + 0.002,
        z: centerZ,
        width: Math.max(0.2, width - 0.06),
        maxHeight: Math.max(0.12, Math.min(0.65, maxHeight)),
        maxDepth: usableDepth,
        op: `special:leftSurface:shelf:${i + 1}`,
      });
    }
  }

  return plans;
}

function createPentagonTopContentsPlan(args: {
  mx: (x: number) => number;
  L: number;
  shelf1Added: boolean;
  shelf1BottomY: number;
  shelf2Added: boolean;
  shelf2BottomY: number;
  woodThick: number;
  ceilBottomY: number;
}): FoldedClothesSurfacePlan[] {
  const { mx, L, shelf1Added, shelf1BottomY, shelf2Added, shelf2BottomY, woodThick, ceilBottomY } = args;
  const safeX = mx(-L / 2);
  const safeZ = Math.max(0.14, Math.min(L * 0.35, L - 0.18));
  const safeW = Math.max(0.35, Math.min(L * 0.85, 0.9));
  const safeD = Math.max(0.22, Math.min(0.34, L - 0.12));
  const plans: FoldedClothesSurfacePlan[] = [];

  if (shelf1Added) {
    const surfaceY = shelf1BottomY + woodThick + 0.002;
    const stopY = shelf2Added ? shelf2BottomY : ceilBottomY;
    const maxHeight = stopY - surfaceY - 0.02;
    if (maxHeight > 0.08) {
      plans.push({
        x: safeX,
        y: surfaceY,
        z: safeZ,
        width: safeW,
        maxHeight: Math.min(0.65, maxHeight),
        maxDepth: safeD,
        op: 'special:topContents:lower',
      });
    }
  }

  if (shelf2Added) {
    const surfaceY = shelf2BottomY + woodThick + 0.002;
    const maxHeight = ceilBottomY - surfaceY - 0.02;
    if (maxHeight > 0.08) {
      plans.push({
        x: safeX,
        y: surfaceY,
        z: safeZ,
        width: safeW,
        maxHeight: Math.min(0.65, maxHeight),
        maxDepth: safeD,
        op: 'special:topContents:upper',
      });
    }
  }

  return plans;
}

export function applyCornerConnectorSpecialInterior(params: CornerConnectorSpecialInteriorFlowParams): void {
  const { ctx, locals, helpers, emitters } = params;
  const {
    App,
    THREE,
    woodThick,
    startY,
    wingH,
    uiAny,
    showContentsEnabled,
    addOutlines,
    getCornerMat,
    bodyMat,
  } = ctx;
  const {
    mx,
    L,
    Dmain,
    shape,
    pts,
    interiorX,
    interiorZ,
    panelThick,
    backPanelThick,
    __backPanelOutsideInsetZ,
    cornerGroup,
  } = locals;
  const { reportErrorThrottled } = helpers;
  const { emitFoldedClothes } = emitters;

  const ui = uiAny;
  const enabled = typeof ui.cornerPentSpecialInternal !== 'undefined' ? !!ui.cornerPentSpecialInternal : true;
  if (!enabled) return;

  const metrics = resolveCornerConnectorSpecialMetrics({
    uiAny,
    mx,
    L,
    Dmain,
    woodThick,
    startY,
    wingH,
    panelThick,
    backPanelThick,
    backPanelOutsideInsetZ: __backPanelOutsideInsetZ,
  });
  if (!metrics) return;

  const {
    depth,
    backInset,
    sideInset,
    floorTopY,
    ceilBottomY,
    availH,
    postHClamped,
    needH,
    shelf1BottomY,
    shelf2BottomY,
    wallX,
    postX,
  } = metrics;

  const buildSegPanel = (a: P2, b: P2, partId: string, h: number) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (!Number.isFinite(len) || len <= 0.01) return;

    const geo = new THREE.BoxGeometry(len, h, panelThick);
    const mat = getCornerMat(partId, bodyMat);
    const mesh = new THREE.Mesh(geo, mat);

    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    mesh.position.set(midX, floorTopY + h / 2, midZ);

    const ang = Math.atan2(dz, dx);
    mesh.rotation.y = -ang;

    mesh.userData = { partId };
    addOutlines(mesh);
    cornerGroup.add(mesh);
  };

  // Internal post (vertical partition), depth ~= main cabinet depth (55cm), height ~= 180cm.
  buildSegPanel({ x: postX, z: backInset }, { x: postX, z: depth }, 'corner_pent_int_post', postHClamped);

  const addShelfRectMainSide = (partId: string, bottomY: number) => {
    const width = Math.abs(postX - wallX);
    if (width <= 0.05) return;
    const usableDepth = Math.max(0, depth - backInset);
    if (usableDepth <= 0.05) return;

    const geo = new THREE.BoxGeometry(width, woodThick, usableDepth);
    const mat = getCornerMat(partId, bodyMat);
    const mesh = new THREE.Mesh(geo, mat);
    const centerX = (postX + wallX) / 2;
    const centerZ = backInset + usableDepth / 2;
    mesh.position.set(centerX, bottomY + woodThick / 2, centerZ);
    mesh.userData = { partId };
    addOutlines(mesh);
    cornerGroup.add(mesh);
  };

  const leftShelvesEnabled =
    typeof ui.cornerPentSpecialLeftShelves !== 'undefined' ? !!ui.cornerPentSpecialLeftShelves : true;
  const leftShelfBottomYs = createEqualShelfBottomYs({
    enabled: leftShelvesEnabled,
    floorTopY,
    targetTop: shelf1BottomY,
    woodThick,
  });
  for (let i = 0; i < leftShelfBottomYs.length; i++) {
    addShelfRectMainSide(`corner_pent_int_left_shelf_${i + 1}`, leftShelfBottomYs[i]);
  }

  // Build an inset shelf footprint so pentagon shelves stay fully INSIDE the connector carcass:
  // - avoid clipping into the side panels near the doors
  // - avoid protruding beyond the wall-facing masonite back panels (visible from the rear)
  const xWallInset = backInset;
  const edgeInsets = [xWallInset, sideInset, sideInset, sideInset, backInset];
  const shelfPolygon =
    Array.isArray(pts) && pts.length >= 3
      ? createInsetPolygon(pts, { x: interiorX, z: interiorZ }, edgeInsets)
      : null;

  // IMPORTANT (rear alignment):
  // On the wing-side wall (x==0, pts[0]->pts[1]) the wing carcass uses a deeper rear trim line.
  // Even after we trim the connector posts, the internal pentagon shelves (full 5-sides footprint)
  // can still appear to "peek" behind the roof/back line when viewed from the rear near the wing.
  //
  // Fix: use the same inset as the pentagon ceiling board on the x==0 wall edge so the top shelves
  // end no further back than the visible roof/back line. Keep other edges as-is.
  const shelfShape = createShapeFromPolygon(THREE, shelfPolygon) || shape;

  const addShelfPentagon = (partId: string, bottomY: number) => {
    const geo = new THREE.ExtrudeGeometry(shelfShape, { depth: woodThick, bevelEnabled: false });
    const mat = getCornerMat(partId, bodyMat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = bottomY + woodThick;
    mesh.userData = { partId };
    addOutlines(mesh);
    cornerGroup.add(mesh);
  };

  if (showContentsEnabled) {
    const plans = createLeftShelvesContentsPlan({
      postX,
      wallX,
      depth,
      backInset,
      floorTopY,
      shelf1BottomY,
      woodThick,
      leftShelfBottomYs,
    });
    emitFoldedClothesPlans(plans, cornerGroup, emitFoldedClothes, reportErrorThrottled, App);
  }

  const shelf1Added = shelf1BottomY + woodThick <= ceilBottomY - 0.005;
  if (shelf1Added) addShelfPentagon('corner_pent_int_shelf_180', shelf1BottomY);

  const shelf2Added = needH <= availH + 0.002 && shelf2BottomY + woodThick <= ceilBottomY - 0.005;
  if (shelf2Added) addShelfPentagon('corner_pent_int_shelf_210', shelf2BottomY);

  if (showContentsEnabled) {
    const plans = createPentagonTopContentsPlan({
      mx,
      L,
      shelf1Added,
      shelf1BottomY,
      shelf2Added,
      shelf2BottomY,
      woodThick,
      ceilBottomY,
    });
    emitFoldedClothesPlans(plans, cornerGroup, emitFoldedClothes, reportErrorThrottled, App);
  }
}
