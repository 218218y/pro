// Canonical typed intermediate representation for the main carcass shell.
//
// The pure carcass builder emits this shape and the renderer consumes the same
// guards. Keep geometry validation here so board/back-panel structure is not
// re-discovered through loose records at render time.

export const CARCASS_SHELL_BOARD_PART_IDS = ['body_floor', 'body_ceil', 'body_left', 'body_right'] as const;

export type CarcassShellBoardPartId = (typeof CARCASS_SHELL_BOARD_PART_IDS)[number];
export type CarcassShellBoardRole = 'floor' | 'ceiling' | 'left-side' | 'right-side';

const BOARD_ROLE_PART_ID = {
  floor: 'body_floor',
  ceiling: 'body_ceil',
  'left-side': 'body_left',
  'right-side': 'body_right',
} as const satisfies Record<CarcassShellBoardRole, CarcassShellBoardPartId>;

export type CarcassBoardOp = {
  kind: 'board';
  role: CarcassShellBoardRole;
  partId: string;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
};

export type CarcassBackPanelOp = {
  kind: 'back_panel';
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
  partId?: string;
  material?: 'wood';
  __wpWoodBackPanel?: true;
};

export type CarcassShellPlan = {
  boards: CarcassBoardOp[];
  backPanel: CarcassBackPanelOp;
  backPanels: CarcassBackPanelOp[] | null;
};

export type CarcassShellIrViolation = {
  path: string;
  code:
    | 'not-object'
    | 'invalid-kind'
    | 'invalid-part-id'
    | 'invalid-board-role'
    | 'non-finite-number'
    | 'non-positive-number'
    | 'invalid-boards'
    | 'invalid-back-panels'
    | 'invalid-material'
    | 'invalid-wood-identity';
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function hasValidGeometry(record: ValueRecord): boolean {
  return (
    isPositiveNumber(record.width) &&
    isPositiveNumber(record.height) &&
    isPositiveNumber(record.depth) &&
    isFiniteNumber(record.x) &&
    isFiniteNumber(record.y) &&
    isFiniteNumber(record.z)
  );
}

function isBoardRole(value: unknown): value is CarcassShellBoardRole {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BOARD_ROLE_PART_ID, value);
}

function hasBoardRoleIdentity(record: ValueRecord): boolean {
  if (!isBoardRole(record.role) || !isNonEmptyString(record.partId)) return false;
  return record.partId.endsWith(BOARD_ROLE_PART_ID[record.role]);
}

export function isCarcassBoardOp(value: unknown): value is CarcassBoardOp {
  const record = asRecord(value);
  return !!(record && record.kind === 'board' && hasBoardRoleIdentity(record) && hasValidGeometry(record));
}

function hasValidWoodIdentity(record: ValueRecord): boolean {
  const woodMaterial = record.material === 'wood';
  const woodFlag = record.__wpWoodBackPanel === true;
  if (!woodMaterial && !woodFlag) {
    return typeof record.material === 'undefined' && typeof record.__wpWoodBackPanel === 'undefined';
  }
  return woodMaterial && woodFlag && isNonEmptyString(record.partId);
}

export function isCarcassBackPanelOp(value: unknown): value is CarcassBackPanelOp {
  const record = asRecord(value);
  return !!(
    record &&
    record.kind === 'back_panel' &&
    hasValidGeometry(record) &&
    (typeof record.partId === 'undefined' || isNonEmptyString(record.partId)) &&
    (typeof record.material === 'undefined' || record.material === 'wood') &&
    (typeof record.__wpWoodBackPanel === 'undefined' || record.__wpWoodBackPanel === true) &&
    hasValidWoodIdentity(record)
  );
}

export function isCarcassShellPlan(value: unknown): value is CarcassShellPlan {
  const record = asRecord(value);
  return !!(
    record &&
    Array.isArray(record.boards) &&
    record.boards.length > 0 &&
    record.boards.every(isCarcassBoardOp) &&
    isCarcassBackPanelOp(record.backPanel) &&
    (record.backPanels === null ||
      (Array.isArray(record.backPanels) && record.backPanels.every(isCarcassBackPanelOp)))
  );
}

function pushGeometryViolations(
  record: ValueRecord,
  path: string,
  violations: CarcassShellIrViolation[]
): void {
  for (const key of ['width', 'height', 'depth'] as const) {
    const value = record[key];
    if (!isFiniteNumber(value)) {
      violations.push({ path: `${path}.${key}`, code: 'non-finite-number' });
    } else if (value <= 0) {
      violations.push({ path: `${path}.${key}`, code: 'non-positive-number' });
    }
  }
  for (const key of ['x', 'y', 'z'] as const) {
    if (!isFiniteNumber(record[key])) {
      violations.push({ path: `${path}.${key}`, code: 'non-finite-number' });
    }
  }
}

function collectBoardViolations(value: unknown, path: string, violations: CarcassShellIrViolation[]): void {
  const record = asRecord(value);
  if (!record) {
    violations.push({ path, code: 'not-object' });
    return;
  }
  if (record.kind !== 'board') violations.push({ path: `${path}.kind`, code: 'invalid-kind' });
  if (!isBoardRole(record.role)) {
    violations.push({ path: `${path}.role`, code: 'invalid-board-role' });
  }
  if (
    !isNonEmptyString(record.partId) ||
    (isBoardRole(record.role) && !record.partId.endsWith(BOARD_ROLE_PART_ID[record.role]))
  ) {
    violations.push({ path: `${path}.partId`, code: 'invalid-part-id' });
  }
  pushGeometryViolations(record, path, violations);
}

function collectBackPanelViolations(
  value: unknown,
  path: string,
  violations: CarcassShellIrViolation[]
): void {
  const record = asRecord(value);
  if (!record) {
    violations.push({ path, code: 'not-object' });
    return;
  }
  if (record.kind !== 'back_panel') violations.push({ path: `${path}.kind`, code: 'invalid-kind' });
  pushGeometryViolations(record, path, violations);
  if (typeof record.partId !== 'undefined' && !isNonEmptyString(record.partId)) {
    violations.push({ path: `${path}.partId`, code: 'invalid-part-id' });
  }
  if (typeof record.material !== 'undefined' && record.material !== 'wood') {
    violations.push({ path: `${path}.material`, code: 'invalid-material' });
  }
  if (!hasValidWoodIdentity(record)) {
    violations.push({ path, code: 'invalid-wood-identity' });
  }
}

export function collectCarcassShellIrViolations(value: unknown): CarcassShellIrViolation[] {
  const record = asRecord(value);
  if (!record) return [{ path: '', code: 'not-object' }];

  const violations: CarcassShellIrViolation[] = [];
  if (!Array.isArray(record.boards) || record.boards.length === 0) {
    violations.push({ path: 'boards', code: 'invalid-boards' });
  } else {
    record.boards.forEach((board, index) => collectBoardViolations(board, `boards[${index}]`, violations));
  }

  collectBackPanelViolations(record.backPanel, 'backPanel', violations);

  if (record.backPanels !== null && !Array.isArray(record.backPanels)) {
    violations.push({ path: 'backPanels', code: 'invalid-back-panels' });
  } else if (Array.isArray(record.backPanels)) {
    record.backPanels.forEach((panel, index) =>
      collectBackPanelViolations(panel, `backPanels[${index}]`, violations)
    );
  }
  return violations;
}
