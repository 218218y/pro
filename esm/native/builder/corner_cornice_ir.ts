// Canonical typed intermediate representation for all corner-cornice geometry.
//
// Both corner-wing and pentagon-connector planners emit this plan before any
// Three.js geometry is created. Renderers consume the same discriminated union
// so path/profile semantics are validated once instead of re-discovered from
// loose runtime records.

export const CORNER_CORNICE_PART_IDS = [
  'corner_cornice_front',
  'corner_cornice_side_left',
  'corner_cornice_side_right',
] as const;

export type CornerCornicePartId = (typeof CORNER_CORNICE_PART_IDS)[number];
export type CornerCorniceOwner = 'wing' | 'connector';
export type CornerCorniceMode = 'profile' | 'wave';
export type CornerCorniceMiterMode = 'inner_trim' | 'outer_extend';

export type CornerCornicePoint = { x: number; y: number };

type CornerCornicePlacement = {
  partId: CornerCornicePartId;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  flipX?: boolean;
};

export type CornerCorniceProfileOp = CornerCornicePlacement & {
  kind: 'corner_profile';
  length: number;
  profile: CornerCornicePoint[];
  miterStartTrim?: number;
  miterEndTrim?: number;
  miterMode?: CornerCorniceMiterMode;
  miterProfileBaseY?: number;
  miterBaseSealEpsilon?: number;
};

export type CornerCorniceWaveOp = CornerCornicePlacement & {
  kind: 'corner_wave';
  length: number;
  depth: number;
  heightMax: number;
  waveAmp: number;
  waveCycles: number;
  samples: number;
};

export type CornerCorniceBoxOp = CornerCornicePlacement & {
  kind: 'corner_box';
  width: number;
  height: number;
  depth: number;
};

export type CornerCorniceOp = CornerCorniceProfileOp | CornerCorniceWaveOp | CornerCorniceBoxOp;

export type CornerCornicePlan = {
  kind: 'corner_cornice';
  owner: CornerCorniceOwner;
  mode: CornerCorniceMode;
  operations: CornerCorniceOp[];
};

