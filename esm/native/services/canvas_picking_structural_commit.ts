import type { ActionMetaLike, AppContainer, ModuleConfigLike, ModuleStackPatchKey } from '../../../types';

import { getModulesActionFn } from '../runtime/actions_access_domains.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_support_errors.js';

type StructuralMutationResult = boolean | void;

export type CanvasModuleStructuralPatchOutcome = {
  committed: boolean;
  changed: boolean;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneStructuralValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(entry => cloneStructuralValue(entry)) as T;
  if (!isPlainRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) out[key] = cloneStructuralValue(value[key]);
  return out as T;
}

function readStructuralIdentity(value: unknown): string | null {
  if (!isPlainRecord(value)) return null;
  for (const key of ['id', 'key', 'uid']) {
    const identity = value[key];
    if (typeof identity === 'string' && identity) return `${key}:string:${identity}`;
    if (typeof identity === 'number' && Number.isFinite(identity)) return `${key}:number:${identity}`;
  }
  return null;
}

function reconcileStructuralValue(target: unknown, next: unknown): unknown {
  if (Array.isArray(target) && Array.isArray(next)) {
    const currentEntries = [...target];
    const used = new Set<number>();
    const reconciled = next.map((nextEntry, index) => {
      const identity = readStructuralIdentity(nextEntry);
      let currentIndex = -1;
      if (identity) {
        currentIndex = currentEntries.findIndex(
          (entry, candidateIndex) => !used.has(candidateIndex) && readStructuralIdentity(entry) === identity
        );
      }
      if (currentIndex < 0 && index < currentEntries.length && !used.has(index)) currentIndex = index;
      if (currentIndex < 0) return cloneStructuralValue(nextEntry);
      used.add(currentIndex);
      return reconcileStructuralValue(currentEntries[currentIndex], nextEntry);
    });
    target.splice(0, target.length, ...reconciled);
    return target;
  }

  if (isPlainRecord(target) && isPlainRecord(next)) {
    for (const key of Object.keys(target)) {
      if (!Object.prototype.hasOwnProperty.call(next, key)) delete target[key];
    }
    for (const key of Object.keys(next)) {
      target[key] = reconcileStructuralValue(target[key], next[key]);
    }
    return target;
  }

  return cloneStructuralValue(next);
}

function replaceRecordContents(target: ModuleConfigLike, next: ModuleConfigLike): void {
  reconcileStructuralValue(target, next);
}

function reportStructuralCommitFailure(
  App: AppContainer,
  op: string,
  error: unknown,
  throttleMs = 1000
): void {
  __wp_reportPickingIssue(App, error, {
    where: 'canvasPicking.structuralCommit',
    op,
    throttleMs,
  });
}

export function commitCanvasModuleStructuralPatch(args: {
  App: AppContainer;
  stack: 'top' | 'bottom';
  moduleKey: ModuleStackPatchKey;
  mutate: (cfg: ModuleConfigLike) => StructuralMutationResult;
  meta: ActionMetaLike;
  op: string;
}): CanvasModuleStructuralPatchOutcome {
  const { App, stack, moduleKey, mutate, meta, op } = args;
  const patchForStack = getModulesActionFn<
    (
      stack: string,
      moduleKey: ModuleStackPatchKey,
      patchOrPatchFn: (cfg: ModuleConfigLike) => void,
      meta?: ActionMetaLike
    ) => unknown
  >(App, 'patchForStack');

  if (typeof patchForStack !== 'function') {
    reportStructuralCommitFailure(
      App,
      `${op}.writerUnavailable`,
      new Error('[WardrobePro][canvasPicking] actions.modules.patchForStack is unavailable.')
    );
    return { committed: false, changed: false };
  }

  let invocationCount = 0;
  let changed = false;
  let mutationError: unknown = null;
  let targetRef: ModuleConfigLike | null = null;
  let originalSnapshot: ModuleConfigLike | null = null;

  const restoreTarget = (): void => {
    if (targetRef && originalSnapshot) replaceRecordContents(targetRef, originalSnapshot);
  };

  const guardedMutation = (cfg: ModuleConfigLike): void => {
    invocationCount += 1;
    if (invocationCount > 1) {
      mutationError = new Error(
        '[WardrobePro][canvasPicking] structural patch callback invoked more than once.'
      );
      return;
    }
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
      mutationError = new Error(
        '[WardrobePro][canvasPicking] structural patch callback received invalid config.'
      );
      return;
    }

    targetRef = cfg;
    originalSnapshot = cloneStructuralValue(cfg);
    const draft = cloneStructuralValue(cfg);
    try {
      const mutationResult = mutate(draft);
      if (mutationResult === false) return;
      replaceRecordContents(cfg, draft);
      changed = true;
    } catch (error) {
      mutationError = error;
    }
  };

  let actionResult: unknown;
  try {
    actionResult = patchForStack(stack, moduleKey, guardedMutation, meta);
  } catch (error) {
    restoreTarget();
    reportStructuralCommitFailure(App, `${op}.writerThrow`, error);
    return { committed: false, changed: false };
  }

  if (mutationError) {
    restoreTarget();
    reportStructuralCommitFailure(App, `${op}.mutation`, mutationError);
    return { committed: false, changed: false };
  }
  if (invocationCount === 0) {
    reportStructuralCommitFailure(
      App,
      `${op}.writerRejected`,
      new Error('[WardrobePro][canvasPicking] structural writer did not execute its mutation callback.')
    );
    return { committed: false, changed: false };
  }
  if (actionResult === false) {
    restoreTarget();
    reportStructuralCommitFailure(
      App,
      `${op}.writerRejected`,
      new Error('[WardrobePro][canvasPicking] structural writer rejected the mutation.')
    );
    return { committed: false, changed: false };
  }

  return { committed: true, changed };
}

