# Zustand delete-pass audit (Stage 20/21)

Focus: **stateKernel usage in `esm/native/ui/**`and`esm/native/services/**`**

## What changed in this pass

- Centralized **history-system probing** into `esm/native/runtime/history_system_access.ts`
  - used by:
    - `services/history.ts`
    - `services/autosave.ts`
    - `services/models.ts`
    - `ui/bootstrap/ui_context.ts`
    - `ui/react/overlay_app.tsx`
- Centralized **store-reactivity flag probing** into `esm/native/runtime/store_reactivity_access.ts (with platform compat re-export)`
  - used by:
    - `ui/bindings/core_bindings.ts`
    - `ui/bindings/pro_controls_bindings.ts`

## Remaining `stateKernel` mentions in UI/services after this pass (expected)

- `ui/boot_main.ts` — **boot/kernel seam (legit)** for install/seed commit.
- `ui/bindings/pro_controls_bindings.ts` — type annotations only (`stateKernel?: unknown`), no runtime probing.
- `services/canvas_picking_core.ts` — comment only (documents cleanup).

## Why this matters

This reduces delete-pass risk because future sweeps no longer need to inspect multiple ad-hoc
`stateKernel.historySystem` / `services.history.system` / `deps.historySystem` fallback chains.
The fallback policy is now in one place and can be deleted or tightened later without UI churn.

## Remaining big-ticket work toward “delete old for real”

- Final sweep of legacy **reads** (not just writes) in non-boot UI paths
- Remove dead compat branches after parity coverage passes in production-heavy flows
- Normalize a few remaining legacy naming seams (runtime helpers) where they still leak old intent
