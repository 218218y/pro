import type { SmokeAppRootLike } from './smoke_checks_shared.js';
import type { TimeoutHandleLike } from '../../../types';
import type { SmokeReportLike } from '../../../types';
import { getCfg, getUi, getRuntime } from '../kernel/api.js';
import { assertStore, getBrowserTimers } from '../runtime/api.js';
import { getPlatformUtil } from '../runtime/platform_access.js';
import { getActions } from '../runtime/actions_access_core.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { isBuilderDepsReady } from '../runtime/builder_deps_access.js';
import { getBuilderBuildWardrobe, hasBuilderRequestBuild } from '../runtime/builder_service_access.js';
import {
  getDoorsActions,
  getModulesActions,
  hasDoorsAction,
  listModulesActionFns,
} from '../runtime/actions_access_domains.js';
import {
  asAppContainer,
  asObjectRecord,
  assertSmoke,
  errMsg,
  getDottedValue,
  getLocationSearchMaybe,
  isFn,
  readStoreStateSurface,
  smokeSoft,
} from './smoke_checks_shared.js';

export function hasSmokeParam(App: SmokeAppRootLike): boolean {
  try {
    const search = String(getLocationSearchMaybe(App) || '');
    return search.indexOf('smoke=1') >= 0;
  } catch (err) {
    smokeSoft(App, 'hasSmokeParam', err, 1500);
    return false;
  }
}

export function isSystemReady(App: SmokeAppRootLike): boolean {
  try {
    return !!readRuntimeScalarOrDefaultFromApp(asAppContainer(App), 'systemReady', false);
  } catch (err) {
    smokeSoft(App, 'isSystemReady', err, 1500);
    return false;
  }
}

export function waitForReady(
  App: SmokeAppRootLike,
  timeoutMs: number,
  cb: (ready: boolean) => void
): () => void {
  const start = Date.now();
  const timers = getBrowserTimers(App);
  let handle: TimeoutHandleLike | null = null;
  let active = true;
  let done = false;

  const clearPending = (): void => {
    if (handle == null) return;
    try {
      timers.clearTimeout(handle);
    } catch {
      // ignore
    }
    handle = null;
  };

  const finish = (ready: boolean): void => {
    if (!active || done) return;
    done = true;
    active = false;
    clearPending();
    cb(ready);
  };

  const tick = (): void => {
    if (!active || done) return;
    const ready = isSystemReady(App);
    if (ready) {
      finish(true);
      return;
    }
    if (Date.now() - start >= timeoutMs) {
      finish(false);
      return;
    }
    handle = timers.setTimeout(() => {
      handle = null;
      tick();
    }, 50);
  };

  tick();

  return () => {
    if (!active || done) return;
    active = false;
    clearPending();
  };
}

