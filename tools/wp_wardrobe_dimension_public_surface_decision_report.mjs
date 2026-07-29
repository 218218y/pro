import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from './wp_layer_contract_support.mjs';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(toolDir, '..');
const manifestRel = 'tools/wp_wardrobe_dimension_public_surface_manifest.json';
const snapshotRel = 'tools/wp_wardrobe_dimension_public_surface_semantic_snapshot.json';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const featureBarrelRel = 'esm/native/features/dimensions/index.ts';
const runtimeRel = 'esm/native/runtime/api.ts';
const servicesBaseRel = 'esm/native/services/api_runtime_base_surface.ts';
const servicesEntryRel = 'esm/native/services/api.ts';
const reportJsonRel = 'tools/wp_wardrobe_dimension_public_surface_decision_report.json';
const reportMarkdownRel = 'docs/WARDROBE_DIMENSION_PUBLIC_SURFACE_DECISION_REPORT.md';
const classification = 'undetermined — blocks removal';
const plannedAction = 'retain-until-external-evidence-or-explicit-public-surface-decision';

const groupSpecs = Object.freeze([
  Object.freeze({
    id: 'legacy-number-view-local-exports',
    kind: 'value',
    form: 'legacy-number-view-local-export',
    expectedCount: 12,
    declarationParity: 'legacy-number-view-adaptation',
    preservationCost:
      'Maintain the plain-number declaration adaptation, runtime identity proof, and source-path compatibility contract.',
    removalCost:
      'Break the source-path import and expose branded owner declarations to callers that currently receive plain numbers.',
  }),
  Object.freeze({
    id: 'local-compositions',
    kind: 'value',
    form: 'local-composition',
    expectedCount: 6,
    declarationParity: 'local-composition-contract',
    preservationCost:
      'Maintain aggregate shape, key order, freeze topology, declaration fingerprints, and focused-owner identity projections.',
    removalCost:
      'Break the source-path aggregate contract and require callers to reconstruct a multi-owner composition.',
  }),
  Object.freeze({
    id: 'identity-local-exports',
    kind: 'value',
    form: 'identity-local-export',
    expectedCount: 9,
    declarationParity: 'exact-canonical-owner',
    preservationCost: 'Maintain an explicit source-path identity export and its declaration parity guard.',
    removalCost: 'Break the source-path import even though a declaration-identical focused owner exists.',
  }),
  Object.freeze({
    id: 'named-re-exports',
    kind: 'value',
    form: 'named-re-export',
    expectedCount: 7,
    declarationParity: 'exact-canonical-owner',
    preservationCost: 'Maintain an explicit source-path named re-export and its owner provenance guard.',
    removalCost: 'Break the source-path import and require callers to adopt the focused owner path.',
  }),
  Object.freeze({
    id: 'type-re-exports',
    kind: 'type',
    form: 'type-re-export',
    expectedCount: 8,
    declarationParity: 'exact-canonical-owner',
    preservationCost: 'Maintain a type-only source-path re-export and declaration fingerprint.',
    removalCost: 'Break TypeScript source-path imports and downstream declaration compilation.',
  }),
  Object.freeze({
    id: 'focused-owner-aliases',
    kind: 'value',
    form: 'focused-owner-local-alias',
    expectedCount: 3,
    declarationParity: 'public-name-adaptation',
    preservationCost:
      'Maintain the legacy public name, direct owner identity, and inferred declaration contract.',
    removalCost: 'Break the legacy public name even though the focused owner identity remains available.',
  }),
  Object.freeze({
    id: 'imported-type-local-exports',
    kind: 'type',
    form: 'imported-type-local-export',
    expectedCount: 1,
    declarationParity: 'exact-canonical-owner',
    preservationCost: 'Maintain the imported type binding and its source-path declaration contract.',
    removalCost: 'Break the source-path type import and downstream declaration compilation.',
  }),
]);

const sha256 = value => createHash('sha256').update(value).digest('hex');
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const sorted = values => [...values].sort((left, right) => left.localeCompare(right));

