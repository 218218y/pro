import { readFile } from 'node:fs/promises';
import { expect, type Download, type Locator, type Page } from '@playwright/test';

export type RuntimeIssueCollector = {
  readonly pageErrors: string[];
  readonly consoleErrors: string[];
};

export type PerfMetricSummary = {
  count: number;
  okCount?: number;
  errorCount?: number;
  markCount?: number;
  errorRate?: number;
  averageMs?: number;
  p95Ms?: number;
  lastStatus?: 'ok' | 'error' | 'mark' | null;
  lastError?: string;
};

export type ProjectActionEventName = 'load' | 'save' | 'reset-default' | 'restore-last-session';

export type ProjectActionEventDetail = {
  action?: ProjectActionEventName;
  ok?: boolean;
  pending?: boolean;
  reason?: string;
  message?: string;
  restoreGen?: number;
  at?: number;
};

export type UiStateFingerprint = {
  projectName: string;
  savedColorCount: number;
  savedColorValues: string[];
  wardrobeType: string;
  boardMaterial: string;
  doorStyle: string;
  groovesEnabled: boolean;
  grooveLinesCount: number | null;
  splitDoors: boolean;
  removeDoorsEnabled: boolean;
  internalDrawersEnabled: boolean;
};

export type BuildDebugReasonStats = {
  requestCount: number;
  executeCount: number;
  immediateRequestCount: number;
  debouncedRequestCount: number;
  executeImmediateCount: number;
  executeDebouncedCount: number;
};

export type BuildDebugStats = {
  requestCount: number;
  immediateRequestCount: number;
  debouncedRequestCount: number;
  executeCount: number;
  executeImmediateCount: number;
  executeDebouncedCount: number;
  pendingOverwriteCount: number;
  debouncedScheduleCount: number;
  reusedDebouncedScheduleCount: number;
  builderWaitScheduleCount: number;
  staleDebouncedTimerFireCount: number;
  staleBuilderWaitWakeupCount: number;
  duplicatePendingSignatureCount: number;
  skippedDuplicatePendingRequestCount: number;
  skippedSatisfiedRequestCount: number;
  repeatedExecuteCount: number;
  skippedRepeatedExecuteCount: number;
  lastRequestReason: string;
  lastExecuteReason: string;
  reasons: Record<string, BuildDebugReasonStats>;
};

export type RenderDebugStats = {
  renderRequestCount: number;
  triggerRenderCount: number;
  fallbackTriggerCount: number;
  ensureRenderLoopCount: number;
  noOpRenderRequestCount: number;
  wakeupRequestCount: number;
  wakeupEnsureRenderLoopCount: number;
  noOpWakeupCount: number;
  activityTouchCount: number;
  afterTouchCount: number;
  ensureRenderLoopAfterTriggerCount: number;
};

export type BuildAndRenderDelta = {
  build: BuildDebugStats;
  render: RenderDebugStats;
};

export type StructureBaseFingerprint = {
  wardrobeType: string;
  boardMaterial: string;
  doors: number;
  width: number;
  height: number;
  depth: number;
};

export type StructureStackSplitFingerprint = StructureBaseFingerprint & {
  stackSplitEnabled: boolean;
  stackSplitLowerHeight: number | null;
  stackSplitLowerDepth: number | null;
  stackSplitLowerWidth: number | null;
  stackSplitLowerDoors: number | null;
};

export type ModuleSpecialDimsSnapshot = {
  moduleIndex: number;
  doors: number | null;
  widthCm: number | null;
  baseWidthCm: number | null;
  heightCm: number | null;
  baseHeightCm: number | null;
  depthCm: number | null;
  baseDepthCm: number | null;
};

export type MeasureBuildAndRenderDeltaOptions = {
  minBuildRequests?: number;
  minBuildExecutes?: number;
  minRenderRequests?: number;
  minRenderFollowThroughs?: number;
  timeoutMs?: number;
};

export type DebugNdcPoint = {
  x: number;
  y: number;
};

type CanvasClientPoint = {
  x: number;
  y: number;
};

type DebugCanvasHitSnapshot = {
  x: number;
  y: number;
  moduleIndex: string | number | null;
  moduleStack: 'top' | 'bottom';
  partId: string | null;
  moduleHitY: number | null;
  isCellDimsMode: boolean;
};

const LINEAR_CELL_DIMS_NDC_X_CANDIDATES = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75] as const;
const LINEAR_CELL_DIMS_NDC_Y_CANDIDATES = [0.75, 0.55, 0.35, 0.15, -0.05, -0.25, -0.45, -0.65] as const;

const DEFAULT_LINEAR_CELL_DIMS_NDC_CANDIDATES: readonly DebugNdcPoint[] =
  LINEAR_CELL_DIMS_NDC_Y_CANDIDATES.flatMap(y => LINEAR_CELL_DIMS_NDC_X_CANDIDATES.map(x => ({ x, y })));

const APP_STORAGE_KEYS_RESET_BEFORE_SMOKE_NAVIGATION = [
  'wardrobeSavedColors',
  'wardrobeSavedColors:order',
  'wardrobeSavedModels',
  'wardrobeSavedModels:order',
  'wardrobeSavedModels:presetOrder',
  'wardrobeSavedModels:hiddenPresets',
  'wp_private_room',
  'WP_CLOUDSYNC_DIAG',
  'wp_floating_sketch_sync_pin',
  'wp_site2_tabs_gate_open',
  'wp_site2_tabs_gate_until',
] as const;

const APP_SESSION_STORAGE_KEYS_RESET_BEFORE_SMOKE_NAVIGATION = ['wp_cloud_sync_client_id'] as const;

const SMOKE_APP_GOTO_TIMEOUT_MS = 45_000;
const SMOKE_APP_SHELL_TIMEOUT_MS = 30_000;
const CLOUD_SYNC_REST_ISOLATION_INSTALLED = new WeakSet<Page>();

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readFiniteNumber(value: unknown): number | null {
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : Number.NaN;
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeModuleSpecialDimsSnapshot(
  moduleValue: unknown,
  moduleIndex: number
): ModuleSpecialDimsSnapshot | null {
  const moduleRecord = asRecord(moduleValue);
  const specialDims = asRecord(moduleRecord.specialDims);
  const hasAnySpecialDims = Object.keys(specialDims).length > 0;
  if (!hasAnySpecialDims) return null;

  return {
    moduleIndex,
    doors: readFiniteNumber(moduleRecord.doors),
    widthCm: readFiniteNumber(specialDims.widthCm),
    baseWidthCm: readFiniteNumber(specialDims.baseWidthCm),
    heightCm: readFiniteNumber(specialDims.heightCm),
    baseHeightCm: readFiniteNumber(specialDims.baseHeightCm),
    depthCm: readFiniteNumber(specialDims.depthCm),
    baseDepthCm: readFiniteNumber(specialDims.baseDepthCm),
  };
}

function buildSmokeAppUrl(): string {
  const room = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `/index_pro.html?room=${encodeURIComponent(room)}`;
}

async function installCloudSyncRestIsolation(page: Page): Promise<void> {
  if (CLOUD_SYNC_REST_ISOLATION_INSTALLED.has(page)) return;

  await page.route('**/rest/v1/**', async route => {
    const request = route.request();
    const url = request.url();
    if (!url.includes('/rest/v1/')) {
      await route.continue();
      return;
    }

    const method = String(request.method() || 'GET').toUpperCase();
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
      return;
    }

    if (method === 'POST') {
      let payload: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(String(request.postData() || '[]'));
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && typeof parsed[0] === 'object') {
          payload = parsed[0] as Record<string, unknown>;
        }
      } catch {
        payload = null;
      }

      const prefer = String(request.headers().prefer || '');
      const wantsRepresentation = prefer.includes('return=representation');
      const responseBody =
        wantsRepresentation && payload
          ? JSON.stringify([
              {
                room: typeof payload.room === 'string' ? payload.room : '',
                payload: payload.payload && typeof payload.payload === 'object' ? payload.payload : {},
                updated_at: new Date().toISOString(),
              },
            ])
          : '';

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: responseBody,
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  CLOUD_SYNC_REST_ISOLATION_INSTALLED.add(page);
}

export function collectRuntimeIssues(page: Page): RuntimeIssueCollector {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  return { pageErrors, consoleErrors };
}

export function expectNoRuntimeIssues(issues: RuntimeIssueCollector): void {
  expect(issues.pageErrors, `Page errors:\n${issues.pageErrors.join('\n')}`).toEqual([]);
  expect(issues.consoleErrors, `Console errors:\n${issues.consoleErrors.join('\n')}`).toEqual([]);
}

export async function gotoSmokeApp(page: Page): Promise<void> {
  await installCloudSyncRestIsolation(page);
  await page.addInitScript(
    ({ localKeys, sessionKeys }) => {
      try {
        for (const key of localKeys as string[]) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // ignore unavailable storage in browser contexts
      }
      try {
        for (const key of sessionKeys as string[]) {
          window.sessionStorage.removeItem(key);
        }
      } catch {
        // ignore unavailable storage in browser contexts
      }
    },
    {
      localKeys: [...APP_STORAGE_KEYS_RESET_BEFORE_SMOKE_NAVIGATION],
      sessionKeys: [...APP_SESSION_STORAGE_KEYS_RESET_BEFORE_SMOKE_NAVIGATION],
    }
  );
  await page.goto(buildSmokeAppUrl(), { waitUntil: 'load', timeout: SMOKE_APP_GOTO_TIMEOUT_MS });
  await page.evaluate(() => {
    const win = window as typeof window & {
      __WP_PROJECT_ACTION_EVENTS__?: ProjectActionEventDetail[];
      __WP_PROJECT_ACTION_RECORDER_INSTALLED__?: boolean;
    };
    win.__WP_PROJECT_ACTION_EVENTS__ = [];
    if (win.__WP_PROJECT_ACTION_RECORDER_INSTALLED__) return;
    window.addEventListener('wardrobepro:project-action', event => {
      const detail = ((event as CustomEvent).detail || {}) as ProjectActionEventDetail;
      win.__WP_PROJECT_ACTION_EVENTS__?.push({ ...detail });
    });
    win.__WP_PROJECT_ACTION_RECORDER_INSTALLED__ = true;
  });
  await expectAppShellReady(page);
}

export async function expectAppShellReady(page: Page): Promise<void> {
  const viewer = page.locator('#viewer-container');
  await expect(viewer).toBeVisible({ timeout: SMOKE_APP_SHELL_TIMEOUT_MS });
  await expect(viewer.locator('canvas').first()).toBeVisible({ timeout: SMOKE_APP_SHELL_TIMEOUT_MS });
  await expect(page.locator('#reactSidebarRoot')).toBeVisible({ timeout: SMOKE_APP_SHELL_TIMEOUT_MS });
  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          const root = document.getElementById('reactSidebarRoot');
          return root ? root.childElementCount : 0;
        }),
      { timeout: SMOKE_APP_SHELL_TIMEOUT_MS }
    )
    .toBeGreaterThan(0);
  await expect(
    page.locator('#reactSidebarRoot .tab[role="button"][data-tab="structure"]').first()
  ).toBeVisible({
    timeout: SMOKE_APP_SHELL_TIMEOUT_MS,
  });
  await waitForTwoAnimationFrames(page);
}

