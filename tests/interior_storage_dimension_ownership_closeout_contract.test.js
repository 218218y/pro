import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const storageOwnerRel = 'esm/shared/dimensions/interior_storage_policy.ts';
const fittingsOwnerRel = 'esm/shared/dimensions/interior_fittings_policy.ts';
const uiShelfConsumerRel = 'esm/native/ui/react/tabs/interior_tab_local_state_shared.ts';
const approvedUiCompatibilityBranches = new Set(['shelves']);
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const focusedPolicySymbols = new Set([
  'INTERIOR_STORAGE_GRID_POLICY',
  'INTERIOR_STORAGE_BARRIER_POLICY',
  'INTERIOR_STORAGE_PREVIEW_POLICY',
  'INTERIOR_STORAGE_CLAMP_POLICY',
  'INTERIOR_STORAGE_LAYOUT_POLICY',
  'INTERIOR_STORAGE_DEFAULTS_POLICY',
]);
const publicStorageSymbols = new Set([...focusedPolicySymbols, 'INTERIOR_STORAGE_POLICY']);
const forbiddenApiExports = new Set([...publicStorageSymbols, 'INTERIOR_FITTINGS_DIMENSIONS']);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const expectedFocusedOwnerImports = Object.freeze({
  'esm/native/builder/core_storage_compute_custom.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_layouts.ts': Object.freeze(['INTERIOR_STORAGE_BARRIER_POLICY']),
  'esm/native/builder/render_interior_custom_ops_layout.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/builder/render_interior_custom_ops.ts': Object.freeze(['INTERIOR_STORAGE_GRID_POLICY']),
  'esm/native/builder/render_interior_preset_ops.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze(['INTERIOR_STORAGE_BARRIER_POLICY']),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_support_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_preview_interior_hover_apply.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/features/interior_layout_presets/ops.ts': Object.freeze(['INTERIOR_STORAGE_BARRIER_POLICY']),
  'esm/native/features/modules_configuration/module_defaults.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/features/stack_split/module_config.ts': Object.freeze([
    'INTERIOR_STORAGE_DEFAULTS_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_commit.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_content.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_commit_drawers.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/shared/dimensions/drawer_sketch_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  [fittingsOwnerRel]: Object.freeze(['INTERIOR_STORAGE_POLICY']),
});

const expectedPolicyShapes = Object.freeze({
  INTERIOR_STORAGE_GRID_POLICY: Object.freeze(['gridDivisionsDefault']),
  INTERIOR_STORAGE_BARRIER_POLICY: Object.freeze([
    'barrierHeightM',
    'barrierHeightMinM',
    'barrierHeightMaxM',
    'barrierFrontZOffsetM',
    'barrierWidthMinM',
    'barrierWidthClearanceM',
  ]),
  INTERIOR_STORAGE_PREVIEW_POLICY: Object.freeze(['previewThicknessMinM']),
  INTERIOR_STORAGE_CLAMP_POLICY: Object.freeze(['clampPadMinM', 'clampPadMaxM', 'clampPadWoodRatio']),
  INTERIOR_STORAGE_LAYOUT_POLICY: Object.freeze(['minHeightExtraM', 'minHeightWoodMultiplier']),
  INTERIOR_STORAGE_DEFAULTS_POLICY: Object.freeze(['defaultLowerShelfSlots']),
});

const aggregateProjections = Object.freeze({
  gridDivisionsDefault: 'INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault',
  barrierHeightM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM',
  barrierHeightMinM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMinM',
  barrierHeightMaxM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMaxM',
  barrierFrontZOffsetM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM',
  barrierWidthMinM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM',
  barrierWidthClearanceM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM',
  previewThicknessMinM: 'INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM',
  clampPadMinM: 'INTERIOR_STORAGE_CLAMP_POLICY.clampPadMinM',
  clampPadMaxM: 'INTERIOR_STORAGE_CLAMP_POLICY.clampPadMaxM',
  clampPadWoodRatio: 'INTERIOR_STORAGE_CLAMP_POLICY.clampPadWoodRatio',
  minHeightExtraM: 'INTERIOR_STORAGE_LAYOUT_POLICY.minHeightExtraM',
  minHeightWoodMultiplier: 'INTERIOR_STORAGE_LAYOUT_POLICY.minHeightWoodMultiplier',
  defaultLowerShelfSlots: 'INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots',
});

function normalizeRel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && sourceFileExtensions.includes(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function stripQueryHash(specifier) {
  const query = specifier.indexOf('?');
  const hash = specifier.indexOf('#');
  const cut = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  return cut === -1 ? specifier : specifier.slice(0, cut);
}

function canonicalModuleTarget(file) {
  return path.normalize(path.resolve(file)).toLowerCase();
}

function existingFile(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  const clean = stripQueryHash(specifier);
  if (!clean.startsWith('.')) return null;
  const rawTarget = path.resolve(path.dirname(fromFile), clean);
  const extension = path.extname(rawTarget);
  const candidates = [rawTarget];
  if (runtimeExtensionCandidates[extension]) {
    const stem = rawTarget.slice(0, -extension.length);
    for (const candidateExtension of runtimeExtensionCandidates[extension]) {
      candidates.push(`${stem}${candidateExtension}`);
    }
  } else if (!extension) {
    for (const candidateExtension of sourceFileExtensions) {
      candidates.push(`${rawTarget}${candidateExtension}`);
      candidates.push(path.join(rawTarget, `index${candidateExtension}`));
    }
  }
  return canonicalModuleTarget(existingFile(candidates) ?? rawTarget);
}

const facadeTarget = canonicalModuleTarget(path.join(root, facadeRel));
const publicDimensionsTarget = canonicalModuleTarget(path.join(root, publicDimensionsRel));
const storageOwnerTarget = canonicalModuleTarget(path.join(root, storageOwnerRel));

function dependencyTarget(fromFile, dependency) {
  return resolveModuleTarget(fromFile, dependency.specifier);
}

function compatibilitySourceKind(fromFile, specifier) {
  const target = resolveModuleTarget(fromFile, specifier);
  if (target === facadeTarget) return 'facade';
  if (target === publicDimensionsTarget) return 'public-barrel';
  return null;
}

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function staticMemberName(node) {
  if (node?.type !== 'MemberExpression') return null;
  if (!node.computed) return identifierName(node.property);
  return node.property?.type === 'Literal' && typeof node.property.value === 'string'
    ? node.property.value
    : null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = staticMemberName(node);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
}

function dynamicImportExpression(node) {
  const unwrapped = node?.type === 'AwaitExpression' ? node.argument : node;
  return unwrapped?.type === 'ImportExpression' ? unwrapped : null;
}

function dynamicImportSpecifier(node) {
  const importExpression = dynamicImportExpression(node);
  return importExpression?.source?.type === 'Literal' && typeof importExpression.source.value === 'string'
    ? importExpression.source.value
    : null;
}

function objectPatternProperties(pattern) {
  return pattern?.type === 'ObjectPattern' ? (pattern.properties ?? []) : [];
}

function addBinding(set, name) {
  if (!name || set.has(name)) return false;
  set.add(name);
  return true;
}

function directCompatibilityImportRecords(file, analysis) {
  const rel = normalizeRel(file);
  if (!rel.startsWith('esm/native/')) return [];
  return analysis.imports
    .filter(
      dependency =>
        dependency.exportedSymbols.length === 0 &&
        dependency.importedSymbols.includes('INTERIOR_FITTINGS_DIMENSIONS')
    )
    .map(dependency => {
      const binding = dependency.bindings.find(
        candidate => candidate.importedName === 'INTERIOR_FITTINGS_DIMENSIONS'
      );
      return {
        file: rel,
        target: dependencyTarget(file, dependency),
        kind: dependency.kind,
        syntax: dependency.syntax,
        localName: binding?.localName ?? null,
      };
    });
}

function assertApprovedCompatibilityImporterUniverse(imports) {
  assert.equal(imports.length <= 1, true);
  for (const entry of imports) {
    assert.deepEqual(entry, {
      file: uiShelfConsumerRel,
      target: facadeTarget,
      kind: 'value',
      syntax: 'static-import',
      localName: 'INTERIOR_FITTINGS_DIMENSIONS',
    });
  }
}

function unwrapObjectFreeze(node) {
  if (
    node?.type !== 'CallExpression' ||
    memberPath(node.callee) !== 'Object.freeze' ||
    node.arguments?.length !== 1
  ) {
    return null;
  }
  return node.arguments[0];
}

function objectExpression(node) {
  const unwrapped = unwrapObjectFreeze(node) ?? node;
  return unwrapped?.type === 'ObjectExpression' ? unwrapped : null;
}

function findVariable(sourceFile, name) {
  let found = null;
  walkAst(sourceFile, node => {
    if (
      !found &&
      node?.type === 'VariableDeclarator' &&
      node.id?.type === 'Identifier' &&
      node.id.name === name
    ) {
      found = node;
    }
  });
  return found;
}

function objectPropertyFacts(object) {
  return (object?.properties ?? []).map(property => ({
    type: property?.type,
    key: identifierName(property?.key),
    value: property?.value,
  }));
}

function focusedRootsInObject(object) {
  const roots = new Set();
  walkAst(object, node => {
    if (node?.type === 'Identifier' && focusedPolicySymbols.has(node.name)) roots.add(node.name);
  });
  return roots;
}

function inspectProductionSource(file, source) {
  const rel = normalizeRel(file);
  const sourceFile = createSourceFile(rel, source);
  const analysis = analyzeModuleDependencies(file, source);
  const compatibilityBindings = new Set();
  const namespaceBindings = new Set();
  const storageBindings = new Set();
  const declarations = [];
  const violations = [];
  const seenViolations = new Set();

  const addViolation = (kind, node, detail = '') => {
    const key = `${kind}:${node?.start ?? -1}:${detail}`;
    if (seenViolations.has(key)) return;
    seenViolations.add(key);
    violations.push({ kind, detail, start: node?.start ?? -1 });
  };

  for (const dependency of analysis.imports) {
    const sourceKind = compatibilitySourceKind(file, dependency.specifier);
    const target = dependencyTarget(file, dependency);
    const isReExport = dependency.exportedSymbols.length > 0;

    if (sourceKind && isReExport) {
      const isApprovedPublicWildcard =
        rel === publicDimensionsRel &&
        sourceKind === 'facade' &&
        dependency.importedSymbols.length === 1 &&
        dependency.importedSymbols[0] === '*' &&
        dependency.exportedSymbols.length === 1 &&
        dependency.exportedSymbols[0] === '*';
      if (
        !isApprovedPublicWildcard &&
        (dependency.importedSymbols.includes('*') ||
          dependency.importedSymbols.includes('INTERIOR_FITTINGS_DIMENSIONS'))
      ) {
        addViolation('compatibility-bridge', { start: dependency.statementStart }, dependency.specifier);
      }
    }

    if (sourceKind && dependency.kind === 'dynamic') {
      addViolation('compatibility-dynamic', { start: dependency.statementStart }, dependency.specifier);
    }

    for (const record of directCompatibilityImportRecords(file, { imports: [dependency] })) {
      const isApprovedUiImport =
        record.file === uiShelfConsumerRel &&
        record.target === facadeTarget &&
        record.kind === 'value' &&
        record.syntax === 'static-import' &&
        record.localName === 'INTERIOR_FITTINGS_DIMENSIONS';
      if (!isApprovedUiImport) {
        addViolation(
          'unapproved-compatibility-importer',
          { start: dependency.statementStart },
          `${record.file}:${dependency.specifier}`
        );
      }
    }

    if (sourceKind && !isReExport) {
      for (const binding of dependency.bindings) {
        if (binding.importedName === '*' && binding.localName) {
          addBinding(namespaceBindings, binding.localName);
          addViolation('compatibility-namespace', { start: dependency.statementStart }, dependency.specifier);
        } else if (binding.importedName === 'INTERIOR_FITTINGS_DIMENSIONS') {
          addBinding(compatibilityBindings, binding.localName);
        }
      }
    }

    if (target === storageOwnerTarget) {
      if (dependency.importedSymbols.includes('INTERIOR_STORAGE_POLICY') && rel !== fittingsOwnerRel) {
        addViolation('aggregate-owner-import', { start: dependency.statementStart }, rel);
      }
      for (const binding of dependency.bindings) {
        if (
          publicStorageSymbols.has(binding.importedName) &&
          binding.localName &&
          binding.localName !== binding.importedName
        ) {
          addViolation(
            'focused-owner-alias',
            { start: dependency.statementStart },
            `${binding.importedName} as ${binding.localName}`
          );
        }
      }
    }
  }

  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator') declarations.push(node);
  });

  const expressionKind = node => {
    if (!node) return null;
    if (
      node.type === 'TSAsExpression' ||
      node.type === 'TSTypeAssertion' ||
      node.type === 'TSNonNullExpression' ||
      node.type === 'ParenthesizedExpression'
    ) {
      return expressionKind(node.expression);
    }
    if (node.type === 'AwaitExpression') return expressionKind(node.argument);
    if (node.type === 'Identifier') {
      if (compatibilityBindings.has(node.name)) return 'compatibility';
      if (namespaceBindings.has(node.name)) return 'namespace';
      if (storageBindings.has(node.name)) return 'storage';
      return null;
    }
    if (node.type === 'ImportExpression') {
      const specifier = dynamicImportSpecifier(node);
      return specifier && compatibilitySourceKind(file, specifier) ? 'namespace' : null;
    }
    if (node.type !== 'MemberExpression') return null;
    const objectKind = expressionKind(node.object);
    const propertyName = staticMemberName(node);
    if (objectKind === 'namespace' && propertyName === 'INTERIOR_FITTINGS_DIMENSIONS') {
      return 'compatibility';
    }
    if (objectKind === 'compatibility') {
      if (propertyName === 'storage') return 'storage';
      if (node.computed && propertyName === null) return 'storage';
      return null;
    }
    if (objectKind === 'storage') return 'storage';
    return null;
  };

  const bindPattern = (pattern, sourceKind, node) => {
    let changed = false;
    if (pattern?.type === 'Identifier') {
      if (sourceKind === 'compatibility') changed = addBinding(compatibilityBindings, pattern.name);
      else if (sourceKind === 'namespace') changed = addBinding(namespaceBindings, pattern.name);
      else if (sourceKind === 'storage') changed = addBinding(storageBindings, pattern.name);
      return changed;
    }
    for (const property of objectPatternProperties(pattern)) {
      if (property?.type !== 'Property') continue;
      const key = property.computed ? identifierName(property.key) : identifierName(property.key);
      if (sourceKind === 'namespace' && key === 'INTERIOR_FITTINGS_DIMENSIONS') {
        changed = bindPattern(property.value, 'compatibility', node) || changed;
      } else if (sourceKind === 'compatibility' && key === 'storage') {
        addViolation('compatibility-storage-destructure', node, 'storage');
        changed = bindPattern(property.value, 'storage', node) || changed;
      } else if (sourceKind === 'compatibility' && property.computed && key === null) {
        addViolation('compatibility-storage-computed', node, 'dynamic destructuring');
      }
    }
    return changed;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of declarations) {
      const specifier = dynamicImportSpecifier(declaration.init);
      if (specifier && compatibilitySourceKind(file, specifier)) {
        const dynamicKind = declaration.id?.type === 'ObjectPattern' ? 'namespace' : 'namespace';
        changed = bindPattern(declaration.id, dynamicKind, declaration) || changed;
      } else {
        changed = bindPattern(declaration.id, expressionKind(declaration.init), declaration) || changed;
      }
    }
  }

  const addLocalBridgeViolation = (kind, node, exportedName) => {
    if (!kind) return;
    addViolation('compatibility-local-bridge', node, `${kind}:${exportedName}`);
  };

  walkAst(sourceFile, node => {
    if (node?.type === 'ExportNamedDeclaration' && !node.source) {
      for (const specifier of node.specifiers ?? []) {
        const localName = identifierName(specifier.local);
        addLocalBridgeViolation(
          localName ? expressionKind(specifier.local) : null,
          specifier,
          identifierName(specifier.exported) ?? localName ?? 'named'
        );
      }
      if (node.declaration?.type === 'VariableDeclaration') {
        for (const declaration of node.declaration.declarations ?? []) {
          addLocalBridgeViolation(
            expressionKind(declaration.init),
            declaration,
            identifierName(declaration.id) ?? 'variable'
          );
        }
      }
    }

    if (node?.type === 'ExportDefaultDeclaration') {
      addLocalBridgeViolation(expressionKind(node.declaration), node, 'default');
    }

    if (node?.type === 'MemberExpression') {
      const objectKind = expressionKind(node.object);
      const propertyName = staticMemberName(node);
      if (objectKind === 'compatibility' && propertyName === 'storage') {
        addViolation(
          node.computed ? 'compatibility-storage-computed' : 'compatibility-storage-member',
          node,
          'storage'
        );
      } else if (objectKind === 'compatibility' && node.computed && propertyName === null) {
        addViolation('compatibility-storage-computed', node, 'dynamic key');
      } else if (
        objectKind === 'compatibility' &&
        rel === uiShelfConsumerRel &&
        !approvedUiCompatibilityBranches.has(propertyName)
      ) {
        addViolation('unapproved-compatibility-branch', node, propertyName ?? 'unknown');
      }
    }

    if (node?.type !== 'VariableDeclarator' || rel === storageOwnerRel) return;
    const object = objectExpression(node.init);
    if (!object) return;
    const roots = focusedRootsInObject(object);
    if (
      roots.has('INTERIOR_STORAGE_BARRIER_POLICY') &&
      roots.has('INTERIOR_STORAGE_GRID_POLICY') &&
      roots.has('INTERIOR_STORAGE_DEFAULTS_POLICY')
    ) {
      addViolation('local-storage-aggregate', node, [...roots].sort().join(','));
    }
  });

  return { analysis, violations };
}

