import test from 'node:test';
import assert from 'node:assert/strict';

import {
  _cloudSyncReportNonFatal,
  captureSketchSnapshot,
  hashString32,
} from '../esm/native/services/cloud_sync_support.ts';
import { withSuppressedConsole } from './_console_silence.ts';

test('cloud sync support: capture sketch requires the canonical ProjectIO export', async () => {
  let rawCaptureCalled = false;
  const missingProjectIoApp = {
    services: {
      project: {
        capture() {
          rawCaptureCalled = true;
          return { settings: { width: 120 } };
        },
      },
    },
  } as any;

  await withSuppressedConsole(async () => {
    assert.equal(captureSketchSnapshot(missingProjectIoApp), null);
  });
  assert.equal(rawCaptureCalled, false);

  const brokenExportApp = {
    services: {
      projectIO: {
        exportCurrentProject() {
          throw new Error('export broke hard');
        },
      },
      project: {
        capture() {
          return { settings: { width: 240 } };
        },
      },
    },
  } as any;

  await withSuppressedConsole(async () => {
    assert.equal(captureSketchSnapshot(brokenExportApp), null);
  });
});

test('cloud sync support: capture sketch uses the canonical ProjectIO payload and hash', () => {
  const projectData = { settings: { width: 120 }, projectName: 'canonical' };
  const jsonStr = JSON.stringify(projectData);
  const App = {
    services: {
      projectIO: {
        exportCurrentProject() {
          return { projectData, jsonStr };
        },
      },
    },
  } as any;

  const snapshot = captureSketchSnapshot(App);
  assert.deepEqual(snapshot, { data: projectData, jsonStr, hash: hashString32(jsonStr) });
});

test('cloud sync support reports non-fatal failures through canonical app diagnostics', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App = {
    services: {
      platform: {
        reportError(error: unknown, ctx: any) {
          reports.push({ error, ctx });
        },
      },
    },
  } as any;
  const error = new Error('network broke');

  _cloudSyncReportNonFatal(App, 'unit.recoverable', error, { throttleMs: 0, noConsole: true });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].error, error);
  assert.deepEqual(reports[0].ctx, {
    where: 'services/cloud_sync',
    op: 'unit.recoverable',
    nonFatal: true,
  });
});
