# Builder pipeline context policy

Stage 16 tightens the builder execution seam without changing product behavior.

## Policy

- The public build entry may accept the high-level build request.
- After the prepare seam, live builder orchestration must move through prepared/context objects, not loosely-shaped `args` bags.
- Dependency validation belongs in `resolveBuilderDepsOrThrow`; missing critical deps must fail there with clear errors.
- String normalization for build setup is owned by `build_string_normalizer.ts`; `build_wardrobe_flow_context_setup.ts` should not carry ad-hoc fallback helpers.
- Builder hotpaths must not re-introduce globals, DOM probing, direct storage, or direct timers. That remains covered by `wp_builder_context_policy_audit.mjs`.

## Protected by

- `tools/wp_builder_pipeline_contract.mjs`
- `tests/refactor_stage16_builder_pipeline_runtime.test.js`
- `npm run check:builder-pipeline-contract`
- `npm run check:refactor-guardrails`
