import type { AppContainer } from '../../../../types';

import {
  asProjectFileLoadEvent,
  asClickable,
  openProjectLoadInputTarget,
  runProjectLoadAction,
} from '../project_load_runtime.js';
import type { ProjectSaveLoadToastFn } from './project_save_load_controller_shared.js';

export function openProjectSaveLoadInput(input: unknown): void {
  openProjectLoadInputTarget(input);
}

export async function handleProjectSaveLoadInputChange(
  App: AppContainer,
  toast: ProjectSaveLoadToastFn | null | undefined,
  evt: Event | unknown
): Promise<void> {
  await runProjectLoadAction(App, { toast }, asProjectFileLoadEvent(evt) ?? evt, {
    clearInputTargetFrom: evt,
    fallbackMessage: 'טעינת קובץ נכשלה',
  });
}

export { asProjectFileLoadEvent, asClickable };
