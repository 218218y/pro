import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export function loadProjectUiActionControllerModule(reportCalls) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/project_ui_action_controller_runtime.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === '../project_load_runtime.js') {
      return {
        openProjectLoadInputTarget: input => {
          try {
            if (input && typeof input === 'object' && typeof input.click === 'function') input.click();
          } catch {}
        },
        runProjectLoadActionResult: async (feedback, run, options) => {
          try {
            const result = await run();
            reportCalls.push(['load', feedback, result]);
            return result;
          } catch (error) {
            const result = {
              ok: false,
              reason: 'error',
              message:
                error instanceof Error && error.message
                  ? error.message
                  : options?.fallbackMessage || 'טעינת קובץ נכשלה',
            };
            reportCalls.push(['load', feedback, result]);
            return result;
          } finally {
            const evt = options?.clearInputTargetFrom;
            const target = (evt && typeof evt === 'object' && (evt.currentTarget || evt.target)) || null;
            try {
              if (target && typeof target === 'object' && 'value' in target) target.value = '';
            } catch {}
          }
        },
      };
    }
    if (specifier === '../project_recovery_runtime.js') {
      const flights = new WeakMap();
      const runFlight = async (app, key, feedback, run, fallbackMessage) => {
        const active = flights.get(app);
        if (active) {
          if (active.key === key) return await active.promise;
          const result = { ok: false, reason: 'busy' };
          reportCalls.push([key, feedback, result]);
          return result;
        }
        if (typeof run !== 'function') {
          const result = { ok: false, reason: 'not-installed' };
          reportCalls.push([key, feedback, result]);
          return result;
        }
        let pending = null;
        pending = Promise.resolve()
          .then(async () => {
            try {
              const result = await run(app);
              reportCalls.push([key, feedback, result]);
              return result;
            } catch (error) {
              const result = {
                ok: false,
                reason: 'error',
                message: error instanceof Error && error.message ? error.message : fallbackMessage,
              };
              reportCalls.push([key, feedback, result]);
              return result;
            }
          })
          .finally(() => {
            if (flights.get(app)?.promise === pending) flights.delete(app);
          });
        flights.set(app, { key, promise: pending });
        return await pending;
      };
      return {
        runProjectRestoreAction: async (app, feedback, restoreLastSession) =>
          await runFlight(app, 'restore', feedback, restoreLastSession, 'שחזור העריכה נכשל'),
        runProjectResetDefaultAction: async (app, feedback, resetToDefaultProject) =>
          await runFlight(app, 'reset', feedback, resetToDefaultProject, 'האיפוס נכשל'),
      };
    }
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

    if (specifier === './project_ui_action_controller_load.js') {
      const loadRuntime = localRequire('../project_load_runtime.js');
      const inflightLoads = new Map();
      const clearTarget = evt => {
        const target = (evt && typeof evt === 'object' && (evt.currentTarget || evt.target)) || null;
        try {
          if (target && typeof target === 'object' && 'value' in target) target.value = '';
        } catch {}
      };
      const readKey = evt => {
        const target = (evt && typeof evt === 'object' && (evt.currentTarget || evt.target)) || null;
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
        const value = target && typeof target.value === 'string' ? target.value.trim() : '';
        return value ? `target:${value}` : null;
      };
      const runLoad = async (args, evt) =>
        await loadRuntime.runProjectLoadActionResult(args.fb, () => args.loadFromFileEvent(args.app, evt), {
          clearInputTargetFrom: evt,
          fallbackMessage: 'טעינת קובץ נכשלה',
        });
      return {
        openProjectLoadInput: ref => loadRuntime.openProjectLoadInputTarget((ref && ref.current) || null),
        runProjectUiLoadInputChange: async (args, evt) => {
          const key = readKey(evt);
          const active = key ? inflightLoads.get(key) : null;
          if (active) {
            clearTarget(evt);
            return await active;
          }
          if (key && inflightLoads.size) {
            return await loadRuntime.runProjectLoadActionResult(
              args.fb,
              () => ({ ok: false, reason: 'busy' }),
              {
                clearInputTargetFrom: evt,
                fallbackMessage: 'טעינת קובץ נכשלה',
              }
            );
          }
          let pending = null;
          pending = Promise.resolve()
            .then(() => runLoad(args, evt))
            .finally(() => {
              if (key && inflightLoads.get(key) === pending) inflightLoads.delete(key);
            });
          if (key) inflightLoads.set(key, pending);
          return await pending;
        },
      };
    }
    if (specifier === './project_ui_action_controller_recovery.js') {
      const recoveryRuntime = localRequire('../project_recovery_runtime.js');
      return {
        runProjectUiRestoreLastSession: async args =>
          await recoveryRuntime.runProjectRestoreAction(args.app, args.fb, args.restoreLastSession),
        runProjectUiResetToDefault: async args =>
          await recoveryRuntime.runProjectResetDefaultAction(args.app, args.fb, args.resetToDefaultProject),
      };
    }
    if (specifier === './project_ui_action_controller_save.js') {
      const feedback = localRequire('../project_action_feedback.js');
      const execution = localRequire('../project_action_execution.js');
      const api = localRequire('../../services/api.js');
      return {
        runProjectUiSaveAction: args =>
          execution.executeProjectActionResult({
            feedback: args.fb,
            run: () => args.saveProject(args.app),
            report: feedback.reportProjectSaveResult,
            buildError: api.buildProjectSaveActionErrorResult,
            fallbackMessage: 'שמירת פרויקט נכשלה',
          }),
      };
    }
    if (specifier === './project_ui_action_controller_shared.js') {
      return {};
    }

    if (specifier === '../project_action_feedback.js') {
      return {
        buildProjectActionErrorResult: (error, fallbackMessage) => ({
          ok: false,
          reason: 'error',
          message: error instanceof Error && error.message ? error.message : fallbackMessage,
        }),
        reportProjectLoadResult: (fb, result) => {
          reportCalls.push(['load', fb, result]);
          return result;
        },
        reportProjectRestoreResult: (fb, result) => {
          reportCalls.push(['restore', fb, result]);
          return result;
        },
        reportProjectSaveResult: (fb, result) => {
          reportCalls.push(['save', fb, result]);
          return result;
        },
        reportResetDefaultResult: (fb, result) => {
          reportCalls.push(['reset', fb, result]);
          return result;
        },
      };
    }
    if (specifier === '../../services/api.js') {
      return {
        buildProjectSaveActionErrorResult: (error, fallbackMessage) => ({
          ok: false,
          reason: 'error',
          message: error instanceof Error && error.message ? error.message : fallbackMessage,
        }),
      };
    }
    if (specifier === '../project_load_input_shared.js') {
      return {
        readProjectLoadInputTarget: evt =>
          (evt && typeof evt === 'object' && (evt.currentTarget || evt.target)) || null,
        resetProjectLoadInputTarget: target => {
          try {
            if (target && typeof target === 'object' && 'value' in target) target.value = '';
          } catch {}
        },
      };
    }
    if (
      specifier === '../../runtime/project_recovery_action_result.js' ||
      specifier === '../project_recovery_action_result.js'
    ) {
      return {
        buildProjectRestoreActionErrorResult: (error, fallbackMessage) => ({
          ok: false,
          reason: 'error',
          message: error instanceof Error && error.message ? error.message : fallbackMessage,
        }),
        buildProjectResetDefaultActionErrorResult: (error, fallbackMessage) => ({
          ok: false,
          reason: 'error',
          message: error instanceof Error && error.message ? error.message : fallbackMessage,
        }),
      };
    }
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

export function createController(overrides = {}) {
  const reportCalls = [];
  const mod = loadProjectUiActionControllerModule(reportCalls);
  const fb = { toast() {} };
  const controller = mod.createProjectUiActionController({
    app: { id: 'app' },
    fb,
    loadFromFileEvent: async () => ({ ok: true }),
    saveProject: () => ({ ok: true }),
    ...overrides,
  });
  return { controller, reportCalls, fb, mod };
}
