import test from 'node:test';
import assert from 'node:assert/strict';

import {
  _cloudSyncReportNonFatal,
  captureSketchSnapshot,
  computeCloudSketchSemanticHash,
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

test('cloud sync support: capture sketch uses a semantic design hash', () => {
  const projectData = {
    settings: { width: 120 },
    projectName: 'canonical',
    timestamp: 123,
    __createdAt: '2026-07-14T04:00:00.000Z',
  };
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
  assert.deepEqual(snapshot, {
    data: projectData,
    jsonStr,
    hash: computeCloudSketchSemanticHash(projectData),
  });
});

test('cloud sync support: semantic sketch hash ignores export metadata but detects design changes', () => {
  const first = {
    __schema: 'wardrobepro',
    __version: 3,
    __createdAt: '2026-07-14T04:00:00.000Z',
    __savedAt: 1,
    __scope: 'persist',
    __app: { buildTags: { commit: 'a' }, timeZone: 'Asia/Jerusalem' },
    projectName: 'first name',
    timestamp: 100,
    orderPdfEditorDraft: { pages: [1] },
    orderPdfEditorZoom: 1.5,
    settings: { width: 120, height: 240 },
    modulesConfiguration: [{ shelves: 3 }],
  };
  const sameDesign = {
    ...first,
    __createdAt: '2026-07-14T05:00:00.000Z',
    __savedAt: 999,
    __app: { buildTags: { commit: 'b' }, timeZone: 'UTC' },
    projectName: 'another name',
    timestamp: 200,
    orderPdfEditorDraft: null,
    orderPdfEditorZoom: 2,
  };
  const changedDesign = {
    ...sameDesign,
    settings: { width: 121, height: 240 },
  };

  assert.equal(computeCloudSketchSemanticHash(first), computeCloudSketchSemanticHash(sameDesign));
  assert.notEqual(computeCloudSketchSemanticHash(first), computeCloudSketchSemanticHash(changedDesign));
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
