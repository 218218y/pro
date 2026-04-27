// Corner connector interior attach-rod helpers.
//
// Keep the public connector interior seam focused on orchestration while the
// optional rod / hanger / hanging-clothes policy lives here.

import type {
  CornerConnectorInteriorFlowParams,
  CornerConnectorInteriorEmitters,
} from './corner_connector_interior_shared.js';

export type CornerConnectorAttachRodFlowParams = CornerConnectorInteriorFlowParams & {
  emitters: Pick<CornerConnectorInteriorEmitters, 'emitRealisticHanger' | 'emitHangingClothes'>;
};

export function applyCornerConnectorAttachRod(params: CornerConnectorAttachRodFlowParams): void {
  const { ctx, locals, helpers, emitters } = params;
  const {
    App,
    THREE,
    woodThick,
    startY,
    wingH,
    uiAny,
    showHangerEnabled,
    showContentsEnabled,
    addOutlines,
    getMaterial,
  } = ctx;
  const { pts, mx, L, Dmain, panelThick, backPanelThick, cornerGroup } = locals;
  const { reportErrorThrottled } = helpers;
  const { emitRealisticHanger, emitHangingClothes } = emitters;

  const ui = uiAny;
  const enabled =
    typeof ui.cornerPentAttachRodEnabled !== 'undefined' ? !!ui.cornerPentAttachRodEnabled : true;
  if (!enabled) return;

  const sideRaw = ui.cornerPentAttachRodSide ?? 'wing';
  const side = String(sideRaw || 'wing').toLowerCase() === 'main' ? 'main' : 'wing';

  // Default lowered a bit (user feedback): 150cm feels more natural for hanging.
  const hCmRaw = ui.cornerPentAttachRodHeightCm ?? 150;
  const endInsetCmRaw = ui.cornerPentAttachRodEndInsetCm ?? 2;
  const rMmRaw = ui.cornerPentAttachRodRadiusMm ?? 15;

  const rodY =
    (Number.isFinite(parseFloat(String(hCmRaw))) ? parseFloat(String(hCmRaw)) : 150) / 100 + startY;
  const endInset =
    (Number.isFinite(parseFloat(String(endInsetCmRaw))) ? parseFloat(String(endInsetCmRaw)) : 2) / 100;
  const radius = (Number.isFinite(parseFloat(String(rMmRaw))) ? parseFloat(String(rMmRaw)) : 15) / 1000;

  // Keep the rod inside the usable vertical range.
  const minY = startY + woodThick + 0.05;
  const maxY = startY + wingH - woodThick - 0.05;
  const yPos = Math.max(minY, Math.min(maxY, rodY));

  // Helper: add a cylinder rod between two points in XZ (horizontal plane), at fixed Y.
  const addRodBetween = (ax: number, az: number, bx: number, bz: number, partId: string) => {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (!Number.isFinite(len) || len <= 0.08) return;

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, len, 16),
      getMaterial(null, 'metal')
    );
    // Cylinder height is along local Y; rotate so it aligns with the (dx,dz) direction in XZ.
    rod.rotation.z = Math.PI / 2;
    rod.rotation.y = -Math.atan2(dz, dx);

    rod.position.set((ax + bx) / 2, yPos, (az + bz) / 2);
    rod.userData = { partId };
    addOutlines(rod);
    cornerGroup.add(rod);
    // Single hanger visual (matches other rods with the global "showHanger" toggle).
    if (showHangerEnabled && emitRealisticHanger) {
      try {
        emitRealisticHanger((ax + bx) / 2, yPos, (az + bz) / 2, cornerGroup, len, true);
      } catch (_) {
        reportErrorThrottled(App, _, { where: 'corner_ops_emit', op: 'L1752', throttleMs: 4000 });
      }
    }

    // Clothes contents for this rod (respects the global "Show contents" toggle).
    // NOTE: addHangingClothes assumes the rod spans along local X. We create a rotated sub-group
    // so the rod direction becomes local X, then spawn hanging clothes inside it.
    if (showContentsEnabled && emitHangingClothes) {
      try {
        const clothesGroup = new THREE.Group();
        clothesGroup.position.set((ax + bx) / 2, yPos, (az + bz) / 2);
        // Align local X with the rod direction in XZ.
        clothesGroup.rotation.y = -Math.atan2(dz, dx);
        clothesGroup.userData = {
          partId: partId + '_contents',
          __kind: 'contents',
          __wpCornerPentagon: true,
        };
        cornerGroup.add(clothesGroup);

        const usableW = Math.max(0.08, len - 0.06);
        const distToBottom = Math.max(0.55, yPos - (startY + woodThick + 0.02));
        // Restrict depth a bit so clothes won't clip too aggressively in the irregular pentagon volume.
        emitHangingClothes(0, 0, 0, usableW, clothesGroup, distToBottom, 0.32);
      } catch (_) {
        reportErrorThrottled(App, _, { where: 'corner_ops_emit', op: 'L1775', throttleMs: 4000 });
      }
    }
  };

  // Back wall of the connector is z≈0 in local coords (panel is slightly inset inward).
  const backZ = Math.max(0, backPanelThick + endInset);

  if (side === 'wing') {
    // attach_wing wall is pts[1] -> pts[2] (z == L). Take the middle along X.
    const midX = (pts[1].x + pts[2].x) / 2;
    // Move inside from the wall so the rod doesn't poke through the side panel.
    const startZ = Math.max(backZ + 0.08, L - panelThick / 2 - endInset);
    addRodBetween(midX, startZ, midX, backZ, 'corner_pent_attach_rod_wing');
  } else {
    // attach_main wall is pts[4] -> pts[3] (x == -L). Take the middle along Z.
    const wallX = mx(-L);
    const midZ = Dmain / 2;
    // Run toward the open side (x -> 0) while staying inside the volume.
    const startX = wallX + panelThick / 2 + endInset;
    const endX = Math.min(-0.08, -endInset);
    addRodBetween(startX, midZ, endX, midZ, 'corner_pent_attach_rod_main');
  }
}
