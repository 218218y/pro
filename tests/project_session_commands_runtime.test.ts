import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resetProjectToDefaultWithConfirm,
  restoreProjectSessionWithConfirm,
} from '../esm/native/ui/project_session_commands.ts';

test('project session commands resolve final restore/reset results after confirm or cancel', async () => {
  const autosaveJson = JSON.stringify({ settings: {} });
  const loadCalls: Array<unknown> = [];
  let confirmCount = 0;

  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString(key: string) {
          return key === 'autosave-key' ? autosaveJson : null;
        },
      },
      uiFeedback: {
        confirm(_title: string, _message: string, onYes?: (() => void) | null) {
          confirmCount += 1;
          if (onYes) onYes();
        },
      },
      projectIO: {
        buildDefaultProjectData() {
          return { settings: {}, toggles: {}, modulesConfiguration: [] };
        },
        loadProjectData(data: unknown, opts?: Record<string, unknown>) {
          loadCalls.push({ data, opts });
          return { ok: true, restoreGen: 7 };
        },
      },
    },
  } as any;

  assert.deepEqual(await restoreProjectSessionWithConfirm(App), { ok: true, restoreGen: 7 });
  assert.deepEqual(await resetProjectToDefaultWithConfirm(App), { ok: true, restoreGen: 7 });
  assert.equal(confirmCount, 2);
  assert.equal(loadCalls.length, 2);
  assert.equal((loadCalls[0] as any).opts?.toast, false);
  assert.equal((loadCalls[0] as any).opts?.meta?.source, 'restore.local');
  assert.equal((loadCalls[1] as any).opts?.toast, false);
});

test('project session commands report cancel, invalid autosave, and missing installs cleanly', async () => {
  let cancelledLoadCalls = 0;
  const cancelledApp = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return JSON.stringify({ settings: {} });
        },
      },
      uiFeedback: {
        openCustomConfirm(
          _title: string,
          _message: string,
          _onYes?: (() => void) | null,
          onNo?: (() => void) | null
        ) {
          if (onNo) onNo();
        },
      },
      projectIO: {
        buildDefaultProjectData() {
          return { settings: {}, toggles: {}, modulesConfiguration: [] };
        },
        loadProjectData() {
          cancelledLoadCalls += 1;
          return { ok: true };
        },
      },
    },
  } as any;

  assert.deepEqual(await restoreProjectSessionWithConfirm(cancelledApp), { ok: false, reason: 'cancelled' });
  assert.equal(cancelledLoadCalls, 0);
  assert.deepEqual(await resetProjectToDefaultWithConfirm(cancelledApp), { ok: false, reason: 'cancelled' });

  const invalidApp = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return '{bad-json';
        },
      },
      uiFeedback: {
        confirm(_title: string, _message: string, onYes?: (() => void) | null) {
          if (onYes) onYes();
        },
      },
    },
  } as any;

  assert.deepEqual(await restoreProjectSessionWithConfirm(invalidApp), { ok: false, reason: 'invalid' });
  assert.deepEqual(await restoreProjectSessionWithConfirm({ services: {} } as any), {
    ok: false,
    reason: 'missing-autosave',
  });
  assert.deepEqual(
    await resetProjectToDefaultWithConfirm({
      services: {
        uiFeedback: {
          confirm(_title: string, _message: string, onYes?: (() => void) | null) {
            if (onYes) onYes();
          },
        },
      },
    } as any),
    { ok: false, reason: 'not-installed' }
  );
});

test('project session commands preserve real load/reset failures instead of flattening them', async () => {
  const restoreApp = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return JSON.stringify({ settings: {} });
        },
      },
      uiFeedback: {
        confirm(_title: string, _message: string, onYes?: (() => void) | null) {
          if (onYes) onYes();
        },
      },
      projectIO: {
        loadProjectData() {
          throw new Error('restore load exploded');
        },
      },
    },
  } as any;

  assert.deepEqual(await restoreProjectSessionWithConfirm(restoreApp), {
    ok: false,
    reason: 'error',
    message: 'restore load exploded',
  });
});

