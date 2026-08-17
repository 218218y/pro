// Corner connector interior attach-rod helpers.
//
// Keep the public connector interior seam focused on orchestration while the
// optional rod / hanger / hanging-clothes policy lives here.

import { CORNER_CONNECTOR_ATTACH_ROD_POLICY } from '../../shared/dimensions/corner_connector_interior_policy.js';
import { CM_PER_METER, MM_PER_METER } from '../../shared/dimensions/units.js';
import { appendInteriorRodEndSupports } from './interior_rod_support_visuals.js';
import type {
  CornerConnectorInteriorFlowParams,
  CornerConnectorInteriorEmitters,
} from './corner_connector_interior_shared.js';

export type CornerConnectorAttachRodFlowParams = CornerConnectorInteriorFlowParams & {
  emitters: Pick<CornerConnectorInteriorEmitters, 'emitRealisticHanger' | 'emitHangingClothes'>;
};

function readFiniteNumberOr(value: unknown, defaultValue: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

export function applyCornerConnectorAttachRod(params: CornerConnectorAttachRodFlowParams): void {
  const { ctx, locals, helpers, emitters } = params;
  const {
    App,
    THREE,
    woodThick,
    startY,
    wingH,
    uiAny,
    doorStyle,
    __sketchMode,
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
  const side = typeof sideRaw === 'string' && sideRaw.toLowerCase() === 'main' ? 'main' : 'wing';

  // Default lowered a bit (user feedback): 150cm feels more natural for hanging.
  const hCmRaw = ui.cornerPentAttachRodHeightCm ?? CORNER_CONNECTOR_ATTACH_ROD_POLICY.heightDefaultCm;
  const endInsetCmRaw =
    ui.cornerPentAttachRodEndInsetCm ?? CORNER_CONNECTOR_ATTACH_ROD_POLICY.endInsetDefaultCm;
  const rMmRaw = ui.cornerPentAttachRodRadiusMm ?? CORNER_CONNECTOR_ATTACH_ROD_POLICY.radiusDefaultMm;

  const rodY =
    readFiniteNumberOr(hCmRaw, CORNER_CONNECTOR_ATTACH_ROD_POLICY.heightDefaultCm) / CM_PER_METER + startY;
  const endInset =
    readFiniteNumberOr(endInsetCmRaw, CORNER_CONNECTOR_ATTACH_ROD_POLICY.endInsetDefaultCm) / CM_PER_METER;
  const radius =
    readFiniteNumberOr(rMmRaw, CORNER_CONNECTOR_ATTACH_ROD_POLICY.radiusDefaultMm) / MM_PER_METER;

  // Keep the rod inside the usable vertical range.
  const minY = startY + woodThick + CORNER_CONNECTOR_ATTACH_ROD_POLICY.verticalClearanceM;
  const maxY = startY + wingH - woodThick - CORNER_CONNECTOR_ATTACH_ROD_POLICY.verticalClearanceM;
  const yPos = Math.max(minY, Math.min(maxY, rodY));

  // Helper: add a cylinder rod between two points in XZ (horizontal plane), at fixed Y.
  const addRodBetween = (ax: number, az: number, bx: number, bz: number, partId: string) => {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (!Number.isFinite(len) || len <= CORNER_CONNECTOR_ATTACH_ROD_POLICY.minRodLengthM) return;

    const rodMaterial = getMaterial(null, 'metal');
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 16), rodMaterial);
    // Cylinder height is along local Y; rotate so it aligns with the (dx,dz) direction in XZ.
    rod.rotation.z = Math.PI / 2;
    rod.rotation.y = -Math.atan2(dz, dx);

    rod.position.set((ax + bx) / 2, yPos, (az + bz) / 2);
    rod.userData = { partId };
    addOutlines(rod);
    cornerGroup.add(rod);
    appendInteriorRodEndSupports({
      THREE,
      parent: cornerGroup,
      material: rodMaterial,
      centerX: (ax + bx) / 2,
      centerY: yPos,
      centerZ: (az + bz) / 2,
      rodLength: len,
      rodRadius: radius,
      axis: Math.abs(dx) >= Math.abs(dz) ? 'x' : 'z',
      ownerPartId: partId,
      addOutlines,
    });
    // Single hanger visual (matches other rods with the global "showHanger" toggle).
    if (showHangerEnabled && emitRealisticHanger) {
      try {
        emitRealisticHanger((ax + bx) / 2, yPos, (az + bz) / 2, cornerGroup, len, {
          showHangerEnabled: true,
          sketchMode: __sketchMode,
          addOutlines,
        });
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

        const usableW = Math.max(
          CORNER_CONNECTOR_ATTACH_ROD_POLICY.contentsWidthMinM,
          len - CORNER_CONNECTOR_ATTACH_ROD_POLICY.contentsWidthClearanceM
        );
        const distToBottom = Math.max(
          CORNER_CONNECTOR_ATTACH_ROD_POLICY.contentsHeightMinM,
          yPos - (startY + woodThick + CORNER_CONNECTOR_ATTACH_ROD_POLICY.contentsBottomClearanceM)
        );
        // Restrict depth a bit so clothes won't clip too aggressively in the irregular pentagon volume.
        emitHangingClothes(
          0,
          0,
          0,
          usableW,
          clothesGroup,
          distToBottom,
          CORNER_CONNECTOR_ATTACH_ROD_POLICY.contentsDepthHintM,
          {
            showContentsEnabled: showContentsEnabled === true,
            doorStyle,
            sketchMode: __sketchMode,
            addOutlines,
          }
        );
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
    const startZ = Math.max(
      backZ + CORNER_CONNECTOR_ATTACH_ROD_POLICY.wallBackClearanceM,
      L - panelThick / 2 - endInset
    );
    addRodBetween(midX, startZ, midX, backZ, 'corner_pent_attach_rod_wing');
  } else {
    // attach_main wall is pts[4] -> pts[3] (x == -L). Take the middle along Z.
    const wallX = mx(-L);
    const midZ = Dmain / 2;
    // Run toward the open side (x -> 0) while staying inside the volume.
    const startX = wallX + panelThick / 2 + endInset;
    const endX = Math.min(0 - CORNER_CONNECTOR_ATTACH_ROD_POLICY.wallBackClearanceM, -endInset);
    addRodBetween(startX, midZ, endX, midZ, 'corner_pent_attach_rod_main');
  }
}
