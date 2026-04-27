import type { ProjectSettingsLike, UiStateLike, UnknownRecord } from '../../../../types/index.js';

import {
  cloneCornerConfigurationListsSnapshot,
  cloneCornerConfigurationSnapshot,
} from '../modules_configuration/corner_cells_api.js';

export type ProjectConfigCornerCloneMode = 'auto' | 'full' | 'lists';

function isProjectConfigRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asProjectConfigRecord<T extends UnknownRecord = UnknownRecord>(
  value: unknown
): T | UnknownRecord {
  return isProjectConfigRecord(value) ? (value as T) : {};
}

export function normalizeWardrobeType(value: unknown): 'hinged' | 'sliding' {
  return value === 'sliding' ? 'sliding' : 'hinged';
}

function normalizeStructureString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readUiDoorsScalar(value: unknown): unknown {
  const uiRec = asProjectConfigRecord(value);
  const raw = asProjectConfigRecord(uiRec.raw);
  return Object.prototype.hasOwnProperty.call(raw, 'doors') ? raw.doors : uiRec.doors;
}

export function buildStructureUiSnapshotFromValues(ctx: {
  doors?: unknown;
  singleDoorPos?: unknown;
  structureSelection?: unknown;
}): UnknownRecord {
  const doors = ctx.doors;
  const singleDoorPos = normalizeStructureString(ctx.singleDoorPos);
  const structureSelect = normalizeStructureString(ctx.structureSelection);
  return {
    doors,
    singleDoorPos,
    structureSelect,
    raw: { doors, singleDoorPos, structureSelect },
  };
}

export function buildStructureCfgSnapshot(value: unknown): UnknownRecord {
  const cfg = asProjectConfigRecord(value);
  return { wardrobeType: normalizeWardrobeType(cfg.wardrobeType) };
}

export function buildStructureUiSnapshotFromSettings(
  settings: ProjectSettingsLike | UnknownRecord | null | undefined
): UnknownRecord {
  const src = asProjectConfigRecord(settings);
  return buildStructureUiSnapshotFromValues({
    doors: src.doors,
    singleDoorPos: src.singleDoorPos,
    structureSelection: src.structureSelection,
  });
}

export function buildStructureUiSnapshotFromUiState(
  ui: UiStateLike | UnknownRecord | null | undefined
): UnknownRecord {
  const uiRec = asProjectConfigRecord(ui);
  const raw = asProjectConfigRecord(uiRec.raw);
  return buildStructureUiSnapshotFromValues({
    doors: typeof uiRec.doors !== 'undefined' ? uiRec.doors : readUiDoorsScalar(uiRec),
    singleDoorPos: typeof uiRec.singleDoorPos === 'string' ? uiRec.singleDoorPos : raw.singleDoorPos,
    structureSelection:
      typeof uiRec.structureSelect === 'string' ? uiRec.structureSelect : raw.structureSelect,
  });
}

export function buildStructureUiSnapshotFromUiAndRaw(
  ui: UnknownRecord | null | undefined,
  raw: UnknownRecord | null | undefined
): UnknownRecord {
  const uiRec = asProjectConfigRecord(ui);
  const rawRec = asProjectConfigRecord(raw);
  return buildStructureUiSnapshotFromValues({
    doors: readUiDoorsScalar(uiRec),
    singleDoorPos: typeof uiRec.singleDoorPos === 'string' ? uiRec.singleDoorPos : rawRec.singleDoorPos,
    structureSelection:
      typeof uiRec.structureSelect === 'string' ? uiRec.structureSelect : rawRec.structureSelect,
  });
}

export function cloneCanonicalCornerConfiguration(
  value: unknown,
  mode: ProjectConfigCornerCloneMode = 'auto'
): UnknownRecord {
  const rawCorner = asProjectConfigRecord(value);
  if (mode === 'lists') return cloneCornerConfigurationListsSnapshot(rawCorner);
  if (mode === 'full') return cloneCornerConfigurationSnapshot(rawCorner);
  return Object.keys(rawCorner).length
    ? cloneCornerConfigurationSnapshot(rawCorner)
    : cloneCornerConfigurationListsSnapshot(rawCorner);
}
