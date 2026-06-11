import type { AppContainer } from '../../../../types/app.js';
import { stampMirrorLastUpdate } from '../../services/api.js';
import { asRecord, callFn, getProp } from './export_canvas_core_shared.js';
import { _exportReportThrottled } from './export_canvas_core_feedback.js';

function forceMirrorEnvMapRefreshForExport(App: AppContainer): boolean {
  try {
    const render = asRecord(getProp(App, 'render'));
    const cube0 = render['mirrorCubeCamera'];
    const rt0 = render['mirrorRenderTarget'];
    const scene0 = render['scene'];
    const renderer0 = render['renderer'];

    const cube = asRecord(cube0);
    const rt = asRecord(rt0);
    const scene = asRecord(scene0);
    const renderer = asRecord(renderer0);
    const tex = rt['texture'];

    if (
      typeof cube['update'] !== 'function' ||
      typeof scene['traverse'] !== 'function' ||
      typeof renderer['render'] !== 'function' ||
      !tex
    ) {
      return false;
    }

    const mirrorsToHide: Record<string, unknown>[] = [];
    let hasMirror = false;

    try {
      callFn(scene0, 'traverse', (object: unknown) => {
        const o = asRecord(object);
        if (!o['isMesh']) return;

        const mat0 = o['material'];
        if (!mat0) return;

        const matchEnv = (m: unknown): boolean => {
          const rec = asRecord(m);
          return !!rec && rec['envMap'] === tex;
        };

        if (!Array.isArray(mat0)) {
          if (matchEnv(mat0)) {
            hasMirror = true;
            o['visible'] = false;
            mirrorsToHide.push(o);
          }
          return;
        }

        for (let i = 0; i < mat0.length; i++) {
          if (matchEnv(mat0[i])) {
            hasMirror = true;
            o['visible'] = false;
            mirrorsToHide.push(o);
            return;
          }
        }
      });

      if (!hasMirror) return false;

      const sm = asRecord(renderer['shadowMap']);
      const hadAuto = Object.prototype.hasOwnProperty.call(sm, 'autoUpdate');
      const prevAuto = sm['autoUpdate'];
      try {
        if (hadAuto) sm['autoUpdate'] = false;
        callFn(cube0, 'update', renderer0, scene0);
        try {
          stampMirrorLastUpdate(App);
        } catch (e) {
          _exportReportThrottled(App, 'forceMirrorEnvMapRefresh.stampLastUpdate', e, { throttleMs: 1500 });
        }
      } finally {
        try {
          if (hadAuto) sm['autoUpdate'] = prevAuto;
        } catch (e) {
          _exportReportThrottled(App, 'forceMirrorEnvMapRefresh.restoreShadowAutoUpdate', e, {
            throttleMs: 1500,
          });
        }
      }

      return true;
    } finally {
      for (let i = 0; i < mirrorsToHide.length; i++) {
        try {
          mirrorsToHide[i]['visible'] = true;
        } catch (e) {
          _exportReportThrottled(App, 'forceMirrorEnvMapRefresh.restoreHiddenMirrorVisibility', e, {
            throttleMs: 1500,
          });
        }
      }
    }
  } catch (e) {
    _exportReportThrottled(App, 'forceMirrorEnvMapRefresh', e, { throttleMs: 1500 });
    return false;
  }
}

export function renderSceneForExport(
  App: AppContainer,
  rendererIn: unknown,
  sceneIn: unknown,
  cameraIn: unknown
): void {
  try {
    forceMirrorEnvMapRefreshForExport(App);
  } catch (e) {
    _exportReportThrottled(App, 'renderSceneForExport.refreshMirrorEnv', e, { throttleMs: 1000 });
  }
  try {
    callFn(rendererIn, 'render', sceneIn, cameraIn);
  } catch (e) {
    _exportReportThrottled(App, 'renderSceneForExport.render', e, { throttleMs: 1000 });
  }
}
