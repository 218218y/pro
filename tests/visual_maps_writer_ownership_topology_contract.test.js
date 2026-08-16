import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';
import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';

const PROJECT_ROOT = process.cwd();
const SOURCE_ROOTS = ['esm/native', 'esm/shared'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs']);

const VISUAL_KEYED_MAPS = new Set([
  'doorStyleMap',
  'mirrorLayoutMap',
  'doorTrimMap',
  'groovesMap',
  'grooveLinesCountMap',
  'removedDoorsMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
]);
const SIMPLE_WRITABLE_MAPS = new Set([
  'handlesMap',
  'hingeMap',
  'curtainMap',
  'doorSpecialMap',
  'individualColors',
  'drawerDividersMap',
  'roundedFrameSideShelvesMap',
]);
const KNOWN_MAPS = new Set([...VISUAL_KEYED_MAPS, ...SIMPLE_WRITABLE_MAPS]);

const VISUAL_OWNER = 'esm/native/runtime/visual_keyed_map_writer_owner.ts';
const SIMPLE_OWNER = 'esm/native/runtime/simple_writable_map_writer_owner.ts';
const MAP_OWNER_COMMIT = 'esm/native/runtime/cfg_access_map_owner.ts';
const MAPS_WRITERS = 'esm/native/runtime/maps_access_writers.ts';
const MAPS_API_NAMED = 'esm/native/kernel/maps_api_named_maps.ts';

const VISUAL_OWNER_HELPERS = new Set([
  'setCfgVisualKeyedMapFromOwner',
  'patchVisualKeyedMapEntriesFromOwner',
  'toggleVisualKeyedMapEntryFromOwner',
]);
const SIMPLE_OWNER_HELPERS = new Set([
  'patchSimpleWritableMapEntryFromOwner',
  'replaceSimpleWritableMapFromOwner',
  'toggleSimpleWritableBooleanMapEntryFromOwner',
]);
const VISUAL_HELPER_IMPORT_ALLOWLIST = new Set([
  'esm/native/runtime/cfg_access_maps.ts',
  MAPS_WRITERS,
  MAPS_API_NAMED,
]);
const SIMPLE_HELPER_IMPORT_ALLOWLIST = new Set([MAPS_WRITERS, MAPS_API_NAMED]);
const GENERIC_PUBLIC_CONFIG_MAP_ACTION_ALLOWLIST = new Set([
  'esm/native/runtime/cfg_access_maps.ts',
  SIMPLE_OWNER,
  VISUAL_OWNER,
]);
const GENERIC_CONFIG_MAP_HELPER_ALLOWLIST = new Set();
const DIRECT_VISUAL_WRITE_ALLOWLIST = new Set([VISUAL_OWNER]);

const SEMANTIC_SERVICE_WRITERS = [
  {
    file: 'esm/native/services/canvas_picking_door_trim_click.ts',
    writers: ['writeDoorTrimListForPart'],
  },
  {
    file: 'esm/native/services/canvas_picking_door_hinge_groove_click.ts',
    writers: ['patchDoorGrooveMapEntries', 'patchDoorGrooveLinesCountEntries'],
  },
  {
    file: 'esm/native/services/canvas_picking_paint_flow_apply_door_style.ts',
    writers: ['replaceDoorSpecialMap', 'replaceCurtainMap'],
  },
];

const READER_NAMES_BY_MAP = new Map([
  ['doorStyleMap', new Set(['readDoorStyleMap'])],
  ['mirrorLayoutMap', new Set(['readMirrorLayoutConfigMap', 'readMirrorLayoutMap'])],
  ['doorTrimMap', new Set(['readDoorTrimConfigMap', 'readDoorTrimMap'])],
  ['groovesMap', new Set(['readDoorGrooveMap', 'readDoorGroovesMap'])],
  ['grooveLinesCountMap', new Set(['readGrooveLinesCountMap'])],
  ['removedDoorsMap', new Set(['readRemovedDoorsMap'])],
  ['splitDoorsMap', new Set(['readSplitDoorsMap'])],
  ['splitDoorsBottomMap', new Set(['readSplitDoorsBottomMap'])],
]);

function walkSourceFiles(dir, out = []) {
  const absDir = path.join(PROJECT_ROOT, dir);
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'coverage'].includes(entry.name)) walkSourceFiles(rel, out);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(rel);
    }
  }
  return out;
}

