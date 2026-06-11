import test from 'node:test';
import assert from 'node:assert/strict';

import { createProjectIoOrchestrator } from '../esm/native/io/project_io_orchestrator.ts';

test('project io export falls back to history snapshot and preserves pdf draft payloads from UI state', () => {
  const App = {
    actions: {},
    services: {
      projectIO: { runtime: {} },
      history: {
        system: {
          getCurrentSnapshot() {
            return JSON.stringify({ settings: { wardrobeType: 'hinged', width: 180 } });
          },
        },
      },
      platform: {
        util: {
          log() {},
        },
        reportError() {},
        triggerRender() {},
      },
    },
    store: {
      getState() {
        return {
          ui: {
            projectName: 'Live project',
            orderPdfEditorDraft: { pages: [{ id: 'p1', html: '<b>hello</b>' }] },
            orderPdfEditorZoom: 1.5,
          },
          config: {},
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
  } as any;

  const orchestrator = createProjectIoOrchestrator({
    App,
    showToast() {},
    openCustomConfirm() {},
    userAgent: 'node:test',
    schemaId: 'schema:test',
    schemaVersion: 123,
    reportNonFatal() {},
  });

  const exported = orchestrator.exportCurrentProject({ source: 'unit' });
  assert.ok(exported);
  assert.equal(exported?.defaultBaseName, 'Live project');
  assert.equal(exported?.projectName, 'Live project');
  assert.equal(exported?.projectData?.settings?.width, 180);
  assert.equal(exported?.projectData?.projectName, 'Live project');
  assert.deepEqual(exported?.projectData?.orderPdfEditorDraft, {
    pages: [{ id: 'p1', html: '<b>hello</b>' }],
  });
  assert.equal(exported?.projectData?.orderPdfEditorZoom, 1.5);
  assert.equal(exported?.projectData?.__version, 123);
  assert.deepEqual(exported?.meta, { source: 'unit' });
  assert.match(String(exported?.jsonStr || ''), /orderPdfEditorDraft/);
});

test('project io export sanitizes toxic pdf draft branches instead of aliasing the live UI payload', () => {
  const cyclic: Record<string, unknown> = { keep: { html: '<p>safe</p>' } };
  cyclic.self = cyclic;

  const liveDraft: Record<string, unknown> = {
    pages: [{ id: 'p1', html: '<b>hello</b>' }],
    toxicBigInt: 99n,
    toxicCycle: cyclic,
    meta: { createdAt: new Date('2026-01-02T03:04:05.000Z') },
  };

  const App = {
    actions: {},
    services: {
      projectIO: { runtime: {} },
      history: {
        system: {
          getCurrentSnapshot() {
            return JSON.stringify({ settings: { wardrobeType: 'hinged', width: 180 } });
          },
        },
      },
      platform: {
        util: {
          log() {},
        },
        reportError() {},
        triggerRender() {},
      },
    },
    store: {
      getState() {
        return {
          ui: {
            projectName: 'Live project',
            orderPdfEditorDraft: liveDraft,
            orderPdfEditorZoom: 1.25,
          },
          config: {},
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
  } as any;

  const reports: Array<[string, unknown]> = [];
  const orchestrator = createProjectIoOrchestrator({
    App,
    showToast() {},
    openCustomConfirm() {},
    userAgent: 'node:test',
    schemaId: 'schema:test',
    schemaVersion: 123,
    reportNonFatal(op, err) {
      reports.push([op, err]);
    },
  });

  const exported = orchestrator.exportCurrentProject({ source: 'unit' });
  assert.ok(exported);
  assert.notEqual(exported?.projectData?.orderPdfEditorDraft, liveDraft);
  assert.deepEqual(exported?.projectData?.orderPdfEditorDraft, {
    pages: [{ id: 'p1', html: '<b>hello</b>' }],
    toxicCycle: { keep: { html: '<p>safe</p>' } },
    meta: { createdAt: '2026-01-02T03:04:05.000Z' },
  });
  assert.match(String(exported?.jsonStr || ''), /orderPdfEditorDraft/);
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.[0], 'project.deepCloneJson');

  (liveDraft.meta as Record<string, unknown>).createdAt = 'mutated';
  assert.equal(
    (exported?.projectData?.orderPdfEditorDraft as any)?.meta?.createdAt,
    '2026-01-02T03:04:05.000Z'
  );
});
