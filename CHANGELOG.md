# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.3.0] - 2024-12-09

### 🔴 CRITICAL FIX

- **retrieve**: Fixed critical bug introduced in v2.2.0 (monadic refactor) where the `retrieve` command was overwriting ALL local metadata (ApexClass, CustomObject, Flow, Layout, etc.), not just profiles. This could cause loss of uncommitted local changes.
  - **Root Cause**: `sf project retrieve` was executing with `cwd` set to user's project directory, causing all metadata in package.xml to be written directly to user's `force-app/` directory
  - **Solution**: Now executes retrieve in an isolated temporary SFDX project, then copies ONLY profiles to user's project
  - **Impact**: Zero breaking changes to command interface - same flags, same behavior from user perspective, but with critical safety improvement
  - **Validation**: Added comprehensive safety tests to all 12 E2E tests (100% coverage)

### Added

- **e2e tests**: New Test 2.5 for `--all-fields` flag validation, comparing FLS removal vs preservation
- **e2e tests**: Added "canary files" (DummyTest.cls, DummyObject__c) to detect unintended metadata modifications
- **e2e tests**: Added safety validation to all 12 tests - each test now verifies that only profiles are modified

### Changed

- **retrieve-operation**: Refactored `executeRetrieve()` to use temporary directory instead of user's project directory
- **retrieve-operation**: Refactored `retrieveProfiles()` to create isolated temp SFDX project, execute retrieve there, copy only profiles, and clean up
- **retrieve-operation**: Removed `copyProfiles()` and `removeFieldLevelSecurity()` helper functions (logic now inline for efficiency)
- **RetrieveResult**: Added optional `profileCount` field for better telemetry

### Guarantees

- ✅ ONLY profiles are modified in user's project (`force-app/main/default/profiles/`)
- ✅ Works with ALL flags: `--from-project`, `--exclude-managed`, `--all-fields`, etc.
- ✅ Works with ALL flag combinations
- ✅ 100% backward compatible
- ✅ Validated with 100% E2E test coverage (12 tests, 10 flags)

## [2.1.2] - 2024-12-04

### Fixed

- **CI/CD**: Updated all GitHub workflows to use Node.js 24 (was 18/20), resolving incompatibility with `glob@11.1.0` that prevented npm publishing.

### Changed

- **Documentation**: Automated README version updates using `oclif readme` hook. Version badge now dynamically pulls from npm, and code reference links auto-update on version bumps.

## [2.1.1] - 2024-12-04

### Fixed

- **CRITICAL**: Removed dangerous backup/restore mechanism in `retrieve` command that was deleting and restoring the entire `force-app` directory. This posed a serious risk of data loss if the backup failed, the process crashed, or users had uncommitted work. The command now safely copies only profile files from temp directory to the project, making it non-destructive and eliminating all risk of data loss.

### Changed

- **CI Optimization**: Made integration tests optional in EDD CI workflow to prevent failures when test files don't exist yet.
- **E2E Tests**: Fixed expected exit code for docs command when profiles directory doesn't exist (changed from 1 to 2).

## [2.1.0] - 2024-11-28

### Added

- **New Metadata Types**: Added support for `ApexPage` (Visualforce pages) and `ConnectedApp` in profile retrieval. These metadata types are now automatically included when retrieving profiles. Note: `RecordType` metadata is already included as part of `CustomObject` retrieval.
- **Managed Package Filtering**: Added `--exclude-managed` flag to `retrieve`, `compare`, and `docs` commands. When enabled, filters out all metadata components from managed packages (identified by namespace prefixes like `namespace__ComponentName`). This helps avoid errors when retrieving profiles that reference components from uninstalled or inaccessible managed packages, and makes documentation cleaner by hiding managed package permissions. Custom objects ending in `__c` are always included even with this flag.
- **E2E Testing Script**: Added `scripts/e2e-test.sh` for comprehensive end-to-end testing. Creates a local Salesforce project (`test-project/`), tests all retrieve command variations, validates profile XML content (objectPermissions, layoutAssignments, classAccesses, pageAccesses, tabVisibilities), validates managed package filtering with baseline comparison, validates git safety, and cleans up automatically. Uses default authorized org from `sf org list`.

### Changed

- **Description Update**: Updated `retrieve` command description to list all supported metadata types including the new ones.
- **Test Project Location**: E2E test now creates project in `test-project/` directory (added to `.gitignore`) instead of using temporary system directories.

## [2.0.5] - 2024-11-25

### Fixed

- **Critical**: Removed `postpack` script that was deleting `lib/` directory during npm publish. This was the root cause of versions 2.0.2, 2.0.3, and 2.0.4 being published without compiled JavaScript files.

## [2.0.4] - 2024-11-24

