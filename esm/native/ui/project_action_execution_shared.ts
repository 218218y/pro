import { readProjectLoadInputTarget, resetProjectLoadInputTarget } from './project_load_input_shared.js';

export type ProjectActionReporter<Feedback, Result> = (feedback: Feedback, result: Result) => unknown;

export type ProjectActionErrorBuilder<Result> = (error: unknown, fallbackMessage: string) => Result;

export type ProjectActionExecutionArgsBase<Feedback, Result> = {
  feedback: Feedback;
  report: ProjectActionReporter<Feedback, Result>;
  buildError: ProjectActionErrorBuilder<Result>;
  fallbackMessage: string;
  finally?: (() => void) | null;
};

export function runProjectActionFinally(handler?: (() => void) | null): void {
  if (typeof handler !== 'function') return;
  handler();
}

export function clearProjectLoadInputEventTarget(eventLike: unknown): void {
  resetProjectLoadInputTarget(readProjectLoadInputTarget(eventLike));
}

export function reportProjectActionResult<Feedback, Result>(
  feedback: Feedback,
  result: Result,
  report: ProjectActionReporter<Feedback, Result>
): Result {
  report(feedback, result);
  return result;
}

export function buildProjectActionErrorResultFromThrown<Feedback, Result>(
  feedback: Feedback,
  error: unknown,
  report: ProjectActionReporter<Feedback, Result>,
  buildError: ProjectActionErrorBuilder<Result>,
  fallbackMessage: string
): Result {
  const result = buildError(error, fallbackMessage);
  return reportProjectActionResult(feedback, result, report);
}
