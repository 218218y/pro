import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();

const SOURCE_ROOTS = ['esm/native', 'esm/shared'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs']);

const VISUAL_KEYED_MAPS = [
  'doorStyleMap',
  'mirrorLayoutMap',
  'doorTrimMap',
  'groovesMap',
  'grooveLinesCountMap',
  'removedDoorsMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
];

const VISUAL_KEYED_OWNER_MODULE = 'esm/native/runtime/visual_keyed_map_writer_owner.ts';
const SIMPLE_WRITABLE_OWNER_MODULE = 'esm/native/runtime/simple_writable_map_writer_owner.ts';

const DIRECT_WRITE_OWNER_FILES = new Set([VISUAL_KEYED_OWNER_MODULE]);

const GENERIC_CONFIG_MAP_WRITE_ALLOWLIST = new Set(['esm/native/runtime/cfg_access_maps.ts']);

const OWNER_HELPER_IMPORT_ALLOWLIST = new Set([
  'esm/native/runtime/cfg_access_maps.ts',
  'esm/native/runtime/maps_access_writers.ts',
  'esm/native/kernel/maps_api_named_maps.ts',
]);

const OWNER_HELPER_NAMES = [
  'setCfgVisualKeyedMapFromOwner',
  'patchVisualKeyedMapEntriesFromOwner',
  'toggleVisualKeyedMapEntryFromOwner',
];

const SIMPLE_OWNER_HELPER_IMPORT_ALLOWLIST = new Set([
  'esm/native/runtime/maps_access_writers.ts',
  'esm/native/kernel/maps_api_named_maps.ts',
  'esm/native/kernel/domain_api_surface_sections_map_writes.ts',
]);

const SIMPLE_OWNER_HELPER_NAMES = [
  'patchSimpleWritableMapEntryFromOwner',
  'replaceSimpleWritableMapFromOwner',
  'toggleSimpleWritableBooleanMapEntryFromOwner',
];

const SERVICE_SEMANTIC_WRITER_EXPECTATIONS = [
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

const DOMAIN_API_MAP_WRITES_FILE = 'esm/native/kernel/domain_api_surface_sections_map_writes.ts';
const DOMAIN_API_DOOR_BINDINGS_FILE = 'esm/native/kernel/domain_api_surface_sections_bindings_doors.ts';
const DOMAIN_API_GROOVE_BINDINGS_FILE =
  'esm/native/kernel/domain_api_surface_sections_bindings_grooves_curtains.ts';
const DOMAIN_API_DRAWERS_DIVIDERS_BINDINGS_FILE =
  'esm/native/kernel/domain_api_surface_sections_bindings_drawers_dividers.ts';
const MAPS_API_NAMED_MAPS_FILE = 'esm/native/kernel/maps_api_named_maps.ts';
const DOMAIN_GENERIC_MAP_WRITE_HELPERS = [
  'commitCanonicalMapValue',
  'commitCanonicalPrefixedMapValue',
  'writeCanonicalMapValueDirect',
  'patchCanonicalPrefixedMapViaCfg',
  'writeSimpleMapValue',
];

const SIMPLE_WRITABLE_MAPS = [
  'handlesMap',
  'hingeMap',
  'curtainMap',
  'doorSpecialMap',
  'individualColors',
  'drawerDividersMap',
  'roundedFrameSideShelvesMap',
];

const WRITE_MAP_KEY_CALL_ALLOWLIST = new Set();

const MAP_ALIAS_READERS = {
  doorStyleMap: ['readDoorStyleMap'],
  mirrorLayoutMap: ['readMirrorLayoutConfigMap', 'readMirrorLayoutMap'],
  doorTrimMap: ['readDoorTrimConfigMap', 'readDoorTrimMap'],
  groovesMap: ['readDoorGrooveMap', 'readDoorGroovesMap'],
  grooveLinesCountMap: ['readGrooveLinesCountMap'],
  removedDoorsMap: ['readRemovedDoorsMap'],
  splitDoorsMap: ['readSplitDoorsMap'],
  splitDoorsBottomMap: ['readSplitDoorsBottomMap'],
};

const ASSIGNMENT_OPERATOR_PATTERN = String.raw`(?:=(?!=|>)|\+=|-=|\*=|/=|%=|&&=|\|\|=|\?\?=)`;
const GENERIC_MAP_WRITE_APIS = ['cfgSetMap', 'patchConfigMap'];

function readSourceFile(relPath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
}

function walkSourceFiles(dir, out = []) {
  const absDir = path.join(PROJECT_ROOT, dir);
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const relPath = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') continue;
      walkSourceFiles(relPath, out);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(relPath);
    }
  }
  return out;
}

