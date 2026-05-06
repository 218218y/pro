import { CHEST_MODE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { AppContainer, BuilderCreateInternalDrawerBoxFn } from '../../../types/index.js';

import {
  addChestModeOutlines,
  ensureChestModeApp,
  ensureChestModeTHREE,
} from './visuals_chest_mode_runtime.js';

type AppAwareCreateInternalDrawerBoxFn = (
  App: AppContainer,
  ...args: Parameters<BuilderCreateInternalDrawerBoxFn>
) => ReturnType<BuilderCreateInternalDrawerBoxFn>;

export const createInternalDrawerBox: AppAwareCreateInternalDrawerBoxFn = (
  App,
  w,
  h,
  d,
  mat,
  _drawerMat,
  outlineFunc,
  hasDivider = false,
  addHandle = true,
  options = null
) => {
  App = ensureChestModeApp(App);
  const THREE = ensureChestModeTHREE(App);
  const group = new THREE.Group();
  const outline =
    typeof outlineFunc === 'function' ? outlineFunc : (mesh: unknown) => addChestModeOutlines(mesh, App);
  const drawerBoxDimensions = CHEST_MODE_DIMENSIONS.drawerBox;
  const thickness = drawerBoxDimensions.panelThicknessM;
  const innerH = h;
  const omitFrontPanel = options?.omitFrontPanel === true;

  const floorGeo = new THREE.BoxGeometry(w, thickness, d);
  const floor = new THREE.Mesh(floorGeo, mat);
  floor.position.set(0, -h / 2 + thickness / 2, 0);
  group.add(floor);

  const backGeo = new THREE.BoxGeometry(w, innerH, thickness);
  const back = new THREE.Mesh(backGeo, mat);
  back.position.set(0, 0, -d / 2 + thickness / 2);
  outline(back);
  group.add(back);

  if (!omitFrontPanel) {
    const frontGeo = new THREE.BoxGeometry(w, innerH, thickness);
    const front = new THREE.Mesh(frontGeo, mat);
    front.position.set(0, 0, d / 2 - thickness / 2);
    outline(front);
    group.add(front);

    try {
      const accentW = Number(w);
      const accentH = Number(innerH);
      const accentZ = d / 2 + drawerBoxDimensions.accentZOffsetM;
      if (
        Number.isFinite(accentW) &&
        Number.isFinite(accentH) &&
        accentW > drawerBoxDimensions.accentMinWidthM &&
        accentH > drawerBoxDimensions.accentMinHeightM
      ) {
        const lineT = Math.min(
          drawerBoxDimensions.accentThicknessMaxM,
          Math.max(
            drawerBoxDimensions.accentThicknessMinM,
            Math.min(accentW, accentH) * drawerBoxDimensions.accentThicknessRatio
          )
        );
        if (accentW > lineT * 2 && accentH > lineT * 2) {
          const accentMat = new THREE.MeshBasicMaterial({
            color: 0x4b4b4b,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
          });
          try {
            accentMat.userData = accentMat.userData || {};
            accentMat.userData.__keepMaterial = true;
          } catch {
            // ignore userData failures on minimal test doubles
          }

          const addStrip = (sw: number, sh: number, x: number, y: number) => {
            if (!(sw > 0) || !(sh > 0)) return;
            const strip = new THREE.Mesh(
              new THREE.BoxGeometry(sw, sh, drawerBoxDimensions.accentStripDepthM),
              accentMat
            );
            strip.position.set(x, y, accentZ);
            strip.renderOrder = drawerBoxDimensions.accentRenderOrder;
            strip.userData = strip.userData || {};
            strip.userData.partId = 'internal_drawer_accent_line';
            group.add(strip);
          };

          const sideH = Math.max(drawerBoxDimensions.accentStripDepthM, accentH - 2 * lineT);
          addStrip(accentW, lineT, 0, accentH / 2 - lineT / 2);
          addStrip(accentW, lineT, 0, -(accentH / 2 - lineT / 2));
          addStrip(lineT, sideH, -(accentW / 2 - lineT / 2), 0);
          addStrip(lineT, sideH, accentW / 2 - lineT / 2, 0);
        }
      }
    } catch {
      // ignore accent-strip failures on minimal doubles
    }
  }

  const sideGeo = new THREE.BoxGeometry(thickness, innerH, d - 2 * thickness);
  const left = new THREE.Mesh(sideGeo, mat);
  left.position.set(-w / 2 + thickness / 2, 0, 0);
  outline(left);
  group.add(left);

  const right = new THREE.Mesh(sideGeo, mat);
  right.position.set(w / 2 - thickness / 2, 0, 0);
  outline(right);
  group.add(right);

  if (hasDivider) {
    const divider = new THREE.Mesh(new THREE.BoxGeometry(thickness, innerH, d - 2 * thickness), mat);
    divider.position.set(0, 0, 0);
    outline(divider);
    group.add(divider);
  }

  if (addHandle && !omitFrontPanel) {
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(
        drawerBoxDimensions.handleWidthM,
        drawerBoxDimensions.handleHeightM,
        drawerBoxDimensions.handleDepthM
      ),
      new THREE.MeshStandardMaterial({ color: 0x555555 })
    );
    handle.userData = handle.userData || {};
    handle.userData.__keepMaterial = true;
    handle.position.set(0, 0, d / 2 + drawerBoxDimensions.handleFrontOffsetM);
    group.add(handle);
  }

  return group;
};
