import type { AppContainer } from '../../../../types';

import { handleProjectDropLoad } from './project_drag_drop_controller_drop.js';
import {
  clearProjectDragOverClass,
  preventProjectDragDefaultsForFilesOnly,
  updateProjectDragOverClass,
} from './project_drag_drop_controller_visual.js';
import {
  isProjectFileDrag,
  type ProjectDragDropController,
  type ProjectDragDropToastFn,
} from './project_drag_drop_controller_shared.js';

export type {
  ProjectDragDropController,
  ProjectDragDropToastFn,
} from './project_drag_drop_controller_shared.js';
export {
  readDroppedProjectFile,
  readDroppedProjectFileFlightKey,
  isProjectFileDrag,
} from './project_drag_drop_controller_shared.js';

export function createProjectDragDropController(
  App: AppContainer,
  deps: { doc: Document; toast?: ProjectDragDropToastFn }
): ProjectDragDropController {
  const doc = deps.doc;
  const toast = typeof deps.toast === 'function' ? deps.toast : () => undefined;

  return {
    isFileDrag: isProjectFileDrag,

    preventDefaultsForFilesOnly(e) {
      preventProjectDragDefaultsForFilesOnly(e);
    },

    onDragOverClass(e) {
      updateProjectDragOverClass(doc, e);
    },

    onDragLeaveClass() {
      clearProjectDragOverClass(doc);
    },

    async onDropHandle(e) {
      await handleProjectDropLoad(App, doc, toast, e);
    },
  };
}
