import type { AppContainer } from '../../../types';

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
  safeClone,
  seedIfMissing,
} from './config_compounds_shared.js';

const inflightSeedByApp = new WeakMap<AppContainer, Promise<boolean>>();

export function isConfigCompoundsSeeded(App: AppContainer): boolean {
  try {
    const boot = getBootFlags(App);
    return !!boot.configCompoundsSeeded;
  } catch {
    return false;
  }
}

export function seedConfigCompounds(App: AppContainer, opts?: ConfigCompoundsSeedOptions): Promise<boolean> {
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const maxAttempts = Math.max(1, readFiniteNumber(safeOpts.maxAttempts) ?? 20);
  const retryDelayMs = Math.max(0, readFiniteNumber(safeOpts.retryDelayMs) ?? 25);

  if (!App || typeof App !== 'object') return Promise.resolve(false);
  if (isConfigCompoundsSeeded(App)) return Promise.resolve(true);

  const inflight = inflightSeedByApp.get(App);
  if (inflight) return inflight;

  let promise: Promise<boolean> | null = null;
  const created = new Promise<boolean>(resolve => {
    let attempts = 0;
    const timers = getBrowserTimers(App);

    const finish = (result: boolean): void => {
      if (promise && inflightSeedByApp.get(App) === promise) inflightSeedByApp.delete(App);
      resolve(result);
    };

    const scheduleRetry = (): void => {
      if (attempts >= maxAttempts) {
        finish(false);
        return;
      }

      try {
        timers.setTimeout(run, retryDelayMs);
      } catch {
        finish(false);
      }
    };

    function run() {
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

      try {
        const fallbackSnapshot = getCfgSnapshot(App);
        const mergedSnapshot =
          fallbackSnapshot && fallbackSnapshot !== cfgSnapshot ? fallbackSnapshot : cfgSnapshot;
        const modsSnap = readModulesConfigurationListFromConfigSnapshot(
          mergedSnapshot,
          'modulesConfiguration'
        );
        const modsNow = readModulesConfigurationListFromConfigSnapshot(cfgNow, 'modulesConfiguration');
        const uiSnapshot = getUiSnapshot(App);

        const base = Array.isArray(modsSnap) && modsSnap.length ? modsSnap : modsNow;
        const effectiveCfg = Object.assign({}, cfgNow || {}, mergedSnapshot || {}, {
          modulesConfiguration: base,
        });
        const nextModules = safeClone(
          materializeTopModulesConfigurationFromUiConfig(base, uiSnapshot || {}, effectiveCfg),
          []
        );
        seedIfMissing(App, mergedSnapshot, 'modulesConfiguration', nextModules);
      } catch {
        // ignore
      }

      try {
        const fallbackSnapshot = getCfgSnapshot(App);
        const mergedSnapshot =
          fallbackSnapshot && fallbackSnapshot !== cfgSnapshot ? fallbackSnapshot : cfgSnapshot;
        const ccSnap = readCornerConfigurationFromConfigSnapshot(mergedSnapshot);
        const fromSnapshot = ccSnap ? safeClone(ccSnap, defaultCornerConfiguration()) : null;

        const ccNow = readCornerConfigurationFromConfigSnapshot(cfgNow);
        const fromNow = ccNow || null;

        const baseCorner = fromSnapshot || fromNow || defaultCornerConfiguration();
        const nextCorner = safeClone(
          sanitizeCornerConfigurationSnapshot(baseCorner),
          defaultCornerConfiguration()
        );

        seedIfMissing(App, mergedSnapshot, 'cornerConfiguration', nextCorner);
      } catch {
        // ignore
      }

      try {
        const boot = getBootFlags(App);
        boot.configCompoundsSeeded = true;
      } catch {
        // ignore
      }

      finish(true);
    }

    run();
  });

  promise = created;
  inflightSeedByApp.set(App, created);
  return created;
}
