import type { AppContainer } from '../../../../types';

import { runProjectLoadAction } from '../project_load_runtime.js';
import { clearProjectDragOverClass } from './project_drag_drop_controller_visual.js';
import {
  readDroppedProjectFile,
  type ProjectDragDropToastFn,
} from './project_drag_drop_controller_shared.js';

export async function handleProjectDropLoad(
  App: AppContainer,
  doc: Document,
  toast: ProjectDragDropToastFn,
  e: Event
): Promise<void> {
  clearProjectDragOverClass(doc);
  const ev = e instanceof DragEvent ? e : null;
  const files = ev?.dataTransfer?.files ?? null;
  const file = readDroppedProjectFile(files);
  if (!file) return;
  const fileName = typeof file.name === 'string' ? file.name : '';
  if (!fileName.toLowerCase().endsWith('.json')) {
    toast('אנא גרור קובץ פרויקט (JSON) בלבד.', 'error');
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  await runProjectLoadAction(App, { toast }, file, { fallbackMessage: 'טעינת קובץ נכשלה' });
}
