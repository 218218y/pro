import {
  INTERIOR_ROD_CONTENT_CLEARANCE_POLICY,
  INTERIOR_ROD_DEPTH_CLEARANCE_POLICY,
  INTERIOR_ROD_RENDER_POLICY,
} from '../../shared/dimensions/interior_fittings_policy.js';
import type { InteriorTHREESurface } from './render_interior_ops_contracts.js';
import type { ApplySketchRodsArgs } from './render_interior_sketch_support_contracts.js';

import { asMaterial } from './render_interior_sketch_shared.js';

function reportSketchRodSoft(
  args: Pick<ApplySketchRodsArgs, 'reportSoft'>,
  op: string,
  error: unknown
): void {
  try {
    args.reportSoft?.(op, error);
  } catch {
    // Reporting must never break sketch-extra rendering.
  }
}

function resolveSketchRodTHREE(
  args: Pick<ApplySketchRodsArgs, 'THREE' | 'App' | 'assertTHREE' | 'asObject' | 'reportSoft'>
) {
  const { THREE, App, assertTHREE, asObject } = args;
  if (THREE) return THREE;
  try {
    return asObject<InteriorTHREESurface>(
      assertTHREE(
        App,
        'native/builder/render_interior_sketch_support.applySketchRods.localRodThreeResolution'
      )
    );
  } catch (error) {
    reportSketchRodSoft(args, 'applyInteriorSketchExtras.rods.resolveTHREE', error);
    return null;
  }
}

function applySketchRod(args: ApplySketchRodsArgs, y: number): void {
  const { createRod, isFn, innerW, internalCenterX, internalZ, group } = args;

  if (isFn(createRod)) {
    try {
      createRod(y, true, true, null);
      return;
    } catch (error) {
      reportSketchRodSoft(args, 'applyInteriorSketchExtras.rods.installedOwnerRejected', error);
      // If the installed rod owner rejects this sketch rod, render the local visual rod below.
    }
  }

  const resolvedTHREE = resolveSketchRodTHREE(args);
  if (!resolvedTHREE) return;

  const len = Math.max(
    INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.depthHintMinM,
    innerW - INTERIOR_ROD_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM
  );
  const geo = new resolvedTHREE.CylinderGeometry(
    INTERIOR_ROD_RENDER_POLICY.radiusM,
    INTERIOR_ROD_RENDER_POLICY.radiusM,
    len,
    INTERIOR_ROD_RENDER_POLICY.radialSegments
  );
  const mat = new resolvedTHREE.MeshStandardMaterial({
    color: 0x8a8a8a,
    roughness: 0.35,
    metalness: 0.8,
  });
  const matRec = asMaterial(mat);
  if (matRec) matRec.__keepMaterial = true;
  const mesh = new resolvedTHREE.Mesh(geo, mat);
  if (mesh.rotation) mesh.rotation.z = Math.PI / 2;
  mesh.position?.set?.(internalCenterX, y, internalZ);
  mesh.userData = mesh.userData || {};
  mesh.userData.partId = 'all_rods';
  mesh.userData.__wpType = 'sketchRod';
  group.add?.(mesh);
}

export function applySketchRods(args: ApplySketchRodsArgs): void {
  const { rods, yFromNorm } = args;

  if (!rods.length) return;
  for (let i = 0; i < rods.length; i++) {
    const rod = rods[i] || null;
    if (!rod) continue;
    try {
      const y = yFromNorm(rod.yNorm);
      if (y == null) continue;
      applySketchRod(args, y);
    } catch (error) {
      reportSketchRodSoft(args, 'applyInteriorSketchExtras.rods.item', error);
    }
  }
}
