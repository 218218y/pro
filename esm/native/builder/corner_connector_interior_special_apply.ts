// Corner connector special interior scene application.
//
// Keep this owner focused on scene mutation/orchestration. Metric policy,
// polygon math, and folded-content planning live in sibling owners.

import { CORNER_CONNECTOR_INTERIOR_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { P2 } from './corner_connector_interior_shared.js';
import type { CornerConnectorSpecialInteriorFlowParams } from './corner_connector_interior_special_types.js';
import {
  createLeftShelvesContentsPlan,
  createPentagonTopContentsPlan,
  emitFoldedClothesPlans,
} from './corner_connector_interior_special_contents.js';
import { createInsetPolygon, createShapeFromPolygon } from './corner_connector_interior_special_geometry.js';
import {
  createEqualShelfBottomYs,
  resolveCornerConnectorSpecialMetrics,
} from './corner_connector_interior_special_metrics.js';

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

  const specialPostDims = CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost;

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
    if (!Number.isFinite(len) || len <= specialPostDims.panelMinLengthM) return;

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
    if (width <= specialPostDims.shelfPlanMinDimensionM) return;
    const usableDepth = Math.max(0, depth - backInset);
    if (usableDepth <= specialPostDims.shelfPlanMinDimensionM) return;

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

  const shelf1Added = shelf1BottomY + woodThick <= ceilBottomY - specialPostDims.shelfCeilingClearanceM;
  if (shelf1Added) addShelfPentagon('corner_pent_int_shelf_180', shelf1BottomY);

  const shelf2Added =
    needH <= availH + specialPostDims.shelfFitToleranceM &&
    shelf2BottomY + woodThick <= ceilBottomY - specialPostDims.shelfCeilingClearanceM;
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
