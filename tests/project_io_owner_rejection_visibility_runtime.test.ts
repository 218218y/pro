import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDefaultProjectDataViaServiceOrThrow,
  exportProjectResultViaService,
  loadProjectDataResultViaService,
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

test('project io access returns explicit export failures and throws through strict default-data access', () => {
  const { App, reports } = createReportingProjectIoApp({
    exportCurrentProject() {
      throw new Error('installed export rejected');
    },
    buildDefaultProjectData() {
      throw new Error('installed default project rejected');
    },
  });

  assert.deepEqual(exportProjectResultViaService(App), {
    ok: false,
    reason: 'error',
    message: 'installed export rejected',
  });
  assert.throws(() => buildDefaultProjectDataViaServiceOrThrow(App), /installed default project rejected/);

  assert.equal(reports.length, 1);
  assertProjectIoReport(
    reports[0],
    /installed export rejected/,
    'projectIO.exportCurrentProject.resultOwnerRejected'
  );
});
