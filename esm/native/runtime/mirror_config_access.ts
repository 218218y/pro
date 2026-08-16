import type { AppContainer } from '../../../types';

import { readConfigBoolFromApp } from './config_selectors.js';
import {
  readRuntimeConfigBooleanFromApp,
  readRuntimeConfigNumberFromApp,
} from './runtime_config_selectors.js';

export type MirrorFrameConfig = Readonly<{
  baseIntervalMs: number;
  moveIntervalMs: number;
  idleFrameBudgetMs: number;
  moveFrameBudgetMs: number;
  reflectorEnabled: boolean;
  disableDuringMotion: boolean;
}>;

/**
 * Resolve mirror render policy inputs from their canonical owners.
 *
 * `MIRROR_REFLECTOR_ENABLED` is persistent product state. The timing/budget
 * knobs are runtime/boot tuning. Keeping this composition here prevents the
 * platform render loop from treating either config domain as a fallback for
 * the other.
 */
export function readMirrorFrameConfigFromApp(App: AppContainer): MirrorFrameConfig {
  const baseIntervalMs = readRuntimeConfigNumberFromApp(App, 'MIRROR_UPDATE_MS', 500);
  const moveIntervalRaw = readRuntimeConfigNumberFromApp(App, 'MIRROR_MOVE_UPDATE_MS', baseIntervalMs);
  const moveIntervalMs = Number.isFinite(moveIntervalRaw)
    ? Math.max(baseIntervalMs, moveIntervalRaw)
    : Math.max(baseIntervalMs, 250);

  const idleFrameBudgetMs = Math.max(4, readRuntimeConfigNumberFromApp(App, 'MIRROR_FRAME_BUDGET_MS', 16));
  const moveFrameBudgetMs = Math.max(
    4,
    readRuntimeConfigNumberFromApp(
      App,
      'MIRROR_MOVE_FRAME_BUDGET_MS',
      Math.max(4, Math.min(idleFrameBudgetMs, 10))
    )
  );

  return Object.freeze({
    baseIntervalMs,
    moveIntervalMs,
    idleFrameBudgetMs,
    moveFrameBudgetMs,
    reflectorEnabled: readConfigBoolFromApp(App, 'MIRROR_REFLECTOR_ENABLED', true),
    disableDuringMotion: readRuntimeConfigBooleanFromApp(App, 'MIRROR_DISABLE_DURING_MOTION', true),
  });
}

export function readMirrorPlanarUpdateLimitFromApp(App: AppContainer, motionActive: boolean): number {
  const raw = motionActive
    ? readRuntimeConfigNumberFromApp(App, 'MIRROR_REFLECTOR_MOVE_MAX_UPDATES_PER_FRAME', 8)
    : readRuntimeConfigNumberFromApp(App, 'MIRROR_REFLECTOR_MAX_UPDATES_PER_FRAME', 3);
  return Math.max(1, Math.floor(Number.isFinite(raw) ? raw : motionActive ? 8 : 3));
}
