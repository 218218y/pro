import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAstAdapter } from '../tools/wp_ast_adapter.mjs';
import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '..', 'esm', 'native');
const astApi = requireAstAdapter('Root Surface AST Guard');

const forbiddenRootProps = new Set(['actions', 'store', 'deps', 'browser', 'platform', 'render', 'config']);
const allowedExts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
      continue;
    }
    if (allowedExts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function scriptKindFor(file) {
  return astApi.getScriptKindForFile(file);
}

function unwrapExpression(node) {
  let cur = node;
  while (
    cur &&
    (astApi.isParenthesizedExpression(cur) ||
      astApi.isAsExpression(cur) ||
      astApi.isTypeAssertionExpression(cur) ||
      astApi.isNonNullExpression(cur) ||
      astApi.isSatisfiesExpression?.(cur))
  ) {
    cur = cur.expression;
  }
  return cur;
}

function calleeName(expr) {
  if (astApi.isIdentifier(expr)) return expr.text;
  if (astApi.isPropertyAccessExpression(expr)) return expr.name.text;
  return '';
}

function isAppishParameter(name) {
  return name === 'App' || name === 'app' || name === 'A';
}

function looksAppishFactory(name) {
  return (
    /app/i.test(name) ||
    /record/i.test(name) ||
    /object/i.test(name) ||
    /^(assertApp|asRecord|asUnknownRecord|readRecord|asObject|asApp|asAppContainer)$/.test(name)
  );
}

function buildAppishAliasSet(sf) {
  const appish = new Set();

  function exprIsAppish(expr) {
    const node = unwrapExpression(expr);
    if (!node) return false;
    if (astApi.isIdentifier(node)) return appish.has(node.text) || isAppishParameter(node.text);
    if (astApi.isCallExpression(node)) {
      const name = calleeName(node.expression);
      if (!looksAppishFactory(name)) return false;
      return node.arguments.some(arg => exprIsAppish(arg));
    }
    if (astApi.isConditionalExpression(node)) {
      return exprIsAppish(node.whenTrue) || exprIsAppish(node.whenFalse);
    }
    if (astApi.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (
        op === astApi.SyntaxKind.QuestionQuestionToken ||
        op === astApi.SyntaxKind.BarBarToken ||
        op === astApi.SyntaxKind.AmpersandAmpersandToken
      ) {
        return exprIsAppish(node.left) || exprIsAppish(node.right);
      }
    }
    return false;
  }

  function visit(node) {
    if (astApi.isVariableDeclaration(node) && astApi.isIdentifier(node.name) && node.initializer) {
      if (exprIsAppish(node.initializer)) appish.add(node.name.text);
    }
    if (
      astApi.isBinaryExpression(node) &&
      node.operatorToken.kind === astApi.SyntaxKind.EqualsToken &&
      astApi.isIdentifier(node.left)
    ) {
      if (exprIsAppish(node.right)) appish.add(node.left.text);
    }
    astApi.forEachChild(node, visit);
  }

  visit(sf);
  return appish;
}

function isForbiddenRootAccess(node, appish) {
  if (!astApi.isPropertyAccessExpression(node)) return false;
  const expr = unwrapExpression(node.expression);
  return !!(
    astApi.isIdentifier(expr) &&
    (appish.has(expr.text) || isAppishParameter(expr.text)) &&
    forbiddenRootProps.has(node.name.text)
  );
}

const ROOT_OWNER_CONTRACTS = [
  {
    file: 'esm/native/runtime/deps_access.ts',
    imports: { './app_roots_access.js': ['ensureDepsRootSlot', 'getDepsRootSlotMaybe'] },
  },
  {
    file: 'esm/native/runtime/browser_surface_access.ts',
    imports: { './app_roots_access.js': ['ensureBrowserRoot', 'getBrowserRootMaybe'] },
  },
  {
    file: 'esm/native/runtime/store_surface_access.ts',
    imports: { './app_roots_access.js': ['ensureStoreRoot', 'getStoreRootMaybe'] },
  },
  {
    file: 'esm/native/runtime/runtime_config_selectors.ts',
    imports: { './app_roots_access.js': ['getRuntimeConfigRootMaybe'] },
  },
  {
    file: 'esm/native/kernel/actions_root.ts',
    imports: { '../runtime/app_roots_access.js': ['ensureActionsRootSlot'] },
  },
  {
    file: 'esm/native/adapters/browser/dom.ts',
    imports: { '../../runtime/app_roots_access.js': ['ensurePlatformRoot'] },
  },
  {
    file: 'esm/native/platform/cache_pruning_shared.ts',
    imports: {
      '../runtime/platform_access.js': ['getPlatformUtil'],
      '../runtime/render_access.js': ['ensureRenderNamespace', 'getRenderSlot', 'setRenderSlot'],
    },
  },
  {
    file: 'esm/native/builder/render_ops_extras_shared.ts',
    imports: { '../runtime/platform_access.js': ['ensurePlatformRootSurface', 'getPlatformUtil'] },
  },
  {
    file: 'esm/native/ui/errors_install_shared.ts',
    imports: { '../services/api.js': ['ensureErrorsService', 'ensurePlatformRootSurface'] },
  },
];

const ROOT_CONSUMER_CONTRACTS = [
  {
    file: 'esm/native/runtime/store_boot_access.ts',
    imports: { './actions_access_core.js': ['getActions'] },
  },
  {
    file: 'esm/native/runtime/debug_console_surface.ts',
    imports: { './store_surface_access.js': ['getStoreSurfaceMaybe'] },
  },
  {
    file: 'esm/native/kernel/kernel_snapshot_store_commits_ops.ts',
    imports: { '../runtime/store_surface_access.js': ['getStoreSurfaceMaybe'] },
  },
  {
    file: 'esm/native/kernel/domain_api.ts',
    imports: { '../runtime/actions_access_core.js': ['getActions'] },
  },
  {
    file: 'esm/native/adapters/browser/env_shared.ts',
    imports: { '../../runtime/deps_access.js': ['getDepsNamespaceMaybe'] },
  },
  {
    file: 'esm/native/builder/build_app_context.ts',
    imports: { '../runtime/platform_access.js': ['getPlatformReportError'] },
  },
  {
    file: 'esm/native/runtime/store_reactivity_access.ts',
    imports: { './actions_access_domains.js': ['getStoreActionFn'] },
  },
  {
    file: 'esm/native/services/camera_presets.ts',
    imports: { '../runtime/store_surface_access.js': ['getStoreSurfaceMaybe'] },
  },
  {
    file: 'esm/native/services/cloud_sync_support_feedback.ts',
    imports: { '../runtime/errors.js': ['reportError'] },
  },
  {
    file: 'esm/native/kernel/history_access.ts',
    imports: { '../runtime/actions_access_domains.js': ['getHistoryActionFn'] },
  },
  {
    file: 'esm/native/builder/provide.ts',
    imports: { '../runtime/builder_deps_access.js': ['getBuilderDepsRoot'] },
  },
  {
    file: 'esm/native/platform/dirty_flag.ts',
    imports: { '../runtime/store_surface_access.js': ['getStoreSurfaceMaybe'] },
  },
  {
    file: 'esm/native/builder/store_access.ts',
    imports: {
      '../runtime/actions_access_core.js': ['getActionNamespace'],
      '../runtime/actions_access_domains.js': ['getConfigActions'],
    },
  },
  {
    file: 'esm/native/runtime/meta_profiles_access.ts',
    imports: { './actions_access_domains.js': ['getMetaActions'] },
  },
];

const FORBIDDEN_DIRECT_DEPENDENCIES = [
  ['esm/native/builder/build_runner.ts', '../runtime/platform_access.js'],
  ['esm/native/builder/build_runner_runtime.ts', '../runtime/platform_access.js'],
  ['esm/native/builder/chest_mode_pipeline.ts', '../runtime/builder_service_access.js'],
  ['esm/native/kernel/kernel.ts', '../runtime/platform_access.js'],
  ['esm/native/services/cloud_sync_support_feedback.ts', '../runtime/platform_access.js'],
];

function analyzeProjectModule(file) {
  const source = fs.readFileSync(path.resolve(here, '..', file), 'utf8');
  return analyzeModuleDependencies(file, source);
}

function expectImportedSymbols(file, expectedImports) {
  const analysis = analyzeProjectModule(file);
  assert.deepEqual(analysis.unresolvedDynamicImports, [], `${file} has dynamic import drift`);
  assert.deepEqual(analysis.forbiddenModuleSyntax, [], `${file} has module syntax drift`);
  for (const [specifier, symbols] of Object.entries(expectedImports)) {
    const entries = analysis.imports.filter(entry => entry.specifier === specifier);
    assert.ok(entries.length > 0, `${file} must import ${specifier}`);
    const imported = new Set(entries.flatMap(entry => entry.importedSymbols));
    for (const symbol of symbols) {
      assert.equal(imported.has(symbol), true, `${file} must import ${symbol} from ${specifier}`);
    }
  }
}

function expectNoImport(file, specifier) {
  const analysis = analyzeProjectModule(file);
  assert.equal(
    analysis.imports.some(entry => entry.specifier === specifier),
    false,
    `${file} must not import ${specifier}`
  );
}

function collectForbiddenHits(file) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = astApi.createSourceFile(file, source, scriptKindFor(file));
  const hits = [];
  const appish = buildAppishAliasSet(sf);

  function visit(node) {
    if (isForbiddenRootAccess(node, appish)) {
      const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
      hits.push({
        file,
        line: line + 1,
        column: character + 1,
        text: node.getText(sf),
      });
    }
    astApi.forEachChild(node, visit);
  }

  visit(sf);
  return hits;
}

test('live root-surface property access stays inside canonical owners even through app aliases', () => {
  const hits = collectFiles(sourceRoot).flatMap(collectForbiddenHits);
  assert.deepEqual(
    hits,
    [],
    `Unexpected direct root access found:
${hits.map(hit => `${path.relative(sourceRoot, hit.file)}:${hit.line}:${hit.column} ${hit.text}`).join('\n')}`
  );
});

test('canonical root owners stay attached to app_roots_access and focused runtime seams', () => {
  for (const contract of ROOT_OWNER_CONTRACTS) {
    expectImportedSymbols(contract.file, contract.imports);
  }
  assert.equal(
    fs.existsSync(path.resolve(here, '..', 'esm/native/kernel/splitdoors_normalizer.ts')),
    false,
    'retired splitdoors_normalizer owner must stay absent'
  );
});

test('root consumers use canonical domain seams without reintroducing direct dependency shortcuts', () => {
  for (const contract of ROOT_CONSUMER_CONTRACTS) {
    expectImportedSymbols(contract.file, contract.imports);
  }
  for (const [file, specifier] of FORBIDDEN_DIRECT_DEPENDENCIES) {
    expectNoImport(file, specifier);
  }
});
