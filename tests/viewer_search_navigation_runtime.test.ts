import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  VIEWER_SEARCH_DESTINATIONS,
  findViewerSearchDestination,
  normalizeViewerSearchText,
  searchViewerDestinations,
  validateViewerSearchCatalog,
  type ViewerSearchDestination,
} from '../esm/native/ui/react/viewer_search_catalog.js';
import {
  advanceViewerSearchNavigation,
  revealViewerSearchTarget,
} from '../esm/native/ui/react/viewer_search_scroll.js';
import {
  navigateToViewerSearchDestination,
  subscribeViewerSearchNavigation,
} from '../esm/native/ui/react/viewer_search_navigation.js';
import type { AppContainer, RootStateLike } from '../types/index.js';
import {
  INTERIOR_LAYOUT_TYPES,
  INTERIOR_MANUAL_TOOLS,
} from '../esm/native/ui/react/tabs/interior_tab_local_state_shared.js';
import { SHELF_VARIANT_OPTIONS } from '../esm/native/ui/react/tabs/interior_layout_shelf_variant_options.js';
import {
  selectViewerSearchContext,
  viewerSearchContextKeys,
} from '../esm/native/ui/react/viewer_search_context.js';

function destination(id: string): ViewerSearchDestination {
  const value = findViewerSearchDestination(id);
  assert.ok(value, `missing destination ${id}`);
  return value;
}

test('catalog has one unique ID per real option, including the two door-count contexts', () => {
  validateViewerSearchCatalog();
  const ids = VIEWER_SEARCH_DESTINATIONS.map(option => option.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 130);
  assert.notEqual(destination('cell-door-count').tab, destination('design-cell-door-count').tab);
});

test('curved door shapes are searchable and reveal the matching editor', () => {
  for (const [tool, label] of [
    ['cut', 'חיתוך דלת'],
    ['groove', 'חריטה'],
    ['mirror', 'מראה'],
  ] as const) {
    for (const [shape, name] of [
      ['arch', 'קשת למעלה'],
      ['arch-down', 'קשת למטה'],
      ['arch-both', 'שתי קשתות'],
      ['ellipse', 'אליפסה'],
    ] as const) {
      const id = `${tool}-shape-${shape}`;
      if (tool === 'cut' && (shape === 'ellipse' || shape === 'arch-both')) {
        assert.equal(findViewerSearchDestination(id), undefined);
        continue;
      }
      assert.ok(searchViewerDestinations(`${label} ${name}`, undefined, 25).some(result => result.id === id));
      const option = destination(id);
      assert.equal(option.selector, `[data-testid="design-${id}"]`);
      assert.ok(option.reveal.length >= 2);
    }
  }
});

test('search ranks exact matches, matches multiword Hebrew aliases and never duplicates', () => {
  const results = searchViewerDestinations('זכוכית וילון', undefined, 100);
  assert.ok(results.some(option => option.id === 'glass-curtain'));
  assert.ok(results.some(option => option.id === 'curtain'));
  assert.equal(new Set(results.map(option => option.id)).size, results.length);
  assert.equal(searchViewerDestinations('גובה מראה')[0]?.id, 'mirror-height');
  assert.equal(searchViewerDestinations('ארון הזזה')[0]?.id, 'type-sliding');
  assert.equal(normalizeViewerSearchText('מַרְאָה–וִילוֹן'), 'מראה וילון');
});

test('broad subjects lead to their main controls before dependent or contextual settings', () => {
  for (const [query, id] of Object.entries({
    רגליים: 'base',
    בסיס: 'base',
    במה: 'leg-platform',
    מראה: 'mirror',
    זכוכית: 'glass-curtain',
    וילון: 'curtain',
    מדפים: 'manual-shelves',
    ידיות: 'handles',
    שידה: 'chest',
    ספריה: 'library',
    חריטות: 'grooves',
    קירות: 'room-architecture',
    חלונות: 'room-window',
    צבע: 'front-color',
    תאורה: 'light-control',
    גיבוי: 'backup',
  }))
    assert.equal(searchViewerDestinations(query)[0]?.id, id, query);
  assert.deepEqual(
    searchViewerDestinations('רגליים')
      .slice(0, 5)
      .map(entry => entry.id),
    ['base', 'leg-style', 'leg-color', 'leg-height', 'leg-width']
  );
  assert.equal(searchViewerDestinations('גובה רגליים')[0]?.id, 'leg-height');
  assert.equal(searchViewerDestinations('בליטת במה')[0]?.id, 'leg-platform-side');
  assert.equal(searchViewerDestinations('צבע וילון ורוד')[0]?.id, 'curtain-pink');
});

