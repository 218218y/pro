// UI install surface (Pure ESM)
//
// Boot should import UI installers from here.

export { installErrorsSurface } from './errors_install.js';
export { installNotesService } from './notes_service.js';

export { UI_MODULES_MAIN, UI_MODULES_LATE, allUiModules, resolveUiInstallOrder } from './ui_manifest.js';
export type { UiModuleEntry } from './ui_manifest.js';
