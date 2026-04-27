import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadRenderLoopModule(options = {}) {
  const file = path.join(process.cwd(), 'esm/native/platform/render_loop_impl.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;

  const reports = [];
  let rafCalls = 0;
  let lastAnimate = null;
  const motionCalls = [];
  const renderSlotState = Object.create(null);

  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === '../runtime/install_idempotency_patterns.js') {
      return {
        hasOwnNumberSlots(obj, keys) {
          return (
            !!obj &&
            keys.every(key => Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] === 'number')
          );
        },
      };
    }

    if (specifier === '../runtime/stable_surface_slots.js') {
      return {
        installStableSurfaceSlot(root, publicKey, stableKey, isInstalled, createValue) {
          const currentPublic = root?.[publicKey];
          if (isInstalled(currentPublic)) {
            root[stableKey] = currentPublic;
            return currentPublic;
          }
          const currentStable = root?.[stableKey];
          if (isInstalled(currentStable)) {
            root[publicKey] = currentStable;
            return currentStable;
          }
          const next = createValue();
          root[publicKey] = next;
          root[stableKey] = next;
          return next;
        },
      };
    }
    if (specifier === './render_loop_impl_contracts.js') {
      const isInstalledRenderAnimate = fn =>
        typeof fn === 'function' && Reflect.get(fn, '__wpRenderLoopImpl') === true;
      return {
        markInstalledRenderAnimate(fn) {
          Reflect.set(fn, '__wpRenderLoopImpl', true);
          return fn;
        },
        isInstalledRenderAnimate,
        hasRenderLoopInstallContract(app) {
          const render = app && app.render && typeof app.render === 'object' ? app.render : {};
          return !!(
            isInstalledRenderAnimate(render.animate) &&
            Number.isFinite(render.loopRaf) &&
            Number.isFinite(render.__lastFrameTs) &&
            Number.isFinite(render.__rafScheduledAt)
          );
        },
        getInstalledRender(app) {
          if (!app.render || typeof app.render !== 'object') app.render = {};
          return app.render;
        },
      };
    }
    if (specifier === './render_loop_impl_runtime.js') {
      return {
        createInstalledRenderAnimate(app, report) {
          const timers = localRequire('../runtime/api.js').getBrowserTimers(app);
          const raf = timers.requestAnimationFrame;
          const now = timers.now;
          const frontOverlay = localRequire(
            './render_loop_impl_front_overlay.js'
          ).createRenderLoopFrontOverlayHelpers(app, {
            report,
            getRenderSlot: localRequire('../runtime/render_access.js').getRenderSlot,
            setRenderSlot: localRequire('../runtime/render_access.js').setRenderSlot,
          });
          const visualEffects = localRequire('./render_loop_visual_effects.js').createRenderLoopVisualEffects(
            app,
            {
              report,
              now,
              asRecord: localRequire('./render_loop_impl_support.js').asRecord,
              frontOverlayState: frontOverlay.frontOverlayState,
              applyOpacityScale: (_app, node, alpha) => {
                void _app;
                frontOverlay.applyOpacityScale(node, alpha);
              },
              collectFrontOverlayNodes: frontOverlay.collectFrontOverlayNodes,
              isTaggedMirrorSurface: frontOverlay.isTaggedMirrorSurface,
              tryHideMirrorSurface: frontOverlay.tryHideMirrorSurface,
              getCamera: localRequire('../runtime/render_access.js').getCamera,
              getControls: localRequire('../runtime/render_access.js').getControls,
              getRenderSlot: localRequire('../runtime/render_access.js').getRenderSlot,
              setRenderSlot: localRequire('../runtime/render_access.js').setRenderSlot,
              getRoomGroup: localRequire('../runtime/render_access.js').getRoomGroup,
              getScene: localRequire('../runtime/render_access.js').getScene,
              readAutoHideFloorCache: localRequire('../runtime/render_access.js').readAutoHideFloorCache,
              writeAutoHideFloorCache: localRequire('../runtime/render_access.js').writeAutoHideFloorCache,
              getWardrobeGroup: localRequire('../runtime/render_access.js').getWardrobeGroup,
              getDoorsArray: localRequire('../runtime/render_access.js').getDoorsArray,
              readRuntimeScalarOrDefaultFromApp: localRequire('../runtime/runtime_selectors.js')
                .readRuntimeScalarOrDefaultFromApp,
            }
          );
          const motion = localRequire('./render_loop_motion.js').createRenderLoopMotionController(app, {
            report,
            now,
            debugLog: (...args) => localRequire('./render_loop_impl_support.js').debugSketchLog(app, ...args),
          });
          const mirrorDriver = localRequire('./render_loop_mirror_driver.js').createRenderLoopMirrorDriver(
            app,
            {
              report,
              now,
              isTaggedMirrorSurface: frontOverlay.isTaggedMirrorSurface,
              tryHideMirrorSurface: frontOverlay.tryHideMirrorSurface,
              getRenderSlot: localRequire('../runtime/render_access.js').getRenderSlot,
              setRenderSlot: localRequire('../runtime/render_access.js').setRenderSlot,
            }
          );

          return function animate() {
            const support = localRequire('./render_loop_impl_support.js');
            const renderAccess = localRequire('../runtime/render_access.js');
            const lifecycle = support.asRecord(app.lifecycle, {});
            if (lifecycle['tabHidden']) {
              support.clearLoopSchedule(app);
              return;
            }
            const frameStartMs = now();
            renderAccess.setLastFrameTs(app, frameStartMs);
            renderAccess.setRenderSlot(app, '__frameStartMs', frameStartMs);
            try {
              const motionFrame = motion.stepFrame(frameStartMs);
              if (!motionFrame.isActiveState) {
                support.clearLoopSchedule(app);
                return;
              }
              visualEffects.updateFrontOverlaySeamsVisibility();
              {
                const c0 = renderAccess.getControls(app);
                const c = support.asRecordOrNull(c0);
                if (c && typeof c['update'] === 'function') support.call0m(c, c['update']);
              }
              {
                const n = (Number(renderAccess.getRenderSlot(app, '__wpAutoHideFloorTick')) || 0) + 1;
                renderAccess.setRenderSlot(app, '__wpAutoHideFloorTick', n);
                const floorUd0 = renderAccess.getRenderSlot(app, '__wpAutoHideFloorRef');
                const floorUd =
                  floorUd0 && typeof floorUd0 === 'object'
                    ? support.asRecord(support.asRecord(floorUd0)['userData'], {})
                    : null;
                const hiddenNow = !!(floorUd && floorUd['__wpAutoHideHidden']);
                if (hiddenNow || (n & 1) === 0) visualEffects.autoHideRoomFloor();
              }
              visualEffects.updateMirrorMotionState(now(), motionFrame.isAnimating);
              mirrorDriver.updateMirrorCube();
              {
                const renderer0 = renderAccess.getRenderer(app);
                const scene0 = renderAccess.getScene(app);
                const camera0 = renderAccess.getCamera(app);
                const renderer = support.asRecordOrNull(renderer0);
                if (renderer && typeof renderer['render'] === 'function' && scene0 && camera0) {
                  support.call2m(renderer, renderer['render'], scene0, camera0);
                }
              }
              const nextAnimate0 = renderAccess.getAnimateFn(app);
              const nextAnimate = support.asFrameRequestCallback(nextAnimate0, animate);
              const scheduledAt = now();
              renderAccess.setRafScheduledAt(app, scheduledAt);
              try {
                renderAccess.setLoopRaf(app, raf(nextAnimate));
              } catch (error) {
                support.clearLoopSchedule(app);
                report('animate.scheduleNextFrame', error, { throttleMs: 2000 });
              }
            } catch (error) {
              support.clearLoopSchedule(app);
              report('animate.frame', error, { throttleMs: 2000 });
            }
          };
        },
      };
    }
    if (specifier === '../runtime/platform_access.js') {
      return {
        installRenderAnimateViaPlatform(app, animate) {
          app.render.animate = animate;
          lastAnimate = animate;
          return true;
        },
      };
    }
    if (specifier === '../runtime/runtime_selectors.js') {
      return {
        readRuntimeScalarOrDefaultFromApp(_app, _key, fallback) {
          return fallback;
        },
      };
    }
    if (specifier === './render_loop_impl_support.js') {
      return {
        asAppLike(value) {
          if (!value || typeof value !== 'object') return { render: {} };
          if (!value.render || typeof value.render !== 'object') value.render = {};
          return value;
        },
        asFrameRequestCallback(value, fallback) {
          return typeof value === 'function' ? value : fallback;
        },
        asRecord(value, fallback = {}) {
          return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
        },
        asRecordOrNull(value) {
          return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
        },
        readRenderLike(value) {
          return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
        },
        call0m(ctx, fn) {
          return typeof fn === 'function' ? fn.call(ctx) : undefined;
        },
        call2m(ctx, fn, a, b) {
          return typeof fn === 'function' ? fn.call(ctx, a, b) : undefined;
        },
        clearLoopSchedule(app) {
          app.render.loopRaf = 0;
          app.render.__rafScheduledAt = 0;
        },
        debugSketchLog() {
          return undefined;
        },
        hasRenderLoopTimingSlots(app) {
          return (
            Number.isFinite(app.render?.loopRaf) &&
            Number.isFinite(app.render?.__lastFrameTs) &&
            Number.isFinite(app.render?.__rafScheduledAt)
          );
        },
        reportRenderLoop(app, op, err, opts) {
          localRequire('../runtime/api.js').reportErrorThrottled(app, err, {
            where: 'platform/render_loop_impl',
            op,
            throttleMs: typeof opts?.throttleMs === 'number' ? opts.throttleMs : 5000,
            failFast: !!opts?.failFast,
          });
        },
        toAppContainer(value) {
          if (!value.render || typeof value.render !== 'object') value.render = {};
          return value;
        },
      };
    }
    if (specifier === './render_loop_impl_front_overlay.js') {
      return {
        createRenderLoopFrontOverlayHelpers() {
          return {
            frontOverlayState: () => ({
              prevGlobalDoorsOpen: false,
              transitionUntilMs: 0,
              frameCounter: 0,
              cache: null,
            }),
            applyOpacityScale: () => undefined,
            collectFrontOverlayNodes: () => [],
            isTaggedMirrorSurface: () => false,
            tryHideMirrorSurface: () => false,
          };
        },
      };
    }
    if (specifier === './render_loop_visual_effects.js') {
      return {
        createRenderLoopVisualEffects() {
          return {
            updateMirrorMotionState: options.updateMirrorMotionState || (() => undefined),
            autoHideRoomFloor: options.autoHideRoomFloor || (() => undefined),
            updateFrontOverlaySeamsVisibility: options.updateFrontOverlaySeamsVisibility || (() => undefined),
          };
        },
      };
    }
    if (specifier === './render_loop_motion.js') {
      return {
        createRenderLoopMotionController() {
          return {
            stepFrame(now) {
              motionCalls.push(now);
              if (typeof options.stepFrame === 'function') return options.stepFrame(now);
              return { isAnimating: false, isActiveState: false };
            },
          };
        },
      };
    }
    if (specifier === './render_loop_mirror_driver.js') {
      return {
        createRenderLoopMirrorDriver() {
          return {
            updateMirrorCube: options.updateMirrorCube || (() => undefined),
          };
        },
      };
    }
    if (specifier === '../runtime/api.js') {
      return {
        reportErrorThrottled(_app, err, meta) {
          reports.push({ err, meta });
        },
        shouldFailFast() {
          return false;
        },
        getBrowserTimers() {
          return {
            requestAnimationFrame(cb) {
              rafCalls += 1;
              if (typeof options.requestAnimationFrame === 'function')
                return options.requestAnimationFrame(cb);
              return 17;
            },
            now() {
              return typeof options.now === 'function' ? options.now() : 777;
            },
          };
        },
      };
    }
    if (specifier === '../runtime/error_normalization.js') {
      return {
        normalizeUnknownError(error, fallback = '') {
          if (error instanceof Error && error.message) return { message: error.message };
          if (typeof error === 'string' && error.trim()) return { message: error.trim() };
          if (
            error &&
            typeof error === 'object' &&
            typeof error.message === 'string' &&
            error.message.trim()
          ) {
            return { message: error.message.trim() };
          }
          return { message: fallback || 'Unexpected error' };
        },
      };
    }
    if (specifier === '../runtime/render_access.js') {
      return {
        ensureRenderNamespace(app) {
          if (!app.render || typeof app.render !== 'object') app.render = {};
          return app.render;
        },
        ensureRenderRuntimeState(app) {
          if (!app.render || typeof app.render !== 'object') app.render = {};
          if (!Number.isFinite(app.render.loopRaf)) app.render.loopRaf = 0;
          if (!Number.isFinite(app.render.__lastFrameTs)) app.render.__lastFrameTs = 0;
          if (!Number.isFinite(app.render.__rafScheduledAt)) app.render.__rafScheduledAt = 0;
          return app.render;
        },
        getAnimateFn(app) {
          return app.render?.animate ?? null;
        },
        getCamera(app) {
          return app.render?.camera ?? null;
        },
        getControls(app) {
          return app.render?.controls ?? null;
        },
        getDoorsArray(app) {
          return app.render?.doorsArray ?? [];
        },
        getRenderer(app) {
          return app.render?.renderer ?? null;
        },
        getRoomGroup(app) {
          return app.render?.roomGroup ?? null;
        },
        getScene(app) {
          return app.render?.scene ?? null;
        },
        getWardrobeGroup(app) {
          return app.render?.wardrobeGroup ?? null;
        },
        getRenderSlot(app, key) {
          return Object.prototype.hasOwnProperty.call(renderSlotState, key)
            ? renderSlotState[key]
            : app.render?.[key];
        },
        getLoopRaf(app) {
          return typeof app.render?.loopRaf === 'number' ? app.render.loopRaf : 0;
        },
        getLastFrameTs(app) {
          return typeof app.render?.__lastFrameTs === 'number' ? app.render.__lastFrameTs : 0;
        },
        getRafScheduledAt(app) {
          return typeof app.render?.__rafScheduledAt === 'number' ? app.render.__rafScheduledAt : 0;
        },
        readAutoHideFloorCache() {
          return null;
        },
        setAnimateFn(app, fn) {
          app.render.animate = fn;
          return fn;
        },
        setLastFrameTs(app, value) {
          app.render.__lastFrameTs = Number.isFinite(value) ? value : 0;
          return app.render.__lastFrameTs;
        },
        setLoopRaf(app, value) {
          app.render.loopRaf = Number.isFinite(value) ? value : 0;
          return app.render.loopRaf;
        },
        setRafScheduledAt(app, value) {
          app.render.__rafScheduledAt = Number.isFinite(value) ? value : 0;
          return app.render.__rafScheduledAt;
        },
        setRenderSlot(app, key, value) {
          renderSlotState[key] = value;
          app.render[key] = value;
          return value;
        },
        writeAutoHideFloorCache() {
          return undefined;
        },
      };
    }
    return require(specifier);
  };

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return {
    ...mod.exports,
    reports,
    getRafCalls: () => rafCalls,
    getLastAnimate: () => lastAnimate,
    motionCalls,
  };
}

