#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSourceFile, requireAstAdapter, walkAst } from './wp_ast_adapter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, '..');

const SOURCE_EXT_RE = /\.(?:js|mjs|ts|tsx|mts)$/;
const IGNORED_DIRS = new Set(['.git', 'dist', 'libs', 'node_modules']);
const APP_BAG_PROPS = new Set(['maps', 'cache', 'tools', 'uiFeedback', 'cfg']);
const RESTRICTED_BROWSER_GLOBALS = new Set(['window', 'globalThis', 'document', 'navigator', 'location']);

const BASELINED_VIOLATIONS = new Set([
  'lint-architecture/no-restricted-imports:layer-boundary|esm/native/services/autosave_shared.ts|services modules must not import from io: ../io/project_payload_shared.js',
  'lint-architecture/no-restricted-imports:layer-boundary|esm/native/services/models_apply_project_snapshot.ts|services modules must not import from io: ../io/project_config_persisted_snapshot.js',
  'lint-architecture/no-restricted-imports:layer-boundary|esm/native/services/models_apply_project_snapshot.ts|services modules must not import from io: ../io/project_payload_shared.js',
  'lint-architecture/no-restricted-imports:layer-boundary|esm/native/services/project_file_ingress_service.ts|services modules must not import from io: ../io/project_file_ingress_command.js',
  'lint-architecture/no-restricted-imports:layer-boundary|esm/native/services/project_reset_default_payload.ts|services modules must not import from io: ../io/project_payload_canonical.js',
  'lint-architecture/no-restricted-imports:layer-boundary|esm/native/services/project_reset_default_payload.ts|services modules must not import from io: ../io/project_payload_shared.js',
  'lint-architecture/no-restricted-globals|esm/native/ui/react/notes/notes_overlay_editor_workflow_events.ts|Route globalThis access through runtime/browser_env or injected deps.',
  'lint-architecture/no-restricted-globals|esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_drawing_hooks.ts|Route globalThis access through runtime/browser_env or injected deps.',
  'lint-architecture/no-restricted-globals|esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_interaction_session_hooks.ts|Route globalThis access through runtime/browser_env or injected deps.',
  'lint-architecture/no-restricted-globals|esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_history_hooks.ts|Route globalThis access through runtime/browser_env or injected deps.',
  'lint-architecture/no-restricted-globals|esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_history_runtime.ts|Route globalThis access through runtime/browser_env or injected deps.',
]);

function baselineKey(failure) {
  return `${failure.rule}|${failure.file}|${failure.message}`;
}

function isBaselinedViolation(failure) {
  return BASELINED_VIOLATIONS.has(baselineKey(failure));
}

export function getLintArchitectureBaselineCount() {
  return BASELINED_VIOLATIONS.size;
}

export function getLintArchitectureBaselineEntries() {
  return [...BASELINED_VIOLATIONS].sort();
}

const LAYER_DISALLOWED = {
  adapters: ['kernel', 'platform', 'services', 'builder', 'ui', 'data', 'io'],
  kernel: ['platform', 'services', 'builder', 'ui', 'adapters', 'data', 'io'],
  builder: ['kernel', 'platform', 'services', 'ui', 'adapters', 'data', 'io'],
  platform: ['services', 'builder', 'ui', 'adapters', 'data', 'io'],
  services: ['platform', 'builder', 'ui', 'adapters', 'data', 'io'],
  ui: ['kernel', 'platform', 'builder', 'adapters', 'data', 'io'],
};

function normalizeRel(value) {
  return String(value || '').replaceAll(path.sep, '/');
}

function toRel(file, root = ROOT) {
  return normalizeRel(path.relative(root, file));
}

function isSourceFile(file) {
  return SOURCE_EXT_RE.test(file) && !file.endsWith('.d.ts');
}

function walkSourceFiles(root = ROOT, subdirs = ['esm', 'types']) {
  const out = [];
  function visit(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile() && isSourceFile(full)) {
        out.push(full);
      }
    }
  }
  for (const subdir of subdirs) visit(path.join(root, subdir));
  return out.sort();
}

function getNativeLayer(rel) {
  const match = /^esm\/native\/([^/]+)\//.exec(rel);
  return match ? match[1] : null;
}

function isBrowserGlobalScope(rel) {
  return /^esm\/native\/(?:platform|services|kernel|io|builder|ui)\//.test(rel);
}

function isBrowserGlobalException(rel) {
  return (
    rel === 'esm/test_no_side_effects_on_import.mjs' || /^esm\/entry.*\.(?:js|mjs|ts|tsx|mts)$/.test(rel)
  );
}

function isAppBagScope(rel) {
  return /^esm\/native\//.test(rel);
}

