import test from 'node:test';
import assert from 'node:assert/strict';

import { installBuilderPlan } from '../esm/native/builder/plan.ts';
import { installBuilderCornerWing } from '../esm/native/builder/corner_wing_install.ts';

type AnyRecord = Record<string, any>;

function createPlanApp(id: string, planSurface?: AnyRecord) {
  return {
    id,
    services: {
      builder: {
        plan: planSurface ?? {},
      },
    },
    store: {
      getState() {
        return {
          ui: { owner: id },
          config: {},
          mode: { primary: 'none', opts: {} },
          runtime: {},
          build: {},
        };
      },
      subscribe() {
        return () => undefined;
      },
    },
  } as AnyRecord;
}

function createCornerWingApp(id: string, modulesSurface?: AnyRecord) {
  return {
    id,
    services: {
      builder: {
        modules: modulesSurface ?? {},
      },
    },
  } as AnyRecord;
}

test('builder plan install healing: stable createBuildPlan ref follows the latest App across shared-surface reinstall', () => {
  const AppA = createPlanApp('A');
  const planA = installBuilderPlan(AppA as never) as AnyRecord;
  const heldCreateBuildPlan = planA.createBuildPlan;

  const planFromA = heldCreateBuildPlan(undefined, { source: 'first' });
  assert.equal(planFromA.state.ui.owner, 'A');
  assert.equal(planA.__wpBuilderCreateBuildPlan, heldCreateBuildPlan);

  const AppB = createPlanApp('B', planA);
  const planB = installBuilderPlan(AppB as never) as AnyRecord;

  assert.equal(planB, planA);
  assert.equal(planB.createBuildPlan, heldCreateBuildPlan);

  const planFromB = heldCreateBuildPlan(undefined, { source: 'second' });
  assert.equal(planFromB.state.ui.owner, 'B');
});

test('builder plan install healing: legacy marker drift heals missing canonical callable in place', () => {
  const driftedCreateBuildPlan = () => ({ kind: 'drifted' });
  const App = createPlanApp('A', {
    __esm_v1: true,
    createBuildPlan: driftedCreateBuildPlan,
  });

  const installed = installBuilderPlan(App as never) as AnyRecord;
  const canonicalCreateBuildPlan = installed.createBuildPlan;

  assert.notEqual(canonicalCreateBuildPlan, driftedCreateBuildPlan);
  assert.equal(typeof installed.__wpBuilderCreateBuildPlan, 'function');

  installed.createBuildPlan = () => ({ kind: 'drifted-again' });
  installBuilderPlan(App as never);

  assert.equal(installed.createBuildPlan, canonicalCreateBuildPlan);
});

test('builder corner-wing install healing: stable buildCornerWing ref survives shared-surface reinstall and retargets install context', () => {
  const AppA = createCornerWingApp('A');
  installBuilderCornerWing(AppA as never);
  const sharedModules = AppA.services.builder.modules as AnyRecord;
  const heldBuildCornerWing = sharedModules.buildCornerWing;

  assert.equal(typeof heldBuildCornerWing, 'function');
  assert.equal(sharedModules.__installContext?.App, AppA);
  assert.equal(sharedModules.__wpBuilderBuildCornerWing, heldBuildCornerWing);

  const AppB = createCornerWingApp('B', sharedModules);
  installBuilderCornerWing(AppB as never);

  assert.equal(AppB.services.builder.modules, sharedModules);
  assert.equal(sharedModules.buildCornerWing, heldBuildCornerWing);
  assert.equal(sharedModules.__installContext?.App, AppB);
});

test('builder corner-wing install healing: legacy marker drift heals missing canonical callable in place', () => {
  const driftedBuildCornerWing = () => 'drifted';
  const App = createCornerWingApp('A', {
    __esm_corner_wing_v1: true,
    buildCornerWing: driftedBuildCornerWing,
  });

  installBuilderCornerWing(App as never);
  const modules = App.services.builder.modules as AnyRecord;
  const canonicalBuildCornerWing = modules.buildCornerWing;

  assert.notEqual(canonicalBuildCornerWing, driftedBuildCornerWing);
  assert.equal(typeof modules.__wpBuilderBuildCornerWing, 'function');

  modules.buildCornerWing = () => 'drifted-again';
  installBuilderCornerWing(App as never);

  assert.equal(modules.buildCornerWing, canonicalBuildCornerWing);
});
