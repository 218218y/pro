import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function stripNoise(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');
}

const bootstrapRaw = read('esm/native/builder/bootstrap.ts');
const bootstrap = stripNoise(bootstrapRaw);
const bootstrapShared = read('esm/native/builder/bootstrap_shared.ts');
const bootstrapBindings = read('esm/native/builder/bootstrap_bindings.ts');
const bootstrapDrawerMeta = read('esm/native/builder/bootstrap_drawer_meta.ts');

test('[builder-bootstrap] install surface now stays thin over focused bootstrap owners', () => {
  assert.match(
    bootstrapRaw,
    /import \{[\s\S]*createBuilderNamespaceRoots,[\s\S]*installBuilderDepsNamespaces,[\s\S]*pickBuilderApp,[\s\S]*refreshBuilderNamespaceInstallContexts,[\s\S]*\} from '\.\/bootstrap_shared\.js';/
  );
  assert.match(
    bootstrapRaw,
    /import \{ createBuilderNamespaceBindingMap \} from '\.\/bootstrap_bindings\.js';/
  );
  assert.match(bootstrapRaw, /const namespaces = createBuilderNamespaceRoots\(App\);/);
  assert.match(bootstrapRaw, /refreshBuilderNamespaceInstallContexts\(namespaces, App\);/);
  assert.match(
    bootstrapRaw,
    /installBuilderDepsNamespaces\(namespaces, createBuilderNamespaceBindingMap\(\)\);/
  );
});

test('[builder-bootstrap] shared owner keeps canonical namespace binding tables and stable-install policy', () => {
  assert.match(
    bootstrapShared,
    /export type BuilderNamespaceName = 'util' \| 'materials' \| 'modules' \| 'contents' \| 'notes' \| 'render';/
  );
  assert.match(bootstrapShared, /export type BuilderNamespaceBinding = Readonly<\{/);
  assert.match(
    bootstrapShared,
    /export function installBuilderNamespaceBindings\(\s*namespace: BuilderNamespace,\s*bindings: readonly BuilderNamespaceBinding\[\]\s*\): void/
  );
  assert.match(
    bootstrapShared,
    /export function installBuilderDepsNamespaces\(\s*namespaces: BuilderNamespaceRoots,\s*bindingMap: BuilderNamespaceBindingMap\s*\): void/
  );
});

test('[builder-bootstrap] binding map and drawer rebuild follow-through no longer re-mix inside bootstrap.ts', () => {
  assert.match(
    bootstrapBindings,
    /export function createBuilderNamespaceBindingMap\(\): BuilderNamespaceBindingMap \{/
  );
  assert.match(bootstrapBindings, /bind: context => \(\) => runRebuildDrawerMeta\(context\.App\),/);
  assert.match(bootstrapDrawerMeta, /export function runRebuildDrawerMeta\(App: AppContainer\): void \{/);
  assert.doesNotMatch(bootstrap, /runRebuildDrawerMeta\(/);
  assert.doesNotMatch(bootstrap, /const bindingMap: BuilderNamespaceBindingMap = \{/);
});
