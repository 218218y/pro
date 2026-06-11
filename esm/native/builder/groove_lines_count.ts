import {
  computeAutoGrooveLinesCount,
  DEFAULT_GROOVE_DENSITY,
  materializeActiveGrooveLinesCountMap,
  normalizeGrooveLinesCount,
  normalizeGrooveLinesCountMapEntry,
  PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY,
  readGrooveLinesCountForPart,
  readGrooveLinesCountOverride,
  readPendingGrooveLinesCountForPart,
  readPendingGrooveLinesCountMap,
  resolvePendingGrooveLinesCount,
} from '../runtime/groove_lines_access.js';

import type { AppContainer } from '../../../types';

export {
  computeAutoGrooveLinesCount,
  DEFAULT_GROOVE_DENSITY,
  materializeActiveGrooveLinesCountMap,
  normalizeGrooveLinesCount,
  normalizeGrooveLinesCountMapEntry,
  PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY,
  readGrooveLinesCountForPart,
  readGrooveLinesCountOverride,
  readPendingGrooveLinesCountForPart,
  readPendingGrooveLinesCountMap,
  resolvePendingGrooveLinesCount,
};

export function resolveGrooveLinesCount(
  App: AppContainer,
  targetWidthM: number,
  densityOverride?: number,
  partId?: string | null
): number {
  const partOverride = readGrooveLinesCountForPart(App, partId);
  if (partOverride !== null) return partOverride;

  const pendingPartOverride = readPendingGrooveLinesCountForPart(App, partId);
  if (pendingPartOverride !== null) return pendingPartOverride;

  return computeAutoGrooveLinesCount(targetWidthM, densityOverride);
}
