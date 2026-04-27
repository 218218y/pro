import type { ProjectActionExecutionArgsBase } from './project_action_execution_shared.js';
import {
  buildProjectActionErrorResultFromThrown,
  reportProjectActionResult,
  runProjectActionFinally,
} from './project_action_execution_shared.js';

export type AsyncProjectActionExecutionArgs<Feedback, Result> = ProjectActionExecutionArgsBase<
  Feedback,
  Result
> & {
  run: () => Result | Promise<Result>;
};

export async function executeAsyncProjectActionResult<Feedback, Result>(
  args: AsyncProjectActionExecutionArgs<Feedback, Result>
): Promise<Result> {
  const { feedback, run, report, buildError, fallbackMessage } = args;
  try {
    return reportProjectActionResult(feedback, await run(), report);
  } catch (error) {
    return buildProjectActionErrorResultFromThrown(feedback, error, report, buildError, fallbackMessage);
  } finally {
    runProjectActionFinally(args.finally);
  }
}
