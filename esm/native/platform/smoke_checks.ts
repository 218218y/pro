// Native ESM implementation of smoke checks.
//
// Goals:
// - Provide a real ESM module that can be imported.
// - Expose smoke-check helpers on the provided App instance, with no window/global alternate path.
// - Preserve behavior: auto-run waitAndRun() on import (when requested).

import type { SmokeRunOptsLike, UnknownRecord } from '../../../types';
import { isSmokeChecksInstalled, markSmokeChecksInstalled } from '../runtime/install_state_access.js';
import { hasSmokeParam, isSystemReady, runSmokeChecksCore, waitForReady } from './smoke_checks_core.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { runSmokeChecksScenario } from './smoke_checks_scenario.js';
import {
  createSmokeReport,
  ensureSmokeChecksSurface,
  ensureSmokeState,
  errMsg,
  isObjectRecord,
  reportNonFatal,
  reportSmoke,
  type SmokeAppRootLike,
  type SmokeInstallOptsLike,
} from './smoke_checks_shared.js';

const pendingWaitCancelBySmoke = new WeakMap<object, () => void>();
const SMOKE_RUN_CANONICAL_KEY = '__wpCanonicalSmokeRun';
const SMOKE_WAIT_AND_RUN_CANONICAL_KEY = '__wpCanonicalSmokeWaitAndRun';

type SmokeSurfaceWithCanonical = UnknownRecord & {
  run?: (opts?: SmokeRunOptsLike) => boolean;
  waitAndRun?: (opts?: SmokeRunOptsLike) => boolean;
};

function cancelPendingWait(smoke: object): void {
  const cancel = pendingWaitCancelBySmoke.get(smoke);
  if (!cancel) return;
  pendingWaitCancelBySmoke.delete(smoke);
  try {
    cancel();
  } catch (err) {
    reportNonFatal('install.wait.cancel', err);
  }
}

function setPendingWait(smoke: object, cancel: () => void): void {
  pendingWaitCancelBySmoke.set(smoke, cancel);
}

function readSmokeRoot(value: UnknownRecord): SmokeAppRootLike {
  return isObjectRecord(value) ? Object.assign(value, {}) : {};
}

export function installSmokeChecks(App: UnknownRecord, opts: SmokeInstallOptsLike = {}) {
  opts = opts || {};

  const root = readSmokeRoot(App);
  const smoke: SmokeSurfaceWithCanonical = ensureSmokeChecksSurface(root);
  ensureSmokeState(smoke);

  const canonicalRun = installStableSurfaceMethod(smoke, 'run', SMOKE_RUN_CANONICAL_KEY, () => {
    return function run(opts2: SmokeRunOptsLike = {}) {
      opts2 = opts2 || {};
      cancelPendingWait(smoke);
      const startedAt = Date.now();
      const rpt = createSmokeReport();

      try {
        rpt.ready = isSystemReady(root);
        runSmokeChecksCore(root, rpt);

        if (opts2.runScenario) {
          rpt.scenario = runSmokeChecksScenario(root) || [];
        }

        rpt.ok = true;
        try {
          console.log('[WardrobePro] smoke checks: OK');
        } catch (err) {
          reportNonFatal('install.run.log', err);
        }
      } catch (err) {
        rpt.ok = false;
        rpt.error = errMsg(err);
        reportSmoke(root, err, 'smokeChecks');

        try {
          const smokeState = ensureSmokeState(smoke);
          smokeState.failed = true;
          smokeState.error = rpt.error;
        } catch (stateErr) {
          reportNonFatal('install.run.failState', stateErr);
        }
      } finally {
        rpt.durationMs = Date.now() - startedAt;
        try {
          const smokeState = ensureSmokeState(smoke);
          smokeState.report = rpt;
          if (rpt.ok) {
            smokeState.failed = false;
            smokeState.error = '';
          }
        } catch (stateErr) {
          reportNonFatal('install.run.finalState', stateErr);
        }
      }

      return !!rpt.ok;
    };
  });

  const canonicalWaitAndRun = installStableSurfaceMethod(
    smoke,
    'waitAndRun',
    SMOKE_WAIT_AND_RUN_CANONICAL_KEY,
    () => {
      return function waitAndRun(opts2: SmokeRunOptsLike = {}) {
        opts2 = opts2 || {};
        const timeoutMs = Number(opts2.timeoutMs || 8000);
        const runScenarioFlag = !!opts2.runScenario;

        try {
          cancelPendingWait(smoke);
          if (!isSystemReady(root)) {
            const cancel = waitForReady(root, timeoutMs, (ready: boolean) => {
              try {
                if (pendingWaitCancelBySmoke.get(smoke) === cancel) {
                  pendingWaitCancelBySmoke.delete(smoke);
                }
                if (!ready) {
                  try {
                    console.warn(
                      '[WardrobePro] smoke: systemReady not reached in time; running checks anyway'
                    );
                  } catch (warnErr) {
                    reportNonFatal('install.wait.warn', warnErr);
                  }
                }
                try {
                  canonicalRun({ runScenario: runScenarioFlag });
                } catch (runErr) {
                  reportNonFatal('install.wait.run', runErr);
                }
              } catch (cbErr) {
                reportNonFatal('install.wait.callback', cbErr);
              }
            });
            setPendingWait(smoke, cancel);
            return true;
          }

          return canonicalRun({ runScenario: runScenarioFlag });
        } catch (err) {
          reportSmoke(root, err, 'smokeChecks.waitAndRun');
          return false;
        }
      };
    }
  );

  if (!isSmokeChecksInstalled(root)) markSmokeChecksInstalled(root);

  if (opts.autoRun !== false) {
    try {
      canonicalWaitAndRun({ timeoutMs: 10000, runScenario: hasSmokeParam(root) });
    } catch (err) {
      reportNonFatal('install.autoRun', err);
    }
  }

  return smoke;
}
