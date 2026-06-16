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

## Profiles

Current profiles:

- `bargig` - existing Bargig behavior/table, kept backward-compatible and pointed at the root Bargig assets.
- `store-1` - temporary profile for חנות 1, with its own replaceable logo/PDF files.
- `store-2` - temporary profile for חנות 2, with its own replaceable logo/PDF files.

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

The new stores currently use the same Supabase project/account as Bargig, but each has its own table and Broadcast channel prefix:

```text
bargig  -> wp_shared_state          + wp_cloud_sync
store-1 -> wp_shared_state_store_1  + wp_cloud_sync_store_1
store-2 -> wp_shared_state_store_2  + wp_cloud_sync_store_2
```

Run `docs/supabase_cloud_sync_multi_store.sql` once in the Supabase SQL editor to create the extra tables.

## Local browser data

Bargig keeps the old localStorage keys so existing users do not lose local saved data.

New stores use a namespace:

```text
wp_store_1:wardrobeSavedModels
wp_store_2:wardrobeSavedModels
```

This prevents local browser data from mixing if two stores are ever hosted under the same domain/origin.