function stripCommentsPreserveLines(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\r\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (match, prefix) => prefix + ' '.repeat(match.length - prefix.length));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function sourceLine(source, lineNumber) {
  return source.split(/\r?\n/)[lineNumber - 1]?.trim() || '';
}

function pushRegexMatches(violations, args) {
  const { file, rawSource, strippedSource, mapName, kind, regex } = args;
  let match;
  while ((match = regex.exec(strippedSource))) {
    const line = lineNumberAt(strippedSource, match.index);
    violations.push({
      file,
      line,
      mapName,
      kind,
      source: sourceLine(rawSource, line),
    });
  }
}

function readAliasNames(source, mapName) {
  const readers = MAP_ALIAS_READERS[mapName] || [];
  const sourcePatterns = [
    String.raw`['"]${escapeRegExp(mapName)}['"]`,
    String.raw`\.\s*${escapeRegExp(mapName)}\b`,
    String.raw`\[\s*['"]${escapeRegExp(mapName)}['"]\s*\]`,
    ...readers.map(reader => String.raw`\b${escapeRegExp(reader)}\s*\(`),
  ];
  const aliasPattern = new RegExp(
    String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;\n]+)?=\s*[^;\n]*(?:${sourcePatterns.join('|')})`,
    'g'
  );
  const aliases = new Set();
  let match;
  while ((match = aliasPattern.exec(source))) aliases.add(match[1]);
  return aliases;
}

function readMapNameAliases(source, mapName) {
  const aliasPattern = new RegExp(
    String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;\n]+)?=\s*['"]${escapeRegExp(mapName)}['"](?:\s+as\s+const)?`,
    'g'
  );
  const aliases = new Set();
  let match;
  while ((match = aliasPattern.exec(source))) aliases.add(match[1]);
  return aliases;
}

function pushGenericApiMatches(violations, args) {
  const { file, rawSource, strippedSource, mapName, mapArgPattern } = args;
  for (const apiName of GENERIC_MAP_WRITE_APIS) {
    pushRegexMatches(violations, {
      file,
      rawSource,
      strippedSource,
      mapName,
      kind: `generic ${apiName}`,
      regex: new RegExp(String.raw`\b${apiName}\s*\([^,\n]+,\s*${mapArgPattern}`, 'g'),
    });
  }
  pushRegexMatches(violations, {
    file,
    rawSource,
    strippedSource,
    mapName,
    kind: 'generic maps.setKey',
    regex: new RegExp(String.raw`\bsetKey\s*\(\s*${mapArgPattern}`, 'g'),
  });
}

function collectVisualMapWriteViolations() {
  const violations = [];
  const files = SOURCE_ROOTS.flatMap(root => walkSourceFiles(root));

  for (const file of files) {
    if (DIRECT_WRITE_OWNER_FILES.has(file)) continue;

    const rawSource = readSourceFile(file);
    const strippedSource = stripCommentsPreserveLines(rawSource);

    for (const mapName of VISUAL_KEYED_MAPS) {
      const escapedMap = escapeRegExp(mapName);
      const directPrefix = String.raw`(?<![A-Za-z0-9_$])(?:[A-Za-z_$][\w$]*\.)*${escapedMap}`;

      pushRegexMatches(violations, {
        file,
        rawSource,
        strippedSource,
        mapName,
        kind: 'direct bracket assignment',
        regex: new RegExp(String.raw`${directPrefix}\s*\[[^\]\n]+\]\s*${ASSIGNMENT_OPERATOR_PATTERN}`, 'g'),
      });
      pushRegexMatches(violations, {
        file,
        rawSource,
        strippedSource,
        mapName,
        kind: 'direct bracket delete',
        regex: new RegExp(String.raw`\bdelete\s+${directPrefix}\s*\[[^\]\n]+\]`, 'g'),
      });
      pushRegexMatches(violations, {
        file,
        rawSource,
        strippedSource,
        mapName,
        kind: 'direct object spread',
        regex: new RegExp(String.raw`\.\.\.\s*(?:[A-Za-z_$][\w$]*\.)*${escapedMap}\b`, 'g'),
      });
      pushRegexMatches(violations, {
        file,
        rawSource,
        strippedSource,
        mapName,
        kind: 'direct cfgSetMap',
        regex: new RegExp(String.raw`\bcfgSetMap\s*\([^,\n]+,\s*['"]${escapedMap}['"]`, 'g'),
      });
      pushRegexMatches(violations, {
        file,
        rawSource,
        strippedSource,
        mapName,
        kind: 'direct patchConfigMap',
        regex: new RegExp(String.raw`\bpatchConfigMap\s*\([^,\n]+,\s*['"]${escapedMap}['"]`, 'g'),
      });
      pushGenericApiMatches(violations, {
        file,
        rawSource,
        strippedSource,
        mapName,
        mapArgPattern: String.raw`['"]${escapedMap}['"]`,
      });

      for (const alias of readAliasNames(strippedSource, mapName)) {
        const escapedAlias = escapeRegExp(alias);
        pushRegexMatches(violations, {
          file,
          rawSource,
          strippedSource,
          mapName,
          kind: `alias bracket assignment (${alias})`,
          regex: new RegExp(
            String.raw`(?<![A-Za-z0-9_$])${escapedAlias}\s*\[[^\]\n]+\]\s*${ASSIGNMENT_OPERATOR_PATTERN}`,
            'g'
          ),
        });
        pushRegexMatches(violations, {
          file,
          rawSource,
          strippedSource,
          mapName,
          kind: `alias bracket delete (${alias})`,
          regex: new RegExp(String.raw`\bdelete\s+${escapedAlias}\s*\[[^\]\n]+\]`, 'g'),
        });
        pushRegexMatches(violations, {
          file,
          rawSource,
          strippedSource,
          mapName,
          kind: `alias object spread (${alias})`,
          regex: new RegExp(String.raw`\.\.\.\s*${escapedAlias}\b`, 'g'),
        });
      }

      for (const mapNameAlias of readMapNameAliases(strippedSource, mapName)) {
        pushGenericApiMatches(violations, {
          file,
          rawSource,
          strippedSource,
          mapName,
          mapArgPattern: String.raw`${escapeRegExp(mapNameAlias)}\b`,
        });
      }
    }
  }

  return violations;
}

function formatViolation(violation) {
  return `${violation.file}:${violation.line} ${violation.mapName} ${violation.kind} :: ${violation.source}`;
}

function collectOwnerHelperImportViolations() {
  const violations = [];
  const files = SOURCE_ROOTS.flatMap(root => walkSourceFiles(root));
  const helperPattern = new RegExp(String.raw`\b(?:${OWNER_HELPER_NAMES.map(escapeRegExp).join('|')})\b`);

  for (const file of files) {
    if (file === VISUAL_KEYED_OWNER_MODULE) continue;
    const source = stripCommentsPreserveLines(readSourceFile(file));
    if (!helperPattern.test(source)) continue;
    if (!OWNER_HELPER_IMPORT_ALLOWLIST.has(file)) violations.push(file);
  }

  return violations;
}

function collectSimpleOwnerHelperImportViolations() {
  const violations = [];
  const files = SOURCE_ROOTS.flatMap(root => walkSourceFiles(root));
  const helperPattern = new RegExp(
    String.raw`\b(?:${SIMPLE_OWNER_HELPER_NAMES.map(escapeRegExp).join('|')})\b`
  );

  for (const file of files) {
    if (file === SIMPLE_WRITABLE_OWNER_MODULE) continue;
    const source = stripCommentsPreserveLines(readSourceFile(file));
    if (!helperPattern.test(source)) continue;
    if (!SIMPLE_OWNER_HELPER_IMPORT_ALLOWLIST.has(file)) violations.push(file);
  }

  return violations;
}

function collectDomainGenericVisualWriteHelperViolations() {
  const violations = [];
  const files = walkSourceFiles('esm/native/kernel').filter(file =>
    file.startsWith('esm/native/kernel/domain_api_surface_sections')
  );

  for (const file of files) {
    const rawSource = readSourceFile(file);
    const strippedSource = stripCommentsPreserveLines(rawSource);
    for (const helper of DOMAIN_GENERIC_MAP_WRITE_HELPERS) {
      for (const mapName of VISUAL_KEYED_MAPS) {
        const regex = new RegExp(
          String.raw`\b${escapeRegExp(helper)}\s*\([^\n)]*['"]${escapeRegExp(mapName)}['"]`,
          'g'
        );
        pushRegexMatches(violations, {
          file,
          rawSource,
          strippedSource,
          mapName,
          kind: `domain generic ${helper}`,
          regex,
        });
      }
    }
  }

  return violations;
}

