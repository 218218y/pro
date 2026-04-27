import type { AppContainer, ClipboardItemCtorLike } from '../../../../types';

import { asRecord, getNavigatorRaw, getWindowRaw, type BrowserEnvSurface } from './env_shared.js';
import { installStableSurfaceMethod } from '../../runtime/stable_surface_methods.js';

export type ClipboardWriteLike = NonNullable<BrowserEnvSurface['clipboardWrite']>;
export type ClipboardWriteTextLike = NonNullable<BrowserEnvSurface['clipboardWriteText']>;
export type ClipboardReadTextLike = NonNullable<BrowserEnvSurface['clipboardReadText']>;

type BrowserEnvClipboardInternals = BrowserEnvSurface & {
  __wpGetClipboardItemCtor?: BrowserEnvSurface['getClipboardItemCtor'];
  __wpClipboardWrite?: BrowserEnvSurface['clipboardWrite'];
  __wpClipboardWriteText?: BrowserEnvSurface['clipboardWriteText'];
  __wpClipboardReadText?: BrowserEnvSurface['clipboardReadText'];
  __wpHasClipboard?: BrowserEnvSurface['hasClipboard'];
};

export type ClipboardLike = {
  write?: ClipboardWriteLike;
  writeText?: ClipboardWriteTextLike;
  readText?: ClipboardReadTextLike;
};

export function readClipboard(nav: Navigator | null): ClipboardLike | null {
  const clipboard = nav?.clipboard;
  if (!clipboard || typeof clipboard !== 'object') return null;
  const out: ClipboardLike = {};
  if (typeof clipboard.write === 'function') {
    out.write = (items: ClipboardItems) => Promise.resolve(clipboard.write(items));
  }
  if (typeof clipboard.writeText === 'function') {
    out.writeText = (text: string) => Promise.resolve(clipboard.writeText(text));
  }
  if (typeof clipboard.readText === 'function') {
    out.readText = () => Promise.resolve(clipboard.readText());
  }
  return out;
}

export function readClipboardWrite(nav: Navigator | null): ClipboardWriteLike | null {
  return readClipboard(nav)?.write ?? null;
}

export function readClipboardWriteText(nav: Navigator | null): ClipboardWriteTextLike | null {
  return readClipboard(nav)?.writeText ?? null;
}

export function readClipboardReadText(nav: Navigator | null): ClipboardReadTextLike | null {
  return readClipboard(nav)?.readText ?? null;
}

export function isClipboardItemCtorLike(value: unknown): value is ClipboardItemCtorLike {
  return typeof value === 'function';
}

export function readClipboardItemCtor(App: AppContainer): ClipboardItemCtorLike | null {
  const winRecord = asRecord(getWindowRaw(App));
  const ctor = winRecord ? (winRecord.ClipboardItem ?? null) : null;
  return isClipboardItemCtorLike(ctor) ? ctor : null;
}

export function installBrowserClipboardSurface(
  App: AppContainer,
  browserSurface: BrowserEnvClipboardInternals
): void {
  const b = browserSurface;

  installStableSurfaceMethod(b, 'getClipboardItemCtor', '__wpGetClipboardItemCtor', () => {
    return function () {
      try {
        return readClipboardItemCtor(App);
      } catch {
        return null;
      }
    };
  });

  installStableSurfaceMethod(b, 'clipboardWrite', '__wpClipboardWrite', () => {
    return function (items: ClipboardItems) {
      try {
        const write = readClipboardWrite(getNavigatorRaw(App));
        if (!write) return Promise.reject(new Error('[WardrobePro][ESM] Clipboard write not supported'));
        return Promise.resolve(write(items)).then(() => void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    };
  });

  installStableSurfaceMethod(b, 'clipboardWriteText', '__wpClipboardWriteText', () => {
    return function (text: string) {
      try {
        const writeText = readClipboardWriteText(getNavigatorRaw(App));
        if (!writeText)
          return Promise.reject(new Error('[WardrobePro][ESM] Clipboard writeText not supported'));
        return Promise.resolve(writeText(String(text || ''))).then(() => void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    };
  });

  installStableSurfaceMethod(b, 'clipboardReadText', '__wpClipboardReadText', () => {
    return function () {
      try {
        const readText = readClipboardReadText(getNavigatorRaw(App));
        if (!readText)
          return Promise.reject(new Error('[WardrobePro][ESM] Clipboard readText not supported'));
        return Promise.resolve(readText()).then(value => String(value ?? ''));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  });

  installStableSurfaceMethod(b, 'hasClipboard', '__wpHasClipboard', () => {
    return function () {
      try {
        return !!readClipboard(getNavigatorRaw(App));
      } catch {
        return false;
      }
    };
  });
}
