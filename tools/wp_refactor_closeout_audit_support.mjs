import path from 'node:path';

import { flattenVerifyLanePlan } from './wp_verify_lane_catalog.js';
import { parseVerifyLaneArgs } from './wp_verify_lane_state.js';
import { TEST_GROUP_CATALOG } from './wp_test_group_catalog.mjs';

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

export function collectCommandTestGroupNames(command) {
  const words = splitCommandWords(command);
  const groups = [];
  for (let index = 0; index < words.length; index += 1) {
    if (!/(?:^|\/)wp_test_group\.mjs$/u.test(words[index])) continue;
    const groupName = words[index + 1];
    if (groupName && !groupName.startsWith('-')) groups.push(groupName);
  }
  return groups;
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

export function validateCloseoutTestGroupBindings({
  lanes = [],
  scriptEntries = [],
  testGroupCatalog = TEST_GROUP_CATALOG,
} = {}) {
  const issues = [];
  const scriptMap = createScriptEntryMap(scriptEntries);
  const groupOwners = new Map();

  for (const lane of lanes || []) {
    const groupName = typeof lane?.testGroupId === 'string' ? lane.testGroupId.trim() : '';
    if (!groupName) continue;
    const group = testGroupCatalog?.[groupName];
    if (!group) {
      issues.push({ code: 'unknown-test-group', laneId: lane.id, groupName });
      continue;
    }
    const previousOwner = groupOwners.get(groupName);
    if (previousOwner && previousOwner !== lane.id) {
      issues.push({
        code: 'duplicate-test-group-lane',
        laneId: lane.id,
        groupName,
        previousLaneId: previousOwner,
      });
    } else {
      groupOwners.set(groupName, lane.id);
    }

    const expectedScript = group.script;
    const expectedArgs = ['run', expectedScript];
    if (lane.command !== 'npm' || JSON.stringify(lane.args || []) !== JSON.stringify(expectedArgs)) {
      issues.push({
        code: 'lane-command-mismatch',
        laneId: lane.id,
        groupName,
        expectedCommand: `npm run ${expectedScript}`,
      });
    }

    const packageCommand = scriptMap.get(expectedScript);
    const boundGroups = collectCommandTestGroupNames(packageCommand || '');
    if (!packageCommand || !boundGroups.includes(groupName)) {
      issues.push({
        code: 'package-script-binding-mismatch',
        laneId: lane.id,
        groupName,
        script: expectedScript,
      });
    }

    const directRefs = collectCommandTestRefs([lane.command, ...(lane.args || [])].join(' '));
    if (directRefs.length) {
      issues.push({ code: 'group-lane-has-direct-test-refs', laneId: lane.id, groupName, directRefs });
    }
  }

  return issues;
}

export function createVerifyScriptCoverageMap(scriptEntries, { testGroupCatalog = TEST_GROUP_CATALOG } = {}) {
  const scriptMap = scriptEntries instanceof Map ? scriptEntries : createScriptEntryMap(scriptEntries);
  const memo = new Map();

  function resolve(scriptName, seen = new Set()) {
    if (memo.has(scriptName)) return memo.get(scriptName);
    if (seen.has(scriptName)) {
      return {
        scriptNames: new Set(),
        testRefs: new Set(),
        basenames: new Set(),
        testGroupNames: new Set(),
      };
    }

    const command = scriptMap.get(scriptName);
    const resolved = {
      scriptNames: new Set(),
      testRefs: new Set(),
      basenames: new Set(),
      testGroupNames: new Set(),
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
    for (const groupName of collectCommandTestGroupNames(command)) {
      resolved.testGroupNames.add(groupName);
      const group = testGroupCatalog?.[groupName];
      for (const testRef of group?.files || []) {
        resolved.testRefs.add(testRef);
        resolved.basenames.add(path.basename(testRef, path.extname(testRef)).replace(/\.test$/, ''));
      }
    }

    for (const refScriptName of queueScriptNames) {
      const nested = resolve(refScriptName, seen);
      for (const nestedScriptName of nested.scriptNames) resolved.scriptNames.add(nestedScriptName);
      for (const testRef of nested.testRefs) resolved.testRefs.add(testRef);
      for (const basename of nested.basenames) resolved.basenames.add(basename);
      for (const groupName of nested.testGroupNames) resolved.testGroupNames.add(groupName);
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
