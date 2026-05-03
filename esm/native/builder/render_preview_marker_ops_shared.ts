import { asRecord } from '../runtime/record.js';
import type { RenderPreviewOpsDeps } from './render_preview_ops_contracts.js';
import type {
  MarkerMeshLike,
  MarkerTHREESurface,
  PreviewMarkerArgs,
  RenderPreviewMarkerContext,
  WardrobeAttachmentGroup,
} from './render_preview_marker_ops_types.js';

export function createRenderPreviewMarkerContext(deps: RenderPreviewOpsDeps): RenderPreviewMarkerContext {
  return {
    app: deps.app,
    ops: deps.ops,
    cacheValue: deps.cacheValue,
    writeCacheValue: deps.writeCacheValue,
    wardrobeGroup: deps.wardrobeGroup,
    addToWardrobe: deps.addToWardrobe,
    renderOpsHandleCatch: deps.renderOpsHandleCatch,
    assertTHREE: deps.assertTHREE,
  };
}

export function markerArgsRecord(args: unknown): PreviewMarkerArgs {
  return asRecord<PreviewMarkerArgs>(args) || {};
}

export function asMarkerMesh(value: unknown): MarkerMeshLike | null {
  const mesh = asRecord<MarkerMeshLike>(value);
  return mesh && typeof mesh.add === 'function' ? mesh : null;
}

export function asWardrobeAttachmentGroup(group: unknown): WardrobeAttachmentGroup | null {
  const wardrobeGroup = asRecord<WardrobeAttachmentGroup>(group);
  return wardrobeGroup && typeof wardrobeGroup.add === 'function' ? wardrobeGroup : null;
}

export function readMarkerTHREE(value: unknown): MarkerTHREESurface | null {
  const THREE = asRecord<MarkerTHREESurface>(value);
  if (!THREE) return null;
  return typeof THREE.PlaneGeometry === 'function' &&
    typeof THREE.MeshBasicMaterial === 'function' &&
    typeof THREE.Mesh === 'function'
    ? THREE
    : null;
}

export function ensureWardrobeAttachment(group: unknown, marker: MarkerMeshLike): MarkerMeshLike {
  marker.userData = marker.userData || {};
  marker.userData.__ignoreRaycast = true;
  marker.raycast = function () {};
  const wardrobeGroup = asWardrobeAttachmentGroup(group);
  if (wardrobeGroup && marker.parent !== wardrobeGroup) wardrobeGroup.add(marker);
  return marker;
}

export function ensureCachedMarker(
  cacheKey: string,
  wardrobeGroup: unknown,
  readCache: <T = unknown>(key: string) => T | null
): MarkerMeshLike | null {
  const existing = asMarkerMesh(readCache(cacheKey));
  if (!existing || existing.isMesh !== true) return null;
  return ensureWardrobeAttachment(wardrobeGroup, existing);
}

export function resolveMarkerTHREE(
  App: ReturnType<RenderPreviewOpsDeps['app']>,
  rawArgs: PreviewMarkerArgs,
  assertTHREE: RenderPreviewOpsDeps['assertTHREE'],
  where: string
): MarkerTHREESurface | null {
  const candidate = rawArgs.THREE || assertTHREE(App, where);
  return readMarkerTHREE(candidate);
}
