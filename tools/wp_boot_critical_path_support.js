const PRE_REACT_FOUNDATION_STEPS = new Set([
  'adapters.browser.surface',
  'platform.install',
  'platform.assertStore',
  'platform.applyRuntimeConfigDefaults',
  'platform.initRenderState',
  'platform.renderScheduler',
  'ui.errorsSurface',
  'ui.errorsInstall',
  'kernel.cfgMeta',
  'kernel.install',
  'kernel.assertStateKernel',
  'kernel.stateApi',
  'kernel.assertCanonicalActions',
  'kernel.applyPlatformBootFlags',
  'kernel.domainApi',
  'kernel.mapsApi',
  'builder.provide',
  'services.seedUiEphemeralDefaults',
  'ui.assertDocument',
  'ui.modules.main',
]);

const POST_MOUNT_CANDIDATES = new Map([
  [
    'services.notes',
    {
      strategy:
        'Keep a small notes service surface; prove save/restore and first-render consumers before deferral.',
      risk: 'medium: project restore and viewer notes can consume the surface early',
    },
  ],
  [
    'services.cloudSync',
    {
      strategy:
        'Separate local stable surfaces from remote activation after mount; preserve Site2 startup semantics.',
      risk: 'high: room changes, offline reconnect, conflict handling, and Site2 gate semantics',
    },
  ],
  [
    'services.canvasPicking',
    {
      strategy:
        'Keep a lightweight dispatcher, load one cached implementation promise, and preload after first paint/idle.',
      risk: 'high: first click/hover, concurrent loads, disposal, project replacement, and load errors',
    },
  ],
  [
    'platform.smokeChecks',
    {
      strategy:
        'Install or schedule smoke checks after readiness, retaining explicit debug/smoke entry points.',
      risk: 'low-medium: release diagnostics and readiness assertions must retain their ordering contract',
    },
  ],
]);

function normalizeStepName(name) {
  return String(name || '').replace(/^boot\.step\./, '');
}

export function classifyBootStep(name) {
  const step = normalizeStepName(name);
  const candidate = POST_MOUNT_CANDIDATES.get(step);
  if (candidate) {
    return {
      category: 'C',
      confidence: 'candidate; behavioral proof required',
      mustBlockReact: 'unknown',
      mustBlockFirstRender: 'unknown',
      ...candidate,
    };
  }
  if (PRE_REACT_FOUNDATION_STEPS.has(step)) {
    return {
      category: 'A',
      confidence: 'high for the current shell contract',
      mustBlockReact: 'yes',
      mustBlockFirstRender: 'yes',
      strategy: 'Keep on the pre-React foundation path.',
      risk: 'high: canonical App/store/kernel/UI surfaces are consumed during shell mount',
    };
  }
  return {
    category: 'B',
    confidence: 'conservative; mount-order experiment not yet performed',
    mustBlockReact: 'unknown',
    mustBlockFirstRender: 'yes',
    strategy: 'Keep before app-start readiness; test direct shell consumers before changing its order.',
    risk: 'medium-high: the first usable render or startup restore may consume this surface',
  };
}

export function bootStepSubsystem(name) {
  const step = normalizeStepName(name);
  if (step === 'services.canvasPicking') return 'canvas picking';
  if (step === 'services.cloudSync' || step === 'services.cloudCollections' || step === 'services.models') {
    return 'cloud sync';
  }
  if (step === 'services.notes') return 'notes';
  if (step === 'io.projectIo') return 'project IO/config';
  if (step.startsWith('builder.')) return 'builder';
  if (step.startsWith('kernel.')) return 'kernel/state';
  if (step.startsWith('platform.')) return 'platform';
  if (step.startsWith('adapters.')) return 'adapters';
  if (step.startsWith('ui.')) return 'React/UI app';
  if (step.startsWith('data.')) return 'data';
  if (step.startsWith('layers.')) return 'runtime';
  return 'other services';
}

export function createBootCriticalPathRows(stableProfile, bundleAttribution) {
  const contributionBySubsystem = new Map(
    (bundleAttribution?.subsystemAttribution || []).map(row => [row.subsystem, row])
  );
  return (stableProfile?.bootSteps || []).map(step => {
    const subsystem = bootStepSubsystem(step.name);
    const contribution = contributionBySubsystem.get(subsystem) || null;
    return {
      step: normalizeStepName(step.name),
      durationMs: step.durationMs,
      subsystem,
      subsystemRenderedBytes: Number(contribution?.renderedBytes) || 0,
      subsystemModuleCount: Number(contribution?.moduleCount) || 0,
      ...classifyBootStep(step.name),
    };
  });
}
