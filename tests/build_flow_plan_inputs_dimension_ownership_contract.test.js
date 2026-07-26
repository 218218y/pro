import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/build_flow_plan_inputs.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const interiorOwnerRel = 'esm/shared/dimensions/carcass_interior_policy.ts';
const doorMountOwnerRel = 'esm/shared/dimensions/door_mount_thickness_policy.ts';
const stackSplitOwnerRel = 'esm/shared/dimensions/stack_split_policy.ts';
const consumerAbsolute = path.join(root, consumerRel);
const facadeAbsolute = path.join(root, facadeRel);
const publicDimensionsAbsolute = path.join(root, publicDimensionsRel);
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const focusedImports = Object.freeze([
  Object.freeze({
    specifier: '../../shared/dimensions/carcass_interior_policy.js',
    ownerRel: interiorOwnerRel,
    symbol: 'CARCASS_INTERIOR_DIMENSIONS',
  }),
  Object.freeze({
    specifier: '../../shared/dimensions/door_mount_thickness_policy.js',
    ownerRel: doorMountOwnerRel,
    symbol: 'resolveDoorMountThicknessesFromConfig',
  }),
  Object.freeze({
    specifier: '../../shared/dimensions/stack_split_policy.js',
    ownerRel: stackSplitOwnerRel,
    symbol: 'STACK_SPLIT_SEAM_GAP_M',
  }),
]);

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: [
    'CARCASS_INTERIOR_DIMENSIONS',
    'resolveDoorMountThicknessesFromConfig',
    'STACK_SPLIT_SEAM_GAP_M',
  ],
  syntax: 'static-import',
});

function expectedEntry({ toFile, importedSymbol, reason, removalCondition }) {
  return {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-26',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: interiorOwnerRel,
      kind: 'value',
      importedSymbols: ['CARCASS_INTERIOR_DIMENSIONS'],
      syntax: 'static-import',
    },
    removedImport,
    addedImport: {
      toFile,
      kind: 'value',
      importedSymbols: [importedSymbol],
      syntax: 'static-import',
    },
    reason,
    removalCondition,
  };
}

const expectedEntries = Object.freeze([
  expectedEntry({
    toFile: doorMountOwnerRel,
    importedSymbol: 'resolveDoorMountThicknessesFromConfig',
    reason:
      'The Build Flow Plan Inputs flow replaces one legacy facade statement with the focused Carcass Interior owner plus the focused Door Mount Thickness owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Build Flow Plan Inputs composition seam eliminates the extra Door Mount Thickness statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: stackSplitOwnerRel,
    importedSymbol: 'STACK_SPLIT_SEAM_GAP_M',
    reason:
      'The Build Flow Plan Inputs flow replaces one legacy facade statement with the focused Carcass Interior owner plus the focused Stack Split seam owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Build Flow Plan Inputs composition seam eliminates the extra Stack Split seam statement without reintroducing the legacy facade.',
  }),
]);

