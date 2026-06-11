// React UI actions: sketch mode

import type { AppContainer, ActionMetaLike, UnknownRecord } from '../../../../../types';

import { requestBuilderForcedBuild } from '../../../services/api.js';
import { getMetaActionFn } from '../../../services/api.js';
import { readStoreStateMaybe } from '../../../services/api.js';
import { setRuntimeSketchMode, setUiSketchModeMirror } from './store_actions.js';

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function emptyRecord(): UnknownRecord {
  return {};
}

function readActionMeta(value: ActionMetaLike | undefined, fallbackSource: string): ActionMetaLike {
  return value ? { ...value } : { source: fallbackSource };
}

function getRuntimeSketchMode(app: AppContainer): boolean {
  try {
    const root = readStoreStateMaybe(app);
    const rt = readRecord(root?.runtime) || emptyRecord();
    return rt.sketchMode === true;
  } catch {
    return false;
  }
}

function getUiOnlyImmediateMeta(app: AppContainer, source: string): ActionMetaLike {
  const uiOnlyImmediate = getMetaActionFn<(source: string) => ActionMetaLike>(app, 'uiOnlyImmediate');
  if (typeof uiOnlyImmediate === 'function') return uiOnlyImmediate(source);
  return {
    source,
    immediate: true,
    noBuild: true,
    noHistory: true,
    noPersist: true,
  };
}

export function toggleSketchMode(app: AppContainer, meta?: ActionMetaLike): void {
  const m = readActionMeta(meta, 'react:sketch');
  const cur = getRuntimeSketchMode(app);
  const next = !cur;

  try {
    setRuntimeSketchMode(app, !!next, m);
  } catch {}

  try {
    setUiSketchModeMirror(app, !!next, getUiOnlyImmediateMeta(app, 'react:sketch:syncUi'));
  } catch {}

  requestBuilderForcedBuild(app, {
    source: m.source || 'react:sketch',
    reason: 'react.action',
  });
}