async function waitForTwoAnimationFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>(resolve => {
        const finish = () => resolve();
        if (typeof window.requestAnimationFrame !== 'function') {
          queueMicrotask(finish);
          return;
        }
        window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
      })
  );
}

async function waitForUiSettledAfterProjectAction(page: Page): Promise<void> {
  await expectAppShellReady(page);
  await expect(
    page.locator('#reactSidebarRoot .tab[role="button"][aria-pressed="true"]').first()
  ).toBeVisible();
  await expect(
    page.locator('#reactSidebarRoot .tab-content.active[aria-hidden="false"]').first()
  ).toBeVisible();
  await waitForTwoAnimationFrames(page);
}

type MainTabId = 'structure' | 'design' | 'interior' | 'render' | 'export';

function getMainTabButton(page: Page, id: MainTabId): Locator {
  return page.locator(`#reactSidebarRoot .tab[role="button"][data-tab="${id}"]:visible`).last();
}

function getStickyEditModeToast(page: Page): Locator {
  return page.locator('#stickyStatusToast.active').first();
}

function getActiveTabPanelAnchor(page: Page, id: MainTabId): Locator {
  switch (id) {
    case 'structure':
      return page.locator('#reactSidebarRoot input[name="width"]:visible').last();
    case 'design':
      return page.locator('#reactSidebarRoot [data-testid="design-color-section"]:visible').first();
    case 'interior':
      return page.locator('#reactSidebarRoot .wp-r-intdrawer-toggle:visible').last();
    case 'render':
      return page
        .locator('#reactSidebarRoot .control-section:has(input[data-testid="toggle-sketch-mode"]):visible')
        .last();
    case 'export':
      return page.locator('#reactSidebarRoot button[data-testid="export-snapshot-button"]:visible').last();
  }
}

function getActiveTabPanel(page: Page, id: MainTabId): Locator {
  return page.locator(`#reactSidebarRoot .tab-content[data-tab="${id}"]`).last();
}

function getStructureTypeRow(page: Page): Locator {
  return getActiveTabPanel(page, 'structure')
    .locator('[data-testid="structure-type-row"], .wp-r-wardrobe-type-row')
    .first();
}

function getBoardMaterialRow(page: Page): Locator {
  return getActiveTabPanel(page, 'structure')
    .locator('[data-testid="structure-board-material-row"], .wp-r-wardrobe-material-row')
    .first();
}

function getStructureCornerSection(page: Page): Locator {
  return getActiveTabPanel(page, 'structure').locator('[data-testid="structure-corner-section"]').first();
}

function getStructureChestSection(page: Page): Locator {
  return getActiveTabPanel(page, 'structure').locator('[data-testid="structure-chest-section"]').first();
}

function getStructureLibrarySection(page: Page): Locator {
  return getActiveTabPanel(page, 'structure').locator('[data-testid="structure-library-section"]').first();
}

function getStructureStackSplitSection(page: Page): Locator {
  return getActiveTabPanel(page, 'structure')
    .locator('[data-testid="structure-stack-split-section"]')
    .first();
}

function getStructureCellDimsSection(page: Page): Locator {
  return getActiveTabPanel(page, 'structure').locator('[data-testid="structure-cell-dims-section"]').first();
}

function getStructureCornerModeToggleInput(page: Page): Locator {
  return getStructureCornerSection(page).locator('input[data-testid="structure-corner-mode-toggle"]').first();
}

function getStructureChestModeToggleInput(page: Page): Locator {
  return getStructureChestSection(page).locator('input[data-testid="structure-chest-mode-toggle"]').first();
}

function getStructureCornerSideButton(page: Page): Locator {
  return getStructureCornerSection(page)
    .locator('button[data-testid="structure-corner-side-button"]')
    .first();
}

function getStructureLibraryModeButton(page: Page): Locator {
  return getStructureLibrarySection(page)
    .locator('button[data-testid="structure-library-mode-button"]')
    .first();
}

function getStructureStackSplitModeButton(page: Page): Locator {
  return getStructureStackSplitSection(page)
    .locator('button[data-testid="structure-stack-split-mode-button"]')
    .first();
}

function getStructureCellDimsModeButton(page: Page): Locator {
  return getStructureCellDimsSection(page)
    .locator('button[data-testid="structure-cell-dims-mode-button"]')
    .first();
}

function getStructureCellDimsResetButton(page: Page): Locator {
  return getStructureCellDimsSection(page)
    .locator('button[data-testid="structure-cell-dims-reset-button"]')
    .first();
}

function getVisibleStructureInput(page: Page, name: string): Locator {
  return getActiveTabPanel(page, 'structure').locator(`input[name="${name}"]:visible`).last();
}

function getDoorStyleSection(page: Page): Locator {
  return getActiveTabPanel(page, 'design').locator('[data-testid="design-door-style-section"]').first();
}

function getDoorFeaturesSection(page: Page): Locator {
  return getActiveTabPanel(page, 'design').locator('[data-testid="design-door-features-section"]').first();
}

function getInteriorPanel(page: Page): Locator {
  return page.locator('#reactSidebarRoot .tab-content[data-tab="interior"]:visible').last();
}

function getInteriorExternalDrawersCard(page: Page): Locator {
  return page.locator('#reactSidebarRoot [data-testid="interior-external-drawers-card"]:visible').last();
}

function getInteriorInternalDrawersCard(page: Page): Locator {
  return page.locator('#reactSidebarRoot [data-testid="interior-internal-drawers-card"]:visible').last();
}

async function resolveStructureTypeButton(page: Page, type: 'sliding' | 'hinged'): Promise<Locator> {
  const panel = getActiveTabPanel(page, 'structure');
  const preferred = panel.locator(
    `button[data-testid="structure-type-${type}-button"], button[data-structure-type="${type}"]`
  );
  if ((await preferred.count()) > 0) return preferred.first();

  const label = type === 'hinged' ? 'פתיחה' : 'הזזה';
  const byRole = getStructureTypeRow(page).getByRole('button', { name: label, exact: true });
  if ((await byRole.count()) > 0) return byRole.first();

  return getStructureTypeRow(page)
    .locator('button')
    .nth(type === 'hinged' ? 0 : 1);
}

async function resolveBoardMaterialButton(page: Page, material: 'melamine' | 'sandwich'): Promise<Locator> {
  const panel = getActiveTabPanel(page, 'structure');
  const preferred = panel.locator(
    `button[data-testid="structure-board-material-${material}-button"], button[data-board-material="${material}"]`
  );
  if ((await preferred.count()) > 0) return preferred.first();

  const label = material === 'sandwich' ? "סנדביץ'" : 'מלמין';
  const byRole = getBoardMaterialRow(page).getByRole('button', { name: label, exact: true });
  if ((await byRole.count()) > 0) return byRole.first();

  return getBoardMaterialRow(page)
    .locator('button')
    .nth(material === 'sandwich' ? 0 : 1);
}

async function resolveDoorStyleButton(page: Page, style: 'profile' | 'tom' | 'post'): Promise<Locator> {
  const optionId = style === 'post' ? 'flat' : style;
  const section = getDoorStyleSection(page);
  const preferred = section.locator(
    `button[data-testid="design-door-style-${optionId}-button"], button[data-option-id="${optionId}"]`
  );
  if ((await preferred.count()) > 0) return preferred.first();

  const label = style === 'post' ? 'פוסט' : style === 'profile' ? 'פרופיל' : 'פרופיל תום';
  const byRole = section.getByRole('button', { name: label, exact: true });
  if ((await byRole.count()) > 0) return byRole.first();

  return section.locator('button').nth(style === 'post' ? 0 : style === 'profile' ? 1 : 2);
}

function readDoorFeatureToggleTestId(key: 'groovesEnabled' | 'splitDoors' | 'removeDoorsEnabled'): string {
  return key === 'groovesEnabled'
    ? 'design-grooves-toggle'
    : key === 'splitDoors'
      ? 'design-split-doors-toggle'
      : 'design-remove-doors-toggle';
}

function getDoorFeatureToggleInput(
  page: Page,
  key: 'groovesEnabled' | 'splitDoors' | 'removeDoorsEnabled'
): Locator {
  return getDoorFeaturesSection(page)
    .locator(`input[data-testid="${readDoorFeatureToggleTestId(key)}"]`)
    .first();
}

function readDoorAuthoringModeButtonTestId(key: 'groove' | 'split' | 'split-custom' | 'remove-door'): string {
  return key === 'groove'
    ? 'design-groove-mode-button'
    : key === 'split'
      ? 'design-split-mode-button'
      : key === 'split-custom'
        ? 'design-split-custom-mode-button'
        : 'design-remove-door-mode-button';
}

function getDoorAuthoringModeButton(
  page: Page,
  key: 'groove' | 'split' | 'split-custom' | 'remove-door'
): Locator {
  return getDoorFeaturesSection(page)
    .locator(`button[data-testid="${readDoorAuthoringModeButtonTestId(key)}"]`)
    .first();
}

function getInternalDrawersToggleInput(page: Page): Locator {
  return page
    .locator(
      '#reactSidebarRoot .tab-content[data-tab="interior"]:visible input[data-testid="interior-internal-drawers-toggle"]'
    )
    .last();
}

function getInternalDrawersModeButton(page: Page): Locator {
  return getInteriorInternalDrawersCard(page)
    .locator('button[data-testid="interior-internal-drawers-mode-button"]')
    .first();
}

function getExternalDrawerTypeButton(page: Page, type: 'shoe' | 'regular'): Locator {
  return page
    .locator(`#reactSidebarRoot button[data-testid="interior-external-drawers-${type}-button"]:visible`)
    .last();
}

function getExternalDrawerCountButton(page: Page, count: number): Locator {
  return page
    .locator(
      `#reactSidebarRoot button[data-testid="interior-external-drawers-count-${count}-button"]:visible`
    )
    .last();
}