test('project session commands preserve confirm-surface failures instead of treating them as cancel', async () => {
  let loadCalls = 0;
  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return JSON.stringify({ settings: {} });
        },
      },
      uiFeedback: {
        confirm() {
          throw new Error('confirm exploded');
        },
      },
      projectIO: {
        buildDefaultProjectData() {
          return { settings: {}, toggles: {}, modulesConfiguration: [] };
        },
        loadProjectData() {
          loadCalls += 1;
          return { ok: true };
        },
      },
    },
  } as any;

  assert.deepEqual(await restoreProjectSessionWithConfirm(App), {
    ok: false,
    reason: 'error',
    message: 'confirm exploded',
  });
  assert.deepEqual(await resetProjectToDefaultWithConfirm(App), {
    ok: false,
    reason: 'error',
    message: 'confirm exploded',
  });
  assert.equal(loadCalls, 0);
});

test('project session commands normalize reset-internal reasons to canonical recovery results', async () => {
  const App = {
    services: {
      uiFeedback: {
        confirm(_title: string, _message: string, onYes?: (() => void) | null) {
          if (onYes) onYes();
        },
      },
      projectIO: {
        buildDefaultProjectData() {
          return { settings: {}, toggles: {}, modulesConfiguration: [] };
        },
        loadProjectData() {
          return { ok: false, reason: 'reset', message: 'default load exploded' };
        },
      },
    },
  } as any;

  assert.deepEqual(await resetProjectToDefaultWithConfirm(App), {
    ok: false,
    reason: 'error',
    message: 'default load exploded',
  });
});

test('project session commands single-flight duplicate restore requests and block conflicting reset while confirm is pending', async () => {
  let confirmCount = 0;
  let loadCalls = 0;
  const confirmYesCallbacks: Array<() => void> = [];

  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return JSON.stringify({ settings: {} });
        },
      },
      uiFeedback: {
        confirm(_title: string, _message: string, onYes?: (() => void) | null) {
          confirmCount += 1;
          if (onYes) confirmYesCallbacks.push(onYes);
        },
      },
      projectIO: {
        buildDefaultProjectData() {
          return { settings: {}, toggles: {}, modulesConfiguration: [] };
        },
        loadProjectData() {
          loadCalls += 1;
          return { ok: true, restoreGen: 11 };
        },
      },
    },
  } as any;

  const firstRestore = restoreProjectSessionWithConfirm(App);
  const secondRestore = restoreProjectSessionWithConfirm(App);
  const resetWhileRestorePending = resetProjectToDefaultWithConfirm(App);

  await Promise.resolve();
  assert.equal(confirmCount, 1);
  assert.equal(confirmYesCallbacks.length, 1);
  assert.equal(loadCalls, 0);
  assert.deepEqual(await resetWhileRestorePending, { ok: false, reason: 'busy' });

  confirmYesCallbacks[0]();
  assert.deepEqual(await firstRestore, { ok: true, restoreGen: 11 });
  assert.deepEqual(await secondRestore, { ok: true, restoreGen: 11 });
  assert.equal(confirmCount, 1);
  assert.equal(loadCalls, 1);
});

test('project session commands single-flight duplicate reset requests and report busy for conflicting restore while confirm is pending', async () => {
  let confirmCount = 0;
  let loadCalls = 0;
  const confirmYesCallbacks: Array<() => void> = [];

  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return JSON.stringify({ settings: {} });
        },
      },
      uiFeedback: {
        confirm(_title: string, _message: string, onYes?: (() => void) | null) {
          confirmCount += 1;
          if (onYes) confirmYesCallbacks.push(onYes);
        },
      },
      projectIO: {
        buildDefaultProjectData() {
          return { settings: {}, toggles: {}, modulesConfiguration: [] };
        },
        loadProjectData() {
          loadCalls += 1;
          return { ok: true, restoreGen: 12 };
        },
      },
    },
  } as any;

  const firstReset = resetProjectToDefaultWithConfirm(App);
  const secondReset = resetProjectToDefaultWithConfirm(App);
  const restoreWhileResetPending = restoreProjectSessionWithConfirm(App);

  await Promise.resolve();
  assert.equal(confirmCount, 1);
  assert.equal(confirmYesCallbacks.length, 1);
  assert.equal(loadCalls, 0);
  assert.deepEqual(await restoreWhileResetPending, { ok: false, reason: 'busy' });

  confirmYesCallbacks[0]();
  assert.deepEqual(await firstReset, { ok: true, restoreGen: 12 });
  assert.deepEqual(await secondReset, { ok: true, restoreGen: 12 });
  assert.equal(confirmCount, 1);
  assert.equal(loadCalls, 1);
});
