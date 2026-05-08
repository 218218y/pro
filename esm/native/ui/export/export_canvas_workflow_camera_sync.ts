import type { CameraLike, ControlsLike } from '../../../../types';

export function syncCameraControlsForExportFrame(input: {
  camera: CameraLike | null | undefined;
  controls?: ControlsLike | null | undefined;
}): void {
  const { camera, controls } = input;

  try {
    const updateProjectionMatrix = camera?.updateProjectionMatrix;
    if (typeof updateProjectionMatrix === 'function') updateProjectionMatrix.call(camera);
  } catch {
    // Export rendering is best-effort; stale projection should not block the capture.
  }

  try {
    const update = controls?.update;
    if (typeof update === 'function') update.call(controls);
  } catch {
    // Same as above: a control sync failure should not prevent export delivery.
  }
}