function createApp() {
  return {
    render: {
      loopRaf: 91,
      __lastFrameTs: 0,
      __rafScheduledAt: 45,
    },
    lifecycle: {},
  };
}

test('render loop clears schedule immediately when the tab is hidden', () => {
  const mod = loadRenderLoopModule();
  const app = createApp();
  app.lifecycle.tabHidden = true;

  mod.installRenderLoopImpl(app);
  const animate = mod.getLastAnimate();
  assert.equal(typeof animate, 'function');
  animate();

  assert.equal(app.render.loopRaf, 0);
  assert.equal(app.render.__rafScheduledAt, 0);
  assert.equal(mod.getRafCalls(), 0);
  assert.deepEqual(mod.motionCalls, []);
});

test('render loop uses injected timer timestamps and clears schedule for inactive frames', () => {
  const mod = loadRenderLoopModule({
    now: () => 777,
    stepFrame(now) {
      return { isAnimating: now > 0, isActiveState: false };
    },
  });
  const app = createApp();

  mod.installRenderLoopImpl(app);
  const animate = mod.getLastAnimate();
  animate();

  assert.deepEqual(mod.motionCalls, [777]);
  assert.equal(app.render.__lastFrameTs, 777);
  assert.equal(app.render.__frameStartMs, 777);
  assert.equal(app.render.loopRaf, 0);
  assert.equal(app.render.__rafScheduledAt, 0);
});

