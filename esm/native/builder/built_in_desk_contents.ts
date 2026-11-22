import type { BuilderFoldedContentsPolicy } from '../../../types';
import type { ResolvedBuiltInDesk } from './render_built_in_desk.js';

type AddFoldedContents<Group> = (
  x: number,
  y: number,
  z: number,
  width: number,
  group: Group,
  maxHeight: number | undefined,
  maxDepth: number | undefined,
  policy: BuilderFoldedContentsPolicy
) => unknown;

export function fitFoldedContentsAroundDesk<Group>(
  desk: ResolvedBuiltInDesk | null,
  addFoldedContents: AddFoldedContents<Group>
): AddFoldedContents<Group> {
  if (!desk) return addFoldedContents;

  const { leftX, rightX, backZ } = desk.host.geometry;
  const { top, verticalRange } = desk.plan;
  const endZ = top.z + top.depth / 2;

  return (x, y, z, width, group, maxHeight, maxDepth, policy) => {
    const halfDepth = (maxDepth ?? 0) / 2;
    const overlapsDesk =
      x + width / 2 > leftX && x - width / 2 < rightX && z + halfDepth > backZ && z - halfDepth < endZ;
    if (!overlapsDesk || y >= verticalRange.surfaceY - 1e-6) {
      return addFoldedContents(x, y, z, width, group, maxHeight, maxDepth, policy);
    }

    const freeHeight = verticalRange.bottomY - y;
    if (freeHeight > 0) {
      return addFoldedContents(
        x,
        y,
        z,
        width,
        group,
        Math.min(maxHeight ?? freeHeight, freeHeight),
        maxDepth,
        policy
      );
    }
    return undefined;
  };
}
