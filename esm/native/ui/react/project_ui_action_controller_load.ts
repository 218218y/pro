import type {
  CreateProjectUiActionControllerArgs,
  ProjectInputRefLike,
} from './project_ui_action_controller_shared.js';

import { openProjectLoadInputTarget, runProjectLoadActionResult } from '../project_load_runtime.js';
import { buildPerfEntryOptionsFromActionResult, runPerfAction } from '../../services/api.js';
import { buildProjectLoadFailureResult } from '../../services/api.js';
import { clearProjectLoadInputEventTarget } from '../project_action_execution.js';
import { runProjectLoadActionSingleFlight } from '../project_load_action_singleflight.js';
import { readProjectLoadFlightKey } from '../project_load_runtime_shared.js';
import { publishProjectUiActionEvent } from './project_ui_action_events.js';

export function openProjectLoadInput(ref: ProjectInputRefLike | null | undefined): void {
  openProjectLoadInputTarget(ref?.current ?? null);
}

export async function runProjectUiLoadInputChange(
  args: Pick<CreateProjectUiActionControllerArgs, 'app' | 'fb' | 'loadFromFileEvent'>,
  evt: unknown
): Promise<void> {
  const { app, fb, loadFromFileEvent } = args;
  const fallbackMessage = 'טעינת קובץ נכשלה';
  const runLoad = () =>
    runPerfAction(
      app,
      'project.load',
      () =>
        runProjectLoadActionResult(fb, () => loadFromFileEvent(app, evt), {
          clearInputTargetFrom: evt,
          fallbackMessage,
        }),
      {
        resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
      }
    );
  const result = await runProjectLoadActionSingleFlight({
    app,
    key: readProjectLoadFlightKey(evt),
    run: runLoad,
    onBusy: () =>
      runProjectLoadActionResult(fb, () => buildProjectLoadFailureResult('busy'), {
        clearInputTargetFrom: evt,
        fallbackMessage,
      }),
    onReuse: () => clearProjectLoadInputEventTarget(evt),
  });
  publishProjectUiActionEvent(app, 'load', result);
}