const SOURCE_FILES = SOURCE_ROOTS.flatMap(root => walkSourceFiles(root));
const sourceCache = new Map();
const astCache = new Map();

function readSource(file) {
  if (!sourceCache.has(file)) sourceCache.set(file, fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf8'));
  return sourceCache.get(file);
}

function parseSource(file, source = readSource(file)) {
  const cacheKey = source === sourceCache.get(file) ? file : null;
  if (cacheKey && astCache.has(cacheKey)) return astCache.get(cacheKey);
  const ast = createSourceFile(file, source, { label: 'visual map ownership contract' });
  assert.deepEqual(ast.parseDiagnostics || [], [], `${file} must parse cleanly`);
  if (cacheKey) astCache.set(cacheKey, ast);
  return ast;
}

function nodeLine(ast, node) {
  return ast.getLineAndCharacterOfPosition(node?.start || 0).line + 1;
}

function stringValue(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions?.length === 0) {
    return String(node.quasis?.[0]?.value?.cooked ?? node.quasis?.[0]?.value?.raw ?? '');
  }
  return null;
}

function unwrap(node) {
  let cur = node;
  while (
    cur &&
    ['ChainExpression', 'TSAsExpression', 'TSNonNullExpression', 'ParenthesizedExpression'].includes(cur.type)
  ) {
    cur = cur.expression;
  }
  return cur;
}

function propertyName(node) {
  const cur = unwrap(node);
  if (!cur) return null;
  if (cur.type === 'Identifier') return cur.name;
  return stringValue(cur);
}

function memberSegments(node) {
  const cur = unwrap(node);
  if (!cur) return [];
  if (cur.type === 'Identifier') return [cur.name];
  if (cur.type !== 'MemberExpression') return [];
  const left = memberSegments(cur.object);
  const right = cur.computed ? propertyName(cur.property) : propertyName(cur.property);
  return right == null ? left : [...left, right];
}

function callName(node) {
  const callee = unwrap(node?.callee ?? node);
  const segments = memberSegments(callee);
  if (segments.length) return segments.at(-1);
  return callee?.type === 'Identifier' ? callee.name : null;
}

function collectAliases(ast) {
  const mapAliases = new Map([...KNOWN_MAPS].map(name => [name, new Set()]));
  const mapNameAliases = new Map([...KNOWN_MAPS].map(name => [name, new Set()]));
  const readerToMap = new Map();
  for (const [mapName, readers] of READER_NAMES_BY_MAP) {
    for (const reader of readers) readerToMap.set(reader, mapName);
  }

  walkAst(ast, node => {
    if (node.type !== 'VariableDeclarator' || node.id?.type !== 'Identifier' || !node.init) return;
    const name = node.id.name;
    const literal = stringValue(unwrap(node.init));
    if (literal && KNOWN_MAPS.has(literal)) mapNameAliases.get(literal).add(name);

    const referencedMaps = new Set();
    walkAst(node.init, cur => {
      if (cur.type === 'MemberExpression') {
        for (const segment of memberSegments(cur)) {
          if (VISUAL_KEYED_MAPS.has(segment)) referencedMaps.add(segment);
        }
      }
      if (cur.type === 'CallExpression') {
        const mapName = readerToMap.get(callName(cur));
        if (mapName) referencedMaps.add(mapName);
      }
    });
    for (const mapName of referencedMaps) mapAliases.get(mapName).add(name);
  });
  return { mapAliases, mapNameAliases };
}

function objectContainsKnownMapKey(node) {
  const cur = unwrap(node);
  if (!cur || cur.type !== 'ObjectExpression') return false;
  for (const prop of cur.properties || []) {
    if (prop.type === 'SpreadElement') continue;
    const key = prop.computed ? propertyName(prop.key) : propertyName(prop.key);
    if (key && KNOWN_MAPS.has(key)) return true;
    if (objectContainsKnownMapKey(prop.value)) return true;
  }
  return false;
}