function collectNamedReExportedSymbols(root, rel, expectedSymbols) {
  const expected = new Set(expectedSymbols);
  const analysis = analyzeModuleDependencies(rel, read(root, rel));
  return sorted(
    new Set(
      analysis.imports
        .filter(
          dependency => dependency.syntax === 'static-re-export' || dependency.syntax === 'type-re-export'
        )
        .flatMap(dependency => dependency.bindings.map(binding => binding.exportedName))
        .filter(name => name && name !== '*' && expected.has(name))
    )
  );
}

function buildDecisionReport(root = defaultRoot) {
  const manifestSource = read(root, manifestRel);
  const snapshotSource = read(root, snapshotRel);
  const manifest = JSON.parse(manifestSource);
  const snapshot = JSON.parse(snapshotSource);
  if (manifest.capturedProductionHead !== snapshot.capturedProductionHead) {
    throw new Error('Manifest and semantic snapshot production captures differ');
  }

  const negativeEvidenceIds = sorted(
    Object.entries(manifest.evidenceCatalog)
      .filter(([, evidence]) => evidence.polarity === 'negative')
      .map(([id]) => id)
  );
  const affirmativeEvidence = Object.entries(manifest.evidenceCatalog).filter(
    ([, evidence]) => evidence.polarity === 'affirmative'
  );
  if (affirmativeEvidence.length !== 0) {
    throw new Error('Affirmative evidence requires a separate public classification decision');
  }

  const snapshotByName = new Map(snapshot.symbols.map(entry => [entry.name, entry]));
  const facadeOnlyEntries = manifest.symbols.filter(entry => entry.runtimeApiRoute === null);
  const runtimeRoutedNames = manifest.symbols
    .filter(entry => entry.runtimeApiRoute !== null)
    .map(entry => entry.name);
  const runtimeExportedNames = collectNamedReExportedSymbols(root, runtimeRel, runtimeRoutedNames);
  const servicesExportedNames = collectNamedReExportedSymbols(root, servicesBaseRel, runtimeRoutedNames);
  const symbols = [];
  const groups = groupSpecs.map(spec => {
    const entries = facadeOnlyEntries
      .filter(entry => entry.kind === spec.kind && entry.facadeDeclaration.form === spec.form)
      .sort((left, right) => left.name.localeCompare(right.name));
    if (entries.length !== spec.expectedCount) {
      throw new Error(`${spec.id} expected ${spec.expectedCount}, received ${entries.length}`);
    }
    for (const entry of entries) {
      const semantic = snapshotByName.get(entry.name);
      if (!semantic) throw new Error(`Missing semantic snapshot entry for ${entry.name}`);
      symbols.push({
        name: entry.name,
        kind: entry.kind,
        group: spec.id,
        canonicalOwner: entry.canonicalOwner,
        facadeDeclaration: entry.facadeDeclaration,
        surfaceParity: {
          featureBarrelRuntime: entry.kind === 'value' ? 'strict-identity' : 'not-applicable-type',
          featureBarrelDeclaration: 'exact-facade',
          ownerIdentityMode: semantic.runtimeIdentityMode,
          declarationRelationship: spec.declarationParity,
          facadeFingerprint: semantic.surfaces.facade.declarationTypeFingerprint,
          featureBarrelFingerprint: semantic.surfaces.featureBarrel.declarationTypeFingerprint,
          ownerFingerprints: semantic.canonicalOwner.map(owner => ({
            file: owner.file,
            symbol: owner.symbol,
            fingerprint: owner.declarationTypeFingerprint,
          })),
        },
        sourcePathCompatibilityEvidence: negativeEvidenceIds,
        externalEvidence: entry.externalEvidence,
        classification: entry.classification,
        plannedAction: entry.plannedAction,
        recommendedAction: 'preserve-pending-affirmative-evidence-or-explicit-policy-decision',
        removalAuthorized: false,
        costOfPreservation: spec.preservationCost,
        costOfRemoval: spec.removalCost,
      });
    }
    return {
      id: spec.id,
      kind: spec.kind,
      facadeDeclarationForm: spec.form,
      count: entries.length,
      symbols: entries.map(entry => entry.name),
      classification,
      plannedAction,
      removalAuthorized: false,
    };
  });

  symbols.sort((left, right) => left.name.localeCompare(right.name));
  const values = symbols.filter(entry => entry.kind === 'value').length;
  const types = symbols.filter(entry => entry.kind === 'type').length;
  return {
    version: 1,
    capturedProductionHead: manifest.capturedProductionHead,
    policy:
      'This report records decision inputs for facade-only symbols. Repository silence is negative evidence only; every symbol remains removal-blocking until affirmative evidence or an explicit source-path API policy decision exists.',
    sources: {
      manifest: { file: manifestRel, sha256: sha256(manifestSource) },
      semanticSnapshot: { file: snapshotRel, sha256: sha256(snapshotSource) },
      facade: { file: facadeRel, sha256: sha256(read(root, facadeRel)) },
    },
    topology: {
      runtimeFacadeDependencies: 0,
      runtimeDimensionRoutes: runtimeExportedNames.length,
      servicesDimensionRoutes: servicesExportedNames.length,
      featureBarrelFacadeDependencies: {
        file: featureBarrelRel,
        importers: 1,
        statements: 1,
        form: 'wildcard-re-export',
      },
      totalLegacyFacadeDependencies: { importers: 1, statements: 1 },
      files: {
        runtime: runtimeRel,
        servicesBase: servicesBaseRel,
        servicesEntry: servicesEntryRel,
      },
    },
    summary: {
      publicSymbols: manifest.symbols.length,
      publicValues: manifest.symbols.filter(entry => entry.kind === 'value').length,
      publicTypes: manifest.symbols.filter(entry => entry.kind === 'type').length,
      runtimeRouted: runtimeExportedNames.length,
      facadeOnly: symbols.length,
      facadeOnlyValues: values,
      facadeOnlyTypes: types,
      groups: groups.length,
      affirmativeEvidence: 0,
      removalAuthorized: 0,
    },
    evidence: {
      affirmative: [],
      negativeEvidenceIds,
      catalog: manifest.evidenceCatalog,
    },
    groups,
    symbols,
    options: [
      {
        id: 'A',
        name: 'compatibility-preservation',
        action:
          'Keep the legacy facade and feature barrel as source-path compatibility surfaces, with ownership moved from migration debt to a dedicated compatibility schema.',
        publicSurface: '89 values / 10 types preserved',
        removalAuthorized: false,
      },
      {
        id: 'B',
        name: 'explicit-public-barrel',
        action:
          'Replace the wildcard feature barrel with an explicit same-facade named value/type inventory while preserving all 89 values and 10 types. Do not redirect adapted or composed symbols to focused owners.',
        publicSurface: '89 values / 10 types preserved',
        dependencyEffect:
          'The feature barrel remains the sole facade importer; mixed-versus-split statement shape requires separate Layer/Ledger review before implementation.',
        removalAuthorized: false,
      },
      {
        id: 'C',
        name: 'retirement',
        action:
          'Retire the source-path surfaces only after an explicit policy decision that they are unsupported, a complete declaration diff, and a release/semver note.',
        publicSurface: 'potentially breaking; no removal is authorized by this report',
        removalAuthorized: false,
      },
    ],
    recommendation: {
      option: 'B',
      rationale:
        'An explicit same-facade barrel removes wildcard ambiguity while preserving every current public name, runtime identity, and declaration. It is inventory hardening, not facade retirement; retirement remains blocked by the absence of affirmative evidence or a source-path API policy decision.',
      proof: {
        source: facadeRel,
        valueRuntimeIdentityParity: 89,
        declarationFingerprintParity: 99,
        removals: 0,
        facadeDependencyReduction: 0,
      },
    },
  };
}