function normalizeFingerprintColorValue(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

type ButtonSelectionFallback = {
  readonly byText?: Record<string, string>;
  readonly byIndex?: readonly string[];
};

function normalizeOptionButtonText(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readSelectedButtonValue(
  buttons: Locator,
  attributeName: string,
  fallback: ButtonSelectionFallback = {}
): Promise<string> {
  const result = await buttons.evaluateAll(
    (nodes, payload) => {
      const buttonsOnly = nodes.filter(node => node instanceof HTMLElement) as HTMLElement[];
      const selectedIndex = buttonsOnly.findIndex(node => {
        const ariaPressed = node.getAttribute('aria-pressed');
        return (
          ariaPressed === 'true' || node.classList.contains('selected') || node.classList.contains('active')
        );
      });
      const fallbackIndex = selectedIndex >= 0 ? selectedIndex : buttonsOnly.length === 1 ? 0 : -1;
      const target = fallbackIndex >= 0 ? buttonsOnly[fallbackIndex] : null;
      if (!target) return { attr: '', text: '', index: fallbackIndex };
      return {
        attr: String(target.getAttribute(String(payload.attributeName)) || '').trim(),
        text: String(target.textContent || '')
          .replace(/\s+/g, ' ')
          .trim(),
        index: fallbackIndex,
      };
    },
    { attributeName }
  );
  if (result.attr) return String(result.attr);

  const normalizedText = normalizeOptionButtonText(result.text);
  if (normalizedText && fallback.byText) {
    const mapped = fallback.byText[normalizedText];
    if (mapped) return mapped;
  }
  if (result.index >= 0 && fallback.byIndex?.[result.index]) {
    return String(fallback.byIndex[result.index] || '');
  }
  return '';
}

async function setLabeledCheckboxState(root: Locator, labelText: string, checked: boolean): Promise<void> {
  const input = root.getByLabel(labelText, { exact: true }).first();
  await setCheckboxInputState(input, checked);
}

async function setCheckboxInputState(input: Locator, checked: boolean): Promise<void> {
  await expect(input).toHaveCount(1);
  const label = input.locator('xpath=ancestor::label[1]').first();
  await expect(label).toBeVisible();
  const current = await input.isChecked();
  if (current !== checked) {
    await label.click();
  }
  await expectCheckboxState(input, checked);
}

async function readOptionalCheckboxState(input: Locator): Promise<boolean> {
  return (await input.count()) > 0 ? await input.first().isChecked() : false;
}

async function isLocatorVisible(locator: Locator): Promise<boolean> {
  if ((await locator.count()) === 0) return false;
  try {
    return await locator.first().isVisible();
  } catch {
    return false;
  }
}

async function isButtonSelected(button: Locator): Promise<boolean> {
  if ((await button.count()) === 0) return false;
  return await button.first().evaluate(node => {
    const className = String(node.getAttribute('class') || '');
    const ariaPressed = node.getAttribute('aria-pressed');
    return (
      /\bselected\b/.test(className) ||
      /\bis-selected\b/.test(className) ||
      /\bactive\b/.test(className) ||
      ariaPressed === 'true'
    );
  });
}

async function setButtonSelectedState(button: Locator, selected: boolean): Promise<void> {
  await expect(button).toBeVisible();
  if ((await isButtonSelected(button)) !== selected) {
    await button.click();
  }
  await expect.poll(async () => await isButtonSelected(button)).toBe(selected);
}

async function clickButtonAndExpectSelected(button: Locator): Promise<void> {
  await setButtonSelectedState(button, true);
}

async function readOptionalInputNumber(input: Locator): Promise<number | null> {
  if ((await input.count()) === 0) return null;
  const rawValue = String(await input.first().inputValue()).trim();
  if (!rawValue) return null;
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export async function installClipboardCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const win = window as typeof window & {
      __WP_TEST_CLIPBOARD_WRITES__?: Array<{ count: number; at: number }>;
      ClipboardItem?: new (items: Record<string, Promise<Blob> | Blob>) => unknown;
    };

    win.__WP_TEST_CLIPBOARD_WRITES__ = [];

    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          write: async (items: ClipboardItems | ArrayLike<unknown>) => {
            const list = Array.from(items || []);
            win.__WP_TEST_CLIPBOARD_WRITES__?.push({ count: list.length, at: Date.now() });
          },
        },
      });
    } catch {
      // ignore sandbox clipboard override failures
    }

    if (typeof win.ClipboardItem !== 'function') {
      class FakeClipboardItem {
        items: Record<string, Promise<Blob> | Blob>;

        constructor(items: Record<string, Promise<Blob> | Blob>) {
          this.items = items;
        }
      }

      Object.defineProperty(win, 'ClipboardItem', {
        configurable: true,
        writable: true,
        value: FakeClipboardItem,
      });
    }
  });
}

async function clickMainTabButton(page: Page, id: MainTabId): Promise<void> {
  const tabBtn = getMainTabButton(page, id);
  await expect(tabBtn).toBeVisible();
  try {
    await tabBtn.click({ timeout: 5000 });
  } catch {
    await waitForTwoAnimationFrames(page);
    await expect(tabBtn).toBeVisible();
    await tabBtn.click({ timeout: 5000 });
  }
}

export async function openMainTab(page: Page, id: MainTabId): Promise<void> {
  const tabBtn = getMainTabButton(page, id);
  const anchor = getActiveTabPanelAnchor(page, id);
  await expect(tabBtn).toBeVisible();

  const isReady = async (): Promise<boolean> => await isLocatorVisible(anchor);

  if ((await tabBtn.getAttribute('aria-pressed')) !== 'true' || !(await isReady())) {
    await clickMainTabButton(page, id);
  }

  await expect.poll(async () => await isReady()).toBe(true);
  await expect(anchor).toBeVisible();
}

async function expectCheckboxState(input: Locator, expected: boolean): Promise<void> {
  if (expected) {
    await expect(input).toBeChecked();
    return;
  }
  await expect(input).not.toBeChecked();
}

async function dismissStickyEditModeToastIfPresent(page: Page): Promise<void> {
  const toast = getStickyEditModeToast(page);
  if ((await toast.count()) === 0) return;
  await toast.click();
  await expect(page.locator('#stickyStatusToast.active')).toHaveCount(0);
}

export async function waitForProjectActionEvent(
  page: Page,
  action: ProjectActionEventName
): Promise<ProjectActionEventDetail> {
  return await page.evaluate(
    expectedAction =>
      new Promise(resolve => {
        const timer = window.setTimeout(
          () => resolve({ action: expectedAction, ok: false, reason: 'timeout' }),
          10000
        );
        const onAction = (event: Event) => {
          const detail = ((event as CustomEvent).detail || {}) as ProjectActionEventDetail;
          if (detail.action !== expectedAction) return;
          window.clearTimeout(timer);
          window.removeEventListener('wardrobepro:project-action', onAction as EventListener);
          resolve(detail);
        };
        window.addEventListener('wardrobepro:project-action', onAction as EventListener);
      }),
    action
  );
}

export async function toggleSwitchByTestId(root: Locator, testId: string): Promise<void> {
  const input = root.locator(`input[data-testid="${testId}"]`);
  await expect(input).toHaveCount(1);

  const label = input.locator('xpath=..');
  await expect(label).toBeVisible();

  const before = await input.isChecked();
  await label.click();
  await expectCheckboxState(input, !before);

  await label.click();
  await expectCheckboxState(input, before);
}

export function getVisibleProjectNameInput(page: Page): Locator {
  return page.locator('#reactSidebarRoot input[data-testid="project-name-input"]:visible').last();
}

export function getAnyProjectNameInput(page: Page): Locator {
  return page.locator('input[data-testid="project-name-input"]').last();
}

export async function fillProjectName(page: Page, value: string): Promise<void> {
  await openMainTab(page, 'structure');
  const projectNameInput = getVisibleProjectNameInput(page);
  await expect(projectNameInput).toBeVisible();
  await projectNameInput.fill(value);
  await projectNameInput.blur();
  await expect(projectNameInput).toHaveValue(value);
}

export async function saveProjectViaHeader(
  page: Page,
  fileBaseName: string
): Promise<{ download: Download; detail: ProjectActionEventDetail }> {
  const saveButton = page.locator('button[data-testid="header-project-save-button"]');
  await expect(saveButton).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  const saveEventPromise = waitForProjectActionEvent(page, 'save');
  await saveButton.click();

  const promptModal = page.locator('#customPromptModal.open');
  await expect(promptModal).toBeVisible();
  const modalInput = page.locator('#modalInput');
  await modalInput.fill(fileBaseName);
  await page.locator('#modalConfirmBtn').click();
  await expect
    .poll(
      async () => await page.locator('#customPromptModal').evaluate(node => node.classList.contains('open'))
    )
    .toBe(false);

  const [download, detail] = await Promise.all([downloadPromise, saveEventPromise]);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  return { download, detail };
}

export async function loadProjectViaHeader(page: Page, filePath: string): Promise<ProjectActionEventDetail> {
  const loadButton = page.locator('button[data-testid="header-project-load-button"]');
  const loadInput = page.locator('input[data-testid="header-project-load-input"]');

  await expect(loadButton).toBeVisible();
  await expect(loadInput).toHaveCount(1);

  const loadEventPromise = waitForProjectActionEvent(page, 'load');
  await loadButton.click();
  await loadInput.setInputFiles(filePath);
  const detail = await loadEventPromise;
  await waitForUiSettledAfterProjectAction(page);
  return detail;
}

export async function readSavedProjectPayload(filePath: string): Promise<Record<string, unknown>> {
  const payloadText = await readFile(filePath, 'utf8');
  return JSON.parse(payloadText) as Record<string, unknown>;
}

export async function readDebugStoreState(page: Page): Promise<Record<string, unknown>> {
  const state = await page.evaluate(() => window.__WP_DEBUG__?.store?.getState?.() || null);
  if (!state) throw new Error('Expected __WP_DEBUG__.store.getState() during E2E smoke');
  return state as Record<string, unknown>;
}

export async function inspectCanvasViaDebugNdc(
  page: Page,
  point: DebugNdcPoint
): Promise<DebugCanvasHitSnapshot | null> {
  return (await page.evaluate(
    candidate => window.__WP_DEBUG__?.canvas?.inspectNdc?.(candidate.x, candidate.y) || null,
    point
  )) as DebugCanvasHitSnapshot | null;
}

export async function clickCanvasViaDebugNdc(page: Page, point: DebugNdcPoint): Promise<void> {
  const clicked = await page.evaluate(
    candidate => window.__WP_DEBUG__?.canvas?.clickNdc?.(candidate.x, candidate.y) || false,
    point
  );
  if (!clicked) throw new Error('Expected __WP_DEBUG__.canvas.clickNdc() during E2E smoke');
  await waitForTwoAnimationFrames(page);
}

async function resolveCanvasClientPointForNdc(
  page: Page,
  point: DebugNdcPoint
): Promise<CanvasClientPoint | null> {
  const canvas = page.locator('#viewer-container canvas').first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box || !(box.width > 0) || !(box.height > 0)) return null;

  const clientPoint = {
    x: box.x + ((point.x + 1) / 2) * box.width,
    y: box.y + ((1 - point.y) / 2) * box.height,
  };
  const canvasReceivesPointer = await page.evaluate(({ x, y }) => {
    const canvasEl = document.querySelector('#viewer-container canvas');
    const hitEl = document.elementFromPoint(x, y);
    return !!canvasEl && !!hitEl && (hitEl === canvasEl || canvasEl.contains(hitEl));
  }, clientPoint);

  return canvasReceivesPointer ? clientPoint : null;
}

async function readCanvasCursor(page: Page): Promise<string> {
  const canvas = page.locator('#viewer-container canvas').first();
  return await canvas.evaluate(node => {
    const el = node as HTMLElement;
    return el.style.cursor || window.getComputedStyle(el).cursor || '';
  });
}

async function waitForCanvasPointerCursor(page: Page, timeoutMs = 1500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await readCanvasCursor(page)) === 'pointer') return true;
    await page.waitForTimeout(50);
  }
  return (await readCanvasCursor(page)) === 'pointer';
}

