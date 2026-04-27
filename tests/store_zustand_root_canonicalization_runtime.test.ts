import test from 'node:test';
import assert from 'node:assert/strict';

import { AnyRecord, asRec, createStore, dispatchCompat } from './store_zustand_parity_helpers.ts';

test('store parity: SET canonicalizes structural config slices and detaches nested snapshot inputs', () => {
  const sourceRoot = {
    ui: {
      doors: 5,
      singleDoorPos: 'right',
      structureSelect: '',
      raw: { width: 220, height: 240, depth: 60, doors: 5, singleDoorPos: 'right' },
    },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ doors: '9', layout: 'drawers', customData: { storage: true } }, null],
      stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }, null],
      cornerConfiguration: {
        modulesConfiguration: [{ doors: '7', layout: 'drawers' }],
        stackSplitLower: { modulesConfiguration: [{ extDrawersCount: '4' }, null] },
      },
      savedColors: [{ id: 'c1', value: '#ffffff' }],
    },
    runtime: { overlay: { open: true } },
    mode: { primary: 'design', opts: { focus: { id: 'm1' } } },
    meta: { dirty: false, tags: [{ id: 't1' }] },
  } as AnyRecord;

  const store = createStore();
  dispatchCompat(store, {
    type: 'SET',
    payload: sourceRoot,
    meta: { source: 'test:set:root-canonical' },
  } as AnyRecord);

  const st = store.getState();
  const cfg = asRec(st.config);
  const corner = asRec(cfg.cornerConfiguration);
  const lowerCorner = asRec(corner.stackSplitLower);

  assert.deepEqual(
    (cfg.modulesConfiguration as AnyRecord[]).map(entry => asRec(entry).doors),
    [2, 2, 1]
  );
  assert.equal(asRec((cfg.modulesConfiguration as AnyRecord[])[0]).customData.storage, true);
  assert.equal(asRec((cfg.stackSplitLowerModulesConfiguration as AnyRecord[])[0]).extDrawersCount, 3);
  assert.equal(asRec((cfg.stackSplitLowerModulesConfiguration as AnyRecord[])[1]).extDrawersCount, 0);
  assert.equal(asRec((corner.modulesConfiguration as AnyRecord[])[0]).doors, '7');
  assert.equal(asRec((lowerCorner.modulesConfiguration as AnyRecord[])[1]).extDrawersCount, 0);

  asRec(sourceRoot.ui.raw).width = 999;
  asRec(sourceRoot.runtime.overlay).open = false;
  asRec(sourceRoot.mode.opts).focus = { id: 'mutated' };
  (asRec(sourceRoot.config.savedColors)[0] as AnyRecord).value = '#000000';
  (asRec((sourceRoot.config.modulesConfiguration as AnyRecord[])[0]).customData as AnyRecord).storage = false;
  asRec((sourceRoot.config.stackSplitLowerModulesConfiguration as AnyRecord[])[0]).extDrawersCount = 99;
  asRec((asRec(sourceRoot.config.cornerConfiguration).modulesConfiguration as AnyRecord[])[0]).doors = 88;
  (asRec(sourceRoot.meta.tags)[0] as AnyRecord).id = 'changed';

  assert.equal(asRec(asRec(st.ui).raw).width, 220);
  assert.equal(asRec(asRec(st.runtime).overlay).open, true);
  assert.equal(asRec(asRec(st.mode).opts).focus.id, 'm1');
  assert.equal(asRec((asRec(st.config).savedColors as AnyRecord[])[0]).value, '#ffffff');
  assert.equal(asRec((asRec(st.config).modulesConfiguration as AnyRecord[])[0]).customData.storage, true);
  assert.equal(
    asRec((asRec(st.config).stackSplitLowerModulesConfiguration as AnyRecord[])[0]).extDrawersCount,
    3
  );
  assert.equal(
    asRec((asRec(asRec(st.config).cornerConfiguration).modulesConfiguration as AnyRecord[])[0]).doors,
    '7'
  );
  assert.equal(asRec((asRec(st.meta).tags as AnyRecord[])[0]).id, 't1');
});
