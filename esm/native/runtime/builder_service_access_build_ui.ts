import type { AppContainer, UiSnapshotLike, UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import { reportError } from './errors.js';
import { ensureBuilderService, getBuilderService } from './builder_service_access_shared.js';

export function getBuilderBuildUi(App: unknown): UiSnapshotLike | null {
  const builder = getBuilderService(App);
  const buildUi =
    builder && Object.prototype.hasOwnProperty.call(builder, 'buildUi') ? builder.buildUi : null;
  return asRecord<UiSnapshotLike>(buildUi) || null;
}

export function ensureBuilderBuildUi(
  App: AppContainer,
  label = 'runtime/builder_service_access.buildUi'
): UiSnapshotLike {
  const builder = ensureBuilderService(App, label);
  const current = asRecord<UiSnapshotLike>(builder.buildUi) || {};
  const raw = asRecord<UnknownRecord>(current.raw) || {};
  current.raw = raw;
  builder.buildUi = current;
  return current;
}

export function clearBuilderBuildUi(App: unknown): boolean {
  try {
    const builder = getBuilderService(App);
    if (!builder || !Object.prototype.hasOwnProperty.call(builder, 'buildUi')) return false;
    builder.buildUi = null;
    return true;
  } catch (error) {
    reportError(App, error, {
      where: 'native/runtime/builder_service_access',
      op: 'builder.buildUi.clear.ownerRejected',
      fatal: false,
    });
    return false;
  }
}
