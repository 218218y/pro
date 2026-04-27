import { guardVoid } from '../native/runtime/api.js';

import { makeActiveElementIdReader } from '../native/adapters/browser/install.js';

import { setModelNormalizerViaService, setPresetModelsViaService } from '../native/services/api.js';
import { PRESET_MODELS, normalizeModelRecord } from '../native/data/install.js';

import { UI_MODULES_MAIN, UI_MODULES_LATE, resolveUiInstallOrder } from '../native/ui/install.js';

import type { AppContainer } from '../../types';
import type { UiModuleEntry } from '../native/ui/install.js';

export type BootInstaller = (app: AppContainer) => void | Promise<void>;

export type BootStep = {
  id: string;
  phase: string;
  run: BootInstaller;
};

type UnknownRecord = Record<string, unknown>;
export type BuilderDepsBag = UnknownRecord & { getActiveElementId?: () => string };
type RawBootInstaller = (app: AppContainer) => unknown;

const __presetModelsInstalled: WeakSet<object> | null = typeof WeakSet === 'function' ? new WeakSet() : null;

export function installPresetModels(app: AppContainer): boolean {
  if (!app || typeof app !== 'object') return false;
  const appObj = app;
  if (__presetModelsInstalled && __presetModelsInstalled.has(appObj)) return true;
  if (__presetModelsInstalled) __presetModelsInstalled.add(appObj);

  try {
    setModelNormalizerViaService(app, normalizeModelRecord);
    setPresetModelsViaService(app, PRESET_MODELS);
  } catch (_) {}

  return true;
}

export function isRecord(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

export function isThenable(x: unknown): x is PromiseLike<unknown> {
  if (!x) return false;
  const t = typeof x;
  if (t !== 'object' && t !== 'function') return false;
  try {
    return typeof Reflect.get(Object(x), 'then') === 'function';
  } catch {
    return false;
  }
}

export function wrapBootInstaller(value: RawBootInstaller): BootInstaller {
  return async (app: AppContainer): Promise<void> => {
    const result = value(app);
    if (isThenable(result)) await result;
  };
}

export function getBootInstallerMaybe(value: unknown): BootInstaller | null {
  if (typeof value !== 'function') return null;
  return wrapBootInstaller((app: AppContainer) => Reflect.apply(value, undefined, [app]));
}

export function requireBootInstaller(value: unknown, label: string): BootInstaller {
  const installer = getBootInstallerMaybe(value);
  if (installer) return installer;
  throw new Error(`[WardrobePro][ESM] Invalid boot installer for ${label}.`);
}

export function createBuilderDepsBag(): BuilderDepsBag {
  const bag: BuilderDepsBag = {};
  Object.setPrototypeOf(bag, null);
  return bag;
}

export function isBuilderDepsBag(value: unknown): value is BuilderDepsBag {
  return (
    isRecord(value) &&
    (typeof value.getActiveElementId === 'undefined' || typeof value.getActiveElementId === 'function')
  );
}

export function getErrorsInstall(service: unknown): (() => void) | null {
  if (!isRecord(service)) return null;
  const install = service.install;
  if (typeof install !== 'function') return null;
  return () => {
    Reflect.apply(install, service, []);
  };
}

export function createActiveElementIdReader(app: AppContainer): () => string {
  const raw = makeActiveElementIdReader(app);
  if (typeof raw !== 'function') return () => '';
  return () => {
    try {
      const value = raw();
      return typeof value === 'string' ? value : '';
    } catch {
      return '';
    }
  };
}

export async function runInstaller(installFn: unknown, app: AppContainer): Promise<void> {
  const installer = getBootInstallerMaybe(installFn);
  if (!installer) return;
  await installer(app);
}

export async function installUiModules(
  entries: UiModuleEntry[] | null | undefined,
  app: AppContainer
): Promise<void> {
  if (!entries || !Array.isArray(entries)) return;

  const ordered = resolveUiInstallOrder(entries);
  for (let i = 0; i < ordered.length; i++) {
    const e = ordered[i];
    if (!e || typeof e.importer !== 'function') continue;

    const mod = await e.importer();
    const rec = isRecord(mod) ? mod : null;
    const exportName = typeof e.installExport === 'string' ? e.installExport : '';
    if (!exportName) {
      throw new Error(
        `[WardrobePro][ESM] UI module "${e?.id ?? '(unknown)'}" is missing required installExport in ui_manifest.`
      );
    }

    const install = getBootInstallerMaybe(rec ? rec[exportName] : null);
    if (!install) {
      throw new Error(
        `[WardrobePro][ESM] UI module "${e?.id ?? '(unknown)'}" (${e?.file ?? 'unknown file'}) ` +
          `does not export installer "${exportName}".`
      );
    }

    await runInstaller(install, app);
  }
}

export function assertCanonicalKernelActions(app: AppContainer): void {
  const actions = app.actions;
  if (!actions || typeof actions !== 'object') {
    throw new Error(
      '[WardrobePro][ESM] kernel.stateApi did not install App.actions before dependent kernel steps.'
    );
  }

  const requireFn = (nsName: string, fnName: string): void => {
    const ns = actions[nsName];
    if (!isRecord(ns) || typeof ns[fnName] !== 'function') {
      throw new Error(
        `[WardrobePro][ESM] Missing canonical kernel action ${nsName}.${fnName} after kernel.stateApi.`
      );
    }
  };

  requireFn('ui', 'patch');
  requireFn('runtime', 'patch');
  requireFn('config', 'patch');
  requireFn('mode', 'set');
  requireFn('modules', 'patchForStack');
}

export function installActiveElementIdReaderStep(app: AppContainer): void {
  guardVoid(
    app,
    { where: 'boot/boot_manifest', op: 'adapters.browser.activeElementIdReader', failFast: true },
    () => {
      const builderRaw = app.deps['builder'];
      const builder = isBuilderDepsBag(builderRaw) ? builderRaw : createBuilderDepsBag();
      builder.getActiveElementId = createActiveElementIdReader(app);
      app.deps['builder'] = builder;
    }
  );
}

export function installErrorsStep(app: AppContainer): void {
  guardVoid(app, { where: 'boot/boot_manifest', op: 'ui.errorsInstall', failFast: true }, () => {
    const errors = app.services.errors;
    if (!errors || typeof errors !== 'object') return;
    const install = getErrorsInstall(errors);
    if (install) install();
  });
}

export function installUiMainModulesStep(app: AppContainer): Promise<void> {
  return installUiModules(UI_MODULES_MAIN, app);
}

export function installUiLateModulesStep(app: AppContainer): Promise<void> {
  return installUiModules(UI_MODULES_LATE, app);
}