function isAppBagException(rel) {
  return (
    /^esm\/native\/runtime\//.test(rel) ||
    rel === 'esm/native/kernel/cfg_surface.ts' ||
    rel === 'esm/native/ui/feedback.ts'
  );
}

function readStringLiteral(node, astApi) {
  if (!node) return null;
  if (astApi.isStringLiteralLike(node)) return String(node.text || '');
  return null;
}

function unwrapExpression(node, astApi) {
  let cur = node;
  while (cur) {
    if (astApi.isParenthesizedExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (
      astApi.isAsExpression(cur) ||
      astApi.isTypeAssertionExpression(cur) ||
      astApi.isNonNullExpression(cur)
    ) {
      cur = cur.expression;
      continue;
    }
    return cur;
  }
  return cur;
}

function getImportTargetRel(rel, specifier) {
  if (!specifier || !specifier.startsWith('.')) return null;
  return normalizeRel(path.normalize(path.join(path.dirname(rel), specifier)));
}

function importedNativeLayer(rel, specifier) {
  const resolved = getImportTargetRel(rel, specifier);
  if (!resolved) return null;
  return getNativeLayer(resolved);
}

function isRestrictedBrowserEnvImport(rel, specifier) {
  const raw = String(specifier || '');
  if (/\/runtime\/browser_env\.(?:js|ts)$/.test(raw)) return true;
  const resolved = getImportTargetRel(rel, raw);
  return !!resolved && /\/runtime\/browser_env(?:\.(?:js|ts))?$/.test(resolved);
}

function makeViolation(rule, rel, line, message) {
  return { rule, file: rel, line, message };
}

function lineOf(sourceFile, node, astApi) {
  return astApi.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile)).line + 1;
}

