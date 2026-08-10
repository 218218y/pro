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
const CAPABILITY_ONLY_MODULES = new Set([
  'esm/native/services/viewer_measurement_tool_resolution.ts',
  'esm/native/services/viewer_measurement_tool_point_resolution.ts',
  'esm/native/services/viewer_measurement_tool_flow.ts',
]);
const VIEWER_MEASUREMENT_FACADE_MODULE = 'esm/native/services/viewer_measurement_tool.ts';

const CORNER_CORNICE_PLAN_MODULES = new Set([
  'esm/native/builder/corner_wing_cornice_plan.ts',
  'esm/native/builder/corner_connector_cornice_plan.ts',
  'esm/native/builder/corner_cornice_profile_plan.ts',
]);
const CORNER_CORNICE_PLAN_FORBIDDEN_IDENTIFIERS = new Set([
  'MutableRecord',
  'UnknownRecord',
  'THREE',
  'Mesh',
  'Shape',
  'ExtrudeGeometry',
  'BoxGeometry',
]);

const PART_HOVER_PREVIEW_PROTOCOL_MODULE =
  'esm/native/services/canvas_picking_part_hover_preview_protocol.ts';
const PART_HOVER_PREVIEW_CLIENT_MODULES = new Set([
  'esm/native/services/canvas_picking_generic_paint_hover_flow.ts',
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts',
  'esm/native/services/canvas_picking_removable_part_hover.ts',
]);
const PART_HOVER_PREVIEW_PROTOCOL_FORBIDDEN_IDENTIFIERS = new Set([
  'AppContainer',
  'UnknownRecord',
  'THREE',
  'setSketchPlacementPreview',
]);
const PART_HOVER_PREVIEW_CLIENT_FORBIDDEN_IDENTIFIERS = new Set([
  'UnknownRecord',
  'THREE',
  'getThreeMaybe',
  'createPreviewOpsArgs',
  'setSketchPlacementPreview',
]);

const TYPED_IR_FORBIDDEN_IDENTIFIERS = new Map([
  ['esm/native/builder/core_carcass_shell.ts', new Set(['MutableRecord'])],
  ['esm/native/builder/render_ops.ts', new Set(['__isBackPanelSeg', 'isBackPanelSeg'])],
  ['esm/native/builder/render_ops_shared.ts', new Set(['__isBackPanelSeg', 'isBackPanelSeg'])],
  ['esm/native/builder/render_ops_shared_args.ts', new Set(['__isBackPanelSeg', 'isBackPanelSeg'])],
  ['esm/native/builder/render_carcass_ops.ts', new Set(['__isBackPanelSeg', 'isBackPanelSeg'])],
]);

export const DEFAULT_BASELINE_PATH = path.join(__dirname, 'wp_lint_architecture_baseline.json');

function baselineKey(failure) {
  return `${failure.rule}|${failure.file}|${failure.message}`;
}

function normalizeBaselineEntry(entry, index = 0) {
  if (typeof entry === 'string') {
    const [rule, file, ...messageParts] = entry.split('|');
    const message = messageParts.join('|');
    if (!rule || !file || !message) {
      throw new Error(`Invalid lint architecture baseline string at index ${index}.`);
    }
    return { rule, file: normalizeRel(file), message };
  }

  if (!entry || typeof entry !== 'object') {
    throw new Error(`Invalid lint architecture baseline entry at index ${index}.`);
  }

  const rule = String(entry.rule || '').trim();
  const file = normalizeRel(String(entry.file || '').trim());
  const message = String(entry.message || '').trim();
  const reason = typeof entry.reason === 'string' && entry.reason.trim() ? entry.reason.trim() : undefined;
  if (!rule || !file || !message) {
    throw new Error(`Invalid lint architecture baseline entry at index ${index}.`);
  }
  return reason ? { rule, file, message, reason } : { rule, file, message };
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function readLintArchitectureBaselineEntries(baselinePath = DEFAULT_BASELINE_PATH) {
  if (!baselinePath || !fs.existsSync(baselinePath)) return [];
  const parsed = readJsonFile(baselinePath);
  const rawEntries = Array.isArray(parsed) ? parsed : parsed?.entries;
  if (!Array.isArray(rawEntries)) {
    throw new Error(
      `Lint architecture baseline must be an array or an object with an entries array: ${baselinePath}`
    );
  }
  const entries = rawEntries.map((entry, index) => normalizeBaselineEntry(entry, index));
  const seen = new Set();
  for (const entry of entries) {
    const key = baselineKey(entry);
    if (seen.has(key)) throw new Error(`Duplicate lint architecture baseline entry: ${key}`);
    seen.add(key);
  }
  return entries.sort(
    (a, b) =>
      a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule) || a.message.localeCompare(b.message)
  );
}

function createBaselineKeySet(entries) {
  return new Set(entries.map(baselineKey));
}

function isBaselinedViolation(failure, baselineKeys) {
  return baselineKeys.has(baselineKey(failure));
}

