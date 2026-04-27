import path from 'node:path';

import { flattenVerifyLanePlan } from './wp_verify_lane_catalog.js';
import { parseVerifyLaneArgs } from './wp_verify_lane_state.js';

export const TEST_REF_PATTERN = /tests\/[^^\s\"']+\.test\.(?:js|ts|tsx|cjs)(?![A-Za-z0-9_])/g;
export const PURE_NPM_RUN_ALIAS_PATTERN = /^npm run ([^&|]+)$/;
const NPM_RUN_PATTERN = /npm run ([^\s&|]+)/g;

export function normalizeCommandToken(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function splitCommandWords(command) {
  return (
    String(command || '')
      .match(/"[^"]*"|'[^']*'|[^\s]+/g)
      ?.map(normalizeCommandToken)
      .filter(Boolean) ?? []
  );
}

export function collectCommandScriptRefs(command) {
  const refs = [];
  const text = String(command || '');
  for (const match of text.matchAll(NPM_RUN_PATTERN)) {
    const scriptName = normalizeCommandToken(match[1]);
    if (scriptName) refs.push(scriptName);
  }
  return refs;
}

export function collectCommandTestRefs(command) {
  return String(command || '').match(TEST_REF_PATTERN) ?? [];
}

export function collectVerifyLanePlanScripts(command) {
  const words = splitCommandWords(command);
  const laneIndex = words.findIndex(token => /(?:^|\/)wp_verify_lane\.js$/u.test(token));
  if (laneIndex === -1) return [];
  const args = parseVerifyLaneArgs(words.slice(laneIndex + 1));
  if (!args.laneNames.length) return [];
  return flattenVerifyLanePlan(args.laneNames, { dedupe: !args.noDedupe }).scripts;
}

export function createScriptEntryMap(scriptEntries) {
  const out = new Map();
  for (const [scriptName, command] of scriptEntries || []) {
    if (typeof scriptName !== 'string') continue;
    out.set(scriptName, String(command || ''));
  }
  return out;
}

export function createVerifyScriptCoverageMap(scriptEntries) {
  const scriptMap = scriptEntries instanceof Map ? scriptEntries : createScriptEntryMap(scriptEntries);
  const memo = new Map();

  function resolve(scriptName, seen = new Set()) {
    if (memo.has(scriptName)) return memo.get(scriptName);
    if (seen.has(scriptName)) {
      return {
        scriptNames: new Set(),
        testRefs: new Set(),
        basenames: new Set(),
      };
    }

    const command = scriptMap.get(scriptName);
    const resolved = {
      scriptNames: new Set(),
      testRefs: new Set(),
      basenames: new Set(),
    };
    memo.set(scriptName, resolved);
    if (!command) return resolved;

    seen.add(scriptName);

    const queueScriptNames = new Set();
    for (const refScriptName of collectCommandScriptRefs(command)) {
      resolved.scriptNames.add(refScriptName);
      queueScriptNames.add(refScriptName);
    }
    for (const refScriptName of collectVerifyLanePlanScripts(command)) {
      resolved.scriptNames.add(refScriptName);
      queueScriptNames.add(refScriptName);
    }
    for (const testRef of collectCommandTestRefs(command)) {
      resolved.testRefs.add(testRef);
      resolved.basenames.add(path.basename(testRef, path.extname(testRef)).replace(/\.test$/, ''));
    }

    for (const refScriptName of queueScriptNames) {
      const nested = resolve(refScriptName, seen);
      for (const nestedScriptName of nested.scriptNames) resolved.scriptNames.add(nestedScriptName);
      for (const testRef of nested.testRefs) resolved.testRefs.add(testRef);
      for (const basename of nested.basenames) resolved.basenames.add(basename);
    }

    for (const nestedScriptName of resolved.scriptNames) {
      const nestedCommand = scriptMap.get(nestedScriptName);
      if (!nestedCommand) continue;
      for (const testRef of collectCommandTestRefs(nestedCommand)) {
        resolved.testRefs.add(testRef);
        resolved.basenames.add(path.basename(testRef, path.extname(testRef)).replace(/\.test$/, ''));
      }
    }

    seen.delete(scriptName);
    return resolved;
  }

  const out = new Map();
  for (const scriptName of scriptMap.keys()) {
    out.set(scriptName, resolve(scriptName));
  }
  return out;
}
