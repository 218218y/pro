// Explicit physical/display units for dimension-policy code.
// Existing numeric APIs remain available while consumers migrate incrementally.

declare const dimensionUnitBrand: unique symbol;

type BrandedDimension<Unit extends string> = number & {
  readonly [dimensionUnitBrand]: Unit;
};

export type Millimeters = BrandedDimension<'millimeters'>;
export type Centimeters = BrandedDimension<'centimeters'>;
export type Meters = BrandedDimension<'meters'>;
export type WorldUnits = BrandedDimension<'three-world-units'>;
export type Pixels = BrandedDimension<'pixels'>;

export const CM_PER_METER = 100;
export const MM_PER_METER = 1000;
export const MM_PER_CM = 10;

function finiteUnitValue(value: number, unit: string): number {
  if (!Number.isFinite(value)) throw new Error(`[WardrobePro] ${unit} must be a finite number`);
  return value;
}

export function millimeters(value: number): Millimeters {
  return finiteUnitValue(value, 'millimeters') as Millimeters;
}

export function centimeters(value: number): Centimeters {
  return finiteUnitValue(value, 'centimeters') as Centimeters;
}

export function meters(value: number): Meters {
  return finiteUnitValue(value, 'meters') as Meters;
}

export function worldUnits(value: number): WorldUnits {
  return finiteUnitValue(value, 'world units') as WorldUnits;
}

export function pixels(value: number): Pixels {
  return finiteUnitValue(value, 'pixels') as Pixels;
}

export function millimetersToCentimeters(value: Millimeters): Centimeters {
  return centimeters(value / MM_PER_CM);
}

export function centimetersToMillimeters(value: Centimeters): Millimeters {
  return millimeters(value * MM_PER_CM);
}

export function centimetersToMeters(value: Centimeters): Meters {
  return meters(value / CM_PER_METER);
}

export function metersToCentimeters(value: Meters): Centimeters {
  return centimeters(value * CM_PER_METER);
}

export function metersToWorldUnits(value: Meters): WorldUnits {
  return worldUnits(value);
}

export function worldUnitsToMeters(value: WorldUnits): Meters {
  return meters(value);
}

export function cmToM(valueCm: number): number {
  return valueCm / CM_PER_METER;
}

export function mToCm(valueM: number): number {
  return valueM * CM_PER_METER;
}

export function clampDimension(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