export function commitCanvasModuleStructuralReplacement(args: {
  App: AppContainer;
  stack: 'top' | 'bottom';
  moduleKey: ModuleStackPatchKey;
  nextConfig: object;
  meta: ActionMetaLike;
  op: string;
}): boolean {
  const { App, stack, moduleKey, nextConfig, meta, op } = args;
  const patchForStack = getModulesActionFn<
    (stack: string, moduleKey: ModuleStackPatchKey, patchOrPatchFn: unknown, meta?: ActionMetaLike) => unknown
  >(App, 'patchForStack');

  if (!isPlainRecord(nextConfig)) {
    reportStructuralCommitFailure(
      App,
      `${op}.invalidReplacement`,
      new Error('[WardrobePro][canvasPicking] structural replacement must be a plain config record.')
    );
    return false;
  }

  if (typeof patchForStack !== 'function') {
    reportStructuralCommitFailure(
      App,
      `${op}.writerUnavailable`,
      new Error('[WardrobePro][canvasPicking] actions.modules.patchForStack is unavailable.')
    );
    return false;
  }

  try {
    const result = patchForStack(stack, moduleKey, cloneStructuralValue(nextConfig), meta);
    if (result === false) {
      reportStructuralCommitFailure(
        App,
        `${op}.writerRejected`,
        new Error('[WardrobePro][canvasPicking] structural replacement writer rejected the config.')
      );
      return false;
    }
    return true;
  } catch (error) {
    reportStructuralCommitFailure(App, `${op}.writerThrow`, error);
    return false;
  }
}

export function readCanvasModuleConfigForStack(args: {
  App: AppContainer;
  stack: 'top' | 'bottom';
  moduleKey: ModuleStackPatchKey;
  op: string;
}): ModuleConfigLike | null {
  const ensureForStack = getModulesActionFn<
    (stack: string, moduleKey: ModuleStackPatchKey) => ModuleConfigLike | null
  >(args.App, 'ensureForStack');
  if (typeof ensureForStack !== 'function') {
    reportStructuralCommitFailure(
      args.App,
      `${args.op}.readerUnavailable`,
      new Error('[WardrobePro][canvasPicking] actions.modules.ensureForStack is unavailable.'),
      2000
    );
    return null;
  }
  try {
    const cfg = ensureForStack(args.stack, args.moduleKey);
    if (cfg == null) return null;
    if (typeof cfg !== 'object' || Array.isArray(cfg)) {
      reportStructuralCommitFailure(
        args.App,
        `${args.op}.invalidConfig`,
        new Error('[WardrobePro][canvasPicking] structural reader returned an invalid config.'),
        2000
      );
      return null;
    }
    return cfg;
  } catch (error) {
    reportStructuralCommitFailure(args.App, `${args.op}.readConfig`, error, 2000);
    return null;
  }
}