async function clickCanvasViaBrowserPointerNdc(page: Page, point: DebugNdcPoint): Promise<boolean> {
  const clientPoint = await resolveCanvasClientPointForNdc(page, point);
  if (!clientPoint) return false;

  await page.mouse.move(clientPoint.x, clientPoint.y);
  await waitForTwoAnimationFrames(page);
  if (!(await waitForCanvasPointerCursor(page))) return false;

  await page.mouse.down();
  await page.mouse.up();
  await waitForTwoAnimationFrames(page);
  return true;
}

function isLinearModuleHitInStack(
  hit: DebugCanvasHitSnapshot | null,
  stack: 'top' | 'bottom'
): hit is DebugCanvasHitSnapshot & { moduleIndex: number } {
  return (
    !!hit &&
    hit.moduleStack === stack &&
    typeof hit.moduleIndex === 'number' &&
    Number.isInteger(hit.moduleIndex)
  );
}

function describeCanvasHitCandidate(point: DebugNdcPoint, hit: DebugCanvasHitSnapshot | null): string {
  const prefix = `(${point.x},${point.y})`;
  if (!hit) return `${prefix}=none`;
  return `${prefix}=${String(hit.moduleStack)}:${String(hit.moduleIndex)}:${String(hit.partId || '')}`;
}

export async function confirmActiveModal(page: Page): Promise<void> {
  const modal = page.locator('#customPromptModal');
  await expect(modal).toBeVisible();
  await expect(modal).toHaveClass(/open/);
  const confirmButton = page.locator('#modalConfirmBtn');
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await expect.poll(async () => await modal.evaluate(node => node.classList.contains('open'))).toBe(false);
}

export async function resetProjectViaHeader(
  page: Page,
  previousProjectName: string
): Promise<ProjectActionEventDetail> {
  const resetButton = page.locator('button[data-testid="header-reset-default-button"]');
  const projectNameInput = getVisibleProjectNameInput(page);

  await expect(resetButton).toBeVisible();
  await expect(projectNameInput).toBeVisible();
  const resetEventPromise = waitForProjectActionEvent(page, 'reset-default');
  await resetButton.click();
  await confirmActiveModal(page);
  const detail = await resetEventPromise;
  expect(detail.ok, `Reset action failed: ${JSON.stringify(detail)}`).toBe(true);
  await expect(projectNameInput).toHaveValue('');
  await expect(projectNameInput).not.toHaveValue(previousProjectName);
  return detail;
}

export async function openOrderPdfOverlayFromExport(page: Page): Promise<void> {
  const openButton = page.locator('button[data-testid="export-open-pdf-button"]');
  await expect(openButton).toBeVisible();
  await openButton.click();
  await expect(page.locator('[data-testid="order-pdf-overlay"]')).toBeVisible();
}

export async function openOrderPdfOverlayFromHeader(page: Page): Promise<void> {
  const openButton = page.locator('button[data-testid="header-open-pdf-button"]');
  await expect(openButton).toBeVisible();
  await openButton.click();
  await expect(page.locator('[data-testid="order-pdf-overlay"]')).toBeVisible();
}

export async function closeOrderPdfOverlay(page: Page): Promise<void> {
  const closeButton = page.locator('button[data-testid="order-pdf-close-button"]');
  await expect(closeButton).toBeVisible();
  await closeButton.click();
  await expect(page.locator('[data-testid="order-pdf-overlay"]')).toHaveCount(0);
  await waitForTwoAnimationFrames(page);
  await expect(page.locator('#reactSidebarRoot .tab[role="button"]').first()).toBeVisible();
}

export async function expectOrderPdfOverlayToolbar(page: Page): Promise<void> {
  const ids = [
    'order-pdf-refresh-button',
    'order-pdf-load-button',
    'order-pdf-download-button',
    'order-pdf-print-button',
    'order-pdf-gmail-button',
    'order-pdf-download-gmail-button',
    'order-pdf-toggle-render-sketch',
    'order-pdf-toggle-open-closed',
    'order-pdf-close-button',
  ] as const;

  for (const id of ids) {
    await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
  }
}

export async function expectExportSurface(page: Page): Promise<void> {
  await openMainTab(page, 'export');

  const ids = [
    'export-snapshot-button',
    'export-copy-button',
    'export-render-sketch-button',
    'export-dual-image-button',
    'export-open-pdf-button',
  ] as const;

  for (const id of ids) {
    await expect(page.locator(`button[data-testid="${id}"]`)).toBeVisible();
  }
}

export async function expectSettingsBackupPanel(page: Page): Promise<void> {
  const ids = [
    'settings-backup-export-button',
    'settings-backup-import-button',
    'settings-backup-import-input',
  ] as const;

  for (const id of ids) {
    await expect(page.locator(`[data-testid="${id}"]`)).toHaveCount(1);
  }
}

export async function expectCloudSyncPanel(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="cloud-sync-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="cloud-sync-status"]')).toBeVisible();

  const ids = [
    'cloud-sync-room-mode-button',
    'cloud-sync-copy-link-button',
    'cloud-sync-sync-sketch-button',
    'cloud-sync-delete-models-button',
    'cloud-sync-delete-colors-button',
    'cloud-sync-floating-pin-toggle',
  ] as const;

  for (const id of ids) {
    await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
  }
}

export async function toggleCloudSyncFloatingPin(page: Page): Promise<void> {
  const input = page.locator('input[data-testid="cloud-sync-floating-pin-toggle"]');
  await expect(input).toHaveCount(1);
  const before = await input.isChecked();
  const label = input.locator('xpath=..');
  await expect(label).toBeVisible();
  await label.click();
  await expectCheckboxState(input, !before);
}

export async function syncCloudSyncSketchFromPanel(page: Page): Promise<void> {
  await openMainTab(page, 'export');
  await expectCloudSyncPanel(page);
  const beforeCount = (await readPerfSummary(page))['cloudSync.syncSketch']?.count || 0;
  const button = page.locator('button[data-testid="cloud-sync-sync-sketch-button"]');
  await expect(button).toBeVisible();
  await button.click();
  await expectPerfMetricCount(page, 'cloudSync.syncSketch', beforeCount + 1);
}

export async function exportSnapshotFromExport(page: Page): Promise<Download> {
  const button = page.locator('button[data-testid="export-snapshot-button"]');
  await expect(button).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await button.click();
  return await downloadPromise;
}

export async function exportSettingsBackup(page: Page): Promise<Download> {
  const button = page.locator('button[data-testid="settings-backup-export-button"]');
  await expect(button).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await button.click();
  return await downloadPromise;
}

