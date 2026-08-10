// Canonical typed intermediate representation for main-carcass cornice geometry.
//
// The pure carcass builder emits this IR. Rendering code consumes the same
// discriminated union instead of re-discovering the segment shape through
// Record<string, unknown> readers.

export const CARCASS_CORNICE_MODES = [
  'wave_frame',
  'wave_frame_segmented',
  'profile_open_back',
  'profile_open_back_segmented',
] as const;

export type CarcassCorniceMode = (typeof CARCASS_CORNICE_MODES)[number];
export type CorniceMiterMode = 'outer_extend';

export type CorniceProfilePoint = {
  x: number;
  y: number;
};

type CorniceSegmentPlacement = {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  flipX?: boolean;
  partId?: string;
};

export type CorniceWaveFrontSegment = CorniceSegmentPlacement & {
  kind: 'cornice_wave_front';
  width: number;
  depth: number;
  heightMax: number;
  waveAmp: number;
  waveCycles: number;
};

export type CorniceWaveSideSegment = CorniceSegmentPlacement & {
  kind: 'cornice_wave_side';
  width: number;
  height: number;
  depth: number;
};

export type CorniceProfileSegment = CorniceSegmentPlacement & {
  kind: 'cornice_profile_seg';
  length: number;
  profile: CorniceProfilePoint[];
  rotationY: number;
  flipX: boolean;
  miterStartTrim?: number;
  miterEndTrim?: number;
  miterMode?: CorniceMiterMode;
};

export type CarcassCorniceSegment = CorniceWaveFrontSegment | CorniceWaveSideSegment | CorniceProfileSegment;

export type CarcassCornicePlan = {
  kind: 'cornice';
  mode: CarcassCorniceMode;
  partId: string;
  segments: CarcassCorniceSegment[];
};

export type CorniceIrViolation = {
  path: string;
  code:
    | 'not-object'
    | 'invalid-kind'
    | 'invalid-mode'
    | 'invalid-segments'
    | 'mode-segment-mismatch'
    | 'non-finite-number'
    | 'non-positive-number'
    | 'negative-number'
    | 'invalid-profile'
    | 'invalid-wave-cycles'
    | 'invalid-miter-mode'
    | 'invalid-part-id'
    | 'invalid-boolean';
};

type ValueRecord = Record<string, unknown>;

function asRecord(value: unknown): ValueRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as ValueRecord) : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return typeof value === 'undefined' || isFiniteNumber(value);
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return typeof value === 'undefined' || typeof value === 'boolean';
}

function isOptionalString(value: unknown): value is string | undefined {
  return typeof value === 'undefined' || typeof value === 'string';
}

function isProfilePoint(value: unknown): value is CorniceProfilePoint {
  const record = asRecord(value);
  return !!record && isFiniteNumber(record.x) && isFiniteNumber(record.y);
}

function isSegmentPlacement(record: ValueRecord): boolean {
  return (
    isFiniteNumber(record.x) &&
    isFiniteNumber(record.y) &&
    isFiniteNumber(record.z) &&
    isOptionalFiniteNumber(record.rotationY) &&
    isOptionalBoolean(record.flipX) &&
    isOptionalString(record.partId)
  );
}

export function isCarcassCorniceSegment(value: unknown): value is CarcassCorniceSegment {
  const record = asRecord(value);
  if (!record || !isSegmentPlacement(record)) return false;

  if (record.kind === 'cornice_wave_front') {
    return (
      isPositiveNumber(record.width) &&
      isPositiveNumber(record.depth) &&
      isPositiveNumber(record.heightMax) &&
      isNonNegativeNumber(record.waveAmp) &&
      isPositiveNumber(record.waveCycles) &&
      Number.isInteger(record.waveCycles)
    );
  }

  if (record.kind === 'cornice_wave_side') {
    return (
      isPositiveNumber(record.width) && isPositiveNumber(record.height) && isPositiveNumber(record.depth)
    );
  }

  if (record.kind === 'cornice_profile_seg') {
    return (
      isPositiveNumber(record.length) &&
      Array.isArray(record.profile) &&
      record.profile.length >= 2 &&
      record.profile.every(isProfilePoint) &&
      isFiniteNumber(record.rotationY) &&
      typeof record.flipX === 'boolean' &&
      (typeof record.miterStartTrim === 'undefined' || isNonNegativeNumber(record.miterStartTrim)) &&
      (typeof record.miterEndTrim === 'undefined' || isNonNegativeNumber(record.miterEndTrim)) &&
      (typeof record.miterMode === 'undefined' || record.miterMode === 'outer_extend')
    );
  }

  return false;
}

function segmentMatchesMode(mode: CarcassCorniceMode, segment: CarcassCorniceSegment): boolean {
  const waveMode = mode === 'wave_frame' || mode === 'wave_frame_segmented';
  const waveSegment = segment.kind === 'cornice_wave_front' || segment.kind === 'cornice_wave_side';
  return waveMode === waveSegment;
}

