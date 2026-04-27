import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { requestBuilderImmediateBuild, runBuilderBuildWardrobe } from '../runtime/builder_service_access.js';
import { getCamera, getDoorsArray } from '../runtime/render_access.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { setRuntimeGlobalClickMode } from '../runtime/runtime_write_access.js';
import { getCanvasPickingClickHandler } from '../runtime/canvas_picking_access.js';
import {
  exportProjectResultViaService,
  getProjectIoServiceMaybe,
  loadProjectDataResultViaServiceOrThrow,
} from '../runtime/project_io_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { getCfg } from '../kernel/api.js';
import type { SmokeAppRootLike, SmokeThreeLike } from './smoke_checks_shared.js';
import {
  asAppContainer,
  asObjectRecord,
  assertSmoke,
  errMsg,
  isFn,
  isNum,
  readMaterialSurface,
  readProjectExport,
  readProjectableObject,
  readTraverseSurface,
  reportNonFatal,
  smokeSoft,
} from './smoke_checks_shared.js';

type DoorEntryLike = {
  isOpen?: unknown;
  group?: (({ userData?: Record<string, unknown> } & Record<string, unknown>) | null) | undefined;
} & Record<string, unknown>;

function isSmokeThreeLike(three: unknown): three is SmokeThreeLike {
  const rec = asObjectRecord(three);
  return !!rec && typeof rec.Box3 === 'function' && typeof rec.Vector3 === 'function';
}

function getThree(App: Record<string, unknown>): SmokeThreeLike | null {
  try {
    const three = getThreeMaybe(App);
    if (!isSmokeThreeLike(three)) return null;
    return three;
  } catch (err) {
    smokeSoft(App, 'getThree', err, 1500);
    return null;
  }
}

function getCanvasPickingClick(App: Record<string, unknown>): ((x: number, y: number) => unknown) | null {
  try {
    return getCanvasPickingClickHandler(App);
  } catch {
    return null;
  }
}

function pickDoorEntry(App: Record<string, unknown>): DoorEntryLike | null {
  try {
    const arr = getDoorsArray(App);
    if (!arr || !arr.length) return null;

    for (let i = 0; i < arr.length; i++) {
      const door = arr[i];
      const group = door && door.group ? door.group : null;
      if (!group) continue;

      let ok = false;
      try {
        const traverse = readTraverseSurface(group)?.traverse;
        if (typeof traverse === 'function') {
          traverse.call(group, (obj: Record<string, unknown>) => {
            if (ok) return;
            if (!obj || !obj.material) return;
            const material = readMaterialSurface(obj.material);
            if (material && material.visible === false) return;
            const opacity = typeof material?.opacity === 'number' ? material.opacity : 1;
            if (opacity > 0) ok = true;
          });
        } else {
          ok = true;
        }
      } catch {
        ok = true;
      }

      if (ok) return door;
    }

    for (let i = 0; i < arr.length; i++) {
      const door = arr[i];
      if (door && door.group) return door;
    }
  } catch (err) {
    reportNonFatal('pickDoorEntry', err);
  }
  return null;
}

function projectObjectToNdc(App: Record<string, unknown>, obj3d: Record<string, unknown>) {
  const THREE = getThree(App);
  if (!THREE) return null;

  const cam = getCamera(App);
  if (!cam || typeof cam !== 'object') return null;
  if (!obj3d || typeof obj3d !== 'object') return null;

  try {
    const box = new THREE.Box3();
    box.setFromObject(obj3d);

    const center = new THREE.Vector3();
    box.getCenter(center);

    if (!isNum(center.x) || !isNum(center.y) || !isNum(center.z)) {
      try {
        const worldPos = readProjectableObject(obj3d);
        worldPos?.getWorldPosition?.(center);
      } catch (err) {
        reportNonFatal('projectObjectToNdc.worldPosition', err);
      }
    }

    if (!isNum(center.x) || !isNum(center.y) || !isNum(center.z)) return null;
    if (typeof center.project !== 'function') return null;
    center.project(cam);
    if (!isNum(center.x) || !isNum(center.y)) return null;
    if (center.x < -1.25 || center.x > 1.25 || center.y < -1.25 || center.y > 1.25) return null;
    return { x: center.x, y: center.y };
  } catch {
    return null;
  }
}

function getModulesCount(App: SmokeAppRootLike): number {
  try {
    const cfg = getCfg(asAppContainer(App)) || null;
    if (!cfg || typeof cfg !== 'object') return -1;
    const mods = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
    return mods.length;
  } catch {
    return -1;
  }
}

function getDoorsCount(App: Record<string, unknown>): number {
  try {
    const arr = getDoorsArray(App);
    return arr ? arr.length : -1;
  } catch {
    return -1;
  }
}

function ensureBuilt(App: SmokeAppRootLike): string | null {
  if (runBuilderBuildWardrobe(asAppContainer(App))) {
    return 'builder.buildWardrobe';
  }
  if (requestBuilderImmediateBuild(App, { reason: 'smoke' })) {
    return 'builder.requestBuild';
  }
  return null;
}

