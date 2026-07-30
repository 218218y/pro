import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { buildDecisionReport } from '../tools/wp_wardrobe_dimension_public_surface_decision_report.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const featureBarrelRel = 'esm/native/features/dimensions/index.ts';
const runtimeRel = 'esm/native/runtime/api.ts';
const servicesBaseRel = 'esm/native/services/api_runtime_base_surface.ts';
const servicesEntryRel = 'esm/native/services/api.ts';
const manifestRel = 'tools/wp_wardrobe_dimension_public_surface_manifest.json';
const snapshotRel = 'tools/wp_wardrobe_dimension_public_surface_semantic_snapshot.json';
const reportRel = 'tools/wp_wardrobe_dimension_public_surface_decision_report.json';
const layerBaselineRel = 'tools/wp_layer_baseline.json';
const runtimeCompatibilityOwner = 'wardrobe-dimension-runtime-public-compatibility';
const runtimePublicSurface =
  'esm/native/runtime/api.ts → esm/native/services/api_runtime_base_surface.ts → esm/native/services/api.ts';
const classification = 'undetermined — blocks removal';
const plannedAction = 'retain-until-external-evidence-or-explicit-public-surface-decision';
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const groupSpecs = Object.freeze([
  Object.freeze({
    id: 'legacy-number-view-local-exports',
    kind: 'value',
    form: 'legacy-number-view-local-export',
    declarationRelationship: 'legacy-number-view-adaptation',
    preservationCost:
      'Maintain the plain-number declaration adaptation, runtime identity proof, and source-path compatibility contract.',
    removalCost:
      'Break the source-path import and expose branded owner declarations to callers that currently receive plain numbers.',
  }),
  Object.freeze({
    id: 'local-compositions',
    kind: 'value',
    form: 'local-composition',
    declarationRelationship: 'local-composition-contract',
    preservationCost:
      'Maintain aggregate shape, key order, freeze topology, declaration fingerprints, and focused-owner identity projections.',
    removalCost:
      'Break the source-path aggregate contract and require callers to reconstruct a multi-owner composition.',
  }),
  Object.freeze({
    id: 'identity-local-exports',
    kind: 'value',
    form: 'identity-local-export',
    declarationRelationship: 'exact-canonical-owner',
    preservationCost: 'Maintain an explicit source-path identity export and its declaration parity guard.',
    removalCost: 'Break the source-path import even though a declaration-identical focused owner exists.',
  }),
  Object.freeze({
    id: 'named-re-exports',
    kind: 'value',
    form: 'named-re-export',
    declarationRelationship: 'exact-canonical-owner',
    preservationCost: 'Maintain an explicit source-path named re-export and its owner provenance guard.',
    removalCost: 'Break the source-path import and require callers to adopt the focused owner path.',
  }),
  Object.freeze({
    id: 'type-re-exports',
    kind: 'type',
    form: 'type-re-export',
    declarationRelationship: 'exact-canonical-owner',
    preservationCost: 'Maintain a type-only source-path re-export and declaration fingerprint.',
    removalCost: 'Break TypeScript source-path imports and downstream declaration compilation.',
  }),
  Object.freeze({
    id: 'focused-owner-aliases',
    kind: 'value',
    form: 'focused-owner-local-alias',
    declarationRelationship: 'public-name-adaptation',
    preservationCost:
      'Maintain the legacy public name, direct owner identity, and inferred declaration contract.',
    removalCost: 'Break the legacy public name even though the focused owner identity remains available.',
  }),
  Object.freeze({
    id: 'imported-type-local-exports',
    kind: 'type',
    form: 'imported-type-local-export',
    declarationRelationship: 'exact-canonical-owner',
    preservationCost: 'Maintain the imported type binding and its source-path declaration contract.',
    removalCost: 'Break the source-path type import and downstream declaration compilation.',
  }),
]);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const manifest = JSON.parse(read(manifestRel));
const snapshot = JSON.parse(read(snapshotRel));
const layerBaseline = JSON.parse(read(layerBaselineRel));
const checkedReport = JSON.parse(read(reportRel));

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolute] : [];
  });
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
  if (cleanSpecifier.startsWith('/esm/')) raw = path.join(root, cleanSpecifier.slice(1));
  else if (cleanSpecifier.startsWith('@/')) raw = path.join(root, 'esm', cleanSpecifier.slice(2));
  else if (cleanSpecifier.startsWith('.')) raw = path.resolve(path.dirname(fromFile), cleanSpecifier);
  else return null;

  const candidates = [raw];
  const extension = path.extname(raw).toLowerCase();
  if (!extension) {
    candidates.push(...sourceFileExtensions.map(sourceExtension => `${raw}${sourceExtension}`));
  } else {
    const stem = raw.slice(0, -extension.length);
    candidates.push(
      ...(runtimeExtensionCandidates[extension] ?? []).map(sourceExtension => `${stem}${sourceExtension}`)
    );
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...sourceFileExtensions.map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

function collectFacadeDependencies() {
  const facadeTarget = canonicalModuleTarget(path.join(root, facadeRel));
  return listSourceFiles(path.join(root, 'esm'))
    .flatMap(file => {
      const rel = path.relative(root, file).replaceAll('\\', '/');
      return analyzeModuleDependencies(rel, fs.readFileSync(file, 'utf8'))
        .imports.filter(dependency => resolveModuleTarget(file, dependency.specifier) === facadeTarget)
        .map(dependency => ({
          file: rel,
          syntax: dependency.syntax,
          kind: dependency.kind,
          importedSymbols: dependency.importedSymbols,
        }));
    })
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function collectNamedReExportedSymbols(rel, expectedSymbols) {
  const expected = new Set(expectedSymbols);
  return [
    ...new Set(
      analyzeModuleDependencies(rel, read(rel))
        .imports.filter(
          dependency => dependency.syntax === 'static-re-export' || dependency.syntax === 'type-re-export'
        )
        .flatMap(dependency => dependency.bindings.map(binding => binding.exportedName))
        .filter(name => name && name !== '*' && expected.has(name))
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function inspectDecisionReportBase(report) {
  const violations = [];
  const facadeOnlyManifest = manifest.symbols.filter(entry => entry.runtimeApiRoute === null);
  const runtimeManifest = manifest.symbols.filter(entry => entry.runtimeApiRoute !== null);
  const expectedFacadeOnlyNames = new Set(facadeOnlyManifest.map(entry => entry.name));
  const reportNames = report.symbols?.map(entry => entry.name) ?? [];
  if (
    report.version !== 1 ||
    report.capturedProductionHead !== manifest.capturedProductionHead ||
    report.capturedProductionHead !== snapshot.capturedProductionHead
  ) {
    violations.push({ kind: 'capture' });
  }
  const expectedCompatibilityRoutes = layerBaseline.compatibilityBudgets.map(budget => {
    const retirement = layerBaseline.migrationRetirements.find(
      candidate => candidate.replacementCompatibilityBudgetId === budget.id
    );
    return {
      id: budget.id,
      entryNumber: retirement?.entryNumber,
      toFile: budget.statement.toFile,
      kind: budget.statement.kind,
      syntax: budget.statement.syntax,
      importedSymbols: budget.statement.importedSymbols,
      nextReviewBy: budget.nextReviewBy,
    };
  });
  if (
    layerBaseline.version !== '2.6' ||
    report.layerContractOwnership?.schemaVersion !== '2.6' ||
    report.layerContractOwnership?.historicalMigrationEntries !== 178 ||
    report.layerContractOwnership?.activeMigrationEntries !== 149 ||
    report.layerContractOwnership?.retiredMigrationEntries !== 29 ||
    report.layerContractOwnership?.compatibilityBudgets !== 4 ||
    report.layerContractOwnership?.consolidations !== 14 ||
    report.layerContractOwnership?.historicalUniqueFromFiles !== 108 ||
    report.layerContractOwnership?.activeUniqueFromFiles !== 93 ||
    report.layerContractOwnership?.runtime?.owner !== runtimeCompatibilityOwner ||
    report.layerContractOwnership?.runtime?.publicSurface !== runtimePublicSurface ||
    JSON.stringify(report.layerContractOwnership?.runtime?.edge) !==
      JSON.stringify({
        observedStatements: 36,
        activeMigrationStatements: 0,
        compatibilityStatements: 4,
        consolidationStatements: 1,
        reviewedGeneralStatements: 31,
        generalBudget: 32,
      }) ||
    JSON.stringify(report.layerContractOwnership?.runtime?.valueEdge) !==
      JSON.stringify({
        observedValueStatements: 35,
        activeMigrationValueStatements: 0,
        compatibilityValueStatements: 4,
        consolidationValueStatements: 1,
        reviewedGeneralValueStatements: 30,
        generalValueBudget: 31,
      }) ||
    JSON.stringify(report.layerContractOwnership?.runtime?.compatibilityRoutes) !==
      JSON.stringify(expectedCompatibilityRoutes)
  ) {
    violations.push({ kind: 'layer-contract-ownership' });
  }
  if (
    report.summary?.publicSymbols !== 99 ||
    report.summary?.publicValues !== 89 ||
    report.summary?.publicTypes !== 10 ||
    report.summary?.runtimeRouted !== 53 ||
    report.summary?.facadeOnly !== 46 ||
    report.summary?.facadeOnlyValues !== 37 ||
    report.summary?.facadeOnlyTypes !== 9 ||
    report.summary?.groups !== 7
  ) {
    violations.push({ kind: 'summary' });
  }
  if (
    report.topology?.runtimeFacadeDependencies !== 0 ||
    report.topology?.runtimeDimensionRoutes !== 53 ||
    report.topology?.servicesDimensionRoutes !== 53 ||
    report.topology?.featureBarrelFacadeDependencies?.importers !== 1 ||
    report.topology?.featureBarrelFacadeDependencies?.statements !== 1 ||
    report.topology?.featureBarrelFacadeDependencies?.form !== 'wildcard-re-export' ||
    report.topology?.totalLegacyFacadeDependencies?.importers !== 1 ||
    report.topology?.totalLegacyFacadeDependencies?.statements !== 1 ||
    JSON.stringify(report.topology?.layerComparison) !==
      JSON.stringify({
        edge: 'features → shared',
        currentWildcard: {
          physicalStatements: 76,
          valueStatements: 75,
          typeStatements: 2,
          importers: 43,
          valueImporters: 43,
          typeImporters: 1,
        },
        optionBProjected: {
          physicalStatements: 76,
          valueStatements: 75,
          typeStatements: 3,
          importers: 43,
          valueImporters: 43,
          typeImporters: 2,
        },
        facadeDependencyReduction: 0,
      })
  ) {
    violations.push({ kind: 'topology' });
  }
  if (
    reportNames.length !== 46 ||
    new Set(reportNames).size !== 46 ||
    reportNames.some(name => !expectedFacadeOnlyNames.has(name)) ||
    [...expectedFacadeOnlyNames].some(name => !reportNames.includes(name))
  ) {
    violations.push({ kind: 'facade-only-bijection' });
  }
  for (const group of report.groups ?? []) {
    const expected = facadeOnlyManifest
      .filter(
        entry => entry.kind === group.kind && entry.facadeDeclaration.form === group.facadeDeclarationForm
      )
      .map(entry => entry.name)
      .sort((left, right) => left.localeCompare(right));
    if (
      group.count !== expected.length ||
      JSON.stringify(group.symbols) !== JSON.stringify(expected) ||
      group.classification !== classification ||
      group.plannedAction !== plannedAction ||
      group.removalAuthorized !== false
    ) {
      violations.push({ kind: 'group', group: group.id });
    }
  }
  if ((report.groups ?? []).length !== 7) violations.push({ kind: 'group-count' });
  const manifestByName = new Map(manifest.symbols.map(entry => [entry.name, entry]));
  for (const entry of report.symbols ?? []) {
    const expected = manifestByName.get(entry.name);
    if (
      !expected ||
      expected.runtimeApiRoute !== null ||
      entry.kind !== expected.kind ||
      entry.facadeDeclaration?.form !== expected.facadeDeclaration.form ||
      entry.classification !== classification ||
      entry.plannedAction !== plannedAction ||
      entry.removalAuthorized !== false ||
      entry.externalEvidence?.length !== 0 ||
      !entry.recommendedAction?.includes('preserve') ||
      /remove|retire|delete/iu.test(entry.recommendedAction)
    ) {
      violations.push({ kind: 'symbol-decision', symbol: entry.name });
    }
  }
  if (
    report.evidence?.affirmative?.length !== 0 ||
    report.summary?.affirmativeEvidence !== 0 ||
    report.summary?.removalAuthorized !== 0
  ) {
    violations.push({ kind: 'evidence-or-removal' });
  }
  if (
    runtimeManifest.length !== 53 ||
    manifest.symbols.some(entry => entry.classification !== classification) ||
    manifest.symbols.some(entry => entry.plannedAction !== plannedAction)
  ) {
    violations.push({ kind: 'manifest-policy' });
  }
  if (
    report.recommendation?.option !== 'A' ||
    report.options?.map(option => option.id).join(',') !== 'A,B,C' ||
    report.options?.some(option => option.removalAuthorized !== false)
  ) {
    violations.push({ kind: 'options' });
  }
  return violations;
}

function inspectDecisionReport(report) {
  const violations = inspectDecisionReportBase(report);
  const facadeOnlyManifest = manifest.symbols.filter(entry => entry.runtimeApiRoute === null);
  const runtimeNames = manifest.symbols
    .filter(entry => entry.runtimeApiRoute !== null)
    .map(entry => entry.name);
  const actualRuntimeNames = collectNamedReExportedSymbols(runtimeRel, runtimeNames);
  const actualServicesNames = collectNamedReExportedSymbols(servicesBaseRel, runtimeNames);
  const negativeEvidenceIds = Object.entries(manifest.evidenceCatalog)
    .filter(([, evidence]) => evidence.polarity === 'negative')
    .map(([id]) => id)
    .sort((left, right) => left.localeCompare(right));
  const snapshotByName = new Map(snapshot.symbols.map(entry => [entry.name, entry]));
  const expectedSources = {
    manifest: { file: manifestRel, sha256: sha256(read(manifestRel)) },
    semanticSnapshot: { file: snapshotRel, sha256: sha256(read(snapshotRel)) },
    facade: { file: facadeRel, sha256: sha256(read(facadeRel)) },
    layerBaseline: { file: layerBaselineRel, sha256: sha256(read(layerBaselineRel)) },
  };
  if (JSON.stringify(report.sources) !== JSON.stringify(expectedSources)) {
    violations.push({ kind: 'sources' });
  }
  if (
    report.summary?.runtimeRouted !== actualRuntimeNames.length ||
    actualRuntimeNames.length !== 53 ||
    actualServicesNames.length !== 53
  ) {
    violations.push({ kind: 'route-inventory' });
  }
  if (
    report.topology?.runtimeDimensionRoutes !== actualRuntimeNames.length ||
    report.topology?.servicesDimensionRoutes !== actualServicesNames.length ||
    report.topology?.featureBarrelFacadeDependencies?.file !== featureBarrelRel ||
    report.topology?.files?.runtime !== runtimeRel ||
    report.topology?.files?.servicesBase !== servicesBaseRel ||
    report.topology?.files?.servicesEntry !== servicesEntryRel
  ) {
    violations.push({ kind: 'topology-provenance' });
  }
  if (
    (report.groups ?? []).map(group => group.id).join(',') !== groupSpecs.map(group => group.id).join(',')
  ) {
    violations.push({ kind: 'group-identity' });
  }
  for (const group of report.groups ?? []) {
    const spec = groupSpecs.find(candidate => candidate.id === group.id);
    const expectedSymbols = facadeOnlyManifest
      .filter(entry => entry.kind === spec?.kind && entry.facadeDeclaration.form === spec?.form)
      .map(entry => entry.name)
      .sort((left, right) => left.localeCompare(right));
    if (
      !spec ||
      group.kind !== spec.kind ||
      group.facadeDeclarationForm !== spec.form ||
      JSON.stringify(group.symbols) !== JSON.stringify(expectedSymbols)
    ) {
      violations.push({ kind: 'group-provenance', group: group.id });
    }
  }
  const manifestByName = new Map(manifest.symbols.map(entry => [entry.name, entry]));
  for (const entry of report.symbols ?? []) {
    const expected = manifestByName.get(entry.name);
    const semantic = snapshotByName.get(entry.name);
    const spec = groupSpecs.find(
      candidate => candidate.kind === expected?.kind && candidate.form === expected?.facadeDeclaration.form
    );
    const expectedOwnerFingerprints = semantic?.canonicalOwner.map(owner => ({
      file: owner.file,
      symbol: owner.symbol,
      fingerprint: owner.declarationTypeFingerprint,
    }));
    if (
      !expected ||
      !semantic ||
      !spec ||
      entry.group !== spec.id ||
      JSON.stringify(entry.canonicalOwner) !== JSON.stringify(expected.canonicalOwner) ||
      JSON.stringify(entry.facadeDeclaration) !== JSON.stringify(expected.facadeDeclaration) ||
      entry.surfaceParity?.featureBarrelRuntime !==
        (entry.kind === 'value' ? 'strict-identity' : 'not-applicable-type') ||
      entry.surfaceParity?.featureBarrelDeclaration !== 'exact-facade' ||
      entry.surfaceParity?.ownerIdentityMode !== semantic.runtimeIdentityMode ||
      entry.surfaceParity?.declarationRelationship !== spec.declarationRelationship ||
      entry.surfaceParity?.facadeFingerprint !== semantic.surfaces.facade.declarationTypeFingerprint ||
      entry.surfaceParity?.featureBarrelFingerprint !==
        semantic.surfaces.featureBarrel.declarationTypeFingerprint ||
      JSON.stringify(entry.surfaceParity?.ownerFingerprints) !== JSON.stringify(expectedOwnerFingerprints) ||
      JSON.stringify(entry.sourcePathCompatibilityEvidence) !== JSON.stringify(negativeEvidenceIds) ||
      entry.costOfPreservation !== spec.preservationCost ||
      entry.costOfRemoval !== spec.removalCost
    ) {
      violations.push({ kind: 'symbol-provenance', symbol: entry.name });
    }
  }
  if (
    JSON.stringify(report.evidence?.negativeEvidenceIds) !== JSON.stringify(negativeEvidenceIds) ||
    JSON.stringify(report.evidence?.catalog) !== JSON.stringify(manifest.evidenceCatalog)
  ) {
    violations.push({ kind: 'evidence-provenance' });
  }
  if (
    !report.options?.[0]?.action.includes('Keep the legacy facade') ||
    !report.options?.[1]?.action.includes('explicit same-facade') ||
    !report.options?.[1]?.action.includes('Do not redirect') ||
    !report.options?.[1]?.dependencyEffect?.includes('remains the sole facade importer') ||
    !report.options?.[1]?.dependencyEffect?.includes('adds one type statement') ||
    !report.options?.[1]?.dependencyEffect?.includes('reducing facade dependencies by zero') ||
    !report.options?.[2]?.action.includes('release/semver note') ||
    !report.recommendation?.rationale?.includes('type-ratchet growth') ||
    !report.recommendation?.rationale?.includes('without reducing a single facade dependency') ||
    JSON.stringify(report.recommendation?.proof) !==
      JSON.stringify({
        source: facadeRel,
        valueRuntimeIdentityParity: 89,
        declarationFingerprintParity: 99,
        removals: 0,
        facadeDependencyReduction: 0,
      })
  ) {
    violations.push({ kind: 'option-evidence' });
  }
  return violations;
}

function mutateReport(mutator) {
  const candidate = structuredClone(checkedReport);
  mutator(candidate);
  return inspectDecisionReport(candidate);
}

function assertRejected(violations, kind, label) {
  assert.equal(
    violations.some(violation => violation.kind === kind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

test('Runtime facade closeout leaves one public feature wildcard and preserves all compatibility routes', () => {
  assert.deepEqual(collectFacadeDependencies(), [
    {
      file: featureBarrelRel,
      syntax: 'static-re-export',
      kind: 'value',
      importedSymbols: ['*'],
    },
  ]);
  assert.equal(
    analyzeModuleDependencies(runtimeRel, read(runtimeRel)).imports.some(dependency =>
      dependency.specifier.includes('wardrobe_dimension_tokens_shared')
    ),
    false
  );
  const routedNames = manifest.symbols
    .filter(entry => entry.runtimeApiRoute !== null)
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right));
  assert.deepEqual(collectNamedReExportedSymbols(runtimeRel, routedNames), routedNames);
  assert.deepEqual(collectNamedReExportedSymbols(servicesBaseRel, routedNames), routedNames);
  const servicesEntryAbsolute = path.join(root, servicesEntryRel);
  const servicesBaseTarget = canonicalModuleTarget(path.join(root, servicesBaseRel));
  assert.equal(
    analyzeModuleDependencies(servicesEntryRel, read(servicesEntryRel)).imports.some(
      dependency =>
        dependency.syntax === 'static-re-export' &&
        dependency.importedSymbols.includes('*') &&
        resolveModuleTarget(servicesEntryAbsolute, dependency.specifier) === servicesBaseTarget
    ),
    true
  );
  assert.equal(manifest.symbols.filter(entry => entry.runtimeApiRoute !== null).length, 53);
  assert.equal(manifest.symbols.filter(entry => entry.servicesApiRoute !== null).length, 53);
  assert.equal(manifest.surfaceTopology.servicesBase.file, servicesBaseRel);
  assert.equal(manifest.surfaceTopology.servicesEntry.file, servicesEntryRel);
});

test('decision report is canonical and partitions all 46 facade-only symbols exactly', () => {
  assert.deepEqual(checkedReport, buildDecisionReport(root));
  assert.deepEqual(inspectDecisionReport(checkedReport), []);
  assert.deepEqual(
    checkedReport.groups.map(group => [group.id, group.count]),
    [
      ['legacy-number-view-local-exports', 12],
      ['local-compositions', 6],
      ['identity-local-exports', 9],
      ['named-re-exports', 7],
      ['type-re-exports', 8],
      ['focused-owner-aliases', 3],
      ['imported-type-local-exports', 1],
    ]
  );
});

test('all 99 public symbols remain undetermined and no report decision authorizes removal', () => {
  assert.equal(manifest.symbols.length, 99);
  assert.equal(
    manifest.symbols.every(entry => entry.classification === classification),
    true
  );
  assert.equal(
    manifest.symbols.every(entry => entry.plannedAction === plannedAction),
    true
  );
  assert.equal(
    checkedReport.symbols.every(entry => entry.removalAuthorized === false),
    true
  );
  assert.equal(
    checkedReport.options.every(option => option.removalAuthorized === false),
    true
  );
});

test('decision report mutations reject omission, duplication, misgrouping, capture, route, and removal drift', () => {
  assertRejected(
    mutateReport(report => report.symbols.pop()),
    'facade-only-bijection',
    'omitted symbol'
  );
  assertRejected(
    mutateReport(report => report.symbols.push(structuredClone(report.symbols[0]))),
    'facade-only-bijection',
    'duplicate symbol'
  );
  assertRejected(
    mutateReport(report => report.groups[0].symbols.push(report.groups[1].symbols[0])),
    'group',
    'misgrouped symbol'
  );
  assertRejected(
    mutateReport(report => {
      report.capturedProductionHead = '0000000000000000000000000000000000000000';
    }),
    'capture',
    'capture drift'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].name = 'CHEST_MODE_DIMENSIONS';
    }),
    'facade-only-bijection',
    'Runtime-routed symbol insertion'
  );
  assertRejected(
    mutateReport(report => report.evidence.affirmative.push('fabricated-consumer')),
    'evidence-or-removal',
    'affirmative evidence fabrication'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].removalAuthorized = true;
    }),
    'symbol-decision',
    'removal authorization'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].classification = 'unused/stale compatibility';
    }),
    'symbol-decision',
    'classification drift'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].recommendedAction = 'remove-now';
    }),
    'symbol-decision',
    'destructive planned action'
  );
});

