import type { DrawerRunnerType } from '../../../types/index.js';

/**
 * Drawer runner selection is a cabinet-wide construction choice for drawers,
 * including external, shoe, and internal drawers.
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
  // Cabinet-fixed upper/lower lips extend 9 mm inward from the cabinet wall.
  // Tune this value to move both fixed lips farther toward / away from the drawer.
  visualFixedFlangeWidthM: 0.012,
  // Drawer-mounted lower lip extends 8 mm outward from the drawer side toward the wall.
  // Keep this independent from the fixed lips so the interlock can be tuned cleanly.
  visualMovingFlangeWidthM: 0.011,
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
 * internal drawer width. The 21 mm value below is the cabinet-side planning
 * envelope shown by Blum, not a claim that the real runner is a solid 21 mm bar.
 * The remaining values describe the simplified 3D silhouette and the minimum
 * visual nesting needed to represent the telescoping runner correctly.
 */
export const BLUM_TANDEM_DRAWER_RUNNER_POLICY = Object.freeze({
  drawerSideThicknessMinM: 0.011,
  drawerSideThicknessMaxM: 0.016,
  internalDrawerWidthReductionM: 0.042,
  nominalLengthMinM: 0.25,
  nominalLengthMaxM: 0.6,
  drawerLengthFromNominalReductionM: 0.01,
  // Blum planning gives a 21 mm lateral space requirement at the cabinet side.
  // The simplified fixed visual occupies this envelope so its outer face can stay
  // anchored to the real cabinet mounting plane.
  cabinetRunnerEnvelopeWidthM: 0.021,
  // The simplified fixed body bridges the actual side gap and continues 11 mm
  // beneath the drawer. With the matching moving reach below, the fixed body
  // fully covers the moving member laterally instead of nesting only halfway.
  visualFixedUnderDrawerReachM: 0.011,
  // The cabinet-fixed member is rendered as an L-profile: the existing horizontal
  // rail extends inward while this wall web rises vertically against the cabinet side.
  // A 1.0 ratio makes the rise height equal to the actual horizontal rail width, so
  // wider real cabinet-to-drawer gaps automatically receive a proportionate wall mount.
  visualFixedWallRiseHeightToRailWidthRatio: 1.0,
  // Visual sheet thickness of the wall-mounted vertical web (3 mm).
  visualFixedWallWebThicknessM: 0.003,
  visualRailHeightM: 0.009,
  // The real TANDEM runner telescopes inside itself. In the simplified model the
  // moving member must reach beneath the drawer and remain nested inside the
  // fixed envelope in the closed position. These are visual, not machining, values.
  visualMovingUnderDrawerReachM: 0.011,
  visualMovingNestedOverlapM: 0.011,
  visualInnerRailHeightM: 0.004,
  visualLockWidthM: 0.028,
  visualLockHeightM: 0.009,
  visualLockDepthM: 0.034,
  visualLockFrontInsetM: 0.018,
  minVisualLengthM: 0.18,
});

/**
 * Internal drawer cassettes need a small physical gap around concealed Blum
 * hardware. The visual locking device is the lowest runner component, so this
 * policy derives the required lift from the same dimensions used by the runner
 * renderer instead of duplicating a magic offset in layout code.
 */
export const INTERNAL_DRAWER_RUNNER_CLEARANCE_POLICY = Object.freeze({
  minimumHardwareGapM: 0.0015,
});

export function resolveDrawerRunnerUnderDrawerDepthM(value: unknown): number {
  if (normalizeDrawerRunnerType(value) !== 'blum') return 0;
  return (
    BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualRailHeightM / 2 +
    BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualLockHeightM
  );
}

export function resolveInternalDrawerBottomLiftM(value: unknown, baselineLiftM = 0): number {
  const baseline = Number.isFinite(baselineLiftM) && baselineLiftM > 0 ? baselineLiftM : 0;
  const runnerUnderhang = resolveDrawerRunnerUnderDrawerDepthM(value);
  if (!(runnerUnderhang > 0)) return baseline;
  return Math.max(baseline, runnerUnderhang + INTERNAL_DRAWER_RUNNER_CLEARANCE_POLICY.minimumHardwareGapM);
}