const expectedReturnKeys = Object.freeze([
  'uiState',
  'rawUi',
  'isCornerMode',
  'handleControlEnabled',
  'showHangerEnabled',
  'showContentsEnabled',
  'stackSplitEnabled',
  'stackSplitDecorativeSeparatorEnabled',
  'splitActiveForBuild',
  'stackSplitUnifiedFrame',
  'lowerHeightCm',
  'lowerDepthCm',
  'lowerWidthCm',
  'lowerDoorsCount',
  'splitSeamGapM',
  'H',
  'totalW',
  'D',
  'doorsCount',
  'noMainWardrobe',
  'depthReduction',
  'doorStyle',
  'baseLegStyle',
  'baseLegColor',
  'baseLegPlatformMode',
  'baseLegPlatformSideMode',
  'baseLegPlatformSideOverhangCm',
  'baseLegPlatformFrontOverhangCm',
  'stackSplitDecorativeSeparatorSideOverhangCm',
  'stackSplitDecorativeSeparatorFrontOverhangCm',
  'basePlinthHeightCm',
  'baseLegHeightCm',
  'baseLegWidthCm',
  'baseTypeBottom',
  'baseTypeTop',
  'baseLegTopPlatformOnly',
  'hasCornice',
  'corniceType',
  'splitDoors',
  'isGroovesEnabled',
  'isInternalDrawersEnabled',
  'woodThick',
  'shelfThick',
]);

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

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolute] : [];
  });
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

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
    candidates.push(...sourceFileExtensions.map(sourceExtension => `${raw}${sourceExtension}`));
  } else {
    const replacementExtensions = runtimeExtensionCandidates[extension] ?? [];
    const stem = raw.slice(0, -extension.length);
    candidates.push(...replacementExtensions.map(sourceExtension => `${stem}${sourceExtension}`));
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...sourceFileExtensions.map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

function isTarget(fromFile, specifier, target) {
  return resolveModuleTarget(fromFile, specifier) === canonicalModuleTarget(target);
}

function subtreeContainsOwner(node) {
  let found = false;
  walkAst(node, child => {
    const pathValue = memberPath(child);
    const name = identifierName(child);
    if (
      name === 'CARCASS_INTERIOR_DIMENSIONS' ||
      name === 'STACK_SPLIT_SEAM_GAP_M' ||
      name === 'resolveDoorMountThicknessesFromConfig' ||
      pathValue?.startsWith('CARCASS_INTERIOR_DIMENSIONS.')
    ) {
      found = true;
    }
  });
  return found;
}

function inspectOwnershipViolations(file, source) {
  const violations = [];
  const analysis = analyzeModuleDependencies(file, source);
  const expectedByTarget = new Map(
    focusedImports.map(entry => [canonicalModuleTarget(path.join(root, entry.ownerRel)), entry])
  );

  for (const dependency of analysis.imports) {
    const target = resolveModuleTarget(file, dependency.specifier);
    if (target === canonicalModuleTarget(facadeAbsolute)) {
      violations.push({ kind: 'legacy-facade', syntax: dependency.syntax, bindings: dependency.bindings });
      continue;
    }
    if (target === canonicalModuleTarget(publicDimensionsAbsolute)) {
      violations.push({
        kind: 'public-dimensions-barrel',
        syntax: dependency.syntax,
        bindings: dependency.bindings,
      });
      continue;
    }
    const expected = expectedByTarget.get(target);
    if (!expected) continue;
    const validBinding =
      dependency.bindings.length === 1 &&
      dependency.bindings[0].importedName === expected.symbol &&
      dependency.bindings[0].localName === expected.symbol &&
      dependency.bindings[0].exportedName === null;
    if (
      dependency.kind !== 'value' ||
      dependency.syntax !== 'static-import' ||
      dependency.importedSymbols.length !== 1 ||
      dependency.importedSymbols[0] !== expected.symbol ||
      !validBinding
    ) {
      violations.push({
        kind: 'focused-import-shape',
        owner: expected.ownerRel,
        importedSymbols: dependency.importedSymbols,
        bindings: dependency.bindings,
      });
    }
  }

  const sourceFile = createSourceFile(file, source);
  walkAst(sourceFile, node => {
    if (
      node?.type === 'VariableDeclarator' &&
      ['CARCASS_INTERIOR_DIMENSIONS', 'STACK_SPLIT_SEAM_GAP_M'].includes(identifierName(node.init))
    ) {
      violations.push({ kind: 'owner-object-alias', localName: identifierName(node.id) });
    }
    if (node?.type === 'ObjectExpression' && subtreeContainsOwner(node)) {
      violations.push({ kind: 'owner-object-projection' });
    }
    if (node?.type === 'SpreadElement' && subtreeContainsOwner(node.argument)) {
      violations.push({ kind: 'owner-spread' });
    }
    if (node?.type === 'CallExpression' && memberPath(node.callee) === 'Object.assign') {
      if ((node.arguments ?? []).some(subtreeContainsOwner)) violations.push({ kind: 'owner-merge' });
    }
  });

  return { analysis, sourceFile, violations };
}

function sourceFacts(sourceFile) {
  const memberCounts = new Map();
  const numericLiterals = [];
  const calls = [];
  let exportedFunction = null;
  let returnObject = null;

  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression') {
      const value = memberPath(node);
      if (value) memberCounts.set(value, (memberCounts.get(value) ?? 0) + 1);
    }
    if (node?.type === 'Literal' && typeof node.value === 'number') numericLiterals.push(node.value);
    if (node?.type === 'CallExpression') calls.push(node);
    if (node?.type === 'FunctionDeclaration' && identifierName(node.id) === 'resolveBuildFlowPlanInputs') {
      exportedFunction = node;
    }
    if (node?.type === 'ReturnStatement' && node.argument?.type === 'ObjectExpression') {
      returnObject = node.argument;
    }
  });
  numericLiterals.sort((left, right) => left - right);
  return { memberCounts, numericLiterals, calls, exportedFunction, returnObject };
}

