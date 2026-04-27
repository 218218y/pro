export type QuickActionsDockPanelSnapshot = {
  floatingSync?: unknown;
};

export type QuickActionsDockApiLike = {
  getPanelSnapshot?: (() => QuickActionsDockPanelSnapshot | null | undefined) | null;
  isFloatingSketchSyncEnabled?: (() => unknown) | null;
  subscribePanelSnapshot?:
    | ((fn: (snapshot: QuickActionsDockPanelSnapshot) => void) => (() => void) | void)
    | null;
  subscribeFloatingSketchSyncEnabled?: ((fn: (value: boolean) => void) => (() => void) | void) | null;
};

export type QuickActionsDockReporter = ((op: string, err: unknown) => void) | null | undefined;

export type QuickActionsDockEventTargetLike = {
  nodeType?: unknown;
};

export interface QuickActionsDockNodeLike {
  contains?(value: QuickActionsDockEventTargetLike | null): boolean;
}

export type QuickActionsDockRefs = {
  anchor?: QuickActionsDockNodeLike | null;
  menu?: QuickActionsDockNodeLike | null;
  toggle?: QuickActionsDockNodeLike | null;
  menuPin?: QuickActionsDockNodeLike | null;
  syncDock?: QuickActionsDockNodeLike | null;
};

export type QuickActionsDockActionArgs = {
  action?: (() => unknown) | null;
  closeMenu?: (() => void) | null;
  event?: unknown;
  keepOpen?: boolean;
  op: string;
};

export type QuickActionsDockToggleMenuArgs = {
  event?: unknown;
  op: string;
  setMenuOpen: (updater: boolean | ((value: boolean) => boolean)) => void;
};

export type QuickActionsDockTogglePinnedArgs = {
  event?: unknown;
  menuPinnedOpen: boolean;
  op: string;
  setMenuPinnedOpen: (next: boolean) => void;
};

export type QuickActionsDockOutsideClickArgs = {
  closeMenu: () => void;
  menuPinnedOpen: boolean;
  refs: QuickActionsDockRefs;
};

export type QuickActionsDockController = {
  handleOutsidePointerDown: (event: unknown, args: QuickActionsDockOutsideClickArgs) => void;
  readPinnedSync: () => boolean;
  runAction: (args: QuickActionsDockActionArgs) => void;
  stopSurfaceEvent: (event: unknown, op: string) => void;
  subscribePinnedSync: (setPinnedSync: (value: boolean) => void) => (() => void) | undefined;
  toggleMenu: (args: QuickActionsDockToggleMenuArgs) => void;
  toggleMenuPinned: (args: QuickActionsDockTogglePinnedArgs) => boolean;
};

export type QuickActionsDockControllerArgs = {
  api: QuickActionsDockApiLike | null | undefined;
  reportNonFatal?: QuickActionsDockReporter;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function') && 'then' in value;
}

function report(reportNonFatal: QuickActionsDockReporter, op: string, err: unknown): void {
  try {
    reportNonFatal?.(op, err);
  } catch {
    // ignore reporter failures
  }
}

function readComposedPath(event: unknown): unknown[] | null {
  if (!isRecord(event)) return null;
  try {
    const composedPath = Reflect.get(event, 'composedPath');
    if (typeof composedPath !== 'function') return null;
    const path = Reflect.apply(composedPath, event, []);
    return Array.isArray(path) ? path : null;
  } catch {
    return null;
  }
}

function readEventTarget(event: unknown): unknown {
  if (!isRecord(event)) return null;
  return Reflect.get(event, 'target');
}

function asNodeTarget(value: unknown): QuickActionsDockEventTargetLike | null {
  return isRecord(value) && 'nodeType' in value ? value : null;
}

function isInsideRef(
  ref: QuickActionsDockNodeLike | null | undefined,
  target: QuickActionsDockEventTargetLike | null,
  path: unknown[] | null
): boolean {
  if (!ref) return false;
  if (path && path.indexOf(ref) >= 0) return true;
  try {
    return typeof ref.contains === 'function' ? !!ref.contains(target) : false;
  } catch {
    return false;
  }
}