test('every preset and Sketch shelf tool is searchable through its actual UI control', () => {
  const presets = INTERIOR_LAYOUT_TYPES.filter(option => option.group === 'presets');
  const sketchTools = INTERIOR_MANUAL_TOOLS;
  for (const option of presets) {
    const route = destination(`preset-${option.id}`);
    assert.equal(route.tab, 'interior');
    assert.equal(route.selector, `[data-testid="interior-layout-${option.id}"]`);
    assert.deepEqual(route.reveal, [
      { selector: '[data-testid="interior-layout-method-presets"]', action: 'activate' },
    ]);
    assert.ok(searchViewerDestinations(option.label, undefined, 100).some(entry => entry.id === route.id));
    assert.ok(searchViewerDestinations('תבניות').some(entry => entry.id === route.id));
  }
  for (const option of sketchTools) {
    const gridRoute = destination(`manual-${option.id === 'shelf' ? 'shelves' : option.id}`);
    assert.equal(gridRoute.tab, 'interior');
    assert.equal(gridRoute.selector, `[data-testid="interior-manual-tool-${option.id}-button"]`);
    assert.deepEqual(gridRoute.reveal, [
      { selector: '[data-testid="interior-layout-method-grid"]', action: 'activate' },
    ]);
    const route = destination(`sketch-${option.id}`);
    assert.equal(route.tab, 'sketch');
    assert.equal(
      route.selector,
      `[data-testid="sketch-shelf-tool-${option.id === 'shelf' ? 'main' : option.id}"]`
    );
    assert.equal(route.reveal.length, 0);
  }
  for (const option of SHELF_VARIANT_OPTIONS) {
    const route = destination(`sketch-shelf-${option.variant}`);
    assert.equal(route.tab, 'sketch');
    assert.equal(route.selector, `[data-testid="sketch-shelf-tool-${option.variant}"]`);
    assert.deepEqual(route.reveal, [
      { selector: '[data-testid="sketch-shelf-tool-main"]', action: 'activate' },
    ]);
  }
  assert.equal(destination('sketch-boring').selector, '[data-testid="sketch-layout-full_boring"]');
  assert.equal(
    destination('sketch-storage-height').selector,
    '[data-testid="interior-sketch-storage-height-input"]'
  );
  assert.deepEqual(
    ['sketch-rod', 'manual-rod'].map(
      id => searchViewerDestinations('מוט תלייה').find(item => item.id === id)?.id
    ),
    ['sketch-rod', 'manual-rod']
  );
  assert.deepEqual(
    ['sketch-storage', 'manual-storage', 'preset-storage'].map(
      id => searchViewerDestinations('אוגר מצעים').find(item => item.id === id)?.id
    ),
    ['sketch-storage', 'manual-storage', 'preset-storage']
  );
  assert.ok(searchViewerDestinations('מדפים').some(entry => entry.id === 'preset-shelves'));
  assert.ok(searchViewerDestinations('תלייה כפולה').some(entry => entry.id === 'preset-hanging_split'));
  assert.ok(searchViewerDestinations('משולב').some(entry => entry.id === 'preset-mixed'));
  assert.ok(searchViewerDestinations('מדף זכוכית').some(entry => entry.id === 'sketch-shelf-glass'));
  assert.equal(searchViewerDestinations('מוט תלייה')[0]?.id, 'sketch-rod');
});

test('word prefixes support unfinished queries without matching word interiors or entire tabs', () => {
  assert.ok(searchViewerDestinations('רגל').some(entry => entry.id === 'base'));
  assert.equal(searchViewerDestinations('יבוי').length, 0);
  assert.ok(!searchViewerDestinations('מבנה', undefined, 200).some(entry => entry.id === 'leg-height'));
  assert.equal(searchViewerDestinations('מַרְאָה')[0]?.id, 'mirror');
  for (const route of VIEWER_SEARCH_DESTINATIONS) {
    assert.ok(
      searchViewerDestinations(route.label, undefined, 200).some(entry => entry.id === route.id),
      route.id
    );
  }
});

