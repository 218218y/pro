import { meters, metersToCentimeters } from './units.js';

export const BASE_PLATFORM_RENDER_POLICY = Object.freeze({
  heightM: meters(0.028),
  apronDepthM: meters(0.014),
  frontOverhangM: meters(0.02),
  sideOverhangM: meters(0.015),
  minWidthM: meters(0.2),
  minDepthM: meters(0.12),
  zFightLiftM: meters(0.001),
});

export const DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM = metersToCentimeters(
  BASE_PLATFORM_RENDER_POLICY.frontOverhangM
);
export const DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM = metersToCentimeters(
  BASE_PLATFORM_RENDER_POLICY.sideOverhangM
);
