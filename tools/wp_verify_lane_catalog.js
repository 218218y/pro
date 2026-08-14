function testGroup(name) {
  return Object.freeze({ kind: 'test-group', name });
}

function packageScript(name) {
  return Object.freeze({ kind: 'package-script', name });
}

export const VERIFY_LANE_CATALOG = Object.freeze({
  'app-boot-project-family-core': Object.freeze([
    testGroup('app-boot-project-family-core'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'browser-feedback-family-core': Object.freeze([
    testGroup('browser-feedback-family-contracts'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'builder-support-surfaces': Object.freeze([
    testGroup('builder-support-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'builder-surface-family-core': Object.freeze([
    testGroup('builder-surface-family-core'),
    testGroup('builder-surfaces'),
    testGroup('builder-support-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'builder-surfaces': Object.freeze([
    testGroup('builder-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'canonical-access-surfaces': Object.freeze([
    testGroup('canonical-access-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'canvas-family': Object.freeze([
    testGroup('visual-surface-family-contracts'),
    testGroup('canvas-interaction-surfaces'),
    testGroup('canvas-surfaces'),
    testGroup('sketch-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'canvas-interaction-surfaces': Object.freeze([
    testGroup('canvas-interaction-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'canvas-surfaces': Object.freeze([
    testGroup('canvas-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'cloud-sync-family-core': Object.freeze([
    testGroup('cloud-sync-family-contracts'),
    testGroup('cloud-sync-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'cloud-sync-surfaces': Object.freeze([
    testGroup('cloud-sync-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'domain-surfaces': Object.freeze([
    testGroup('domain-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'door-build-surfaces': Object.freeze([
    testGroup('door-build-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'export-overlay-errors-family-core': Object.freeze([
    testGroup('export-overlay-errors-family-contracts'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'layout-tab-family': Object.freeze([
    testGroup('structure-tab-family-contracts'),
    testGroup('tab-surfaces'),
    testGroup('builder-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'no-main-surfaces': Object.freeze([
    testGroup('no-main-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'order-pdf-surfaces': Object.freeze([
    testGroup('order-pdf-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'overlay-export-family': Object.freeze([
    testGroup('export-overlay-errors-family-contracts'),
    testGroup('overlay-export-family-runtime'),
    testGroup('order-pdf-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'perf-smoke': Object.freeze([packageScript('perf:smoke')]),
  'perf-toolchain-core': Object.freeze([testGroup('perf-toolchain-core')]),
  'project-surfaces': Object.freeze([
    testGroup('project-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'public-surfaces': Object.freeze([
    testGroup('public-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'render-family': Object.freeze([
    testGroup('visual-surface-family-contracts'),
    testGroup('render-surfaces'),
    testGroup('builder-support-surfaces'),
    testGroup('sketch-surfaces'),
    testGroup('tab-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'render-surfaces': Object.freeze([
    testGroup('render-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'residual-families-core': Object.freeze([
    testGroup('residual-families-core'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'runtime-access-surfaces': Object.freeze([
    testGroup('runtime-access-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'runtime-platform-core-family-core': Object.freeze([
    testGroup('runtime-platform-core-family-core'),
    testGroup('state-config-kernel-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'runtime-surface-family-core': Object.freeze([
    testGroup('runtime-surface-family-core'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'service-canonical-surfaces': Object.freeze([
    testGroup('service-canonical-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'sketch-surfaces': Object.freeze([
    testGroup('sketch-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'state-config-kernel-surfaces': Object.freeze([
    testGroup('state-config-kernel-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'structure-tab-family-core': Object.freeze([
    testGroup('structure-tab-family-core'),
    testGroup('tab-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'tab-surfaces': Object.freeze([
    testGroup('tab-surfaces'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'toolchain-surfaces': Object.freeze([testGroup('toolchain-surfaces')]),
  'ui-dist-probe': Object.freeze([packageScript('typecheck')]),
  'ui-lean-core': Object.freeze([
    testGroup('ui-lean-contracts'),
    packageScript('typecheck:ui-lean'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'ui-portable-core': Object.freeze([
    testGroup('ui-portable-typecheck-contracts'),
    packageScript('typecheck'),
    packageScript('typecheck:ui-lean'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'ui-react-import-hardening-core': Object.freeze([
    testGroup('ui-react-import-hardening-contracts'),
    testGroup('ui-type-hardening-contracts'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'ui-react-jsx-hardening-core': Object.freeze([
    testGroup('ui-react-import-hardening-contracts'),
    testGroup('ui-react-jsx-hardening-contracts'),
    testGroup('ui-type-hardening-contracts'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'ui-type-hardening-core': Object.freeze([
    testGroup('ui-type-hardening-contracts'),
    testGroup('export-overlay-errors-family-contracts'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
  'visual-surface-family-core': Object.freeze([
    testGroup('visual-surface-family-contracts'),
    packageScript('typecheck'),
    packageScript('contract:layers'),
    packageScript('contract:api'),
  ]),
});

export function listVerifyLaneNames() {
  return Object.keys(VERIFY_LANE_CATALOG).sort();
}

export function normalizeVerifyLaneName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

export function readVerifyLaneTasks(laneName) {
  const normalized = normalizeVerifyLaneName(laneName);
  const tasks = VERIFY_LANE_CATALOG[normalized];
  return Array.isArray(tasks) ? tasks.map(task => ({ ...task })) : null;
}

export function verifyTaskKey(task) {
  return `${task.kind}:${task.name}`;
}

export function formatVerifyTask(task) {
  if (task.kind === 'test-group') return `test-group:${task.name}`;
  if (task.kind === 'package-script') return `npm:${task.name}`;
  return `${task.kind}:${task.name}`;
}

export function flattenVerifyLaneTasks(laneName) {
  const normalized = normalizeVerifyLaneName(laneName);
  if (!normalized) throw new Error('[WardrobePro] verify lane name is required.');
  const tasks = readVerifyLaneTasks(normalized);
  if (!tasks) throw new Error(`[WardrobePro] unknown verify lane: ${normalized}`);
  return tasks;
}

export function flattenVerifyLanePlan(laneNames, { dedupe = true } = {}) {
  const values = Array.isArray(laneNames) ? laneNames : [laneNames];
  const normalizedLaneNames = values.map(value => normalizeVerifyLaneName(value)).filter(Boolean);
  if (!normalizedLaneNames.length) {
    throw new Error('[WardrobePro] at least one verify lane name is required.');
  }

  const tasks = [];
  const seenTasks = new Set();
  for (const laneName of normalizedLaneNames) {
    for (const task of flattenVerifyLaneTasks(laneName)) {
      const key = verifyTaskKey(task);
      if (dedupe && seenTasks.has(key)) continue;
      tasks.push(task);
      seenTasks.add(key);
    }
  }

  return {
    laneNames: normalizedLaneNames,
    tasks,
  };
}
