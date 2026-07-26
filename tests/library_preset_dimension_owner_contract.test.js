import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ownerRel = 'esm/shared/dimensions/library_preset_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const stackSplitSpecifier = './stack_split_policy.js';
const ownerFacadeSpecifier = './dimensions/library_preset_policy.js';
const stackSplitScalars = Object.freeze([
  'STACK_SPLIT_LOWER_DEPTH_MIN',
  'STACK_SPLIT_LOWER_HEIGHT_MIN',
  'STACK_SPLIT_MIN_TOP_HEIGHT',
]);
const moduleDefaultKeys = Object.freeze([
  'defaultDoorsCount',
  'defaultModuleDoorsCount',
  'topGridDivisions',
  'lowerGridDivisions',
]);
const layoutKeys = Object.freeze([
  'minWidthCm',
  'minLowerDepthCm',
  'minLowerHeightCm',
  'minTopHeightCm',
  'defaultLowerHeightCm',
  'lowerDepthInsetCm',
]);
const aggregateKeys = Object.freeze([...moduleDefaultKeys, ...layoutKeys]);
const expectedModuleDefaultValues = Object.freeze({
  defaultDoorsCount: 6,
  defaultModuleDoorsCount: 2,
  topGridDivisions: 5,
  lowerGridDivisions: 2,
});
const expectedLayoutValues = Object.freeze({
  minWidthCm: 20,
  minLowerDepthCm: 'STACK_SPLIT_LOWER_DEPTH_MIN',
  minLowerHeightCm: 'STACK_SPLIT_LOWER_HEIGHT_MIN',
  minTopHeightCm: 'STACK_SPLIT_MIN_TOP_HEIGHT',
  defaultLowerHeightCm: 80,
  lowerDepthInsetCm: 5,
});
const expectedAggregateProjections = Object.freeze({
  defaultDoorsCount: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount',
  defaultModuleDoorsCount: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount',
  topGridDivisions: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.topGridDivisions',
  lowerGridDivisions: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.lowerGridDivisions',
  minWidthCm: 'LIBRARY_PRESET_LAYOUT_POLICY.minWidthCm',
  minLowerDepthCm: 'LIBRARY_PRESET_LAYOUT_POLICY.minLowerDepthCm',
  minLowerHeightCm: 'LIBRARY_PRESET_LAYOUT_POLICY.minLowerHeightCm',
  minTopHeightCm: 'LIBRARY_PRESET_LAYOUT_POLICY.minTopHeightCm',
  defaultLowerHeightCm: 'LIBRARY_PRESET_LAYOUT_POLICY.defaultLowerHeightCm',
  lowerDepthInsetCm: 'LIBRARY_PRESET_LAYOUT_POLICY.lowerDepthInsetCm',
});
const approvedConsumerUniverse = Object.freeze([
  'esm/native/data/preset_models_data.ts',
  'esm/native/features/library_preset/module_defaults.ts',
  'esm/native/features/library_preset/library_preset_flow_shared.ts',
  'esm/native/features/modules_configuration/module_defaults.ts',
  'esm/native/features/stack_split/module_config.ts',
]);
const focusedOwnerSymbols = new Set([
  'LIBRARY_PRESET_LAYOUT_POLICY',
  'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY',
  'LIBRARY_PRESET_POLICY',
]);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const semanticSha256 = value => createHash('sha256').update(stableJson(value)).digest('hex');

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = identifierName(node.property);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
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

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  const cleanSpecifier = stripQueryHash(specifier);
  let raw;
  if (cleanSpecifier.startsWith('@/')) raw = path.join(root, 'esm', cleanSpecifier.slice(2));
  else if (cleanSpecifier.startsWith('.')) raw = path.resolve(path.dirname(fromFile), cleanSpecifier);
  else return null;

  const candidates = [raw];
  const extension = path.extname(raw).toLowerCase();
  if (!extension) {
    candidates.push(...[...sourceExtensions].map(sourceExtension => `${raw}${sourceExtension}`));
  } else {
    const stem = raw.slice(0, -extension.length);
    candidates.push(
      ...(runtimeExtensionCandidates[extension] ?? []).map(sourceExtension => `${stem}${sourceExtension}`)
    );
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...[...sourceExtensions].map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

function exportedConstInitializer(sourceFile, name) {
  for (const statement of sourceFile.body ?? []) {
    if (statement?.type !== 'ExportNamedDeclaration') continue;
    if (statement.declaration?.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declaration.declarations ?? []) {
      if (identifierName(declaration.id) === name) return declaration.init;
    }
  }
  return null;
}

function frozenObject(initializer) {
  if (initializer?.type !== 'CallExpression') return null;
  if (memberPath(initializer.callee) !== 'Object.freeze') return null;
  if (initializer.arguments?.length !== 1) return null;
  return initializer.arguments[0]?.type === 'ObjectExpression' ? initializer.arguments[0] : null;
}

function objectFacts(objectExpression) {
  const entries = [];
  const spreads = [];
  for (const property of objectExpression?.properties ?? []) {
    if (property?.type === 'SpreadElement') {
      spreads.push(memberPath(property.argument));
      continue;
    }
    if (property?.type !== 'Property' || property.kind !== 'init') continue;
    entries.push({
      key: identifierName(property.key),
      value:
        property.value?.type === 'Literal'
          ? property.value.value
          : (memberPath(property.value) ?? identifierName(property.value)),
      valueType: property.value?.type,
    });
  }
  return { entries, spreads };
}

function walkSourceFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walkSourceFiles(absolute, files);
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function relativePath(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function inspectOwner(source) {
  const violations = [];
  const absolute = path.join(root, ownerRel);
  const analysis = analyzeModuleDependencies(absolute, source);
  const sourceFile = createSourceFile(absolute, source);
  const stackDependency = analysis.imports.find(dependency => dependency.specifier === stackSplitSpecifier);

  if (
    analysis.imports.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared'))
  ) {
    violations.push({ kind: 'legacy-facade' });
  }
  if (analysis.imports.length !== 1 || !stackDependency) {
    violations.push({ kind: 'owner-dependency-shape' });
  }
  if (stackDependency) {
    const bindingsValid =
      stackDependency.bindings.length === stackSplitScalars.length &&
      stackDependency.bindings.every(
        (binding, index) =>
          binding.importedName === stackSplitScalars[index] &&
          binding.localName === stackSplitScalars[index] &&
          binding.exportedName === null
      );
    if (
      stackDependency.kind !== 'value' ||
      stackDependency.syntax !== 'static-import' ||
      stableJson(stackDependency.importedSymbols) !== stableJson(stackSplitScalars) ||
      !bindingsValid
    ) {
      violations.push({ kind: 'scalar-import-shape' });
    }
    if (stackDependency.importedSymbols.includes('STACK_SPLIT_POLICY')) {
      violations.push({ kind: 'stack-split-aggregate' });
    }
  }

  const moduleDefaults = frozenObject(
    exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY')
  );
  const layout = frozenObject(exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_LAYOUT_POLICY'));
  const aggregate = frozenObject(exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_POLICY'));
  if (!moduleDefaults) violations.push({ kind: 'module-defaults-wrapper' });
  if (!layout) violations.push({ kind: 'layout-wrapper' });
  if (!aggregate) violations.push({ kind: 'aggregate-wrapper' });

  const moduleFacts = objectFacts(moduleDefaults);
  const layoutFacts = objectFacts(layout);
  const aggregateFacts = objectFacts(aggregate);
  if (stableJson(moduleFacts.entries.map(entry => entry.key)) !== stableJson(moduleDefaultKeys)) {
    violations.push({ kind: 'module-default-key-shape' });
  }
  if (
    stableJson(Object.fromEntries(moduleFacts.entries.map(entry => [entry.key, entry.value]))) !==
    stableJson(expectedModuleDefaultValues)
  ) {
    violations.push({ kind: 'module-default-value-shape' });
  }
  if (stableJson(layoutFacts.entries.map(entry => entry.key)) !== stableJson(layoutKeys)) {
    violations.push({ kind: 'layout-key-shape' });
  }
  if (
    stableJson(Object.fromEntries(layoutFacts.entries.map(entry => [entry.key, entry.value]))) !==
    stableJson(expectedLayoutValues)
  ) {
    violations.push({ kind: 'stack-split-scalar-projection' });
  }
  if (stableJson(aggregateFacts.entries.map(entry => entry.key)) !== stableJson(aggregateKeys)) {
    violations.push({ kind: 'aggregate-key-shape' });
  }
  if (aggregateFacts.spreads.length > 0) violations.push({ kind: 'aggregate-spread' });
  if (aggregateFacts.entries.some(entry => entry.valueType === 'Literal')) {
    violations.push({ kind: 'aggregate-literal' });
  }
  if (
    stableJson(Object.fromEntries(aggregateFacts.entries.map(entry => [entry.key, entry.value]))) !==
    stableJson(expectedAggregateProjections)
  ) {
    violations.push({ kind: 'aggregate-projection-shape' });
  }

  walkAst(sourceFile, node => {
    if (node?.type !== 'CallExpression') return;
    const callee = memberPath(node.callee) ?? identifierName(node.callee);
    if (
      ['Object.assign', 'structuredClone'].includes(callee) ||
      (callee === 'Object.freeze' &&
        ![
          exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY'),
          exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_LAYOUT_POLICY'),
          exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_POLICY'),
        ].includes(node))
    ) {
      violations.push({ kind: 'owner-copy-merge-wrapper', callee });
    }
  });

  return { analysis, sourceFile, violations };
}

function inspectFacade(source) {
  const violations = [];
  const absolute = path.join(root, facadeRel);
  const analysis = analyzeModuleDependencies(absolute, source);
  const sourceFile = createSourceFile(absolute, source);
  const ownerDependencies = analysis.imports.filter(dependency =>
    dependency.specifier.includes('library_preset_policy')
  );
  const expectedBindings = [
    {
      importedName: 'LIBRARY_PRESET_POLICY',
      localName: 'LIBRARY_PRESET_POLICY',
      exportedName: null,
    },
  ];
  if (
    ownerDependencies.length !== 1 ||
    ownerDependencies[0]?.specifier !== ownerFacadeSpecifier ||
    ownerDependencies[0]?.kind !== 'value' ||
    ownerDependencies[0]?.syntax !== 'static-import' ||
    stableJson(ownerDependencies[0]?.importedSymbols) !== stableJson(['LIBRARY_PRESET_POLICY']) ||
    stableJson(ownerDependencies[0]?.bindings) !== stableJson(expectedBindings)
  ) {
    violations.push({ kind: 'facade-owner-import-shape' });
  }

  const initializer = exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_DIMENSIONS');
  if (identifierName(initializer) !== 'LIBRARY_PRESET_POLICY') {
    violations.push({ kind: 'facade-direct-alias' });
  }
  if (
    source.includes('legacyDimensionNumberView(LIBRARY_PRESET_POLICY)') ||
    (initializer?.type === 'CallExpression' &&
      identifierName(initializer.callee) === 'legacyDimensionNumberView')
  ) {
    violations.push({ kind: 'facade-legacy-view' });
  }
  if (
    initializer?.type === 'ObjectExpression' ||
    frozenObject(initializer) ||
    (initializer?.type === 'CallExpression' &&
      ['Object.assign', 'structuredClone'].includes(
        memberPath(initializer.callee) ?? identifierName(initializer.callee)
      ))
  ) {
    violations.push({ kind: 'facade-object-copy' });
  }
  return { analysis, sourceFile, violations };
}

function inspectLibraryPresetConsumer(file, source) {
  const violations = [];
  const analysis = analyzeModuleDependencies(file, source);
  const facadeTarget = canonicalModuleTarget(path.join(root, facadeRel));
  const ownerTarget = canonicalModuleTarget(path.join(root, ownerRel));
  const relative = relativePath(file);
  let compatibilityImportCount = 0;
  let focusedImportCount = 0;

  for (const dependency of analysis.imports) {
    const target = resolveModuleTarget(file, dependency.specifier);
    const bindings = dependency.bindings ?? [];
    const importedSymbols = dependency.importedSymbols ?? [];
    const compatibilityBindings = bindings.filter(
      binding => binding.importedName === 'LIBRARY_PRESET_DIMENSIONS'
    );
    const focusedSymbols = importedSymbols.filter(symbol => focusedOwnerSymbols.has(symbol));
    const targetsFocusedOwner = target === ownerTarget;

    if (compatibilityBindings.length > 0) {
      compatibilityImportCount += 1;
      const bindingsValid =
        compatibilityBindings.length === 1 &&
        compatibilityBindings[0].localName === 'LIBRARY_PRESET_DIMENSIONS' &&
        compatibilityBindings[0].exportedName === null;
      if (
        target !== facadeTarget ||
        dependency.kind !== 'value' ||
        dependency.syntax !== 'static-import' ||
        !bindingsValid
      ) {
        violations.push({ kind: 'compatibility-import-shape' });
      }
    }

    if (targetsFocusedOwner || focusedSymbols.length > 0) {
      focusedImportCount += 1;
      if (target !== ownerTarget) {
        violations.push({ kind: 'focused-bridge-or-barrel', specifier: dependency.specifier });
        continue;
      }
      if (dependency.syntax === 'dynamic-import') {
        violations.push({ kind: 'focused-dynamic-import' });
      }
      if (bindings.some(binding => binding.importedName === '*')) {
        violations.push({ kind: 'focused-namespace-import' });
      }
      if (
        dependency.syntax !== 'static-import' ||
        dependency.kind !== 'value' ||
        !dependency.specifier.endsWith('/library_preset_policy.js')
      ) {
        violations.push({ kind: 'focused-import-shape' });
      }
      if (
        bindings.some(
          binding =>
            focusedOwnerSymbols.has(binding.importedName) &&
            (binding.localName !== binding.importedName || binding.exportedName !== null)
        )
      ) {
        violations.push({ kind: 'focused-import-alias' });
      }
      if (
        dependency.syntax === 'static-import' &&
        (focusedSymbols.length === 0 || importedSymbols.some(symbol => !focusedOwnerSymbols.has(symbol)))
      ) {
        violations.push({ kind: 'focused-import-symbol-shape' });
      }
    }
  }

  const isConsumer = compatibilityImportCount > 0 || focusedImportCount > 0;
  if (isConsumer && !approvedConsumerUniverse.includes(relative)) {
    violations.push({ kind: 'unapproved-consumer', file: relative });
  }
  if (compatibilityImportCount > 0 && focusedImportCount > 0) {
    violations.push({ kind: 'dual-path-consumer' });
  }
  if (compatibilityImportCount > 1 || focusedImportCount > 1) {
    violations.push({ kind: 'duplicate-library-preset-path' });
  }

  return {
    analysis,
    violations,
    mode:
      compatibilityImportCount > 0
        ? focusedImportCount > 0
          ? 'dual'
          : 'compatibility'
        : focusedImportCount > 0
          ? 'focused'
          : 'none',
  };
}

test('Library Preset owner is one exact file with one exact unaliased Stack Split scalar dependency', () => {
  const ownerFiles = walkSourceFiles(path.join(root, 'esm', 'shared', 'dimensions'))
    .map(relativePath)
    .filter(file => path.basename(file) === 'library_preset_policy.ts');
  assert.deepEqual(ownerFiles, [ownerRel]);
  const inspection = inspectOwner(read(ownerRel));
  assert.deepEqual(inspection.violations, []);
  assert.deepEqual(inspection.analysis.unresolvedDynamicImports, []);
  assert.deepEqual(inspection.analysis.forbiddenModuleSyntax, []);
});

test('Library Preset focused policies preserve exact keys, values, scalar identities, and aggregate projections', () => {
  const sourceFile = createSourceFile(ownerRel, read(ownerRel));
  const moduleFacts = objectFacts(
    frozenObject(exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY'))
  );
  const layoutFacts = objectFacts(
    frozenObject(exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_LAYOUT_POLICY'))
  );
  const aggregateFacts = objectFacts(
    frozenObject(exportedConstInitializer(sourceFile, 'LIBRARY_PRESET_POLICY'))
  );
  assert.deepEqual(
    moduleFacts.entries.map(entry => entry.key),
    [...moduleDefaultKeys]
  );
  assert.deepEqual(
    Object.fromEntries(moduleFacts.entries.map(entry => [entry.key, entry.value])),
    expectedModuleDefaultValues
  );
  assert.deepEqual(
    layoutFacts.entries.map(entry => entry.key),
    [...layoutKeys]
  );
  assert.deepEqual(
    Object.fromEntries(layoutFacts.entries.map(entry => [entry.key, entry.value])),
    expectedLayoutValues
  );
  assert.deepEqual(
    aggregateFacts.entries.map(entry => entry.key),
    [...aggregateKeys]
  );
  assert.deepEqual(
    Object.fromEntries(aggregateFacts.entries.map(entry => [entry.key, entry.value])),
    expectedAggregateProjections
  );
  assert.deepEqual(aggregateFacts.spreads, []);
  assert.equal(
    aggregateFacts.entries.some(entry => entry.valueType === 'Literal'),
    false
  );
});

test('Library Preset facade is an exact direct compatibility alias with its public value export intact', () => {
  const inspection = inspectFacade(read(facadeRel));
  assert.deepEqual(inspection.violations, []);
  const publicExports = collectNamedModuleExports(facadeRel, read(facadeRel));
  assert.equal(
    publicExports.some(entry => entry.kind === 'value' && entry.exportedName === 'LIBRARY_PRESET_DIMENSIONS'),
    true
  );
});

test('Library Preset consumers stay within the approved universe and use exactly one valid ownership path', () => {
  assert.deepEqual(approvedConsumerUniverse, [
    'esm/native/data/preset_models_data.ts',
    'esm/native/features/library_preset/module_defaults.ts',
    'esm/native/features/library_preset/library_preset_flow_shared.ts',
    'esm/native/features/modules_configuration/module_defaults.ts',
    'esm/native/features/stack_split/module_config.ts',
  ]);
  for (const relative of approvedConsumerUniverse) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, relative);
  }

  for (const file of walkSourceFiles(path.join(root, 'esm', 'native'))) {
    const source = fs.readFileSync(file, 'utf8');
    const inspection = inspectLibraryPresetConsumer(file, source);
    if (inspection.mode !== 'none') assert.deepEqual(inspection.violations, [], relativePath(file));
  }
});

test('Library Preset approved consumers may transition from compatibility to direct focused ownership', () => {
  const approvedFile = path.join(root, approvedConsumerUniverse[0]);
  const compatibilitySource =
    "import { LIBRARY_PRESET_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';";
  const focusedSource =
    "import { LIBRARY_PRESET_POLICY } from '../../shared/dimensions/library_preset_policy.js';";

  const compatibilityInspection = inspectLibraryPresetConsumer(approvedFile, compatibilitySource);
  assert.equal(compatibilityInspection.mode, 'compatibility');
  assert.deepEqual(compatibilityInspection.violations, []);

  const focusedInspection = inspectLibraryPresetConsumer(approvedFile, focusedSource);
  assert.equal(focusedInspection.mode, 'focused');
  assert.deepEqual(focusedInspection.violations, []);
});

test('Library Preset owner contract rejects owner/facade drift and invalid future consumer ownership paths', () => {
  const ownerSource = read(ownerRel);
  const facadeSource = read(facadeRel);
  const consumerFile = path.join(root, approvedConsumerUniverse[0]);
  const unapprovedConsumerFile = path.join(root, 'esm/native/features/unapproved_library_preset_consumer.ts');
  const compatibilityImport =
    "import { LIBRARY_PRESET_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';";
  const focusedImport =
    "import { LIBRARY_PRESET_POLICY } from '../../shared/dimensions/library_preset_policy.js';";
  const cases = [
    {
      name: 'owner imports facade',
      expectedKind: 'legacy-facade',
      inspect: () =>
        inspectOwner(
          `${ownerSource}\nimport { LIBRARY_PRESET_DIMENSIONS } from '../wardrobe_dimension_tokens_shared.js';`
        ),
    },
    {
      name: 'owner imports Stack Split aggregate',
      expectedKind: 'stack-split-aggregate',
      inspect: () =>
        inspectOwner(
          ownerSource.replace(
            'STACK_SPLIT_MIN_TOP_HEIGHT,',
            'STACK_SPLIT_MIN_TOP_HEIGHT,\n  STACK_SPLIT_POLICY,'
          )
        ),
    },
    {
      name: 'Stack Split scalar alias',
      expectedKind: 'scalar-import-shape',
      inspect: () =>
        inspectOwner(
          ownerSource
            .replace('STACK_SPLIT_LOWER_DEPTH_MIN,', 'STACK_SPLIT_LOWER_DEPTH_MIN as lowerDepthMin,')
            .replace('minLowerDepthCm: STACK_SPLIT_LOWER_DEPTH_MIN,', 'minLowerDepthCm: lowerDepthMin,')
        ),
    },
    {
      name: 'aggregate literal',
      expectedKind: 'aggregate-literal',
      inspect: () =>
        inspectOwner(
          ownerSource.replace('minWidthCm: LIBRARY_PRESET_LAYOUT_POLICY.minWidthCm,', 'minWidthCm: 20,')
        ),
    },
    {
      name: 'aggregate spread',
      expectedKind: 'aggregate-spread',
      inspect: () =>
        inspectOwner(
          ownerSource.replace(
            'export const LIBRARY_PRESET_POLICY = Object.freeze({',
            'export const LIBRARY_PRESET_POLICY = Object.freeze({\n  ...LIBRARY_PRESET_MODULE_DEFAULTS_POLICY,'
          )
        ),
    },
    {
      name: 'aggregate missing key',
      expectedKind: 'aggregate-key-shape',
      inspect: () =>
        inspectOwner(
          ownerSource.replace('  lowerDepthInsetCm: LIBRARY_PRESET_LAYOUT_POLICY.lowerDepthInsetCm,\n', '')
        ),
    },
    {
      name: 'aggregate extra key',
      expectedKind: 'aggregate-key-shape',
      inspect: () =>
        inspectOwner(
          ownerSource.replace(
            '  lowerDepthInsetCm: LIBRARY_PRESET_LAYOUT_POLICY.lowerDepthInsetCm,',
            '  lowerDepthInsetCm: LIBRARY_PRESET_LAYOUT_POLICY.lowerDepthInsetCm,\n  extra: LIBRARY_PRESET_LAYOUT_POLICY.minWidthCm,'
          )
        ),
    },
    {
      name: 'facade object copy',
      expectedKind: 'facade-object-copy',
      inspect: () =>
        inspectFacade(
          facadeSource.replace(
            'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;',
            'export const LIBRARY_PRESET_DIMENSIONS = Object.freeze({ ...LIBRARY_PRESET_POLICY });'
          )
        ),
    },
    {
      name: 'facade legacy number view',
      expectedKind: 'facade-legacy-view',
      inspect: () =>
        inspectFacade(
          facadeSource.replace(
            'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;',
            'export const LIBRARY_PRESET_DIMENSIONS = legacyDimensionNumberView(LIBRARY_PRESET_POLICY);'
          )
        ),
    },
    {
      name: 'sixth consumer outside the approved universe',
      expectedKind: 'unapproved-consumer',
      inspect: () =>
        inspectLibraryPresetConsumer(
          unapprovedConsumerFile,
          "import { LIBRARY_PRESET_POLICY } from '../../shared/dimensions/library_preset_policy.js';"
        ),
    },
    {
      name: 'consumer imports compatibility and focused paths together',
      expectedKind: 'dual-path-consumer',
      inspect: () => inspectLibraryPresetConsumer(consumerFile, `${compatibilityImport}\n${focusedImport}`),
    },
    {
      name: 'focused owner alias',
      expectedKind: 'focused-import-alias',
      inspect: () =>
        inspectLibraryPresetConsumer(
          consumerFile,
          "import { LIBRARY_PRESET_POLICY as libraryPreset } from '../../shared/dimensions/library_preset_policy.js';"
        ),
    },
    {
      name: 'focused import through public barrel',
      expectedKind: 'focused-bridge-or-barrel',
      inspect: () =>
        inspectLibraryPresetConsumer(
          consumerFile,
          "import { LIBRARY_PRESET_POLICY } from '../features/dimensions/index.js';"
        ),
    },
    {
      name: 'focused import through bridge',
      expectedKind: 'focused-bridge-or-barrel',
      inspect: () =>
        inspectLibraryPresetConsumer(
          consumerFile,
          "import { LIBRARY_PRESET_POLICY } from './library_preset_policy_bridge.js';"
        ),
    },
    {
      name: 'focused namespace import',
      expectedKind: 'focused-namespace-import',
      inspect: () =>
        inspectLibraryPresetConsumer(
          consumerFile,
          "import * as libraryPreset from '../../shared/dimensions/library_preset_policy.js';"
        ),
    },
    {
      name: 'focused dynamic import',
      expectedKind: 'focused-dynamic-import',
      inspect: () =>
        inspectLibraryPresetConsumer(
          consumerFile,
          "export const libraryPreset = import('../../shared/dimensions/library_preset_policy.js');"
        ),
    },
  ];

  for (const probe of cases) {
    assert.equal(
      probe.inspect().violations.some(violation => violation.kind === probe.expectedKind),
      true,
      probe.name
    );
  }
});

test('Library Preset owner locks the historical 158- and 159-entry migration prefixes', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 159);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 158)),
    '7cb5d770d8d0297e4037ecf59eaf417a164495416cf956615c37af75163d0516'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 159)),
    '7bb983429d5ea9cf6c8f4e6f44f8637a0d2841866d09bf9ddc8515dd230e16a8'
  );

  const futureLedger = [...baseline.migrationBudgets, { id: 'future-entry-after-159' }];
  assert.equal(
    semanticSha256(futureLedger.slice(0, 159)),
    '7bb983429d5ea9cf6c8f4e6f44f8637a0d2841866d09bf9ddc8515dd230e16a8'
  );

  const mutatedHistoricalLedger = structuredClone(baseline.migrationBudgets);
  mutatedHistoricalLedger[158] = {
    ...mutatedHistoricalLedger[158],
    reason: 'mutated historical Entry 159',
  };
  assert.notEqual(
    semanticSha256(mutatedHistoricalLedger.slice(0, 159)),
    '7bb983429d5ea9cf6c8f4e6f44f8637a0d2841866d09bf9ddc8515dd230e16a8'
  );
});