export function getLintArchitectureBaselineCount(options = {}) {
  return readLintArchitectureBaselineEntries(options.baselinePath).length;
}

export function getLintArchitectureBaselineEntries(options = {}) {
  return readLintArchitectureBaselineEntries(options.baselinePath).map(baselineKey);
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

function collectCapabilityBoundaryViolations(rel, sourceFile, astApi) {
  const isCapabilityCore = CAPABILITY_ONLY_MODULES.has(rel);
  const isFacade = rel === VIEWER_MEASUREMENT_FACADE_MODULE;
  if (!isCapabilityCore && !isFacade) return [];
  const failures = [];

  for (const item of collectStaticModuleSpecifiers(sourceFile, astApi)) {
    const target = getImportTargetRel(rel, item.specifier);
    if (!target) continue;
    if (/^esm\/native\/runtime\//.test(target) || /canvas_picking_local_helpers(?:\.|_)/.test(target)) {
      failures.push(
        makeViolation(
          isFacade
            ? 'lint-architecture/capability-boundary:viewer-measurement-facade-runtime'
            : 'lint-architecture/capability-boundary:viewer-measurement-runtime',
          rel,
          lineOf(sourceFile, item.node, astApi),
          isFacade
            ? `Viewer measurement public facade must construct ViewerMeasurementFeatureRuntime instead of importing ${item.specifier}.`
            : `Viewer measurement capability core must consume injected runtime capabilities instead of importing ${item.specifier}.`
        )
      );
    }
  }

  if (!isCapabilityCore) return failures;

  let appContainerNode = null;
  walkAst(
    sourceFile,
    node => {
      if (appContainerNode) return;
      if (!astApi.isIdentifier(node) || String(node.text || '') !== 'AppContainer') return;
      appContainerNode = node;
    },
    { astApi }
  );
  if (appContainerNode) {
    failures.push(
      makeViolation(
        'lint-architecture/capability-boundary:viewer-measurement-app-container',
        rel,
        lineOf(sourceFile, appContainerNode, astApi),
        'Viewer measurement capability core must depend on injected runtime capabilities, not AppContainer.'
      )
    );
  }

  return failures;
}

function collectTypedIrBoundaryViolations(rel, sourceFile, astApi) {
  const forbidden = TYPED_IR_FORBIDDEN_IDENTIFIERS.get(rel);
  if (!forbidden) return [];

  const failures = [];
  const reported = new Set();
  walkAst(
    sourceFile,
    node => {
      if (!astApi.isIdentifier(node)) return;
      const name = String(node.text || '');
      if (!forbidden.has(name) || reported.has(name)) return;
      reported.add(name);
      failures.push(
        makeViolation(
          'lint-architecture/typed-ir:carcass-shell',
          rel,
          lineOf(sourceFile, node, astApi),
          name === 'MutableRecord'
            ? 'Carcass shell geometry must use carcass_shell_ir typed operations instead of MutableRecord.'
            : 'Carcass render flow must use the canonical carcass_shell_ir back-panel guard instead of an injected duplicate guard.'
        )
      );
    },
    { astApi }
  );
  return failures;
}

function collectCornerCorniceTypedIrViolations(rel, sourceFile, astApi) {
  if (!CORNER_CORNICE_PLAN_MODULES.has(rel)) return [];
  const failures = [];
  const reported = new Set();
  walkAst(
    sourceFile,
    node => {
      if (!astApi.isIdentifier(node)) return;
      const name = String(node.text || '');
      if (!CORNER_CORNICE_PLAN_FORBIDDEN_IDENTIFIERS.has(name) || reported.has(name)) return;
      reported.add(name);
      failures.push(
        makeViolation(
          'lint-architecture/typed-ir:corner-cornice',
          rel,
          lineOf(sourceFile, node, astApi),
          `Corner cornice planners must emit corner_cornice_ir operations before rendering and cannot depend on ${name}.`
        )
      );
    },
    { astApi }
  );
  return failures;
}

function collectPartHoverPreviewProtocolViolations(rel, sourceFile, astApi) {
  const forbidden =
    rel === PART_HOVER_PREVIEW_PROTOCOL_MODULE
      ? PART_HOVER_PREVIEW_PROTOCOL_FORBIDDEN_IDENTIFIERS
      : PART_HOVER_PREVIEW_CLIENT_MODULES.has(rel)
        ? PART_HOVER_PREVIEW_CLIENT_FORBIDDEN_IDENTIFIERS
        : null;
  if (!forbidden) return [];

  const failures = [];
  const reported = new Set();
  walkAst(
    sourceFile,
    node => {
      if (!astApi.isIdentifier(node)) return;
      const name = String(node.text || '');
      if (!forbidden.has(name) || reported.has(name)) return;
      reported.add(name);
      failures.push(
        makeViolation(
          'lint-architecture/preview-protocol:part-hover',
          rel,
          lineOf(sourceFile, node, astApi),
          rel === PART_HOVER_PREVIEW_PROTOCOL_MODULE
            ? `Part-hover preview protocol must remain transport-agnostic and cannot depend on ${name}.`
            : `Part-hover preview clients must use the canonical preview runtime instead of ${name}.`
        )
      );
    },
    { astApi }
  );
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
    ...collectCapabilityBoundaryViolations(rel, sourceFile, astApi),
    ...collectTypedIrBoundaryViolations(rel, sourceFile, astApi),
    ...collectCornerCorniceTypedIrViolations(rel, sourceFile, astApi),
    ...collectPartHoverPreviewProtocolViolations(rel, sourceFile, astApi),
    ...collectBrowserGlobalViolations(rel, sourceFile, astApi),
    ...collectAppBagViolations(rel, sourceFile, astApi),
  ];
}

