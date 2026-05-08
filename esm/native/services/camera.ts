// Native ESM implementation of the camera service.
//
// Goals:
// - No `js/**` imports on the ESM path.
// - No IIFE / implicit globals.
// - Canonical camera API lives only on `App.services.camera` (delete-pass: no actions.moveCamera shim).
//
// New code may import and call the exported functions directly.

export { cancelCameraMove, moveCamera } from './camera_motion.js';
export { getCameraService, installCameraService } from './camera_runtime.js';
