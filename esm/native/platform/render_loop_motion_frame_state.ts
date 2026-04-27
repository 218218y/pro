import type { AppContainer, DrawerVisualEntryLike, UnknownRecord } from '../../../types';

import { readConfigNumberLooseFromApp } from '../runtime/config_selectors.js';
import {
  computePerfFlagsViaPlatform,
  getDimsMFromPlatform,
  getPlatformActivity,
  getPlatformPerf,
} from '../runtime/platform_access.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { getTools } from '../runtime/service_access.js';
import {
  getDoorsLastToggleTime,
  getDoorsOpenViaService,
  getHardCloseUntil,
  readDoorsRuntimeBool,
  readDoorsRuntimeNumber,
  writeDoorsRuntimeBool,
} from '../runtime/doors_access.js';
import { getDrawersArray } from '../runtime/render_access.js';
import { asRecord, readFiniteNumber } from '../runtime/render_runtime_primitives.js';
import {
  doorsRuntimeNow,
  getOpenDoorModuleKeys,
  getVisibleOpenInternalDrawerModuleKeys,
  hasAnyOpenDoor,
  hasOpenInternalDrawers,
  isIntDrawerEditActive,
  isSketchEditActive,
  isSketchExtDrawersEditActive,
  isSketchIntDrawersEditActive,
} from '../runtime/doors_runtime_support.js';

import type { MotionFrameState, ReportFn } from './render_loop_motion_shared.js';
import { asRecordOrNull, call0m } from './render_loop_motion_shared.js';

export function readRenderLoopMotionFrameState(App: AppContainer, report: ReportFn): MotionFrameState {
  const runtimeNow = doorsRuntimeNow();
  const lastToggleTime = getDoorsLastToggleTime(App);
  const timeSinceToggle = runtimeNow - lastToggleTime;

  const delayTime = readConfigNumberLooseFromApp(App, 'DOOR_DELAY_MS', 600);

  const perf = asRecord<UnknownRecord>(getPlatformPerf(App), {});
  if (perf['perfFlagsDirty']) {
    computePerfFlagsViaPlatform(App);
  }

  const hasInternalDrawers =
    typeof perf['hasInternalDrawers'] !== 'undefined'
      ? !!perf['hasInternalDrawers']
      : getDrawersArray(App).some(
          (d: DrawerVisualEntryLike | null | undefined) =>
            d && (d.isInternal || (d.id && String(d.id).includes('int')))
        );

  let doorsShouldBeOpen = false;
  let internalDrawersShouldBeOpen = false;
  let externalDrawersShouldBeOpen = false;

  const doorsOpenFlag = !!getDoorsOpenViaService(App);

  const prevDoorsOpen = readDoorsRuntimeBool(App, 'prevOpen', doorsOpenFlag);
  const justClosed = prevDoorsOpen === true && doorsOpenFlag === false;
  writeDoorsRuntimeBool(App, 'prevOpen', doorsOpenFlag);
  const hardCloseUntil = getHardCloseUntil(App);
  const hardCloseActive = !doorsOpenFlag && runtimeNow < hardCloseUntil;
  const closeDelayUntil = readDoorsRuntimeNumber(App, 'closeDelayUntil', 0);
  const hasOpenInternalDrawersNow = hasOpenInternalDrawers(App);
  const closeDelayActive =
    !doorsOpenFlag && hasOpenInternalDrawersNow && !hardCloseActive && runtimeNow < closeDelayUntil;

  if (doorsOpenFlag) {
    doorsShouldBeOpen = true;
    externalDrawersShouldBeOpen = true;
    internalDrawersShouldBeOpen = hasInternalDrawers ? timeSinceToggle > delayTime : true;
  } else {
    internalDrawersShouldBeOpen = false;
    externalDrawersShouldBeOpen = false;
    if (closeDelayActive) {
      doorsShouldBeOpen = true;
    } else if (hasOpenInternalDrawersNow && justClosed && !hardCloseActive) {
      doorsShouldBeOpen = timeSinceToggle < delayTime;
    } else {
      doorsShouldBeOpen = false;
    }
  }

  const activity = asRecord<UnknownRecord>(getPlatformActivity(App), {});
  const lastAction0 = activity['lastActionTime'];
  const lastAction = readFiniteNumber(lastAction0, 0);
  const timeSinceAction = runtimeNow - lastAction;
  const animationDuration = hasInternalDrawers ? delayTime + 1000 : 1000;
  const isAnimating = timeSinceToggle < animationDuration;
  const activeMs = readConfigNumberLooseFromApp(App, 'ACTIVE_STATE_MS', 4000);
  const isActiveState = isAnimating || timeSinceAction < activeMs;
  const globalClickMode = !!readRuntimeScalarOrDefaultFromApp(App, 'globalClickMode', true);

  let platformDimsFrame: UnknownRecord | null = null;
  try {
    platformDimsFrame = asRecordOrNull(getDimsMFromPlatform(App));
  } catch (error) {
    report(App, 'doors.sliding.getDimsMPlatform.frame', error, { throttleMs: 5000 });
    platformDimsFrame = null;
  }

  const tools = getTools(App);
  const manualTool =
    typeof tools['getInteriorManualTool'] === 'function'
      ? call0m(tools, tools['getInteriorManualTool'])
      : null;
  const sketchEditActive = isSketchEditActive(App);
  const sketchIntDrawersEditActive = isSketchIntDrawersEditActive(App);
  const sketchExtDrawersEditActive = isSketchExtDrawersEditActive(App);
  const intDrawerEditActive = isIntDrawerEditActive(App);
  const forcedOpenDrawerId =
    typeof tools['getDrawersOpenId'] === 'function' ? call0m(tools, tools['getDrawersOpenId']) : null;

  const localDoorModules = globalClickMode ? new Set<string>() : getOpenDoorModuleKeys(App);
  const hasAnyLocalOpenDoor = globalClickMode ? false : hasAnyOpenDoor(App);
  const visibleOpenInternalDrawerModules = globalClickMode
    ? new Set<string>()
    : getVisibleOpenInternalDrawerModuleKeys(App);

  return {
    hasInternalDrawers,
    doorsShouldBeOpen,
    internalDrawersShouldBeOpen,
    externalDrawersShouldBeOpen,
    isAnimating,
    isActiveState,
    globalClickMode,
    platformDimsFrame,
    doorsOpenFlag,
    sketchEditActive,
    sketchIntDrawersEditActive,
    sketchExtDrawersEditActive,
    intDrawerEditActive,
    forcedOpenDrawerId,
    manualTool,
    delayTime,
    timeSinceToggle,
    localDoorModules,
    hasAnyLocalOpenDoor,
    visibleOpenInternalDrawerModules,
  };
}