function expressionTouchesVisualMap(node, aliases) {
  const cur = unwrap(node);
  if (!cur) return null;
  const segments = memberSegments(cur);
  for (const mapName of VISUAL_KEYED_MAPS) {
    if (segments.includes(mapName)) return mapName;
    if (segments.some(segment => aliases.mapAliases.get(mapName)?.has(segment))) return mapName;
  }
  return null;
}

function mapNameFromArg(node, aliases) {
  const literal = stringValue(unwrap(node));
  if (literal && KNOWN_MAPS.has(literal)) return literal;
  if (unwrap(node)?.type === 'Identifier') {
    const identifier = unwrap(node).name;
    for (const mapName of KNOWN_MAPS) {
      if (aliases.mapNameAliases.get(mapName)?.has(identifier)) return mapName;
    }
  }
  return null;
}

function formatViolation(file, ast, node, kind, detail = '') {
  const suffix = detail ? `: ${detail}` : '';
  return `${file}:${nodeLine(ast, node)} ${kind}${suffix}`;
}

export function scanVisualMapOwnershipSource(file, source) {
  const ast = parseSource(file, source);
  const aliases = collectAliases(ast);
  const violations = [];

  walkAst(ast, node => {
    if (node.type === 'AssignmentExpression') {
      const left = unwrap(node.left);
      const mapName =
        left?.type === 'MemberExpression' ? expressionTouchesVisualMap(left.object, aliases) : null;
      if (mapName && !DIRECT_VISUAL_WRITE_ALLOWLIST.has(file)) {
        violations.push(formatViolation(file, ast, node, 'direct visual-map entry assignment', mapName));
      }
      const leftSegments = memberSegments(node.left);
      if (leftSegments.at(-1) === 'setKey' || leftSegments.at(-1) === 'toggleKey') {
        violations.push(
          formatViolation(file, ast, node, 'retired public map writer surface', leftSegments.at(-1))
        );
      }
    }

    if (node.type === 'UnaryExpression' && node.operator === 'delete') {
      const argument = unwrap(node.argument);
      const mapName =
        argument?.type === 'MemberExpression' ? expressionTouchesVisualMap(argument.object, aliases) : null;
      if (mapName && !DIRECT_VISUAL_WRITE_ALLOWLIST.has(file)) {
        violations.push(formatViolation(file, ast, node, 'direct visual-map entry delete', mapName));
      }
    }

    if (node.type === 'SpreadElement') {
      const mapName = expressionTouchesVisualMap(node.argument, aliases);
      if (mapName && !DIRECT_VISUAL_WRITE_ALLOWLIST.has(file)) {
        violations.push(formatViolation(file, ast, node, 'direct visual-map spread', mapName));
      }
    }

    if (node.type === 'Property') {
      const key = propertyName(node.key);
      if (key === 'setKey' || key === 'toggleKey') {
        violations.push(formatViolation(file, ast, node, 'retired public map writer property', key));
      }
    }

    if (node.type !== 'CallExpression') return;
    const name = callName(node);
    const calleeSegments = memberSegments(node.callee);

    if (name === 'cfgSetMap' || name === 'patchConfigMap') {
      if (!GENERIC_CONFIG_MAP_HELPER_ALLOWLIST.has(file)) {
        violations.push(formatViolation(file, ast, node, 'retired generic config-map call', name));
      }
      const mapName = mapNameFromArg(node.arguments?.[1], aliases);
      if (mapName && !DIRECT_VISUAL_WRITE_ALLOWLIST.has(file)) {
        violations.push(formatViolation(file, ast, node, 'generic known-map write', `${name}(${mapName})`));
      }
    }

    if (name === 'writeMapKey') {
      violations.push(formatViolation(file, ast, node, 'retired writeMapKey call'));
    }

    if (name === 'setKey' || name === 'toggleKey') {
      violations.push(formatViolation(file, ast, node, 'retired generic public map call', name));
    }

    const isConfigMapAction =
      (name === 'setMap' || name === 'patchMap') &&
      calleeSegments.some(segment => ['config', 'configNs', 'cfgNs'].includes(segment));
    if (isConfigMapAction && !GENERIC_PUBLIC_CONFIG_MAP_ACTION_ALLOWLIST.has(file)) {
      violations.push(
        formatViolation(file, ast, node, 'retired generic config action', calleeSegments.join('.'))
      );
    }

    if (
      ['patchViaActions', 'patch'].includes(name) &&
      (node.arguments || []).some(objectContainsKnownMapKey)
    ) {
      const looksConfigScoped =
        name === 'patchViaActions' ||
        calleeSegments.some(segment => ['actions', 'config', 'configNs', 'cfgNs'].includes(segment));
      if (looksConfigScoped) {
        violations.push(formatViolation(file, ast, node, 'known map inside generic config patch'));
      }
    }

    if (file.startsWith('esm/native/kernel/domain_api_surface_sections')) {
      const genericDomainHelpers = new Set([
        'commitCanonicalMapValue',
        'commitCanonicalPrefixedMapValue',
        'writeCanonicalMapValueDirect',
        'patchCanonicalPrefixedMapViaCfg',
        'writeSimpleMapValue',
      ]);
      if (genericDomainHelpers.has(name)) {
        const mapName = (node.arguments || []).map(arg => mapNameFromArg(arg, aliases)).find(Boolean);
        if (mapName && VISUAL_KEYED_MAPS.has(mapName)) {
          violations.push(
            formatViolation(
              file,
              ast,
              node,
              'visual map passed to generic domain helper',
              `${name}(${mapName})`
            )
          );
        }
      }
    }
  });

  walkAst(ast, node => {
    if (node.type !== 'ImportDeclaration') return;
    for (const specifier of node.specifiers || []) {
      if (specifier.type !== 'ImportSpecifier') continue;
      const symbol = propertyName(specifier.imported);
      if (!symbol) continue;
      if (
        VISUAL_OWNER_HELPERS.has(symbol) &&
        file !== VISUAL_OWNER &&
        !VISUAL_HELPER_IMPORT_ALLOWLIST.has(file)
      ) {
        violations.push(`${file} imports owner-only visual helper ${symbol}`);
      }
      if (
        SIMPLE_OWNER_HELPERS.has(symbol) &&
        file !== SIMPLE_OWNER &&
        !SIMPLE_HELPER_IMPORT_ALLOWLIST.has(file)
      ) {
        violations.push(`${file} imports owner-only simple helper ${symbol}`);
      }
      if (
        (symbol === 'cfgSetMap' || symbol === 'patchConfigMap') &&
        !GENERIC_CONFIG_MAP_HELPER_ALLOWLIST.has(file)
      ) {
        violations.push(`${file} imports retired generic config-map helper ${symbol}`);
      }
    }
  });
  return violations;
}

