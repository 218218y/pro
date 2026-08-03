# Facade and Public API Policy

WardrobePro is a private application, not a source-distributed package. A source file is internal unless an explicit manifest or supported-surface contract promotes it.

## Public-surface rule

A route is supported only when one of these contracts lists it:

- `tools/wp_features_public_api_manifest.json` for Feature entries.
- `tools/wp_wardrobe_dimension_public_surface_manifest.json` for the 53 supported dimension routes exposed through Runtime and Services.
- an equivalent machine-readable manifest owned by the relevant architecture contract.
- an application or release entrypoint explicitly used by the build and deployment pipeline.

Absence from a manifest means unsupported. Repository source paths do not become public merely because they are importable, once had a barrel, or could theoretically be consumed outside the repository.

The machine-readable policy is `tools/wp_public_surface_policy.json`. `check:features-public-api` enforces both approved Feature entries and retired source paths.

## Supported dimension API

The supported dimension chain is:

```text
esm/native/runtime/api.ts
  -> esm/native/services/api_runtime_base_surface.ts
  -> esm/native/services/api.ts
```

It exposes 52 values and one type. Runtime routes must come directly from their focused canonical owners, except `CHEST_MODE_DIMENSIONS`, whose explicit compatibility owner preserves the supported plain-number declaration without cloning or wrapping the canonical runtime value.

Focused owners under `esm/shared/dimensions/*` remain internal implementation owners. Internal callers should import the narrow owner that owns the policy they need; they must not recreate an aggregate facade.

## Retired dimension surfaces

The following source-path surfaces were retired on 2026-08-03:

- `esm/shared/wardrobe_dimension_tokens_shared.ts`
- `esm/native/features/dimensions/index.ts`

The first was a 99-symbol compatibility facade with no production consumer after the ownership migration. The second was its sole wildcard re-export and was neither consumed in production nor listed in the Feature Public API manifest.

The retirement is deliberate and breaking only for unsupported source-path imports. It does not change Runtime or Services behavior, numeric values, runtime identity, or declarations for their 53 supported routes. The machine policy records the other 46 facade-only routes as unsupported; canonical focused-owner exports that happen to share a name remain internal. The 15 aggregates and aliases that were owned only by the facade are forbidden globally and were not recreated because they had no consumer.

The retired paths must remain absent. Static imports, re-exports, namespace imports, dynamic imports, alias imports, extensionless paths, query/hash variants, and directory-index routes are all forbidden. Outside the focused-owner directory, direct dimension-owner re-exports are allowed only as exact entries of the supported Runtime manifest: wildcard barrels, aliases, unlisted routes, and parallel re-export surfaces are rejected. The 15 facade-owned aggregate identities must not be reconstructed. Narrow owner-specific compositions remain valid internal implementation seams; the policy does not attempt to reject them by heuristic shape.

## Facade standard

A facade is appropriate when it owns a deliberate stable boundary, shields many consumers from private implementation layout, or represents a service/family/adapter contract. It may re-export a small typed surface or assemble a narrow public factory, but it must not own business logic, mutable state, DOM/storage/timer work, fallback chains, or historical aliases without a live compatibility requirement.

Do not add a facade when there is one internal caller, the focused owner is already the correct boundary, or the wrapper exists only to preserve an obsolete name. A compatibility shim requires a real consumer, an owner, a removal condition, and a contract that blocks new callers.

## API change sequence

For an intentional public API change:

1. Inventory every current consumer and classify the boundary.
2. Confirm the canonical typed owner and replacement route.
3. Migrate internal consumers.
4. Lock the supported surface and runtime/declaration behavior.
5. Add negative import guards for the retired route.
6. Remove the old route, callers, reports, snapshots, and compatibility-only tooling as one complete slice.
7. Lower architecture ratchets immediately.

Do not retain deprecated entries in a manifest after the contract proves that no supported consumer remains.

## Relevant checks

```bash
npm run check:features-public-api
node --test tests/retired_dimension_import_paths_contract.test.js
node --test tests/wardrobe_dimension_runtime_public_surface_contract.test.js
npm run contract:layers
npm run contract:layers:propose
npm run contract:layers:ratchet
```
