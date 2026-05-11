// UI interactions: project save/load (Pure ESM)
//
// Goal:
// - Keep save/load logic out of ui/wiring.
// - Preserve current behavior:
//   - Save triggers exportCurrentProject() -> prompt for file name -> download JSON.
//   - After successful save, mark project as clean.
//   - Load triggers hidden file input and forwards the change event to projectIO.
// - Provide a single installer that binds DOM buttons and ensures App.actions.saveProject exists.

import type { AppContainer } from '../../../../types';
import {
  getSaveProjectAction,
  saveProjectResultViaActions,
  saveProjectViaActions,
  setSaveProjectAction,
} from '../../services/api.js';
import {
  createProjectSaveLoadInteractionController,
  type ProjectSaveLoadRuntimeDeps,
} from './project_save_load_controller_runtime.js';

type EventHostLike = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
type RecordLike = Record<string, unknown>;

function isRecord(v: unknown): v is RecordLike {
  return !!v && typeof v === 'object';
}

function readEventListenerMethod(
  owner: RecordLike,
  key: 'addEventListener' | 'removeEventListener'
): EventHostLike[typeof key] | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (...args: Parameters<EventHostLike['addEventListener']>) => Reflect.apply(value, owner, args);
}

function asEventHost(v: unknown): EventHostLike | null {
  if (!isRecord(v)) return null;
  const addEventListener = readEventListenerMethod(v, 'addEventListener');
  const removeEventListener = readEventListenerMethod(v, 'removeEventListener');
  if (!addEventListener || !removeEventListener) return null;
  return {
    addEventListener: (...args) => Reflect.apply(addEventListener, v, args),
    removeEventListener: (...args) => Reflect.apply(removeEventListener, v, args),
  };
}

export type ProjectSaveLoadDeps = {
  $: (id: string) => HTMLElement | null;
  win: Window | null;
  doc: Document | null;
  toast: (msg: string, type?: string) => void;
};

export function ensureSaveProjectAction(App: AppContainer, deps: Partial<ProjectSaveLoadDeps>): void {
  const runtimeDeps: ProjectSaveLoadRuntimeDeps = {
    win: deps?.win ?? null,
    doc: deps?.doc ?? null,
    toast:
      typeof deps?.toast === 'function'
        ? deps.toast
        : (msg: string, type?: string) => {
            try {
              console.log('[toast]', type || 'info', msg);
            } catch {
              // ignore debug toast logging failures
            }
          },
  };

  createProjectSaveLoadInteractionController(App, runtimeDeps, {
    getSaveProjectAction,
    setSaveProjectAction,
    saveProjectResultViaActions,
    saveProjectViaActions,
  }).ensureSaveProjectAction();
}

export function installProjectSaveLoad(App: AppContainer, deps: Partial<ProjectSaveLoadDeps>): () => void {
  if (!App || typeof App !== 'object') return () => undefined;

  const $ = typeof deps?.$ === 'function' ? deps.$ : () => null;
  const runtimeDeps: ProjectSaveLoadRuntimeDeps = {
    win: deps?.win ?? null,
    doc: deps?.doc ?? null,
    toast: typeof deps?.toast === 'function' ? deps.toast : (_msg: string, _type?: string) => undefined,
  };

  const controller = createProjectSaveLoadInteractionController(App, runtimeDeps, {
    getSaveProjectAction,
    setSaveProjectAction,
    saveProjectResultViaActions,
    saveProjectViaActions,
  });
  controller.ensureSaveProjectAction();

  const saveProjectBtn = $('saveProjectBtn');
  const headerSaveBtn = $('headerSaveBtn');
  const loadProjectBtn = $('loadProjectBtn');
  const loadProjectInput = $('loadProjectInput');

  const add = (
    el: unknown,
    type: string,
    handler: EventListener,
    opts?: boolean | AddEventListenerOptions
  ): (() => void) => {
    try {
      const host = asEventHost(el);
      if (!host) return () => undefined;
      host.addEventListener(type, handler, opts);
      return () => {
        try {
          host.removeEventListener(type, handler, opts);
        } catch {
          // ignore detach failures
        }
      };
    } catch {
      return () => undefined;
    }
  };

  const removers: Array<() => void> = [];

  if (saveProjectBtn)
    removers.push(add(saveProjectBtn, 'click', () => controller.performSave(), { passive: false }));
  if (headerSaveBtn)
    removers.push(add(headerSaveBtn, 'click', () => controller.performSave(), { passive: false }));

  if (loadProjectBtn)
    removers.push(
      add(
        loadProjectBtn,
        'click',
        function () {
          controller.openLoadInput(loadProjectInput);
        },
        { passive: false }
      )
    );

  if (loadProjectInput)
    removers.push(
      add(
        loadProjectInput,
        'change',
        async function (e: Event) {
          await controller.handleLoadInputChange(e);
        },
        { passive: false }
      )
    );

  return () => {
    for (const fn of removers) {
      try {
        fn();
      } catch {
        // ignore disposer failures
      }
    }
  };
}
