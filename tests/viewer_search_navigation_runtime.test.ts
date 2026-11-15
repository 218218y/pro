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
import type { AppContainer } from '../types/index.js';

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

test('search ranks exact matches, matches multiword Hebrew aliases and never duplicates', () => {
  const results = searchViewerDestinations('זכוכית וילון', undefined, 100);
  assert.ok(results.some(option => option.id === 'glass-curtain'));
  assert.ok(results.some(option => option.id === 'curtain'));
  assert.equal(new Set(results.map(option => option.id)).size, results.length);
  assert.equal(searchViewerDestinations('גובה מראה')[0]?.id, 'mirror-height');
  assert.equal(searchViewerDestinations('ארון הזזה')[0]?.id, 'type-sliding');
  assert.equal(normalizeViewerSearchText('מַרְאָה–וִילוֹן'), 'מראה וילון');
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
  closest() {
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
