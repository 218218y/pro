import type { AppContainer, UnknownRecord } from '../../../../types';
import { getBrowserTimers, getNavigatorMaybe, requestIdleCallbackMaybe } from '../../services/api.js';

const backgroundWarmupSeen = new WeakSet<AppContainer>();

type Cleanup = () => void;
type WarmTask = () => Promise<unknown>;

type NavigatorConnectionLike = {
  saveData?: unknown;
};

type NavigatorLike = {
  connection?: NavigatorConnectionLike;
};

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

function asNavigatorLike(value: unknown): NavigatorLike | null {
  return asRecord(value);
}

function readSaveDataEnabled(app: AppContainer): boolean {
  try {
    const nav = asNavigatorLike(getNavigatorMaybe(app));
    return !!nav?.connection && nav.connection.saveData === true;
  } catch {
    return false;
  }
}

function idleTask(app: AppContainer, run: () => void): Cleanup {
  const requestIdle = requestIdleCallbackMaybe(app);
  if (requestIdle) {
    let active = true;
    requestIdle(
      () => {
        if (!active) return;
        run();
      },
      { timeout: 1500 }
    );
    return () => {
      active = false;
    };
  }

  const timers = getBrowserTimers(app);
  const timeoutId = timers.setTimeout(run, 0);
  return () => timers.clearTimeout(timeoutId);
}

export function warmDeferredSidebarTabsChunk(): Promise<void> {
  return import('./tabs/DeferredSidebarTabs.js').then(() => undefined);
}

export function warmOrderPdfOverlayChunk(): Promise<void> {
  return Promise.resolve();
}

export function scheduleReactBackgroundWarmup(app: AppContainer): Cleanup {
  if (backgroundWarmupSeen.has(app)) return () => undefined;
  backgroundWarmupSeen.add(app);

  if (readSaveDataEnabled(app)) return () => undefined;

  const timers = getBrowserTimers(app);
  const cleanups: Cleanup[] = [];
  let cancelled = false;

  const tasks: WarmTask[] = [() => warmDeferredSidebarTabsChunk()];

  const runStep = (index: number): void => {
    if (cancelled || index >= tasks.length) return;

    const cleanup = idleTask(app, () => {
      if (cancelled) return;
      const task = tasks[index];
      if (!task) return;
      void Promise.resolve()
        .then(() => task())
        .catch(() => undefined)
        .finally(() => {
          if (cancelled) return;
          const nextDelayMs = index === 0 ? 450 : 700;
          const nextId = timers.setTimeout(() => runStep(index + 1), nextDelayMs);
          cleanups.push(() => timers.clearTimeout(nextId));
        });
    });

    cleanups.push(cleanup);
  };

  const startId = timers.setTimeout(() => runStep(0), 2200);
  cleanups.push(() => timers.clearTimeout(startId));

  return () => {
    cancelled = true;
    while (cleanups.length) {
      const cleanup = cleanups.pop();
      try {
        cleanup?.();
      } catch {
        // cleanup-best-effort: one warmup disposer must not prevent the remaining cleanup callbacks from running.
      }
    }
  };
}
