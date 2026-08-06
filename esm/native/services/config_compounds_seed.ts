import type { AppContainer, ConfigStateLike } from '../../../types';

import { getBootFlags } from '../runtime/internal_state.js';
import { getBrowserTimers } from '../runtime/api.js';

import {
  materializeTopModulesConfigurationFromUiConfig,
  readModulesConfigurationListFromConfigSnapshot,
} from '../features/modules_configuration/modules_config_api.js';
import {
  readCornerConfigurationFromConfigSnapshot,
  sanitizeCornerConfigurationSnapshot,
} from '../features/modules_configuration/corner_cells_api.js';

import {
  type ConfigCompoundsSeedOptions,
  defaultCornerConfiguration,
  getCfgNow,
  getCfgSnapshot,
  getConcreteCfgSnapshot,
  getUiSnapshot,
  readFiniteNumber,
  reportConfigCompoundsNonFatal,
  safeClone,
  seedIfMissing,
} from './config_compounds_shared.js';

const inflightSeedByApp = new WeakMap<AppContainer, Promise<boolean>>();

function hasSeededCompounds(snapshot: ConfigStateLike | null): boolean {
  return !!(
    snapshot &&
    Array.isArray(snapshot.modulesConfiguration) &&
    snapshot.cornerConfiguration &&
    typeof snapshot.cornerConfiguration === 'object' &&
    !Array.isArray(snapshot.cornerConfiguration)
  );
}

function markConfigCompoundsSeeded(App: AppContainer): boolean {
  try {
    const boot = getBootFlags(App);
    boot.configCompoundsSeeded = true;
    return true;
  } catch (error) {
    reportConfigCompoundsNonFatal(App, 'markSeeded', error);
    return false;
  }
}

function seedModulesConfiguration(
  App: AppContainer,
  cfgSnapshot: ConfigStateLike,
  cfgNow: ConfigStateLike
): boolean {
  try {
    const fallbackSnapshot = getCfgSnapshot(App);
    const mergedSnapshot =
      fallbackSnapshot && fallbackSnapshot !== cfgSnapshot ? fallbackSnapshot : cfgSnapshot;
    const modsSnap = readModulesConfigurationListFromConfigSnapshot(mergedSnapshot, 'modulesConfiguration');
    const modsNow = readModulesConfigurationListFromConfigSnapshot(cfgNow, 'modulesConfiguration');
    const uiSnapshot = getUiSnapshot(App);

    const base = Array.isArray(modsSnap) && modsSnap.length ? modsSnap : modsNow;
    const effectiveCfg = Object.assign({}, cfgNow || {}, mergedSnapshot || {}, {
      modulesConfiguration: base,
    });
    const nextModules = safeClone(
      App,
      materializeTopModulesConfigurationFromUiConfig(base, uiSnapshot || {}, effectiveCfg),
      [],
      'clone.modulesConfiguration'
    );
    return seedIfMissing(App, mergedSnapshot, 'modulesConfiguration', nextModules);
  } catch (error) {
    reportConfigCompoundsNonFatal(App, 'seed.modulesConfiguration', error);
    return false;
  }
}

function seedCornerConfiguration(
  App: AppContainer,
  cfgSnapshot: ConfigStateLike,
  cfgNow: ConfigStateLike
): boolean {
  try {
    const fallbackSnapshot = getCfgSnapshot(App);
    const mergedSnapshot =
      fallbackSnapshot && fallbackSnapshot !== cfgSnapshot ? fallbackSnapshot : cfgSnapshot;
    const ccSnap = readCornerConfigurationFromConfigSnapshot(mergedSnapshot);
    const fromSnapshot = ccSnap
      ? safeClone(App, ccSnap, defaultCornerConfiguration(), 'clone.cornerConfiguration.snapshot')
      : null;

    const ccNow = readCornerConfigurationFromConfigSnapshot(cfgNow);
    const fromNow = ccNow || null;

    const baseCorner = fromSnapshot || fromNow || defaultCornerConfiguration();
    const nextCorner = safeClone(
      App,
      sanitizeCornerConfigurationSnapshot(baseCorner),
      defaultCornerConfiguration(),
      'clone.cornerConfiguration.normalized'
    );

    return seedIfMissing(App, mergedSnapshot, 'cornerConfiguration', nextCorner);
  } catch (error) {
    reportConfigCompoundsNonFatal(App, 'seed.cornerConfiguration', error);
    return false;
  }
}

export function isConfigCompoundsSeeded(App: AppContainer): boolean {
  try {
    const boot = getBootFlags(App);
    return !!boot.configCompoundsSeeded;
  } catch (error) {
    reportConfigCompoundsNonFatal(App, 'readSeededFlag', error);
    return false;
  }
}

function createSeedAttemptPromise(
  App: AppContainer,
  maxAttempts: number,
  retryDelayMs: number
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    let attempts = 0;
    let timers: ReturnType<typeof getBrowserTimers>;
    try {
      timers = getBrowserTimers(App);
    } catch (error) {
      reportConfigCompoundsNonFatal(App, 'resolveTimers', error);
      resolve(false);
      return;
    }

    const finish = (result: boolean): void => resolve(result);

    const scheduleRetry = (): void => {
      if (attempts >= maxAttempts) {
        reportConfigCompoundsNonFatal(
          App,
          'seedAttemptsExhausted',
          new Error(`[config_compounds] seed did not converge after ${attempts} attempt(s)`)
        );
        finish(false);
        return;
      }

      try {
        timers.setTimeout(run, retryDelayMs);
      } catch (error) {
        reportConfigCompoundsNonFatal(App, 'scheduleRetry', error);
        finish(false);
      }
    };

    function run(): void {
      if (isConfigCompoundsSeeded(App)) {
        finish(true);
        return;
      }

      attempts += 1;
      const cfgSnapshot = getConcreteCfgSnapshot(App);
      const cfgNow = getCfgNow(App);

      if (!cfgSnapshot) {
        scheduleRetry();
        return;
      }

      const modulesOk = seedModulesConfiguration(App, cfgSnapshot, cfgNow);
      const cornerOk = seedCornerConfiguration(App, cfgSnapshot, cfgNow);
      const verifiedSnapshot = getConcreteCfgSnapshot(App);
      if (!modulesOk || !cornerOk || !hasSeededCompounds(verifiedSnapshot)) {
        if (modulesOk && cornerOk) {
          reportConfigCompoundsNonFatal(
            App,
            'verifySeededState',
            new Error('[config_compounds] compound writes completed without a concrete seeded snapshot')
          );
        }
        scheduleRetry();
        return;
      }

      if (!markConfigCompoundsSeeded(App)) {
        scheduleRetry();
        return;
      }

      finish(true);
    }

    run();
  });
}

export function seedConfigCompounds(App: AppContainer, opts?: ConfigCompoundsSeedOptions): Promise<boolean> {
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const maxAttempts = Math.max(1, readFiniteNumber(safeOpts.maxAttempts) ?? 20);
  const retryDelayMs = Math.max(0, readFiniteNumber(safeOpts.retryDelayMs) ?? 25);

  if (!App || typeof App !== 'object') return Promise.resolve(false);
  if (isConfigCompoundsSeeded(App)) return Promise.resolve(true);

  const inflight = inflightSeedByApp.get(App);
  if (inflight) return inflight;

  const created = createSeedAttemptPromise(App, maxAttempts, retryDelayMs);
  inflightSeedByApp.set(App, created);
  const clearInflight = (): void => {
    if (inflightSeedByApp.get(App) === created) inflightSeedByApp.delete(App);
  };
  void created.then(clearInflight, clearInflight);
  return created;
}
