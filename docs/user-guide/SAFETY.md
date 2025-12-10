# Safety Guarantees

## 🔒 Your Code is Protected

All `@jterrats/profiler` commands are designed with safety as the top priority. Here's how we ensure your local work is never lost:

## Command-by-Command Safety

### `sf profiler retrieve` - MAXIMUM PROTECTION

**The Problem We Solve:**

- Salesforce CLI's native `sf project retrieve start` updates ALL files it downloads
- This can overwrite your local uncommitted changes
- You could lose hours of work! 😱

**Our Solution (v2.3.0+):**

The retrieve command uses an **isolated temporary project strategy**:

```
┌─────────────────────────────────────────────────────────────┐
│                    RETRIEVE FLOW (v2.3.0+)                   │
└─────────────────────────────────────────────────────────────┘

1️⃣ CREATE ISOLATED TEMP PROJECT
   /tmp/profiler-{timestamp}/retrieve/
   ├─ sfdx-project.json (minimal config)
   └─ package.xml (with all metadata types)

   🔒 CRITICAL: Completely separate from your project!

2️⃣ RETRIEVE TO TEMP (NOT your project!)
   cd /tmp/profiler-{timestamp}/retrieve/
   sf project retrieve start --manifest package.xml
   └─ Downloads ALL metadata to TEMP/force-app/
   └─ ✅ Your project is UNTOUCHED at this point

3️⃣ COPY ONLY PROFILES
   Source: /tmp/.../retrieve/force-app/.../profiles/*.profile-meta.xml
   Target: YOUR_PROJECT/force-app/.../profiles/*.profile-meta.xml
   └─ Process them (remove FLS if !--all-fields)
   └─ ✅ ONLY profiles are written to your project

4️⃣ CLEANUP
   rm -rf /tmp/profiler-{timestamp}/
   └─ ✅ No traces left
```

**Key Difference from Old Versions:**

| Aspect                          | v2.1.x (OLD)                   | v2.3.0+ (NEW)              |
| ------------------------------- | ------------------------------ | -------------------------- |
| **Where retrieve executes**     | ⚠️ Your project directory      | ✅ Isolated temp directory |
| **Files initially overwritten** | ⚠️ ALL metadata in your proj   | ✅ None (happens in temp)  |
| **Backup needed**               | ⚠️ Yes (complex flow)          | ✅ No (never touches orig) |
| **Risk of data loss**           | ⚠️ Low (but backup could fail) | ✅ Zero                    |

**Guarantees:**

- ✅ Your local changes are NEVER touched (even temporarily)
- ✅ Only profiles are modified in your project
- ✅ ApexClass, CustomObject, Flow, Layout, etc. are NEVER modified
- ✅ Works without git
- ✅ No temporary files in your project
- ✅ Safe to run anytime, even with uncommitted changes
- ✅ Validated with 100% E2E test coverage

**Test It:**

```bash
# Make a change to a class
echo "// My local change" >> force-app/main/default/classes/MyClass.cls

# Run retrieve
sf profiler retrieve --target-org myOrg

# Verify your change is still there!
cat force-app/main/default/classes/MyClass.cls
# ✅ Your comment is still there!

# Only profiles changed
git status
# modified: force-app/main/default/profiles/Admin.profile-meta.xml
# ✅ MyClass.cls is NOT listed (untouched)
```

---

### `sf profiler compare` - READ-ONLY

**Safety Level**: ✅✅✅ MAXIMUM (Read-only)

This command:

- ✅ Only READS local profiles
- ✅ Downloads org profiles to isolated temp directory
- ✅ Compares in memory
- ✅ Shows results in console
- ❌ NEVER modifies any files

**Temporary Directory:**

```
/tmp/profiler-compare-{timestamp}/
└─ Downloaded profiles from org (for comparison only)
```

**After execution:**

```bash
git status
# nothing to commit, working tree clean ✅
```

---

### `sf profiler docs` - INTENTIONAL OUTPUT

**Safety Level**: ✅ SAFE (Creates intended output)

This command:

- ✅ Only READS local profiles
- ✅ Generates markdown files in `profile-docs/` (or `--output-dir`)
- ✅ This is INTENDED output (you want these files)
- ❌ No temporary files
- ❌ No modifications to existing files

**Output:**

```
profile-docs/
├── Admin.md
├── Sales.md
└── Custom_Profile.md
```

**Add to .gitignore if you don't want to commit docs:**

```gitignore
profile-docs/
```

---

## 🛡️ General Safety Principles

### 1. Isolated Temporary Projects

The retrieve command creates a completely isolated SFDX project in the system temp directory:

- **macOS/Linux**: `/tmp/profiler-{timestamp}/retrieve/`
- **Windows**: `%TEMP%\profiler-{timestamp}\retrieve\`

**Never in your project:**

```bash
# ❌ OLD (some old tools would create in project)
project/temp/
project/.retrieve/