function legacyFacadeConsumers(symbol) {
  const consumers = [];
  for (const file of listSourceFiles(path.join(root, 'esm'))) {
    const fileRel = rel(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const dependency of analyzeModuleDependencies(file, source).imports) {
      if (!isTarget(file, dependency.specifier, facadeAbsolute)) continue;
      const approvedPublicWildcard =
        fileRel === publicDimensionsRel &&
        dependency.syntax === 'static-re-export' &&
        dependency.importedSymbols.length === 1 &&
        dependency.importedSymbols[0] === '*';
      const approvedRuntimeStackSplitReexport =
        symbol === 'STACK_SPLIT_SEAM_GAP_M' &&
        fileRel === runtimeApiRel &&
        dependency.syntax === 'static-re-export' &&
        dependency.importedSymbols.includes(symbol);
      if (approvedPublicWildcard || approvedRuntimeStackSplitReexport) continue;
      if (
        dependency.importedSymbols.includes(symbol) ||
        dependency.importedSymbols.includes('*') ||
        dependency.syntax === 'dynamic-import'
      ) {
        consumers.push({ file: fileRel, syntax: dependency.syntax, symbols: dependency.importedSymbols });
      }
    }
  }
  return consumers;
}

test('Build Flow Plan Inputs imports exactly three focused owners with exact unaliased value bindings', () => {
  const source = read(consumerRel);
  const inspection = inspectOwnershipViolations(consumerAbsolute, source);
  assert.deepEqual(inspection.violations, []);
  assert.deepEqual(inspection.analysis.unresolvedDynamicImports, []);
  assert.deepEqual(inspection.analysis.forbiddenModuleSyntax, []);

  const directImports = inspection.analysis.imports.filter(dependency =>
    focusedImports.some(entry =>
      isTarget(consumerAbsolute, dependency.specifier, path.join(root, entry.ownerRel))
    )
  );
  assert.deepEqual(
    directImports.map(({ specifier, kind, syntax, importedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      bindings,
    })),
    focusedImports.map(entry => ({
      specifier: entry.specifier,
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: [entry.symbol],
      bindings: [
        {
          importedName: entry.symbol,
          localName: entry.symbol,
          exportedName: null,
        },
      ],
    }))
  );
  assert.equal(directImports.length, 3);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(source, /import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u);
});

test('Build Flow Plan Inputs preserves resolver identity, owner fields, and Stack Split seam formulas', () => {
  const source = read(consumerRel);
  const sourceFile = createSourceFile(consumerRel, source);
  const facts = sourceFacts(sourceFile);

  const resolverCalls = facts.calls.filter(
    call => identifierName(call.callee) === 'resolveDoorMountThicknessesFromConfig'
  );
  assert.equal(resolverCalls.length, 1);
  assert.deepEqual(resolverCalls[0].arguments.map(identifierName), ['cfg']);
  assert.equal(facts.memberCounts.get('resolvedThicknesses.frameThicknessM'), 1);
  assert.equal(facts.memberCounts.get('resolvedThicknesses.shelfThicknessM'), 1);
  assert.equal(facts.memberCounts.get('CARCASS_INTERIOR_DIMENSIONS.minTopBodyHeightM'), 1);
  assert.equal(facts.memberCounts.get('CARCASS_INTERIOR_DIMENSIONS.slidingDepthReductionM'), 1);
  assert.equal(facts.memberCounts.get('CARCASS_INTERIOR_DIMENSIONS.hingedDepthReductionM'), 1);

  assert.match(
    source,
    /const resolvedThicknesses = resolveDoorMountThicknessesFromConfig\(cfg\);\s*const woodThick = resolvedThicknesses\.frameThicknessM;\s*const shelfThick = resolvedThicknesses\.shelfThicknessM;/u
  );
  assert.match(
    source,
    /const splitSeamGapM = splitActiveForBuild && !stackSplitUnifiedFrame \? STACK_SPLIT_SEAM_GAP_M : 0;/u
  );
  assert.equal((source.match(/\bSTACK_SPLIT_SEAM_GAP_M\b/gu) ?? []).length, 2);
  assert.match(
    source,
    /const H = Math\.max\(\s*CARCASS_INTERIOR_DIMENSIONS\.minTopBodyHeightM,\s*split\.topHeightCm \/ 100 \+ \(stackSplitUnifiedFrame \? woodThick : -Number\(splitSeamGapM\)\)\s*\);/u
  );
  assert.match(
    source,
    /const depthReduction = isSliding\s*\? CARCASS_INTERIOR_DIMENSIONS\.slidingDepthReductionM\s*: CARCASS_INTERIOR_DIMENSIONS\.hingedDepthReductionM;/u
  );
});

