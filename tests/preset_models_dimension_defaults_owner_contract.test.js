import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ownerRel = 'esm/shared/dimensions/preset_models_dimension_defaults_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const servicesApiRel = 'esm/native/services/api.ts';
const servicesRuntimeBaseRel = 'esm/native/services/api_runtime_base_surface.ts';
const approvedConsumerRel = 'esm/native/data/preset_models_data.ts';
const policySymbol = 'PRESET_MODELS_DIMENSION_DEFAULTS_POLICY';
const approvedConsumerUniverse = new Set([approvedConsumerRel]);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const expectedDependencies = Object.freeze([
  Object.freeze({
    specifier: './library_preset_policy.js',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: Object.freeze(['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY']),
  }),
  Object.freeze({
    specifier: './stack_split_policy.js',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
  }),
  Object.freeze({
    specifier: './wardrobe_defaults.js',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: Object.freeze(['WARDROBE_DEFAULTS']),
  }),
]);

const expectedProjections = Object.freeze([
  Object.freeze(['hingedDoorsCount', 'WARDROBE_DEFAULTS.byType.hinged.doorsCount']),
  Object.freeze(['hingedDepthCm', 'WARDROBE_DEFAULTS.byType.hinged.depthCm']),
  Object.freeze(['hingedPerDoorWidthCm', 'WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm']),
  Object.freeze(['wardrobeHeightCm', 'WARDROBE_DEFAULTS.heightCm']),
  Object.freeze(['cornerWidthCm', 'WARDROBE_DEFAULTS.corner.widthCm']),
  Object.freeze(['cornerDoorsCount', 'WARDROBE_DEFAULTS.corner.doorsCount']),
  Object.freeze(['chestDrawersCount', 'WARDROBE_DEFAULTS.chestDrawersCount']),
  Object.freeze(['libraryPresetDoorsCount', 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount']),
  Object.freeze([
    'libraryPresetModuleDoorsCount',
    'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount',
  ]),
  Object.freeze(['stackSplitLowerHeightCm', 'DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
]);
const approvedFields = new Set(expectedProjections.map(([field]) => field));

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

function findVariable(sourceFile, name) {
  let found = null;
  walkAst(sourceFile, node => {
    if (!found && node?.type === 'VariableDeclarator' && identifierName(node.id) === name) {
      found = node;
    }
  });
  return found;
}

function unwrapObjectFreeze(node) {
  if (
    node?.type !== 'CallExpression' ||
    memberPath(node.callee) !== 'Object.freeze' ||
    node.arguments?.length !== 1 ||
    node.arguments[0]?.type !== 'ObjectExpression'
  ) {
    return null;
  }
  return node.arguments[0];
}

function ownerViolations(source) {
  const violations = [];
  const add = (kind, detail = '') => violations.push({ kind, detail });
  const analysis = analyzeModuleDependencies(ownerRel, source);
  const dependencyInventory = analysis.imports.map(dependency => ({
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: dependency.importedSymbols,
  }));
  if (stableJson(dependencyInventory) !== stableJson(expectedDependencies)) {
    add('owner-dependency-inventory', stableJson(dependencyInventory));
  }
  for (const dependency of analysis.imports) {
    if (dependency.specifier.includes('wardrobe_dimension_tokens_shared')) {
      add('owner-facade-back-edge', dependency.specifier);
    }
    if (dependency.specifier.includes('esm/native') || dependency.specifier.includes('/native/')) {
      add('owner-native-back-edge', dependency.specifier);
    }
    for (const binding of dependency.bindings) {
      if (binding.localName !== null && binding.localName !== binding.importedName) {
        add('owner-import-alias', `${binding.importedName} as ${binding.localName}`);
      }
    }
  }
  if (analysis.unresolvedDynamicImports.length > 0 || analysis.forbiddenModuleSyntax.length > 0) {
    add('owner-non-static-dependency');
  }

  const exports = collectNamedModuleExports(ownerRel, source);
  if (
    stableJson(exports.map(entry => [entry.exportedName, entry.kind])) !==
    stableJson([[policySymbol, 'value']])
  ) {
    add('owner-export-inventory', stableJson(exports.map(entry => [entry.exportedName, entry.kind])));
  }

  const sourceFile = createSourceFile(ownerRel, source);
  if (
    sourceFile.body?.length !== 4 ||
    sourceFile.body.slice(0, 3).some(statement => statement.type !== 'ImportDeclaration') ||
    sourceFile.body[3]?.type !== 'ExportNamedDeclaration' ||
    sourceFile.body[3]?.declaration?.type !== 'VariableDeclaration' ||
    sourceFile.body[3]?.declaration?.kind !== 'const'
  ) {
    add('owner-top-level-shape');
  }

  const declaration = findVariable(sourceFile, policySymbol);
  const object = unwrapObjectFreeze(declaration?.init);
  if (!declaration || !object) {
    add('owner-direct-object-freeze');
    return violations;
  }

  const properties = object.properties ?? [];
  const projections = properties.map(property => [
    identifierName(property?.key),
    property?.type === 'Property' &&
    property.kind === 'init' &&
    !property.computed &&
    !property.method &&
    !property.shorthand
      ? memberPath(property.value)
      : null,
  ]);
  if (stableJson(projections) !== stableJson(expectedProjections)) {
    add('owner-direct-projections', stableJson(projections));
  }

  walkAst(object, node => {
    if (node === object) return;
    if (node?.type === 'Literal') add('owner-literal', String(node.value));
    if (
      node?.type === 'BinaryExpression' ||
      node?.type === 'LogicalExpression' ||
      node?.type === 'UnaryExpression' ||
      node?.type === 'UpdateExpression'
    ) {
      add('owner-derived-expression', node.type);
    }
    if (node?.type === 'SpreadElement' || node?.type === 'RestElement') {
      add('owner-spread', node.type);
    }
    if (node?.type === 'CallExpression' || node?.type === 'NewExpression') {
      add('owner-nested-call', memberPath(node.callee) ?? node.type);
    }
    if (node?.type === 'ObjectExpression') add('owner-wrapper-object');
    if (
      node?.type === 'FunctionDeclaration' ||
      node?.type === 'FunctionExpression' ||
      node?.type === 'ArrowFunctionExpression' ||
      node?.type === 'ClassDeclaration' ||
      node?.type === 'ClassExpression' ||
      node?.type === 'TSModuleDeclaration'
    ) {
      add('owner-behavior-wrapper', node.type);
    }
  });

  walkAst(sourceFile, node => {
    if (
      node?.type === 'FunctionDeclaration' ||
      node?.type === 'FunctionExpression' ||
      node?.type === 'ArrowFunctionExpression' ||
      node?.type === 'ClassDeclaration' ||
      node?.type === 'ClassExpression' ||
      node?.type === 'TSModuleDeclaration'
    ) {
      add('owner-behavior-declaration', node.type);
    }
    if (node?.type === 'ExportDefaultDeclaration') add('owner-default-export');
  });

  return violations;
}

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
}

function normalizeRel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

const moduleResolutionExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs']);

function stripQueryHash(specifier) {
  const query = specifier.indexOf('?');
  const hash = specifier.indexOf('#');
  const cut = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  return cut === -1 ? specifier : specifier.slice(0, cut);
}

function isFile(candidate) {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function isDirectory(candidate) {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function canonicalFileTarget(file) {
  const realFile = fs.realpathSync.native(file);
  const normalized = path.normalize(realFile);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string' || !specifier.startsWith('.')) return null;

  const raw = path.resolve(path.dirname(fromFile), stripQueryHash(specifier));
  const extension = path.extname(raw).toLowerCase();
  const candidates = [raw];

  if (!extension) {
    for (const candidateExtension of moduleResolutionExtensions) {
      candidates.push(`${raw}${candidateExtension}`);
    }
  } else if (extension === '.js' || extension === '.mjs') {
    const stem = raw.slice(0, -extension.length);
    candidates.push(`${stem}.ts`, `${stem}.tsx`);
  }

  if (isDirectory(raw)) {
    for (const candidateExtension of moduleResolutionExtensions) {
      candidates.push(path.join(raw, `index${candidateExtension}`));
    }
  }

  const resolved = candidates.find(isFile);
  return resolved ? canonicalFileTarget(resolved) : null;
}

const ownerTarget = canonicalFileTarget(path.join(root, ownerRel));
const facadeTarget = canonicalFileTarget(path.join(root, facadeRel));
const publicDimensionsTarget = canonicalFileTarget(path.join(root, publicDimensionsRel));

function targets(file, dependency, target) {
  return resolveModuleTarget(file, dependency.specifier) === target;
}

function isTypeOnlyPosition(node) {
  const runtimeTsContainers = new Set([
    'TSAsExpression',
    'TSTypeAssertion',
    'TSInstantiationExpression',
    'TSNonNullExpression',
    'TSSatisfiesExpression',
    'TSModuleDeclaration',
    'TSModuleBlock',
    'TSEnumDeclaration',
    'TSEnumBody',
    'TSEnumMember',
    'TSParameterProperty',
  ]);
  let current = node;
  while (current?.parent) {
    const parent = current.parent;
    if (
      typeof parent.type === 'string' &&
      parent.type.startsWith('TS') &&
      !runtimeTsContainers.has(parent.type)
    ) {
      return true;
    }
    current = parent;
  }
  return false;
}

function isDeclarationIdentifier(node) {
  const parent = node?.parent;
  if (!parent) return false;
  if (
    (parent.type === 'VariableDeclarator' && parent.id === node) ||
    ((parent.type === 'FunctionDeclaration' ||
      parent.type === 'FunctionExpression' ||
      parent.type === 'ClassDeclaration' ||
      parent.type === 'ClassExpression') &&
      parent.id === node) ||
    (parent.type === 'CatchClause' && parent.param === node)
  ) {
    return true;
  }
  return (
    (parent.type === 'FunctionDeclaration' ||
      parent.type === 'FunctionExpression' ||
      parent.type === 'ArrowFunctionExpression') &&
    (parent.params ?? []).includes(node)
  );
}

function isRuntimePolicyReference(node, bindings) {
  if (
    node?.type !== 'Identifier' ||
    !bindings.has(node.name) ||
    isTypeOnlyPosition(node) ||
    isDeclarationIdentifier(node)
  ) {
    return false;
  }
  const parent = node.parent;
  if (
    parent?.type === 'ImportSpecifier' ||
    parent?.type === 'ImportDefaultSpecifier' ||
    parent?.type === 'ImportNamespaceSpecifier'
  ) {
    return false;
  }
  if (parent?.type === 'ExportSpecifier' && parent.exported === node && parent.local !== node) {
    return false;
  }
  if (parent?.type === 'MemberExpression' && !parent.computed && parent.property === node) {
    return false;
  }
  if (
    (parent?.type === 'Property' || parent?.type === 'MethodDefinition') &&
    !parent.computed &&
    !parent.shorthand &&
    parent.key === node
  ) {
    return false;
  }
  return true;
}

function inspectPrivateOwnerUniverse(entries) {
  const focusedImports = [];
  const violations = [];
  for (const [file, source] of entries) {
    const rel = normalizeRel(file);
    const analysis = analyzeModuleDependencies(file, source);
    const ownerDependencies = analysis.imports.filter(dependency => targets(file, dependency, ownerTarget));
    const facadeDependencies = analysis.imports.filter(dependency => targets(file, dependency, facadeTarget));
    const publicBarrelDependencies = analysis.imports.filter(dependency =>
      targets(file, dependency, publicDimensionsTarget)
    );

    for (const dependency of ownerDependencies) {
      focusedImports.push({
        file: rel,
        specifier: dependency.specifier,
        kind: dependency.kind,
        syntax: dependency.syntax,
        symbols: dependency.importedSymbols,
      });
      if (!approvedConsumerUniverse.has(rel)) {
        violations.push({ kind: 'unapproved-focused-owner-consumer', file: rel });
      }
      if (
        dependency.specifier !== '../../shared/dimensions/preset_models_dimension_defaults_policy.js' ||
        dependency.kind !== 'value' ||
        dependency.syntax !== 'static-import'
      ) {
        violations.push({
          kind: 'invalid-focused-owner-dependency',
          file: rel,
          specifier: dependency.specifier,
          dependencyKind: dependency.kind,
          syntax: dependency.syntax,
        });
      }
      if (dependency.syntax === 'static-re-export' || dependency.exportedSymbols.length > 0) {
        violations.push({
          kind: 'private-owner-bridge',
          file: rel,
          specifier: dependency.specifier,
          syntax: dependency.syntax,
        });
      }
      if (stableJson(dependency.importedSymbols) !== stableJson([policySymbol])) {
        violations.push({
          kind: 'invalid-focused-owner-symbols',
          file: rel,
          symbols: dependency.importedSymbols,
        });
      }
      for (const binding of dependency.bindings) {
        if (
          binding.importedName !== policySymbol ||
          binding.localName !== policySymbol ||
          binding.exportedName !== null
        ) {
          violations.push({
            kind: 'focused-owner-alias-or-re-export',
            file: rel,
            importedName: binding.importedName,
            localName: binding.localName,
            exportedName: binding.exportedName,
          });
        }
      }
    }

    for (const dependency of publicBarrelDependencies) {
      if (
        dependency.kind === 'dynamic' ||
        dependency.importedSymbols.includes('*') ||
        dependency.importedSymbols.includes(policySymbol)
      ) {
        violations.push({
          kind: 'public-barrel-owner-import',
          file: rel,
          syntax: dependency.syntax,
        });
      }
    }
    if (ownerDependencies.length > 0 && facadeDependencies.length > 0) {
      violations.push({ kind: 'dual-focused-and-facade-import', file: rel });
    }

    const focusedBindings = new Set(
      ownerDependencies
        .flatMap(dependency => dependency.bindings)
        .filter(binding => binding.importedName === policySymbol && binding.localName !== null)
        .map(binding => binding.localName)
    );
    if (focusedBindings.size === 0) continue;

    const sourceFile = createSourceFile(rel, source);
    const seen = new Set();
    const addReferenceViolation = (kind, node, detail = '') => {
      const key = `${kind}:${node?.start ?? -1}:${detail}`;
      if (seen.has(key)) return;
      seen.add(key);
      violations.push({ kind, file: rel, detail, start: node?.start ?? -1 });
    };
    walkAst(sourceFile, node => {
      if (!isRuntimePolicyReference(node, focusedBindings)) return;
      const parent = node.parent;
      if (parent?.type === 'MemberExpression' && parent.object === node) {
        const field = staticMemberName(parent);
        if (parent.computed) {
          addReferenceViolation('computed-policy-access', node, field ?? 'dynamic');
        } else if (!field || !approvedFields.has(field)) {
          addReferenceViolation('invalid-policy-field', node, field ?? 'unknown');
        }
        return;
      }
      addReferenceViolation('policy-object-escape', node, parent?.type ?? 'unknown');
    });

    walkAst(sourceFile, node => {
      if (node?.type !== 'ExportNamedDeclaration' || node.source) return;
      for (const specifier of node.specifiers ?? []) {
        const localName = identifierName(specifier.local);
        if (localName && focusedBindings.has(localName)) {
          addReferenceViolation('policy-local-re-export', specifier, localName);
        }
      }
    });
  }
  return { focusedImports, violations };
}

test('Preset Models Dimension Defaults owner has exact dependencies, projections, exports, and no derived logic', () => {
  assert.deepEqual(ownerViolations(read(ownerRel)), []);

  for (const rel of [facadeRel, publicDimensionsRel, runtimeApiRel, servicesApiRel, servicesRuntimeBaseRel]) {
    assert.deepEqual(inspectPrivateOwnerUniverse([[path.join(root, rel), read(rel)]]).violations, []);
  }
});

test('Preset Models Dimension Defaults private-owner audit scans all esm and permits an empty approved subset', () => {
  const esmEntries = listSourceFiles(path.join(root, 'esm'))
    .filter(file => canonicalFileTarget(file) !== ownerTarget)
    .map(file => [file, fs.readFileSync(file, 'utf8')]);
  const result = inspectPrivateOwnerUniverse(esmEntries);
  assert.deepEqual(result.violations, []);
  assert.deepEqual(inspectPrivateOwnerUniverse([]), { focusedImports: [], violations: [] });

  assert.equal(
    result.focusedImports.every(entry => approvedConsumerUniverse.has(entry.file)),
    true,
    JSON.stringify(result.focusedImports)
  );
});

test('Preset Models Dimension Defaults owner rejects dependency, literal, arithmetic, spread, alias, and re-export drift', () => {
  const owner = read(ownerRel);
  const assertOwnerViolation = (source, kind, label) => {
    const violations = ownerViolations(source);
    assert.equal(
      violations.some(violation => violation.kind === kind),
      true,
      `${label}: ${JSON.stringify(violations)}`
    );
  };

  assertOwnerViolation(
    owner.replace("from './wardrobe_defaults.js'", "from '../wardrobe_dimension_tokens_shared.js'"),
    'owner-facade-back-edge',
    'facade back-edge'
  );
  assertOwnerViolation(
    owner.replace('LIBRARY_PRESET_MODULE_DEFAULTS_POLICY', 'LIBRARY_PRESET_POLICY'),
    'owner-dependency-inventory',
    'Library Preset aggregate'
  );
  assertOwnerViolation(
    owner.replace('DEFAULT_STACK_SPLIT_LOWER_HEIGHT', 'STACK_SPLIT_POLICY'),
    'owner-dependency-inventory',
    'Stack Split aggregate'
  );
  assertOwnerViolation(
    owner.replace('hingedDoorsCount: WARDROBE_DEFAULTS.byType.hinged.doorsCount', 'hingedDoorsCount: 4'),
    'owner-literal',
    'numeric literal'
  );
  assertOwnerViolation(
    owner.replace(
      'hingedDoorsCount: WARDROBE_DEFAULTS.byType.hinged.doorsCount',
      'hingedDoorsCount: WARDROBE_DEFAULTS.byType.hinged.doorsCount + 1'
    ),
    'owner-derived-expression',
    'arithmetic'
  );
  assertOwnerViolation(
    owner.replace(
      'hingedDoorsCount: WARDROBE_DEFAULTS.byType.hinged.doorsCount,',
      '...WARDROBE_DEFAULTS,\n  hingedDoorsCount: WARDROBE_DEFAULTS.byType.hinged.doorsCount,'
    ),
    'owner-spread',
    'spread'
  );
  assertOwnerViolation(
    owner.replace('import { WARDROBE_DEFAULTS }', 'import { WARDROBE_DEFAULTS as DEFAULTS }'),
    'owner-import-alias',
    'import alias'
  );

  const facadeWithExport = `${read(facadeRel)}
export { ${policySymbol} } from './dimensions/preset_models_dimension_defaults_policy.js';
`;
  const facadeBridgeResult = inspectPrivateOwnerUniverse([[path.join(root, facadeRel), facadeWithExport]]);
  assert.equal(
    facadeBridgeResult.violations.some(violation => violation.kind === 'private-owner-bridge'),
    true,
    JSON.stringify(facadeBridgeResult.violations)
  );
});

test('Preset Models Dimension Defaults resolver detects extensionless owner, facade, and public-barrel routes', () => {
  const approvedPath = path.join(root, approvedConsumerRel);
  const extensionlessOwnerSpecifier = '../../shared/dimensions/preset_models_dimension_defaults_policy';

  assert.equal(resolveModuleTarget(approvedPath, extensionlessOwnerSpecifier), ownerTarget);
  assert.equal(resolveModuleTarget(approvedPath, `${extensionlessOwnerSpecifier}.js?raw#owner`), ownerTarget);
  assert.equal(resolveModuleTarget(approvedPath, `${extensionlessOwnerSpecifier}.mjs`), ownerTarget);
  assert.equal(resolveModuleTarget(approvedPath, '../features/dimensions/'), publicDimensionsTarget);
  assert.equal(
    resolveModuleTarget(approvedPath, '../../shared/wardrobe_dimension_tokens_shared'),
    facadeTarget
  );
  assert.equal(resolveModuleTarget(approvedPath, './missing_preset_models_owner'), null);
  assert.equal(resolveModuleTarget(approvedPath, 'node:path'), null);

  const extensionlessOwnerResult = inspectPrivateOwnerUniverse([
    [
      approvedPath,
      `import { ${policySymbol} } from '${extensionlessOwnerSpecifier}';
export const doors = ${policySymbol}.hingedDoorsCount;`,
    ],
  ]);
  assert.deepEqual(extensionlessOwnerResult.focusedImports, [
    {
      file: approvedConsumerRel,
      specifier: extensionlessOwnerSpecifier,
      kind: 'value',
      syntax: 'static-import',
      symbols: [policySymbol],
    },
  ]);
  assert.equal(
    extensionlessOwnerResult.violations.some(
      violation => violation.kind === 'invalid-focused-owner-dependency'
    ),
    true,
    JSON.stringify(extensionlessOwnerResult.violations)
  );

  for (const specifier of ['../features/dimensions', '../features/dimensions/']) {
    const result = inspectPrivateOwnerUniverse([
      [
        approvedPath,
        `import { ${policySymbol} } from '${specifier}';
export const doors = ${policySymbol}.hingedDoorsCount;`,
      ],
    ]);
    assert.equal(
      result.violations.some(violation => violation.kind === 'public-barrel-owner-import'),
      true,
      `${specifier}: ${JSON.stringify(result.violations)}`
    );
  }

  const extensionlessFacadeResult = inspectPrivateOwnerUniverse([
    [
      approvedPath,
      `import { ${policySymbol} } from '../../shared/dimensions/preset_models_dimension_defaults_policy.js';
import { WARDROBE_DEFAULTS } from '../../shared/wardrobe_dimension_tokens_shared';
export const doors = ${policySymbol}.hingedDoorsCount;`,
    ],
  ]);
  assert.equal(
    extensionlessFacadeResult.violations.some(
      violation => violation.kind === 'dual-focused-and-facade-import'
    ),
    true,
    JSON.stringify(extensionlessFacadeResult.violations)
  );
});

test('Preset Models Dimension Defaults repository-wide audit rejects arbitrary private-owner bridges', () => {
  const bridgePath = path.join(root, 'esm/shared/dimensions/preset_models_defaults_bridge.ts');
  const approvedPath = path.join(root, approvedConsumerRel);
  const bridgeImport = `import { ${policySymbol} } from './preset_models_dimension_defaults_policy.js';`;
  const assertBridgeViolation = (source, expectedKind, label) => {
    const result = inspectPrivateOwnerUniverse([[bridgePath, source]]);
    assert.equal(
      result.violations.some(
        violation =>
          violation.kind === expectedKind &&
          violation.file === 'esm/shared/dimensions/preset_models_defaults_bridge.ts'
      ),
      true,
      `${label}: ${JSON.stringify(result.violations)}`
    );
    assert.equal(
      result.violations.some(violation => violation.kind === 'unapproved-focused-owner-consumer'),
      true,
      `${label} must remain outside the approved universe: ${JSON.stringify(result.violations)}`
    );
  };

  assertBridgeViolation(
    `export { ${policySymbol} } from './preset_models_dimension_defaults_policy.js';`,
    'private-owner-bridge',
    'direct shared re-export'
  );
  assertBridgeViolation(
    `${bridgeImport}
export { ${policySymbol} };`,
    'policy-local-re-export',
    'local import then export'
  );
  assertBridgeViolation(
    `${bridgeImport}
const defaults = ${policySymbol};
export { defaults };`,
    'policy-object-escape',
    'aliased bridge'
  );
  assertBridgeViolation(
    "export * from './preset_models_dimension_defaults_policy.js';",
    'private-owner-bridge',
    'wildcard bridge'
  );

  const bridgeSource = `export { ${policySymbol} } from './preset_models_dimension_defaults_policy.js';`;
  const consumerThroughBridge = `import { ${policySymbol} } from '../../shared/dimensions/preset_models_defaults_bridge.js';
export const doors = ${policySymbol}.hingedDoorsCount;`;
  const pairResult = inspectPrivateOwnerUniverse([
    [bridgePath, bridgeSource],
    [approvedPath, consumerThroughBridge],
  ]);
  assert.deepEqual(
    pairResult.focusedImports.map(entry => entry.file),
    ['esm/shared/dimensions/preset_models_defaults_bridge.ts']
  );
  assert.equal(
    pairResult.violations.some(
      violation =>
        violation.kind === 'private-owner-bridge' &&
        violation.file === 'esm/shared/dimensions/preset_models_defaults_bridge.ts'
    ),
    true,
    JSON.stringify(pairResult.violations)
  );
});

test('Preset Models Dimension Defaults consumer guard permits direct fields and rejects alternate paths and policy escapes', () => {
  const approvedPath = path.join(root, approvedConsumerRel);
  const unapprovedPath = path.join(root, 'esm/native/features/unapproved_preset_models_consumer.ts');
  const focusedImport = `import { ${policySymbol} } from '../../shared/dimensions/preset_models_dimension_defaults_policy.js';`;
  const inspectApproved = source => inspectPrivateOwnerUniverse([[approvedPath, source]]);
  const assertViolation = (file, source, kind, label) => {
    const result = inspectPrivateOwnerUniverse([[file, source]]);
    assert.equal(
      result.violations.some(violation => violation.kind === kind),
      true,
      `${label}: ${JSON.stringify(result.violations)}`
    );
  };

  assert.deepEqual(
    inspectApproved(`${focusedImport}
export const doors = ${policySymbol}.hingedDoorsCount;`).violations,
    []
  );

  assertViolation(
    unapprovedPath,
    `import { ${policySymbol} } from '../../shared/dimensions/preset_models_dimension_defaults_policy.js';
export const doors = ${policySymbol}.hingedDoorsCount;`,
    'unapproved-focused-owner-consumer',
    'consumer outside approved universe'
  );
  assertViolation(
    approvedPath,
    `import { ${policySymbol} as defaults } from '../../shared/dimensions/preset_models_dimension_defaults_policy.js';
export const doors = defaults.hingedDoorsCount;`,
    'focused-owner-alias-or-re-export',
    'import alias'
  );
  assertViolation(
    approvedPath,
    `import * as defaults from '../../shared/dimensions/preset_models_dimension_defaults_policy.js';
export const doors = defaults.${policySymbol}.hingedDoorsCount;`,
    'invalid-focused-owner-symbols',
    'namespace import'
  );
  assertViolation(
    approvedPath,
    `export async function loadDefaults() {
  return import('../../shared/dimensions/preset_models_dimension_defaults_policy.js');
}`,
    'invalid-focused-owner-dependency',
    'dynamic import'
  );
  assertViolation(
    approvedPath,
    `import { ${policySymbol} } from '../features/dimensions/index.js';
export const doors = ${policySymbol}.hingedDoorsCount;`,
    'public-barrel-owner-import',
    'public barrel'
  );
  assertViolation(
    approvedPath,
    `${focusedImport}
import { WARDROBE_DEFAULTS } from '../../shared/wardrobe_dimension_tokens_shared.js';
export const doors = ${policySymbol}.hingedDoorsCount;`,
    'dual-focused-and-facade-import',
    'facade overlap'
  );
  assertViolation(
    approvedPath,
    `${focusedImport}
export { ${policySymbol} };`,
    'policy-local-re-export',
    'local re-export'
  );
  assertViolation(
    approvedPath,
    `${focusedImport}
const defaults = ${policySymbol};
export const doors = defaults.hingedDoorsCount;`,
    'policy-object-escape',
    'policy object alias'
  );
  assertViolation(
    approvedPath,
    `${focusedImport}
const { hingedDoorsCount } = ${policySymbol};
export const doors = hingedDoorsCount;`,
    'policy-object-escape',
    'destructuring'
  );
  assertViolation(
    approvedPath,
    `${focusedImport}
export const doors = ${policySymbol}['hingedDoorsCount'];`,
    'computed-policy-access',
    'computed field'
  );
  assertViolation(
    approvedPath,
    `${focusedImport}
const defaults = { ...${policySymbol} };
export const doors = defaults.hingedDoorsCount;`,
    'policy-object-escape',
    'spread'
  );
  assertViolation(
    approvedPath,
    `${focusedImport}
const wrapper = { defaults: ${policySymbol} };
export const doors = wrapper.defaults.hingedDoorsCount;`,
    'policy-object-escape',
    'wrapper object'
  );
  assertViolation(
    approvedPath,
    `${focusedImport}
export const doors = ${policySymbol}.missingField;`,
    'invalid-policy-field',
    'unknown field'
  );
});
