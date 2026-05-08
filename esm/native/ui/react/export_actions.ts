// React UI export actions (lazy wrappers)
//
// Purpose:
// - Lazy-load export_canvas only when an export action is used.
// - Keep React call sites small and stable.
// - Call export_canvas named exports directly (no installer surface dependency).
// - Return canonical command results so UI owners do not need ad-hoc toast guesses.

import type { AppContainer, UnknownRecord } from '../../../../types';

import type { ExportUiActionKind, ExportUiActionResult } from '../export_action_contracts.js';
import { getExportActionFailureToast } from '../export_action_feedback.js';
import { beginAppActionFamilyFlight, type AppActionFamilyFlight } from '../action_family_singleflight.js';
import { buildPerfEntryOptionsFromActionResult, runPerfAction } from '../../services/api.js';

type ExportCanvasModuleLike = {
  takeSnapshot?: (app: AppContainer) => unknown;
  copyToClipboard?: (app: AppContainer) => unknown;
  exportDualImage?: (app: AppContainer) => unknown;
  exportRenderAndSketch?: (app: AppContainer) => unknown;
  autoZoomCamera?: (app: AppContainer) => unknown;
};

type ToastFn = (msg: string, kind?: string) => void;

type PromiseLikeValue = PromiseLike<unknown>;
type ExportAction = (app: AppContainer) => unknown;

type RunExportUiActionDeps = {
  app: AppContainer;
  kind: ExportUiActionKind;
  ensureModule?: () => Promise<ExportCanvasModuleLike>;
  reportError?: (scope: string, error: unknown) => void;
};

type CreateExportActionsDeps = Pick<RunExportUiActionDeps, 'ensureModule' | 'reportError'>;

function readErrorMessage(error: unknown): string {
  const rec = asRecord(error);
  if (rec && 'message' in rec) {
    const value = rec.message;
    if (typeof value === 'string') return value.trim();
  }
  if (typeof error === 'string') return error.trim();
  return '';
}

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function isExportAction(value: unknown): value is ExportAction {
  return typeof value === 'function';
}

function readExportAction<K extends keyof ExportCanvasModuleLike>(
  mod: UnknownRecord,
  key: K
): ExportCanvasModuleLike[K] | undefined {
  const value = Reflect.get(mod, key);
  if (!isExportAction(value)) return undefined;
  return (app: AppContainer) => Reflect.apply(value, undefined, [app]);
}

function isPromiseLikeValue(value: unknown): value is PromiseLikeValue {
  return !!value && (typeof value === 'object' || typeof value === 'function') && 'then' in value;
}

async function callExportAction(action: ExportAction | undefined, app: AppContainer): Promise<boolean> {
  if (!action) return false;
  const result = action(app);
  if (isPromiseLikeValue(result)) {
    await result;
  }
  return true;
}

function asExportCanvasModule(mod: unknown): ExportCanvasModuleLike {
  const rec = asRecord(mod) || Object.create(null);
  return {
    takeSnapshot: readExportAction(rec, 'takeSnapshot'),
    copyToClipboard: readExportAction(rec, 'copyToClipboard'),
    exportDualImage: readExportAction(rec, 'exportDualImage'),
    exportRenderAndSketch: readExportAction(rec, 'exportRenderAndSketch'),
    autoZoomCamera: readExportAction(rec, 'autoZoomCamera'),
  };
}

function hasAnyExportAction(mod: ExportCanvasModuleLike | null | undefined): boolean {
  return !!(
    mod &&
    (mod.takeSnapshot ||
      mod.copyToClipboard ||
      mod.exportDualImage ||
      mod.exportRenderAndSketch ||
      mod.autoZoomCamera)
  );
}

function pickExportAction(mod: ExportCanvasModuleLike, kind: ExportUiActionKind): ExportAction | undefined {
  switch (kind) {
    case 'snapshot':
      return mod.takeSnapshot;
    case 'copy':
      return mod.copyToClipboard;
    case 'dual':
      return mod.exportDualImage;
    case 'render-sketch':
      return mod.exportRenderAndSketch;
    case 'auto-zoom':
      return mod.autoZoomCamera;
    default:
      return undefined;
  }
}