function searchContext(ui: RootStateLike['ui'], config: RootStateLike['config'] = {}) {
  return viewerSearchContextKeys(selectViewerSearchContext({ ui, config } as RootStateLike));
}

test('availability follows wardrobe state and the canonical single-door derivation', () => {
  const hinged = searchContext({ raw: { doors: 4 } });
  assert.equal(searchViewerDestinations('מסילות הזזה', undefined, 100, hinged).length, 0);
  assert.equal(searchViewerDestinations('מיקום דלת בודדת', undefined, 100, hinged).length, 0);
  const odd = searchContext({ raw: { doors: 3 } });
  assert.equal(searchViewerDestinations('מיקום דלת בודדת', undefined, 100, odd)[0]?.id, 'single-door');
  assert.ok(odd.has('hinge-direction'));
  const custom = searchContext({ raw: { doors: 4 }, structureSelect: '[1, 3]' });
  assert.ok(custom.has('hinge-direction'));
  const sliding = searchContext({ raw: { doors: 2 } }, { wardrobeType: 'sliding' });
  assert.equal(searchViewerDestinations('מסילות הזזה', undefined, 100, sliding)[0]?.id, 'sliding-tracks');
  assert.equal(searchViewerDestinations('מגירות חיצוניות', undefined, 100, sliding).length, 0);
  const chestContext = searchContext({ raw: { doors: 0 }, isChestMode: true });
  assert.equal(searchViewerDestinations('חלוקת פנים', undefined, 100, chestContext).length, 0);
  assert.equal(searchViewerDestinations('מוט תלייה', undefined, 100, chestContext).length, 0);
  assert.equal(searchViewerDestinations('תבנית מדפים', undefined, 100, chestContext).length, 0);
  assert.ok(searchViewerDestinations('מסילות למגירות', undefined, 100, chestContext).length);
  const noMain = searchContext({ raw: { doors: 0 } });
  assert.ok(
    searchViewerDestinations('רגליים', undefined, 100, noMain).every(route => route.tab === 'sketch')
  );
  assert.ok(
    searchViewerDestinations('רגליים', undefined, 100, noMain).some(route => route.id === 'box-base')
  );
  assert.equal(searchViewerDestinations('קירות', undefined, 100, noMain)[0]?.id, 'room-architecture');
  const cornerOnly = searchContext({ raw: { doors: 0 }, cornerMode: true });
  assert.ok(cornerOnly.has('wardrobe-dimensions'));
  assert.ok(!cornerOnly.has('cabinet'));
  const removedSide = searchContext({ raw: { doors: 4 } }, { removedDoorsMap: { removed_body_left: true } });
  assert.equal(searchViewerDestinations('מדפים צדדיים', undefined, 100, hinged).length, 0);
  assert.equal(
    searchViewerDestinations('מדפים צדדיים', undefined, 100, removedSide)[0]?.id,
    'rounded-shelves'
  );
});

test('all room routes belong to Sketch and respect its allowed-tab boundary', () => {
  for (const id of ['room-architecture', 'room-openings', 'room-window', 'room-door']) {
    const route = destination(id);
    assert.equal(route.tab, 'sketch');
    assert.ok(searchViewerDestinations(route.label, new Set(['sketch']), 100).some(entry => entry.id === id));
    assert.ok(
      !searchViewerDestinations(route.label, new Set(['settings']), 100).some(entry => entry.id === id)
    );
  }
});

test('site2 filters out inaccessible tabs from suggestions', () => {
  const tabs = new Set(['structure', 'design'] as const);
  assert.ok(
    searchViewerDestinations('מראה', tabs, 100).every(option =>
      tabs.has(option.tab as 'structure' | 'design')
    )
  );
  assert.equal(searchViewerDestinations('גיבוי', tabs).length, 0);
});

test('mirror and glass dimensions are scoped to different cards and expose required reveal steps', () => {
  const mirror = destination('mirror-height');
  const glass = destination('glass-height');
  assert.notEqual(mirror.selector, glass.selector);
  assert.match(mirror.selector, /search-card="mirror"/);
  assert.match(glass.selector, /search-card="glass"/);
  assert.equal(mirror.reveal.length, 2);
  assert.equal(glass.reveal.length, 2);
  assert.ok(destination('curtain').reveal.some(step => step.selector.includes('glass_curtain')));
});

