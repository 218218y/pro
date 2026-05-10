import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureModelsLoadedViaService,
  exportUserModelsViaService,
  mergeImportedModelsViaService,
  setModelNormalizerViaService,
  setPresetModelsViaService,
} from '../esm/native/runtime/models_access.ts';

type Report = { error: unknown; ctx: any };

function createReportingModelsApp(models: Record<string, unknown>): { App: any; reports: Report[] } {
  const reports: Report[] = [];
  const App = {
    services: {
      models,
      platform: {
        reportError(error: unknown, ctx: unknown) {
          reports.push({ error, ctx });
        },
      },
    },
  } as any;
  return { App, reports };
}

function messageOf(error: unknown): string {
  return String((error as Error)?.message || error || '');
}

function assertModelsReport(report: Report, message: RegExp, op: string): void {
  assert.match(messageOf(report.error), message);
  assert.equal(report.ctx.where, 'native/runtime/models_access');
  assert.equal(report.ctx.op, op);
  assert.equal(report.ctx.fatal, false);
}

test('models service access reports owner rejection for read/load seams while preserving local recovery', () => {
  const { App, reports } = createReportingModelsApp({
    ensureLoaded() {
      throw new Error('installed models load rejected');
    },
    exportUserModels() {
      throw new Error('installed models export rejected');
    },
    mergeImportedModels() {
      throw new Error('installed models merge rejected');
    },
  });

  assert.equal(ensureModelsLoadedViaService(App, { silent: true }), false);
  assert.deepEqual(exportUserModelsViaService(App), []);
  assert.deepEqual(mergeImportedModelsViaService(App, [{ id: 'm1', name: 'Model 1' }] as any), {
    added: 0,
    updated: 0,
  });

  assert.equal(reports.length, 3);
  assertModelsReport(reports[0], /installed models load rejected/, 'models.ensureLoaded.ownerRejected');
  assertModelsReport(reports[1], /installed models export rejected/, 'models.exportUserModels.ownerRejected');
  assertModelsReport(
    reports[2],
    /installed models merge rejected/,
    'models.mergeImportedModels.ownerRejected'
  );
});

test('models service access reports owner rejection for mutation seams while preserving false recovery', () => {
  const { App, reports } = createReportingModelsApp({
    setNormalizer() {
      throw new Error('installed normalizer rejected');
    },
    setPresets() {
      throw new Error('installed presets rejected');
    },
  });

  assert.equal(
    setModelNormalizerViaService(App, () => null),
    false
  );
  assert.equal(setPresetModelsViaService(App, [{ id: 'preset-a', name: 'Preset A' }] as any), false);

  assert.equal(reports.length, 2);
  assertModelsReport(reports[0], /installed normalizer rejected/, 'models.setNormalizer.ownerRejected');
  assertModelsReport(reports[1], /installed presets rejected/, 'models.setPresets.ownerRejected');
});
