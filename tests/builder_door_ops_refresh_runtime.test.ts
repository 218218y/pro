import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyBuilderHandles,
  purgeBuilderHandlesForRemovedDoors,
  refreshBuilderAfterDoorOps,
  refreshBuilderHandles,
} from '../esm/native/runtime/builder_service_access.ts';

const addOutlines = () => undefined;

test('builder door-ops refresh runtime: canonical handles follow-through uses services.builder and platform render only', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
            calls.push(['handles', opts ?? null]);
          },
          purgeHandlesForRemovedDoors(opts?: { removeDoorsEnabled?: boolean }) {
            calls.push(['purge', opts ?? null]);
          },
        },
      },
    },
    builder: {
      handles: {
        applyHandles(opts?: { triggerRender?: boolean }) {
          calls.push(['legacy-handles', opts ?? null]);
        },
        purgeHandlesForRemovedDoors(opts?: { removeDoorsEnabled?: boolean }) {
          calls.push(['legacy-purge', opts ?? null]);
        },
      },
    },
    platform: {
      triggerRender(updateShadows?: boolean) {
        calls.push(['platform-render', !!updateShadows]);
      },
    },
  };

  const result = refreshBuilderHandles(App, {
    cfgSnapshot: {},
    addOutlines,
    removeDoorsEnabled: true,
    purgeRemovedDoors: true,
    updateShadows: true,
  });

  assert.deepEqual(result, {
    requestedBuild: false,
    appliedHandles: true,
    purgedRemovedDoors: true,
    triggeredRender: true,
    ensuredRenderLoop: false,
  });
  assert.deepEqual(calls, [
    ['handles', { triggerRender: false, cfgSnapshot: {}, addOutlines, removeDoorsEnabled: true }],
    ['purge', { cfgSnapshot: {}, removeDoorsEnabled: true }],
    ['platform-render', true],
  ]);
});

test('builder door-ops refresh runtime: build request + handle follow-through stay canonical and preserve request meta', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: unknown) {
          calls.push(['requestBuild', uiOverride, meta]);
        },
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
            calls.push(['handles', opts ?? null]);
          },
        },
      },
    },
    platform: {
      triggerRender(updateShadows?: boolean) {
        calls.push(['platform-render', !!updateShadows]);
      },
    },
  };

  const result = refreshBuilderAfterDoorOps(App, {
    cfgSnapshot: {},
    addOutlines,
    removeDoorsEnabled: false,
    source: 'removeDoors:smart',
    immediate: true,
    force: false,
    purgeRemovedDoors: false,
    updateShadows: false,
  });

  assert.deepEqual(result, {
    requestedBuild: true,
    appliedHandles: true,
    purgedRemovedDoors: false,
    triggeredRender: true,
    ensuredRenderLoop: false,
  });
  assert.deepEqual(calls, [
    [
      'requestBuild',
      null,
      { source: 'removeDoors:smart', reason: 'removeDoors:smart', immediate: true, force: false },
    ],
    ['handles', { triggerRender: false, cfgSnapshot: {}, addOutlines, removeDoorsEnabled: false }],
    ['platform-render', false],
  ]);
});

test('builder door-ops refresh runtime: canonical immediate scheduler-owned builds suppress redundant render follow-through after handle refresh', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        __scheduler: { __esm_v1: true },
        requestBuild(uiOverride: unknown, meta: unknown) {
          calls.push(['requestBuild', uiOverride, meta]);
        },
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
            calls.push(['handles', opts ?? null]);
          },
        },
      },
      platform: {
        triggerRender(updateShadows?: boolean) {
          calls.push(['platform-render', !!updateShadows]);
        },
        ensureRenderLoop() {
          calls.push('ensureRenderLoop');
        },
      },
    },
  };

  const result = refreshBuilderAfterDoorOps(App, {
    cfgSnapshot: {},
    addOutlines,
    removeDoorsEnabled: false,
    source: 'removeDoors:owned-by-build',
    immediate: true,
    force: true,
    purgeRemovedDoors: false,
    updateShadows: true,
  });

  assert.deepEqual(result, {
    requestedBuild: true,
    appliedHandles: true,
    purgedRemovedDoors: false,
    triggeredRender: false,
    ensuredRenderLoop: false,
  });
  assert.deepEqual(calls, [
    [
      'requestBuild',
      null,
      {
        source: 'removeDoors:owned-by-build',
        reason: 'removeDoors:owned-by-build',
        immediate: true,
        force: true,
      },
    ],
    ['handles', { triggerRender: false, cfgSnapshot: {}, addOutlines, removeDoorsEnabled: false }],
  ]);
});

