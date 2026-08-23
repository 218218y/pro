import type { AppContainer, WardrobeProPerfEntry } from '../../../types/index.js';

import { getBrowserTimers } from './api_browser_surface.js';
import { getRenderSlot, setRenderSlot } from './render_access.js';
import { triggerRenderViaPlatform } from './platform_access_ops.js';

const PERF_RENDER_FRAME_SAMPLE_REMAINING_SLOT = '__wpPerfRenderFrameSampleRemaining';

function readRemainingFrames(App: AppContainer): number {
  return Math.max(0, Math.floor(Number(getRenderSlot(App, PERF_RENDER_FRAME_SAMPLE_REMAINING_SLOT)) || 0));
}

export function requestPerfRenderFrameSample(
  App: AppContainer,
  requestedCount: number,
  readPerfEntries: () => WardrobeProPerfEntry[]
): Promise<WardrobeProPerfEntry[]> {
  const count = Math.max(1, Math.min(120, Math.floor(Number(requestedCount) || 0)));
  const startedAt = getBrowserTimers(App).now();
  setRenderSlot(App, PERF_RENDER_FRAME_SAMPLE_REMAINING_SLOT, count);
  if (!triggerRenderViaPlatform(App, false)) {
    setRenderSlot(App, PERF_RENDER_FRAME_SAMPLE_REMAINING_SLOT, 0);
    return Promise.reject(new Error('[WardrobePro][perf] renderer frame sampling could not trigger render'));
  }

  const timers = getBrowserTimers(App);
  return new Promise((resolve, reject) => {
    const deadline = timers.now() + 10_000;
    const poll = () => {
      if (readRemainingFrames(App) === 0) {
        resolve(
          readPerfEntries().filter(
            entry => entry.name.startsWith('render.frame.') && Number(entry.startTime) >= startedAt
          )
        );
        return;
      }
      if (timers.now() >= deadline) {
        setRenderSlot(App, PERF_RENDER_FRAME_SAMPLE_REMAINING_SLOT, 0);
        reject(new Error('[WardrobePro][perf] renderer frame sampling timed out'));
        return;
      }
      timers.setTimeout(poll, 16);
    };
    timers.setTimeout(poll, 16);
  });
}
