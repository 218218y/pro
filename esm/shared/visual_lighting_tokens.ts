/**
 * Shared visual-lighting calibration for the room/cabinet viewport.
 *
 * These values are intentionally kept in normal display-light units: no PI
 * multiplier and no old-light scale compensation. The regular viewport mode and
 * the default advanced-lighting preset both read from this file, so tuning the
 * baseline brightness stays predictable instead of splitting into two different
 * lighting worlds.
 */
export const VIEWPORT_NORMAL_EXPOSURE = 1.4;

export const VIEWPORT_NORMAL_LIGHTING_PRESET = {
  amb: 1.2,
  dir: 1.45,
  x: 5,
  y: 8,
  z: 8,
} as const;

export const VIEWPORT_SKETCH_AMBIENT_INTENSITY = 0.95;

/**
 * Directional-shadow quality is calibrated around cabinet-scale geometry.
 *
 * The previous 1024 map over a 20 m orthographic span produced ~19.5 mm
 * shadow texels — effectively one texel per typical board thickness. On flat
 * vertical receivers (side panels and the visible back-panel face), that
 * quantization shows up as broad light/dark ripples near shelves. A 2048 map
 * over a 13 m span brings the projected texel size down to ~6.35 mm while
 * retaining comfortable coverage around the largest supported wardrobe.
 *
 * Contact shadows need a much smaller bias than the old cabinet profile used.
 * In Three.js, normalBias offsets the shadow lookup in world units along the
 * receiver normal. The former 0.02 m value therefore displaced lookups by
 * 20 mm — more than the canonical 18 mm board thickness — and visibly detached
 * shadows at flush roof/side/back/shelf joints. Depth bias is normalized over
 * the shadow camera range, so -0.00025 over 49.9 m also represented roughly
 * 12.5 mm of depth displacement. Keep both offsets around the millimetre scale:
 * enough to suppress self-shadow acne without opening artificial light seams.
 */
export const VIEWPORT_DIRECTIONAL_SHADOW_PRESET = Object.freeze({
  mapSize: 2048,
  cameraHalfExtent: 6.5,
  cameraNear: 0.1,
  cameraFar: 50,
  bias: -0.00002,
  normalBias: 0.0005,
  radius: 1,
});
