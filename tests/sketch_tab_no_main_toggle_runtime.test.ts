import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SKETCH_NO_MAIN_FREE_EXTRAS_KEY,
  SKETCH_NO_MAIN_RESTORE_KEY,
  toggleSketchNoMainWardrobe,
} from '../esm/native/ui/react/tabs/sketch_tab_no_main_toggle.ts';

type AnyRecord = Record<string, any>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeUi(state: AnyRecord, patch: AnyRecord): void {
  state.ui = {
    ...state.ui,
    ...clone(patch),
    raw: {
      ...((state.ui && state.ui.raw) || {}),
      ...((patch && patch.raw) || {}),
    },
  };
}

function createToggleApp(state: AnyRecord): AnyRecord {
  return {
    state,
    recomputeCalls: [] as AnyRecord[],
    actions: {
      patch(patch: AnyRecord) {
        if (patch && patch.ui) mergeUi(state, patch.ui);
        if (patch && patch.config) state.config = clone(patch.config);
      },
      ui: {
        patch(patch: AnyRecord) {
          mergeUi(state, patch);
        },
      },
      config: {
        applyProjectSnapshot(snapshot: AnyRecord) {
          state.config = clone(snapshot);
        },
      },
      history: {
        batch(cb: () => void) {
          cb();
        },
      },
      modules: {
        recomputeFromUi(uiOverride: AnyRecord, meta: AnyRecord, opts: AnyRecord) {
          this.recomputeCalls?.push?.({ uiOverride, meta, opts });
          return { ok: true };
        },
      },
    },
    store: {
      getState() {
        return state;
      },
    },
  };
}

const meta = {
  noBuildImmediate(source: string) {
    return { source, noBuild: true };
  },
};

test('sketch no-main toggle hides no-main free boxes while the main wardrobe is restored', () => {
  const mainBox = { id: 'main-box', freePlacement: false, widthM: 0.8 };
  const freeBox = { id: 'free-box', freePlacement: true, absX: 0.4, widthM: 0.5 };
  const state: AnyRecord = {
    ui: {
      doors: 4,
      width: 240,
      height: 220,
      depth: 60,
      raw: { doors: 4, width: 240, height: 220, depth: 60 },
    },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [
        {
          id: 'main-module',
          layout: 'custom',
          sketchExtras: {
            boxes: [mainBox],
          },
        },
      ],
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  };
  const app = createToggleApp(state);

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: true,
    restored: false,
  });

  state.config.modulesConfiguration[0].sketchExtras.boxes.push(clone(freeBox));

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: false,
    restored: true,
  });
  assert.deepEqual(
    state.config.modulesConfiguration[0].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['main-box']
  );
  assert.deepEqual(
    state.ui[SKETCH_NO_MAIN_FREE_EXTRAS_KEY].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['free-box']
  );

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: true,
    restored: false,
  });
  assert.deepEqual(
    state.config.modulesConfiguration[0].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['main-box', 'free-box']
  );

  const secondSnapshot = state.ui[SKETCH_NO_MAIN_RESTORE_KEY] as AnyRecord;
  assert.deepEqual(
    secondSnapshot.config.modulesConfiguration[0].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['main-box']
  );

  state.config.modulesConfiguration[0].sketchExtras.boxes = [clone(mainBox)];

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: false,
    restored: true,
  });
  assert.deepEqual(
    state.config.modulesConfiguration[0].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['main-box']
  );
  assert.equal(state.ui[SKETCH_NO_MAIN_FREE_EXTRAS_KEY], null);

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: true,
    restored: false,
  });
  assert.deepEqual(
    state.config.modulesConfiguration[0].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['main-box']
  );
});

test('sketch no-main toggle preserves free-placement boxes that were created with the main wardrobe', () => {
  const mainFreeBox = { id: 'main-free-box', freePlacement: true, absX: 1.2, widthM: 0.7 };
  const noMainFreeBox = { id: 'no-main-free-box', freePlacement: true, absX: -0.4, widthM: 0.5 };
  const state: AnyRecord = {
    ui: {
      doors: 4,
      width: 240,
      height: 220,
      depth: 60,
      raw: { doors: 4, width: 240, height: 220, depth: 60 },
    },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [
        {
          id: 'main-module',
          sketchExtras: {
            boxes: [clone(mainFreeBox)],
          },
        },
      ],
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  };
  const app = createToggleApp(state);

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: true,
    restored: false,
  });
  assert.deepEqual(
    state.config.modulesConfiguration[0].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['main-free-box']
  );
  assert.deepEqual(
    state.ui[SKETCH_NO_MAIN_RESTORE_KEY].config.modulesConfiguration[0].sketchExtras.boxes.map(
      (entry: AnyRecord) => entry.id
    ),
    ['main-free-box']
  );

  state.config.modulesConfiguration[0].sketchExtras.boxes[0].widthM = 0.9;
  state.config.modulesConfiguration[0].sketchExtras.boxes.push(clone(noMainFreeBox));

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: false,
    restored: true,
  });
  assert.deepEqual(state.config.modulesConfiguration[0].sketchExtras.boxes, [
    { ...mainFreeBox, widthM: 0.9 },
  ]);
  assert.deepEqual(
    state.ui[SKETCH_NO_MAIN_FREE_EXTRAS_KEY].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['no-main-free-box']
  );

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: true,
    restored: false,
  });
  assert.deepEqual(
    state.config.modulesConfiguration[0].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['main-free-box', 'no-main-free-box']
  );

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: false,
    restored: true,
  });
  assert.deepEqual(
    state.config.modulesConfiguration[0].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['main-free-box']
  );
});