class FakeElement {
  classList = {
    values: new Set<string>(),
    contains: (value: string) => this.classList.values.has(value),
    add: (value: string) => this.classList.values.add(value),
    remove: (value: string) => this.classList.values.delete(value),
  };
  attributes = new Map<string, string>();
  clicks = 0;
  exposed = true;
  rect = { top: 0, height: 24 };
  offsetWidth = 100;
  ownerDocument: { defaultView: any };
  constructor(view: any) {
    this.ownerDocument = { defaultView: view };
  }
  getClientRects() {
    return this.exposed ? [this.rect] : [];
  }
  closest(): FakeElement | null {
    return null;
  }
  getAttribute(key: string) {
    return this.attributes.get(key) ?? null;
  }
  getBoundingClientRect() {
    return this.rect;
  }
  click() {
    this.clicks++;
  }
}
class FakeInput extends FakeElement {
  checked = false;
  override click() {
    this.checked = !this.checked;
    super.click();
  }
}
const view = {
  HTMLInputElement: FakeInput,
  setTimeout: () => 1,
  clearTimeout: () => {},
};

function panelWith(elements: Record<string, FakeElement>) {
  return { querySelector: (selector: string) => elements[selector] ?? null } as unknown as HTMLElement;
}

test('nested mirror route checks multicolor, activates the mirror swatch, then finds the exact input', () => {
  const route = destination('mirror-height');
  const toggle = new FakeInput(view);
  const swatch = new FakeElement(view);
  const target = new FakeElement(view);
  const elements: Record<string, FakeElement> = {
    [route.reveal[0].selector]: toggle,
    [route.reveal[1].selector]: swatch,
  };
  const panel = panelWith(elements);
  const acted = new Set<number>();
  assert.equal(advanceViewerSearchNavigation(panel, route, acted).progress, 'waiting');
  assert.equal(toggle.checked, true);
  assert.equal(advanceViewerSearchNavigation(panel, route, acted).progress, 'waiting');
  assert.equal(swatch.clicks, 1);
  swatch.classList.add('is-selected');
  elements[route.selector] = target;
  const resolved = advanceViewerSearchNavigation(panel, route, acted);
  assert.equal(resolved.progress, 'found');
  assert.equal(resolved.target, target);
  assert.equal(target.clicks, 0, 'navigation must never modify a destination field');
});

test('texture expands its React panel once; drawer placement enables its own section first', () => {
  const texture = destination('texture');
  const button = new FakeElement(view);
  const elements: Record<string, FakeElement> = { [texture.reveal[0].selector]: button };
  const acted = new Set<number>();
  assert.equal(advanceViewerSearchNavigation(panelWith(elements), texture, acted).progress, 'waiting');
  assert.equal(button.clicks, 1);
  advanceViewerSearchNavigation(panelWith(elements), texture, acted);
  assert.equal(button.clicks, 1, 'must wait for the React commit rather than toggle closed');
  button.attributes.set('aria-expanded', 'true');
  elements[texture.selector] = new FakeElement(view);
  assert.equal(advanceViewerSearchNavigation(panelWith(elements), texture, acted).progress, 'found');
  const drawers = destination('internal-drawer-mode');
  const toggle = new FakeInput(view);
  advanceViewerSearchNavigation(panelWith({ [drawers.reveal[0].selector]: toggle }), drawers, new Set());
  assert.equal(toggle.checked, true);
});

test('search highlights a visible ToggleRow without changing its checkbox value', () => {
  const row = new FakeElement(view);
  const toggle = new FakeInput(view);
  toggle.closest = (selector?: string) => (selector === '.wp-r-toggle-row' ? row : null);
  const route = destination('internal-drawers');
  const result = advanceViewerSearchNavigation(panelWith({ [route.selector]: toggle }), route, new Set());
  assert.equal(result.target, row);
  assert.equal(toggle.checked, false);
  assert.equal(toggle.clicks, 0);
});

