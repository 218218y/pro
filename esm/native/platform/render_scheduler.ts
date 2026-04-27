import type { RendererLike, UnknownRecord } from '../../../types';
import {
  ensurePlatformRootSurface,
  ensurePlatformService,
  runPlatformWakeupFollowThrough,
} from '../runtime/platform_access.js';
import { ensureRenderNamespace, getRenderer } from '../runtime/render_access.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

// Native ESM implementation of the render scheduler and activity heartbeat.

type ActivityLike = UnknownRecord & { lastActionTime?: number; touch?: () => void };
type PlatformRootLike = UnknownRecord & { triggerRender?: (updateShadows?: boolean) => void };
type AppLike = UnknownRecord & { platform?: PlatformRootLike };
type TriggerRenderFn = (updateShadows?: boolean) => void;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isAppLike(value: unknown): value is AppLike {
  return isRecord(value);
}

function isActivityLike(value: unknown): value is ActivityLike {
  return isRecord(value);
}

function isRendererLike(value: unknown): value is RendererLike {
  return isRecord(value);
}

function readTriggerRenderSurface(App: unknown): PlatformRootLike | null {
  if (!isAppLike(App)) return null;
  const platform = ensurePlatformRootSurface(App);
  return isRecord(platform) ? platform : null;
}

export function ensureActivity(App: unknown): ActivityLike | null {
  if (!isAppLike(App)) return null;
  const platform = ensurePlatformService(App);
  if (isActivityLike(platform.activity)) return platform.activity;
  const next: ActivityLike = {};
  platform.activity = next;
  return next;
}

export function triggerRender(App: unknown, updateShadows?: boolean): void {
  if (!isAppLike(App)) return;
  const A = App;

  ensureActivity(A);
  runPlatformWakeupFollowThrough(A, {
    afterTouch: () => {
      try {
        const renderer = (() => {
          const value = getRenderer(A);
          return isRendererLike(value) ? value : null;
        })();
        ensureRenderNamespace(A);
        if (updateShadows === true && renderer && renderer.shadowMap) {
          renderer.shadowMap.needsUpdate = true;
        }
      } catch (_) {}
    },
  });
}

export function installRenderScheduler(App: unknown): void {
  if (!isAppLike(App)) return;
  const A = App;

  const platform = readTriggerRenderSurface(A);
  if (!platform) return;

  ensureActivity(A);

  installStableSurfaceMethod<TriggerRenderFn>(platform, 'triggerRender', '__wpTriggerRender', () => {
    return function (updateShadows?: boolean) {
      return triggerRender(A, updateShadows);
    };
  });
}