test('Build Flow Plan Inputs preserves numeric literals, public signature, and exact return-object keys', () => {
  const source = read(consumerRel);
  const facts = sourceFacts(createSourceFile(consumerRel, source));
  assert.equal(
    semanticSha256(facts.numericLiterals),
    'a9a5be310da2f28e19da4ab9022634c4499b8547561f2c17727b9f2ac3c862d2'
  );
  assert.ok(facts.exportedFunction);
  assert.equal(facts.exportedFunction.parent?.type, 'ExportNamedDeclaration');
  assert.deepEqual(facts.exportedFunction.params.map(identifierName), ['args']);
  assert.match(
    source,
    /export function resolveBuildFlowPlanInputs\(args: BuildFlowPlanInputsArgs\): BuildFlowPlanInputs \{/u
  );
  assert.ok(facts.returnObject);
  assert.deepEqual(
    facts.returnObject.properties.map(property => identifierName(property.key)),
    expectedReturnKeys
  );
});

test('Build Flow Plan Inputs ownership guard rejects facade, aliases, barrels, extensionless imports, and owner copies', () => {
  const cases = [
    {
      name: 'legacy facade import',
      expectedKind: 'legacy-facade',
      source:
        "import { CARCASS_INTERIOR_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = CARCASS_INTERIOR_DIMENSIONS.minTopBodyHeightM;",
    },
    {
      name: 'focused-owner alias',
      expectedKind: 'focused-import-shape',
      source:
        "import { CARCASS_INTERIOR_DIMENSIONS as INTERIOR } from '../../shared/dimensions/carcass_interior_policy.js';\nexport const value = INTERIOR.minTopBodyHeightM;",
    },
    {
      name: 'public dimensions namespace',
      expectedKind: 'public-dimensions-barrel',
      source:
        "import * as dimensions from '../features/dimensions/index.js';\nexport const value = dimensions.STACK_SPLIT_SEAM_GAP_M;",
    },
    {
      name: 'extensionless facade import',
      expectedKind: 'legacy-facade',
      source:
        "import { STACK_SPLIT_SEAM_GAP_M } from '../../shared/wardrobe_dimension_tokens_shared';\nexport const value = STACK_SPLIT_SEAM_GAP_M;",
    },
    {
      name: 'local owner projection',
      expectedKind: 'owner-object-projection',
      source:
        "import { CARCASS_INTERIOR_DIMENSIONS } from '../../shared/dimensions/carcass_interior_policy.js';\nconst copiedInterior = { minTopBodyHeightM: CARCASS_INTERIOR_DIMENSIONS.minTopBodyHeightM, slidingDepthReductionM: CARCASS_INTERIOR_DIMENSIONS.slidingDepthReductionM, hingedDepthReductionM: CARCASS_INTERIOR_DIMENSIONS.hingedDepthReductionM };\nexport const value = copiedInterior;",
    },
  ];

  for (const probe of cases) {
    const inspection = inspectOwnershipViolations(consumerAbsolute, probe.source);
    assert.equal(
      inspection.violations.some(violation => violation.kind === probe.expectedKind),
      true,
      probe.name
    );
  }
});

test('Build Flow Plan Inputs migration leaves no production facade imports for the three migrated symbols', () => {
  assert.deepEqual(legacyFacadeConsumers('CARCASS_INTERIOR_DIMENSIONS'), []);
  assert.deepEqual(legacyFacadeConsumers('resolveDoorMountThicknessesFromConfig'), []);
  assert.deepEqual(legacyFacadeConsumers('STACK_SPLIT_SEAM_GAP_M'), []);
});

test('Build Flow Plan Inputs appends exactly Entries 155-156 after the unchanged 154-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 154)),
    '0398ae9924f577c2f06a0293feac49f8a70eff80274c22717a9624421cdf5ef0'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(154, 156), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 156)),
    '9e06d7f0e1df80f0f90cbe281eb4622790a49473ce4f3c0bdef36b0535a3386d'
  );
});
