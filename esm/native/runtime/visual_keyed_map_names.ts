export const VISUAL_KEYED_MAP_NAMES = [
  'doorStyleMap',
  'mirrorLayoutMap',
  'doorTrimMap',
  'groovesMap',
  'grooveLinesCountMap',
  'removedDoorsMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
] as const;

export type VisualKeyedMapName = (typeof VISUAL_KEYED_MAP_NAMES)[number];

const VISUAL_KEYED_MAP_NAME_SET = new Set<string>(VISUAL_KEYED_MAP_NAMES);

export function isVisualKeyedMapName(value: unknown): value is VisualKeyedMapName {
  return typeof value === 'string' && VISUAL_KEYED_MAP_NAME_SET.has(value);
}
