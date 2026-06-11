import type { AppContainer, UnknownRecord } from '../../../types';
import { getUiRuntime } from './runtime/ui_runtime.js';
import { getWindowMaybe, reportErrorViaPlatform, runPlatformRenderFollowThrough } from '../services/api.js';

export type ViewportContainerLike = {
  clientWidth: number;
  clientHeight: number;
  appendChild: (node: unknown) => unknown;
  contains?: (node: unknown) => boolean;
};

export type ViewportSurfaceLike = {
  renderer: {
    domElement: HTMLElement;
  };
};

export type BootViewportContext = {
  container: ViewportContainerLike & HTMLElement;
  renderer: ViewportSurfaceLike['renderer'];
  windowRef: ReturnType<typeof getWindowMaybe>;
};

export type UiBootReporterLike = {
  soft: (op: string, err: unknown) => void;
  hard: (op: string, err: unknown) => void;
  toBootError: (op: string, message: string, cause?: unknown) => Error;
  throwHard: (op: string, message: string, cause?: unknown) => never;
};

type UiRuntimeLike = ReturnType<typeof getUiRuntime>;

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function isViewportContainerLike(v: unknown): v is ViewportContainerLike & HTMLElement {
  const rec = readRecord(v);
  return !!rec && typeof rec.appendChild === 'function';
}

export function installUiDisposerStrict(
  uiRt: UiRuntimeLike,
  key: string,
  installer: () => () => void,
  label: string
): () => void {
  const disposer = installer();
  if (typeof disposer !== 'function') {
    throw new Error(`[WardrobePro] ${label} installer must return a disposer function.`);
  }
  uiRt.setDisposer(key, disposer);
  return disposer;
}

export function reportUiBootPlatformError(
  App: AppContainer,
  reporter: UiBootReporterLike,
  op: string,
  err: Error
): void {
  try {
    reportErrorViaPlatform(App, err, op);
  } catch (reportErr) {
    reporter.soft(`${op}.reportError`, reportErr);
  }
}

export function createUiBootTriggerRender(App: AppContainer): (updateShadows?: boolean) => void {
  return (updateShadows?: boolean) => {
    runPlatformRenderFollowThrough(App, { updateShadows: !!updateShadows, ensureRenderLoop: false });
  };
}