# ✅ NEW (completely isolated)
/tmp/profiler-{timestamp}/retrieve/
└─ This is a SEPARATE SFDX project with its own sfdx-project.json
```

### 2. Automatic Cleanup

All temporary directories are automatically deleted:

- ✅ After successful execution
- ✅ After errors (try-catch-finally)
- ✅ OS also cleans old temp files periodically

### 3. No Git Operations Required

Commands work WITHOUT git:

- ✅ No `git checkout --`
- ✅ No `git clean`
- ✅ No `.git` directory needed
- ✅ Pure filesystem operations

### 4. Parallel-Safe

Multiple commands can run simultaneously:

- Each uses unique timestamp-based directories
- No conflicts between executions
- Safe for CI/CD pipelines

---

## 🧪 Verify Safety Yourself

### Test 1: Local Changes Preserved

```bash
# 1. Make local changes
echo "// Test change" >> force-app/main/default/classes/MyClass.cls

# 2. Run retrieve
sf profiler retrieve --target-org myOrg

# 3. Verify change still exists
grep "Test change" force-app/main/default/classes/MyClass.cls
# ✅ Should find your change
```

### Test 2: Only Profiles Modified

```bash
# 1. Check initial status
git status
# note what files are modified

# 2. Run retrieve
sf profiler retrieve --target-org myOrg --name Admin

# 3. Check final status
git status
# ✅ Only profiles should be modified (if any changes)
```

### Test 3: No Temp Folders in Project

```bash
# 1. Run command
sf profiler retrieve --target-org myOrg

# 2. Check for temp folders in YOUR project
ls -la | grep temp
ls -la | grep retrieve
# ✅ Should find nothing

# 3. Verify system temp was used (may already be cleaned)
ls /tmp/ | grep profiler
# ✅ Empty or cleanup in progress
```

### Test 4: Other Metadata Never Touched (NEW in v2.3.0)

```bash
# 1. Create a test ApexClass
echo "public class TestSafety { }" > force-app/main/default/classes/TestSafety.cls

# 2. Run retrieve (which internally retrieves ApexClass too)
sf profiler retrieve --target-org myOrg

# 3. Verify your test class is UNTOUCHED
git status force-app/main/default/classes/TestSafety.cls
# ✅ Should show "Untracked" (not modified)

# This proves that even though retrieve downloads ApexClass to temp,
# it NEVER copies them to your project - only profiles!
```

---

## 📊 Safety Comparison

| Aspect                     | Native sf CLI  | @jterrats/profiler v2.3.0+ |
| -------------------------- | -------------- | -------------------------- |
| **Overwrites local files** | ⚠️ Yes         | ✅ No (except profiles)    |
| **Requires git**           | ⚠️ Recommended | ✅ Optional                |
| **Temp in project**        | ⚠️ Sometimes   | ✅ Never                   |
| **Lost work risk**         | ⚠️ Medium      | ✅ Zero                    |
| **Isolated execution**     | ❌ No          | ✅ Yes (separate project)  |
| **Rollback needed**        | ⚠️ Manual      | ✅ Not needed              |

---

## ⚠️ Important Notes

### What IS Modified

Only these files can be modified:

- `force-app/main/default/profiles/*.profile-meta.xml`

That's it. Nothing else. Ever.

### What is NEVER Modified

Everything else in your project:

- ✅ Apex classes (.cls, .trigger)
- ✅ Flows (.flow-meta.xml)
- ✅ Objects & fields (.object-meta.xml)
- ✅ Layouts (.layout-meta.xml)
- ✅ Applications (.app-meta.xml)
- ✅ Custom metadata
- ✅ Any other files

**This is GUARANTEED** because:

1. Retrieve executes in isolated temp directory
2. Only profiles are copied from temp to your project
3. Validated with comprehensive E2E tests (12 tests with 100% safety coverage)

### Emergency Recovery

If something goes wrong (extremely unlikely):

```bash
# Git users:
git checkout -- force-app/

# Non-git users:
# The plugin never touches your non-profile files, so nothing to recover!
# Only profiles may need to be reverted if you don't like the changes.
```

**Note**: In v2.3.0+, the isolated temp directory approach makes data loss virtually impossible. The retrieve happens in a completely separate SFDX project, and only profiles are selectively copied to your project. 🛡️

---

## 🚀 Confidence to Run Anytime

With these safety guarantees, you can:

✅ Run during active development
✅ Run with uncommitted changes
✅ Run without fear of data loss
✅ Run in CI/CD pipelines
✅ Run on production codebases
✅ Run without git repository
✅ Run with ANY flag combination (--from-project, --exclude-managed, etc.)

**Your code is safe. Always.** 🔒

---

## 📜 Version History

### v2.3.0+ (Current) - Isolated Temp Project

- ✅ Retrieve executes in completely isolated temporary SFDX project
- ✅ Zero risk of overwriting your files (even temporarily)
- ✅ No backup/restore needed
- ✅ Simpler, more reliable implementation

### v2.1.x - Backup/Restore Strategy

- ⚠️ Used backup/restore mechanism
- ⚠️ Retrieve executed in your project directory
- ⚠️ Files temporarily overwritten (then restored)
- ⚠️ More complex flow with potential edge cases

### v2.0.x and earlier

- ❌ Various safety issues
- ❌ Not recommended for production use

**Always use v2.3.0 or later for maximum safety!**
