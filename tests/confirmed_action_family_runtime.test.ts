import test from 'node:test';
import assert from 'node:assert/strict';

import { runAppConfirmedActionFamilySingleFlight } from '../esm/native/ui/confirmed_action_family_runtime.ts';

test('runAppConfirmedActionFamilySingleFlight reuses duplicate confirms and blocks conflicting family requests', async () => {
  const flights = new WeakMap<
    object,
    { key: 'alpha' | 'beta'; promise: Promise<{ ok: boolean; kind: string }> }
  >();
  const confirms: Array<() => void> = [];
  const App = {
    services: {
      uiFeedback: {
        confirm(_title: string, _message: string, onYes?: (() => void) | null) {
          if (onYes) confirms.push(onYes);
        },
      },
    },
  } as any;

  let alphaRuns = 0;
  let betaRuns = 0;
  let duplicateReuseCount = 0;

  const firstAlpha = runAppConfirmedActionFamilySingleFlight({
    flights,
    app: App,
    key: 'alpha',
    title: 'Alpha',
    message: 'alpha?',
    onRequestError: message => ({ ok: false, kind: message }),
    onCancelled: () => ({ ok: false, kind: 'cancelled' }),
    onBusy: () => ({ ok: false, kind: 'busy' }),
    runConfirmed: async () => {
      alphaRuns += 1;
      return { ok: true, kind: 'alpha' };
    },
  });

  const duplicateAlpha = runAppConfirmedActionFamilySingleFlight({
    flights,
    app: App,
    key: 'alpha',
    title: 'Alpha',
    message: 'alpha?',
    onRequestError: message => ({ ok: false, kind: message }),
    onCancelled: () => ({ ok: false, kind: 'cancelled' }),
    onBusy: () => ({ ok: false, kind: 'busy' }),
    onReuse: () => {
      duplicateReuseCount += 1;
    },
    runConfirmed: async () => {
      alphaRuns += 1;
      return { ok: true, kind: 'alpha-duplicate-should-not-run' };
    },
  });

  const betaBusy = runAppConfirmedActionFamilySingleFlight({
    flights,
    app: App,
    key: 'beta',
    title: 'Beta',
    message: 'beta?',
    onRequestError: message => ({ ok: false, kind: message }),
    onCancelled: () => ({ ok: false, kind: 'cancelled' }),
    onBusy: () => ({ ok: false, kind: 'busy' }),
    runConfirmed: async () => {
      betaRuns += 1;
      return { ok: true, kind: 'beta' };
    },
  });

  await Promise.resolve();
  assert.equal(confirms.length, 1);
  assert.equal(duplicateReuseCount, 1);
  assert.deepEqual(await betaBusy, { ok: false, kind: 'busy' });

  confirms[0]();
  assert.deepEqual(await firstAlpha, { ok: true, kind: 'alpha' });
  assert.deepEqual(await duplicateAlpha, { ok: true, kind: 'alpha' });
  assert.equal(alphaRuns, 1);
  assert.equal(betaRuns, 0);
});
