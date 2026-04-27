import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export function loadProjectSaveLoadControllerModule(overrides = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/interactions/project_save_load_controller_runtime.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === '../project_load_runtime.js') {
      const inflightLoads = new Map();
      const readKey = value => {
        const evt = value && typeof value === 'object' ? value : null;
        const target = evt && (evt.currentTarget || evt.target) ? evt.currentTarget || evt.target : null;
        const file =
          target && target.files && typeof target.files.length === 'number' && target.files.length
            ? target.files[0]
            : null;
        if (file) {
          const name = typeof file.name === 'string' ? file.name : '';
          const size = typeof file.size === 'number' ? String(file.size) : '';
          const type = typeof file.type === 'string' ? file.type : '';
          const lastModified = typeof file.lastModified === 'number' ? String(file.lastModified) : '';
          if (name || size || type || lastModified)
            return `file:${[name, size, type, lastModified].join('|')}`;
        }
        const inputValue = target && typeof target.value === 'string' ? target.value.trim() : '';
        return inputValue ? `target:${inputValue}` : null;
      };
      const clearTarget = evt => {
        const target = (evt && typeof evt === 'object' && (evt.currentTarget || evt.target)) || null;
        try {
          if (target && typeof target === 'object' && 'value' in target) target.value = '';
        } catch {}
      };
      const runLoad = async (_app, feedback, eventOrFile, options) => {
        try {
          const loadEvent = eventOrFile && typeof eventOrFile === 'object' ? { ...eventOrFile } : null;
          const result = await (overrides.api?.handleProjectFileLoadViaService
            ? overrides.api.handleProjectFileLoadViaService(_app, loadEvent ?? eventOrFile)
            : { ok: !!eventOrFile, pending: false });
          overrides.feedback.reportProjectLoadResult(feedback, result);
          return result;
        } catch (error) {
          const result = {
            ok: false,
            reason: 'error',
            message:
              error && typeof error === 'object' && typeof error.message === 'string' && error.message
                ? error.message
                : options?.fallbackMessage || 'טעינת קובץ נכשלה',
          };
          overrides.feedback.reportProjectLoadResult(feedback, result);
          return result;
        } finally {
          const evt = Object.prototype.hasOwnProperty.call(options || {}, 'clearInputTargetFrom')
            ? options?.clearInputTargetFrom
            : eventOrFile;
          clearTarget(evt);
        }
      };
      return {
        asProjectFileLoadEvent: value => (value && typeof value === 'object' ? { ...value } : null),
        asClickable: value =>
          value && typeof value === 'object' && typeof value.click === 'function'
            ? { click: () => value.click() }
            : null,
        openProjectLoadInputTarget: input => {
          try {
            if (input && typeof input === 'object' && typeof input.click === 'function') input.click();
          } catch {}
        },
        runProjectLoadAction: async (_app, feedback, eventOrFile, options) => {
          const key = readKey(eventOrFile);
          const active = key ? inflightLoads.get(key) : null;
          if (active) {
            const evt = Object.prototype.hasOwnProperty.call(options || {}, 'clearInputTargetFrom')
              ? options?.clearInputTargetFrom
              : eventOrFile;
            clearTarget(evt);
            return await active;
          }
          if (key && inflightLoads.size) {
            const result = { ok: false, reason: 'busy' };
            overrides.feedback.reportProjectLoadResult(feedback, result);
            const evt = Object.prototype.hasOwnProperty.call(options || {}, 'clearInputTargetFrom')
              ? options?.clearInputTargetFrom
              : eventOrFile;
            clearTarget(evt);
            return result;
          }
          let pending = null;
          pending = Promise.resolve()
            .then(() => runLoad(_app, feedback, eventOrFile, options))
            .finally(() => {
              if (key && inflightLoads.get(key) === pending) inflightLoads.delete(key);
            });
          if (key) inflightLoads.set(key, pending);
          return await pending;
        },
      };
    }
    if (specifier === '../project_save_runtime.js') {
      return {
        asUiFeedbackPrompt: value => {
          if (!value || typeof value !== 'object') return null;
          const openCustomPrompt =
            typeof value.openCustomPrompt === 'function' ? value.openCustomPrompt.bind(value) : undefined;
          const prompt = typeof value.prompt === 'function' ? value.prompt.bind(value) : undefined;
          return openCustomPrompt || prompt ? { openCustomPrompt, prompt } : null;
        },
        runEnsureSaveProjectAction: (App, deps) => {
          const { win, doc, toast } = deps;
          try {
            const uiFb = overrides.api?.getUiFeedback ? overrides.api.getUiFeedback(App) : null;
            const promptFn =
              (uiFb && (uiFb.openCustomPrompt || uiFb.prompt)) ||
              ((title, def, cb) => {
                if (!win || typeof win.prompt !== 'function') throw new Error('שמירה לא זמינה כרגע (prompt)');
                cb(win.prompt(title, def));
              });
            return function saveProject() {
              const exportResult = overrides.api?.exportProjectResultViaService
                ? overrides.api.exportProjectResultViaService(
                    App,
                    { source: 'ui:saveProject' },
                    'אירעה שגיאה בעת ייצוא הפרויקט'
                  )
                : { ok: false, reason: 'not-installed' };
              if (exportResult.ok === false) {
                if (exportResult.reason === 'not-installed' || exportResult.reason === 'invalid') {
                  return {
                    ok: false,
                    reason: exportResult.reason,
                    message: exportResult.message || 'שמירה לא זמינה כרגע (exportCurrentProject)',
                  };
                }
                return { ok: false, reason: 'error', message: exportResult.message };
              }
              const exported = exportResult.exported;
              const defaultName =
                (typeof exported.defaultBaseName === 'string' && exported.defaultBaseName.trim()) ||
                'wardrobe_project_' + new Date().toISOString().slice(0, 10);
              promptFn('בחר שם לקובץ השמירה:', defaultName, fileName => {
                if (!fileName || !String(fileName).trim()) {
                  queueMicrotask(() =>
                    overrides.feedback.reportProjectSaveResult({ toast }, { ok: false, reason: 'cancelled' })
                  );
                  return;
                }
                try {
                  const trimmed = String(fileName).trim();
                  const normalizedFileName = overrides.browser.normalizeDownloadFilename(
                    trimmed,
                    defaultName,
                    '.json'
                  );
                  const downloadResult = overrides.browser.downloadJsonTextResultViaBrowser(
                    { docMaybe: doc, winMaybe: win },
                    normalizedFileName,
                    exported.jsonStr
                  );
                  if (downloadResult.ok === false) {
                    queueMicrotask(() =>
                      overrides.feedback.reportProjectSaveResult(
                        { toast },
                        { ok: false, reason: downloadResult.reason, message: downloadResult.message }
                      )
                    );
                    return;
                  }
                  try {
                    const meta = overrides.api?.metaUiOnly
                      ? overrides.api.metaUiOnly(App, undefined, 'saveProject')
                      : null;
                    overrides.api?.setDirtyViaActions?.(App, false, meta);
                  } catch {}
                  queueMicrotask(() => overrides.feedback.reportProjectSaveResult({ toast }, { ok: true }));
                } catch (error) {
                  queueMicrotask(() =>
                    overrides.feedback.reportProjectSaveResult(
                      { toast },
                      {
                        ok: false,
                        reason: 'error',
                        message:
                          error &&
                          typeof error === 'object' &&
                          typeof error.message === 'string' &&
                          error.message
                            ? error.message
                            : 'אירעה שגיאה בעת השמירה',
                      }
                    )
                  );
                }
              });
              return { ok: true, pending: true };
            };
          } catch (error) {
            const result = {
              ok: false,
              reason: 'error',
              message:
                error && typeof error === 'object' && typeof error.message === 'string' && error.message
                  ? error.message
                  : 'שמירה נכשלה',
            };
            overrides.feedback.reportProjectSaveResult({ toast }, result);
            return null;
          }
        },
      };
    }

    if (specifier === './project_save_load_controller_load.js') {
      const loadRuntime = localRequire('../project_load_runtime.js');
      return {
        asProjectFileLoadEvent: loadRuntime.asProjectFileLoadEvent,
        asClickable: loadRuntime.asClickable,
        openProjectSaveLoadInput: input => loadRuntime.openProjectLoadInputTarget(input),
        handleProjectSaveLoadInputChange: async (App, toast, evt) =>
          await loadRuntime.runProjectLoadAction(
            App,
            { toast },
            loadRuntime.asProjectFileLoadEvent(evt) ?? evt,
            {
              clearInputTargetFrom: evt,
              fallbackMessage: 'טעינת קובץ נכשלה',
            }
          ),
      };
    }
    if (specifier === './project_save_load_controller_save.js') {
      const execution = localRequire('../project_action_execution.js');
      const feedback = localRequire('../project_action_feedback.js');
      const api = localRequire('../../services/api.js');
      const saveRuntime = localRequire('../project_save_runtime.js');
      return {
        ensureProjectSaveLoadAction: (App, deps, actions) => {
          if (!App || typeof App !== 'object') return;
          if (typeof actions.getSaveProjectAction(App) === 'function') return;
          const saveProject = saveRuntime.runEnsureSaveProjectAction(App, deps);
          if (typeof saveProject === 'function') actions.setSaveProjectAction(App, saveProject);
        },
        performProjectSaveLoadSave: (App, toast, actions) =>
          execution.executeProjectActionResult({
            feedback: { toast },
            run: () =>
              typeof actions.saveProjectResultViaActions === 'function'
                ? actions.saveProjectResultViaActions(App)
                : api.normalizeProjectSaveActionResult(actions.saveProjectViaActions(App), 'not-installed'),
            report: feedback.reportProjectSaveResult,
            buildError: api.buildProjectSaveActionErrorResult,
            fallbackMessage: 'שמירת פרויקט נכשלה',
          }),
      };
    }
    if (specifier === './project_save_load_controller_shared.js') {
      return {};
    }

    if (specifier === '../../services/api.js') {
      return {
        buildProjectSaveActionErrorResult: (error, fallbackMessage) => ({
          ok: false,
          reason: 'error',
          message:
            (error && typeof error === 'object' && typeof error.message === 'string' && error.message) ||
            (typeof error === 'string' ? error : fallbackMessage),
        }),
        ...(overrides.api || {}),
      };
    }
    if (specifier === '../project_action_feedback.js') return overrides.feedback;
    if (specifier === '../project_action_execution.js') {
      return {
        clearProjectLoadInputEventTarget: evt => {
          const target = (evt && typeof evt === 'object' && (evt.currentTarget || evt.target)) || null;
          try {
            if (target && typeof target === 'object' && 'value' in target) target.value = '';
          } catch {}
        },
        executeProjectActionResult: ({
          feedback,
          run,
          report,
          buildError,
          fallbackMessage,
          finally: onFinally,
        }) => {
          try {
            const result = run();
            report(feedback, result);
            return result;
          } catch (error) {
            const result = buildError(error, fallbackMessage);
            report(feedback, result);
            return result;
          } finally {
            if (typeof onFinally === 'function') onFinally();
          }
        },
        executeAsyncProjectActionResult: async ({
          feedback,
          run,
          report,
          buildError,
          fallbackMessage,
          finally: onFinally,
        }) => {
          try {
            const result = await run();
            report(feedback, result);
            return result;
          } catch (error) {
            const result = buildError(error, fallbackMessage);
            report(feedback, result);
            return result;
          } finally {
            if (typeof onFinally === 'function') onFinally();
          }
        },
      };
    }
    if (specifier === '../../runtime/project_save_action_result.js') {
      return {
        buildProjectSaveActionErrorResult: (error, fallbackMessage) => ({
          ok: false,
          reason: 'error',
          message:
            (error && typeof error === 'object' && typeof error.message === 'string' && error.message) ||
            (typeof error === 'string' ? error : fallbackMessage),
        }),
      };
    }
    if (specifier === '../browser_file_download.js') return overrides.browser;
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console: overrides.console || console,
    process,
    setTimeout,
    clearTimeout,
    Date: overrides.Date || Date,
    queueMicrotask,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

export function createSaveLoadController(mod, actionHolder, depsOverrides = {}) {
  return mod.createProjectSaveLoadInteractionController(
    { id: 'app' },
    { win: null, doc: null, toast: () => undefined, ...depsOverrides },
    {
      getSaveProjectAction: () => actionHolder.current,
      setSaveProjectAction: (_app, fn) => {
        actionHolder.current = fn;
      },
      saveProjectResultViaActions: app =>
        actionHolder.current?.(app) ?? actionHolder.current?.() ?? { ok: false, reason: 'not-installed' },
      saveProjectViaActions: () => false,
      ...depsOverrides.actions,
    }
  );
}
