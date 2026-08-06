import type { AppContainer } from '../../../types';

import { reportServiceNonFatal } from './service_error_observability.js';

const EDIT_STATE_WHERE = 'native/services/edit_state';

export function reportEditStateNonFatal(
  App: AppContainer | null | undefined,
  op: string,
  error: unknown,
  consoleOutput = false
): void {
  reportServiceNonFatal(App, error, { where: EDIT_STATE_WHERE, op }, { consoleOutput });
}

export function createEditStateOperationRejectedError(op: string): Error {
  return new Error(`[edit_state] ${op} was rejected by its canonical owner`);
}
