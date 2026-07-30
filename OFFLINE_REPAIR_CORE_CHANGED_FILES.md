# Offline repair toolchain — changed files

The patch contains only source, configuration, tests, and documentation. It intentionally contains no
downloaded Node or npm archives.

```text
AGENTS.md
README.md
OFFLINE_REPAIR_CORE_CHANGED_FILES.md
docs/OFFLINE_REPAIR_CORE.md
package.json

tests/offline_repair_toolchain_contracts.test.js
tests/wp_typecheck_runtime.test.js

tools/bootstrap_offline_repair_core.py
tools/bootstrap_offline_typescript.bat
tools/bootstrap_offline_typescript.py
tools/bootstrap_offline_typescript.sh
tools/run_offline_node24.py
tools/run_offline_typescript.py
tools/selftest_offline_prettier.py
tools/selftest_offline_typescript.py
tools/verify_offline_repair_vendor.py
tools/wp_typecheck_flow.js
tools/wp_typescript_resolver.js
tools/wp_wardrobe_dimension_public_surface_semantic.mjs

vendor/offline/README.md
vendor/offline/manifest.json
vendor/offline/typescript/README.md
```

After applying the patch, manually add the TypeScript archives listed in
`vendor/offline/typescript/README.md`. For ChatGPT/Linux x64, the TypeScript slice requires the common
`typescript-7.0.2.tgz` launcher package and the native `typescript-linux-x64-7.0.2.tgz` package.
