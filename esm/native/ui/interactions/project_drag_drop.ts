// UI interactions: drag & drop project JSON onto the page (Pure ESM)
//
// Goal:
// - Keep drag/drop logic out of ui/wiring.
// - Avoid breaking internal UI drags by only reacting to OS file drags.

import type { AppContainer } from '../../../../types';
import { createProjectDragDropController } from './project_drag_drop_controller_runtime.js';

export type ProjectDragDropDeps = {
  doc: Document;
  toast?: (msg: string, type?: string) => void;
};

/**
 * Installs drag & drop loading of a JSON project file.
 * Returns a disposer.
 */
export function installProjectDragDrop(App: AppContainer, deps: ProjectDragDropDeps): () => void {
  const doc = deps?.doc;
  if (!App || typeof App !== 'object') return () => undefined;
  if (!doc || !doc.body) return () => undefined;

  const body = doc.body;
  const controller = createProjectDragDropController(App, deps);
  const sharedListenerOpts: AddEventListenerOptions = { passive: false };

  try {
    body.addEventListener('dragenter', controller.preventDefaultsForFilesOnly, sharedListenerOpts);
    body.addEventListener('dragover', controller.preventDefaultsForFilesOnly, sharedListenerOpts);
    body.addEventListener('dragleave', controller.preventDefaultsForFilesOnly, sharedListenerOpts);
    body.addEventListener('drop', controller.preventDefaultsForFilesOnly, sharedListenerOpts);
    body.addEventListener('dragover', controller.onDragOverClass, sharedListenerOpts);
    body.addEventListener('dragleave', controller.onDragLeaveClass, sharedListenerOpts);
    body.addEventListener('drop', controller.onDropHandle, sharedListenerOpts);
  } catch {
    return () => undefined;
  }

  return () => {
    controller.onDragLeaveClass();
    try {
      body.removeEventListener('dragenter', controller.preventDefaultsForFilesOnly, sharedListenerOpts);
      body.removeEventListener('dragover', controller.preventDefaultsForFilesOnly, sharedListenerOpts);
      body.removeEventListener('dragleave', controller.preventDefaultsForFilesOnly, sharedListenerOpts);
      body.removeEventListener('drop', controller.preventDefaultsForFilesOnly, sharedListenerOpts);
      body.removeEventListener('dragover', controller.onDragOverClass, sharedListenerOpts);
      body.removeEventListener('dragleave', controller.onDragLeaveClass, sharedListenerOpts);
      body.removeEventListener('drop', controller.onDropHandle, sharedListenerOpts);
    } catch {
      // ignore detach failures
    }
  };
}