test('sketch no-main toggle disables main-wardrobe auxiliary modes while preserving them for restore', () => {
  const state: AnyRecord = {
    ui: {
      raw: {
        doors: 4,
        width: 240,
        height: 220,
        depth: 60,
        stackSplitLowerHeight: 90,
        stackSplitLowerDepth: 55,
        stackSplitLowerWidth: 120,
        stackSplitLowerDoors: 2,
        stackSplitLowerDepthManual: true,
        stackSplitLowerWidthManual: true,
        stackSplitLowerDoorsManual: true,
      },
      doors: 4,
      width: 240,
      height: 220,
      depth: 60,
      stackSplitEnabled: true,
      stackSplitDecorativeSeparatorEnabled: true,
      libraryUpperDoorsHidden: true,
      cornerMode: true,
    },
    config: {
      wardrobeType: 'hinged',
      isLibraryMode: true,
      modulesConfiguration: [{ id: 'upper', doors: 2 }],
      stackSplitLowerModulesConfiguration: [{ id: 'lower', doors: 2 }],
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  };
  const app = createToggleApp(state);

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: true,
    restored: false,
  });

  assert.equal(state.ui.raw.doors, 0);
  assert.equal(state.ui.raw.width, 0);
  assert.equal(state.ui.stackSplitEnabled, false);
  assert.equal(state.ui.stackSplitDecorativeSeparatorEnabled, false);
  assert.equal(state.ui.libraryUpperDoorsHidden, false);
  assert.equal(state.ui.cornerMode, false);
  assert.equal(state.config.isLibraryMode, false);
  assert.deepEqual(state.config.stackSplitLowerModulesConfiguration, []);

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: false,
    restored: true,
  });

  assert.equal(state.ui.raw.doors, 4);
  assert.equal(state.ui.stackSplitEnabled, true);
  assert.equal(state.ui.stackSplitDecorativeSeparatorEnabled, true);
  assert.equal(state.ui.libraryUpperDoorsHidden, true);
  assert.equal(state.ui.cornerMode, true);
  assert.equal(state.config.isLibraryMode, true);
  assert.deepEqual(state.config.stackSplitLowerModulesConfiguration, [{ id: 'lower', doors: 2 }]);
});

test('sketch no-main toggle can start from sliding and restores the previous sliding wardrobe', () => {
  const state: AnyRecord = {
    ui: {
      raw: { doors: 3, width: 300, height: 240, depth: 70 },
      doors: 3,
      width: 300,
      height: 240,
      depth: 70,
      stackSplitEnabled: true,
      cornerMode: true,
    },
    config: {
      wardrobeType: 'sliding',
      modulesConfiguration: [{ id: 'sliding-main', doors: 3 }],
      stackSplitLowerModulesConfiguration: [{ id: 'sliding-lower' }],
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  };
  const app = createToggleApp(state);

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: true,
    restored: false,
  });

  assert.equal(state.config.wardrobeType, 'hinged');
  assert.equal(state.ui.raw.doors, 0);
  assert.equal(state.ui.raw.width, 0);
  assert.equal(state.ui.stackSplitEnabled, false);
  assert.equal(state.ui.cornerMode, false);
  assert.equal(state.ui[SKETCH_NO_MAIN_RESTORE_KEY].config.wardrobeType, 'sliding');
  assert.deepEqual(state.ui[SKETCH_NO_MAIN_RESTORE_KEY].config.modulesConfiguration, [
    { id: 'sliding-main', doors: 3 },
  ]);

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: false,
    restored: true,
  });

  assert.equal(state.config.wardrobeType, 'sliding');
  assert.equal(state.ui.raw.doors, 3);
  assert.equal(state.ui.raw.width, 300);
  assert.deepEqual(state.config.modulesConfiguration, [{ id: 'sliding-main', doors: 3 }]);
});

test('sketch no-main restore from a loaded no-main project keeps loaded free boxes out of the restored main wardrobe', () => {
  const loadedNoMainBox = {
    id: 'loaded-no-main-free-box',
    freePlacement: true,
    absX: -0.35,
    widthM: 0.55,
    depthM: 0.4,
  };
  const state: AnyRecord = {
    ui: {
      raw: { doors: 0, width: 0, height: 220, depth: 60 },
      doors: 0,
      width: 0,
      height: 220,
      depth: 60,
    },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [
        {
          id: 'loaded-no-main-module',
          sketchExtras: {
            boxes: [clone(loadedNoMainBox)],
            shelves: [{ id: 'loaded-free-shelf' }],
          },
        },
      ],
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  };
  const app = createToggleApp(state);

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: false,
    restored: true,
  });

  assert.equal(state.ui.raw.doors, 4);
  assert.equal(state.ui.raw.width, 160);
  assert.deepEqual(state.config.modulesConfiguration[0].sketchExtras?.boxes || [], []);
  assert.deepEqual(state.config.modulesConfiguration[0].sketchExtras?.shelves || [], []);
  assert.deepEqual(
    state.ui[SKETCH_NO_MAIN_FREE_EXTRAS_KEY].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['loaded-no-main-free-box']
  );
  assert.deepEqual(
    state.ui[SKETCH_NO_MAIN_FREE_EXTRAS_KEY].sketchExtras.shelves.map((entry: AnyRecord) => entry.id),
    ['loaded-free-shelf']
  );

  assert.deepEqual(toggleSketchNoMainWardrobe({ app, meta }), {
    ok: true,
    active: true,
    restored: false,
  });
  assert.deepEqual(
    state.config.modulesConfiguration[0].sketchExtras.boxes.map((entry: AnyRecord) => entry.id),
    ['loaded-no-main-free-box']
  );
});
