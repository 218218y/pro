// Scene prep before build
//
// Responsibilities:
// - preserving notes before scene cleanup
// - clearing wardrobeGroup meshes
// - resetting builderRegistry-backed build metadata
//
// This module intentionally does NOT read UI from DOM. It only uses state/config.

import type { AppContainer, ProjectSavedNotesLike, SavedNote } from '../../../types';

import { getWardrobeGroup, invalidateMirrorTracking } from '../runtime/render_access.js';
import { cleanGroupViaPlatform, markPlatformPerfFlagsDirty } from '../runtime/platform_access.js';
import { reportError } from '../runtime/errors.js';
import { requireBuilderRegistry } from '../runtime/builder_service_access.js';
import { asRecord } from '../runtime/record.js';

function readSavedNotes(value: unknown): ProjectSavedNotesLike {
  if (!Array.isArray(value)) return [];
  const out: SavedNote[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const note = asRecord<SavedNote>(value[i]);
    if (note) out.push(note);
  }
  return out;
}

type BuildStateLike = {
  config?: unknown;
};

type PrepareBuildSceneArgs = {
  App: AppContainer;
  state: BuildStateLike | null | undefined;
  cleanGroup: ((g: unknown) => void) | null;
  getNotesForSave: (() => ProjectSavedNotesLike) | null;
};

type PrepareBuildSceneResult = {
  notesToPreserve: ProjectSavedNotesLike;
};

/**
 * Capture notes + reset render/builder state before a rebuild.
 *
 * @param {{
 *   App: AppContainer,
 *   state: BuildStateLike | null | undefined,
 *   cleanGroup: ((g: unknown)=>void) | null,
 *   getNotesForSave: (()=>ProjectSavedNotesLike) | null,
 * }} args
 * @returns {PrepareBuildSceneResult}
 */
export function prepareBuildScene(args: PrepareBuildSceneArgs): PrepareBuildSceneResult {
  if (!args || !args.App) throw new Error('[builder/pre_build_reset] App is required');
  const { App, state, cleanGroup, getNotesForSave } = args;

  let notesToPreserve: ProjectSavedNotesLike = [];

  // Prefer capturing live notes (overlay state), but fall back to state.config.savedNotes
  // (this is NOT a DOM read; it is persisted state).
  if (typeof getNotesForSave === 'function') {
    const n = getNotesForSave();
    if (Array.isArray(n) && n.length) notesToPreserve = n;
  }
  if ((!notesToPreserve || notesToPreserve.length === 0) && state?.config) {
    const saved = readSavedNotes(asRecord(state.config)?.savedNotes);
    if (saved.length) notesToPreserve = saved;
  }

  // Clear wardrobe group
  const wardrobeGroup = getWardrobeGroup(App);
  if (wardrobeGroup) {
    if (cleanGroupViaPlatform(App, wardrobeGroup)) {
      // cleaned via canonical platform seam
    } else if (typeof cleanGroup === 'function') {
      cleanGroup(wardrobeGroup);
    } else {
      throw new Error('[builder/pre_build_reset] cleanGroup missing (platform.util.cleanGroup)');
    }
  }

  // Mirror reflection tracking caches are render-loop hot-path inputs.
  // Rebuilds change scene contents dramatically; invalidate so the next frames can cheaply re-detect.
  invalidateMirrorTracking(App);

  // Reset builder registry (required).
  const reg = requireBuilderRegistry(App, 'builder/pre_build_reset');
  if (typeof reg.reset === 'function') {
    reg.reset();
  } else {
    const err = new Error(
      '[WardrobePro] builder registry reset is missing (expected App.services.builder.registry.reset)'
    );
    try {
      reportError(App, err, 'builder.preBuildReset');
    } catch (_e) {}
    throw err;
  }

  markPlatformPerfFlagsDirty(App, true);

  return { notesToPreserve };
}