function normalizeDesignColorValue(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

async function setColorInputValue(input: Locator, value: string): Promise<void> {
  await input.evaluate((node, nextValue) => {
    const element = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (typeof setter === 'function') setter.call(element, String(nextValue || ''));
    else element.value = String(nextValue || '');
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }, value);
  await expect(input).toHaveValue(value);
  await input.evaluate(
    () =>
      new Promise<void>(resolve => {
        const finish = () => resolve();
        if (typeof window.requestAnimationFrame !== 'function') {
          queueMicrotask(finish);
          return;
        }
        window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
      })
  );
}

export function getSavedDesignColorSwatch(page: Page, value: string): Locator {
  const normalized = normalizeDesignColorValue(value);
  return page.locator(
    `#reactSidebarRoot [data-testid="design-color-swatch-item"][data-color-kind="saved"][data-color-value="${normalized}"]`
  );
}

export async function countSavedDesignColorSwatches(page: Page): Promise<number> {
  await openMainTab(page, 'design');
  return await page
    .locator('#reactSidebarRoot [data-testid="design-color-swatch-item"][data-color-kind="saved"]')
    .count();
}

export async function readSavedDesignColorValues(page: Page): Promise<string[]> {
  await openMainTab(page, 'design');
  const values = await page
    .locator('#reactSidebarRoot [data-testid="design-color-swatch-item"][data-color-kind="saved"]')
    .evaluateAll(nodes =>
      nodes
        .map(node =>
          String((node as HTMLElement).dataset.colorValue || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    );
  return values.slice().sort((left, right) => left.localeCompare(right));
}

export async function readUiStateFingerprint(page: Page): Promise<UiStateFingerprint> {
  await openMainTab(page, 'structure');
  const projectName = await getVisibleProjectNameInput(page).inputValue();
  const wardrobeType = await readSelectedButtonValue(
    getStructureTypeRow(page).locator('button'),
    'data-structure-type',
    {
      byText: { פתיחה: 'hinged', הזזה: 'sliding' },
      byIndex: ['hinged', 'sliding'],
    }
  );
  const boardMaterial = await readSelectedButtonValue(
    getBoardMaterialRow(page).locator('button'),
    'data-board-material',
    {
      byText: { "סנדביץ'": 'sandwich', מלמין: 'melamine' },
      byIndex: ['sandwich', 'melamine'],
    }
  );
  const savedColorValues = (await readSavedDesignColorValues(page)).map(normalizeFingerprintColorValue);

  await openMainTab(page, 'design');
  const doorStyle = await readSelectedButtonValue(
    getDoorStyleSection(page).locator('button'),
    'data-option-id',
    {
      byText: { פוסט: 'flat', פרופיל: 'profile', 'פרופיל תום': 'tom' },
      byIndex: ['flat', 'profile', 'tom'],
    }
  );
  const grooveLinesInput = getDoorFeaturesSection(page)
    .locator('input[data-testid="design-groove-lines-input"]')
    .first();
  const grooveLinesValue =
    (await grooveLinesInput.count()) > 0 ? String(await grooveLinesInput.inputValue()).trim() : '';

  await openMainTab(page, 'interior');

  return {
    projectName,
    savedColorCount: savedColorValues.length,
    savedColorValues,
    wardrobeType,
    boardMaterial,
    doorStyle,
    groovesEnabled: await readOptionalCheckboxState(getDoorFeatureToggleInput(page, 'groovesEnabled')),
    grooveLinesCount: grooveLinesValue
      ? Math.max(1, Math.floor(Number(grooveLinesValue) || 0)) || null
      : null,
    splitDoors: await readOptionalCheckboxState(getDoorFeatureToggleInput(page, 'splitDoors')),
    removeDoorsEnabled: await readOptionalCheckboxState(
      getDoorFeatureToggleInput(page, 'removeDoorsEnabled')
    ),
    internalDrawersEnabled: await readOptionalCheckboxState(getInternalDrawersToggleInput(page)),
  };
}

export async function expectUiStateFingerprint(
  page: Page,
  expected: UiStateFingerprint,
  message?: string
): Promise<void> {
  const actual = await readUiStateFingerprint(page);
  expect(actual, message || 'UI state fingerprint mismatch').toEqual(expected);
}

export async function addSavedDesignColor(page: Page, value: string): Promise<string> {
  await openMainTab(page, 'design');
  const normalized = normalizeDesignColorValue(value);
  const toggle = page.locator('button[data-testid="design-custom-color-toggle"]');
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }

  const input = page.locator('input[data-testid="design-custom-color-input"]');
  await expect(input).toBeVisible();
  await setColorInputValue(input, normalized);
  await expect(
    page.locator('#reactSidebarRoot [data-testid="design-color-section"]:visible')
  ).toHaveAttribute('data-draft-color', normalized);

  const beforeCount = (await readPerfSummary(page))['design.savedColor.add']?.count || 0;
  const saveButton = page.locator('button[data-testid="design-custom-color-save-button"]');
  await expect(saveButton).toBeVisible();
  await saveButton.click();

  const modalInput = page.locator('#modalInput');
  await expect(modalInput).toBeVisible();
  await modalInput.fill(`E2E ${normalized}`);
  await confirmActiveModal(page);

  await expectPerfMetricCount(page, 'design.savedColor.add', beforeCount + 1);
  await expect.poll(async () => (await readSavedDesignColorValues(page)).includes(normalized)).toBe(true);
  const swatch = getSavedDesignColorSwatch(page, normalized);
  await expect(swatch).toHaveCount(1);
  await swatch.click();
  await expect(page.locator('[data-testid="design-selected-color-delete-button"]')).toBeVisible();
  return normalized;
}

export async function deleteSavedDesignColor(page: Page, value: string): Promise<void> {
  await openMainTab(page, 'design');
  const swatch = getSavedDesignColorSwatch(page, value);
  await expect(swatch).toHaveCount(1);
  await swatch.click();

  const deleteButton = page.locator('button[data-testid="design-selected-color-delete-button"]');
  await expect(deleteButton).toBeVisible();
  const beforeCount = (await readPerfSummary(page))['design.savedColor.delete']?.count || 0;
  await deleteButton.click();
  await confirmActiveModal(page);
  await expectPerfMetricCount(page, 'design.savedColor.delete', beforeCount + 1);
  await expect(swatch).toHaveCount(0);
}

export type CabinetDoorDrawerAuthoringFingerprint = {
  groovesEnabled: boolean;
  grooveLinesCount: number | null;
  grooveModeActive: boolean;
  splitDoors: boolean;
  splitModeActive: boolean;
  splitCustomModeActive: boolean;
  removeDoorsEnabled: boolean;
  removeDoorModeActive: boolean;
  internalDrawersEnabled: boolean;
  internalDrawerModeActive: boolean;
  extDrawerModeActive: boolean;
  extDrawerType: string;
  extDrawerCount: number | null;
};

export async function setStructureType(page: Page, type: 'sliding' | 'hinged'): Promise<void> {
  await openMainTab(page, 'structure');
  const button = await resolveStructureTypeButton(page, type);
  await clickButtonAndExpectSelected(button);
}

export async function setBoardMaterial(page: Page, material: 'melamine' | 'sandwich'): Promise<void> {
  await openMainTab(page, 'structure');
  const button = await resolveBoardMaterialButton(page, material);
  await clickButtonAndExpectSelected(button);
}

export async function setDoorStyle(page: Page, style: 'profile' | 'tom' | 'post'): Promise<void> {
  await openMainTab(page, 'design');
  const button = await resolveDoorStyleButton(page, style);
  await clickButtonAndExpectSelected(button);
}

export async function setDoorFeatureToggle(
  page: Page,
  key: 'groovesEnabled' | 'splitDoors' | 'removeDoorsEnabled',
  enabled: boolean
): Promise<void> {
  await openMainTab(page, 'design');
  await setCheckboxInputState(getDoorFeatureToggleInput(page, key), enabled);
}

export async function setGrooveLinesCount(page: Page, value: number | null): Promise<void> {
  await openMainTab(page, 'design');
  const input = getDoorFeaturesSection(page)
    .locator('input[data-testid="design-groove-lines-input"]')
    .first();
  await expect(input).toHaveCount(1);
  const nextValue = value == null ? '' : String(Math.max(1, Math.floor(value)));
  await input.fill(nextValue);
  await input.blur();
  await expect(input).toHaveValue(nextValue);
}

async function clickDoorFeatureModeButton(button: Locator, expectedActive: boolean): Promise<void> {
  await expect(button).toBeVisible();
  if ((await isButtonSelected(button)) !== expectedActive) await button.click();
  await expect.poll(async () => await isButtonSelected(button)).toBe(expectedActive);
}

export async function setDoorAuthoringMode(
  page: Page,
  key: 'groove' | 'split' | 'split-custom' | 'remove-door',
  active: boolean
): Promise<void> {
  await openMainTab(page, 'design');
  await clickDoorFeatureModeButton(getDoorAuthoringModeButton(page, key), active);
  if (!active) await dismissStickyEditModeToastIfPresent(page);
}

export async function setInternalDrawersEnabled(page: Page, enabled: boolean): Promise<void> {
  await openMainTab(page, 'interior');
  await setCheckboxInputState(getInternalDrawersToggleInput(page), enabled);
}

export async function setInternalDrawerMode(page: Page, active: boolean): Promise<void> {
  await openMainTab(page, 'interior');
  const card = getInteriorInternalDrawersCard(page);
  await expect(card).toBeVisible();
  const button = getInternalDrawersModeButton(page);
  await expect(button).toBeVisible();
  const isActive = /\bselected\b/.test(String((await button.getAttribute('class')) || ''));
  if (isActive !== active) await button.click();
  await expect
    .poll(async () => /\bis-active\b/.test(String((await card.getAttribute('class')) || '')))
    .toBe(active);
  if (!active) await dismissStickyEditModeToastIfPresent(page);
}

export async function setExternalDrawerSelection(
  page: Page,
  type: 'shoe' | 'regular',
  count?: number,
  options?: { exitAfterSelect?: boolean }
): Promise<void> {
  await openMainTab(page, 'interior');
  const card = getInteriorExternalDrawersCard(page);
  await expect(card).toBeVisible();
  const typeButton = getExternalDrawerTypeButton(page, type);
  await expect(typeButton).toBeVisible();
  await typeButton.click();
  await expect
    .poll(async () => /\bis-active\b/.test(String((await card.getAttribute('class')) || '')))
    .toBe(true);
  if (type === 'regular' && Number.isFinite(Number(count)) && Number(count) > 0) {
    const countButton = getExternalDrawerCountButton(page, Math.floor(Number(count)));
    await expect(countButton).toBeVisible();
    await countButton.click();
    await expect(countButton).toHaveClass(/\bis-selected\b/);
  }
  if (options?.exitAfterSelect) {
    const exitButtons = card.locator('button[data-testid="interior-external-drawers-exit-button"]');
    const inactiveNotice = card.locator('.wp-r-note').first();
    if ((await exitButtons.count()) > 0) {
      const exitButton = exitButtons.first();
      await expect(exitButton).toBeVisible();
      await exitButton.click();
    }
    await dismissStickyEditModeToastIfPresent(page);
    await expect
      .poll(async () => {
        const className = String((await card.getAttribute('class')) || '');
        return !/\bis-active\b/.test(className) || (await isLocatorVisible(inactiveNotice));
      })
      .toBe(true);
    await expect(exitButtons).toHaveCount(0);
  }
}

export async function readCabinetDoorDrawerAuthoringFingerprint(
  page: Page
): Promise<CabinetDoorDrawerAuthoringFingerprint> {
  const readOptionalLocatorClass = async (locator: Locator): Promise<string> => {
    if ((await locator.count()) === 0) return '';
    return String((await locator.first().getAttribute('class')) || '');
  };

  await openMainTab(page, 'design');
  const features = getDoorFeaturesSection(page);
  const grooveLinesInput = features.locator('input[data-testid="design-groove-lines-input"]').first();
  const grooveLinesValue =
    (await grooveLinesInput.count()) > 0 ? String(await grooveLinesInput.inputValue()).trim() : '';

  const groovesEnabled = await readOptionalCheckboxState(getDoorFeatureToggleInput(page, 'groovesEnabled'));
  const splitDoors = await readOptionalCheckboxState(getDoorFeatureToggleInput(page, 'splitDoors'));
  const removeDoorsEnabled = await readOptionalCheckboxState(
    getDoorFeatureToggleInput(page, 'removeDoorsEnabled')
  );
  const grooveModeActive = /\bselected\b/.test(
    await readOptionalLocatorClass(getDoorAuthoringModeButton(page, 'groove'))
  );
  const splitModeActive = /\bselected\b/.test(
    await readOptionalLocatorClass(getDoorAuthoringModeButton(page, 'split'))
  );
  const splitCustomModeActive = /\bselected\b/.test(
    await readOptionalLocatorClass(getDoorAuthoringModeButton(page, 'split-custom'))
  );
  const removeDoorModeActive = /\bselected\b/.test(
    await readOptionalLocatorClass(getDoorAuthoringModeButton(page, 'remove-door'))
  );

  await openMainTab(page, 'interior');
  const extCard = getInteriorExternalDrawersCard(page);
  const intCard = getInteriorInternalDrawersCard(page);
  const shoeTypeSelected = /\bselected\b/.test(
    await readOptionalLocatorClass(getExternalDrawerTypeButton(page, 'shoe'))
  );
  const regularTypeSelected = /\bselected\b/.test(
    await readOptionalLocatorClass(getExternalDrawerTypeButton(page, 'regular'))
  );
  let extDrawerCount: number | null = null;
  if (regularTypeSelected) {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      const className = await readOptionalLocatorClass(getExternalDrawerCountButton(page, count));
      if (/\bis-selected\b/.test(className)) {
        extDrawerCount = count;
        break;
      }
    }
  }

  return {
    groovesEnabled,
    grooveLinesCount: grooveLinesValue
      ? Math.max(1, Math.floor(Number(grooveLinesValue) || 0)) || null
      : null,
    grooveModeActive,
    splitDoors,
    splitModeActive,
    splitCustomModeActive,
    removeDoorsEnabled,
    removeDoorModeActive,
    internalDrawersEnabled: await readOptionalCheckboxState(getInternalDrawersToggleInput(page)),
    internalDrawerModeActive: /\bis-active\b/.test(await readOptionalLocatorClass(intCard)),
    extDrawerModeActive: /\bis-active\b/.test(await readOptionalLocatorClass(extCard)),
    extDrawerType: shoeTypeSelected ? 'shoe' : regularTypeSelected ? 'regular' : '',
    extDrawerCount,
  };
}

export async function expectCabinetDoorDrawerAuthoringFingerprint(
  page: Page,
  expected: CabinetDoorDrawerAuthoringFingerprint,
  message?: string
): Promise<void> {
  const actual = await readCabinetDoorDrawerAuthoringFingerprint(page);
  expect(actual, message || 'Cabinet door/drawer authoring fingerprint mismatch').toEqual(expected);
}

export type CabinetCoreFingerprint = UiStateFingerprint & {
  width: number;
  height: number;
  depth: number;
  sketchModeEnabled: boolean;
};

export type StructureCornerFingerprint = {
  cornerMode: boolean;
  cornerSide: 'left' | 'right' | '';
  cornerDoors: number | null;
  cornerWidth: number | null;
  cornerHeight: number | null;
  cornerDepth: number | null;
};

export type StructureChestFingerprint = {
  isChestMode: boolean;
  chestDrawersCount: number | null;
  width: number;
  height: number;
  depth: number;
};

export type StructureLibraryFingerprint = {
  isLibraryMode: boolean;
  width: number;
  height: number;
  depth: number;
};

function getStructureMainInput(page: Page, key: 'doors' | 'width' | 'height' | 'depth'): Locator {
  return getVisibleStructureInput(page, key);
}

export function getStructureDimensionInput(page: Page, key: 'width' | 'height' | 'depth'): Locator {
  return getStructureMainInput(page, key);
}

async function setNumericInputValue(input: Locator, value: number): Promise<void> {
  const expectedValue = String(Math.round(value));
  await expect(input).toBeVisible();
  await input.fill(expectedValue);
  await input.blur();
  await expect(input).toHaveValue(expectedValue);
}

async function setOptionalNumericInputValue(input: Locator, value: number | null): Promise<void> {
  const expectedValue = value == null ? '' : String(Math.round(value));
  await expect(input).toBeVisible();
  await input.fill(expectedValue);
  await input.blur();
  await expect(input).toHaveValue(expectedValue);
}

export async function setStructureDimension(
  page: Page,
  key: 'width' | 'height' | 'depth',
  value: number
): Promise<void> {
  await openMainTab(page, 'structure');
  await setNumericInputValue(getStructureDimensionInput(page, key), value);
}

export async function setStructureDoors(page: Page, value: number): Promise<void> {
  await openMainTab(page, 'structure');
  await setNumericInputValue(getStructureMainInput(page, 'doors'), value);
}

export async function readStructureDimensions(
  page: Page
): Promise<{ width: number; height: number; depth: number }> {
  await openMainTab(page, 'structure');
  const [widthValue, heightValue, depthValue] = await Promise.all([
    getStructureDimensionInput(page, 'width').inputValue(),
    getStructureDimensionInput(page, 'height').inputValue(),
    getStructureDimensionInput(page, 'depth').inputValue(),
  ]);
  return {
    width: Number(widthValue) || 0,
    height: Number(heightValue) || 0,
    depth: Number(depthValue) || 0,
  };
}

export async function readStructureBaseFingerprint(page: Page): Promise<StructureBaseFingerprint> {
  const uiState = await readUiStateFingerprint(page);
  await openMainTab(page, 'structure');
  const dimensions = await readStructureDimensions(page);
  const doorsValue = await getStructureMainInput(page, 'doors').inputValue();
  return {
    wardrobeType: uiState.wardrobeType,
    boardMaterial: uiState.boardMaterial,
    doors: Number(doorsValue) || 0,
    ...dimensions,
  };
}

export async function setCornerMode(page: Page, enabled: boolean): Promise<void> {
  await openMainTab(page, 'structure');
  await setCheckboxInputState(getStructureCornerModeToggleInput(page), enabled);
  if (enabled) {
    await expect(getVisibleStructureInput(page, 'cornerDoors')).toBeVisible();
    return;
  }
  await expect(getActiveTabPanel(page, 'structure').locator('input[name="cornerDoors"]:visible')).toHaveCount(
    0
  );
}

export async function setCornerSide(page: Page, side: 'left' | 'right'): Promise<void> {
  await openMainTab(page, 'structure');
  const sideButton = getStructureCornerSideButton(page);
  await expect(sideButton).toBeVisible();
  if ((await sideButton.getAttribute('data-corner-side')) !== side) {
    await sideButton.click();
  }
  await expect(sideButton).toHaveAttribute('data-corner-side', side);
}

export async function setCornerDimension(
  page: Page,
  key: 'cornerDoors' | 'cornerWidth' | 'cornerHeight' | 'cornerDepth',
  value: number
): Promise<void> {
  await openMainTab(page, 'structure');
  await setNumericInputValue(getVisibleStructureInput(page, key), value);
}

export async function readCornerStructureFingerprint(page: Page): Promise<StructureCornerFingerprint> {
  await openMainTab(page, 'structure');
  const cornerMode = await getStructureCornerModeToggleInput(page).isChecked();
  const sideButton = getStructureCornerSideButton(page);
  const cornerSide =
    cornerMode && (await sideButton.count()) > 0
      ? (await sideButton.getAttribute('data-corner-side')) === 'left'
        ? 'left'
        : 'right'
      : '';

  return {
    cornerMode,
    cornerSide,
    cornerDoors: await readOptionalInputNumber(
      getActiveTabPanel(page, 'structure').locator('input[name="cornerDoors"]:visible')
    ),
    cornerWidth: await readOptionalInputNumber(
      getActiveTabPanel(page, 'structure').locator('input[name="cornerWidth"]:visible')
    ),
    cornerHeight: await readOptionalInputNumber(
      getActiveTabPanel(page, 'structure').locator('input[name="cornerHeight"]:visible')
    ),
    cornerDepth: await readOptionalInputNumber(
      getActiveTabPanel(page, 'structure').locator('input[name="cornerDepth"]:visible')
    ),
  };
}

export async function setChestMode(page: Page, enabled: boolean): Promise<void> {
  await openMainTab(page, 'structure');
  await setCheckboxInputState(getStructureChestModeToggleInput(page), enabled);
  if (enabled) {
    await expect(getVisibleStructureInput(page, 'chestDrawersCount')).toBeVisible();
    return;
  }
  await expect(
    getActiveTabPanel(page, 'structure').locator('input[name="chestDrawersCount"]:visible')
  ).toHaveCount(0);
}

export async function setChestDrawersCount(page: Page, value: number): Promise<void> {
  await openMainTab(page, 'structure');
  await setNumericInputValue(getVisibleStructureInput(page, 'chestDrawersCount'), value);
}

export async function readChestStructureFingerprint(page: Page): Promise<StructureChestFingerprint> {
  const dimensions = await readStructureDimensions(page);
  await openMainTab(page, 'structure');
  return {
    isChestMode: await getStructureChestModeToggleInput(page).isChecked(),
    chestDrawersCount: await readOptionalInputNumber(
      getActiveTabPanel(page, 'structure').locator('input[name="chestDrawersCount"]:visible')
    ),
    ...dimensions,
  };
}

export async function setLibraryMode(page: Page, enabled: boolean): Promise<void> {
  await openMainTab(page, 'structure');
  await setButtonSelectedState(getStructureLibraryModeButton(page), enabled);
}

export async function readLibraryStructureFingerprint(page: Page): Promise<StructureLibraryFingerprint> {
  const dimensions = await readStructureDimensions(page);
  await openMainTab(page, 'structure');
  return {
    isLibraryMode: await isButtonSelected(getStructureLibraryModeButton(page)),
    ...dimensions,
  };
}

export async function setStackSplitEnabled(page: Page, enabled: boolean): Promise<void> {
  await openMainTab(page, 'structure');
  await setButtonSelectedState(getStructureStackSplitModeButton(page), enabled);
  if (enabled) {
    await expect(getVisibleStructureInput(page, 'stackSplitLowerHeight')).toBeVisible();
    return;
  }
  await expect(
    getActiveTabPanel(page, 'structure').locator('input[name="stackSplitLowerHeight"]:visible')
  ).toHaveCount(0);
}

export async function setStackSplitDimension(
  page: Page,
  key: 'stackSplitLowerHeight' | 'stackSplitLowerDepth' | 'stackSplitLowerWidth' | 'stackSplitLowerDoors',
  value: number
): Promise<void> {
  await openMainTab(page, 'structure');
  await setNumericInputValue(getVisibleStructureInput(page, key), value);
}

export async function readStackSplitFingerprint(page: Page): Promise<StructureStackSplitFingerprint> {
  const base = await readStructureBaseFingerprint(page);
  await openMainTab(page, 'structure');
  const stackSplitEnabled = await isButtonSelected(getStructureStackSplitModeButton(page));
  return {
    ...base,
    stackSplitEnabled,
    stackSplitLowerHeight: await readOptionalInputNumber(
      getActiveTabPanel(page, 'structure').locator('input[name="stackSplitLowerHeight"]:visible')
    ),
    stackSplitLowerDepth: await readOptionalInputNumber(
      getActiveTabPanel(page, 'structure').locator('input[name="stackSplitLowerDepth"]:visible')
    ),
    stackSplitLowerWidth: await readOptionalInputNumber(
      getActiveTabPanel(page, 'structure').locator('input[name="stackSplitLowerWidth"]:visible')
    ),
    stackSplitLowerDoors: await readOptionalInputNumber(
      getActiveTabPanel(page, 'structure').locator('input[name="stackSplitLowerDoors"]:visible')
    ),
  };
}

export async function setCellDimsMode(page: Page, enabled: boolean): Promise<void> {
  await openMainTab(page, 'structure');
  await setButtonSelectedState(getStructureCellDimsModeButton(page), enabled);
  if (enabled) {
    await expect(getVisibleStructureInput(page, 'cellDimsWidth')).toBeVisible();
    return;
  }
  await expect(
    getActiveTabPanel(page, 'structure').locator('input[name="cellDimsWidth"]:visible')
  ).toHaveCount(0);
}

export async function setCellDimsDraft(
  page: Page,
  key: 'cellDimsWidth' | 'cellDimsHeight' | 'cellDimsDepth',
  value: number | null
): Promise<void> {
  await openMainTab(page, 'structure');
  await setOptionalNumericInputValue(getVisibleStructureInput(page, key), value);
}

export async function resetAllCellDimsOverrides(page: Page): Promise<void> {
  await openMainTab(page, 'structure');
  await setButtonSelectedState(getStructureCellDimsModeButton(page), true);
  const resetButton = getStructureCellDimsResetButton(page);
  await expect(resetButton).toBeVisible();
  if (await resetButton.isDisabled()) return;
  await resetButton.click();
  await expect(resetButton).toBeDisabled();
  await waitForTwoAnimationFrames(page);
}

export async function readLinearModuleSpecialDims(
  page: Page,
  stack: 'top' | 'bottom' = 'top'
): Promise<ModuleSpecialDimsSnapshot[]> {
  const state = await readDebugStoreState(page);
  const config = asRecord(state.config);
  const modulesValue =
    stack === 'bottom' ? config.stackSplitLowerModulesConfiguration : config.modulesConfiguration;
  const modules = Array.isArray(modulesValue) ? modulesValue : [];
  return modules
    .map((moduleValue, moduleIndex) => normalizeModuleSpecialDimsSnapshot(moduleValue, moduleIndex))
    .filter((value): value is ModuleSpecialDimsSnapshot => value !== null);
}

function matchesModuleSpecialDims(
  snapshot: ModuleSpecialDimsSnapshot,
  expected: Partial<Omit<ModuleSpecialDimsSnapshot, 'moduleIndex' | 'doors'>>
): boolean {
  const keys = Object.keys(expected) as Array<keyof typeof expected>;
  return keys.every(key => snapshot[key as keyof ModuleSpecialDimsSnapshot] === expected[key]);
}

export async function applyCellDimsToReachableLinearModule(
  page: Page,
  expected: Partial<Omit<ModuleSpecialDimsSnapshot, 'moduleIndex' | 'doors'>>,
  options: { stack?: 'top' | 'bottom'; candidates?: readonly DebugNdcPoint[] } = {}
): Promise<ModuleSpecialDimsSnapshot> {
  const stack = options.stack || 'top';
  const before = await readLinearModuleSpecialDims(page, stack);
  const beforeByModule = new Map(before.map(snapshot => [snapshot.moduleIndex, JSON.stringify(snapshot)]));
  const candidates = options.candidates || DEFAULT_LINEAR_CELL_DIMS_NDC_CANDIDATES;
  const scannedHits: string[] = [];

  for (const point of candidates) {
    const hit = await inspectCanvasViaDebugNdc(page, point);
    scannedHits.push(describeCanvasHitCandidate(point, hit));
    if (!isLinearModuleHitInStack(hit, stack)) continue;

    await clickCanvasViaDebugNdc(page, point);
    const after = await readLinearModuleSpecialDims(page, stack);
    const match = after.find(snapshot => {
      const prevSerialized = beforeByModule.get(snapshot.moduleIndex) || '';
      return matchesModuleSpecialDims(snapshot, expected) && JSON.stringify(snapshot) !== prevSerialized;
    });
    if (match) return match;
  }

  throw new Error(
    `Expected cell dims click to apply to a reachable ${stack} module; scanned ${scannedHits.join(', ')}`
  );
}

export async function applyCellDimsToReachableLinearModuleViaBrowserPointer(
  page: Page,
  expected: Partial<Omit<ModuleSpecialDimsSnapshot, 'moduleIndex' | 'doors'>>,
  options: { stack?: 'top' | 'bottom'; candidates?: readonly DebugNdcPoint[] } = {}
): Promise<ModuleSpecialDimsSnapshot> {
  const stack = options.stack || 'top';
  const before = await readLinearModuleSpecialDims(page, stack);
  const beforeByModule = new Map(before.map(snapshot => [snapshot.moduleIndex, JSON.stringify(snapshot)]));
  const candidates = options.candidates || DEFAULT_LINEAR_CELL_DIMS_NDC_CANDIDATES;
  const scannedHits: string[] = [];

  for (const point of candidates) {
    const hit = await inspectCanvasViaDebugNdc(page, point);
    const hitDescription = describeCanvasHitCandidate(point, hit);
    scannedHits.push(hitDescription);
    if (!isLinearModuleHitInStack(hit, stack) || !hit.isCellDimsMode) continue;

    const clicked = await clickCanvasViaBrowserPointerNdc(page, point);
    if (!clicked) {
      scannedHits.push(`${hitDescription}:browser-pointer-miss`);
      continue;
    }

    const after = await readLinearModuleSpecialDims(page, stack);
    const changedExpected = after.find(snapshot => {
      const prevSerialized = beforeByModule.get(snapshot.moduleIndex) || '';
      return matchesModuleSpecialDims(snapshot, expected) && JSON.stringify(snapshot) !== prevSerialized;
    });
    if (!changedExpected) {
      throw new Error(
        `Expected browser pointer click at ${hitDescription} to apply cell dims; no matching module changed`
      );
    }
    if (changedExpected.moduleIndex !== hit.moduleIndex) {
      throw new Error(
        `Expected browser pointer click at ${hitDescription} to update module ${hit.moduleIndex}, but module ${changedExpected.moduleIndex} changed`
      );
    }
    return changedExpected;
  }

  throw new Error(
    `Expected browser pointer hover/click to apply to a reachable ${stack} module; scanned ${scannedHits.join(', ')}`
  );
}

export async function setRenderSketchMode(page: Page, enabled: boolean): Promise<void> {
  await openMainTab(page, 'render');
  const input = getActiveTabPanel(page, 'render').locator('input[data-testid="toggle-sketch-mode"]');
  await expect(input).toHaveCount(1);
  const current = await input.isChecked();
  if (current !== enabled) {
    const label = input.locator('xpath=..');
    await expect(label).toBeVisible();
    await label.click();
  }
  await expectCheckboxState(input, enabled);
}

export async function readCabinetCoreFingerprint(page: Page): Promise<CabinetCoreFingerprint> {
  const uiState = await readUiStateFingerprint(page);
  const dimensions = await readStructureDimensions(page);
  await openMainTab(page, 'render');
  const sketchModeEnabled = await page.locator('input[data-testid="toggle-sketch-mode"]').isChecked();
  return {
    ...uiState,
    ...dimensions,
    sketchModeEnabled,
  };
}

export async function expectCabinetCoreFingerprint(
  page: Page,
  expected: CabinetCoreFingerprint,
  message?: string
): Promise<void> {
  const actual = await readCabinetCoreFingerprint(page);
  expect(actual, message || 'Cabinet core fingerprint mismatch').toEqual(expected);
}

export async function importSettingsBackupFromFile(page: Page, filePath: string): Promise<void> {
  await openMainTab(page, 'export');
  const importButton = page.locator('button[data-testid="settings-backup-import-button"]');
  const importInput = page.locator('input[data-testid="settings-backup-import-input"]');
  await expect(importButton).toBeVisible();
  await expect(importInput).toHaveCount(1);

  const beforeCount = (await readPerfSummary(page))['settingsBackup.import']?.count || 0;
  await importButton.click();
  await importInput.setInputFiles(filePath);
  await confirmActiveModal(page);
  await expectPerfMetricCount(page, 'settingsBackup.import', beforeCount + 1);
}

export async function seedAutosaveStorageFromFile(page: Page, filePath: string): Promise<void> {
  const payloadText = await readFile(filePath, 'utf8');
  await page.evaluate(text => window.localStorage.setItem('wardrobe_autosave_latest', text), payloadText);
}

export async function triggerRestoreLastSessionViaProjectPanel(
  page: Page,
  options?: { confirmModal?: boolean }
): Promise<ProjectActionEventDetail> {
  await openMainTab(page, 'structure');
  const restoreButton = page.locator('button[data-testid="project-restore-button"]:visible').first();
  await expect(restoreButton).toBeVisible();
  await expect(restoreButton).toBeEnabled();

  const beforeCount = (await readPerfSummary(page))['project.restoreLastSession']?.count || 0;
  const restoreEventPromise = waitForProjectActionEvent(page, 'restore-last-session');
  await restoreButton.click();
  if (options?.confirmModal !== false) {
    await confirmActiveModal(page);
  }
  const detail = await restoreEventPromise;
  await expectPerfMetricCount(page, 'project.restoreLastSession', beforeCount + 1);
  return detail;
}

export async function expectRestoreLastSessionUnavailable(page: Page): Promise<void> {
  await openMainTab(page, 'structure');
  const restoreButton = page.locator('button[data-testid="project-restore-button"]:visible').first();
  await expect(restoreButton).toBeVisible();
  await expect(restoreButton).toBeDisabled();
}

export async function restoreLastSessionViaProjectPanel(
  page: Page,
  expectedProjectName: string
): Promise<ProjectActionEventDetail> {
  const detail = await triggerRestoreLastSessionViaProjectPanel(page);
  expect(detail.ok, `Restore action failed: ${JSON.stringify(detail)}`).toBe(true);
  await expect(getVisibleProjectNameInput(page)).toHaveValue(expectedProjectName);
  return detail;
}

export async function triggerClipboardExportAction(
  page: Page,
  buttonTestId: string,
  metricName: string
): Promise<void> {
  const button = page.locator(`button[data-testid="${buttonTestId}"]`);
  await expect(button).toBeVisible();
  const before = await readClipboardWriteCount(page);
  await button.click();
  await expect.poll(async () => await readClipboardWriteCount(page)).toBeGreaterThan(before);
  await expectPerfMetricCount(page, metricName, 1);
}

export async function readClipboardWriteCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const writes =
      (window as typeof window & { __WP_TEST_CLIPBOARD_WRITES__?: Array<unknown> })
        .__WP_TEST_CLIPBOARD_WRITES__ || [];
    return Array.isArray(writes) ? writes.length : 0;
  });
}

