import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function transpileModule(file) {
  const source = fs.readFileSync(file, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
}

function loadTsModule(file, overrides = {}) {
  const transpiled = transpileModule(file);
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier in overrides) return overrides[specifier];
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
    queueMicrotask,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

function loadActionFeedbackShared() {
  const file = path.join(process.cwd(), 'esm/native/ui/action_feedback_shared.ts');
  return loadTsModule(file);
}

function createServicesApiStub() {
  return {
    normalizeUnknownError(error, fallbackMessage) {
      if (error instanceof Error && error.message) return { message: error.message };
      if (typeof error === 'string' && error.trim()) return { message: error.trim() };
      if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) {
        return { message: error.message.trim() };
      }
      return { message: fallbackMessage };
    },
    buildProjectLoadActionErrorResult(error, fallbackMessage) {
      return {
        ok: false,
        reason: 'error',
        message:
          (error instanceof Error && error.message) ||
          (typeof error === 'string' && error.trim()) ||
          (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) ||
          fallbackMessage,
      };
    },
    normalizeProjectLoadActionResult(value, fallbackReason = 'error') {
      if (value && typeof value === 'object' && value.ok === true) return value;
      if (value && typeof value === 'object' && value.ok === false) {
        return {
          ok: false,
          reason: typeof value.reason === 'string' ? value.reason.trim() : fallbackReason,
          ...(typeof value.message === 'string' && value.message.trim()
            ? { message: value.message.trim() }
            : {}),
        };
      }
      return { ok: false, reason: fallbackReason };
    },
    normalizeProjectRestoreActionResult(value, fallbackReason = 'error') {
      if (value && typeof value === 'object' && value.ok === true) return value;
      if (value && typeof value === 'object' && value.ok === false) {
        return {
          ok: false,
          reason: typeof value.reason === 'string' ? value.reason.trim() : fallbackReason,
          ...(typeof value.message === 'string' && value.message.trim()
            ? { message: value.message.trim() }
            : {}),
        };
      }
      return { ok: false, reason: fallbackReason };
    },
    normalizeProjectResetDefaultActionResult(value, fallbackReason = 'error') {
      if (value && typeof value === 'object' && value.ok === true) return value;
      if (value && typeof value === 'object' && value.ok === false) {
        return {
          ok: false,
          reason: typeof value.reason === 'string' ? value.reason.trim() : fallbackReason,
          ...(typeof value.message === 'string' && value.message.trim()
            ? { message: value.message.trim() }
            : {}),
        };
      }
      return { ok: false, reason: fallbackReason };
    },
  };
}

function loadProjectActionFeedback() {
  const file = path.join(process.cwd(), 'esm/native/ui/project_action_feedback.ts');
  const actionShared = loadActionFeedbackShared();
  const servicesApi = createServicesApiStub();
  const projectShared = loadTsModule(
    path.join(process.cwd(), 'esm/native/ui/project_action_feedback_shared.ts'),
    {
      '../services/api.js': servicesApi,
    }
  );
  const projectLoadRestore = loadTsModule(
    path.join(process.cwd(), 'esm/native/ui/project_action_feedback_load_restore.ts'),
    {
      '../services/api.js': servicesApi,
      './action_feedback_shared.js': actionShared,
      './project_action_feedback_shared.js': projectShared,
    }
  );
  const projectSaveReset = loadTsModule(
    path.join(process.cwd(), 'esm/native/ui/project_action_feedback_save_reset.ts'),
    {
      '../services/api.js': servicesApi,
      './action_feedback_shared.js': actionShared,
      './project_action_feedback_shared.js': projectShared,
    }
  );
  return loadTsModule(file, {
    '../services/api.js': servicesApi,
    './project_action_feedback_shared.js': projectShared,
    './project_action_feedback_load_restore.js': projectLoadRestore,
    './project_action_feedback_save_reset.js': projectSaveReset,
  });
}

function loadSavedModelsActionFeedback() {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback.ts'
  );
  const savedModelsShared = loadTsModule(
    path.join(process.cwd(), 'esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_shared.ts')
  );
  const savedModelsFailure = loadTsModule(
    path.join(
      process.cwd(),
      'esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_failure.ts'
    ),
    {
      './structure_tab_saved_models_action_feedback_shared.js': savedModelsShared,
    }
  );
  const savedModelsSuccess = loadTsModule(
    path.join(
      process.cwd(),
      'esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_success.ts'
    ),
    {
      './structure_tab_saved_models_action_feedback_shared.js': savedModelsShared,
    }
  );
  return loadTsModule(file, {
    './structure_tab_saved_models_action_feedback_shared.js': savedModelsShared,
    './structure_tab_saved_models_action_feedback_failure.js': savedModelsFailure,
    './structure_tab_saved_models_action_feedback_success.js': savedModelsSuccess,
  });
}

test('feedback release regressions: project toasts stay quiet for superseded load/reset results', () => {
  const mod = loadProjectActionFeedback();
  const seen = [];
  const fb = {
    toast(message, type) {
      seen.push({ message, type });
    },
  };

  assert.equal(mod.getProjectLoadToast({ ok: false, reason: 'superseded', message: 'stale load' }), null);
  assert.equal(
    mod.reportResetDefaultResult(fb, { ok: false, reason: 'superseded', message: 'stale reset' }),
    null
  );
  assert.deepEqual(seen, []);
});

test('feedback release regressions: saved-model apply stays quiet for superseded result instead of showing a generic failure', () => {
  const mod = loadSavedModelsActionFeedback();
  const seen = [];
  const fb = {
    toast(message, type) {
      seen.push({ message, type });
    },
  };

  assert.equal(
    mod.getSavedModelsActionToast({ ok: false, kind: 'apply', reason: 'superseded', message: 'stale apply' }),
    null
  );
  assert.equal(
    mod.reportSavedModelsActionResult(fb, {
      ok: false,
      kind: 'apply',
      reason: 'superseded',
      message: 'stale apply',
    }),
    null
  );
  assert.deepEqual(seen, []);
});

test('feedback release regressions: shared readers keep trimmed reasons/messages canonical', () => {
  const shared = loadActionFeedbackShared();
  assert.equal(shared.readActionReason('  superseded  '), 'superseded');
  assert.equal(shared.readActionMessage('  snapshot failed  '), 'snapshot failed');
  assert.equal(shared.hasQuietActionReason('  cancelled ', 'cancelled', 'superseded'), true);
  assert.equal(shared.hasQuietActionReason('error', 'cancelled', 'superseded'), false);
});