function projectViolations() {
  return SOURCE_FILES.flatMap(file => scanVisualMapOwnershipSource(file, readSource(file)));
}

function importSymbols(file, specifier) {
  const dep = analyzeModuleDependencies(file, readSource(file)).imports.find(
    entry => entry.specifier === specifier
  );
  return new Set(dep?.importedSymbols || []);
}

function exportedSymbols(file) {
  return new Set(collectNamedModuleExports(file, readSource(file)).map(entry => entry.exportedName));
}

function hasNamedExport(file, symbol) {
  let found = false;
  walkAst(parseSource(file), node => {
    if (found || node.type !== 'ExportNamedDeclaration') return;
    const declaration = node.declaration;
    if (declaration?.type === 'FunctionDeclaration' && declaration.id?.name === symbol) {
      found = true;
      return;
    }
    if (declaration?.type === 'VariableDeclaration') {
      found = (declaration.declarations || []).some(
        entry => entry.id?.type === 'Identifier' && entry.id.name === symbol
      );
      if (found) return;
    }
    found = (node.specifiers || []).some(specifier => propertyName(specifier.exported) === symbol);
  });
  return found;
}

function assertIncludes(actualSet, expected, label) {
  for (const value of expected) assert.ok(actualSet.has(value), `${label} must include ${value}`);
}

function collectCalledNames(file) {
  const names = new Set();
  walkAst(parseSource(file), node => {
    if (node.type === 'CallExpression') {
      const name = callName(node);
      if (name) names.add(name);
    }
  });
  return names;
}

