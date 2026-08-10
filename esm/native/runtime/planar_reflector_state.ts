import type { UnknownRecord } from '../../../types/index.js';

import type { PlanarReflectorState } from './planar_reflector_contracts.js';

export function isPlanarReflectorRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readPlanarReflectorRecord(value: unknown): UnknownRecord | null {
  return isPlanarReflectorRecord(value) ? value : null;
}

export function readPlanarReflectorMirrorUserData(mirror: unknown): UnknownRecord | null {
  const record = readPlanarReflectorRecord(mirror);
  return readPlanarReflectorRecord(record?.userData);
}

export function readPlanarReflectorCacheKey(mirror: unknown): string | null {
  const key = readPlanarReflectorMirrorUserData(mirror)?.__wpPlanarReflectorCacheKey;
  return typeof key === 'string' && key.trim() ? key : null;
}

export function isTaggedPlanarMirrorSurface(mirror: unknown): boolean {
  return readPlanarReflectorMirrorUserData(mirror)?.__wpMirrorSurface === true;
}

export function isExplicitCubeReflectionSurface(mirror: unknown): boolean {
  const userData = readPlanarReflectorMirrorUserData(mirror);
  return (
    userData?.__wpMirrorReflectionMode === 'cube' || userData?.__wpReflectiveAdhesiveGlassSurface === true
  );
}

export function isPlanarReflectorBudgetSurface(mirror: unknown): boolean {
  return isTaggedPlanarMirrorSurface(mirror) && !isExplicitCubeReflectionSurface(mirror);
}

export function readPlanarReflectorState(mirror: unknown): PlanarReflectorState | null {
  const state = readPlanarReflectorRecord(readPlanarReflectorMirrorUserData(mirror)?.__wpPlanarReflector);
  if (!state) return null;
  if (!readPlanarReflectorRecord(state.renderTarget) || !readPlanarReflectorRecord(state.virtualCamera)) {
    return null;
  }
  if (!readPlanarReflectorRecord(state.textureMatrix) || !readPlanarReflectorRecord(state.material)) {
    return null;
  }
  return state as unknown as PlanarReflectorState;
}

export function isPlanarMirrorSurface(mirror: unknown): boolean {
  return readPlanarReflectorState(mirror) !== null;
}

export function isInitialPlanarReflectorState(state: PlanarReflectorState): boolean {
  return !(
    typeof state.updateCount === 'number' &&
    Number.isFinite(state.updateCount) &&
    state.updateCount > 0
  );
}