function resolveExportPerfMetricName(kind: ExportUiActionKind): string {
  switch (kind) {
    case 'snapshot':
      return 'export.snapshot';
    case 'copy':
      return 'export.copy';
    case 'dual':
      return 'export.dual';
    case 'render-sketch':
      return 'export.renderSketch';
    case 'auto-zoom':
      return 'export.autoZoom';
    default:
      return 'export.unknown';
  }
}

const exportActionFlights = new WeakMap<
  object,
  AppActionFamilyFlight<ExportUiActionResult, ExportUiActionKind>
>();

let exportCanvasModulePromise: Promise<ExportCanvasModuleLike> | null = null;

async function ensureExportModule(): Promise<ExportCanvasModuleLike> {
  try {
    if (!exportCanvasModulePromise) {
      exportCanvasModulePromise = import('../export_canvas.js')
        .then(mod => {
          const out = asExportCanvasModule(mod);
          if (!hasAnyExportAction(out)) {
            throw new Error('[WardrobePro] export_canvas named exports missing');
          }
          return out;
        })
        .catch(err => {
          exportCanvasModulePromise = null;
          throw err;
        });
    }
    return await exportCanvasModulePromise;
  } catch (e) {
    console.error('[WardrobePro] ensureExportModule lazy-load failed', e);
    throw e;
  }
}

export async function warmExportCanvasModule(): Promise<void> {
  await ensureExportModule();
}

export async function runExportUiActionWithDeps(args: RunExportUiActionDeps): Promise<ExportUiActionResult> {
  const { app, kind } = args;
  const ensureModuleImpl = typeof args.ensureModule === 'function' ? args.ensureModule : ensureExportModule;
  const reportError =
    typeof args.reportError === 'function'
      ? args.reportError
      : (scope: string, error: unknown) => {
          console.error(`[WardrobePro] ${scope}`, error);
        };

  return await runPerfAction(
    app,
    resolveExportPerfMetricName(kind),
    async () => {
      try {
        const mod = await ensureModuleImpl();
        const action = pickExportAction(mod, kind);
        if (!(await callExportAction(action, app))) {
          return { ok: false, kind, reason: 'not-installed' };
        }
        return { ok: true, kind };
      } catch (error) {
        reportError('export action failed', error);
        const message = readErrorMessage(error);
        return message ? { ok: false, kind, reason: 'error', message } : { ok: false, kind, reason: 'error' };
      }
    },
    {
      detail: { kind },
      resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
    }
  );
}

export function createExportActions(app: AppContainer, toast: ToastFn, deps?: CreateExportActionsDeps) {
  const run = async (kind: ExportUiActionKind): Promise<ExportUiActionResult> => {
    const flight = beginAppActionFamilyFlight({
      flights: exportActionFlights,
      app,
      key: kind,
      run: () =>
        runExportUiActionWithDeps({
          app,
          kind,
          ensureModule: deps?.ensureModule,
          reportError: deps?.reportError,
        }),
    });

    if (flight.status === 'reused') {
      return await flight.promise;
    }

    const result: ExportUiActionResult =
      flight.status === 'busy' ? { ok: false, kind, reason: 'busy' } : await flight.promise;
    const toastInfo = getExportActionFailureToast(result);
    if (toastInfo) toast(toastInfo.message, toastInfo.type);
    return result;
  };

  const exportTakeSnapshot = async (): Promise<ExportUiActionResult> => run('snapshot');
  const exportCopyToClipboard = async (): Promise<ExportUiActionResult> => run('copy');
  const exportDualImage = async (): Promise<ExportUiActionResult> => run('dual');
  const exportRenderAndSketch = async (): Promise<ExportUiActionResult> => run('render-sketch');
  const exportAutoZoomCamera = async (): Promise<ExportUiActionResult> => run('auto-zoom');

  return {
    exportTakeSnapshot,
    exportCopyToClipboard,
    exportDualImage,
    exportRenderAndSketch,
    exportAutoZoomCamera,
  };
}
