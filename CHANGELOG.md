# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
