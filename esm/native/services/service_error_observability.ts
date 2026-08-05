import type { AppContainer } from '../../../types';

import { reportError } from '../runtime/errors.js';

export type ServiceNonFatalContext = {
  where: string;
  op?: string;
};

export type ServiceNonFatalOptions = {
  consoleOutput?: boolean;
};

export function reportServiceNonFatal(
  App: AppContainer | null | undefined,
  error: unknown,
  context: ServiceNonFatalContext,
  options: ServiceNonFatalOptions = {}
): void {
  reportError(
    App,
    error,
    { ...context, fatal: false },
    typeof options.consoleOutput === 'boolean' ? { consoleOutput: options.consoleOutput } : undefined
  );
}