function normalizeDebugCount(value: unknown): number {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function normalizeBuildDebugReasonStats(value: unknown): BuildDebugReasonStats {
  const rec = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    requestCount: normalizeDebugCount(rec.requestCount),
    executeCount: normalizeDebugCount(rec.executeCount),
    immediateRequestCount: normalizeDebugCount(rec.immediateRequestCount),
    debouncedRequestCount: normalizeDebugCount(rec.debouncedRequestCount),
    executeImmediateCount: normalizeDebugCount(rec.executeImmediateCount),
    executeDebouncedCount: normalizeDebugCount(rec.executeDebouncedCount),
  };
}

function normalizeBuildDebugStats(value: unknown): BuildDebugStats {
  const rec = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const rawReasons =
    rec.reasons && typeof rec.reasons === 'object' ? (rec.reasons as Record<string, unknown>) : {};
  const reasons = Object.fromEntries(
    Object.entries(rawReasons)
      .map(([key, item]) => [String(key || '').trim(), normalizeBuildDebugReasonStats(item)] as const)
      .filter(([key]) => !!key)
  );
  return {
    requestCount: normalizeDebugCount(rec.requestCount),
    immediateRequestCount: normalizeDebugCount(rec.immediateRequestCount),
    debouncedRequestCount: normalizeDebugCount(rec.debouncedRequestCount),
    executeCount: normalizeDebugCount(rec.executeCount),
    executeImmediateCount: normalizeDebugCount(rec.executeImmediateCount),
    executeDebouncedCount: normalizeDebugCount(rec.executeDebouncedCount),
    pendingOverwriteCount: normalizeDebugCount(rec.pendingOverwriteCount),
    debouncedScheduleCount: normalizeDebugCount(rec.debouncedScheduleCount),
    reusedDebouncedScheduleCount: normalizeDebugCount(rec.reusedDebouncedScheduleCount),
    builderWaitScheduleCount: normalizeDebugCount(rec.builderWaitScheduleCount),
    staleDebouncedTimerFireCount: normalizeDebugCount(rec.staleDebouncedTimerFireCount),
    staleBuilderWaitWakeupCount: normalizeDebugCount(rec.staleBuilderWaitWakeupCount),
    duplicatePendingSignatureCount: normalizeDebugCount(rec.duplicatePendingSignatureCount),
    skippedDuplicatePendingRequestCount: normalizeDebugCount(rec.skippedDuplicatePendingRequestCount),
    skippedSatisfiedRequestCount: normalizeDebugCount(rec.skippedSatisfiedRequestCount),
    repeatedExecuteCount: normalizeDebugCount(rec.repeatedExecuteCount),
    skippedRepeatedExecuteCount: normalizeDebugCount(rec.skippedRepeatedExecuteCount),
    lastRequestReason: typeof rec.lastRequestReason === 'string' ? rec.lastRequestReason.trim() : '',
    lastExecuteReason: typeof rec.lastExecuteReason === 'string' ? rec.lastExecuteReason.trim() : '',
    reasons,
  };
}

