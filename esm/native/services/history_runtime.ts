import type { AppContainer, HistoryPushRequestLike } from '../../../types';
import { getHistorySystem, isRestoring } from './history_shared.js';

export function pushNow(App: AppContainer, opts?: HistoryPushRequestLike): void {
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  try {
    const HS = getHistorySystem(App);
    if (!HS || typeof HS.pushState !== 'function') return;
    if (HS.isPaused) return;
    if (isRestoring(App)) return;
    HS.pushState(safeOpts);
  } catch {}
}

export function pause(App: AppContainer): void {
  try {
    const HS = getHistorySystem(App);
    if (HS && typeof HS.pause === 'function') HS.pause();
  } catch {}
}

export function resume(App: AppContainer): void {
  try {
    const HS = getHistorySystem(App);
    if (HS && typeof HS.resume === 'function') HS.resume();
  } catch {}
}
