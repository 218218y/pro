import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatContractViolations,
  inspectStaticPolicyContract,
  inspectStaticPolicyContracts,
} from '../tools/wp_declarative_contract_engine.mjs';
import { DIMENSION_STATIC_POLICY_CONTRACTS } from '../tools/wp_dimension_policy_contract_manifest.mjs';
import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createTsRuntimeModuleLoader } from './_ts_runtime_module_loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const resolverRel = 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts';
const domainApiRel = 'esm/native/kernel/domain_api_room_section_wardrobe.ts';

const resolverExports = Object.freeze([
  'normalizeWardrobeDimensionDefaultType',
  'resolveWardrobeTypeDefaults',
  'getDefaultDepthForWardrobeType',
  'getDefaultDoorsForWardrobeType',
  'getDefaultPerDoorWidthForWardrobeType',
  'resolveAutoWidthForDoors',
  'isAutoWidthForDoors',
  'getDefaultWidthForWardrobeType',
  'getDefaultHeightForWardrobeType',
  'getDefaultChestDrawersCount',
  'resolveDefaultWardrobeDimensions',
]);

function contract(id) {
  const found = DIMENSION_STATIC_POLICY_CONTRACTS.find(entry => entry.id === id);
  assert.ok(found, `missing contract ${id}`);
  return found;
}

function withOverrides(overrides) {
  return rel => (Object.hasOwn(overrides, rel) ? overrides[rel] : read(rel));
}

function violationKinds(violations) {
  return new Set(violations.map(violation => violation.kind));
}

function resolveReference(modulesBySymbol, reference) {
  const [rootSymbol, ...members] = reference.split('.');
  let value = modulesBySymbol.get(rootSymbol)?.[rootSymbol];
  for (const member of members) value = value?.[member];
  return value;
}

function assertRuntimeShape(actual, expected, modulesBySymbol, label) {
  if (typeof expected?.ref === 'string') {
    assert.strictEqual(actual, resolveReference(modulesBySymbol, expected.ref), label);
    return;
  }
  if (Object.hasOwn(expected || {}, 'literal')) {
    assert.deepEqual(actual, expected.literal, label);
    return;
  }
  assert.equal(actual !== null && typeof actual === 'object', true, `${label} must be an object`);
  assert.equal(Object.isFrozen(actual), true, `${label} must be frozen`);
  assert.deepEqual(
    Object.keys(actual).sort(),
    Object.keys(expected.properties || {}).sort(),
    `${label} property surface`
  );
  for (const [key, child] of Object.entries(expected.properties || {})) {
    assertRuntimeShape(actual[key], child, modulesBySymbol, `${label}.${key}`);
  }
}

function resolverArchitectureFacts() {
  const source = read(resolverRel);
  const analysis = analyzeModuleDependencies(resolverRel, source);
  return {
    imports: analysis.imports
      .map(dependency => ({
        specifier: dependency.specifier,
        kind: dependency.kind,
        syntax: dependency.syntax,
        symbols: [...dependency.importedSymbols].sort(),
        aliases: dependency.bindings
          .filter(binding => binding.localName !== null && binding.localName !== binding.importedName)
          .map(binding => [binding.importedName, binding.localName]),
      }))
      .sort((left, right) =>
        `${left.specifier}:${left.kind}`.localeCompare(`${right.specifier}:${right.kind}`)
      ),
    exports: collectNamedModuleExports(resolverRel, source)
      .map(entry => [entry.exportedName, entry.kind])
      .sort((left, right) => left[0].localeCompare(right[0])),
    dynamic: analysis.unresolvedDynamicImports,
    forbidden: analysis.forbiddenModuleSyntax,
  };
}

function domainApiResolverImportFacts() {
  const source = read(domainApiRel);
  const analysis = analyzeModuleDependencies(domainApiRel, source);
  return analysis.imports
    .filter(
      dependency => dependency.specifier === '../../shared/dimensions/wardrobe_default_resolution_policy.js'
    )
    .map(dependency => ({
      kind: dependency.kind,
      syntax: dependency.syntax,
      symbols: [...dependency.importedSymbols].sort(),
      aliases: dependency.bindings
        .filter(binding => binding.localName !== null && binding.localName !== binding.importedName)
        .map(binding => [binding.importedName, binding.localName]),
    }));
}