function collectIdentifierNames(file) {
  const names = new Set();
  walkAst(parseSource(file), node => {
    if (node.type === 'Identifier' && node.name) names.add(node.name);
  });
  return names;
}

function collectMemberPropertyNames(file) {
  const names = new Set();
  walkAst(parseSource(file), node => {
    if (node.type === 'MemberExpression') {
      const name = propertyName(node.property);
      if (name) names.add(name);
    }
  });
  return names;
}

function readConstStringArray(file, constName) {
  let result = null;
  walkAst(parseSource(file), node => {
    if (result || node.type !== 'VariableDeclarator' || node.id?.name !== constName) return;
    const init = unwrap(node.init);
    if (init?.type !== 'ArrayExpression') return;
    result = init.elements.map(stringValue).filter(value => value != null);
  });
  return result;
}

test('AST scanner rejects direct and generic visual-map write bypasses', () => {
  const samples = [
    `const map = state.config.doorStyleMap; map[id] = value;`,
    `cfgSetMap(App, 'doorStyleMap', next);`,
    `actions.config.patch({ doorStyleMap: next });`,
    `configNs.setMap('handlesMap', next);`,
    `maps.setKey = () => {};`,
    `import { patchVisualKeyedMapEntriesFromOwner } from './visual_keyed_map_writer_owner.js';`,
  ];
  for (const [index, sample] of samples.entries()) {
    const violations = scanVisualMapOwnershipSource(
      `esm/native/services/__contract_probe_${index}.ts`,
      sample
    );
    assert.ok(violations.length > 0, `probe ${index + 1} must be rejected`);
  }
});

test('visual and simple map writers stay behind canonical AST-enforced owners', () => {
  const violations = projectViolations();
  assert.deepEqual(violations, [], `map ownership violations:\n${violations.join('\n')}`);
});

test('map owner modules expose the canonical writer surface and composition path', () => {
  assertIncludes(exportedSymbols(VISUAL_OWNER), [...VISUAL_OWNER_HELPERS], VISUAL_OWNER);
  assertIncludes(
    exportedSymbols(SIMPLE_OWNER),
    ['SIMPLE_WRITABLE_MAP_NAMES', 'isSimpleWritableMapName', ...SIMPLE_OWNER_HELPERS],
    SIMPLE_OWNER
  );
  assertIncludes(
    exportedSymbols(MAP_OWNER_COMMIT),
    ['commitConfigMapOwnerPatch', 'commitConfigMapOwnerPatchWithReplaceKeys'],
    MAP_OWNER_COMMIT
  );
  assert.deepEqual(
    new Set(readConstStringArray(SIMPLE_OWNER, 'SIMPLE_WRITABLE_MAP_NAMES')),
    SIMPLE_WRITABLE_MAPS
  );

  assertIncludes(
    importSymbols(VISUAL_OWNER, './cfg_access_map_owner.js'),
    ['commitConfigMapOwnerPatchWithReplaceKeys'],
    VISUAL_OWNER
  );
  assertIncludes(
    importSymbols(SIMPLE_OWNER, './cfg_access_map_owner.js'),
    ['commitConfigMapOwnerPatchWithReplaceKeys'],
    SIMPLE_OWNER
  );
  assertIncludes(
    importSymbols(MAPS_WRITERS, './visual_keyed_map_writer_owner.js'),
    [...VISUAL_OWNER_HELPERS],
    MAPS_WRITERS
  );
  assertIncludes(
    importSymbols(MAPS_WRITERS, './simple_writable_map_writer_owner.js'),
    [...SIMPLE_OWNER_HELPERS, 'SIMPLE_WRITABLE_MAP_NAMES'],
    MAPS_WRITERS
  );
  assertIncludes(
    importSymbols(MAPS_API_NAMED, '../runtime/visual_keyed_map_writer_owner.js'),
    ['patchVisualKeyedMapEntriesFromOwner', 'toggleVisualKeyedMapEntryFromOwner'],
    MAPS_API_NAMED
  );
  assertIncludes(
    importSymbols(MAPS_API_NAMED, '../runtime/simple_writable_map_writer_owner.js'),
    ['patchSimpleWritableMapEntryFromOwner', 'toggleSimpleWritableBooleanMapEntryFromOwner'],
    MAPS_API_NAMED
  );
});