test('decision report mutations reject provenance, parity, evidence, cost, topology, and option drift', () => {
  assertRejected(
    mutateReport(report => {
      report.sources.manifest.sha256 = '0'.repeat(64);
    }),
    'sources',
    'source hash'
  );
  assertRejected(
    mutateReport(report => {
      report.groups[0].id = 'renamed-group';
    }),
    'group-identity',
    'group identity'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].group = report.groups[1].id;
    }),
    'symbol-provenance',
    'symbol group'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].canonicalOwner.exports[0].file = 'esm/shared/dimensions/wrong_owner.ts';
    }),
    'symbol-provenance',
    'canonical owner'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].surfaceParity.facadeFingerprint = '0'.repeat(64);
    }),
    'symbol-provenance',
    'declaration fingerprint'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].surfaceParity.ownerIdentityMode = 'new-aggregate';
    }),
    'symbol-provenance',
    'owner identity mode'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].sourcePathCompatibilityEvidence.pop();
    }),
    'symbol-provenance',
    'symbol evidence'
  );
  assertRejected(
    mutateReport(report => {
      report.symbols[0].costOfRemoval = 'free';
    }),
    'symbol-provenance',
    'removal cost'
  );
  assertRejected(
    mutateReport(report => {
      report.evidence.catalog['package-private-no-exports'].polarity = 'affirmative';
    }),
    'evidence-provenance',
    'evidence catalog'
  );
  assertRejected(
    mutateReport(report => {
      report.topology.files.runtime = servicesEntryRel;
    }),
    'topology-provenance',
    'topology path'
  );
  assertRejected(
    mutateReport(report => {
      report.layerContractOwnership.runtime.edge.compatibilityStatements = 3;
    }),
    'layer-contract-ownership',
    'compatibility ownership count'
  );
  assertRejected(
    mutateReport(report => {
      report.layerContractOwnership.runtime.compatibilityRoutes[0].toFile =
        'esm/shared/dimensions/wrong_owner.ts';
    }),
    'layer-contract-ownership',
    'compatibility route target'
  );
  assertRejected(
    mutateReport(report => {
      report.options[1].action = 'Redirect every export directly to focused owners.';
    }),
    'option-evidence',
    'Option B source'
  );
  assertRejected(
    mutateReport(report => {
      report.topology.layerComparison.optionBProjected.typeStatements = 2;
    }),
    'topology',
    'Option B type-statement projection'
  );
});
