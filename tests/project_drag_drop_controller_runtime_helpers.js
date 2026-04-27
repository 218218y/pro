import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function loadProjectDragDropControllerModule(state) {
  const file = path.join(process.cwd(), 'esm/native/ui/interactions/project_drag_drop_controller_runtime.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };

  class FakeBlob {}
  class FakeFile extends FakeBlob {
    constructor(name, options = {}) {
      super();
      this.name = name;
      this.size = typeof options.size === 'number' ? options.size : 0;
      this.type = typeof options.type === 'string' ? options.type : '';
      this.lastModified = typeof options.lastModified === 'number' ? options.lastModified : 0;
    }
  }

  class FakeDragEvent {
    constructor(dataTransfer) {
      this.dataTransfer = dataTransfer;
      this.prevented = 0;
      this.stopped = 0;
    }
    preventDefault() {
      this.prevented += 1;
    }
    stopPropagation() {
      this.stopped += 1;
    }
  }

  const localRequire = specifier => {
    if (specifier === './project_drag_drop_controller_shared.js') {
      return {
        readDroppedProjectFile: files => {
          if (!files || typeof files.length !== 'number' || files.length < 1) return null;
          const first = files[0];
          return first instanceof FakeBlob ? first : null;
        },
        readDroppedProjectFileFlightKey: file => {
          if (!file) return null;
          const name = typeof file.name === 'string' ? file.name : '';
          const size = typeof file.size === 'number' ? String(file.size) : '';
          const type = typeof file.type === 'string' ? file.type : '';
          const lastModified = typeof file.lastModified === 'number' ? String(file.lastModified) : '';
          if (!name && !size && !type && !lastModified) return null;
          return [name, size, type, lastModified].join('|');
        },
        isProjectFileDrag: e => {
          try {
            const dt = e?.dataTransfer ?? null;
            if (!dt) return false;
            if (Array.isArray(dt.types) && dt.types.includes('Files')) return true;
            const items = dt.items;
            if (items && items.length)
              return Array.from(items).some(item => String(item?.kind || '') === 'file');
            const files = dt.files;
            return !!(files && files.length);
          } catch {
            return false;
          }
        },
      };
    }
    if (specifier === './project_drag_drop_controller_visual.js') {
      const shared = localRequire('./project_drag_drop_controller_shared.js');
      const dom = localRequire('../dom_helpers.js');
      return {
        preventProjectDragDefaultsForFilesOnly: e => {
          const ev = e instanceof FakeDragEvent ? e : null;
          if (!shared.isProjectFileDrag(ev)) return;
          e.preventDefault();
          e.stopPropagation();
        },
        updateProjectDragOverClass: (_doc, e) => {
          try {
            const ev = e instanceof FakeDragEvent ? e : null;
            if (!shared.isProjectFileDrag(ev)) {
              dom.toggleBodyClass(_doc, 'is-dragover', false);
              return;
            }
            dom.toggleBodyClass(_doc, 'is-dragover', true);
          } catch {}
        },
        clearProjectDragOverClass: _doc => {
          try {
            dom.toggleBodyClass(_doc, 'is-dragover', false);
          } catch {}
        },
      };
    }
    if (specifier === './project_drag_drop_controller_drop.js') {
      const loadRuntime = localRequire('../project_load_runtime.js');
      const visual = localRequire('./project_drag_drop_controller_visual.js');
      const shared = localRequire('./project_drag_drop_controller_shared.js');
      return {
        handleProjectDropLoad: async (App, doc, toast, e) => {
          visual.clearProjectDragOverClass(doc);
          const ev = e instanceof FakeDragEvent ? e : null;
          const file = shared.readDroppedProjectFile(ev?.dataTransfer?.files ?? null);
          if (!file) return;
          const fileName = typeof file.name === 'string' ? file.name : '';
          if (!fileName.toLowerCase().endsWith('.json')) {
            toast('אנא גרור קובץ פרויקט (JSON) בלבד.', 'error');
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          await loadRuntime.runProjectLoadAction(App, { toast }, file, {
            fallbackMessage: 'טעינת קובץ נכשלה',
          });
        },
      };
    }
    if (specifier === '../project_load_runtime.js') {
      const inflightLoads = new Map();
      const readFileKey = file => {
        if (!file) return null;
        const name = typeof file.name === 'string' ? file.name : '';
        const size = typeof file.size === 'number' ? String(file.size) : '';
        const type = typeof file.type === 'string' ? file.type : '';
        const lastModified = typeof file.lastModified === 'number' ? String(file.lastModified) : '';
        if (!name && !size && !type && !lastModified) return null;
        return `file:${[name, size, type, lastModified].join('|')}`;
      };
      const runLoad = async (feedback, file, options) => {
        state.loadCalls = (state.loadCalls || 0) + 1;
        state.loads.push(file.name);
        if (state.deferLoads) {
          const deferred = createDeferred();
          state.pendingLoads = state.pendingLoads || [];
          state.pendingLoads.push({ file: file.name, deferred });
          const result = await deferred.promise;
          state.reports.push(result);
          return result;
        }
        try {
          if (typeof state.throwLoadMessage === 'string' && state.throwLoadMessage) {
            throw new Error(state.throwLoadMessage);
          }
          const result = { ok: true, file: file.name };
          state.reports.push(result);
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
          state.reports.push(result);
          return result;
        }
      };
      return {
        runProjectLoadAction: async (_app, feedback, file, options) => {
          const key = readFileKey(file);
          const active = key ? inflightLoads.get(key) : null;
          if (active) return await active;
          if (key && inflightLoads.size) {
            const result = { ok: false, reason: 'busy' };
            state.reports.push(result);
            return result;
          }
          let pending = null;
          pending = Promise.resolve()
            .then(() => runLoad(feedback, file, options))
            .finally(() => {
              if (key && inflightLoads.get(key) === pending) inflightLoads.delete(key);
            });
          if (key) inflightLoads.set(key, pending);
          return await pending;
        },
      };
    }
    if (specifier === '../dom_helpers.js') {
      return {
        toggleBodyClass: (_doc, cls, on) => state.toggles.push([cls, on]),
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
    Blob: FakeBlob,
    DragEvent: FakeDragEvent,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return { exports: mod.exports, FakeFile, FakeDragEvent };
}

export function createProjectDragDropState(overrides = {}) {
  return {
    reports: [],
    toggles: [],
    toasts: [],
    loads: [],
    loadCalls: 0,
    pendingLoads: [],
    deferLoads: false,
    throwLoadMessage: '',
    ...overrides,
  };
}