test('domain and canvas callers use semantic map writers instead of low-level owners', () => {
  const semanticContracts = [
    {
      file: 'esm/native/kernel/domain_api_surface_sections_bindings_doors.ts',
      calls: ['writeRemoved', 'writeSplit', 'writeSplitBottom', 'writeHandle', 'writeHinge'],
    },
    {
      file: 'esm/native/kernel/domain_api_surface_sections_bindings_grooves_curtains.ts',
      calls: ['patchDoorGrooveMapEntries', 'toggleGrooveKey', 'writeCurtainPreset'],
    },
    {
      file: 'esm/native/kernel/domain_api_surface_sections_bindings_drawers_dividers.ts',
      calls: ['writeDividerState'],
    },
    { file: 'esm/native/kernel/domain_api_colors_section.ts', calls: ['writeIndividualColor'] },
    ...SEMANTIC_SERVICE_WRITERS.map(entry => ({ file: entry.file, calls: entry.writers })),
  ];

  for (const contract of semanticContracts) {
    const calls = collectCalledNames(contract.file);
    assertIncludes(calls, contract.calls, contract.file);
  }

  for (const { file, writers } of SEMANTIC_SERVICE_WRITERS) {
    const deps = analyzeModuleDependencies(file, readSource(file));
    assert.ok(
      deps.imports.some(dep => dep.specifier === '../runtime/maps_access.js'),
      `${file} must depend on the semantic runtime map facade`
    );
    const imported = importSymbols(file, '../runtime/maps_access.js');
    assertIncludes(imported, writers, file);
    assert.ok(
      deps.imports.every(dep => !dep.specifier.endsWith('visual_keyed_map_writer_owner.js')),
      `${file} must not bypass the runtime facade`
    );
  }
});

