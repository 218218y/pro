import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  inspectIdentityCompositionContract,
  inspectIdentityCompositionContracts,
  runtimeModuleSpecifier,
  validateIdentityCompositionContractDefinition,
} from '../tools/wp_declarative_contract_engine.mjs';
import {
  DIMENSION_COMPOSITION_CONTRACT_LANES,
  DIMENSION_COMPOSITION_CONTRACTS,
} from '../tools/wp_dimension_composition_contract_manifest.mjs';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function withOverrides(overrides) {
  return rel => (Object.hasOwn(overrides, rel) ? overrides[rel] : read(rel));
}

function kinds(violations) {
  return new Set(violations.map(violation => violation.kind));
}

test('declarative identity-composition engine accepts the canonical manifest', () => {
  assert.equal(
    inspectIdentityCompositionContracts(DIMENSION_COMPOSITION_CONTRACTS, { projectRoot: root }).length,
    0
  );
});

test('declarative identity-composition engine ignores export statement ordering', () => {
  const contract = DIMENSION_COMPOSITION_CONTRACT_LANES.secondary.find(
    entry => entry.id === 'core-carcass-dimension-consolidation'
  );
  assert.ok(contract);
  const ownerSource = read(contract.owner);
  const reordered = ownerSource.trim().split('\n').reverse().join('\n') + '\n';
  const violations = inspectIdentityCompositionContract(contract, {
    projectRoot: root,
    readSource: withOverrides({ [contract.owner]: reordered }),
  });
  assert.deepEqual(violations, []);
});

test('declarative identity-composition engine catches owner logic, provenance drift, bypasses, and aliases', () => {
  const contract = DIMENSION_COMPOSITION_CONTRACT_LANES.secondary.find(
    entry => entry.id === 'core-carcass-dimension-consolidation'
  );
  assert.ok(contract);
  const ownerSource = read(contract.owner);
  const consumerSource = read(contract.consumer);
  const ownerSpecifier = runtimeModuleSpecifier(contract.consumer, contract.owner);
  const directSpecifier = runtimeModuleSpecifier(contract.consumer, contract.sources[0].file);

  const logicKinds = kinds(
    inspectIdentityCompositionContract(contract, {
      projectRoot: root,
      readSource: withOverrides({ [contract.owner]: `${ownerSource}\nexport const COPIED_VALUE = 1;\n` }),
    })
  );
  assert.equal(logicKinds.has('non-identity-top-level-statement'), true);
  assert.equal(logicKinds.has('export-provenance'), true);

  const provenanceKinds = kinds(
    inspectIdentityCompositionContract(contract, {
      projectRoot: root,
      readSource: withOverrides({
        [contract.owner]: ownerSource.replace('./base_leg_policy.js', './base_plinth_policy.js'),
      }),
    })
  );
  assert.equal(provenanceKinds.has('export-provenance'), true);

  const bypassKinds = kinds(
    inspectIdentityCompositionContract(contract, {
      projectRoot: root,
      readSource: withOverrides({
        [contract.consumer]: consumerSource.replace(ownerSpecifier, directSpecifier),
      }),
    })
  );
  assert.equal(bypassKinds.has('bypasses-composition-owner'), true);
  assert.equal(bypassKinds.has('missing-composition-owner-import'), true);

  const aliasKinds = kinds(
    inspectIdentityCompositionContract(contract, {
      projectRoot: root,
      readSource: withOverrides({
        [contract.consumer]: consumerSource.replace(
          'BASE_LEG_LAYOUT_POLICY,',
          'BASE_LEG_LAYOUT_POLICY as BASE_LEG_LAYOUT_POLICY_ALIAS,'
        ),
      }),
    })
  );
  assert.equal(aliasKinds.has('aliased-owner-binding'), true);
});

test('declarative identity-composition manifest rejects duplicate or incomplete provenance', () => {
  const canonical = DIMENSION_COMPOSITION_CONTRACT_LANES.secondary[0];
  const duplicate = {
    ...canonical,
    sources: [
      ...canonical.sources,
      { file: canonical.sources[0].file, symbols: [canonical.sources[0].symbols[0]] },
    ],
  };
  const incomplete = {
    ...canonical,
    sources: canonical.sources.map((source, index) =>
      index === 0 ? { ...source, symbols: source.symbols.slice(1) } : source
    ),
  };

  assert.equal(
    kinds(validateIdentityCompositionContractDefinition(duplicate)).has('duplicate-source-files'),
    true
  );
  assert.equal(
    kinds(validateIdentityCompositionContractDefinition(duplicate)).has('duplicate-source-provenance'),
    true
  );
  assert.equal(
    kinds(validateIdentityCompositionContractDefinition(incomplete)).has('source-symbol-union'),
    true
  );
});
