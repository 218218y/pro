import type { ConfigStateLike, KnownMapName, MapsByName } from '../../../types/index.js';
import { buildDoorVisualLookupKeys, readDoorVisualMapValue } from '../features/door_visual_map_lookup.js';
import { normalizeKnownMapSnapshot } from '../runtime/maps_access.js';
import { asRecord } from '../runtime/record.js';

type CornerConfigMap = Record<string, unknown>;
type SnapshotReader = (key: string) => unknown;

const CORNER_CONFIG_MAP_NAMES = [
  'handlesMap',
  'hingeMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
  'drawerDividersMap',
  'groovesMap',
  'grooveLinesCountMap',
  'removedDoorsMap',
  'roundedFrameSideShelvesMap',
  'curtainMap',
  'individualColors',
  'doorSpecialMap',
  'doorStyleMap',
  'mirrorLayoutMap',
  'doorTrimMap',
] as const satisfies readonly KnownMapName[];

const CORNER_CONFIG_MAP_NAME_SET = new Set<string>(CORNER_CONFIG_MAP_NAMES);

function isCornerConfigMapName(value: string): value is (typeof CORNER_CONFIG_MAP_NAMES)[number] {
  return CORNER_CONFIG_MAP_NAME_SET.has(value);
}

function toConfigState(value: unknown): ConfigStateLike | null {
  return asRecord<ConfigStateLike>(value);
}

function readMapValue<K extends KnownMapName>(cfg: ConfigStateLike, name: K): MapsByName[K] {
  return normalizeKnownMapSnapshot(name, cfg[name]);
}

function readScopedSnapshotValue(reader: SnapshotReader, partId: string): unknown {
  const scoped = reader(partId);
  return typeof scoped !== 'undefined' ? scoped : undefined;
}

export function requireCornerConfigSnapshot(cfgSnapshot: unknown): ConfigStateLike {
  const cfg = toConfigState(cfgSnapshot);
  if (!cfg) throw new TypeError('[corner_config_readers] cfgSnapshot is required');
  return cfg;
}

export function readCornerConfigMap(cfgSnapshot: unknown, mapName: string): CornerConfigMap {
  const cfg = requireCornerConfigSnapshot(cfgSnapshot);
  const name = String(mapName || '');
  if (!isCornerConfigMapName(name)) return {};
  return readMapValue(cfg, name) as CornerConfigMap;
}

export function createCornerConfigMapReader(cfgSnapshot: unknown): (mapName: string) => CornerConfigMap {
  return (mapName: string) => readCornerConfigMap(cfgSnapshot, mapName);
}

export function createCornerGrooveReader(cfgSnapshot: unknown): SnapshotReader {
  const grooves = readCornerConfigMap(cfgSnapshot, 'groovesMap');
  return (partId: string) => {
    const baseId = String(partId || '');
    if (!baseId) return undefined;
    const keys = buildDoorVisualLookupKeys(baseId);
    for (let i = 0; i < keys.length; i += 1) {
      const prefixed = readScopedSnapshotValue(key => grooves[`groove_${key}`], keys[i]);
      if (typeof prefixed !== 'undefined') return prefixed;
      const raw = grooves[keys[i]];
      if (typeof raw !== 'undefined') return raw;
    }
    return undefined;
  };
}

export function createCornerCurtainReader(cfgSnapshot: unknown): SnapshotReader {
  const curtains = readCornerConfigMap(cfgSnapshot, 'curtainMap');
  return (partId: string) => {
    const baseId = String(partId || '');
    return baseId ? readDoorVisualMapValue(curtains, baseId) : undefined;
  };
}

export function isCornerMultiColorModeEnabled(cfgSnapshot: unknown): boolean {
  return requireCornerConfigSnapshot(cfgSnapshot).isMultiColorMode === true;
}