export function isCarcassCornicePlan(value: unknown): value is CarcassCornicePlan {
  const record = asRecord(value);
  if (
    !record ||
    record.kind !== 'cornice' ||
    typeof record.mode !== 'string' ||
    !(CARCASS_CORNICE_MODES as readonly string[]).includes(record.mode) ||
    typeof record.partId !== 'string' ||
    record.partId.length === 0 ||
    !Array.isArray(record.segments) ||
    !record.segments.every(isCarcassCorniceSegment)
  ) {
    return false;
  }
  const mode = record.mode as CarcassCorniceMode;
  return record.segments.every(segment => segmentMatchesMode(mode, segment));
}

function pushFiniteViolation(violations: CorniceIrViolation[], path: string, value: unknown): void {
  if (!isFiniteNumber(value)) violations.push({ path, code: 'non-finite-number' });
}

function pushNumberViolation(
  violations: CorniceIrViolation[],
  path: string,
  value: unknown,
  positive: boolean
): void {
  if (!isFiniteNumber(value)) {
    violations.push({ path, code: 'non-finite-number' });
    return;
  }
  if (positive ? value <= 0 : value < 0) {
    violations.push({ path, code: positive ? 'non-positive-number' : 'negative-number' });
  }
}

function collectSegmentViolations(
  segment: unknown,
  index: number,
  mode: CarcassCorniceMode | null,
  violations: CorniceIrViolation[]
): void {
  const path = `segments[${index}]`;
  const record = asRecord(segment);
  if (!record) {
    violations.push({ path, code: 'not-object' });
    return;
  }

  const kind = record.kind;
  if (kind !== 'cornice_wave_front' && kind !== 'cornice_wave_side' && kind !== 'cornice_profile_seg') {
    violations.push({ path: `${path}.kind`, code: 'invalid-kind' });
    return;
  }

  if (mode) {
    const waveMode = mode.startsWith('wave_');
    const waveSegment = kind === 'cornice_wave_front' || kind === 'cornice_wave_side';
    if (waveMode !== waveSegment) {
      violations.push({ path: `${path}.kind`, code: 'mode-segment-mismatch' });
    }
  }

  pushFiniteViolation(violations, `${path}.x`, record.x);
  pushFiniteViolation(violations, `${path}.y`, record.y);
  pushFiniteViolation(violations, `${path}.z`, record.z);
  if (typeof record.rotationY !== 'undefined') {
    pushFiniteViolation(violations, `${path}.rotationY`, record.rotationY);
  }
  if (typeof record.flipX !== 'undefined' && typeof record.flipX !== 'boolean') {
    violations.push({ path: `${path}.flipX`, code: 'invalid-boolean' });
  }
  if (typeof record.partId !== 'undefined' && typeof record.partId !== 'string') {
    violations.push({ path: `${path}.partId`, code: 'invalid-part-id' });
  }

  if (kind === 'cornice_wave_front') {
    pushNumberViolation(violations, `${path}.width`, record.width, true);
    pushNumberViolation(violations, `${path}.depth`, record.depth, true);
    pushNumberViolation(violations, `${path}.heightMax`, record.heightMax, true);
    pushNumberViolation(violations, `${path}.waveAmp`, record.waveAmp, false);
    if (!isPositiveNumber(record.waveCycles) || !Number.isInteger(record.waveCycles)) {
      violations.push({ path: `${path}.waveCycles`, code: 'invalid-wave-cycles' });
    }
    return;
  }

  if (kind === 'cornice_wave_side') {
    pushNumberViolation(violations, `${path}.width`, record.width, true);
    pushNumberViolation(violations, `${path}.height`, record.height, true);
    pushNumberViolation(violations, `${path}.depth`, record.depth, true);
    return;
  }

  pushNumberViolation(violations, `${path}.length`, record.length, true);
  if (!Array.isArray(record.profile) || record.profile.length < 2 || !record.profile.every(isProfilePoint)) {
    violations.push({ path: `${path}.profile`, code: 'invalid-profile' });
  }
  if (typeof record.miterStartTrim !== 'undefined') {
    pushNumberViolation(violations, `${path}.miterStartTrim`, record.miterStartTrim, false);
  }
  if (typeof record.miterEndTrim !== 'undefined') {
    pushNumberViolation(violations, `${path}.miterEndTrim`, record.miterEndTrim, false);
  }
  if (typeof record.miterMode !== 'undefined' && record.miterMode !== 'outer_extend') {
    violations.push({ path: `${path}.miterMode`, code: 'invalid-miter-mode' });
  }
}

export function collectCarcassCorniceIrViolations(value: unknown): CorniceIrViolation[] {
  const violations: CorniceIrViolation[] = [];
  const record = asRecord(value);
  if (!record) return [{ path: '', code: 'not-object' }];
  if (record.kind !== 'cornice') violations.push({ path: 'kind', code: 'invalid-kind' });
  if (typeof record.partId !== 'string' || record.partId.length === 0) {
    violations.push({ path: 'partId', code: 'invalid-part-id' });
  }

  const mode =
    typeof record.mode === 'string' && (CARCASS_CORNICE_MODES as readonly string[]).includes(record.mode)
      ? (record.mode as CarcassCorniceMode)
      : null;
  if (!mode) violations.push({ path: 'mode', code: 'invalid-mode' });

  if (!Array.isArray(record.segments)) {
    violations.push({ path: 'segments', code: 'invalid-segments' });
    return violations;
  }
  for (let index = 0; index < record.segments.length; index++) {
    collectSegmentViolations(record.segments[index], index, mode, violations);
  }
  return violations;
}