export function runSmokeChecksScenario(App: SmokeAppRootLike): string[] {
  const did: string[] = [];
  const buildDid = ensureBuilt(App);
  if (buildDid) did.push(buildDid);

  const modulesBefore = getModulesCount(App);
  const doorsBefore = getDoorsCount(App);

  const click = getCanvasPickingClick(App);
  assertSmoke(!!click, 'canvasPicking.handleClickNDC missing (service not installed?)');

  const doorEntry = pickDoorEntry(App);
  assertSmoke(
    !!doorEntry && !!doorEntry.group,
    'No door entry found in canonical render doorsArray (nothing to click?)',
    {
      doorsArrayLen: getDoorsCount(App),
    }
  );

  const ndc = projectObjectToNdc(App, doorEntry.group);
  assertSmoke(!!ndc, 'Failed to compute NDC target for door click (camera/scene not ready?)');

  let prevGcm: boolean | null = null;
  try {
    prevGcm = readRuntimeScalarOrDefaultFromApp(asAppContainer(App), 'globalClickMode', true);
  } catch {
    prevGcm = null;
  }
  try {
    setRuntimeGlobalClickMode(asAppContainer(App), false, { source: 'smoke' });
    did.push('runtime.globalClickMode=false');
  } catch (err) {
    reportNonFatal('scenario.globalClickMode.disable', err);
  }

  const wasOpen = !!doorEntry.isOpen;
  try {
    click?.(ndc.x, ndc.y);
  } catch (err) {
    assertSmoke(false, 'canvas picking click threw', { error: errMsg(err) });
  }

  let isOpenNow = !!doorEntry.isOpen;
  if (isOpenNow === wasOpen) {
    try {
      click?.(ndc.x + 0.01, ndc.y - 0.01);
      isOpenNow = !!doorEntry.isOpen;
    } catch (err) {
      reportNonFatal('scenario.globalClickMode.retry', err);
    }
  }

  assertSmoke(
    isOpenNow !== wasOpen,
    'Door did not toggle via picking click (expected doorEntry.isOpen to change)',
    {
      partId: doorEntry?.group?.userData ? doorEntry.group.userData.partId : null,
      wasOpen,
      isOpenNow,
      ndc,
    }
  );
  did.push('picking.clickDoor');

  try {
    if (prevGcm !== null) {
      setRuntimeGlobalClickMode(asAppContainer(App), !!prevGcm, { source: 'smoke.restore' });
      did.push('runtime.globalClickMode:restore');
    }
  } catch (err) {
    reportNonFatal('scenario.globalClickMode.restore', err);
  }

  const pio = getProjectIoServiceMaybe(App);
  assertSmoke(
    !!pio && isFn(pio.exportCurrentProject) && isFn(pio.loadProjectData),
    'projectIO service missing (export/reload scenario cannot run)',
    { hasProjectIO: !!pio }
  );

  let ex = null;
  const exportResult = exportProjectResultViaService(
    App,
    { source: 'smoke' },
    '[WardrobePro] Smoke project export failed.'
  );
  if (exportResult.ok) {
    ex = readProjectExport(exportResult.exported);
  } else {
    const reason = 'reason' in exportResult ? exportResult.reason : 'error';
    const message = 'message' in exportResult ? exportResult.message : undefined;
    assertSmoke(false, 'project export failed', {
      reason,
      ...(message ? { error: message } : {}),
    });
  }

  assertSmoke(!!ex, 'project export returned invalid result', { exType: typeof ex });
  assertSmoke(!!ex?.jsonStr && typeof ex.jsonStr === 'string', 'project export missing jsonStr', {
    keys: ex ? Object.keys(ex) : [],
  });

  try {
    if (typeof ex?.jsonStr === 'string') JSON.parse(ex.jsonStr);
  } catch (err) {
    assertSmoke(false, 'export jsonStr is not valid JSON', { error: errMsg(err) });
  }
  did.push('project.export');

  assertSmoke(!!ex?.projectData, 'project export missing projectData (needed for reload)', {
    keys: ex ? Object.keys(ex) : [],
  });

  try {
    if (ex?.projectData) {
      loadProjectDataResultViaServiceOrThrow(
        App,
        ex.projectData,
        {
          silent: true,
          toast: false,
          meta: { source: 'smoke' },
        },
        'not-installed',
        '[WardrobePro] Smoke project reload failed.',
        'project.reload'
      );
    }
  } catch (err) {
    assertSmoke(false, 'project reload threw', { error: errMsg(err) });
  }
  did.push('project.reload');

  const buildDid2 = ensureBuilt(App);
  if (buildDid2) did.push(buildDid2 + ':afterReload');

  const modulesAfter = getModulesCount(App);
  const doorsAfter = getDoorsCount(App);

  if (modulesBefore >= 0 && modulesAfter >= 0) {
    assertSmoke(modulesAfter === modulesBefore, 'modules count changed after export+reload', {
      before: modulesBefore,
      after: modulesAfter,
    });
  }
  if (doorsBefore >= 0 && doorsAfter >= 0 && doorsBefore > 0 && doorsAfter > 0) {
    assertSmoke(doorsAfter === doorsBefore, 'doors count changed after export+reload', {
      before: doorsBefore,
      after: doorsAfter,
    });
  }
  did.push('exportReload.asserts');

  try {
    console.log('[WardrobePro] smoke scenario: OK', did);
  } catch (err) {
    reportNonFatal('scenario.log', err);
  }

  return did;
}
