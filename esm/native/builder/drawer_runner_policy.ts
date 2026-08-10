import type { DrawerRunnerType } from '../../../types/index.js';

/**
 * Drawer runner selection is a cabinet-wide construction choice for ordinary
 * external drawers and internal drawers. Shoe drawers keep their dedicated
 * hardware path and are intentionally excluded.
 */
export const DEFAULT_DRAWER_RUNNER_TYPE: DrawerRunnerType = 'roller';

export function normalizeDrawerRunnerType(value: unknown): DrawerRunnerType {
  return value === 'blum' ? 'blum' : DEFAULT_DRAWER_RUNNER_TYPE;
}

export function readDrawerRunnerTypeFromConfig(value: unknown): DrawerRunnerType {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_DRAWER_RUNNER_TYPE;
  return normalizeDrawerRunnerType((value as Record<string, unknown>).drawerRunnerType);
}

/**
 * Installation / visual policy for the simple side-mounted roller runner.
 *
 * Authoritative installation dimensions are based on the common Hettich FR
 * roller-runner planning envelope: 12.5 mm side clearance and 35 mm runner
 * height. Small profile/web/wheel dimensions below are explicitly visual
 * modelling dimensions because the manufacturer planning drawing does not
 * dimension every silhouette detail.
 */
export const ROLLER_DRAWER_RUNNER_POLICY = Object.freeze({
  sideClearanceM: 0.0125,
  profileHeightM: 0.035,
  visualWebThicknessM: 0.0018,
  visualFlangeWidthM: 0.0065,
  visualFlangeThicknessM: 0.0018,
  visualWheelRadiusM: 0.0075,
  visualWheelWidthM: 0.0055,
  endInsetM: 0.012,
  minVisualLengthM: 0.16,
});

/**
 * Blum TANDEM 560H reference constraints for wooden drawers. The runner is
 * concealed below the drawer and uses left/right locking devices at the front.
 * Blum specifies 11–16 mm drawer-side thickness and SKW = LW - 42 mm for the
 * internal drawer width. The remaining dimensions here only describe the
 * simplified 3D silhouette; they are not advertised as machining dimensions.
 */
export const BLUM_TANDEM_DRAWER_RUNNER_POLICY = Object.freeze({
  drawerSideThicknessMinM: 0.011,
  drawerSideThicknessMaxM: 0.016,
  internalDrawerWidthReductionM: 0.042,
  nominalLengthMinM: 0.25,
  nominalLengthMaxM: 0.6,
  drawerLengthFromNominalReductionM: 0.01,
  visualRailWidthM: 0.018,
  visualRailHeightM: 0.009,
  visualInnerRailWidthM: 0.011,
  visualInnerRailHeightM: 0.004,
  visualSideInsetM: 0.012,
  visualLockWidthM: 0.028,
  visualLockHeightM: 0.009,
  visualLockDepthM: 0.034,
  visualLockFrontInsetM: 0.018,
  minVisualLengthM: 0.18,
});
