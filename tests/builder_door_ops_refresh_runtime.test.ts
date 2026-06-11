import test from 'node:test';
import assert from 'node:assert/strict';

import {
  refreshBuilderAfterDoorOps,
  refreshBuilderHandles,
} from '../esm/native/runtime/builder_service_access.ts';

test('builder door-ops refresh runtime: canonical handles follow-through uses services.builder and platform render only', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
            calls.push(['handles', opts ?? null]);
          },
          purgeHandlesForRemovedDoors(forceEnabled?: boolean) {
            calls.push(['purge', !!forceEnabled]);
          },
        },
      },
    },
    builder: {
      handles: {
        applyHandles(opts?: { triggerRender?: boolean }) {
          calls.push(['legacy-handles', opts ?? null]);
        },
        purgeHandlesForRemovedDoors(forceEnabled?: boolean) {
          calls.push(['legacy-purge', !!forceEnabled]);
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
    ['handles', { triggerRender: false }],
    ['purge', true],
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
    ['handles', { triggerRender: false }],
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
    ['handles', { triggerRender: false }],
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

  const result = refreshBuilderHandles(App, { purgeRemovedDoors: false, updateShadows: true });

  assert.deepEqual(result, {
    requestedBuild: false,
    appliedHandles: true,
    purgedRemovedDoors: false,
    triggeredRender: false,
    ensuredRenderLoop: true,
  });
  assert.deepEqual(calls, [['handles', { triggerRender: false }], 'ensureRenderLoop']);
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

  const result = refreshBuilderHandles(App, { purgeRemovedDoors: false, updateShadows: true });

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
