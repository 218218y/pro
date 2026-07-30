# Offline esbuild completion — changed files

This patch contains only the files changed for the esbuild-backed offline test path. It intentionally contains
no downloaded Node or npm archives.

```text
AGENTS.md
README.md
OFFLINE_REPAIR_CORE_CHANGED_FILES.md
docs/OFFLINE_REPAIR_CORE.md
package.json

tests/offline_repair_toolchain_contracts.test.js

tools/bootstrap_offline_esbuild.bat
tools/bootstrap_offline_esbuild.py
tools/bootstrap_offline_esbuild.sh
tools/bootstrap_offline_repair_core.py
tools/run_offline_node24.py
tools/selftest_offline_esbuild.py
tools/verify_offline_repair_vendor.py

vendor/offline/README.md
vendor/offline/esbuild/README.md
vendor/offline/manifest.json
```

Keep the existing Node, Oxc, Prettier, and TypeScript archives. For ChatGPT/Linux x64, manually add
`esbuild-0.28.1.tgz` and `linux-x64-0.28.1.tgz` at the paths documented in
`vendor/offline/esbuild/README.md`.
