import {
  centimeters,
  centimetersToMeters,
  meters,
  metersToCentimeters,
  type Centimeters,
  type Meters,
} from './units.js';

export const BASE_PLINTH_POLICY = Object.freeze({
  heightM: meters(0.08),
  heightMinCm: centimeters(1),
  heightMaxCm: centimeters(60),
  widthClearanceM: meters(0.04),
  fallbackWidthClearanceM: meters(0.02),
  depthClearanceM: meters(0.05),
  frontInsetM: meters(0.015),
  minSegmentWidthM: meters(0.05),
  minSegmentDepthM: meters(0.05),
  segmentWidthEpsilonM: meters(0.001),
  steppedMinSegmentDepthM: meters(0.02),
  steppedBackInsetM: meters(0.01),
  connectorShapeInsetM: meters(0.04),
  connectorMaxToeRatio: 0.35,
  connectorToeEndTrimMaxM: meters(0.03),
  connectorWallInsetM: meters(0.01),
  connectorTinyEpsilonM: meters(0.0005),
});

export function basePlinthCentimetersToMeters(value: number): Meters {
  return centimetersToMeters(centimeters(value));
}

export function basePlinthMetersToCentimeters(value: Meters): Centimeters {
  return metersToCentimeters(value);
}