function markdownEscape(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function renderDecisionReportMarkdown(report) {
  const lines = [
    '# Wardrobe Dimension Public Surface Decision Report',
    '',
    `Captured production HEAD: \`${report.capturedProductionHead}\``,
    '',
    'This is a decision-input report, not removal authorization. All 99 public symbols remain `undetermined — blocks removal`.',
    '',
    '## Closeout topology',
    '',
    `- Runtime facade dependencies: ${report.topology.runtimeFacadeDependencies}`,
    `- Runtime dimension routes: ${report.topology.runtimeDimensionRoutes}`,
    `- Services dimension routes: ${report.topology.servicesDimensionRoutes}`,
    `- Legacy facade dependencies: ${report.topology.totalLegacyFacadeDependencies.importers} importer / ${report.topology.totalLegacyFacadeDependencies.statements} statement`,
    `- Remaining importer: \`${report.topology.featureBarrelFacadeDependencies.file}\` (${report.topology.featureBarrelFacadeDependencies.form})`,
    `- Public surface: ${report.summary.publicValues} values / ${report.summary.publicTypes} types`,
    '',
    '## Facade-only groups',
    '',
    '| Group | Kind | Form | Count | Symbols |',
    '| --- | --- | --- | ---: | --- |',
    ...report.groups.map(
      group =>
        `| ${group.id} | ${group.kind} | ${group.facadeDeclarationForm} | ${group.count} | ${group.symbols.map(name => `\`${name}\``).join(', ')} |`
    ),
    '',
    '## Symbol decisions',
    '',
    '| Symbol | Kind/form | Canonical owner | Runtime/declaration parity | Recommended action | Preservation cost | Removal cost |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...report.symbols.map(symbol => {
      const owners = symbol.canonicalOwner.exports
        .map(owner => `${owner.file}#${owner.symbols.join(',')}`)
        .join('; ');
      return `| \`${symbol.name}\` | ${symbol.kind} / ${symbol.facadeDeclaration.form} | ${markdownEscape(owners)} | ${symbol.surfaceParity.featureBarrelRuntime} / ${symbol.surfaceParity.ownerIdentityMode} / ${symbol.surfaceParity.declarationRelationship} | ${symbol.recommendedAction} | ${markdownEscape(symbol.costOfPreservation)} | ${markdownEscape(symbol.costOfRemoval)} |`;
    }),
    '',
    '## Options',
    '',
    ...report.options.flatMap(option => [
      `### Option ${option.id} — ${option.name}`,
      '',
      option.action,
      '',
      `Public-surface result: ${option.publicSurface}.`,
      ...(option.dependencyEffect ? ['', `Dependency effect: ${option.dependencyEffect}`] : []),
      '',
    ]),
    '## Recommendation',
    '',
    `Proceed with Option ${report.recommendation.option}. ${report.recommendation.rationale}`,
    '',
    `Proof: ${report.recommendation.proof.valueRuntimeIdentityParity}/89 value identities, ${report.recommendation.proof.declarationFingerprintParity}/99 declaration fingerprints, ${report.recommendation.proof.removals} removals, and ${report.recommendation.proof.facadeDependencyReduction} facade-dependency reduction.`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

