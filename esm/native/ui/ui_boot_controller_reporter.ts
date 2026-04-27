import { reportError } from '../services/api.js';
import type { AppContainer } from '../../../types';
import type { UiBootReporterLike } from './ui_boot_controller_shared.js';

export function createUiBootReporter(App: AppContainer): UiBootReporterLike {
  const soft = (op: string, err: unknown): void => {
    try {
      reportError(App, err, { where: 'native/ui/boot_main', op, fatal: false });
    } catch (_) {
      try {
        console.warn(`[WardrobePro][boot_main] ${op}`, err);
      } catch (_) {}
    }
  };

  const hard = (op: string, err: unknown): void => {
    try {
      reportError(App, err, { where: 'native/ui/boot_main', op, fatal: true });
      return;
    } catch (_) {
      try {
        soft(op, err);
      } catch (_) {}
    }
  };

  const toBootError = (op: string, message: string, cause?: unknown): Error => {
    const err = new Error(message);
    try {
      Reflect.set(err, 'cause', cause);
    } catch {
      // ignore
    }
    try {
      Reflect.set(err, '__wpBootOp', op);
    } catch {
      // ignore
    }
    return err;
  };

  const throwHard = (op: string, message: string, cause?: unknown): never => {
    const err = cause instanceof Error ? cause : toBootError(op, message, cause);
    hard(op, err);
    throw err;
  };

  return {
    soft,
    hard,
    toBootError,
    throwHard,
  };
}
