import type { ProjectActionExecutionArgsBase } from './project_action_execution_shared.js';
import {
  reportProjectActionObserverError,
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
  const { feedback, run, report, buildError, fallbackMessage, onReportError } = args;
  try {
    let result: Result;
    try {
      result = await run();
    } catch (error) {
      result = buildError(error, fallbackMessage);
    }

    try {
      report(feedback, result);
    } catch (error) {
      reportProjectActionObserverError(error, onReportError);
    }
    return result;
  } finally {
    runProjectActionFinally(args.finally);
  }
}