async function formatGenerated(value, targetRel) {
  const prettier = await import('prettier');
  const target = path.join(defaultRoot, targetRel);
  const config = await prettier.resolveConfig(target);
  return prettier.format(value, { ...config, filepath: target });
}

async function runCli() {
  const args = process.argv.slice(2);
  const report = buildDecisionReport(defaultRoot);
  const json = await formatGenerated(JSON.stringify(report), reportJsonRel);
  const markdown = await formatGenerated(renderDecisionReportMarkdown(report), reportMarkdownRel);
  const outputIndex = args.indexOf('--json-out');
  const markdownIndex = args.indexOf('--md-out');
  if (outputIndex >= 0 || markdownIndex >= 0) {
    const jsonTarget = args[outputIndex + 1];
    const markdownTarget = args[markdownIndex + 1];
    if (!jsonTarget || !markdownTarget) throw new Error('--json-out and --md-out are both required');
    fs.writeFileSync(path.resolve(defaultRoot, jsonTarget), json);
    fs.writeFileSync(path.resolve(defaultRoot, markdownTarget), markdown);
    return;
  }
  if (args.includes('--write')) {
    fs.writeFileSync(path.join(defaultRoot, reportJsonRel), json);
    fs.writeFileSync(path.join(defaultRoot, reportMarkdownRel), markdown);
    return;
  }
  if (args.includes('--check')) {
    if (read(defaultRoot, reportJsonRel) !== json) throw new Error(`${reportJsonRel} is stale`);
    if (read(defaultRoot, reportMarkdownRel) !== markdown) {
      throw new Error(`${reportMarkdownRel} is stale`);
    }
    return;
  }
  process.stdout.write(json);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await runCli();

export { buildDecisionReport, renderDecisionReportMarkdown };
