# Offline esbuild archives

`package-lock.json` owns the common esbuild package and matching Linux x64 native package. Print the exact
official URLs and destination paths with:

```bash
node tools/wp_refresh_offline_npm_vendor.mjs --component esbuild --print-downloads
```

Synchronize automatically, or adopt files downloaded manually:

```bash
node tools/wp_refresh_offline_npm_vendor.mjs --component esbuild
node tools/wp_refresh_offline_npm_vendor.mjs --component esbuild --adopt-existing
node tools/wp_refresh_offline_npm_vendor.mjs --component esbuild --check
```

The synchronizer requires aligned versions, validates both SHA-512 values and package metadata, and derives
the native `bin/esbuild` SHA-256 from the verified platform archive before updating the manifest.