function createSanitizerHarness() {
  const syncCalls = [];
  const loader = createTsRuntimeModuleLoader({
    mock: specifier => {
      if (specifier === '../runtime/builder_service_access.js') {
        return { ensureBuilderService: App => App.services.builder };
      }
      if (specifier === '../runtime/num_coerce.js') {
        const coerceFiniteNumber = value => {
          if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
          if (typeof value !== 'string' || !value.trim()) return undefined;
          const parsed = parseFloat(value.trim());
          return Number.isFinite(parsed) ? parsed : undefined;
        };
        return {
          coerceFiniteNumber,
          coerceFiniteInt: value => {
            const number = coerceFiniteNumber(value);
            return typeof number === 'number' ? Math.round(number) : undefined;
          },
        };
      }
      if (specifier === '../runtime/dimension_sync_coalescer.js') {
        return {
          syncDimensionRuntimePatch: (...args) => {
            syncCalls.push(args);
          },
        };
      }
      if (specifier === '../runtime/meta_profiles_access.js') {
        return { metaUiOnly: (_App, meta, source) => ({ ...(meta || {}), source }) };
      }
      if (specifier === '../../shared/identity_value_shared.js') {
        return {
          readIdentityValue: value =>
            typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)) ? value : null,
          formatIdentityValue: value =>
            typeof value === 'string'
              ? value
              : typeof value === 'number' && Number.isFinite(value)
                ? String(value)
                : '',
        };
      }
      return undefined;
    },
  });
  const module = loader.load(path.join(root, 'esm/native/builder/state_sanitize_pipeline.ts'));
  return { sanitize: module.sanitizeBuildDimsAndSyncRuntime, syncCalls };
}

test('declarative static-policy engine owns the wardrobe dimension projection family', () => {
  const violations = inspectStaticPolicyContracts(DIMENSION_STATIC_POLICY_CONTRACTS, { projectRoot: root });
  assert.equal(violations.length, 0, formatContractViolations(violations));
});

test('static-policy engine ignores harmless property order but rejects wrappers, missing freezes, and policy escapes', () => {
  const autoWidth = contract('structure-tab-auto-width-policy');
  const autoWidthSource = read(autoWidth.owner);
  const reordered = autoWidthSource.replace(
    '  resolveAutoWidthForDoors,\n  isAutoWidthForDoors,',
    '  isAutoWidthForDoors,\n  resolveAutoWidthForDoors,'
  );
  assert.deepEqual(
    inspectStaticPolicyContract(autoWidth, {
      projectRoot: root,
      readSource: withOverrides({ [autoWidth.owner]: reordered }),
      skipConsumerAudit: true,
    }),
    []
  );

  const wrapped = autoWidthSource.replace(
    '  resolveAutoWidthForDoors,',
    '  resolveAutoWidthForDoors: (...args) => resolveAutoWidthForDoors(...args),'
  );
  assert.equal(
    violationKinds(
      inspectStaticPolicyContract(autoWidth, {
        projectRoot: root,
        readSource: withOverrides({ [autoWidth.owner]: wrapped }),
        skipConsumerAudit: true,
      })
    ).has('policy-reference'),
    true
  );

  const sanitization = contract('wardrobe-sanitization-policy');
  const unfrozen = read(sanitization.owner).replace('  defaults: Object.freeze({', '  defaults: ({');
  assert.equal(
    violationKinds(
      inspectStaticPolicyContract(sanitization, {
        projectRoot: root,
        readSource: withOverrides({ [sanitization.owner]: unfrozen }),
        skipConsumerAudit: true,
      })
    ).has('policy-object-not-frozen'),
    true
  );

  const preset = contract('preset-models-dimension-defaults-policy');
  const presetConsumer = preset.consumers[0].file;
  const escaped = `${read(presetConsumer)}\nvoid PRESET_MODELS_DIMENSION_DEFAULTS_POLICY;\n`;
  assert.equal(
    violationKinds(
      inspectStaticPolicyContract(preset, {
        projectRoot: root,
        readSource: withOverrides({ [presetConsumer]: escaped }),
      })
    ).has('policy-reference-escape'),
    true
  );
});

