import { toggleBodyClass } from '../dom_helpers.js';
import { isProjectFileDrag } from './project_drag_drop_controller_shared.js';

export function preventProjectDragDefaultsForFilesOnly(e: Event): void {
  const ev = e instanceof DragEvent ? e : null;
  if (!isProjectFileDrag(ev)) return;
  e.preventDefault();
  e.stopPropagation();
}

export function updateProjectDragOverClass(doc: Document, e: Event): void {
  try {
    const ev = e instanceof DragEvent ? e : null;
    if (!isProjectFileDrag(ev)) {
      toggleBodyClass(doc, 'is-dragover', false);
      return;
    }
    toggleBodyClass(doc, 'is-dragover', true);
  } catch {
    // ignore visual toggle failures
  }
}

export function clearProjectDragOverClass(doc: Document): void {
  try {
    toggleBodyClass(doc, 'is-dragover', false);
  } catch {
    // ignore visual toggle failures
  }
}
