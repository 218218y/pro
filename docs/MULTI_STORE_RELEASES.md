# WardrobePro multi-store releases

The project supports store-specific builds without forking the shared application code.

## Source of truth

There are two kinds of store-related files, and they intentionally have different roles:

```text
wp_logo_data.js               # root Bargig default logo used by the existing root build
public/order_template.pdf     # root Bargig default PDF used by the existing root build
wp_runtime_config.mjs         # root Bargig default runtime config used by npm run bundle / bundle:site2

sites/<store-id>/site.profile.mjs  # profile used by the multi-store release wrapper
sites/store-1/wp_logo_data.js      # store-specific logo copy for חנות 1
sites/store-1/order_template.pdf   # store-specific PDF copy for חנות 1
sites/store-2/wp_logo_data.js      # store-specific logo copy for חנות 2
sites/store-2/order_template.pdf   # store-specific PDF copy for חנות 2
```

`sites/bargig/site.profile.mjs` does **not** keep its own copy of the logo or PDF. It points to the existing root files instead:

```text
../../wp_logo_data.js
../../public/order_template.pdf
```

This keeps Bargig backward-compatible and avoids a confusing duplicate copy under `sites/bargig`.

## What not to delete

Do not delete these root files while the root Bargig default commands are still in use:

```text
wp_logo_data.js
public/order_template.pdf
wp_runtime_config.mjs
```

They are still used by:

```bash
npm run bundle
npm run bundle:site2
npm run release
npm run release:release
```

The new multi-store commands generate their own release copy of `wp_logo_data.js`, `order_template.pdf`, and `wp_runtime_config.mjs` from the selected profile. Those generated files live under `dist/...` and should not be edited manually.

## Current Bargig production domains

```text
Main site:     https://pro.bargig-furniture.com/
Customer site: https://pro218.bargig-furniture.com/
```

The Cloud Sync share/copy-link base URL for Bargig must point to the customer site:

```text
shareBaseUrl = https://pro218.bargig-furniture.com/
```

This value is defined in both the backward-compatible root runtime config (`wp_runtime_config.mjs`) and the multi-store Bargig profile (`sites/bargig/site.profile.mjs`).

## Profiles

Current profiles:

- `bargig` - `releaseStatus: 'active'`; existing Bargig behavior/table, kept backward-compatible and pointed at the root Bargig assets.
- `store-1` - `releaseStatus: 'draft'`; temporary profile for חנות 1, with its own replaceable logo/PDF files.
- `store-2` - `releaseStatus: 'draft'`; temporary profile for חנות 2, with its own replaceable logo/PDF files.

`npm run check:site-profiles` scans every profile together. It fails on missing assets, invalid ids/URLs, missing signed-room gateway configuration, or duplicate storage namespaces and realtime channel prefixes. Store identity is signed and enforced by the gateway instead of being inferred from a browser-selected Supabase table. Placeholder deployment URLs are warnings for draft profiles and hard failures after a profile is promoted to `active`. The multi-store release wrapper runs the same audit before building, so release commands cannot bypass the shared contract.

When a new store gets its own branding, replace only these files inside that store folder:

```text
sites/<store-id>/wp_logo_data.js
sites/<store-id>/order_template.pdf
```

Do not change the root Bargig files unless you intend to change the existing/default Bargig site too.

## Build commands

Existing commands are unchanged:

```bash
npm run bundle
npm run bundle:site2
```

New store commands:

```bash
npm run bundle:store1
npm run bundle:store1:site2
npm run bundle:store2
npm run bundle:store2:site2
```

Profile contract:

```bash
npm run check:site-profiles
```

Generic command:

```bash
npm run release:site -- --store store-1 --variant main
npm run release:site -- --store store-1 --variant site2
```

Build output defaults to:

```text
dist/sites/<store-id>/<variant>/release/
```

## Supabase isolation

The stores may share one Supabase project, but Cloud Sync data lives in the protected canonical table and is partitioned by signed `tenant_id` and `store_id` claims. Browser roles have no table privileges. Each deployed origin is bound to exactly one store by the Edge Function, and each store keeps a distinct Broadcast channel prefix:

```text
bargig  -> tenant/store bargig   + wp_cloud_sync
store-1 -> tenant/store store-1  + wp_cloud_sync_store_1
store-2 -> tenant/store store-2  + wp_cloud_sync_store_2
```

For an existing deployment, run `docs/supabase_cloud_sync_multi_store.sql` after the canonical schema is deployed and rerun it immediately before cutover. It copies or reconciles the former per-store rows without interrupting the still-live legacy client. Only after both production origins serve the signed-room client and the gateway probes pass may `docs/supabase_cloud_sync_legacy_lockdown.sql` revoke browser access to the legacy tables.

## Local browser data

Bargig keeps the old localStorage keys so existing users do not lose local saved data.

New stores use a namespace:

```text
wp_store_1:wardrobeSavedModels
wp_store_2:wardrobeSavedModels
```

This prevents local browser data from mixing if two stores are ever hosted under the same domain/origin.