test('glass dimensions keep an existing frosted-glass editor instead of switching it to black', () => {
  const route = destination('glass-height');
  const toggle = new FakeInput(view);
  toggle.checked = true;
  const fallback = new FakeElement(view);
  const activeFrostedField = new FakeElement(view);
  const panel = panelWith({
    [route.reveal[0].selector]: toggle,
    [route.reveal[1].selector]: fallback,
    [route.selector]: activeFrostedField,
  });
  assert.equal(advanceViewerSearchNavigation(panel, route, new Set()).progress, 'found');
  assert.equal(fallback.clicks, 0, 'existing frosted-glass configuration must not be overwritten');
  assert.equal(
    advanceViewerSearchNavigation(
      panelWith({ [route.reveal[0].selector]: toggle, [route.reveal[1].selector]: fallback }),
      route,
      new Set()
    ).progress,
    'waiting'
  );
  assert.equal(fallback.clicks, 1, 'fallback may reveal the editor if no glass editor exists');
});

test('base platform nested search reveals both legs and stage without clicking the result', () => {
  const route = destination('leg-platform-side');
  assert.equal(route.reveal.length, 2);
  const legs = new FakeElement(view);
  const stage = new FakeElement(view);
  const target = new FakeElement(view);
  const elements = {
    [route.reveal[0].selector]: legs,
    [route.reveal[1].selector]: stage,
    [route.selector]: target,
  };
  const acted = new Set<number>();
  assert.equal(advanceViewerSearchNavigation(panelWith(elements), route, acted).progress, 'waiting');
  assert.equal(legs.clicks, 1);
  legs.attributes.set('aria-pressed', 'true');
  assert.equal(advanceViewerSearchNavigation(panelWith(elements), route, acted).progress, 'waiting');
  assert.equal(stage.clicks, 1);
  stage.attributes.set('aria-pressed', 'true');
  assert.equal(advanceViewerSearchNavigation(panelWith(elements), route, acted).progress, 'found');
  assert.equal(target.clicks, 0);
});

test('grid shelf search must switch from sketch context even if the same tool button exists in both', () => {
  const route = destination('manual-shelves');
  const method = new FakeElement(view);
  const shelf = new FakeElement(view);
  const panel = panelWith({ [route.reveal[0].selector]: method, [route.selector]: shelf });
  assert.equal(advanceViewerSearchNavigation(panel, route, new Set()).progress, 'waiting');
  assert.equal(method.clicks, 1, 'must activate grid rather than falsely scroll to sketch shelf tool');
});

test('preset and Sketch tool navigation reveals the right method without activating the final choice', () => {
  const preset = destination('preset-hanging_split');
  const method = new FakeElement(view);
  const choice = new FakeElement(view);
  const controls: Record<string, FakeElement> = { [preset.reveal[0].selector]: method };
  const acted = new Set<number>();
  assert.equal(advanceViewerSearchNavigation(panelWith(controls), preset, acted).progress, 'waiting');
  assert.equal(method.clicks, 1);
  method.attributes.set('aria-pressed', 'true');
  controls[preset.selector] = choice;
  assert.equal(advanceViewerSearchNavigation(panelWith(controls), preset, acted).progress, 'found');
  assert.equal(choice.clicks, 0);

  const sketch = destination('sketch-shelf-glass');
  const main = new FakeElement(view);
  const variant = new FakeElement(view);
  const sketchControls: Record<string, FakeElement> = { [sketch.reveal[0].selector]: main };
  const sketchActed = new Set<number>();
  assert.equal(
    advanceViewerSearchNavigation(panelWith(sketchControls), sketch, sketchActed).progress,
    'waiting'
  );
  assert.equal(main.clicks, 1);
  main.attributes.set('aria-pressed', 'true');
  sketchControls[sketch.selector] = variant;
  assert.equal(
    advanceViewerSearchNavigation(panelWith(sketchControls), sketch, sketchActed).progress,
    'found'
  );
  assert.equal(variant.clicks, 0);
  const rod = destination('sketch-rod');
  const rodButton = new FakeElement(view);
  assert.equal(
    advanceViewerSearchNavigation(panelWith({ [rod.selector]: rodButton }), rod, new Set()).progress,
    'found'
  );
  assert.equal(rodButton.clicks, 0);
});

