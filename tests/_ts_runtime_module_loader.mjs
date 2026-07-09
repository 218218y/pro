import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import esbuild from 'esbuild';

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const TS_RUNTIME_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

const rootRequire = createRequire(import.meta.url);

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function fileExists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function directoryExists(file) {
  try {
    return fs.statSync(file).isDirectory();
  } catch {
    return false;
  }
}

function resolveExistingFile(base, extensions = DEFAULT_EXTENSIONS) {
  if (fileExists(base)) return base;

  const ext = path.extname(base);
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
    const withoutExt = base.slice(0, -ext.length);
    for (const candidateExt of ['.ts', '.tsx', ext]) {
      const candidate = `${withoutExt}${candidateExt}`;
      if (fileExists(candidate)) return candidate;
    }
  }

  if (!ext) {
    for (const candidateExt of extensions) {
      const candidate = `${base}${candidateExt}`;
      if (fileExists(candidate)) return candidate;
    }
  }

  if (directoryExists(base)) {
    for (const candidateExt of extensions) {
      const candidate = path.join(base, `index${candidateExt}`);
      if (fileExists(candidate)) return candidate;
    }
  }

  return base;
}

export function resolveTsRuntimeModulePath(fromFile, specifier, options = {}) {
  const extensions =
    Array.isArray(options.extensions) && options.extensions.length ? options.extensions : DEFAULT_EXTENSIONS;
  const base = path.isAbsolute(specifier)
    ? specifier
    : path.resolve(path.dirname(path.resolve(fromFile)), specifier);
  return resolveExistingFile(base, extensions);
}

function esbuildLoaderFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.tsx') return 'tsx';
  if (ext === '.jsx') return 'jsx';
  if (ext === '.json') return 'json';
  return 'ts';
}

export function transformTsRuntimeModule(source, file, options = {}) {
  try {
    return esbuild.transformSync(source, {
      loader: esbuildLoaderFor(file),
      format: 'cjs',
      platform: 'node',
      target: options.target || 'es2020',
      sourcefile: file,
      sourcemap: options.sourcemap || 'inline',
      jsx: options.jsx || 'automatic',
      logLevel: 'silent',
      ...options.esbuildOptions,
    }).code;
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : String(error);
    throw new Error(`Failed to transform TS runtime test module ${file}: ${message}`);
  }
}

function readMockValue(mock, specifier, context) {
  if (typeof mock !== 'function') return { matched: false, value: undefined };
  const value = mock(specifier, context);
  return value === undefined ? { matched: false, value: undefined } : { matched: true, value };
}

function readObjectMockValue(mocks, specifier) {
  if (!isObject(mocks) || !Object.prototype.hasOwnProperty.call(mocks, specifier)) {
    return { matched: false, value: undefined };
  }
  return { matched: true, value: mocks[specifier] };
}

export function createTsRuntimeModuleLoader(options = {}) {
  const cache = options.cache || new Map();
  const mocks = options.mocks || {};
  const mock = options.mock;
  const globals = options.globals || {};
  const extensions = options.extensions || DEFAULT_EXTENSIONS;
  const transformOptions = options.transformOptions || {};

  function load(file) {
    const normalized = path.resolve(file);
    if (cache.has(normalized)) return cache.get(normalized).exports;

    const source = fs.readFileSync(normalized, 'utf8');
    const transformed = transformTsRuntimeModule(source, normalized, transformOptions);
    const mod = { exports: {} };
    cache.set(normalized, mod);

    const moduleRequire = createRequire(pathToFileURL(normalized).href);
    const localRequire = specifier => {
      const context = {
        parentFile: normalized,
        load,
        require: moduleRequire,
        resolve: childSpecifier => resolveTsRuntimeModulePath(normalized, childSpecifier, { extensions }),
      };

      const dynamicMock = readMockValue(mock, specifier, context);
      if (dynamicMock.matched) return dynamicMock.value;

      const objectMock = readObjectMockValue(mocks, specifier);
      if (objectMock.matched) return objectMock.value;

      if (specifier.startsWith('./') || specifier.startsWith('../') || path.isAbsolute(specifier)) {
        const resolved = resolveTsRuntimeModulePath(normalized, specifier, { extensions });
        if (TS_RUNTIME_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
          return load(resolved);
        }
        return moduleRequire(resolved);
      }

      return moduleRequire(specifier);
    };

    const sandbox = {
      module: mod,
      exports: mod.exports,
      require: localRequire,
      __dirname: path.dirname(normalized),
      __filename: normalized,
      console,
      process,
      Buffer,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      queueMicrotask,
      ...globals,
    };
    sandbox.global = sandbox;
    sandbox.globalThis = sandbox;

    try {
      vm.runInNewContext(transformed, sandbox, {
        filename: normalized,
        displayErrors: true,
      });
    } catch (error) {
      cache.delete(normalized);
      const message = error instanceof Error && error.stack ? error.stack : String(error);
      throw new Error(`Failed to evaluate TS runtime test module ${normalized}:\n${message}`);
    }

    return mod.exports;
  }

  return { load, cache };
}

export function loadTsRuntimeModule(file, options = {}) {
  return createTsRuntimeModuleLoader(options).load(file);
}

export { rootRequire as requireFromTsRuntimeLoader };