export type CornerCorniceIrViolation = {
  path: string;
  code:
    | 'not-object'
    | 'invalid-kind'
    | 'invalid-owner'
    | 'invalid-mode'
    | 'invalid-operations'
    | 'mode-operation-mismatch'
    | 'invalid-part-id'
    | 'invalid-profile'
    | 'invalid-miter-mode'
    | 'invalid-boolean'
    | 'non-finite-number'
    | 'non-positive-number'
    | 'negative-number'
    | 'invalid-wave-cycles'
    | 'invalid-sample-count';
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

function isPartId(value: unknown): value is CornerCornicePartId {
  return typeof value === 'string' && (CORNER_CORNICE_PART_IDS as readonly string[]).includes(value);
}

function isPoint(value: unknown): value is CornerCornicePoint {
  const record = asRecord(value);
  return !!record && isFiniteNumber(record.x) && isFiniteNumber(record.y);
}

function hasPlacement(record: ValueRecord): boolean {
  return (
    isPartId(record.partId) &&
    isFiniteNumber(record.x) &&
    isFiniteNumber(record.y) &&
    isFiniteNumber(record.z) &&
    isFiniteNumber(record.rotationY) &&
    (typeof record.flipX === 'undefined' || typeof record.flipX === 'boolean')
  );
}

export function isCornerCorniceOp(value: unknown): value is CornerCorniceOp {
  const record = asRecord(value);
  if (!record || !hasPlacement(record)) return false;

  if (record.kind === 'corner_profile') {
    return (
      isPositiveNumber(record.length) &&
      Array.isArray(record.profile) &&
      record.profile.length >= 3 &&
      record.profile.every(isPoint) &&
      (typeof record.miterStartTrim === 'undefined' || isNonNegativeNumber(record.miterStartTrim)) &&
      (typeof record.miterEndTrim === 'undefined' || isNonNegativeNumber(record.miterEndTrim)) &&
      (typeof record.miterMode === 'undefined' ||
        record.miterMode === 'inner_trim' ||
        record.miterMode === 'outer_extend') &&
      (typeof record.miterProfileBaseY === 'undefined' || isNonNegativeNumber(record.miterProfileBaseY)) &&
      (typeof record.miterBaseSealEpsilon === 'undefined' || isNonNegativeNumber(record.miterBaseSealEpsilon))
    );
  }

  if (record.kind === 'corner_wave') {
    return (
      isPositiveNumber(record.length) &&
      isPositiveNumber(record.depth) &&
      isPositiveNumber(record.heightMax) &&
      isNonNegativeNumber(record.waveAmp) &&
      isPositiveNumber(record.waveCycles) &&
      Number.isInteger(record.waveCycles) &&
      isPositiveNumber(record.samples) &&
      Number.isInteger(record.samples)
    );
  }

  if (record.kind === 'corner_box') {
    return (
      isPositiveNumber(record.width) && isPositiveNumber(record.height) && isPositiveNumber(record.depth)
    );
  }

  return false;
}

function operationMatchesMode(mode: CornerCorniceMode, op: CornerCorniceOp): boolean {
  return mode === 'profile'
    ? op.kind === 'corner_profile'
    : op.kind === 'corner_wave' || op.kind === 'corner_box';
}

export function isCornerCornicePlan(value: unknown): value is CornerCornicePlan {
  const record = asRecord(value);
  if (
    !record ||
    record.kind !== 'corner_cornice' ||
    (record.owner !== 'wing' && record.owner !== 'connector') ||
    (record.mode !== 'profile' && record.mode !== 'wave') ||
    !Array.isArray(record.operations) ||
    !record.operations.every(isCornerCorniceOp)
  ) {
    return false;
  }
  const mode = record.mode as CornerCorniceMode;
  return record.operations.every(operation => operationMatchesMode(mode, operation));
}

function pushFinite(violations: CornerCorniceIrViolation[], path: string, value: unknown): void {
  if (!isFiniteNumber(value)) violations.push({ path, code: 'non-finite-number' });
}

function pushNumber(
  violations: CornerCorniceIrViolation[],
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

function collectOpViolations(
  value: unknown,
  index: number,
  mode: CornerCorniceMode | null,
  violations: CornerCorniceIrViolation[]
): void {
  const path = `operations[${index}]`;
  const record = asRecord(value);
  if (!record) {
    violations.push({ path, code: 'not-object' });
    return;
  }
  const kind = record.kind;
  if (kind !== 'corner_profile' && kind !== 'corner_wave' && kind !== 'corner_box') {
    violations.push({ path: `${path}.kind`, code: 'invalid-kind' });
    return;
  }
  if (mode) {
    const profileOp = kind === 'corner_profile';
    if ((mode === 'profile') !== profileOp)
      violations.push({ path: `${path}.kind`, code: 'mode-operation-mismatch' });
  }
  if (!isPartId(record.partId)) violations.push({ path: `${path}.partId`, code: 'invalid-part-id' });
  for (const key of ['x', 'y', 'z', 'rotationY'] as const)
    pushFinite(violations, `${path}.${key}`, record[key]);
  if (typeof record.flipX !== 'undefined' && typeof record.flipX !== 'boolean') {
    violations.push({ path: `${path}.flipX`, code: 'invalid-boolean' });
  }

  if (kind === 'corner_profile') {
    pushNumber(violations, `${path}.length`, record.length, true);
    if (!Array.isArray(record.profile) || record.profile.length < 3 || !record.profile.every(isPoint)) {
      violations.push({ path: `${path}.profile`, code: 'invalid-profile' });
    }
    if (typeof record.miterStartTrim !== 'undefined')
      pushNumber(violations, `${path}.miterStartTrim`, record.miterStartTrim, false);
    if (typeof record.miterEndTrim !== 'undefined')
      pushNumber(violations, `${path}.miterEndTrim`, record.miterEndTrim, false);
    if (
      typeof record.miterMode !== 'undefined' &&
      record.miterMode !== 'inner_trim' &&
      record.miterMode !== 'outer_extend'
    ) {
      violations.push({ path: `${path}.miterMode`, code: 'invalid-miter-mode' });
    }
    if (typeof record.miterProfileBaseY !== 'undefined')
      pushNumber(violations, `${path}.miterProfileBaseY`, record.miterProfileBaseY, false);
    if (typeof record.miterBaseSealEpsilon !== 'undefined')
      pushNumber(violations, `${path}.miterBaseSealEpsilon`, record.miterBaseSealEpsilon, false);
    return;
  }

  if (kind === 'corner_wave') {
    pushNumber(violations, `${path}.length`, record.length, true);
    pushNumber(violations, `${path}.depth`, record.depth, true);
    pushNumber(violations, `${path}.heightMax`, record.heightMax, true);
    pushNumber(violations, `${path}.waveAmp`, record.waveAmp, false);
    if (!isPositiveNumber(record.waveCycles) || !Number.isInteger(record.waveCycles)) {
      violations.push({ path: `${path}.waveCycles`, code: 'invalid-wave-cycles' });
    }
    if (!isPositiveNumber(record.samples) || !Number.isInteger(record.samples)) {
      violations.push({ path: `${path}.samples`, code: 'invalid-sample-count' });
    }
    return;
  }

  pushNumber(violations, `${path}.width`, record.width, true);
  pushNumber(violations, `${path}.height`, record.height, true);
  pushNumber(violations, `${path}.depth`, record.depth, true);
}

export function collectCornerCorniceIrViolations(value: unknown): CornerCorniceIrViolation[] {
  const record = asRecord(value);
  if (!record) return [{ path: '', code: 'not-object' }];

  const violations: CornerCorniceIrViolation[] = [];
  if (record.kind !== 'corner_cornice') violations.push({ path: 'kind', code: 'invalid-kind' });
  if (record.owner !== 'wing' && record.owner !== 'connector')
    violations.push({ path: 'owner', code: 'invalid-owner' });
  const mode = record.mode === 'profile' || record.mode === 'wave' ? record.mode : null;
  if (!mode) violations.push({ path: 'mode', code: 'invalid-mode' });
  if (!Array.isArray(record.operations)) {
    violations.push({ path: 'operations', code: 'invalid-operations' });
    return violations;
  }
  record.operations.forEach((operation, index) => collectOpViolations(operation, index, mode, violations));
  return violations;
}