test('lazy or conditionally absent target waits; it never falls back to an unrelated control', () => {
  const route = destination('glass-height');
  const panel = panelWith({});
  assert.equal(advanceViewerSearchNavigation(panel, route, new Set()).progress, 'waiting');
  const standalone = destination('drawer-runners');
  assert.equal(advanceViewerSearchNavigation(panel, standalone, new Set()).progress, 'waiting');
});

test('shelf conversion search opens sketch placement and selects the shelf tool, without stale details controls', () => {
  const route = destination('shelf-conversion');
  const sketch = new FakeElement(view);
  const shelf = new FakeElement(view);
  const target = new FakeElement(view);
  const controls: Record<string, FakeElement> = {
    [route.reveal[0].selector]: sketch,
    [route.reveal[1].selector]: shelf,
  };
  const acted = new Set<number>();
  assert.equal(advanceViewerSearchNavigation(panelWith(controls), route, acted).progress, 'waiting');
  assert.equal(sketch.clicks, 1);
  sketch.attributes.set('aria-pressed', 'true');
  assert.equal(advanceViewerSearchNavigation(panelWith(controls), route, acted).progress, 'waiting');
  assert.equal(shelf.clicks, 1);
  shelf.attributes.set('aria-pressed', 'true');
  controls[route.selector] = target;
  assert.equal(advanceViewerSearchNavigation(panelWith(controls), route, acted).progress, 'found');
  assert.equal(target.clicks, 0);
  assert.equal(destination('shelf-boring').selector, '[data-testid="interior-layout-full_boring"]');
});

test('scroll reveals exact child rather than tab top and applies transient highlighting', () => {
  const scroller = new FakeElement(view) as unknown as HTMLElement;
  const target = new FakeElement(view) as unknown as HTMLElement;
  scroller.scrollTop = 250;
  Object.defineProperty(scroller, 'clientHeight', { value: 400 });
  (scroller as any).rect = { top: 90, height: 400 };
  (target as any).rect = { top: 690, height: 30 };
  const dispose = revealViewerSearchTarget(scroller, target);
  assert.equal(scroller.scrollTop, 665);
  assert.equal(target.classList.contains('wp-r-search-target-flash'), true);
  dispose();
  assert.equal(target.classList.contains('wp-r-search-target-flash'), false);
});

test('app-scoped one-shot navigation delivers once and unsubscribes cleanly', () => {
  const app = {} as AppContainer;
  const otherApp = {} as AppContainer;
  const events: string[] = [];
  const unsub = subscribeViewerSearchNavigation(app, route => events.push(route.id));
  navigateToViewerSearchDestination(otherApp, destination('mirror'));
  navigateToViewerSearchDestination(app, destination('mirror'));
  unsub();
  navigateToViewerSearchDestination(app, destination('glass-curtain'));
  assert.deepEqual(events, ['mirror']);
});
test('missing authoring features are searchable and matching results are not silently capped', () => {
  for (const [query, id] of Object.entries({
    'הוספת קופסא': 'box-add',
    'הוספת קופסה': 'box-add',
    'מחיצה שוכבת': 'box-horizontal-divider',
    'מחיצה עומדת': 'box-divider',
    מחיצה: 'box-divider',
    'הוספת מחיצה שוכבת': 'box-horizontal-divider',
    'פסי עיטור לדלת': 'door-trim',
    'פס עיטור שוכב': 'door-trim-horizontal',
    'בסיס לקופסא': 'box-base',
    'קרניז לקופסא': 'box-cornice',
    'מגירות נעליים': 'sketch-drawers-shoe',
    'מיקום ידיות ידני': 'handle-manual-position',
    'צבע קירות': 'wall-color',
    פרקט: 'floor-type',
    עמוד: 'room-column',
  }))
    assert.equal(searchViewerDestinations(query)[0]?.id, id, query);
  const all = searchViewerDestinations('קופסא');
  assert.ok(all.length > 12, 'a broad query must expose every match through the scrollable results');
  assert.ok(all.some(route => route.id === 'box-cornice-type'));
  assert.equal(searchViewerDestinations('קופסא', undefined, 3).length, 3);
  const sketchOnly = searchViewerDestinations('קופסא', new Set(['sketch']));
  assert.ok(sketchOnly.every(route => route.tab === 'sketch'));
});
