import type { ThreeLike } from '../../../types';
import { assertTHREE } from './assert.js';
import { getDepMaybe } from './deps_access.js';

export function getThreeMaybe(App: unknown): ThreeLike | null {
  try {
    return getDepMaybe<ThreeLike>(App, 'THREE');
  } catch {
    return null;
  }
}

export function assertThreeViaDeps(App: unknown, label = ''): ThreeLike {
  return assertTHREE(App, label || 'runtime/three_access.assertThreeViaDeps');
}
