import type { ConfigStateLike, UnknownRecord } from '../../../types/index.js';

function isConfigSnapshot(value: unknown): value is ConfigStateLike {
  return !!value && typeof value === 'object';
}

export function requireChestModeConfigSnapshot(
  value: unknown,
  owner = 'visuals_chest_mode'
): ConfigStateLike {
  if (!isConfigSnapshot(value)) {
    throw new TypeError(`[${owner}] cfgSnapshot is required`);
  }
  return value;
}

export function readChestModeCfgSnapshotFromOpts(opts: UnknownRecord | null | undefined): ConfigStateLike {
  return requireChestModeConfigSnapshot(opts?.cfgSnapshot, 'visuals_chest_mode.buildChestOnly');
}