function normalizeRenderDebugStats(value: unknown): RenderDebugStats {
  const rec = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    renderRequestCount: normalizeDebugCount(rec.renderRequestCount),
    triggerRenderCount: normalizeDebugCount(rec.triggerRenderCount),
    fallbackTriggerCount: normalizeDebugCount(rec.fallbackTriggerCount),
    ensureRenderLoopCount: normalizeDebugCount(rec.ensureRenderLoopCount),
    noOpRenderRequestCount: normalizeDebugCount(rec.noOpRenderRequestCount),
    wakeupRequestCount: normalizeDebugCount(rec.wakeupRequestCount),
    wakeupEnsureRenderLoopCount: normalizeDebugCount(rec.wakeupEnsureRenderLoopCount),
    noOpWakeupCount: normalizeDebugCount(rec.noOpWakeupCount),
    activityTouchCount: normalizeDebugCount(rec.activityTouchCount),
    afterTouchCount: normalizeDebugCount(rec.afterTouchCount),
    ensureRenderLoopAfterTriggerCount: normalizeDebugCount(rec.ensureRenderLoopAfterTriggerCount),
  };
}

export function subtractBuildDebugStats(after: BuildDebugStats, before: BuildDebugStats): BuildDebugStats {
  const reasonNames = new Set([...Object.keys(after.reasons), ...Object.keys(before.reasons)]);
  const reasons: Record<string, BuildDebugReasonStats> = {};
  for (const name of reasonNames) {
    const next = after.reasons[name];
    const prev = before.reasons[name];
    const delta: BuildDebugReasonStats = {
      requestCount: Math.max(0, (next?.requestCount || 0) - (prev?.requestCount || 0)),
      executeCount: Math.max(0, (next?.executeCount || 0) - (prev?.executeCount || 0)),
      immediateRequestCount: Math.max(
        0,
        (next?.immediateRequestCount || 0) - (prev?.immediateRequestCount || 0)
      ),
      debouncedRequestCount: Math.max(
        0,
        (next?.debouncedRequestCount || 0) - (prev?.debouncedRequestCount || 0)
      ),
      executeImmediateCount: Math.max(
        0,
        (next?.executeImmediateCount || 0) - (prev?.executeImmediateCount || 0)
      ),
      executeDebouncedCount: Math.max(
        0,
        (next?.executeDebouncedCount || 0) - (prev?.executeDebouncedCount || 0)
      ),
    };
    if (Object.values(delta).some(count => count > 0)) {
      reasons[name] = delta;
    }
  }
  return {
    requestCount: Math.max(0, after.requestCount - before.requestCount),
    immediateRequestCount: Math.max(0, after.immediateRequestCount - before.immediateRequestCount),
    debouncedRequestCount: Math.max(0, after.debouncedRequestCount - before.debouncedRequestCount),
    executeCount: Math.max(0, after.executeCount - before.executeCount),
    executeImmediateCount: Math.max(0, after.executeImmediateCount - before.executeImmediateCount),
    executeDebouncedCount: Math.max(0, after.executeDebouncedCount - before.executeDebouncedCount),
    pendingOverwriteCount: Math.max(0, after.pendingOverwriteCount - before.pendingOverwriteCount),
    debouncedScheduleCount: Math.max(0, after.debouncedScheduleCount - before.debouncedScheduleCount),
    reusedDebouncedScheduleCount: Math.max(
      0,
      after.reusedDebouncedScheduleCount - before.reusedDebouncedScheduleCount
    ),
    builderWaitScheduleCount: Math.max(0, after.builderWaitScheduleCount - before.builderWaitScheduleCount),
    staleDebouncedTimerFireCount: Math.max(
      0,
      after.staleDebouncedTimerFireCount - before.staleDebouncedTimerFireCount
    ),
    staleBuilderWaitWakeupCount: Math.max(
      0,
      after.staleBuilderWaitWakeupCount - before.staleBuilderWaitWakeupCount
    ),
    duplicatePendingSignatureCount: Math.max(
      0,
      after.duplicatePendingSignatureCount - before.duplicatePendingSignatureCount
    ),
    skippedDuplicatePendingRequestCount: Math.max(
      0,
      after.skippedDuplicatePendingRequestCount - before.skippedDuplicatePendingRequestCount
    ),
    skippedSatisfiedRequestCount: Math.max(
      0,
      after.skippedSatisfiedRequestCount - before.skippedSatisfiedRequestCount
    ),
    repeatedExecuteCount: Math.max(0, after.repeatedExecuteCount - before.repeatedExecuteCount),
    skippedRepeatedExecuteCount: Math.max(
      0,
      after.skippedRepeatedExecuteCount - before.skippedRepeatedExecuteCount
    ),
    lastRequestReason: after.lastRequestReason || before.lastRequestReason,
    lastExecuteReason: after.lastExecuteReason || before.lastExecuteReason,
    reasons,
  };
}