test('render loop reports frame errors and clears stale schedule state', () => {
  const mod = loadRenderLoopModule({
    stepFrame() {
      throw new Error('frame exploded');
    },
  });
  const app = createApp();

  mod.installRenderLoopImpl(app);
  const animate = mod.getLastAnimate();
  animate();

  assert.equal(app.render.loopRaf, 0);
  assert.equal(app.render.__rafScheduledAt, 0);
  assert.equal(mod.reports.length, 1);
  assert.equal(mod.reports[0].meta?.op, 'animate.frame');
  assert.equal(mod.reports[0].err?.message, 'frame exploded');
});

test('render loop reports raf scheduling failures and stops the loop cleanly', () => {
  const mod = loadRenderLoopModule({
    stepFrame() {
      return { isAnimating: true, isActiveState: true };
    },
    requestAnimationFrame() {
      throw new Error('raf exploded');
    },
  });
  const app = createApp();

  mod.installRenderLoopImpl(app);
  const animate = mod.getLastAnimate();
  animate();

  assert.equal(app.render.loopRaf, 0);
  assert.equal(app.render.__rafScheduledAt, 0);
  assert.equal(mod.getRafCalls(), 1);
  assert.equal(mod.reports.length, 1);
  assert.equal(mod.reports[0].meta?.op, 'animate.scheduleNextFrame');
  assert.equal(mod.reports[0].err?.message, 'raf exploded');
});
