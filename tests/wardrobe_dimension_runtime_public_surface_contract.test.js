import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTsRuntimeModuleLoader } from './_ts_runtime_module_loader.mjs';
import { buildWardrobeDimensionPublicSurfaceSemanticSnapshot } from '../tools/wp_wardrobe_dimension_public_surface_semantic.mjs';
import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestRel = 'tools/wp_wardrobe_dimension_public_surface_manifest.json';
const snapshotRel = 'tools/wp_wardrobe_dimension_public_surface_semantic_snapshot.json';
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestRel), 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(path.join(root, snapshotRel), 'utf8'));
const supportedInventoryFingerprint = '9b9995d3844abf68253245fe094f830bd559c000ca26f07482af47243a22556c';

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function sourceTarget(fromRel, specifier) {
  return path.posix
    .normalize(path.posix.join(path.posix.dirname(fromRel), specifier.split(/[?#]/u, 1)[0]))
    .replace(/\.js$/u, '.ts');
}

function inventoryKeys(entries) {
  return entries.map(entry => `${entry.kind}:${entry.name}`).sort();
}

function inventoryFingerprint(entries) {
  return createHash('sha256').update(inventoryKeys(entries).join('\n')).digest('hex');
}

function actualRuntimeDimensionRoutes() {
  return analyzeModuleDependencies(
    manifest.surfaceTopology.runtime.file,
    read(manifest.surfaceTopology.runtime.file)
  ).imports.flatMap(dependency => {
    const target = sourceTarget(manifest.surfaceTopology.runtime.file, dependency.specifier);
    if (!target.startsWith('esm/shared/dimensions/')) return [];
    if (!['static-re-export', 'type-re-export'].includes(dependency.syntax)) return [];
    return dependency.bindings.map(binding => ({
      kind: dependency.kind,
      name: binding.exportedName,
    }));
  });
}

function exportedRoute(rel, name, kind) {
  for (const dependency of analyzeModuleDependencies(rel, read(rel)).imports) {
    if (dependency.kind !== kind) continue;
    for (const binding of dependency.bindings) {
      if (binding.exportedName === name) {
        return {
          sourceFile: sourceTarget(rel, dependency.specifier),
          sourceSymbol: binding.importedName,
          syntax: dependency.syntax,
        };
      }
    }
  }
  return null;
}

function validateManifest(candidate) {
  assert.equal(candidate.version, 3);
  assert.deepEqual([candidate.symbolCount, candidate.valueCount, candidate.typeCount], [53, 52, 1]);
  assert.equal(candidate.symbols.length, 53);
  assert.equal(new Set(candidate.symbols.map(entry => `${entry.kind}:${entry.name}`)).size, 53);
  assert.equal(inventoryFingerprint(candidate.symbols), supportedInventoryFingerprint);
  assert.deepEqual(Object.keys(candidate.surfaceTopology), ['runtime', 'servicesBase', 'servicesEntry']);
  assert.deepEqual(
    Object.values(candidate.surfaceTopology).map(surface => [surface.values, surface.types]),
    [
      [52, 1],
      [52, 1],
      [52, 1],
    ]
  );
  for (const entry of candidate.symbols) {
    assert.equal(entry.runtimeRoute.file, candidate.surfaceTopology.runtime.file, entry.name);
    assert.equal(entry.runtimeRoute.sourceSymbol, entry.name, entry.name);
    assert.equal(entry.servicesRoutes.baseFile, candidate.surfaceTopology.servicesBase.file, entry.name);
    assert.equal(entry.servicesRoutes.entryFile, candidate.surfaceTopology.servicesEntry.file, entry.name);
    assert.equal(entry.runtimeIdentity, 'strict', entry.name);
    assert.equal(
      entry.runtimeRoute.sourceFile,
      entry.name === 'CHEST_MODE_DIMENSIONS'
        ? 'esm/shared/dimensions/compatibility/chest_mode_dimensions_compatibility.ts'
        : entry.canonicalOwner.file,
      entry.name
    );
    assert.equal(
      entry.declarationParity,
      entry.name === 'CHEST_MODE_DIMENSIONS' ? 'explicit-compatibility-owner' : 'exact-owner',
      entry.name
    );
  }
}

test('the supported dimension manifest contains exactly 53 Runtime and Services routes', () => {
  validateManifest(manifest);
  assert.deepEqual(inventoryKeys(actualRuntimeDimensionRoutes()), inventoryKeys(manifest.symbols));

  for (const entry of manifest.symbols) {
    const runtime = exportedRoute(manifest.surfaceTopology.runtime.file, entry.name, entry.kind);
    assert.deepEqual(
      runtime,
      {
        sourceFile: entry.runtimeRoute.sourceFile,
        sourceSymbol: entry.runtimeRoute.sourceSymbol,
        syntax: entry.kind === 'type' ? 'type-re-export' : 'static-re-export',
      },
      entry.name
    );

    const servicesBase = exportedRoute(manifest.surfaceTopology.servicesBase.file, entry.name, entry.kind);
    assert.deepEqual(
      servicesBase,
      {
        sourceFile: manifest.surfaceTopology.runtime.file,
        sourceSymbol: entry.name,
        syntax: entry.kind === 'type' ? 'type-re-export' : 'static-re-export',
      },
      entry.name
    );
  }

  const entryDependencies = analyzeModuleDependencies(
    manifest.surfaceTopology.servicesEntry.file,
    read(manifest.surfaceTopology.servicesEntry.file)
  ).imports;
  assert.equal(
    entryDependencies.some(
      dependency =>
        dependency.syntax === 'static-re-export' &&
        dependency.importedSymbols.includes('*') &&
        sourceTarget(manifest.surfaceTopology.servicesEntry.file, dependency.specifier) ===
          manifest.surfaceTopology.servicesBase.file
    ),
    true
  );
});

test('declaration fingerprints are identical across the three supported surfaces', () => {
  assert.deepEqual(buildWardrobeDimensionPublicSurfaceSemanticSnapshot(root), snapshot);
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.manifestVersion, manifest.version);
  assert.equal(snapshot.typescriptVersion, '7.0.2');
  assert.equal(snapshot.symbolCount, 53);
  assert.equal(snapshot.symbols.length, 53);

  for (const entry of snapshot.symbols) {
    const fingerprints = [
      entry.surfaces.runtime.declarationTypeFingerprint,
      entry.surfaces.servicesBase.declarationTypeFingerprint,
      entry.surfaces.servicesEntry.declarationTypeFingerprint,
    ];
    assert.equal(new Set(fingerprints).size, 1, entry.name);
    assert.match(fingerprints[0], /^[a-f0-9]{64}$/u, entry.name);
    assert.match(entry.canonicalOwner.declarationTypeFingerprint, /^[a-f0-9]{64}$/u, entry.name);
    if (entry.name === 'CHEST_MODE_DIMENSIONS') {
      assert.notEqual(fingerprints[0], entry.canonicalOwner.declarationTypeFingerprint, entry.name);
      assert.equal(
        entry.runtimeSource.file,
        'esm/shared/dimensions/compatibility/chest_mode_dimensions_compatibility.ts'
      );
    } else {
      assert.equal(fingerprints[0], entry.canonicalOwner.declarationTypeFingerprint, entry.name);
    }
  }
});

test('all 52 values preserve strict identity through Runtime and both Services surfaces', () => {
  const loader = createTsRuntimeModuleLoader();
  const runtime = loader.load(path.join(root, manifest.surfaceTopology.runtime.file));
  const servicesBase = loader.load(path.join(root, manifest.surfaceTopology.servicesBase.file));
  const servicesEntry = loader.load(path.join(root, manifest.surfaceTopology.servicesEntry.file));

  for (const entry of manifest.symbols.filter(candidate => candidate.kind === 'value')) {
    const routeOwner = loader.load(path.join(root, entry.runtimeRoute.sourceFile));
    const canonicalOwner = loader.load(path.join(root, entry.canonicalOwner.file));
    assert.strictEqual(runtime[entry.name], routeOwner[entry.runtimeRoute.sourceSymbol], entry.name);
    assert.strictEqual(servicesBase[entry.name], runtime[entry.name], entry.name);
    assert.strictEqual(servicesEntry[entry.name], runtime[entry.name], entry.name);
    assert.strictEqual(runtime[entry.name], canonicalOwner[entry.canonicalOwner.symbol], entry.name);
  }
});

test('manifest mutations cannot broaden, duplicate, or reroute the supported surface', () => {
  const duplicate = structuredClone(manifest);
  duplicate.symbols.push(structuredClone(duplicate.symbols[0]));
  assert.throws(() => validateManifest(duplicate));

  const facadeRoute = structuredClone(manifest);
  facadeRoute.symbols[0].runtimeRoute.sourceFile = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
  assert.throws(() => validateManifest(facadeRoute));

  const removedSymbol = structuredClone(manifest);
  removedSymbol.symbols.pop();
  assert.throws(() => validateManifest(removedSymbol));

  const substitutedSymbol = structuredClone(manifest);
  substitutedSymbol.symbols[0].name = 'FAKE_UNUSED_ROUTE';
  substitutedSymbol.symbols[0].runtimeRoute.sourceSymbol = 'FAKE_UNUSED_ROUTE';
  assert.throws(() => validateManifest(substitutedSymbol));
});