function compareFailures(a, b) {
  return a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule);
}

export function collectLintArchitectureReport(options = {}) {
  const root = options.root || ROOT;
  const astApi = options.astApi || requireAstAdapter('lint architecture contracts');
  const files = options.files || walkSourceFiles(root);
  const baselineEntries =
    options.baselineEntries || readLintArchitectureBaselineEntries(options.baselinePath);
  const baselineKeys = createBaselineKeySet(baselineEntries);
  const violations = [];

  for (const file of files) {
    const rel = toRel(file, root);
    const text = fs.readFileSync(file, 'utf8');
    for (const failure of auditLintArchitectureSource(rel, text, { astApi })) {
      violations.push(failure);
    }
  }

  violations.sort(compareFailures);
  const actualKeys = createBaselineKeySet(violations);
  const baselinedViolations = violations.filter(failure => isBaselinedViolation(failure, baselineKeys));
  const unbaselinedViolations = violations.filter(failure => !isBaselinedViolation(failure, baselineKeys));
  const staleBaselineEntries = baselineEntries.filter(entry => !actualKeys.has(baselineKey(entry)));

  return {
    baselineEntries,
    baselinedViolations,
    staleBaselineEntries,
    unbaselinedViolations,
    violations,
  };
}

export function collectLintArchitectureViolations(options = {}) {
  const report = collectLintArchitectureReport(options);
  const failures = options.includeBaseline === true ? report.violations : report.unbaselinedViolations;
  return [...failures].sort(compareFailures);
}

function formatBaselineDocument(violations) {
  const entries = [...violations].sort(compareFailures).map(failure => ({
    rule: failure.rule,
    file: failure.file,
    message: failure.message,
    reason: 'existing lint architecture exception; remove after the owning layer is migrated',
  }));
  return `${JSON.stringify({ entries }, null, 2)}\n`;
}

function printFailureGroup(title, failures) {
  if (!failures.length) return;
  console.error(`[Lint Architecture Contracts] ${title}: ${failures.length}`);
  for (const failure of failures) {
    const line = typeof failure.line === 'number' ? `:${failure.line}` : '';
    console.error(`- ${failure.file}${line} ${failure.rule} ${failure.message}`);
  }
}

function printReport(report, options = {}) {
  const visibleViolations = options.includeBaseline ? report.violations : report.unbaselinedViolations;
  if (!visibleViolations.length && !report.staleBaselineEntries.length) {
    const baselineNote = report.baselineEntries.length
      ? ` (${report.baselineEntries.length} baselined current exception(s))`
      : '';
    console.log(`[Lint Architecture Contracts] passed${baselineNote}`);
    return;
  }

  if (options.includeBaseline && report.baselinedViolations.length) {
    printFailureGroup('baselined violation(s)', report.baselinedViolations);
  }
  printFailureGroup('unbaselined violation(s)', report.unbaselinedViolations);
  printFailureGroup('stale baseline entrie(s)', report.staleBaselineEntries);
}

function parseArgs(argv) {
  const options = { baselinePath: DEFAULT_BASELINE_PATH, includeBaseline: false, updateBaseline: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--include-baseline') {
      options.includeBaseline = true;
      continue;
    }
    if (arg === '--update-baseline') {
      options.updateBaseline = true;
      continue;
    }
    if (arg === '--baseline') {
      const next = argv[i + 1];
      if (!next) throw new Error('--baseline requires a file path');
      options.baselinePath = path.resolve(next);
      i += 1;
      continue;
    }
    if (arg.startsWith('--baseline=')) {
      options.baselinePath = path.resolve(arg.slice('--baseline='.length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = collectLintArchitectureReport({ baselinePath: options.baselinePath });

  if (options.updateBaseline) {
    fs.writeFileSync(options.baselinePath, formatBaselineDocument(report.violations));
    console.log(
      `[Lint Architecture Contracts] wrote ${report.violations.length} baseline entrie(s): ${path.relative(ROOT, options.baselinePath)}`
    );
    return;
  }

  printReport(report, { includeBaseline: options.includeBaseline });
  if (report.unbaselinedViolations.length || report.staleBaselineEntries.length) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) main();