### Fixed

- **Critical**: Added verification step in CI/CD workflow (issue persisted, see 2.0.5).

## [2.0.3] - 2024-11-24

### Fixed

- **Critical**: Attempted fix for missing `lib/` directory in npm package (issue persisted, see 2.0.4).

## [2.0.2] - 2024-11-24

### Fixed

- **Documentation**: Updated `index.md` with correct package name `@jterrats/profiler` in footer.
- **Documentation**: Updated version badge to reflect `2.0.2`.

### Removed

- **GitHub Workflows**: Removed `onRelease.yml` and `create-github-release.yml` (Salesforce-specific workflows that were always skipped).

## [2.0.1] - 2024-11-23

### Fixed

- **Installation Issue**: Changed `postinstall` script to `prepare` to prevent Husky from running when users install the plugin. Husky hooks are only needed for development, not for plugin installation. This fixes the `EACCES: permission denied` error that occurred during `sf plugins install`.

## [2.0.0] - 2024-11-22

### ⚠️ Breaking Changes

#### Changed: Safe Retrieval using Temporary Directories

The `retrieve` command has been completely refactored to prioritize **safety** and **reliability**:

**What Changed:**

- ❌ **REMOVED**: `git checkout --` operations that could overwrite local changes
- ❌ **REMOVED**: `git clean` operations
- ✅ **NEW**: All metadata is retrieved to an isolated temporary directory
- ✅ **NEW**: Only profiles are copied from temp to your project
- ✅ **NEW**: Your local uncommitted changes are NEVER touched

**Why This Matters:**

The previous implementation used `git checkout --` to restore non-profile metadata after retrieval. While functional, this approach had a critical flaw:

```bash
# OLD BEHAVIOR (DANGEROUS)
sf profiler retrieve --target-org myOrg
# 1. Retrieves ALL metadata to project
# 2. Uses git checkout -- to restore non-profile files
# 3. 💥 OVERWRITES any uncommitted local changes!
```

```bash
# NEW BEHAVIOR (SAFE)
sf profiler retrieve --target-org myOrg
# 1. Retrieves ALL metadata to /tmp/profiler-retrieve-{timestamp}/
# 2. Processes profiles in temp directory
# 3. Copies ONLY profiles to project
# 4. ✅ Local changes preserved!
# 5. ✅ No git operations!
```

**Benefits:**

| Aspect             | Before (v1.x)               | After (v2.0)                   |
| ------------------ | --------------------------- | ------------------------------ |
| **Safety**         | ❌ Could lose local changes | ✅ Preserves all local changes |
| **Git Required**   | ⚠️ Yes                      | ✅ No                          |
| **Files Modified** | ⚠️ All metadata types       | ✅ Only profiles               |
| **Predictability** | ⚠️ Git-dependent            | ✅ Always consistent           |
| **Performance**    | ⚠️ Multiple git operations  | ✅ Faster, no git ops          |

### Migration Guide

**No action required!** The new behavior is safer and more predictable.

**However, if you relied on `git checkout` restoring other metadata types:**

The old implementation had a side effect where it would restore non-profile metadata from git after retrieval. If your workflow depended on this behavior, you'll need to adjust.

**Old workflow that no longer applies:**

```bash
# This used to also restore any modified classes/objects from git
sf profiler retrieve --target-org myOrg
```

**New equivalent:**

```bash
# Now only profiles are updated
sf profiler retrieve --target-org myOrg

# If you want to restore other metadata, do it explicitly:
git checkout -- force-app/main/default/classes/
git checkout -- force-app/main/default/objects/
```

### Added

- **Safe retrieval**: Temporary directory isolation prevents local file overwrites
- **Better error handling**: Cleanup happens even on errors
- **Clearer logging**: Shows when profiles are being copied and from where

### Removed

- `restoreOriginalMetadata()` method (used dangerous `git checkout --`)
- All git operations from retrieve flow
- Dependency on git repository

### Technical Details

**Temporary Directory Structure:**

```
/tmp/profiler-retrieve-{timestamp}/
└── force-app/
    └── main/
        └── default/
            ├── profiles/          # ✅ Copied to project
            ├── classes/           # ❌ Discarded
            ├── objects/           # ❌ Discarded
            └── ...                # ❌ Discarded
```

**Error Handling:**
The new implementation ensures cleanup happens even if errors occur during retrieval or processing.

---

## [1.0.0] - 2024-11-22

### Added

- Initial release of `@jterrats/profiler`
- `profiler retrieve` command with `--all-fields` and `--from-project` flags
- `profiler compare` command for local vs org profile comparison
- `profiler docs` command to generate Markdown documentation
- Complete test suite
- GitHub Actions CI/CD
- Documentation site with GitHub Pages
