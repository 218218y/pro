# Offline TypeScript archives

TypeScript 7 is a native compiler. The common `typescript` package contains the `tsc` launcher and platform
resolver, while one `@typescript/typescript-<platform>` package contains the native `tsc` executable and
standard libraries.
Both matching version `7.0.2` archives are required.

For Linux x64 place these files here without extracting or renaming them:

```text
vendor/offline/typescript/typescript-7.0.2.tgz
vendor/offline/typescript/typescript-linux-x64-7.0.2.tgz
```

Then run:

```bash
python tools/verify_offline_repair_vendor.py --typescript-only
python tools/bootstrap_offline_typescript.py
python tools/selftest_offline_typescript.py
```