export function subtractRenderDebugStats(
  after: RenderDebugStats,
  before: RenderDebugStats
): RenderDebugStats {
  return {
    renderRequestCount: Math.max(0, after.renderRequestCount - before.renderRequestCount),
    triggerRenderCount: Math.max(0, after.triggerRenderCount - before.triggerRenderCount),
    fallbackTriggerCount: Math.max(0, after.fallbackTriggerCount - before.fallbackTriggerCount),
    ensureRenderLoopCount: Math.max(0, after.ensureRenderLoopCount - before.ensureRenderLoopCount),
    noOpRenderRequestCount: Math.max(0, after.noOpRenderRequestCount - before.noOpRenderRequestCount),
    wakeupRequestCount: Math.max(0, after.wakeupRequestCount - before.wakeupRequestCount),
    wakeupEnsureRenderLoopCount: Math.max(
      0,
      after.wakeupEnsureRenderLoopCount - before.wakeupEnsureRenderLoopCount
    ),
    noOpWakeupCount: Math.max(0, after.noOpWakeupCount - before.noOpWakeupCount),
    activityTouchCount: Math.max(0, after.activityTouchCount - before.activityTouchCount),
    afterTouchCount: Math.max(0, after.afterTouchCount - before.afterTouchCount),
    ensureRenderLoopAfterTriggerCount: Math.max(
      0,
      after.ensureRenderLoopAfterTriggerCount - before.ensureRenderLoopAfterTriggerCount
    ),
  };
}

export async function readBuildDebugStats(page: Page): Promise<BuildDebugStats> {
  const stats = await page.evaluate(() => window.__WP_PERF__?.getBuildDebugStats?.() || null);
  return normalizeBuildDebugStats(stats);
}

export async function resetBuildDebugStats(page: Page): Promise<BuildDebugStats> {
  const stats = await page.evaluate(() => {
    window.__WP_PERF__?.resetBuildDebugStats?.();
    return window.__WP_PERF__?.getBuildDebugStats?.() || null;
  });
  return normalizeBuildDebugStats(stats);
}

export async function readRenderDebugStats(page: Page): Promise<RenderDebugStats> {
  const stats = await page.evaluate(() => window.__WP_PERF__?.getRenderDebugStats?.() || null);
  return normalizeRenderDebugStats(stats);
}

export async function resetRenderDebugStats(page: Page): Promise<RenderDebugStats> {
  const stats = await page.evaluate(() => {
    window.__WP_PERF__?.resetRenderDebugStats?.();
    return window.__WP_PERF__?.getRenderDebugStats?.() || null;
  });
  return normalizeRenderDebugStats(stats);
}

async function readBuildAndRenderDelta(
  page: Page,
  beforeBuild: BuildDebugStats,
  beforeRender: RenderDebugStats
): Promise<BuildAndRenderDelta> {
  const [afterBuild, afterRender] = await Promise.all([
    readBuildDebugStats(page),
    readRenderDebugStats(page),
  ]);
  return {
    build: subtractBuildDebugStats(afterBuild, beforeBuild),
    render: subtractRenderDebugStats(afterRender, beforeRender),
  };
}

export async function measureBuildAndRenderDelta(
  page: Page,
  action: () => Promise<void>,
  options: MeasureBuildAndRenderDeltaOptions = {}
): Promise<BuildAndRenderDelta> {
  const beforeBuild = await readBuildDebugStats(page);
  const beforeRender = await readRenderDebugStats(page);
  const minBuildRequests = Math.max(0, Math.floor(options.minBuildRequests ?? 1));
  const minBuildExecutes = Math.max(0, Math.floor(options.minBuildExecutes ?? 1));
  const minRenderRequests = Math.max(0, Math.floor(options.minRenderRequests ?? 1));
  const minRenderFollowThroughs = Math.max(
    0,
    Math.floor(options.minRenderFollowThroughs ?? (minRenderRequests > 0 ? 1 : 0))
  );

  await action();

  await expect
    .poll(
      async () => {
        const delta = await readBuildAndRenderDelta(page, beforeBuild, beforeRender);
        const renderFollowThroughs = delta.render.triggerRenderCount + delta.render.ensureRenderLoopCount;
        return (
          delta.build.requestCount >= minBuildRequests &&
          delta.build.executeCount >= minBuildExecutes &&
          delta.render.renderRequestCount >= minRenderRequests &&
          renderFollowThroughs >= minRenderFollowThroughs
        );
      },
      { timeout: options.timeoutMs ?? 15_000 }
    )
    .toBe(true);

  await waitForTwoAnimationFrames(page);
  return await readBuildAndRenderDelta(page, beforeBuild, beforeRender);
}

export async function readPerfSummary(page: Page): Promise<Record<string, PerfMetricSummary>> {
  return await page.evaluate(() => window.__WP_PERF__?.getSummary?.() || {});
}

export async function readPerfEntries(page: Page, name?: string): Promise<Array<Record<string, unknown>>> {
  return await page.evaluate(metricName => window.__WP_PERF__?.getEntries?.(metricName) || [], name);
}

export async function readProjectActionEvents(page: Page): Promise<ProjectActionEventDetail[]> {
  return await page.evaluate(() => {
    const events =
      (window as typeof window & { __WP_PROJECT_ACTION_EVENTS__?: unknown[] }).__WP_PROJECT_ACTION_EVENTS__ ||
      [];
    return Array.isArray(events) ? (events as ProjectActionEventDetail[]) : [];
  });
}

export async function expectPerfMetricCount(page: Page, name: string, minCount = 1): Promise<void> {
  await expect
    .poll(
      async () => {
        const summary = await readPerfSummary(page);
        return summary?.[name]?.count || 0;
      },
      { message: `runtime perf metric "${name}" should be recorded at least ${minCount} time(s)` }
    )
    .toBeGreaterThanOrEqual(minCount);
}

export async function expectPerfMetrics(page: Page, names: readonly string[]): Promise<void> {
  await expect
    .poll(
      async () => {
        const summary = await readPerfSummary(page);
        return names.filter(name => (summary?.[name]?.count || 0) < 1).join(',');
      },
      { message: 'all required runtime perf metrics should be recorded' }
    )
    .toBe('');
}

export async function expectNoPerfErrors(page: Page, names: readonly string[]): Promise<void> {
  await expect
    .poll(async () => {
      const summary = await readPerfSummary(page);
      return names
        .map(name => {
          const metric = summary?.[name];
          return `${name}:${metric?.errorCount ?? 0}`;
        })
        .join('|');
    })
    .toBe(names.map(name => `${name}:0`).join('|'));
}
