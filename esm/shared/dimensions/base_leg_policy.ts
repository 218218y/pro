import {
  BASE_PLATFORM_RENDER_POLICY,
  DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM,
  DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM,
} from './base_platform_render_policy.js';
import { centimeters, meters } from './units.js';

export const BASE_LEG_DIMENSIONS = Object.freeze({
  defaults: Object.freeze({
    style: 'tapered',
    color: 'black',
    heightCm: centimeters(12),
    widthCm: centimeters(3.5),
    taperedWidthCm: centimeters(4),
    wheelWidthCm: centimeters(5),
  }),
  limits: Object.freeze({
    heightMinCm: centimeters(1),
    heightMaxCm: centimeters(60),
    widthMinCm: centimeters(1),
    widthMaxCm: centimeters(30),
  }),
});

export const BASE_LEG_LAYOUT_POLICY = Object.freeze({
  cornerInsetM: meters(0.05),
  centerSupportDoorsThreshold: 5,
  chestCenterSupportWidthThresholdM: meters(1.2),
  connectorInsetM: meters(0.06),
  connectorBackInsetM: meters(0.01),
  depthSteppedMinFrontBackGapM: meters(0.03),
  platform: BASE_PLATFORM_RENDER_POLICY,
});

export { DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM, DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM };
