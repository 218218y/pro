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

const DIRECT_WRITE_OWNER_FILES = new Set([
  'esm/native/runtime/maps_access_writers.ts',
  'esm/native/runtime/cfg_access_maps.ts',
  'esm/native/kernel/maps_api_named_maps.ts',
]);

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
    }
  }

  return violations;
}

function formatViolation(violation) {
  return `${violation.file}:${violation.line} ${violation.mapName} ${violation.kind} :: ${violation.source}`;
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
