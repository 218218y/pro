// Scene prep before build
//
// Responsibilities:
// - preserving notes before scene cleanup
// - clearing wardrobeGroup meshes
// - resetting builderRegistry-backed build metadata
//
// This module intentionally does NOT read UI from DOM. It only uses state/config.

import type { ProjectSavedNotesLike, SavedNote } from '../../../types';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readSavedNotes(value: unknown): ProjectSavedNotesLike {
  if (!Array.isArray(value)) return [];
  const out: SavedNote[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const note = readRecord(value[i]) as SavedNote | null;
    if (note) out.push(note);
  }
  return out;
}

type BuildStateLike = {
  config?: unknown;
};

export type PrepareBuildSceneInput = {
  state: BuildStateLike | null | undefined;
  cleanGroup: ((g: unknown) => void) | null;
  getNotesForSave: (() => ProjectSavedNotesLike) | null;
};

export type PrepareBuildSceneRuntime = Readonly<{
  capturePlanarReflectorWarmCache: () => void;
  readWardrobeGroup: () => unknown;
  cleanGroupViaPlatform: (group: unknown) => boolean;
  invalidateMirrorTracking: () => void;
  resetBuilderRegistry: () => void;
  markPerfFlagsDirty: () => void;
}>;

export type PrepareBuildSceneArgs = PrepareBuildSceneInput & {
  runtime: PrepareBuildSceneRuntime;
};

export type PrepareBuildSceneResult = {
  notesToPreserve: ProjectSavedNotesLike;
};

/**
 * Capture notes + reset render/builder state before a rebuild.
 *
 * The caller supplies runtime capabilities explicitly; this owner does not
 * reach through an application container.
 * @returns {PrepareBuildSceneResult}
 */
export function prepareBuildScene(args: PrepareBuildSceneArgs): PrepareBuildSceneResult {
  if (!args?.runtime) throw new Error('[builder/pre_build_reset] runtime capabilities are required');
  const { runtime, state, cleanGroup, getNotesForSave } = args;

  let notesToPreserve: ProjectSavedNotesLike = [];

  // Prefer capturing live notes (overlay state), but fall back to state.config.savedNotes
  // (this is NOT a DOM read; it is persisted state).
  if (typeof getNotesForSave === 'function') {
    const n = getNotesForSave();
    if (Array.isArray(n) && n.length) notesToPreserve = n;
  }
  if ((!notesToPreserve || notesToPreserve.length === 0) && state?.config) {
    const saved = readSavedNotes(readRecord(state.config)?.savedNotes);
    if (saved.length) notesToPreserve = saved;
  }

  // Preserve already-rendered planar mirror targets before scene cleanup.
  // This lets a rebuild reuse unchanged mirror reflections instead of flashing/re-rendering
  // every door when only one mirror was added.
  runtime.capturePlanarReflectorWarmCache();

  // Clear wardrobe group
  const wardrobeGroup = runtime.readWardrobeGroup();
  if (wardrobeGroup) {
    if (runtime.cleanGroupViaPlatform(wardrobeGroup)) {
      // cleaned via canonical platform seam
    } else if (typeof cleanGroup === 'function') {
      cleanGroup(wardrobeGroup);
    } else {
      throw new Error('[builder/pre_build_reset] cleanGroup missing (platform.util.cleanGroup)');
    }
  }

  // Mirror reflection tracking caches are render-loop hot-path inputs.
  // Rebuilds change scene contents dramatically; invalidate so the next frames can cheaply re-detect.
  runtime.invalidateMirrorTracking();

  // Reset builder registry (required).
  runtime.resetBuilderRegistry();

  runtime.markPerfFlagsDirty();

  return { notesToPreserve };
}
