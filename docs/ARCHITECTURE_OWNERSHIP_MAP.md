# Architecture ownership map

Use this map to find the owner before editing. The goal is to prevent “just one little fallback” from becoming a second implementation. Tiny weeds, giant jungle — we are not watering the jungle.

## Boot and entry

| Surface                       | Canonical owner                                          |
| ----------------------------- | -------------------------------------------------------- |
| Browser dependency collection | `esm/entry_*`                                            |
| Pure app boot                 | `esm/main.ts`                                            |
| Layer install order           | `esm/boot/boot_manifest.ts`, `esm/boot/boot_sequence.ts` |
| UI module install order       | `esm/native/ui/ui_manifest.ts`                           |

## Runtime/platform/kernel

| Surface                                | Canonical owner                                                             |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Browser env helpers/assertions         | `esm/native/runtime/*browser*`, runtime access helpers                      |
| Stable surface install/healing         | `esm/native/runtime/*install*`, relevant service owner                      |
| Store setup and platform orchestration | `esm/native/platform/*`                                                     |
| Domain state/API sections              | `esm/native/kernel/domain_api_surface_sections.ts` and nearby domain owners |
| Build state derivation                 | `esm/native/kernel/*`, builder state resolver surfaces                      |

## Builder/render

| Surface                                    | Canonical owner                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Builder scheduling                         | builder scheduler runtime owner files under `esm/native/builder/*scheduler*` |
| Build flow and completion                  | `esm/native/builder/*build*`, build-flow owners                              |
| Render carcass/interior/preview/dimensions | focused `render_*_ops.ts` helper modules                                     |
| Duplicate build suppression                | builder scheduler/request flow tests and owner modules                       |

## Services

| Surface                      | Canonical owner                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Canvas picking click flow    | `esm/native/services/canvas_picking_click_flow.ts` plus focused route owners     |
| Canvas picking hover flow    | `esm/native/services/canvas_picking_hover_flow.ts` plus focused hover owners     |
| Manual layout/sketch flows   | focused `canvas_picking_*manual*`, `*sketch*`, and layout-edit owners            |
| Notes overlay                | notes overlay state/persistence/palette runtime owners                           |
| Order PDF                    | order-pdf overlay/editor/draft/sketch/export runtime owners                      |
| Saved models service         | `esm/native/services/models.ts` public facade plus focused `models_*` owners     |
| Cloud sync                   | `esm/native/services/cloud_sync_*` lifecycle, transport, panel, and scope owners |
| Autosave/history/project I/O | focused service owners under `esm/native/services/*` and `esm/native/io/*`       |

## UI

| Surface                | Canonical owner                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------- |
| React components       | `esm/native/ui/react/*`                                                               |
| UI interactions/events | `esm/native/ui/interactions/*`                                                        |
| UI selectors/bridges   | focused UI selectors/bridge modules                                                   |
| DOM access             | UI/adapters only; not kernel/builder/services unless explicitly owned by adapter seam |

## Tests/tools

| Surface                        | Canonical owner                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Architecture layer contracts   | `tools/wp_layer_contract.js`, `tools/wp_public_api_contract.js`                                               |
| Docs control plane             | `tools/wp_docs_control_plane_audit.mjs`                                                                       |
| Closeout report target         | `tools/wp_verify_closeout*.cjs` -> `docs/FINAL_VERIFICATION_SUMMARY.*`                                        |
| Perf smoke report target       | `tools/wp_perf_smoke*.mjs` -> `docs/PERF_AND_STABILITY_BASELINE.md`                                           |
| Browser perf report target     | `tools/wp_browser_perf_smoke.mjs` -> `docs/BROWSER_PERF_AND_E2E_BASELINE.md`                                  |
| Script duplicate report target | `tools/wp_script_duplicate_audit.mjs` -> `docs/SCRIPT_DUPLICATE_AUDIT.md`, `docs/script_duplicate_audit.json` |

## Rule of thumb

When a change appears to need edits in many callers, stop and find the owner. The right fix is usually one owner edit plus focused tests, not a confetti cannon of local patches.
