// WardrobePro UI module manifest (Pure ESM)
//
// Why this exists:
// - Keep the UI boot order explicit and maintainable.
// - Avoid a giant list of imports inside the boot manifest.
// - Give tooling (verify/typecheck) a single source of truth.
// - Allow optional dependency constraints ("after") without relying on fragile file ordering.

import * as bootMainModule from './boot_main.js';
import * as feedbackModule from './feedback.js';
import * as modesModule from './modes.js';
import * as notesExportModule from './notes_export.js';
import * as primaryModeModule from './primary_mode.js';

export type UiModuleEntry = {
  /** Stable identifier (used for logs and contract checks) */
  id: string;
  /** Project-relative file path (used for verify tooling) */
  file: string;
  /** Dynamic importer used at runtime */
  importer: () => Promise<unknown>;
  /** Explicit named installer export required by boot (e.g. installUiFeedback) */
  installExport: string;
  /** Optional list of module ids that must be installed before this module */
  after?: string[];
};

export const UI_MODULES_MAIN: UiModuleEntry[] = [
  {
    id: 'feedback',
    file: 'dist/esm/native/ui/feedback.js',
    importer: () => Promise.resolve(feedbackModule),
    installExport: 'installUiFeedback',
  },
  {
    id: 'primary_mode',
    file: 'dist/esm/native/ui/primary_mode.js',
    importer: () => Promise.resolve(primaryModeModule),
    installExport: 'installUiPrimaryMode',
  },
  {
    id: 'notes_export',
    file: 'dist/esm/native/ui/notes_export.js',
    importer: () => Promise.resolve(notesExportModule),
    installExport: 'installNotesExport',
  },
  {
    id: 'modes',
    file: 'dist/esm/native/ui/modes.js',
    importer: () => Promise.resolve(modesModule),
    installExport: 'installModesController',
    // No ready-registry: ensure dependencies are installed first.
    after: ['feedback', 'primary_mode', 'notes_export'],
  },
  {
    id: 'boot_main',
    file: 'dist/esm/native/ui/boot_main.js',
    importer: () => Promise.resolve(bootMainModule),
    installExport: 'installUiBootMain',
    after: ['modes'],
  },
];

export const UI_MODULES_LATE: UiModuleEntry[] = [
  // Intentionally empty.
  //
  // These were previously installed as "late" modules during boot, which meant they were
  // still downloaded on every initial page load (even if the user never uses Export/PDF).
  //
  // We now load heavy/rare features on-demand via dynamic imports from the React UI shell:
  // - native/ui/export_canvas.ts is installed only when an export action is triggered.
  // - native/ui/settings_backup.ts is installed only when the user exports/imports settings.
];

/**
 * Resolve the install order for UI modules.
 *
 * - Preserves the original manifest order by default.
 * - If entries include `after: ['some_id']`, it will enforce those constraints.
 * - The sort is stable (ties keep original order).
 */
export function resolveUiInstallOrder(entries: UiModuleEntry[]): UiModuleEntry[] {
  const list = Array.isArray(entries) ? entries.slice() : [];

  const byId = new Map<string, UiModuleEntry>();
  const idx = new Map<string, number>();

  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const id = e && e.id ? String(e.id) : '';
    if (!id) continue;
    byId.set(id, e);
    idx.set(id, i);
  }

  // If nothing has dependencies, keep original order.
  const hasDeps = list.some(e => Array.isArray(e.after) && e.after.length > 0);
  if (!hasDeps) return list;

  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();

  for (const id of byId.keys()) {
    indeg.set(id, 0);
    out.set(id, []);
  }

  for (const [id, e] of byId) {
    const after = Array.isArray(e.after) ? e.after : [];
    for (let j = 0; j < after.length; j++) {
      const dep = String(after[j] || '');
      if (!dep || dep === id) continue;
      if (!byId.has(dep)) continue; // unknown ids are validated by tooling
      const arr = out.get(dep);
      if (arr) arr.push(id);
      indeg.set(id, (indeg.get(id) ?? 0) + 1);
    }
  }

  const zeros: string[] = [];
  for (const [id, d] of indeg) {
    if (d === 0) zeros.push(id);
  }
  zeros.sort((a, b) => (idx.get(a) ?? 0) - (idx.get(b) ?? 0));

  const ordered: UiModuleEntry[] = [];

  while (zeros.length) {
    const id = zeros.shift();
    if (!id) break;
    const e = byId.get(id);
    if (e) ordered.push(e);

    const tos = out.get(id) || [];
    for (let k = 0; k < tos.length; k++) {
      const to = tos[k];
      indeg.set(to, (indeg.get(to) ?? 0) - 1);
      if (indeg.get(to) === 0) {
        zeros.push(to);
        zeros.sort((a, b) => (idx.get(a) ?? 0) - (idx.get(b) ?? 0));
      }
    }
  }

  // Cycle detected.
  if (ordered.length !== byId.size) {
    throw new Error('[WardrobePro][ESM] UI manifest contains cyclic "after" dependencies.');
  }

  // Preserve any entries that were missing ids (shouldn't happen; tooling will flag).
  if (ordered.length !== list.length) {
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const id = e && e.id ? String(e.id) : '';
      if (!id || !byId.has(id)) ordered.push(e);
    }
  }

  return ordered;
}

export function allUiModules(): UiModuleEntry[] {
  return [...UI_MODULES_MAIN, ...UI_MODULES_LATE];
}