function isIdentifierReference(node, astApi) {
  const parent = node.parent;
  if (!parent) return true;
  if (astApi.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (astApi.isPropertyAssignment(parent) && parent.name === node) return false;
  if (astApi.isShorthandPropertyAssignment(parent) && parent.name === node) return true;
  if (astApi.isVariableDeclaration(parent) && parent.name === node) return false;
  if (parent.kind === astApi.SyntaxKind.ImportSpecifier) return false;
  if (parent.kind === astApi.SyntaxKind.ImportClause) return false;
  if (parent.kind === astApi.SyntaxKind.NamespaceImport) return false;
  if (parent.kind === astApi.SyntaxKind.ExportSpecifier) return false;
  if (parent.kind === astApi.SyntaxKind.PropertySignature) return false;
  if (parent.kind === astApi.SyntaxKind.PropertyDeclaration && parent.name === node) return false;
  if (parent.kind === astApi.SyntaxKind.MethodDeclaration && parent.name === node) return false;
  if (parent.kind === astApi.SyntaxKind.TypeReference) return false;
  return true;
}

function collectStaticModuleSpecifiers(sourceFile, astApi) {
  const specifiers = [];
  walkAst(
    sourceFile,
    node => {
      if (astApi.isImportDeclaration(node)) {
        const specifier = readStringLiteral(node.moduleSpecifier, astApi);
        if (specifier) specifiers.push({ node, specifier });
        return;
      }
      if (node.kind === astApi.SyntaxKind.ExportDeclaration) {
        const specifier = readStringLiteral(node.moduleSpecifier, astApi);
        if (specifier) specifiers.push({ node, specifier });
      }
    },
    { astApi }
  );
  return specifiers;
}

function collectImportBoundaryViolations(rel, sourceFile, astApi) {
  const failures = [];
  const layer = getNativeLayer(rel);
  const disallowed = layer ? LAYER_DISALLOWED[layer] || [] : [];

  for (const item of collectStaticModuleSpecifiers(sourceFile, astApi)) {
    const importedLayer = importedNativeLayer(rel, item.specifier);
    if (importedLayer && disallowed.includes(importedLayer)) {
      failures.push(
        makeViolation(
          'lint-architecture/no-restricted-imports:layer-boundary',
          rel,
          lineOf(sourceFile, item.node, astApi),
          `${layer} modules must not import from ${importedLayer}: ${item.specifier}`
        )
      );
    }
    if (
      isRestrictedBrowserEnvImport(rel, item.specifier) &&
      /^esm\/native\/(?:platform|services|io|builder|kernel|data)\//.test(rel)
    ) {
      failures.push(
        makeViolation(
          'lint-architecture/no-restricted-imports:browser-env',
          rel,
          lineOf(sourceFile, item.node, astApi),
          `core modules must not import runtime/browser_env directly: ${item.specifier}`
        )
      );
    }
  }

  return failures;
}

function collectBrowserGlobalViolations(rel, sourceFile, astApi) {
  if (!isBrowserGlobalScope(rel) || isBrowserGlobalException(rel)) return [];
  const failures = [];
  walkAst(
    sourceFile,
    node => {
      if (!astApi.isIdentifier(node)) return;
      const name = String(node.text || '');
      if (!RESTRICTED_BROWSER_GLOBALS.has(name)) return;
      if (!isIdentifierReference(node, astApi)) return;
      failures.push(
        makeViolation(
          'lint-architecture/no-restricted-globals',
          rel,
          lineOf(sourceFile, node, astApi),
          `Route ${name} access through runtime/browser_env or injected deps.`
        )
      );
    },
    { astApi }
  );
  return failures;
}

function collectAppBagViolations(rel, sourceFile, astApi) {
  if (!isAppBagScope(rel) || isAppBagException(rel)) return [];
  const failures = [];

  walkAst(
    sourceFile,
    node => {
      if (astApi.isPropertyAccessExpression(node)) {
        const obj = unwrapExpression(node.expression, astApi);
        const prop = String(node.name?.text || '');
        if (astApi.isIdentifier(obj) && obj.text === 'App' && APP_BAG_PROPS.has(prop)) {
          failures.push(
            makeViolation(
              'lint-architecture/no-restricted-syntax:app-bag',
              rel,
              lineOf(sourceFile, node, astApi),
              `Do not access legacy App.${prop} directly outside owner modules.`
            )
          );
        }
        return;
      }

      if (astApi.isElementAccessExpression(node)) {
        const obj = unwrapExpression(node.expression, astApi);
        const prop = readStringLiteral(node.argumentExpression, astApi);
        if (astApi.isIdentifier(obj) && obj.text === 'App' && APP_BAG_PROPS.has(prop)) {
          failures.push(
            makeViolation(
              'lint-architecture/no-restricted-syntax:app-bag',
              rel,
              lineOf(sourceFile, node, astApi),
              `Do not access legacy App[${JSON.stringify(prop)}] directly outside owner modules.`
            )
          );
        }
        return;
      }

      if (astApi.isVariableDeclaration(node) && astApi.isObjectBindingPattern(node.name)) {
        const init = unwrapExpression(node.initializer, astApi);
        if (!astApi.isIdentifier(init) || init.text !== 'App') return;
        for (const element of node.name.elements || []) {
          const propName = element.propertyName || element.name;
          const prop =
            propName && astApi.isIdentifier(propName)
              ? String(propName.text || '')
              : readStringLiteral(propName, astApi);
          if (APP_BAG_PROPS.has(prop)) {
            failures.push(
              makeViolation(
                'lint-architecture/no-restricted-syntax:app-bag',
                rel,
                lineOf(sourceFile, element, astApi),
                `Do not destructure legacy App.${prop} directly outside owner modules.`
              )
            );
          }
        }
      }
    },
    { astApi }
  );

  return failures;
}

export function auditLintArchitectureSource(rel, text, options = {}) {
  const astApi = options.astApi || requireAstAdapter('lint architecture contracts');
  const sourceFile = createSourceFile(rel, text, { astApi });
  return [
    ...collectImportBoundaryViolations(rel, sourceFile, astApi),
    ...collectBrowserGlobalViolations(rel, sourceFile, astApi),
    ...collectAppBagViolations(rel, sourceFile, astApi),
  ];
}

export function collectLintArchitectureViolations(options = {}) {
  const root = options.root || ROOT;
  const includeBaseline = options.includeBaseline === true;
  const astApi = options.astApi || requireAstAdapter('lint architecture contracts');
  const files = options.files || walkSourceFiles(root);
  const failures = [];
  for (const file of files) {
    const rel = toRel(file, root);
    const text = fs.readFileSync(file, 'utf8');
    for (const failure of auditLintArchitectureSource(rel, text, { astApi })) {
      if (!includeBaseline && isBaselinedViolation(failure)) continue;
      failures.push(failure);
    }
  }
  return failures.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule)
  );
}

function printFailures(failures) {
  if (!failures.length) {
    const baselineNote = BASELINED_VIOLATIONS.size
      ? ` (${BASELINED_VIOLATIONS.size} baselined current exception(s))`
      : '';
    console.log(`[Lint Architecture Contracts] passed${baselineNote}`);
    return;
  }
  console.error(`[Lint Architecture Contracts] ${failures.length} violation(s)`);
  for (const failure of failures) {
    console.error(`${failure.file}:${failure.line} ${failure.rule} ${failure.message}`);
  }
}

function main() {
  const failures = collectLintArchitectureViolations();
  printFailures(failures);
  if (failures.length) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) main();
