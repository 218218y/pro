import type { ProjectActionExecutionArgsBase } from './project_action_execution_shared.js';
import {
  buildProjectActionErrorResultFromThrown,
  reportProjectActionResult,
  runProjectActionFinally,
} from './project_action_execution_shared.js';

export type ProjectActionExecutionArgs<Feedback, Result> = ProjectActionExecutionArgsBase<
  Feedback,
  Result
> & {
  run: () => Result;
};

export function executeProjectActionResult<Feedback, Result>(
  args: ProjectActionExecutionArgs<Feedback, Result>
): Result {
  const { feedback, run, report, buildError, fallbackMessage } = args;
  try {
    return reportProjectActionResult(feedback, run(), report);
  } catch (error) {
    return buildProjectActionErrorResultFromThrown(feedback, error, report, buildError, fallbackMessage);
  } finally {
    runProjectActionFinally(args.finally);
  }
}
