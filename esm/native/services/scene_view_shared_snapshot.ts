import type { AppContainer, UiSnapshotLike } from '../../../types';

import {
  asKeyPart,
  asRootStateLike,
  asRuntimeRecord,
  asUiSnapshot,
  isRecord,
  type SceneViewSyncSnapshot,
} from './scene_view_shared_contracts.js';
import { getSketchMode, getUiSnapshot } from './scene_view_shared_runtime.js';

export function getCornerLighting(ui: UiSnapshotLike): {
  cornerMode: boolean;
  cornerSide: 'left' | 'right' | null;
} {
  const u = isRecord(ui) ? ui : null;
  const raw = u && isRecord(u.raw) ? u.raw : null;

  const cornerMode = !!(
    u?.cornerMode ??
    u?.isCornerMode ??
    raw?.cornerMode ??
    raw?.isCornerMode ??
    u?.cornerConnectorEnabled ??
    raw?.cornerConnectorEnabled
  );

  const sideVal = u?.cornerSide ?? raw?.cornerSide ?? u?.cornerDirection ?? raw?.cornerDirection;
  let cornerSide: 'left' | 'right' | null =
    sideVal === 'left' ? 'left' : sideVal === 'right' ? 'right' : null;
  if (cornerMode && !cornerSide) cornerSide = 'right';

  return { cornerMode, cornerSide };
}

export function readSceneViewSyncSnapshot(App: AppContainer): SceneViewSyncSnapshot {
  const ui = getUiSnapshot(App);
  const { cornerMode, cornerSide } = getCornerLighting(ui);
  return {
    sketchMode: getSketchMode(App, ui),
    lightingControl: !!ui?.lightingControl,
    lightAmb: asKeyPart(ui?.lightAmb),
    lightDir: asKeyPart(ui?.lightDir),
    lightX: asKeyPart(ui?.lightX),
    lightY: asKeyPart(ui?.lightY),
    lightZ: asKeyPart(ui?.lightZ),
    cornerKey: cornerMode ? `corner:${cornerSide || 'right'}` : 'normal',
  };
}

export function readSceneViewSyncSnapshotFromState(state: unknown): SceneViewSyncSnapshot {
  const root = asRootStateLike(state);
  const ui = asUiSnapshot(root.ui);
  const runtime = asRuntimeRecord(root.runtime);
  const { cornerMode, cornerSide } = getCornerLighting(ui);
  return {
    sketchMode: !!runtime.sketchMode,
    lightingControl: !!ui?.lightingControl,
    lightAmb: asKeyPart(ui?.lightAmb),
    lightDir: asKeyPart(ui?.lightDir),
    lightX: asKeyPart(ui?.lightX),
    lightY: asKeyPart(ui?.lightY),
    lightZ: asKeyPart(ui?.lightZ),
    cornerKey: cornerMode ? `corner:${cornerSide || 'right'}` : 'normal',
  };
}
