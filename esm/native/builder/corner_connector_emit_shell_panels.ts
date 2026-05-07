import type {
  AddEdgePanelFn,
  CornerConnectorSetup,
  EdgePanelOpts,
  P2,
} from './corner_connector_emit_shared.js';
import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CornerConnectorShellMetrics } from './corner_connector_emit_shell_metrics.js';

type BackPanelShrink = boolean | number;

export function createCornerConnectorEdgePanelAdder(
  setup: CornerConnectorSetup,
  panelThick: number,
  wallH: number
): AddEdgePanelFn {
  const {
    THREE,
    interiorX,
    interiorZ,
    cornerGroup,
    ctx: { startY, wingH, getCornerMat, bodyMat, addOutlines },
  } = setup;

  return (a: P2, b: P2, partId: string, enabled: boolean, opts?: EdgePanelOpts): void => {
    if (!enabled) return;
    const shrinkS =
      opts && typeof opts.shrinkStart === 'number' && Number.isFinite(opts.shrinkStart)
        ? Math.max(0, opts.shrinkStart)
        : 0;
    const shrinkE =
      opts && typeof opts.shrinkEnd === 'number' && Number.isFinite(opts.shrinkEnd)
        ? Math.max(0, opts.shrinkEnd)
        : 0;

    let ax = a.x;
    let az = a.z;
    let bx = b.x;
    let bz = b.z;
    const dx0 = bx - ax;
    const dz0 = bz - az;
    const len0 = Math.sqrt(dx0 * dx0 + dz0 * dz0);
    if (!Number.isFinite(len0) || len0 <= CORNER_WING_DIMENSIONS.connector.shellPanelMinLengthM) return;
    const ux0 = dx0 / len0;
    const uz0 = dz0 / len0;
    if (shrinkS > 0) {
      ax += ux0 * shrinkS;
      az += uz0 * shrinkS;
    }
    if (shrinkE > 0) {
      bx -= ux0 * shrinkE;
      bz -= uz0 * shrinkE;
    }

    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (!Number.isFinite(len) || len <= CORNER_WING_DIMENSIONS.connector.shellPanelMinLengthM) return;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, panelThick), getCornerMat(partId, bodyMat));
    const midX = (ax + bx) / 2;
    const midZ = (az + bz) / 2;

    let offX = 0;
    let offZ = 0;
    if (opts?.alignOuterFaceToFootprint) {
      const nux = -dz / len;
      const nuz = dx / len;
      const dot = nux * (interiorX - midX) + nuz * (interiorZ - midZ);
      const sign = dot >= 0 ? 1 : -1;
      const eps =
        typeof opts.eps === 'number' && Number.isFinite(opts.eps)
          ? Math.max(0, opts.eps)
          : CORNER_WING_DIMENSIONS.connector.shellAttachFaceEpsilonM;
      offX = nux * sign * (panelThick / 2 + eps);
      offZ = nuz * sign * (panelThick / 2 + eps);
    }

    mesh.position.set(midX + offX, startY + wingH / 2, midZ + offZ);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.userData = { partId };
    addOutlines(mesh);
    cornerGroup.add(mesh);
  };
}