test('static dimension policies preserve runtime identities, projections, and deep freezes', () => {
  const loader = createTsRuntimeModuleLoader();
  for (const policyContract of DIMENSION_STATIC_POLICY_CONTRACTS) {
    const policyModule = loader.load(path.join(root, policyContract.owner));
    const modulesBySymbol = new Map();
    for (const source of policyContract.sources) {
      const sourceModule = loader.load(path.join(root, source.file));
      for (const symbol of source.symbols) modulesBySymbol.set(symbol, sourceModule);
    }
    assertRuntimeShape(
      policyModule[policyContract.exportName],
      policyContract.shape,
      modulesBySymbol,
      policyContract.exportName
    );
  }
});

test('wardrobe default resolver keeps a small stable architecture surface and behavior matrix', () => {
  assert.deepEqual(resolverArchitectureFacts(), {
    imports: [
      {
        specifier: './wardrobe_defaults.js',
        kind: 'type',
        syntax: 'type-import',
        symbols: ['WardrobeDimensionDefaultType'],
        aliases: [],
      },
      {
        specifier: './wardrobe_defaults.js',
        kind: 'value',
        syntax: 'static-import',
        symbols: ['WARDROBE_DEFAULTS'],
        aliases: [],
      },
      {
        specifier: './wardrobe_layout_comparison_policy.js',
        kind: 'value',
        syntax: 'static-import',
        symbols: ['WARDROBE_LAYOUT_COMPARISON_POLICY'],
        aliases: [],
      },
    ],
    exports: resolverExports
      .map(name => [name, 'value'])
      .sort((left, right) => left[0].localeCompare(right[0])),
    dynamic: [],
    forbidden: [],
  });

  assert.deepEqual(domainApiResolverImportFacts(), [
    {
      kind: 'value',
      syntax: 'static-import',
      symbols: [
        'getDefaultDepthForWardrobeType',
        'getDefaultDoorsForWardrobeType',
        'getDefaultHeightForWardrobeType',
        'getDefaultPerDoorWidthForWardrobeType',
      ],
      aliases: [],
    },
  ]);

  const loader = createTsRuntimeModuleLoader();
  const resolver = loader.load(path.join(root, resolverRel));
  const defaults = loader.load(path.join(root, 'esm/shared/dimensions/wardrobe_defaults.ts'));
  const comparison = loader.load(
    path.join(root, 'esm/shared/dimensions/wardrobe_layout_comparison_policy.ts')
  );

  for (const type of ['hinged', 'sliding']) {
    const byType = defaults.WARDROBE_DEFAULTS.byType[type];
    const expected = {
      widthCm: defaults.WARDROBE_DEFAULTS.widthCm,
      heightCm: defaults.WARDROBE_DEFAULTS.heightCm,
      depthCm: byType.depthCm,
      doorsCount: byType.doorsCount,
      perDoorWidthCm: byType.perDoorWidthCm,
    };
    assert.deepEqual(JSON.parse(JSON.stringify(resolver.resolveWardrobeTypeDefaults(type))), expected);
    assert.equal(resolver.getDefaultDepthForWardrobeType(type), expected.depthCm);
    assert.equal(resolver.getDefaultDoorsForWardrobeType(type), expected.doorsCount);
    assert.equal(resolver.getDefaultPerDoorWidthForWardrobeType(type), expected.perDoorWidthCm);
    assert.equal(
      resolver.getDefaultWidthForWardrobeType(type),
      expected.doorsCount * expected.perDoorWidthCm
    );
    assert.equal(resolver.getDefaultHeightForWardrobeType(type), expected.heightCm);
    assert.deepEqual(JSON.parse(JSON.stringify(resolver.resolveDefaultWardrobeDimensions(type))), expected);
  }

  assert.equal(resolver.normalizeWardrobeDimensionDefaultType('sliding'), 'sliding');
  for (const value of ['hinged', 'unknown', null, undefined, 1]) {
    assert.equal(resolver.normalizeWardrobeDimensionDefaultType(value), 'hinged');
  }
  assert.equal(resolver.resolveAutoWidthForDoors('hinged', -1), 0);
  assert.equal(resolver.resolveAutoWidthForDoors('hinged', 'not-a-number'), 0);
  assert.equal(
    resolver.resolveAutoWidthForDoors('hinged', 1.6),
    2 * defaults.WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm
  );
  const autoWidth = resolver.resolveAutoWidthForDoors('hinged', 2);
  const tolerance = comparison.WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm;
  assert.equal(resolver.isAutoWidthForDoors('hinged', 0, 2), true);
  assert.equal(resolver.isAutoWidthForDoors('hinged', autoWidth + tolerance / 2, 2), true);
  assert.equal(resolver.isAutoWidthForDoors('hinged', autoWidth + tolerance, 2), false);
  assert.equal(resolver.getDefaultChestDrawersCount(), defaults.WARDROBE_DEFAULTS.chestDrawersCount);
});

