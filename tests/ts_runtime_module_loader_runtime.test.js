import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTsRuntimeModuleLoader, loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

function makeFixtureDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-ts-runtime-loader-'));
  return {
    dir,
    write(rel, source) {
      const file = path.join(dir, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, source, 'utf8');
      return file;
    },
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

function withFixture(testFn) {
  const fixture = makeFixtureDir();
  try {
    return testFn(fixture);
  } finally {
    fixture.cleanup();
  }
}

test('ts runtime loader loads a plain TS module', () => {
  withFixture(({ write }) => {
    const file = write(
      'plain.ts',
      `
        type Label = 'ready';
        export const label: Label = 'ready';
        export function double(value: number): number {
          return value * 2;
        }
      `
    );

    const loaded = loadTsRuntimeModule(file);

    assert.equal(loaded.label, 'ready');
    assert.equal(loaded.double(21), 42);
  });
});

test('ts runtime loader resolves local .js imports to TS files', () => {
  withFixture(({ write }) => {
    write('local_dep.ts', 'export const value: number = 41;\n');
    const file = write(
      'entry.ts',
      `
        import { value } from './local_dep.js';
        export const answer = value + 1;
      `
    );

    const loaded = loadTsRuntimeModule(file);

    assert.equal(loaded.answer, 42);
  });
});

test('ts runtime loader supports object mocks by exact specifier', () => {
  withFixture(({ write }) => {
    const file = write(
      'uses_mock.ts',
      `
        import { value } from 'runtime:mocked';
        export const answer = value + 1;
      `
    );

    const loaded = loadTsRuntimeModule(file, {
      mocks: {
        'runtime:mocked': { value: 41 },
      },
    });

    assert.equal(loaded.answer, 42);
  });
});

test('ts runtime loader supports dynamic mocks with loader context', () => {
  withFixture(({ write }) => {
    const file = write(
      'uses_dynamic_mock.ts',
      `
        import { parentBasename as parent, resolvedBasename as resolved } from 'runtime:dynamic';
        export const parentBasename = parent;
        export const resolvedBasename = resolved;
      `
    );

    const loaded = loadTsRuntimeModule(file, {
      mock(specifier, context) {
        if (specifier !== 'runtime:dynamic') return undefined;
        return {
          parentBasename: path.basename(context.parentFile),
          resolvedBasename: path.basename(context.resolve('./uses_dynamic_mock.js')),
        };
      },
    });

    assert.equal(loaded.parentBasename, 'uses_dynamic_mock.ts');
    assert.equal(loaded.resolvedBasename, 'uses_dynamic_mock.ts');
  });
});

test('ts runtime loader cache returns the same module instance', () => {
  withFixture(({ write }) => {
    const file = write(
      'cached.ts',
      `
        export const state = { count: 0 };
        export function increment() {
          state.count += 1;
          return state.count;
        }
      `
    );
    const loader = createTsRuntimeModuleLoader();

    const first = loader.load(file);
    const second = loader.load(file);

    assert.equal(first, second);
    assert.equal(first.increment(), 1);
    assert.equal(second.state.count, 1);
  });
});

test('ts runtime loader transform errors include the fixture filename', () => {
  withFixture(({ write }) => {
    const file = write('broken_transform.ts', 'export const = ;\n');

    assert.throws(
      () => loadTsRuntimeModule(file),
      error => {
        assert.match(String(error?.message), /broken_transform\.ts/);
        assert.match(String(error?.message), /Failed to transform TS runtime test module/);
        return true;
      }
    );
  });
});

test('ts runtime loader evaluate errors include the fixture filename', () => {
  withFixture(({ write }) => {
    const file = write(
      'broken_evaluate.ts',
      `
        export const before = 1;
        throw new Error('evaluate boom');
      `
    );

    assert.throws(
      () => loadTsRuntimeModule(file),
      error => {
        assert.match(String(error?.message), /broken_evaluate\.ts/);
        assert.match(String(error?.message), /Failed to evaluate TS runtime test module/);
        assert.match(String(error?.message), /evaluate boom/);
        return true;
      }
    );
  });
});

test('runtime tests do not reintroduce per-test TS VM loaders', () => {
  const testsDir = fileURLToPath(new URL('./', import.meta.url));
  const allowedRelPaths = new Set([
    'root_surface_ast_guard.test.js',
    '_ts_runtime_module_loader.mjs',
    'ts_runtime_module_loader_runtime.test.js',
  ]);
  const forbiddenNeedles = [
    ['transpile', 'Module'].join(''),
    ['Module', 'Kind'].join(''),
    ['Script', 'Target'].join(''),
    ['vm', 'runInNewContext'].join('.'),
    ['require', "('typescript')"].join(''),
    ['require', '("typescript")'].join(''),
    ['from ', "'typescript'"].join(''),
    ['from ', '"typescript"'].join(''),
  ];
  const failures = [];

  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(absolute);
        continue;
      }
      if (!/\.(?:js|mjs|ts|tsx)$/.test(entry.name)) continue;

      const rel = path.relative(testsDir, absolute).replaceAll(path.sep, '/');
      if (allowedRelPaths.has(rel)) continue;

      const source = fs.readFileSync(absolute, 'utf8');
      for (const needle of forbiddenNeedles) {
        if (source.includes(needle)) failures.push(`${rel}: ${needle}`);
      }
    }
  }

  scan(testsDir);

  assert.deepEqual(failures, []);
});
