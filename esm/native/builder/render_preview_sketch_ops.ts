import type { PreviewTHREESurface, RenderPreviewOpsDeps } from './render_preview_ops_contracts.js';
import { createRenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import { applySketchPlacementPreview } from './render_preview_sketch_pipeline.js';
import { hideSketchPlacementMeasurements } from './render_preview_sketch_measurements.js';

export function createBuilderRenderSketchPlacementPreviewOps(deps: RenderPreviewOpsDeps) {
  const __app = deps.app;
  const __ops = deps.ops;
  const __cacheValue = deps.cacheValue;
  const __writeCacheValue = deps.writeCacheValue;
  const __wardrobeGroup = deps.wardrobeGroup;
  const __renderOpsHandleCatch = deps.renderOpsHandleCatch;
  const assertTHREE = deps.assertTHREE;
  const getThreeMaybe = deps.getThreeMaybe;

  const __shared = createRenderPreviewSketchShared(deps);
  const {
    asPreviewGroup,
    asPreviewMesh,
    readArgs,
    readUserData,
    ensureGroupUserData,
    markKeepMaterial,
    markIgnoreRaycast,
    setOutlineVisible,
    sketchMeshKeys,
    isFn: __isFn,
  } = __shared;

  function ensureSketchPlacementPreview(args: unknown) {
    const input = readArgs(args);
    const App = __app(input);
    __ops(App);
    let THREE = deps.asObject<PreviewTHREESurface>(input.THREE);
    if (!THREE) {
      try {
        const asserted = deps.asObject<PreviewTHREESurface>(
          assertTHREE(App, 'native/builder/render_ops.sketchPlacementPreview')
        );
        if (!asserted) return null;
        THREE = asserted;
      } catch {
        return null;
      }
    }
    if (!THREE) return null;

    try {
      const group = __wardrobeGroup(App);
      if (!group) return null;

      let existing = __cacheValue(App, 'sketchPlacementPreview');
      if (existing) {
        const g0 = asPreviewGroup(existing);
        if (g0?.isGroup) {
          const ud0 = readUserData(g0.userData);
          const shelf0 = asPreviewMesh(ud0.__shelfA);
          const boxTop0 = asPreviewMesh(ud0.__boxTop);
          const boxBottom0 = asPreviewMesh(ud0.__boxBottom);
          const boxLeft0 = asPreviewMesh(ud0.__boxLeft);
          const boxRight0 = asPreviewMesh(ud0.__boxRight);
          const boxBack0 = asPreviewMesh(ud0.__boxBack);

          const isAttached = (m: unknown): boolean => {
            const r = asPreviewMesh(m) || asPreviewGroup(m);
            return !!(r && r.parent === g0);
          };

          const hasCoreMesh =
            !!shelf0 &&
            !!shelf0.geometry &&
            typeof shelf0.position?.set === 'function' &&
            typeof shelf0.scale?.set === 'function' &&
            isAttached(shelf0);

          const hasAllChildren =
            hasCoreMesh &&
            isAttached(boxTop0) &&
            isAttached(boxBottom0) &&
            isAttached(boxLeft0) &&
            isAttached(boxRight0) &&
            isAttached(boxBack0);

          if (hasAllChildren) {
            if (!g0.parent) {
              const gAny = asPreviewGroup(group);
              if (gAny && __isFn(gAny.add)) gAny.add(g0);
            }
            return g0;
          }

          try {
            const p = asPreviewGroup(g0.parent);
            if (p && typeof p.remove === 'function') p.remove(g0);
          } catch {
            // ignore
          }
          __writeCacheValue(App, 'sketchPlacementPreview', null);
          existing = null;
        }
      }

      const unitGeo = new THREE.BoxGeometry(1, 1, 1);
      const unitEdgesGeo = new THREE.EdgesGeometry(unitGeo);

      const mkMat = (color: number, opacity: number, depthTest = true) => {
        const m = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          depthTest,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        markKeepMaterial(m);
        return m;
      };

      const matShelf = mkMat(0x7fd3ff, 0.22);
      const matGlass = mkMat(0xe6f7ff, 0.32);
      const matBox = mkMat(0xfbbf24, 0.22);
      const matBrace = mkMat(0x34d399, 0.22);
      const matRemove = mkMat(0xff4d4f, 0.24);
      const matRod = mkMat(0x6fe7ff, 0.38);
      const matBoxOverlay = mkMat(0xfbbf24, 0.3, false);
      const matRemoveOverlay = mkMat(0xff4d4f, 0.32, false);

      const mkLineMat = (color: number, opacity: number, depthTest = true) => {
        const m = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          depthTest,
        });
        markKeepMaterial(m);
        return m;
      };

      const lineShelf = mkLineMat(0x7fd3ff, 0.75);
      const lineGlass = mkLineMat(0x7fd3ff, 0.92);
      const lineBox = mkLineMat(0xfbbf24, 0.75);
      const lineBrace = mkLineMat(0x34d399, 0.75);
      const lineRemove = mkLineMat(0xff4d4f, 0.92);
      const lineRod = mkLineMat(0xe9fdff, 1);
      const lineBoxOverlay = mkLineMat(0xfbbf24, 0.98, false);
      const lineRemoveOverlay = mkLineMat(0xff4d4f, 1, false);

      const mk = (mat: unknown, lineMat: unknown) => {
        const m = new THREE.Mesh(unitGeo, mat);
        m.visible = false;
        m.renderOrder = 9999;
        markIgnoreRaycast(m);
        m.raycast = function () {};
        m.castShadow = false;
        m.receiveShadow = false;

        const outline = new THREE.LineSegments(unitEdgesGeo, lineMat);
        outline.visible = false;
        outline.renderOrder = 10000;
        markIgnoreRaycast(outline);
        outline.raycast = function () {};
        m.add(outline);
        if (m.userData) m.userData.__outline = outline;
        return m;
      };

      const g = new THREE.Group();
      g.visible = false;
      g.renderOrder = 9999;
      const gud = ensureGroupUserData(g);
      markIgnoreRaycast(g);
      if (g.userData) g.userData.__keepMaterialSubtree = true;

      const shelfA = mk(matShelf, lineShelf);
      const boxTop = mk(matBox, lineBox);
      const boxBottom = mk(matBox, lineBox);
      const boxLeft = mk(matBox, lineBox);
      const boxRight = mk(matBox, lineBox);
      const boxBack = mk(matBox, lineBox);

      g.add(shelfA, boxTop, boxBottom, boxLeft, boxRight, boxBack);

      gud.__shelfA = shelfA;
      gud.__boxTop = boxTop;
      gud.__boxBottom = boxBottom;
      gud.__boxLeft = boxLeft;
      gud.__boxRight = boxRight;
      gud.__boxBack = boxBack;
      gud.__matShelf = matShelf;
      gud.__matGlass = matGlass;
      gud.__matBox = matBox;
      gud.__matBrace = matBrace;
      gud.__matRemove = matRemove;
      gud.__matRod = matRod;
      gud.__matBoxOverlay = matBoxOverlay;
      gud.__matRemoveOverlay = matRemoveOverlay;
      gud.__lineShelf = lineShelf;
      gud.__lineGlass = lineGlass;
      gud.__lineBox = lineBox;
      gud.__lineBrace = lineBrace;
      gud.__lineRemove = lineRemove;
      gud.__lineRod = lineRod;
      gud.__lineBoxOverlay = lineBoxOverlay;
      gud.__lineRemoveOverlay = lineRemoveOverlay;

      __writeCacheValue(App, 'sketchPlacementPreview', g);
      group.add(g);
      return g;
    } catch (e) {
      __renderOpsHandleCatch(App, 'ensureSketchPlacementPreview', e, undefined, {
        failFast: false,
        throttleMs: 5000,
      });
      return null;
    }
  }

  function hideSketchPlacementPreview(args: unknown) {
    const input = readArgs(args);
    const App = __app(input);
    __ops(App);
    try {
      const g = asPreviewGroup(__cacheValue(App, 'sketchPlacementPreview'));
      if (g) {
        g.visible = false;
        const ud = readUserData(g.userData);
        for (const k of sketchMeshKeys) {
          const m = asPreviewMesh(ud[k]);
          if (!m) continue;
          m.visible = false;
          try {
            setOutlineVisible(m, false);
          } catch {
            // ignore
          }
        }
        hideSketchPlacementMeasurements(g, __shared);
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function setSketchPlacementPreview(args: unknown) {
    const input = readArgs(args);
    const App = __app(input);
    __ops(App);

    let THREE = deps.asObject<PreviewTHREESurface>(input.THREE || getThreeMaybe(App)) || null;
    const g = asPreviewGroup(ensureSketchPlacementPreview({ App, THREE }));
    if (!g) return null;
    if (!THREE) {
      try {
        THREE = deps.asObject<PreviewTHREESurface>(
          assertTHREE(App, 'native/builder/render_ops.sketchPlacementPreview')
        );
      } catch {
        return null;
      }
    }
    if (!THREE) return null;

    try {
      const anchorObj = asPreviewGroup(input.anchor) || asPreviewMesh(input.anchor);
      const anchorParent = asPreviewGroup(input.anchorParent);
      const desiredParent = anchorParent || (anchorObj && asPreviewGroup(anchorObj.parent)) || null;

      const root = __wardrobeGroup(App);

      if (desiredParent && typeof desiredParent.add === 'function') {
        if (g.parent !== desiredParent) desiredParent.add(g);
      } else if (root && g.parent !== root && typeof root.add === 'function') {
        root.add(g);
      }
    } catch {
      // ignore
    }

    const ud = readUserData(g.userData);
    const shelfA = asPreviewMesh(ud.__shelfA);
    const boxTop = asPreviewMesh(ud.__boxTop);
    const boxBottom = asPreviewMesh(ud.__boxBottom);
    const boxLeft = asPreviewMesh(ud.__boxLeft);
    const boxRight = asPreviewMesh(ud.__boxRight);
    const boxBack = asPreviewMesh(ud.__boxBack);

    return applySketchPlacementPreview({
      App,
      input,
      THREE,
      g,
      ud,
      meshes: {
        shelfA,
        boxTop,
        boxBottom,
        boxLeft,
        boxRight,
        boxBack,
        helperMeshes: [shelfA, boxTop, boxBottom, boxLeft, boxRight, boxBack],
      },
      shared: __shared,
      wardrobeGroup: __wardrobeGroup,
      asObject: deps.asObject,
    });
  }

  return {
    ensureSketchPlacementPreview,
    hideSketchPlacementPreview,
    setSketchPlacementPreview,
  };
}
