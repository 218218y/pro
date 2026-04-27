import type { AppContainer } from '../../../types';

export type ProjectActionFamilyKey = 'save' | 'load' | 'restore' | 'reset';

export type ProjectActionFlightKey = string | null;

type ProjectActionFamilyState = {
  key: ProjectActionFamilyKey;
  token: symbol;
  dedupeKey: ProjectActionFlightKey;
  promise: Promise<unknown> | null;
};

const projectActionFamilyStates = new WeakMap<AppContainer, ProjectActionFamilyState>();

export type BeginProjectActionFamilyResult =
  | { status: 'started'; release: () => void }
  | { status: 'reused' }
  | { status: 'busy'; active: ProjectActionFamilyKey };

export type BeginProjectActionFamilyFlightResult<Result> =
  | { status: 'started'; promise: Promise<Result> }
  | { status: 'reused'; promise: Promise<Result> }
  | { status: 'busy'; active: ProjectActionFamilyKey };

function normalizeProjectActionFlightKey(value: unknown): ProjectActionFlightKey {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readProjectActionState(app: AppContainer): ProjectActionFamilyState | null {
  return projectActionFamilyStates.get(app) || null;
}

function releaseProjectActionState(app: AppContainer, token: symbol): void {
  const current = readProjectActionState(app);
  if (current?.token === token) projectActionFamilyStates.delete(app);
}

function readReusableProjectActionPromise<Result>(
  state: ProjectActionFamilyState,
  key: ProjectActionFamilyKey,
  dedupeKey: ProjectActionFlightKey
): Promise<Result> | null {
  if (
    state.key !== key ||
    !dedupeKey ||
    !state.dedupeKey ||
    state.dedupeKey !== dedupeKey ||
    !state.promise
  ) {
    return null;
  }
  return state.promise as Promise<Result>;
}

function startProjectActionState(
  app: AppContainer,
  key: ProjectActionFamilyKey
): {
  state: ProjectActionFamilyState;
  release: () => void;
} {
  const token = Symbol(key);
  const state: ProjectActionFamilyState = {
    key,
    token,
    dedupeKey: null,
    promise: null,
  };
  projectActionFamilyStates.set(app, state);
  return {
    state,
    release: () => releaseProjectActionState(app, token),
  };
}

export function beginProjectActionFamily(
  app: AppContainer,
  key: ProjectActionFamilyKey
): BeginProjectActionFamilyResult {
  const active = readProjectActionState(app);
  if (active) {
    if (active.key === key) return { status: 'reused' };
    return { status: 'busy', active: active.key };
  }

  const { release } = startProjectActionState(app, key);
  return {
    status: 'started',
    release,
  };
}

export function beginProjectActionFamilyFlight<Result>(args: {
  app: AppContainer;
  key: ProjectActionFamilyKey;
  dedupeKey?: string | null | undefined;
  run: () => Promise<Result>;
}): BeginProjectActionFamilyFlightResult<Result> {
  const { app, key, run } = args;
  const dedupeKey = normalizeProjectActionFlightKey(args.dedupeKey);
  const active = readProjectActionState(app);
  if (active) {
    const reusablePromise = readReusableProjectActionPromise<Result>(active, key, dedupeKey);
    if (reusablePromise) {
      return { status: 'reused', promise: reusablePromise };
    }
    return { status: 'busy', active: active.key };
  }

  const { state, release } = startProjectActionState(app, key);
  state.dedupeKey = dedupeKey;
  let started: Result | Promise<Result>;
  try {
    started = run();
  } catch (error) {
    const promise = Promise.reject(error).finally(() => {
      release();
    });
    state.promise = promise;
    return { status: 'started', promise };
  }
  const promise = Promise.resolve(started).finally(() => {
    release();
  });
  state.promise = promise;
  return { status: 'started', promise };
}

export function readProjectActionFamilyActiveKey(app: AppContainer): ProjectActionFamilyKey | null {
  return readProjectActionState(app)?.key || null;
}