test('legacy generic map surfaces stay absent from broad facades and kernel namespaces', () => {
  const forbiddenByFile = new Map([
    [
      'esm/native/runtime/cfg_access.ts',
      new Set([
        'setCfgVisualKeyedMapFromOwner',
        'cfgSetMap',
        'patchConfigMap',
        'applyConfigPatch',
        'applyConfigPatchReplaceKeys',
        'applyConfigSnapshot',
        'cfgPatchWithReplaceKeys',
      ]),
    ],
    [
      'esm/native/runtime/maps_access.ts',
      new Set(['patchVisualKeyedMapEntriesFromOwner', 'patchCanonicalVisualMapEntries', 'writeMapKey']),
    ],
    [
      'esm/native/core/api.ts',
      new Set([
        'writeMapKey',
        'cfgSetMap',
        'patchConfigMap',
        'applyConfigPatch',
        'applyConfigPatchReplaceKeys',
        'applyConfigSnapshot',
        'cfgPatchWithReplaceKeys',
      ]),
    ],
    [
      'esm/native/services/api_state_surface.ts',
      new Set([
        'writeMapKey',
        'cfgSetMap',
        'patchConfigMap',
        'applyConfigPatch',
        'applyConfigPatchReplaceKeys',
        'applyConfigSnapshot',
        'cfgPatchWithReplaceKeys',
      ]),
    ],
  ]);

  for (const [file, forbidden] of forbiddenByFile) {
    const identifiers = collectIdentifierNames(file);
    for (const symbol of forbidden) {
      assert.equal(identifiers.has(symbol), false, `${file} must not reference ${symbol}`);
    }
  }

  const mapsAccessExports = exportedSymbols('esm/native/runtime/maps_access.ts');
  assertIncludes(
    mapsAccessExports,
    ['SIMPLE_WRITABLE_MAP_NAMES', 'isSimpleWritableMapName'],
    'maps_access facade'
  );

  const mapsWriterExports = exportedSymbols(MAPS_WRITERS);
  assertIncludes(
    mapsWriterExports,
    [
      'replaceDoorGrooveLinesCountMap',
      'replaceRoundedFrameSideShelvesMap',
      'replaceDoorSpecialMap',
      'replaceCurtainMap',
      'writeIndividualColor',
    ],
    MAPS_WRITERS
  );
  const mapsWriterIdentifiers = collectIdentifierNames(MAPS_WRITERS);
  for (const retired of ['ensureMapRecord', 'writeOwn', 'trySetKey']) {
    assert.equal(mapsWriterIdentifiers.has(retired), false, `${MAPS_WRITERS} must not restore ${retired}`);
  }
  const mapsWriterMembers = collectMemberPropertyNames(MAPS_WRITERS);
  for (const retired of ['setHandle', 'setHinge', 'setSplit', 'setSplitBottom']) {
    assert.equal(mapsWriterMembers.has(retired), false, `${MAPS_WRITERS} must not call maps.${retired}`);
  }

  const scalarIdentifiers = collectIdentifierNames('esm/native/runtime/cfg_access_scalars.ts');
  for (const ownerOnly of [
    'commitConfigMapOwnerPatch',
    'applyConfigPatchFromMapOwner',
    'applyConfigPatchReplaceKeysFromMapOwner',
  ]) {
    assert.equal(
      scalarIdentifiers.has(ownerOnly),
      false,
      `cfg_access_scalars must not reference ${ownerOnly}`
    );
  }

  const mapNamespaceCalls = collectCalledNames('esm/native/kernel/maps_api_named_maps.ts');
  assert.equal(mapNamespaceCalls.has('patchConfigMap'), false);
  assert.equal(mapNamespaceCalls.has('createMapPatch'), false);

  const configNamespaceSource = readSource('esm/native/kernel/state_api_config_namespace_maps.ts');
  const configNamespaceAst = parseSource('esm/native/kernel/state_api_config_namespace_maps.ts');
  const deletions = new Set();
  walkAst(configNamespaceAst, node => {
    if (node.type === 'UnaryExpression' && node.operator === 'delete') {
      const segments = memberSegments(node.argument);
      if (segments[0] === 'configNs') deletions.add(segments.at(-1));
    }
  });
  assert.deepEqual(deletions, new Set(['setMap', 'patchMap']));
  assert.ok(configNamespaceSource.length > 0);

  const rootBindingsAst = parseSource('esm/native/kernel/domain_api_surface_sections_bindings_root_map.ts');
  const rootDeletes = new Set();
  walkAst(rootBindingsAst, node => {
    if (node.type !== 'UnaryExpression' || node.operator !== 'delete') return;
    const segments = memberSegments(node.argument);
    if (segments[0] === 'state' && segments[1] === 'mapActions') rootDeletes.add(segments.at(-1));
  });
  assert.deepEqual(rootDeletes, new Set(['setKey', 'toggleKey']));

  const kernelTypeProperties = new Set();
  walkAst(parseSource('types/kernel.ts'), node => {
    if (node.type === 'TSPropertySignature') {
      const name = propertyName(node.key);
      if (name) kernelTypeProperties.add(name);
    }
  });
  assert.equal(kernelTypeProperties.has('setMap'), false, 'kernel config namespace must not expose setMap');
  assert.equal(
    kernelTypeProperties.has('patchMap'),
    false,
    'kernel config namespace must not expose patchMap'
  );
});

test('visual keyed patch implementation remains unique to the canonical owner', () => {
  const exporters = SOURCE_FILES.filter(file => hasNamedExport(file, 'patchVisualKeyedMapEntriesFromOwner'));
  assert.deepEqual(exporters, [VISUAL_OWNER]);

  for (const file of SOURCE_FILES) {
    if (file === VISUAL_OWNER) continue;
    const names = new Set();
    walkAst(parseSource(file), node => {
      if (node.type === 'FunctionDeclaration' && node.id?.name) names.add(node.id.name);
      if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier') names.add(node.id.name);
    });
    for (const retired of [
      'patchCanonicalOwnerMapEntries',
      'patchVisualKeyedMapEntry',
      'patchCanonicalPrefixedMapEntry',
      'normalizedEntryMap',
    ]) {
      assert.equal(names.has(retired), false, `${file} must not duplicate owner patch logic via ${retired}`);
    }
  }
});
