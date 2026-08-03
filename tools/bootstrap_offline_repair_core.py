#!/usr/bin/env python3
"""Install the repository's focused offline Node, AST, esbuild, TSX, TypeScript and Prettier toolchain.

The script never invokes npm and never runs package lifecycle scripts. It only
uses files explicitly listed in vendor/offline/manifest.json and validates them
against .node-version, the active toolchain compatibility window, package-lock.json
where applicable, and pinned checksums before extraction.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "vendor" / "offline" / "manifest.json"
LOCK_PATH = ROOT / "package-lock.json"
NODE_VERSION_PATH = ROOT / ".node-version"
SUPPORTED_PLATFORM_KEY = "linux-x64"
UNSUPPORTED_PLATFORM_MESSAGE = "Offline repair vendor supports Linux x64 glibc only"


class OfflineCoreError(RuntimeError):
    pass


def _read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise OfflineCoreError(f"Required file is missing: {_display_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise OfflineCoreError(f"Invalid JSON in {_display_path(path)}: {exc}") from exc


def load_manifest() -> dict:
    manifest = _read_json(MANIFEST_PATH)
    if manifest.get("schemaVersion") != 1:
        raise OfflineCoreError("Unsupported vendor/offline/manifest.json schemaVersion")
    return manifest


def platform_key() -> str:
    machine = platform.machine().lower()
    if (
        not sys.platform.startswith("linux")
        or machine not in {"x86_64", "amd64"}
        or not _is_glibc_linux()
    ):
        raise OfflineCoreError(UNSUPPORTED_PLATFORM_MESSAGE)
    return SUPPORTED_PLATFORM_KEY


def _is_glibc_linux() -> bool:
    if not sys.platform.startswith("linux"):
        return False
    libc_name, _ = platform.libc_ver()
    if libc_name:
        normalized_name = libc_name.lower()
        return "glibc" in normalized_name or "gnu libc" in normalized_name
    ldd = shutil.which("ldd")
    if not ldd:
        return False
    probe = subprocess.run([ldd, "--version"], text=True, capture_output=True, check=False)
    output = (probe.stdout + probe.stderr).lower()
    return probe.returncode == 0 and ("glibc" in output or "gnu libc" in output)


def _safe_relative_posix(value: str, label: str) -> PurePosixPath:
    path = PurePosixPath(value)
    if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in path.parts):
        raise OfflineCoreError(f"Unsafe {label}: {value!r}")
    return path


def _root_path(relative: str, label: str) -> Path:
    posix = _safe_relative_posix(relative, label)
    candidate = ROOT.joinpath(*posix.parts)
    resolved_parent = candidate.parent.resolve()
    root_resolved = ROOT.resolve()
    if resolved_parent != root_resolved and root_resolved not in resolved_parent.parents:
        raise OfflineCoreError(f"{label} escapes repository root: {relative!r}")
    return candidate


def _display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha512_integrity(path: Path) -> str:
    digest = hashlib.sha512()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return "sha512-" + base64.b64encode(digest.digest()).decode("ascii")


def _require_file(path: Path, url: str) -> None:
    if not path.is_file():
        rel = _display_path(path)
        raise OfflineCoreError(
            f"Offline package is missing: {rel}\nDownload it from:\n{url}\n"
            f"and save it at that exact repository path."
        )


def _validate_lock_entry(packages: dict, entry: dict, expected_version: str, label: str) -> None:
    lock_path = entry["lockPath"]
    lock_entry = packages.get(lock_path)
    if not isinstance(lock_entry, dict):
        raise OfflineCoreError(f"{label} package is absent from package-lock.json: {lock_path}")
    if lock_entry.get("resolved") != entry["url"]:
        raise OfflineCoreError(f"Resolved URL mismatch for {lock_path}")
    if lock_entry.get("integrity") != entry["integrity"]:
        raise OfflineCoreError(f"Integrity mismatch for {lock_path}")
    if str(lock_entry.get("version")) != str(expected_version):
        raise OfflineCoreError(f"Version mismatch for {lock_path}")


def _bounded_range_accepts(version: str, requirement: str) -> bool:
    match = re.fullmatch(r">=(\d+\.\d+\.\d+) <(\d+\.\d+\.\d+)", requirement)
    if match is None:
        return False
    try:
        actual = tuple(int(part) for part in version.split("."))
        minimum = tuple(int(part) for part in match.group(1).split("."))
        maximum = tuple(int(part) for part in match.group(2).split("."))
    except ValueError:
        return False
    return (
        len(actual) == 3
        and len(minimum) == 3
        and len(maximum) == 3
        and minimum <= actual < maximum
    )


def _tilde_range_accepts(version: str, requirement: str) -> bool:
    if not requirement.startswith("~"):
        return False
    try:
        actual = tuple(int(part) for part in version.split("."))
        minimum = tuple(int(part) for part in requirement[1:].split("."))
    except ValueError:
        return False
    return len(actual) == 3 and len(minimum) == 3 and actual[:2] == minimum[:2] and actual >= minimum


def validate_manifest_against_project(manifest: dict) -> None:
    pinned_node = NODE_VERSION_PATH.read_text(encoding="utf-8").strip()
    manifest_node = str(manifest["node"]["version"])
    if pinned_node != manifest_node:
        raise OfflineCoreError(
            f"Node manifest version {manifest_node} does not match .node-version {pinned_node}"
        )

    lock = _read_json(LOCK_PATH)
    packages = lock.get("packages")
    if not isinstance(packages, dict):
        raise OfflineCoreError("package-lock.json has no packages map")

    ast = manifest.get("ast")
    if not isinstance(ast, dict):
        raise OfflineCoreError("vendor/offline/manifest.json has no AST fallback definition")
    offline_ast_version = str(ast.get("version", ""))
    compatible_project_range = str(ast.get("compatibleProjectRange", ""))
    project_ast_version = str(packages.get("node_modules/oxc-parser", {}).get("version", ""))
    if not _bounded_range_accepts(offline_ast_version, compatible_project_range):
        raise OfflineCoreError(
            f"Offline AST version {offline_ast_version} is outside compatibility range {compatible_project_range}"
        )
    if not _bounded_range_accepts(project_ast_version, compatible_project_range):
        raise OfflineCoreError(
            f"Project oxc-parser {project_ast_version} is outside offline AST compatibility range {compatible_project_range}"
        )
    ast_entries = list(ast.get("packages", [])) + list(ast.get("bindings", {}).values())
    for entry in ast_entries:
        if offline_ast_version not in str(entry.get("url", "")):
            raise OfflineCoreError(
                f"Offline AST URL does not match fallback version: {entry.get('url')}"
            )
        if offline_ast_version not in str(entry.get("file", "")):
            raise OfflineCoreError(
                f"Offline AST archive name does not match fallback version: {entry.get('file')}"
            )

    esbuild = manifest.get("esbuild")
    if not isinstance(esbuild, dict) or not isinstance(esbuild.get("package"), dict):
        raise OfflineCoreError("vendor/offline/manifest.json has no esbuild package definition")
    _validate_lock_entry(packages, esbuild["package"], str(esbuild["version"]), "esbuild")
    esbuild_platforms = esbuild.get("platforms")
    if not isinstance(esbuild_platforms, dict) or not esbuild_platforms:
        raise OfflineCoreError("vendor/offline/manifest.json has no esbuild platform definitions")
    for entry in esbuild_platforms.values():
        _validate_lock_entry(packages, entry, str(esbuild["version"]), "esbuild platform")

    tsx = manifest.get("tsx")
    if not isinstance(tsx, dict) or not isinstance(tsx.get("package"), dict):
        raise OfflineCoreError("vendor/offline/manifest.json has no TSX package definition")
    _validate_lock_entry(packages, tsx["package"], str(tsx["version"]), "TSX")
    tsx_lock_entry = packages.get(tsx["package"]["lockPath"])
    expected_esbuild_range = tsx.get("esbuildRange")
    if not isinstance(expected_esbuild_range, str) or not expected_esbuild_range:
        raise OfflineCoreError("vendor/offline/manifest.json has no TSX esbuild dependency range")
    if tsx_lock_entry.get("dependencies", {}).get("esbuild") != expected_esbuild_range:
        raise OfflineCoreError("TSX esbuild dependency range does not match package-lock.json")
    if not _tilde_range_accepts(str(esbuild["version"]), expected_esbuild_range):
        raise OfflineCoreError(
            f"Offline esbuild {esbuild['version']} does not satisfy TSX dependency "
            f"{expected_esbuild_range}"
        )

    prettier = manifest.get("prettier")
    if not isinstance(prettier, dict) or not isinstance(prettier.get("package"), dict):
        raise OfflineCoreError("vendor/offline/manifest.json has no Prettier package definition")
    _validate_lock_entry(packages, prettier["package"], str(prettier["version"]), "Prettier")

    typescript = manifest.get("typescript")
    if not isinstance(typescript, dict) or not isinstance(typescript.get("package"), dict):
        raise OfflineCoreError("vendor/offline/manifest.json has no TypeScript package definition")
    _validate_lock_entry(packages, typescript["package"], str(typescript["version"]), "TypeScript")
    platforms = typescript.get("platforms")
    if not isinstance(platforms, dict) or not platforms:
        raise OfflineCoreError("vendor/offline/manifest.json has no TypeScript platform definitions")
    for entry in platforms.values():
        _validate_lock_entry(packages, entry, str(typescript["version"]), "TypeScript platform")

    workspace = manifest.get("workspace")
    if workspace is not None:
        if not isinstance(workspace, dict):
            raise OfflineCoreError("vendor/offline/manifest.json has an invalid workspace definition")
        expected_platform = {
            "key": SUPPORTED_PLATFORM_KEY,
            "os": "linux",
            "cpu": "x64",
            "libc": "glibc",
        }
        if workspace.get("platform") != expected_platform:
            raise OfflineCoreError("Offline workspace profiles must target Linux x64 glibc only")
        expected_lockfile_sha256 = _sha256(LOCK_PATH)
        if workspace.get("lockfileSha256") != expected_lockfile_sha256:
            raise OfflineCoreError(
                "Offline workspace plan is stale for package-lock.json; run "
                "npm run vendor:offline:tsx-tests:plan"
            )
        profiles = workspace.get("profiles")
        if not isinstance(profiles, dict):
            raise OfflineCoreError("Offline workspace definition has no profiles map")
        for profile_name, profile in profiles.items():
            if not isinstance(profile, dict):
                raise OfflineCoreError(f"Invalid offline workspace profile: {profile_name}")
            entries = profile.get("packages")
            if not isinstance(entries, list) or not entries:
                raise OfflineCoreError(f"Offline workspace profile {profile_name} has no packages")
            if profile.get("packageCount") != len(entries):
                raise OfflineCoreError(
                    f"Offline workspace profile {profile_name} packageCount is stale"
                )
            for entry in entries:
                version = str(entry.get("version", ""))
                _validate_lock_entry(
                    packages,
                    entry,
                    version,
                    f"workspace profile {profile_name}",
                )


def selected_entries(manifest: dict, key: str) -> tuple[dict, list[dict]]:
    node_entry = manifest["node"]["platforms"].get(key)
    binding_entry = manifest["ast"]["bindings"].get(key)
    if node_entry is None or binding_entry is None:
        raise OfflineCoreError(f"No offline repair-core definition for platform {key}")
    return node_entry, [*manifest["ast"]["packages"], binding_entry]


def prettier_entry(manifest: dict) -> dict:
    entry = manifest.get("prettier", {}).get("package")
    if not isinstance(entry, dict):
        raise OfflineCoreError("No offline Prettier package definition")
    return entry


def tsx_entry(manifest: dict) -> dict:
    entry = manifest.get("tsx", {}).get("package")
    if not isinstance(entry, dict):
        raise OfflineCoreError("No offline TSX package definition")
    return entry


def esbuild_entries(manifest: dict, key: str) -> tuple[dict, dict]:
    esbuild = manifest.get("esbuild")
    if not isinstance(esbuild, dict):
        raise OfflineCoreError("No offline esbuild package definition")
    package_entry = esbuild.get("package")
    platform_entry = esbuild.get("platforms", {}).get(key)
    if not isinstance(package_entry, dict) or not isinstance(platform_entry, dict):
        raise OfflineCoreError(f"No offline esbuild definition for platform {key}")
    return package_entry, platform_entry


def typescript_entries(manifest: dict, key: str) -> tuple[dict, dict]:
    typescript = manifest.get("typescript")
    if not isinstance(typescript, dict):
        raise OfflineCoreError("No offline TypeScript package definition")
    package_entry = typescript.get("package")
    platform_entry = typescript.get("platforms", {}).get(key)
    if not isinstance(package_entry, dict) or not isinstance(platform_entry, dict):
        raise OfflineCoreError(f"No offline TypeScript definition for platform {key}")
    return package_entry, platform_entry


def workspace_profile(manifest: dict, key: str, profile_name: str = "tsx-tests") -> dict:
    workspace = manifest.get("workspace")
    if not isinstance(workspace, dict):
        raise OfflineCoreError("No offline workspace definition")
    platform_definition = workspace.get("platform")
    if not isinstance(platform_definition, dict) or platform_definition.get("key") != key:
        raise OfflineCoreError(f"No offline workspace definition for platform {key}")
    profile = workspace.get("profiles", {}).get(profile_name)
    if not isinstance(profile, dict):
        raise OfflineCoreError(f"No offline workspace profile named {profile_name}")
    entries = profile.get("packages")
    if not isinstance(entries, list) or not entries:
        raise OfflineCoreError(f"Offline workspace profile {profile_name} has no packages")
    return profile


def _verify_npm_archives(
    entries: list[dict],
    label: str,
    *,
    missing_command: str | None = None,
) -> None:
    missing: list[dict] = []
    for entry in entries:
        archive = _root_path(entry["file"], f"{label} archive path")
        if not archive.is_file():
            missing.append(entry)
            continue
        actual = _sha512_integrity(archive)
        if actual != entry["integrity"]:
            raise OfflineCoreError(
                f"SHA-512 integrity mismatch for {_display_path(archive)}\n"
                f"expected: {entry['integrity']}\nactual:   {actual}"
            )
    if missing:
        first = missing[0]
        guidance = f"\nRun:\n{missing_command}" if missing_command else ""
        raise OfflineCoreError(
            f"{label} is missing {len(missing)} archive(s).\n"
            f"First missing archive: {first['file']}\n"
            f"Download it from:\n{first['url']}\n"
            f"and save it at that exact repository path.{guidance}"
        )


def verify_vendor(
    manifest: dict,
    key: str,
    *,
    node: bool = True,
    ast: bool = True,
    esbuild: bool = False,
    tsx: bool = False,
    prettier: bool = False,
    typescript: bool = False,
    workspace_profile_name: str | None = None,
) -> None:
    validate_manifest_against_project(manifest)
    node_entry, ast_entries = selected_entries(manifest, key)

    if node:
        archive = _root_path(node_entry["file"], "Node archive path")
        _require_file(archive, node_entry["url"])
        actual = _sha256(archive)
        if actual != node_entry["sha256"]:
            raise OfflineCoreError(
                f"SHA-256 mismatch for {_display_path(archive)}\n"
                f"expected: {node_entry['sha256']}\nactual:   {actual}"
            )

    if ast:
        _verify_npm_archives(ast_entries, "AST")

    if esbuild or tsx:
        _verify_npm_archives(list(esbuild_entries(manifest, key)), "esbuild")

    if tsx:
        _verify_npm_archives([tsx_entry(manifest)], "TSX")

    if prettier:
        _verify_npm_archives([prettier_entry(manifest)], "Prettier")

    if typescript:
        _verify_npm_archives(list(typescript_entries(manifest, key)), "TypeScript")

    if workspace_profile_name:
        profile = workspace_profile(manifest, key, workspace_profile_name)
        _verify_npm_archives(
            profile["packages"],
            f"workspace {workspace_profile_name}",
            missing_command="npm run vendor:offline:tsx-tests:downloads",
        )


def _extract_node_binary(archive: Path, member_name: str, destination: Path) -> None:
    expected = str(_safe_relative_posix(member_name, "Node archive member"))
    destination.parent.mkdir(parents=True, exist_ok=True)

    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as bundle:
            try:
                info = bundle.getinfo(expected)
            except KeyError as exc:
                raise OfflineCoreError(f"Node archive does not contain {expected}") from exc
            if info.is_dir():
                raise OfflineCoreError(f"Node archive member is not a file: {expected}")
            with bundle.open(info) as source, destination.open("wb") as target:
                shutil.copyfileobj(source, target)
    else:
        try:
            with tarfile.open(archive, mode="r:*") as bundle:
                try:
                    member = bundle.getmember(expected)
                except KeyError as exc:
                    raise OfflineCoreError(f"Node archive does not contain {expected}") from exc
                if not member.isfile():
                    raise OfflineCoreError(f"Node archive member is not a regular file: {expected}")
                source = bundle.extractfile(member)
                if source is None:
                    raise OfflineCoreError(f"Cannot read Node archive member: {expected}")
                with source, destination.open("wb") as target:
                    shutil.copyfileobj(source, target)
        except tarfile.TarError as exc:
            raise OfflineCoreError(f"Invalid Node archive {_display_path(archive)}: {exc}") from exc

    if os.name != "nt":
        destination.chmod(0o755)


def install_node(manifest: dict, key: str, *, force: bool = False) -> Path:
    node_entry, _ = selected_entries(manifest, key)
    install_dir = _root_path(manifest["node"]["installDirectory"], "Node install directory")
    executable = install_dir.joinpath(*PurePosixPath(node_entry["installedExecutable"]).parts)
    expected_version = f"v{manifest['node']['version']}"

    if executable.is_file() and not force:
        probe = subprocess.run([str(executable), "--version"], text=True, capture_output=True, check=False)
        if probe.returncode == 0 and probe.stdout.strip() == expected_version:
            return executable

    archive = _root_path(node_entry["file"], "Node archive path")
    install_dir.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix="node24-", dir=install_dir.parent))
    try:
        temp_executable = temp_dir.joinpath(*PurePosixPath(node_entry["installedExecutable"]).parts)
        _extract_node_binary(archive, node_entry["archiveMember"], temp_executable)
        probe = subprocess.run([str(temp_executable), "--version"], text=True, capture_output=True, check=False)
        if probe.returncode != 0 or probe.stdout.strip() != expected_version:
            detail = (probe.stderr or probe.stdout).strip()
            raise OfflineCoreError(
                f"Extracted Node runtime failed verification; expected {expected_version}, got "
                f"{probe.stdout.strip() or detail or 'no output'}"
            )
        if install_dir.exists():
            shutil.rmtree(install_dir)
        temp_dir.replace(install_dir)
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    return executable


def _extract_npm_tgz(archive: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix=destination.name + "-", dir=destination.parent))
    try:
        with tarfile.open(archive, mode="r:gz") as bundle:
            members = bundle.getmembers()
            if not members:
                raise OfflineCoreError(f"Empty npm archive: {_display_path(archive)}")
            for member in members:
                path = PurePosixPath(member.name)
                if path.is_absolute() or not path.parts or path.parts[0] != "package":
                    raise OfflineCoreError(
                        f"Unexpected npm archive path in {_display_path(archive)}: {member.name!r}"
                    )
                relative = PurePosixPath(*path.parts[1:])
                if not relative.parts:
                    continue
                if any(part in {"", ".", ".."} for part in relative.parts):
                    raise OfflineCoreError(
                        f"Unsafe npm archive path in {_display_path(archive)}: {member.name!r}"
                    )
                target = temp_dir.joinpath(*relative.parts)
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                if not member.isfile():
                    raise OfflineCoreError(
                        f"Unsupported non-regular npm archive member: {member.name!r}"
                    )
                target.parent.mkdir(parents=True, exist_ok=True)
                source = bundle.extractfile(member)
                if source is None:
                    raise OfflineCoreError(f"Cannot read npm archive member: {member.name!r}")
                with source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
                target.chmod(member.mode & 0o777 or 0o644)

        package_json = temp_dir / "package.json"
        if not package_json.is_file():
            raise OfflineCoreError(f"npm archive has no package/package.json: {_display_path(archive)}")
        if destination.exists():
            shutil.rmtree(destination)
        temp_dir.replace(destination)
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise


def _installed_package_version(destination: Path) -> str | None:
    package_json = destination / "package.json"
    if not package_json.is_file():
        return None
    try:
        value = json.loads(package_json.read_text(encoding="utf-8")).get("version")
    except (OSError, json.JSONDecodeError):
        return None
    return str(value) if value is not None else None


def _install_npm_entry(entry: dict, expected_version: str, *, force: bool = False) -> Path:
    archive = _root_path(entry["file"], "npm archive path")
    destination = _root_path(entry["installPath"], "npm install path")
    if not force and _installed_package_version(destination) == expected_version:
        return destination
    _extract_npm_tgz(archive, destination)
    actual_version = _installed_package_version(destination)
    if actual_version != expected_version:
        raise OfflineCoreError(
            f"Extracted package version mismatch at {_display_path(destination)}; "
            f"expected {expected_version}, got {actual_version or 'missing'}"
        )
    return destination


def _workspace_stamp_path(profile_name: str) -> Path:
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]+", "-", profile_name)
    return ROOT / "node_modules" / f".offline-workspace-{safe_name}.json"


def _protected_offline_install_paths(manifest: dict, key: str) -> set[str]:
    protected: set[str] = set()
    _, ast_entries = selected_entries(manifest, key)
    entries = [
        *ast_entries,
        *esbuild_entries(manifest, key),
        tsx_entry(manifest),
        prettier_entry(manifest),
        *typescript_entries(manifest, key),
    ]
    for entry in entries:
        install_path = entry.get("installPath")
        if isinstance(install_path, str):
            protected.add(install_path)
    return protected


def _remove_stale_workspace_packages(
    manifest: dict,
    key: str,
    profile_name: str,
    current_paths: set[str],
) -> None:
    stamp_path = _workspace_stamp_path(profile_name)
    if not stamp_path.is_file():
        return
    try:
        previous = json.loads(stamp_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    previous_paths = previous.get("installPaths")
    if not isinstance(previous_paths, list):
        return
    protected = _protected_offline_install_paths(manifest, key)
    for install_path in previous_paths:
        if not isinstance(install_path, str):
            continue
        if install_path in current_paths or install_path in protected:
            continue
        destination = _root_path(install_path, "stale workspace install path")
        if destination.exists():
            shutil.rmtree(destination)


def _write_workspace_stamp(profile_name: str, profile: dict) -> None:
    stamp_path = _workspace_stamp_path(profile_name)
    stamp_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "profile": profile_name,
        "packageCount": len(profile["packages"]),
        "installPaths": [entry["installPath"] for entry in profile["packages"]],
    }
    temporary = stamp_path.with_name(f"{stamp_path.name}.tmp-{os.getpid()}")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(stamp_path)


def install_workspace_profile(
    manifest: dict,
    key: str,
    node_executable: Path,
    profile_name: str = "tsx-tests",
    *,
    force: bool = False,
) -> None:
    profile = workspace_profile(manifest, key, profile_name)
    entries = sorted(
        profile["packages"],
        key=lambda entry: (entry["installPath"].count("/node_modules/"), entry["installPath"]),
    )
    current_paths = {entry["installPath"] for entry in entries}
    _remove_stale_workspace_packages(manifest, key, profile_name, current_paths)
    for entry in entries:
        _install_npm_entry(entry, str(entry["version"]), force=force)

    if profile_name == "tsx-tests":
        roots = profile.get("rootDependencies", [])
        probe_script = (
            "const roots=JSON.parse(process.argv[1]);"
            "for(const name of roots){if(!import.meta.resolve(name)) throw new Error('unresolved '+name);}"
            "const React=(await import('react')).default;"
            "const {renderToStaticMarkup}=await import('react-dom/server');"
            "const html=renderToStaticMarkup(React.createElement('span',null,'offline-runtime-ok'));"
            "if(!html.includes('offline-runtime-ok')) throw new Error('React SSR probe failed');"
            "console.log('workspace-runtime-ok');"
        )
        probe = subprocess.run(
            [
                str(node_executable),
                "--input-type=module",
                "--eval",
                probe_script,
                json.dumps(roots),
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        if probe.returncode != 0 or probe.stdout.strip() != "workspace-runtime-ok":
            detail = (probe.stderr or probe.stdout).strip()
            raise OfflineCoreError(
                "Offline workspace packages were extracted but the TSX runtime profile failed "
                f"verification:\n{detail or 'no output'}"
            )

    _write_workspace_stamp(profile_name, profile)


def install_ast(manifest: dict, key: str, node_executable: Path, *, force: bool = False) -> None:
    _, entries = selected_entries(manifest, key)
    expected_version = str(manifest["ast"]["version"])
    for entry in entries:
        _install_npm_entry(entry, expected_version, force=force)

    probe_script = (
        "import fs from 'node:fs';"
        "import('oxc-parser').then(m=>{const r=m.parseSync('offline_probe.js','export const ok = 1;');"
        "if(!r||!r.program) throw new Error('missing AST program');"
        "const p=JSON.parse(fs.readFileSync('node_modules/oxc-parser/package.json','utf8'));"
        "console.log('oxc-parser '+p.version);"
        "}).catch(e=>{console.error(e);process.exit(1)})"
    )
    probe = subprocess.run(
        [str(node_executable), "--input-type=module", "--eval", probe_script],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if probe.returncode != 0:
        raise OfflineCoreError(
            "The offline AST packages were extracted but oxc-parser could not load:\n"
            + (probe.stderr or probe.stdout).strip()
        )


def install_esbuild(
    manifest: dict,
    key: str,
    node_executable: Path,
    *,
    force: bool = False,
) -> Path:
    package_entry, platform_entry = esbuild_entries(manifest, key)
    expected_version = str(manifest["esbuild"]["version"])
    package_dir = _install_npm_entry(package_entry, expected_version, force=force)
    platform_dir = _install_npm_entry(platform_entry, expected_version, force=force)

    launcher = package_dir.joinpath(
        *_safe_relative_posix(manifest["esbuild"]["launcher"], "esbuild launcher").parts
    )
    executable = platform_dir.joinpath(
        *_safe_relative_posix(platform_entry["executable"], "esbuild platform executable").parts
    )
    expected_binary_sha256 = platform_entry.get("binarySha256")
    if not isinstance(expected_binary_sha256, str) or not expected_binary_sha256:
        raise OfflineCoreError(f"No pinned esbuild binary SHA-256 for platform {key}")

    def installed_files_are_valid() -> bool:
        return (
            launcher.is_file()
            and executable.is_file()
            and _sha256(executable) == expected_binary_sha256
        )

    if not installed_files_are_valid() and not force:
        package_dir = _install_npm_entry(package_entry, expected_version, force=True)
        platform_dir = _install_npm_entry(platform_entry, expected_version, force=True)
        launcher = package_dir.joinpath(
            *_safe_relative_posix(manifest["esbuild"]["launcher"], "esbuild launcher").parts
        )
        executable = platform_dir.joinpath(
            *_safe_relative_posix(platform_entry["executable"], "esbuild platform executable").parts
        )

    if not launcher.is_file():
        raise OfflineCoreError(f"esbuild launcher is missing after extraction: {_display_path(launcher)}")
    if not executable.is_file():
        raise OfflineCoreError(
            f"esbuild native executable is missing after extraction: {_display_path(executable)}"
        )
    actual_binary_sha256 = _sha256(executable)
    if actual_binary_sha256 != expected_binary_sha256:
        raise OfflineCoreError(
            f"esbuild binary SHA-256 mismatch for {_display_path(executable)}\n"
            f"expected: {expected_binary_sha256}\nactual:   {actual_binary_sha256}"
        )

    if os.name != "nt":
        launcher.chmod(launcher.stat().st_mode | 0o111)
        executable.chmod(executable.stat().st_mode | 0o111)

    probe_script = (
        "import esbuild from 'esbuild';"
        "const output=esbuild.transformSync('const answer: number = 42',{loader:'ts'}).code.trim();"
        "if(esbuild.version!==process.argv[1]) throw new Error('version '+esbuild.version);"
        "if(!output.includes('const answer = 42')) throw new Error('transform failed: '+output);"
        "console.log(esbuild.version);"
    )
    probe = subprocess.run(
        [
            str(node_executable),
            "--input-type=module",
            "--eval",
            probe_script,
            expected_version,
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    actual = probe.stdout.strip()
    if probe.returncode != 0 or actual != expected_version:
        detail = (probe.stderr or probe.stdout).strip()
        raise OfflineCoreError(
            f"Offline esbuild failed verification; expected {expected_version}, got "
            f"{actual or detail or 'no output'}"
        )
    return launcher


def install_tsx(
    manifest: dict,
    key: str,
    node_executable: Path,
    *,
    force: bool = False,
) -> Path:
    install_esbuild(manifest, key, node_executable, force=force)
    entry = tsx_entry(manifest)
    expected_version = str(manifest["tsx"]["version"])
    destination = _install_npm_entry(entry, expected_version, force=force)
    executable = destination.joinpath(
        *_safe_relative_posix(manifest["tsx"]["executable"], "TSX executable").parts
    )
    if not executable.is_file():
        raise OfflineCoreError(f"TSX executable is missing after extraction: {_display_path(executable)}")
    if os.name != "nt":
        executable.chmod(executable.stat().st_mode | 0o111)

    artifacts = ROOT / ".artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)
    probe_dir = Path(tempfile.mkdtemp(prefix="offline-tsx-", dir=artifacts))
    try:
        probe_file = probe_dir / "probe.ts"
        probe_file.write_text(
            "const answer: number = 42;\n"
            "if (answer !== 42) throw new Error('TSX transform failed');\n"
            "console.log('tsx-runtime-ok');\n",
            encoding="utf-8",
        )
        probe = subprocess.run(
            [str(node_executable), "--import", "tsx", str(probe_file)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
    finally:
        shutil.rmtree(probe_dir, ignore_errors=True)

    actual = probe.stdout.strip()
    if probe.returncode != 0 or actual != "tsx-runtime-ok":
        detail = (probe.stderr or probe.stdout).strip()
        raise OfflineCoreError(
            f"Offline TSX failed verification; expected tsx-runtime-ok, got "
            f"{actual or detail or 'no output'}"
        )
    return executable


def install_typescript(
    manifest: dict,
    key: str,
    node_executable: Path,
    *,
    force: bool = False,
) -> Path:
    package_entry, platform_entry = typescript_entries(manifest, key)
    expected_version = str(manifest["typescript"]["version"])
    package_dir = _install_npm_entry(package_entry, expected_version, force=force)
    platform_dir = _install_npm_entry(platform_entry, expected_version, force=force)

    launcher = package_dir.joinpath(
        *_safe_relative_posix(manifest["typescript"]["launcher"], "TypeScript launcher").parts
    )
    executable = platform_dir.joinpath(
        *_safe_relative_posix(platform_entry["executable"], "TypeScript platform executable").parts
    )
    if not launcher.is_file():
        raise OfflineCoreError(
            f"TypeScript launcher is missing after extraction: {_display_path(launcher)}"
        )
    if not executable.is_file():
        raise OfflineCoreError(
            f"TypeScript native executable is missing after extraction: {_display_path(executable)}"
        )
    if os.name != "nt":
        launcher.chmod(launcher.stat().st_mode | 0o111)
        executable.chmod(executable.stat().st_mode | 0o111)

    probe = subprocess.run(
        [str(node_executable), str(launcher), "--version"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    actual = probe.stdout.strip()
    expected_output = f"Version {expected_version}"
    if probe.returncode != 0 or actual != expected_output:
        detail = (probe.stderr or probe.stdout).strip()
        raise OfflineCoreError(
            f"Offline TypeScript failed verification; expected {expected_output}, got "
            f"{actual or detail or 'no output'}"
        )
    return launcher


def install_prettier(manifest: dict, node_executable: Path, *, force: bool = False) -> Path:
    entry = prettier_entry(manifest)
    expected_version = str(manifest["prettier"]["version"])
    destination = _install_npm_entry(entry, expected_version, force=force)
    executable = destination.joinpath(
        *_safe_relative_posix(manifest["prettier"]["executable"], "Prettier executable").parts
    )
    if not executable.is_file():
        raise OfflineCoreError(f"Prettier executable is missing after extraction: {_display_path(executable)}")
    probe = subprocess.run(
        [str(node_executable), str(executable), "--version"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    actual = probe.stdout.strip()
    if probe.returncode != 0 or actual != expected_version:
        detail = (probe.stderr or probe.stdout).strip()
        raise OfflineCoreError(
            f"Offline Prettier failed verification; expected {expected_version}, got "
            f"{actual or detail or 'no output'}"
        )
    return executable


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--node-only", action="store_true", help="Install only the pinned Node runtime")
    group.add_argument("--ast-only", action="store_true", help="Install only AST packages (Node must exist)")
    parser.add_argument(
        "--with-esbuild",
        action="store_true",
        help="Also install and verify lockfile-pinned esbuild and its native platform package",
    )
    parser.add_argument(
        "--with-tsx",
        action="store_true",
        help="Also install and verify lockfile-pinned TSX using the offline esbuild slice",
    )
    parser.add_argument(
        "--with-prettier",
        action="store_true",
        help="Also install and verify the lockfile-pinned Prettier package",
    )
    parser.add_argument(
        "--with-typescript",
        action="store_true",
        help="Also install and verify lockfile-pinned TypeScript and its native platform package",
    )
    parser.add_argument("--force", action="store_true", help="Re-extract even when matching installs exist")
    parser.add_argument("--print-node", action="store_true", help="Print only the installed Node executable path")
    args = parser.parse_args(argv)

    try:
        manifest = load_manifest()
        key = platform_key()
        want_node = not args.ast_only
        want_ast = not args.node_only
        verify_vendor(
            manifest,
            key,
            node=want_node,
            ast=want_ast,
            esbuild=args.with_esbuild,
            tsx=args.with_tsx,
            prettier=args.with_prettier,
            typescript=args.with_typescript,
        )

        node_entry, _ = selected_entries(manifest, key)
        install_dir = _root_path(manifest["node"]["installDirectory"], "Node install directory")
        node_executable = install_dir.joinpath(*PurePosixPath(node_entry["installedExecutable"]).parts)
        if want_node:
            node_executable = install_node(manifest, key, force=args.force)
        elif not node_executable.is_file():
            raise OfflineCoreError("Pinned Node runtime is not installed; run without --ast-only first")

        if want_ast:
            install_ast(manifest, key, node_executable, force=args.force)
        if args.with_tsx:
            install_tsx(manifest, key, node_executable, force=args.force)
        elif args.with_esbuild:
            install_esbuild(manifest, key, node_executable, force=args.force)
        if args.with_prettier:
            install_prettier(manifest, node_executable, force=args.force)
        if args.with_typescript:
            install_typescript(manifest, key, node_executable, force=args.force)

        if args.print_node:
            print(node_executable)
        else:
            installed = [f"Node {manifest['node']['version']}"]
            if want_ast:
                installed.append(f"AST adapter dependencies {manifest['ast']['version']}")
            if args.with_esbuild or args.with_tsx:
                installed.append(f"esbuild {manifest['esbuild']['version']}")
            if args.with_tsx:
                installed.append(f"TSX {manifest['tsx']['version']}")
            if args.with_prettier:
                installed.append(f"Prettier {manifest['prettier']['version']}")
            if args.with_typescript:
                installed.append(f"TypeScript {manifest['typescript']['version']}")
            print(f"Offline repair toolchain ready for {key}: " + ", ".join(installed))
        return 0
    except OfflineCoreError as exc:
        print(f"offline repair core error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