function stopEventCommon(
  event: unknown,
  reportNonFatal: QuickActionsDockReporter,
  op: string,
  preventDefault: boolean
): void {
  try {
    if (!isRecord(event)) return;
    const stopPropagation = Reflect.get(event, 'stopPropagation');
    if (preventDefault) {
      const prevent = Reflect.get(event, 'preventDefault');
      if (typeof prevent === 'function') Reflect.apply(prevent, event, []);
    }
    if (typeof stopPropagation === 'function') Reflect.apply(stopPropagation, event, []);
  } catch (err) {
    report(reportNonFatal, op, err);
  }
}

export function createQuickActionsDockController(
  args: QuickActionsDockControllerArgs
): QuickActionsDockController {
  const { api, reportNonFatal } = args;

  return {
    readPinnedSync() {
      try {
        if (api?.getPanelSnapshot) return !!api.getPanelSnapshot()?.floatingSync;
        if (api?.isFloatingSketchSyncEnabled) return !!api.isFloatingSketchSyncEnabled();
      } catch (err) {
        report(reportNonFatal, 'quick-actions:pin-sync-init', err);
      }
      return false;
    },

    subscribePinnedSync(setPinnedSync) {
      try {
        if (api?.subscribePanelSnapshot) {
          return (
            api.subscribePanelSnapshot(snapshot => {
              try {
                setPinnedSync(!!snapshot?.floatingSync);
              } catch (err) {
                report(reportNonFatal, 'quick-actions:pin-sync-subscribe', err);
              }
            }) || undefined
          );
        }
        if (api?.subscribeFloatingSketchSyncEnabled) {
          return (
            api.subscribeFloatingSketchSyncEnabled(value => {
              try {
                setPinnedSync(!!value);
              } catch (err) {
                report(reportNonFatal, 'quick-actions:pin-sync-subscribe', err);
              }
            }) || undefined
          );
        }
      } catch (err) {
        report(reportNonFatal, 'quick-actions:pin-sync-init', err);
      }
      return undefined;
    },

    stopSurfaceEvent(event, op) {
      stopEventCommon(event, reportNonFatal, op, false);
    },

    toggleMenu({ event, op, setMenuOpen }) {
      stopEventCommon(event, reportNonFatal, op, true);
      setMenuOpen(value => !value);
    },

    toggleMenuPinned({ event, menuPinnedOpen, op, setMenuPinnedOpen }) {
      stopEventCommon(event, reportNonFatal, op, true);
      const next = !menuPinnedOpen;
      setMenuPinnedOpen(next);
      return next;
    },

    handleOutsidePointerDown(event, args) {
      const { closeMenu, menuPinnedOpen, refs } = args;
      try {
        if (menuPinnedOpen) return;
        const rawTarget = readEventTarget(event);
        const path = readComposedPath(event);
        if (rawTarget == null && !path) return;
        const target = asNodeTarget(rawTarget);
        const isInside = (ref: QuickActionsDockNodeLike | null | undefined) => {
          try {
            return isInsideRef(ref, target, path);
          } catch (err) {
            report(reportNonFatal, 'quick-actions:outside-click-path', err);
            return false;
          }
        };
        if (isInside(refs.anchor)) return;
        if (isInside(refs.menu)) return;
        if (isInside(refs.toggle)) return;
        if (isInside(refs.menuPin)) return;
        if (isInside(refs.syncDock)) return;
        closeMenu();
      } catch (err) {
        report(reportNonFatal, 'quick-actions:outside-click', err);
      }
    },

    runAction({ action, closeMenu, event, keepOpen = false, op }) {
      stopEventCommon(event, reportNonFatal, op, true);
      try {
        const result = action?.();
        if (!keepOpen) closeMenu?.();
        if (isPromiseLike(result)) {
          void result.then(undefined, err => {
            report(reportNonFatal, `${op}:action`, err);
          });
        }
      } catch (err) {
        report(reportNonFatal, `${op}:action`, err);
      }
    },
  };
}
