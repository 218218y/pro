// React UI actions: sketch mode

import type { AppContainer, ActionMetaLike, UnknownRecord } from '../../../../../types';

import { getMetaActionFn } from '../../../services/api.js';
import { readStoreStateMaybe } from '../../../services/api.js';
import { setRuntimeSketchMode, setUiSketchModeMirror } from './store_actions.js';
import { applyImmediateStructuralRuntimeMutation } from './structural_build_refresh_actions.js';

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function emptyRecord(): UnknownRecord {
  return {};
}

function readImmediateStructuralActionSource(
  value: ActionMetaLike | undefined,
  fallbackSource: string
): string {
  return typeof value?.source === 'string' && value.source.trim() ? value.source : fallbackSource;
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
  const source = readImmediateStructuralActionSource(meta, 'react:sketch');
  const cur = getRuntimeSketchMode(app);
  const next = !cur;

  try {
    applyImmediateStructuralRuntimeMutation(
      app,
      source,
      { sketchMode: !!next },
      actionMeta => {
        setRuntimeSketchMode(app, !!next, actionMeta);
      },
      meta
    );
  } catch {}

  try {
    setUiSketchModeMirror(app, !!next, getUiOnlyImmediateMeta(app, 'react:sketch:syncUi'));
  } catch {}
}
