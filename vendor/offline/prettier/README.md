# Prettier offline archive

`package-lock.json` owns the required Prettier archive. Print the exact official URL and destination path with:

```bash
node tools/wp_refresh_offline_npm_vendor.mjs --component prettier --print-downloads
```

Synchronize automatically, or adopt a file downloaded manually:

```bash
node tools/wp_refresh_offline_npm_vendor.mjs --component prettier
node tools/wp_refresh_offline_npm_vendor.mjs --component prettier --adopt-existing
node tools/wp_refresh_offline_npm_vendor.mjs --component prettier --check
```

The archive is kept untouched and is verified against lockfile SHA-512 integrity and embedded package
name/version before the manifest is updated.
