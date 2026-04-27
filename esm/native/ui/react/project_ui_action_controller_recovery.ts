import type { CreateProjectUiActionControllerArgs } from './project_ui_action_controller_shared.js';

import { runProjectResetDefaultAction, runProjectRestoreAction } from '../project_recovery_runtime.js';
import { buildPerfEntryOptionsFromActionResult, runPerfAction } from '../../services/api.js';
import { publishProjectUiActionEvent } from './project_ui_action_events.js';

export async function runProjectUiRestoreLastSession(
  args: Pick<CreateProjectUiActionControllerArgs, 'app' | 'fb' | 'restoreLastSession'>
): Promise<void> {
  const { app, fb, restoreLastSession } = args;
  const result = await runPerfAction(
    app,
    'project.restoreLastSession',
    () => runProjectRestoreAction(app, fb, restoreLastSession),
    {
      resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
    }
  );
  publishProjectUiActionEvent(app, 'restore-last-session', result);
}

export async function runProjectUiResetToDefault(
  args: Pick<CreateProjectUiActionControllerArgs, 'app' | 'fb' | 'resetToDefaultProject'>
): Promise<void> {
  const { app, fb, resetToDefaultProject } = args;
  const result = await runPerfAction(
    app,
    'project.resetDefault',
    () => runProjectResetDefaultAction(app, fb, resetToDefaultProject),
    {
      resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
    }
  );
  publishProjectUiActionEvent(app, 'reset-default', result);
}