function appendCornerConnectorBackEdgePanel(
  setup: CornerConnectorSetup,
  metrics: CornerConnectorShellMetrics,
  a: P2,
  b: P2,
  partId: string,
  enabled: boolean,
  shrinkStart: BackPanelShrink = false,
  shrinkEnd: BackPanelShrink = false
): void {
  if (!enabled) return;
  const {
    THREE,
    interiorX,
    interiorZ,
    cornerGroup,
    ctx: { startY, wingH },
  } = setup;
  const junctionInset = CORNER_WING_DIMENSIONS.connector.shellBackJunctionInsetM;
  const startInset =
    typeof shrinkStart === 'number' ? Math.max(0, Number(shrinkStart)) : shrinkStart ? junctionInset : 0;
  const endInset =
    typeof shrinkEnd === 'number' ? Math.max(0, Number(shrinkEnd)) : shrinkEnd ? junctionInset : 0;

  let ax = a.x;
  let az = a.z;
  let bx = b.x;
  let bz = b.z;
  const dx0 = bx - ax;
  const dz0 = bz - az;
  const len0 = Math.sqrt(dx0 * dx0 + dz0 * dz0);
  if (!Number.isFinite(len0) || len0 <= CORNER_WING_DIMENSIONS.connector.shellPanelMinLengthM) return;
  const ux = dx0 / len0;
  const uz = dz0 / len0;
  if (startInset > 0) {
    ax += ux * startInset;
    az += uz * startInset;
  }
  if (endInset > 0) {
    bx -= ux * endInset;
    bz -= uz * endInset;
  }

  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (!Number.isFinite(len) || len <= CORNER_WING_DIMENSIONS.connector.shellPanelMinLengthM) return;

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(len, metrics.backWallH, metrics.backPanelThick),
    metrics.backPanelMaterialArrayNoPO
  );
  const normalInset =
    partId === 'corner_pent_back_side' ? metrics.backPanelOutsideInsetX : metrics.backPanelOutsideInsetZ;
  const nux = -dz / len;
  const nuz = dx / len;
  const mid0x = (ax + bx) / 2;
  const mid0z = (az + bz) / 2;
  const dot = nux * (interiorX - mid0x) + nuz * (interiorZ - mid0z);
  const sign = dot >= 0 ? 1 : -1;
  const midX = mid0x + nux * sign * (metrics.backPanelThick / 2 + normalInset);
  const midZ = mid0z + nuz * sign * (metrics.backPanelThick / 2 + normalInset);
  mesh.position.set(midX, startY + wingH / 2, midZ);
  mesh.rotation.y = -Math.atan2(dz, dx) + (sign < 0 ? Math.PI : 0);
  mesh.userData = { partId };
  cornerGroup.add(mesh);
}

export function applyCornerConnectorShellPanels(
  setup: CornerConnectorSetup,
  metrics: CornerConnectorShellMetrics
): AddEdgePanelFn {
  const addEdgePanel = createCornerConnectorEdgePanelAdder(setup, metrics.panelThick, metrics.wallH);
  const { pts, cornerConnectorAsStandaloneCabinet, carcassBackInsetX, carcassBackInsetZ } = setup;

  const cornerBackPanelNoOverlapInsetX =
    metrics.backPanelThick +
    metrics.backPanelOutsideInsetX +
    CORNER_WING_DIMENSIONS.connector.shellNoOverlapInsetExtraM;
  const cornerBackPanelNoOverlapInsetZ =
    metrics.backPanelThick +
    metrics.backPanelOutsideInsetZ +
    CORNER_WING_DIMENSIONS.connector.shellNoOverlapInsetExtraM;

  appendCornerConnectorBackEdgePanel(
    setup,
    metrics,
    pts[0],
    pts[1],
    'corner_pent_back_side',
    true,
    cornerBackPanelNoOverlapInsetX,
    true
  );
  appendCornerConnectorBackEdgePanel(
    setup,
    metrics,
    pts[4],
    pts[0],
    'corner_pent_back_back',
    true,
    true,
    cornerBackPanelNoOverlapInsetZ
  );

  addEdgePanel(pts[1], pts[2], 'corner_pent_attach_wing', true, {
    alignOuterFaceToFootprint: cornerConnectorAsStandaloneCabinet,
    shrinkStart: carcassBackInsetX,
    eps: CORNER_WING_DIMENSIONS.connector.shellAttachPanelEpsilonM,
  });
  addEdgePanel(pts[3], pts[4], 'corner_pent_attach_main', true, {
    alignOuterFaceToFootprint: cornerConnectorAsStandaloneCabinet,
    shrinkEnd: carcassBackInsetZ,
    eps: CORNER_WING_DIMENSIONS.connector.shellAttachPanelEpsilonM,
  });

  return addEdgePanel;
}