export function runSmokeChecksCore(App: SmokeAppRootLike, report: SmokeReportLike): true {
  report.checks = report.checks || [];

  function ok(name: string): void {
    report.checks.push(name);
  }

  assertSmoke(!!App, 'App missing (platform not loaded?)');
  ok('App');

  assertSmoke(!!getPlatformUtil(App), 'platform util missing (platform util not attached)');
  ok('platform.util');

  let store = null;
  try {
    store = readStoreStateSurface(assertStore(asAppContainer(App), 'platform/smoke_checks_core.store'));
  } catch {
    store = null;
  }
  assertSmoke(!!store && isFn(store.getState), 'store.getState missing (store not loaded?)');
  ok('store.getState');

  assertSmoke(!!getActions(asAppContainer(App)), 'actions surface missing (domain/state API not loaded?)');
  ok('actions');

  let cfg: unknown = null;
  try {
    cfg = getCfg(asAppContainer(App));
  } catch (err) {
    smokeSoft(App, 'runCore.getCfg', err, 1200);
    cfg = null;
  }
  assertSmoke(cfg && typeof cfg === 'object', 'config missing/invalid (store not ready?)', {
    cfgType: typeof cfg,
  });
  ok('config.object');

  const cfgRecord = asObjectRecord(cfg) || {};
  const modulesConfiguration = getDottedValue(cfgRecord, 'modulesConfiguration');
  assertSmoke(Array.isArray(modulesConfiguration), 'config.modulesConfiguration must be an array', {
    foundType: typeof modulesConfiguration,
  });
  try {
    let badIdx = -1;
    for (let i = 0; i < modulesConfiguration.length; i++) {
      const moduleItem = modulesConfiguration[i];
      if (!moduleItem || typeof moduleItem !== 'object') {
        badIdx = i;
        break;
      }
    }
    assertSmoke(badIdx < 0, 'config.modulesConfiguration contains non-object entries', {
      badIndex: badIdx,
    });
  } catch (err) {
    smokeSoft(App, 'runCore.modulesConfiguration.scan', err, 1200);
  }
  ok('config.modulesConfiguration');

  const cornerConfiguration = getDottedValue(cfgRecord, 'cornerConfiguration');
  assertSmoke(
    cornerConfiguration && typeof cornerConfiguration === 'object',
    'config.cornerConfiguration must be an object',
    {
      foundType: typeof cornerConfiguration,
    }
  );
  ok('config.cornerConfiguration');

  try {
    const ui = getUi(asAppContainer(App));
    assertSmoke(ui && typeof ui === 'object', 'ui slice missing/invalid (store not ready?)', {
      uiType: typeof ui,
    });
    ok('ui.object');
  } catch (err) {
    assertSmoke(false, 'ui slice missing/invalid (store not ready?)', { error: errMsg(err) });
  }

  try {
    const runtime = getRuntime(asAppContainer(App));
    assertSmoke(runtime && typeof runtime === 'object', 'runtime slice missing/invalid (store not ready?)', {
      rtType: typeof runtime,
    });
    ok('runtime.object');
  } catch (err) {
    assertSmoke(false, 'runtime slice missing/invalid (store not ready?)', { error: errMsg(err) });
  }

  const doorsActions = getDoorsActions(asAppContainer(App));
  assertSmoke(
    !!doorsActions && hasDoorsAction(asAppContainer(App), 'setHinge'),
    'doors action surface missing (domain/state API not loaded?)'
  );
  ok('actions.doors.setHinge');

  const modulesActions = getModulesActions(asAppContainer(App));
  assertSmoke(!!modulesActions, 'modules action namespace missing (module domain not loaded?)');
  const modActionFns = (() => {
    try {
      return listModulesActionFns(asAppContainer(App));
    } catch (err) {
      smokeSoft(App, 'runCore.modules.keys', err, 1200);
      return [];
    }
  })();
  assertSmoke(
    modActionFns.length > 0,
    'modules action namespace has no callable actions (module domain not loaded?)',
    { keys: modulesActions ? Object.keys(modulesActions) : [] }
  );
  ok('actions.modules: ' + modActionFns.slice(0, 6).join(', ') + (modActionFns.length > 6 ? '…' : ''));

  assertSmoke(
    hasBuilderRequestBuild(asAppContainer(App)),
    'builder.requestBuild missing (builder not loaded?)'
  );
  ok('builder.requestBuild');

  assertSmoke(isBuilderDepsReady(App), 'builder deps ready flag missing/false (builder deps not exported?)');
  ok('builder.deps.ready');

  try {
    const bw = getBuilderBuildWardrobe(asAppContainer(App));
    if (isFn(bw)) {
      const src = typeof bw.toString === 'function' ? bw.toString() : '';
      assertSmoke(src.indexOf('new THREE') < 0, 'BuilderCore must be THREE-free (found "new THREE")');
      ok('builder.core.threeFree');
    }
  } catch (err) {
    assertSmoke(false, 'Failed to validate builder core source', { error: errMsg(err) });
  }

  return true;
}
