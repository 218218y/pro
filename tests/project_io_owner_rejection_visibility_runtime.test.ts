import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDefaultProjectDataViaService,
  exportProjectViaService,
  handleProjectFileLoadResultViaService,
  loadProjectDataResultViaService,
  restoreProjectSessionViaService,
} from '../esm/native/runtime/project_io_access.ts';

type Report = { error: unknown; ctx: any };

function createReportingProjectIoApp(projectIO: Record<string, unknown>): { App: any; reports: Report[] } {
  const reports: Report[] = [];
  const App = {
    services: {
      projectIO,
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

function assertProjectIoReport(report: Report, message: RegExp, op: string): void {
  assert.match(messageOf(report.error), message);
  assert.equal(report.ctx.where, 'native/runtime/project_io_access');
  assert.equal(report.ctx.op, op);
  assert.equal(report.ctx.fatal, false);
}

test('project io access reports loadProjectData owner rejection while preserving error-result recovery', () => {
  const { App, reports } = createReportingProjectIoApp({
    loadProjectData() {
      throw new Error('installed project loader rejected');
    },
  });

  const result = loadProjectDataResultViaService(App, { settings: {} });

  assert.deepEqual(result, { ok: false, reason: 'error', message: 'installed project loader rejected' });
  assert.equal(reports.length, 1);
  assertProjectIoReport(
    reports[0],
    /installed project loader rejected/,
    'projectIO.loadProjectData.resultOwnerRejected'
  );
});

test('project io access reports handleFileLoad owner rejection while preserving async error-result recovery', async () => {
  const { App, reports } = createReportingProjectIoApp({
    async handleFileLoad() {
      throw new Error('installed file loader rejected');
    },
  });

  const result = await handleProjectFileLoadResultViaService(App, { name: 'demo.json' });

  assert.deepEqual(result, { ok: false, reason: 'error', message: 'installed file loader rejected' });
  assert.equal(reports.length, 1);
  assertProjectIoReport(
    reports[0],
    /installed file loader rejected/,
    'projectIO.handleFileLoad.resultOwnerRejected'
  );
});

test('project io access reports nullable recovery seams instead of swallowing owner rejection', () => {
  const { App, reports } = createReportingProjectIoApp({
    exportCurrentProject() {
      throw new Error('installed export rejected');
    },
    buildDefaultProjectData() {
      throw new Error('installed default project rejected');
    },
    restoreLastSession() {
      throw new Error('installed restore rejected');
    },
  });

  assert.equal(exportProjectViaService(App), undefined);
  assert.equal(buildDefaultProjectDataViaService(App), null);
  assert.equal(restoreProjectSessionViaService(App), undefined);

  assert.equal(reports.length, 3);
  assertProjectIoReport(
    reports[0],
    /installed export rejected/,
    'projectIO.exportCurrentProject.ownerRejected'
  );
  assertProjectIoReport(
    reports[1],
    /installed default project rejected/,
    'projectIO.buildDefaultProjectData.ownerRejected'
  );
  assertProjectIoReport(
    reports[2],
    /installed restore rejected/,
    'projectIO.restoreLastSession.ownerRejected'
  );
});