test('Interior Storage closeout has zero repository compatibility consumers and one approved wildcard', () => {
  const wildcardReExports = [];
  const compatibilityImporters = [];
  for (const file of listSourceFiles(path.join(root, 'esm'))) {
    const rel = normalizeRel(file);
    const source = fs.readFileSync(file, 'utf8');
    const inspection = inspectProductionSource(file, source);
    assert.deepEqual(inspection.violations, [], rel);
    compatibilityImporters.push(...directCompatibilityImportRecords(file, inspection.analysis));

    for (const dependency of inspection.analysis.imports) {
      if (
        dependencyTarget(file, dependency) === facadeTarget &&
        dependency.importedSymbols.includes('*') &&
        dependency.exportedSymbols.includes('*')
      ) {
        wildcardReExports.push({
          file: rel,
          specifier: dependency.specifier,
          syntax: dependency.syntax,
        });
      }
    }
  }

  assert.deepEqual(wildcardReExports, [
    {
      file: publicDimensionsRel,
      specifier: '../../../shared/wardrobe_dimension_tokens_shared.js',
      syntax: 'static-re-export',
    },
  ]);
  assertApprovedCompatibilityImporterUniverse(compatibilityImporters);

  const uiSource = read(uiShelfConsumerRel);
  assert.match(uiSource, /INTERIOR_FITTINGS_DIMENSIONS\.shelves\.regularDepthM/u);
  assert.doesNotMatch(uiSource, /INTERIOR_FITTINGS_DIMENSIONS(?:\.storage|\[['"]storage['"]\])/u);
});

test('Interior Storage focused ownership is exactly 33 direct unaliased static value imports', () => {
  const actual = {};
  let statements = 0;

  for (const file of listSourceFiles(path.join(root, 'esm'))) {
    const rel = normalizeRel(file);
    const analysis = analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'));
    const dependencies = analysis.imports.filter(
      dependency => dependencyTarget(file, dependency) === storageOwnerTarget
    );
    if (!dependencies.length) continue;

    assert.equal(dependencies.length, 1, rel);
    const dependency = dependencies[0];
    statements += 1;
    assert.equal(dependency.kind, 'value', rel);
    assert.equal(dependency.syntax, 'static-import', rel);
    assert.deepEqual(dependency.exportedSymbols, [], rel);
    assert.equal(dependency.importedSymbols.includes('*'), false, rel);
    assert.deepEqual(
      dependency.bindings.map(binding => ({
        importedName: binding.importedName,
        localName: binding.localName,
        exportedName: binding.exportedName,
      })),
      dependency.importedSymbols.map(symbol => ({
        importedName: symbol,
        localName: symbol,
        exportedName: null,
      })),
      rel
    );
    actual[rel] = dependency.importedSymbols;
  }

  assert.equal(Object.keys(actual).length, 33);
  assert.equal(statements, 33);
  assert.deepEqual(
    Object.fromEntries(Object.entries(actual).sort(([left], [right]) => left.localeCompare(right))),
    Object.fromEntries(
      Object.entries(expectedFocusedOwnerImports)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([rel, symbols]) => [rel, [...symbols]])
    )
  );
  assert.deepEqual(
    Object.entries(actual)
      .filter(([, symbols]) => symbols.includes('INTERIOR_STORAGE_POLICY'))
      .map(([rel]) => rel),
    [fittingsOwnerRel]
  );
});

test('Interior Storage owner has one dependency, exact focused shapes, frozen defaults, and direct aggregate projections', () => {
  const source = read(storageOwnerRel);
  const absolute = path.join(root, storageOwnerRel);
  const analysis = analyzeModuleDependencies(absolute, source);
  assert.deepEqual(
    analysis.imports.map(({ specifier, kind, syntax, importedSymbols, exportedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      exportedSymbols,
      bindings,
    })),
    [
      {
        specifier: './units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['meters'],
        exportedSymbols: [],
        bindings: [{ importedName: 'meters', localName: 'meters', exportedName: null }],
      },
    ]
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|interior_fittings_policy/u);

  const sourceFile = createSourceFile(storageOwnerRel, source);
  for (const [name, expectedKeys] of Object.entries(expectedPolicyShapes)) {
    const declaration = findVariable(sourceFile, name);
    assert.ok(declaration, name);
    const object = objectExpression(declaration.init);
    assert.ok(object, name);
    assert.deepEqual(
      objectPropertyFacts(object).map(property => property.key),
      expectedKeys,
      name
    );
  }

  const defaultSlots = findVariable(sourceFile, 'DEFAULT_LOWER_SHELF_SLOTS');
  assert.ok(defaultSlots);
  const defaultArray = unwrapObjectFreeze(defaultSlots.init);
  assert.equal(defaultArray?.type, 'ArrayExpression');
  assert.deepEqual(
    defaultArray.elements.map(element => element?.value),
    [false, true, false, true, false, false]
  );

  const defaultsObject = objectExpression(findVariable(sourceFile, 'INTERIOR_STORAGE_DEFAULTS_POLICY')?.init);
  const defaultsFacts = objectPropertyFacts(defaultsObject);
  assert.equal(defaultsFacts[0]?.key, 'defaultLowerShelfSlots');
  assert.equal(identifierName(defaultsFacts[0]?.value), 'DEFAULT_LOWER_SHELF_SLOTS');

  const aggregateObject = objectExpression(findVariable(sourceFile, 'INTERIOR_STORAGE_POLICY')?.init);
  assert.ok(aggregateObject);
  const aggregateFacts = objectPropertyFacts(aggregateObject);
  assert.deepEqual(
    aggregateFacts.map(property => property.key),
    Object.keys(aggregateProjections)
  );
  assert.deepEqual(
    Object.fromEntries(aggregateFacts.map(property => [property.key, memberPath(property.value)])),
    aggregateProjections
  );
  assert.equal(
    aggregateFacts.every(
      property => property.type === 'Property' && property.value?.type === 'MemberExpression'
    ),
    true
  );

  const forbiddenAggregateNodes = [];
  walkAst(aggregateObject, node => {
    if (
      node !== aggregateObject &&
      (node?.type === 'Literal' ||
        node?.type === 'ArrayExpression' ||
        node?.type === 'SpreadElement' ||
        memberPath(node) === 'Object.assign')
    ) {
      forbiddenAggregateNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenAggregateNodes, []);
});

test('Interior Fittings projects the canonical storage aggregate directly and public APIs do not export it', () => {
  const source = read(fittingsOwnerRel);
  const absolute = path.join(root, fittingsOwnerRel);
  const analysis = analyzeModuleDependencies(absolute, source);
  const storageDependencies = analysis.imports.filter(
    dependency => dependencyTarget(absolute, dependency) === storageOwnerTarget
  );
  assert.deepEqual(
    storageDependencies.map(({ specifier, kind, syntax, importedSymbols, exportedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      exportedSymbols,
      bindings,
    })),
    [
      {
        specifier: './interior_storage_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_STORAGE_POLICY'],
        exportedSymbols: [],
        bindings: [
          {
            importedName: 'INTERIOR_STORAGE_POLICY',
            localName: 'INTERIOR_STORAGE_POLICY',
            exportedName: null,
          },
        ],
      },
    ]
  );

  const sourceFile = createSourceFile(fittingsOwnerRel, source);
  const fittingsObject = objectExpression(findVariable(sourceFile, 'INTERIOR_FITTINGS_POLICY')?.init);
  assert.ok(fittingsObject);
  const storageProperties = objectPropertyFacts(fittingsObject).filter(
    property => property.key === 'storage'
  );
  assert.equal(storageProperties.length, 1);
  assert.equal(identifierName(storageProperties[0].value), 'INTERIOR_STORAGE_POLICY');
  assert.equal(
    fittingsObject.properties.some(property => property?.type === 'SpreadElement'),
    false
  );

  for (const rel of [
    'esm/native/runtime/api.ts',
    'esm/native/services/api.ts',
    'esm/native/services/api_runtime_base_surface.ts',
  ]) {
    const apiSource = read(rel);
    const apiExports = collectNamedModuleExports(rel, apiSource);
    assert.deepEqual(
      apiExports
        .map(entry => entry.exportedName)
        .filter(exportedName => forbiddenApiExports.has(exportedName)),
      [],
      rel
    );
    const apiFile = path.join(root, rel);
    const forbiddenReExports = analyzeModuleDependencies(apiFile, apiSource).imports.filter(dependency => {
      if (!dependency.exportedSymbols.length) return false;
      const target = dependencyTarget(apiFile, dependency);
      if (![storageOwnerTarget, facadeTarget, publicDimensionsTarget].includes(target)) return false;
      return (
        dependency.importedSymbols.includes('*') ||
        dependency.importedSymbols.some(symbol => forbiddenApiExports.has(symbol)) ||
        dependency.exportedSymbols.some(symbol => forbiddenApiExports.has(symbol))
      );
    });
    assert.deepEqual(forbiddenReExports, [], rel);
  }
});

test('Interior Storage closeout rejects compatibility paths, aggregate consumers, aliases, and recomposition', () => {
  const fixtureFile = path.join(root, 'esm/native/features/interior_storage_closeout_fixture.ts');
  const approvedUiFixtureFile = path.join(root, uiShelfConsumerRel);
  const approvedUiFacadeSpecifier = '../../../../shared/wardrobe_dimension_tokens_shared.js';
  const cases = [
    {
      name: 'named facade storage access',
      expectedKind: 'compatibility-storage-member',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM;",
    },
    {
      name: 'aliased facade storage access',
      expectedKind: 'compatibility-storage-member',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS as fittings } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = fittings.storage.barrierHeightM;",
    },
    {
      name: 'nested storage destructuring',
      expectedKind: 'compatibility-storage-destructure',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nconst { storage: { barrierHeightM } } = INTERIOR_FITTINGS_DIMENSIONS;\nexport { barrierHeightM };",
    },
    {
      name: 'computed storage access',
      expectedKind: 'compatibility-storage-computed',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = INTERIOR_FITTINGS_DIMENSIONS['storage'];",
    },
    {
      name: 'public barrel namespace access',
      expectedKind: 'compatibility-namespace',
      source:
        "import * as dimensions from './dimensions/index.js';\nexport const value = dimensions.INTERIOR_FITTINGS_DIMENSIONS.storage;",
    },
    {
      name: 'public barrel dynamic destructuring',
      expectedKind: 'compatibility-dynamic',
      source:
        "const { INTERIOR_FITTINGS_DIMENSIONS: fittings } = await import('./dimensions/index.js');\nexport const value = fittings.storage;",
    },
    {
      name: 'extensionless public barrel import',
      expectedKind: 'compatibility-storage-member',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from './dimensions';\nexport const value = INTERIOR_FITTINGS_DIMENSIONS.storage;",
    },
    {
      name: 'directory-index public barrel import',
      expectedKind: 'compatibility-storage-member',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from './dimensions/index';\nexport const value = INTERIOR_FITTINGS_DIMENSIONS.storage;",
    },
    {
      name: 'wildcard compatibility bridge',
      expectedKind: 'compatibility-bridge',
      source: "export * from '../../shared/wardrobe_dimension_tokens_shared.js';",
    },
    {
      name: 'named compatibility bridge',
      expectedKind: 'compatibility-bridge',
      source:
        "export { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';",
    },
    {
      name: 'two-statement named local compatibility bridge',
      expectedKind: 'compatibility-local-bridge',
      expectedBridgeSourceKind: 'compatibility',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport { INTERIOR_FITTINGS_DIMENSIONS };",
    },
    {
      name: 'compatibility alias bridge',
      expectedKind: 'compatibility-local-bridge',
      expectedBridgeSourceKind: 'compatibility',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nconst fittings = INTERIOR_FITTINGS_DIMENSIONS;\nexport { fittings };",
    },
    {
      name: 'exported compatibility variable bridge',
      expectedKind: 'compatibility-local-bridge',
      expectedBridgeSourceKind: 'compatibility',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const dimensions = INTERIOR_FITTINGS_DIMENSIONS;",
    },
    {
      name: 'default compatibility export bridge',
      expectedKind: 'compatibility-local-bridge',
      expectedBridgeSourceKind: 'compatibility',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport default INTERIOR_FITTINGS_DIMENSIONS;",
    },
    {
      name: 'storage alias export bridge',
      expectedKinds: ['compatibility-storage-member', 'compatibility-local-bridge'],
      expectedBridgeSourceKind: 'storage',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nconst storage = INTERIOR_FITTINGS_DIMENSIONS.storage;\nexport { storage };",
    },
    {
      name: 'namespace local compatibility bridge',
      expectedKinds: ['compatibility-namespace', 'compatibility-local-bridge'],
      expectedBridgeSourceKind: 'namespace',
      source: "import * as dimensions from './dimensions/index.js';\nexport { dimensions };",
    },
    {
      name: 'local compatibility bridge inside the approved UI path',
      file: approvedUiFixtureFile,
      expectedKind: 'compatibility-local-bridge',
      expectedBridgeSourceKind: 'compatibility',
      absentKind: 'unapproved-compatibility-importer',
      source: `import { INTERIOR_FITTINGS_DIMENSIONS } from '${approvedUiFacadeSpecifier}';\nexport { INTERIOR_FITTINGS_DIMENSIONS };`,
    },
    {
      name: 'direct compatibility import outside the approved UI path',
      expectedKind: 'unapproved-compatibility-importer',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = 1;",
    },
    {
      name: 'aliased compatibility import inside the approved UI path',
      file: approvedUiFixtureFile,
      expectedKind: 'unapproved-compatibility-importer',
      source: `import { INTERIOR_FITTINGS_DIMENSIONS as fittings } from '${approvedUiFacadeSpecifier}';\nexport const depth = fittings.shelves.regularDepthM;`,
    },
    {
      name: 'public-barrel compatibility import inside the approved UI path',
      file: approvedUiFixtureFile,
      expectedKind: 'unapproved-compatibility-importer',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../../features/dimensions/index.js';\nexport const depth = INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM;",
    },
    {
      name: 'unapproved non-storage compatibility branch inside the approved UI path',
      file: approvedUiFixtureFile,
      expectedKind: 'unapproved-compatibility-branch',
      source: `import { INTERIOR_FITTINGS_DIMENSIONS } from '${approvedUiFacadeSpecifier}';\nexport const value = INTERIOR_FITTINGS_DIMENSIONS.rods.topOffsetM;`,
    },
    {
      name: 'production aggregate owner import',
      expectedKind: 'aggregate-owner-import',
      source:
        "import { INTERIOR_STORAGE_POLICY } from '../../shared/dimensions/interior_storage_policy.js';\nexport const value = INTERIOR_STORAGE_POLICY;",
    },
    {
      name: 'focused owner alias',
      expectedKind: 'focused-owner-alias',
      source:
        "import { INTERIOR_STORAGE_GRID_POLICY as grid } from '../../shared/dimensions/interior_storage_policy.js';\nexport const value = grid.gridDivisionsDefault;",
    },
    {
      name: 'local storage aggregate',
      expectedKind: 'local-storage-aggregate',
      source:
        "import { INTERIOR_STORAGE_BARRIER_POLICY, INTERIOR_STORAGE_DEFAULTS_POLICY, INTERIOR_STORAGE_GRID_POLICY } from '../../shared/dimensions/interior_storage_policy.js';\nconst storage = { barrier: INTERIOR_STORAGE_BARRIER_POLICY, grid: INTERIOR_STORAGE_GRID_POLICY, defaults: INTERIOR_STORAGE_DEFAULTS_POLICY };\nexport { storage };",
    },
  ];

  for (const probe of cases) {
    const inspection = inspectProductionSource(probe.file ?? fixtureFile, probe.source);
    for (const expectedKind of probe.expectedKinds ?? [probe.expectedKind]) {
      assert.equal(
        inspection.violations.some(violation => violation.kind === expectedKind),
        true,
        `${probe.name}: ${expectedKind}`
      );
    }
    if (probe.absentKind) {
      assert.equal(
        inspection.violations.some(violation => violation.kind === probe.absentKind),
        false,
        `${probe.name}: ${probe.absentKind}`
      );
    }
    if (probe.expectedBridgeSourceKind) {
      assert.equal(
        inspection.violations.some(
          violation =>
            violation.kind === 'compatibility-local-bridge' &&
            violation.detail.startsWith(`${probe.expectedBridgeSourceKind}:`)
        ),
        true,
        `${probe.name}: ${probe.expectedBridgeSourceKind}`
      );
    }
  }
});

test('The approved facade shelf consumer is not an Interior Storage violation', () => {
  const fixtureFile = path.join(root, uiShelfConsumerRel);
  const source =
    "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../../../shared/wardrobe_dimension_tokens_shared.js';\nexport const depth = mToCm(INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM);";
  assert.deepEqual(inspectProductionSource(fixtureFile, source).violations, []);
  assert.deepEqual(
    inspectProductionSource(path.join(root, uiShelfConsumerRel), read(uiShelfConsumerRel)).violations,
    []
  );
});

test('The approved compatibility importer universe remains valid after the UI facade import disappears', () => {
  const fixtureFile = path.join(root, uiShelfConsumerRel);
  const inspection = inspectProductionSource(fixtureFile, 'export const depth = 42;');
  assert.deepEqual(inspection.violations, []);
  const compatibilityImporters = directCompatibilityImportRecords(fixtureFile, inspection.analysis);
  assert.deepEqual(compatibilityImporters, []);
  assert.doesNotThrow(() => assertApprovedCompatibilityImporterUniverse(compatibilityImporters));
});
