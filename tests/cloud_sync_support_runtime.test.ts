import test from 'node:test';
import assert from 'node:assert/strict';

import { captureSketchSnapshot, hashString32 } from '../esm/native/services/cloud_sync_support.ts';
import { withSuppressedConsole } from './_console_silence.ts';

test('cloud sync support: capture sketch falls back to raw capture only when projectIO export is not installed', async () => {
  const fallbackApp = {
    services: {
      project: {
        capture() {
          return { settings: { width: 120 } };
        },
      },
    },
  } as any;

  const fallbackSnap = captureSketchSnapshot(fallbackApp);
  assert.deepEqual(fallbackSnap, {
    data: { settings: { width: 120 } },
    jsonStr: '{"settings":{"width":120}}',
    hash: '26:-1366663366',
  });

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

test('cloud sync support: fallback capture canonicalizes snapshot order and preserves valid draft branches', () => {
  const circular: any = { keep: { html: '<p>kept</p>' } };
  circular.self = circular;

  const buildApp = (captureResult: Record<string, unknown>) =>
    ({
      services: {
        project: {
          capture() {
            return captureResult;
          },
        },
      },
      store: {
        getState() {
          return {
            ui: {
              orderPdfEditorDraft: {
                bad: circular,
                createdAt: new Date('2026-01-02T03:04:05.000Z'),
                pages: [{ html: '<p>page</p>', badLeaf: 7n }],
              },
              orderPdfEditorZoom: 1.25,
            },
          };
        },
      },
    }) as any;

  const first = captureSketchSnapshot(buildApp({ zebra: 1, alpha: { second: 2, first: 1 } }));
  const second = captureSketchSnapshot(buildApp({ alpha: { first: 1, second: 2 }, zebra: 1 }));

  assert.ok(first);
  assert.ok(second);
  assert.equal(first.jsonStr, second.jsonStr);
  assert.equal(first.hash, second.hash);
  assert.equal(first.hash, hashString32(first.jsonStr));
  assert.deepEqual(first.data, {
    alpha: { second: 2, first: 1 },
    zebra: 1,
    orderPdfEditorDraft: {
      bad: { keep: { html: '<p>kept</p>' } },
      createdAt: '2026-01-02T03:04:05.000Z',
      pages: [{ html: '<p>page</p>' }],
    },
    orderPdfEditorZoom: 1.25,
  });
  assert.equal(
    first.jsonStr,
    '{"alpha":{"first":1,"second":2},"orderPdfEditorDraft":{"bad":{"keep":{"html":"<p>kept</p>"}},"createdAt":"2026-01-02T03:04:05.000Z","pages":[{"html":"<p>page</p>"}]},"orderPdfEditorZoom":1.25,"zebra":1}'
  );
});
