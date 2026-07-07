import type { ActionMetaLike, AppContainer } from '../../../../../types';

import { runPerfAction } from '../../../services/api.js';

function readActionMetaSource(meta: ActionMetaLike | undefined): string {
  const source = meta && typeof meta === 'object' ? meta.source : '';
  return typeof source === 'string' ? source : '';
}

export function readSavedColorPerfMetricPrefix(
  meta: ActionMetaLike | undefined,
  defaultPrefix = 'design.savedColor.mutation'
): string {
  const source = readActionMetaSource(meta);
  if (source.includes(':savedColors:add')) return 'design.savedColor.add';
  if (source.includes(':savedColors:delete')) return 'design.savedColor.delete';
  if (source.includes(':colorSwatches:reorder')) return 'design.savedColor.reorder';
  if (source.includes(':savedColors:toggleLock')) return 'design.savedColor.toggleLock';
  return defaultPrefix;
}

export function runSavedColorPerfStep<T>(app: AppContainer, metricName: string, run: () => T): T {
  return runPerfAction(app, metricName, run);
}