test('builder door-ops refresh runtime: missing triggerRender falls back to platform ensureRenderLoop', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
            calls.push(['handles', opts ?? null]);
          },
        },
      },
      platform: {
        ensureRenderLoop() {
          calls.push('ensureRenderLoop');
        },
      },
    },
  };

  const result = refreshBuilderHandles(App, {
    cfgSnapshot: {},
    addOutlines,
    removeDoorsEnabled: false,
    purgeRemovedDoors: false,
    updateShadows: true,
  });

  assert.deepEqual(result, {
    requestedBuild: false,
    appliedHandles: true,
    purgedRemovedDoors: false,
    triggeredRender: false,
    ensuredRenderLoop: true,
  });
  assert.deepEqual(calls, [
    ['handles', { triggerRender: false, cfgSnapshot: {}, addOutlines, removeDoorsEnabled: false }],
    'ensureRenderLoop',
  ]);
});

test('builder door-ops refresh runtime: no-op handle refresh suppresses render follow-through when no builder work ran', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      platform: {
        triggerRender(updateShadows?: boolean) {
          calls.push(['platform-render', !!updateShadows]);
        },
        ensureRenderLoop() {
          calls.push('ensureRenderLoop');
        },
      },
    },
  };

  const result = refreshBuilderHandles(App, {
    cfgSnapshot: {},
    addOutlines,
    removeDoorsEnabled: false,
    purgeRemovedDoors: false,
    updateShadows: true,
  });

  assert.deepEqual(result, {
    requestedBuild: false,
    appliedHandles: false,
    purgedRemovedDoors: false,
    triggeredRender: false,
    ensuredRenderLoop: false,
  });
  assert.deepEqual(calls, []);
});

test('builder door-ops refresh runtime: missing builder work does not render just because the door-op helper was called', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      platform: {
        triggerRender(updateShadows?: boolean) {
          calls.push(['platform-render', !!updateShadows]);
        },
        ensureRenderLoop() {
          calls.push('ensureRenderLoop');
        },
      },
    },
  };

  const result = refreshBuilderAfterDoorOps(App, {
    cfgSnapshot: {},
    addOutlines,
    removeDoorsEnabled: false,
    source: 'removeDoors:no-builder',
    immediate: true,
    force: true,
    purgeRemovedDoors: false,
    updateShadows: true,
  });

  assert.deepEqual(result, {
    requestedBuild: false,
    appliedHandles: false,
    purgedRemovedDoors: false,
    triggeredRender: false,
    ensuredRenderLoop: false,
  });
  assert.deepEqual(calls, []);
});

test('builder door-ops refresh runtime: structural refresh honors explicit request-build rejection and suppresses render follow-through', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: unknown) {
          calls.push(['requestBuild', uiOverride, meta]);
          return false;
        },
      },
      platform: {
        triggerRender(updateShadows?: boolean) {
          calls.push(['platform-render', !!updateShadows]);
        },
        ensureRenderLoop() {
          calls.push('ensureRenderLoop');
        },
      },
    },
  };

  const result = refreshBuilderAfterDoorOps(App, {
    cfgSnapshot: {},
    addOutlines,
    removeDoorsEnabled: false,
    source: 'removeDoors:builder-rejected',
    immediate: true,
    force: true,
    purgeRemovedDoors: false,
    updateShadows: true,
  });

  assert.deepEqual(result, {
    requestedBuild: false,
    appliedHandles: false,
    purgedRemovedDoors: false,
    triggeredRender: false,
    ensuredRenderLoop: false,
  });
  assert.deepEqual(calls, [
    [
      'requestBuild',
      null,
      {
        source: 'removeDoors:builder-rejected',
        reason: 'removeDoors:builder-rejected',
        immediate: true,
        force: true,
      },
    ],
  ]);
});

test('builder handles access rejects incomplete public snapshots before invoking or reporting an owner', () => {
  const calls: string[] = [];
  const App: any = {
    services: {
      errors: {
        report() {
          calls.push('report');
        },
      },
      builder: {
        handles: {
          applyHandles() {
            calls.push('apply');
          },
          purgeHandlesForRemovedDoors() {
            calls.push('purge');
          },
        },
      },
    },
  };

  assert.throws(
    () => refreshBuilderHandles(App, { addOutlines, removeDoorsEnabled: false } as any),
    /cfgSnapshot is required for handle refresh/
  );
  assert.throws(
    () => applyBuilderHandles(App, { cfgSnapshot: {}, removeDoorsEnabled: false } as any),
    /snapshot outline binding is required for handle apply/
  );
  assert.throws(
    () => purgeBuilderHandlesForRemovedDoors(App, { removeDoorsEnabled: true } as any),
    /cfgSnapshot is required for removed-door handle purge/
  );
  assert.deepEqual(calls, []);
});