function collectBroadWriteMapKeyCallViolations() {
  const violations = [];
  const files = SOURCE_ROOTS.flatMap(root => walkSourceFiles(root));

  for (const file of files) {
    if (WRITE_MAP_KEY_CALL_ALLOWLIST.has(file)) continue;
    const rawSource = readSourceFile(file);
    const strippedSource = stripCommentsPreserveLines(rawSource);
    pushRegexMatches(violations, {
      file,
      rawSource,
      strippedSource,
      mapName: 'writeMapKey',
      kind: 'direct writeMapKey call outside simple-map writer owners',
      regex: /\bwriteMapKey\s*\(/g,
    });
  }

  return violations;
}

function collectUiGenericMapWriteViolations() {
  const violations = [];
  const files = walkSourceFiles('esm/native/ui');
  const patterns = [
    {
      mapName: 'setCfgMap',
      kind: 'generic UI setCfgMap',
      regex: /\bsetCfgMap\s*\(/g,
    },
    {
      mapName: 'cfgSetMap',
      kind: 'generic UI cfgSetMap',
      regex: /\bcfgSetMap\s*\(/g,
    },
    {
      mapName: 'patchConfigMap',
      kind: 'generic UI patchConfigMap',
      regex: /\bpatchConfigMap\s*\(/g,
    },
  ];

  for (const file of files) {
    const rawSource = readSourceFile(file);
    const strippedSource = stripCommentsPreserveLines(rawSource);
    for (const pattern of patterns) {
      pushRegexMatches(violations, {
        file,
        rawSource,
        strippedSource,
        mapName: pattern.mapName,
        kind: pattern.kind,
        regex: pattern.regex,
      });
    }
  }

  return violations;
}

function collectGenericConfigMapWriteViolations() {
  const violations = [];
  const files = SOURCE_ROOTS.flatMap(root => walkSourceFiles(root));
  const regex = /\b(?:cfgSetMap|patchConfigMap)\s*\(/g;

  for (const file of files) {
    if (GENERIC_CONFIG_MAP_WRITE_ALLOWLIST.has(file)) continue;
    const rawSource = readSourceFile(file);
    const strippedSource = stripCommentsPreserveLines(rawSource);
    pushRegexMatches(violations, {
      file,
      rawSource,
      strippedSource,
      mapName: 'configMap',
      kind: 'generic config map write outside config owner',
      regex: new RegExp(regex),
    });
  }

  return violations;
}

function collectDuplicatedOwnerPatchLogicViolations() {
  const violations = [];
  const files = SOURCE_ROOTS.flatMap(root => walkSourceFiles(root));
  const duplicatedPatchPatterns = [
    /function\s+patchCanonicalOwnerMapEntries\b/,
    /function\s+patchVisualKeyedMapEntry\b/,
    /function\s+patchCanonicalPrefixedMapEntry\b/,
    /\bnormalizedEntryMap\b/,
    /delete\s+nextMap\[canonicalKey\]/,
    /nextMap\[canonicalKey\]\s*=/,
  ];

  for (const file of files) {
    if (file === VISUAL_KEYED_OWNER_MODULE) continue;
    const source = stripCommentsPreserveLines(readSourceFile(file));
    for (const pattern of duplicatedPatchPatterns) {
      if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
    }
  }

  return violations;
}

test('visual/keyed config maps are written only by canonical owner files', () => {
  const missingOwners = Array.from(DIRECT_WRITE_OWNER_FILES).filter(
    file => !fs.existsSync(path.join(PROJECT_ROOT, file))
  );
  assert.deepEqual(missingOwners, [], 'visual map writer owner allowlist must reference real files');

  const violations = collectVisualMapWriteViolations().map(formatViolation);
  assert.deepEqual(
    violations,
    [],
    `Visual/keyed map writes must go through owner helpers. Forbidden writes found:\n${violations.join('\n')}`
  );
});

test('visual/keyed owner helpers stay out of broad runtime facades', () => {
  const cfgAccessFacade = readSourceFile('esm/native/runtime/cfg_access.ts');
  const mapsAccessFacade = readSourceFile('esm/native/runtime/maps_access.ts');
  const coreApiFacade = readSourceFile('esm/native/core/api.ts');
  const servicesStateFacade = readSourceFile('esm/native/services/api_state_surface.ts');

  assert.doesNotMatch(cfgAccessFacade, /setCfgVisualKeyedMapFromOwner/);
  assert.doesNotMatch(mapsAccessFacade, /patchVisualKeyedMapEntriesFromOwner/);
  assert.doesNotMatch(mapsAccessFacade, /patchCanonicalVisualMapEntries/);
  assert.doesNotMatch(mapsAccessFacade, /writeMapKey/);
  assert.doesNotMatch(coreApiFacade, /writeMapKey/);
  assert.doesNotMatch(servicesStateFacade, /writeMapKey/);
  assert.doesNotMatch(coreApiFacade, /\bcfgSetMap\b/);
  assert.doesNotMatch(coreApiFacade, /\bpatchConfigMap\b/);
  assert.doesNotMatch(servicesStateFacade, /\bcfgSetMap\b/);
  assert.doesNotMatch(servicesStateFacade, /\bpatchConfigMap\b/);
});

test('visual/keyed owner helpers are imported only by approved owners', () => {
  const violations = collectOwnerHelperImportViolations();
  assert.deepEqual(
    violations,
    [],
    `Owner-only visual/keyed helpers may only be imported by approved owners:\n${violations.join('\n')}`
  );
});

test('domain api visual writes are blocked from generic helpers and routed through semantic writers', () => {
  const mapWrites = readSourceFile(DOMAIN_API_MAP_WRITES_FILE);
  const doorBindings = readSourceFile(DOMAIN_API_DOOR_BINDINGS_FILE);
  const grooveBindings = readSourceFile(DOMAIN_API_GROOVE_BINDINGS_FILE);

  assert.match(mapWrites, /isVisualKeyedMapName/);
  assert.match(mapWrites, /assertDomainGenericMapWriteAllowed/);
  for (const helper of DOMAIN_GENERIC_MAP_WRITE_HELPERS) {
    assert.match(
      mapWrites,
      new RegExp(String.raw`\b${escapeRegExp(helper)}\s*\(`),
      `${helper} should remain centralized in ${DOMAIN_API_MAP_WRITES_FILE}`
    );
  }

  assert.doesNotMatch(doorBindings, /commitCanonicalMapValue\(\s*state\s*,\s*['"]removedDoorsMap['"]/);
  assert.doesNotMatch(doorBindings, /commitCanonicalPrefixedMapValue\(\s*state\s*,\s*['"]splitDoorsMap['"]/);
  assert.doesNotMatch(
    doorBindings,
    /patchCanonicalPrefixedMapViaCfg\(\s*state\s*,\s*['"]splitDoorsBottomMap['"]/
  );
  assert.match(doorBindings, /writeRemoved\(state\.App/);
  assert.match(doorBindings, /writeSplit\(state\.App/);
  assert.match(doorBindings, /writeSplitBottom\(state\.App/);

  assert.doesNotMatch(grooveBindings, /commitCanonicalPrefixedMapValue\(\s*state\s*,\s*['"]groovesMap['"]/);
  assert.match(grooveBindings, /patchDoorGrooveMapEntries\(state\.App/);
  assert.match(grooveBindings, /toggleGrooveKey\(state\.App/);

  const violations = collectDomainGenericVisualWriteHelperViolations().map(formatViolation);
  assert.deepEqual(
    violations,
    [],
    `Domain generic map helpers must not receive visual/keyed map names: ${violations.join('\n')}`
  );
});

test('simple generic map writers are allowlisted and semantic actions prefer named writers', () => {
  const simpleOwner = readSourceFile(SIMPLE_WRITABLE_OWNER_MODULE);
  const mapsWriters = readSourceFile('esm/native/runtime/maps_access_writers.ts');
  const mapsAccessFacade = readSourceFile('esm/native/runtime/maps_access.ts');
  const mapWrites = readSourceFile(DOMAIN_API_MAP_WRITES_FILE);
  const mapsApiNamedMaps = readSourceFile(MAPS_API_NAMED_MAPS_FILE);
  const doorBindings = readSourceFile(DOMAIN_API_DOOR_BINDINGS_FILE);
  const grooveCurtainBindings = readSourceFile(DOMAIN_API_GROOVE_BINDINGS_FILE);
  const drawerDividerBindings = readSourceFile(DOMAIN_API_DRAWERS_DIVIDERS_BINDINGS_FILE);

  assert.match(simpleOwner, /SIMPLE_WRITABLE_MAP_NAMES\s*=\s*\[/);
  assert.match(simpleOwner, /export function isSimpleWritableMapName\(/);
  assert.match(simpleOwner, /export function patchSimpleWritableMapEntryFromOwner\(/);
  assert.match(simpleOwner, /export function replaceSimpleWritableMapFromOwner\(/);
  assert.match(simpleOwner, /export function toggleSimpleWritableBooleanMapEntryFromOwner\(/);
  assert.match(mapsWriters, /simple_writable_map_writer_owner\.js/);
  assert.match(mapsApiNamedMaps, /simple_writable_map_writer_owner\.js/);
  assert.match(mapWrites, /simple_writable_map_writer_owner\.js/);
  assert.match(mapsAccessFacade, /SIMPLE_WRITABLE_MAP_NAMES/);
  assert.match(mapsAccessFacade, /isSimpleWritableMapName/);
  for (const mapName of SIMPLE_WRITABLE_MAPS) {
    assert.match(
      simpleOwner,
      new RegExp(String.raw`['"]${escapeRegExp(mapName)}['"]`),
      `${mapName} must be explicit in SIMPLE_WRITABLE_MAP_NAMES`
    );
  }

  assert.match(mapWrites, /isSimpleWritableMapName/);
  assert.match(mapWrites, /patchSimpleWritableMapEntryFromOwner/);
  assert.match(mapsApiNamedMaps, /isSimpleWritableMapName\(cleanMapName\)/);
  assert.match(mapsApiNamedMaps, /patchSimpleWritableMapEntryFromOwner/);
  assert.match(mapsWriters, /export function replaceDoorGrooveLinesCountMap\(/);
  assert.match(mapsWriters, /export function replaceRoundedFrameSideShelvesMap\(/);
  assert.match(mapsWriters, /export function replaceDoorSpecialMap\(/);
  assert.match(mapsWriters, /export function replaceCurtainMap\(/);
  assert.match(mapsWriters, /export function writeIndividualColor\(/);
  assert.match(mapsWriters, /setCfgVisualKeyedMapFromOwner/);
  assert.match(mapsWriters, /replaceSimpleWritableMapFromOwner/);
  assert.match(grooveCurtainBindings, /writeCurtainPreset\(state\.App/);
  assert.match(drawerDividerBindings, /writeDividerState\(state\.App/);
  assert.match(doorBindings, /writeHandle\(state\.App/);
  assert.match(doorBindings, /writeHinge\(state\.App/);
  assert.doesNotMatch(grooveCurtainBindings, /writeCurtainPreset\([\s\S]*?writeSimpleMapValue/);
  assert.doesNotMatch(drawerDividerBindings, /writeDividerState\([\s\S]*?writeSimpleMapValue/);
  assert.doesNotMatch(drawerDividerBindings, /toggleDivider\([\s\S]*?toggleSimpleBooleanMapValue/);
  assert.doesNotMatch(doorBindings, /writeHandle\([\s\S]*?writeSimpleMapValue/);
  assert.doesNotMatch(doorBindings, /writeHinge\([\s\S]*?writeSimpleMapValue/);
  assert.doesNotMatch(mapsWriters, /\bensureMapRecord\b/);
  assert.doesNotMatch(mapsWriters, /\bwriteOwn\b/);
  assert.doesNotMatch(mapsWriters, /\btrySetKey\b/);
  assert.doesNotMatch(mapsApiNamedMaps, /\bpatchConfigMap\b/);
  assert.doesNotMatch(mapsApiNamedMaps, /\bcreateMapPatch\b/);

  const paintDoorStyleFlow = readSourceFile(
    'esm/native/services/canvas_picking_paint_flow_apply_door_style.ts'
  );
  const colorsSection = readSourceFile('esm/native/kernel/domain_api_colors_section.ts');
  const installHelpers = readSourceFile('esm/native/kernel/domain_api_install_helpers.ts');
  const rootMapBindings = readSourceFile(
    'esm/native/kernel/domain_api_surface_sections_bindings_root_map.ts'
  );

  assert.match(paintDoorStyleFlow, /replaceDoorSpecialMap\(args\.App/);
  assert.match(paintDoorStyleFlow, /replaceCurtainMap\(args\.App/);
  assert.doesNotMatch(paintDoorStyleFlow, /cfgSetMap\(\s*args\.App\s*,\s*['"]doorSpecialMap['"]/);
  assert.doesNotMatch(paintDoorStyleFlow, /cfgSetMap\(\s*args\.App\s*,\s*['"]curtainMap['"]/);
  assert.match(colorsSection, /writeIndividualColor\(App,\s*partKey,\s*value,\s*meta\)/);
  assert.doesNotMatch(colorsSection, /_cfgMapPatch\(\s*['"]individualColors['"]/);
  assert.doesNotMatch(installHelpers, /\bpatchConfigMap\b/);
  assert.match(
    installHelpers,
    /writeCanonicalMapValueDirect\(App,\s*mapKey,\s*recordKey,\s*value,\s*mergedMeta\)/
  );
  assert.match(rootMapBindings, /writeSimpleMapValue\(state,\s*nextMapName,\s*key,\s*val,\s*nextMeta\)/);
  assert.doesNotMatch(grooveCurtainBindings, /writeCurtainPreset\([\s\S]*?_cfgMapPatch/);
  assert.doesNotMatch(drawerDividerBindings, /writeDividerState\([\s\S]*?_cfgMapPatch/);
  assert.doesNotMatch(colorsSection, /writeIndividualColor\([\s\S]*?_cfgMapPatch/);

  const violations = collectBroadWriteMapKeyCallViolations().map(formatViolation);
  assert.deepEqual(
    violations,
    [],
    `writeMapKey must not be used by source runtime/domain writers:\n${violations.join('\n')}`
  );

  const simpleOwnerImportViolations = collectSimpleOwnerHelperImportViolations();
  assert.deepEqual(
    simpleOwnerImportViolations,
    [],
    `Simple writable owner helpers may only be imported by approved writer owners:\n${simpleOwnerImportViolations.join('\n')}`
  );

  const uiGenericMapWriteViolations = collectUiGenericMapWriteViolations().map(formatViolation);
  assert.deepEqual(
    uiGenericMapWriteViolations,
    [],
    `UI/React map writes must use semantic runtime writers instead of generic config map APIs:\n${uiGenericMapWriteViolations.join('\n')}`
  );

  const genericConfigMapWriteViolations = collectGenericConfigMapWriteViolations().map(formatViolation);
  assert.deepEqual(
    genericConfigMapWriteViolations,
    [],
    `cfgSetMap/patchConfigMap calls must stay inside config owner files:\n${genericConfigMapWriteViolations.join('\n')}`
  );
});

test('canvas picking services use semantic runtime writers instead of owner helpers', () => {
  for (const { file, writers } of SERVICE_SEMANTIC_WRITER_EXPECTATIONS) {
    const source = readSourceFile(file);
    assert.doesNotMatch(
      source,
      /visual_keyed_map_writer_owner\.js/,
      `${file} must not import the owner module`
    );
    assert.doesNotMatch(
      source,
      /\bpatchVisualKeyedMapEntriesFromOwner\b/,
      `${file} must not call the low-level owner patch helper`
    );
    assert.match(
      source,
      /from ['"]\.\.\/runtime\/maps_access\.js['"]/,
      `${file} must use the runtime writer facade`
    );
    for (const writer of writers) {
      assert.match(source, new RegExp(`\\b${escapeRegExp(writer)}\\b`), `${file} must use ${writer}`);
    }
  }
});

test('visual/keyed patch implementation is centralized in the owner module', () => {
  const owner = readSourceFile(VISUAL_KEYED_OWNER_MODULE);
  const mapsWriters = readSourceFile('esm/native/runtime/maps_access_writers.ts');
  const mapsApiNamedMaps = readSourceFile('esm/native/kernel/maps_api_named_maps.ts');

  assert.match(owner, /export function patchVisualKeyedMapEntriesFromOwner\(/);
  assert.match(owner, /export function setCfgVisualKeyedMapFromOwner(?:<[^>]+>)?\(/);
  assert.match(owner, /export function toggleVisualKeyedMapEntryFromOwner\(/);

  const ownerPatchExportFiles = SOURCE_ROOTS.flatMap(root => walkSourceFiles(root)).filter(file =>
    /export function patchVisualKeyedMapEntriesFromOwner\(/.test(readSourceFile(file))
  );
  assert.deepEqual(ownerPatchExportFiles, [VISUAL_KEYED_OWNER_MODULE]);

  assert.match(mapsWriters, /visual_keyed_map_writer_owner\.js/);
  assert.match(mapsApiNamedMaps, /visual_keyed_map_writer_owner\.js/);
  assert.doesNotMatch(mapsWriters, /function\s+patchCanonicalOwnerMapEntries\b/);
  assert.doesNotMatch(mapsApiNamedMaps, /function\s+patchVisualKeyedMapEntry\b/);

  const violations = collectDuplicatedOwnerPatchLogicViolations();
  assert.deepEqual(
    violations,
    [],
    `Visual/keyed patch logic must stay in ${VISUAL_KEYED_OWNER_MODULE}:\n${violations.join('\n')}`
  );
});