test('wardrobe sanitizer behavior is guarded by outcomes and side effects instead of AST fingerprints', () => {
  const { sanitize, syncCalls } = createSanitizerHarness();
  const loader = createTsRuntimeModuleLoader();
  const policy = loader.load(
    path.join(root, 'esm/shared/dimensions/wardrobe_sanitization_policy.ts')
  ).WARDROBE_SANITIZATION_POLICY;

  assert.deepEqual(
    JSON.parse(JSON.stringify(sanitize({ App: null, ui: {}, cfg: { wardrobeType: 'hinged' } }))),
    {
      skipBuild: false,
      widthCm: policy.defaults.widthCm,
      heightCm: policy.defaults.heightCm,
      depthCm: policy.resolveDepthCm('hinged'),
      doorsCount: policy.resolveDoorsCount('hinged'),
      chestDrawersCount: policy.defaults.chestDrawersCount,
    }
  );

  const skipped = sanitize({
    App: null,
    ui: { raw: { width: policy.limits.width.maxCm + 1 }, __activeId: 'width' },
    cfg: { wardrobeType: 'hinged' },
  });
  assert.equal(skipped.skipBuild, true);

  const forced = sanitize({
    App: null,
    ui: {
      forceBuild: true,
      raw: {
        width: policy.limits.width.maxCm + 20,
        height: policy.limits.height.minCm - 20,
        depth: policy.limits.depth.maxCm + 20,
        doors: policy.limits.doors.max + 10,
        chestDrawersCount: policy.limits.chestDrawers.max + 10,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(forced)), {
    skipBuild: false,
    widthCm: policy.limits.width.maxCm,
    heightCm: policy.limits.height.minCm,
    depthCm: policy.limits.depth.maxCm,
    doorsCount: policy.limits.doors.max,
    chestDrawersCount: policy.limits.chestDrawers.max,
  });

  const App = { services: { builder: { buildUi: {} } } };
  const synced = sanitize({
    App,
    ui: { raw: { width: 180, height: 230, depth: 57, doors: 4 } },
    cfg: { wardrobeType: 'hinged' },
  });
  assert.equal(synced.skipBuild, false);
  assert.deepEqual(JSON.parse(JSON.stringify(App.services.builder.buildUi.raw)), {
    width: 180,
    height: 230,
    depth: 57,
    doors: 4,
  });
  assert.equal(syncCalls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(syncCalls[0][1])), {
    wardrobeWidthM: 1.8,
    wardrobeHeightM: 2.3,
    wardrobeDepthM: 0.57,
    wardrobeDoorsCount: 4,
  });
});
