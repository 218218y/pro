import type { AppContainer } from '../../../types';

import { runAppConfirmedActionFamilySingleFlight } from './confirmed_action_family_runtime.js';
import type { AppActionFamilyFlight } from './action_family_singleflight.js';

export type ProjectSessionConfirmCopy = {
  title: string;
  message: string;
  fallbackMessage: string;
};

export const PROJECT_RESTORE_SESSION_CONFIRM: ProjectSessionConfirmCopy = {
  title: 'שחזור עריכה',
  message: 'האם לטעון את העריכה האחרונה שנשמרה בזיכרון? (העריכה הנוכחית תוחלף)',
  fallbackMessage: 'שחזור העריכה נכשל',
};

export const PROJECT_RESET_DEFAULT_CONFIRM: ProjectSessionConfirmCopy = {
  title: 'איפוס לארון ברירת מחדל',
  message: 'לאפס עכשיו לארון נקי (ברירת מחדל)? העיצוב הנוכחי יוחלף.',
  fallbackMessage: 'האיפוס נכשל',
};

type ProjectSessionConfirmedResult = {
  ok: boolean;
  reason?: string;
  message?: string;
  pending?: true;
  restoreGen?: number;
};

type ProjectSessionCommandKey = 'restore' | 'reset';

const projectSessionCommandFlights = new WeakMap<
  object,
  AppActionFamilyFlight<ProjectSessionConfirmedResult, ProjectSessionCommandKey>
>();

export async function runProjectSessionConfirmedAction<Result extends ProjectSessionConfirmedResult>(args: {
  app: AppContainer;
  key: ProjectSessionCommandKey;
  copy: ProjectSessionConfirmCopy;
  buildError: (message: string, fallbackMessage: string) => Result;
  onCancelled: () => Result;
  onBusy: () => Result;
  runConfirmed: () => Result | Promise<Result>;
}): Promise<Result> {
  const { app, key, copy, buildError, onCancelled, onBusy, runConfirmed } = args;
  return await runAppConfirmedActionFamilySingleFlight<Result, ProjectSessionCommandKey>({
    flights: projectSessionCommandFlights as WeakMap<
      object,
      AppActionFamilyFlight<Result, ProjectSessionCommandKey>
    >,
    app,
    key,
    title: copy.title,
    message: copy.message,
    onRequestError: message => buildError(message, copy.fallbackMessage),
    onCancelled,
    runConfirmed,
    onBusy,
  });
}
