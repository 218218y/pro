import type { RootStateLike } from '../../../types';

import { readSceneViewSyncSnapshotFromState, type SceneViewSyncSnapshot } from './scene_view_shared.js';

export type SceneViewModeSelectorValue = { sketchMode: boolean };
export type SceneViewLightsSelectorValue = Omit<SceneViewSyncSnapshot, 'cornerKey'> & { cornerKey: string };

export function selectSceneViewModeValue(state: RootStateLike): SceneViewModeSelectorValue {
  const snapshot = readSceneViewSyncSnapshotFromState(state);
  return { sketchMode: snapshot.sketchMode };
}

export function selectSceneViewLightsValue(state: RootStateLike): SceneViewLightsSelectorValue {
  const snapshot = readSceneViewSyncSnapshotFromState(state);
  return {
    sketchMode: snapshot.sketchMode,
    lightingControl: snapshot.lightingControl,
    lightAmb: snapshot.lightAmb,
    lightDir: snapshot.lightDir,
    lightX: snapshot.lightX,
    lightY: snapshot.lightY,
    lightZ: snapshot.lightZ,
    cornerKey: snapshot.cornerKey,
  };
}

export function areSceneViewModeValuesEqual(
  a: SceneViewModeSelectorValue,
  b: SceneViewModeSelectorValue
): boolean {
  return !!a && !!b && a.sketchMode === b.sketchMode;
}

export function areSceneViewLightValuesEqual(
  a: SceneViewLightsSelectorValue,
  b: SceneViewLightsSelectorValue
): boolean {
  return (
    !!a &&
    !!b &&
    a.sketchMode === b.sketchMode &&
    a.lightingControl === b.lightingControl &&
    a.lightAmb === b.lightAmb &&
    a.lightDir === b.lightDir &&
    a.lightX === b.lightX &&
    a.lightY === b.lightY &&
    a.lightZ === b.lightZ &&
    a.cornerKey === b.cornerKey
  );
}

export function didSceneModeChange(prev: SceneViewSyncSnapshot | null, next: SceneViewSyncSnapshot): boolean {
  if (!prev) return true;
  return prev.sketchMode !== next.sketchMode;
}

export function didLightInputsChange(
  prev: SceneViewSyncSnapshot | null,
  next: SceneViewSyncSnapshot
): boolean {
  if (!prev) return true;
  return (
    prev.sketchMode !== next.sketchMode ||
    prev.lightingControl !== next.lightingControl ||
    prev.lightAmb !== next.lightAmb ||
    prev.lightDir !== next.lightDir ||
    prev.lightX !== next.lightX ||
    prev.lightY !== next.lightY ||
    prev.lightZ !== next.lightZ ||
    prev.cornerKey !== next.cornerKey
  );
}

export function didShadowRelevantLightChange(
  prev: SceneViewSyncSnapshot | null,
  next: SceneViewSyncSnapshot
): boolean {
  if (!prev) return true;
  return (
    prev.sketchMode !== next.sketchMode ||
    prev.lightingControl !== next.lightingControl ||
    prev.lightDir !== next.lightDir ||
    prev.lightX !== next.lightX ||
    prev.lightY !== next.lightY ||
    prev.lightZ !== next.lightZ ||
    prev.cornerKey !== next.cornerKey
  );
}
