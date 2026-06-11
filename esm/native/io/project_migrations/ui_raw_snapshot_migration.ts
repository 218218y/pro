import type {
  UiRawInputsLike,
  UiRawScalarKey,
  UiRawScalarValueMap,
  UnknownRecord,
} from '../../../../types/index.js';
import { cloneUiRawInputs, UI_RAW_SCALAR_KEYS } from '../../../../types/ui_raw.js';

export type ProjectUiRawMigrationResult = {
  ui: UnknownRecord;
  raw: UiRawInputsLike;
  filledKeys: UiRawScalarKey[];
  normalizedKeys: UiRawScalarKey[];
};

type MutableUiSnapshotLike = UnknownRecord & { raw?: UnknownRecord | null };

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return undefined;
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return undefined;
}

function readNullableNumber(value: unknown): number | null | undefined {
  if (typeof value === 'undefined') return undefined;
  if (value === null) return null;
  return coerceFiniteNumber(value);
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

const projectUiRawMigrationReaders: {
  [K in UiRawScalarKey]: (value: unknown) => UiRawScalarValueMap[K] | undefined;
} = {
  width: readNullableNumber,
  height: readNullableNumber,
  depth: readNullableNumber,
  doors: readNullableNumber,
  chestDrawersCount: readNullableNumber,
  stackSplitLowerHeight: readNullableNumber,
  stackSplitLowerDepth: readNullableNumber,
  stackSplitLowerWidth: readNullableNumber,
  stackSplitLowerDoors: readNullableNumber,
  stackSplitLowerDepthManual: readBoolean,
  stackSplitLowerWidthManual: readBoolean,
  stackSplitLowerDoorsManual: readBoolean,
  cornerWidth: readNullableNumber,
  cornerHeight: readNullableNumber,
  cornerDepth: readNullableNumber,
  cornerDoors: readNullableNumber,
  cellDimsWidth: readNullableNumber,
  cellDimsHeight: readNullableNumber,
  cellDimsDepth: readNullableNumber,
};

function readMigrationScalar<K extends UiRawScalarKey>(
  key: K,
  value: unknown
): UiRawScalarValueMap[K] | undefined {
  return projectUiRawMigrationReaders[key](value);
}

function writeMigrationScalar<K extends UiRawScalarKey>(
  raw: UiRawInputsLike,
  key: K,
  value: UiRawScalarValueMap[K]
): void {
  raw[key] = value;
}

function cloneUiSnapshot(ui: unknown): MutableUiSnapshotLike {
  return isRecord(ui) ? { ...ui } : {};
}

/**
 * Canonicalize a project-loaded UI snapshot so live runtime/build code can read `ui.raw` only.
 *
 * Project files from older saves may contain dimensions at `ui.width` / `ui.height` / etc.
 * That compatibility belongs here, at project ingress. Runtime selectors should not keep guessing
 * old persisted shapes on every build.
 */
export function migrateProjectUiSnapshotToCanonicalRaw(ui: unknown): ProjectUiRawMigrationResult {
  const source = cloneUiSnapshot(ui);
  const raw = cloneUiRawInputs(source.raw);
  const filledKeys: UiRawScalarKey[] = [];
  const normalizedKeys: UiRawScalarKey[] = [];

  for (const key of UI_RAW_SCALAR_KEYS) {
    if (hasOwn(raw, key) && typeof raw[key] !== 'undefined') {
      const previousRawValue = raw[key];
      const canonicalRawValue = readMigrationScalar(key, previousRawValue);
      if (typeof canonicalRawValue !== 'undefined') {
        writeMigrationScalar(raw, key, canonicalRawValue);
        if (!Object.is(previousRawValue, canonicalRawValue)) normalizedKeys.push(key);
        continue;
      }
      delete raw[key];
    }

    const migratedValue = readMigrationScalar(key, source[key]);
    if (typeof migratedValue === 'undefined') continue;
    writeMigrationScalar(raw, key, migratedValue);
    filledKeys.push(key);
  }

  return {
    ui: { ...source, raw },
    raw,
    filledKeys,
    normalizedKeys,
  };
}

export function buildCanonicalProjectUiSnapshot(ui: unknown): UnknownRecord {
  return migrateProjectUiSnapshotToCanonicalRaw(ui).ui;
}
