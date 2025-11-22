# Retrieve Command Refactoring Proposal

## 🚨 Current Problem

The `retrieve` command currently:

1. Retrieves ALL metadata (profiles + dependencies) to the project directory
2. Uses `git checkout --` to restore unwanted metadata
3. **DANGEROUS**: Overwrites local uncommitted changes without warning

### Risk Scenario

```bash
# User has uncommitted changes in a Class
vim force-app/main/default/classes/MyClass.cls
# Makes important changes...

# Runs retrieve
sf profiler retrieve --target-org myOrg

# 💥 git checkout -- overwrites MyClass.cls changes!
# User's work is LOST!
```

## ✅ Proposed Solution

Download to a temporary directory and copy only what's needed:

### New Flow

```
1. Create temporary directory: .tmp/profiler-retrieve-{timestamp}
2. Retrieve ALL metadata to .tmp/
3. Process profiles in .tmp/ (remove FLS if needed)
4. Copy ONLY profiles from .tmp/ to project
5. Clean up .tmp/
6. NO git operations needed!
```

### Benefits

✅ **Safe**: Never touches user's local changes
✅ **Clean**: No git operations required
✅ **Predictable**: Only profiles are updated
✅ **Non-destructive**: Original files preserved
✅ **Works anywhere**: No git repo required

## 🔧 Implementation Plan

### 1. Update Retrieve Flow

```typescript
public async run(): Promise<ProfilerRetrieveResult> {
  // 1. Create temp directory
  const tempDir = await this.createTempDirectory();

  // 2. Retrieve to temp directory
  await this.retrieveToTemp(tempDir);

  // 3. Process profiles in temp
  if (!includeAllFields) {
    await this.removeFieldLevelSecurityInTemp(tempDir);
  }

  // 4. Copy only profiles to project
  await this.copyProfilesFromTemp(tempDir);

  // 5. Cleanup temp
  await this.cleanupTemp(tempDir);

  return result;
}
```

### 2. New Methods

```typescript
private async createTempDirectory(): Promise<string> {
  const timestamp = Date.now();
  const tempDir = path.join(os.tmpdir(), `profiler-retrieve-${timestamp}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

private async retrieveToTemp(tempDir: string): Promise<void> {
  // Create package.xml in temp
  const packageXmlPath = path.join(tempDir, 'package.xml');
  await fs.writeFile(packageXmlPath, packageXml);

  // Retrieve to temp directory
  await execAsync(`sf project retrieve start -x ${packageXmlPath} -o ${targetOrg} -r ${tempDir}`);
}

private async removeFieldLevelSecurityInTemp(tempDir: string): Promise<void> {
  const profilesDir = path.join(tempDir, 'force-app', 'main', 'default', 'profiles');
  // Process profiles in temp...
}

private async copyProfilesFromTemp(tempDir: string): Promise<void> {
  const tempProfilesDir = path.join(tempDir, 'force-app', 'main', 'default', 'profiles');
  const projectProfilesDir = path.join(this.projectPath, 'force-app', 'main', 'default', 'profiles');

  // Ensure target directory exists
  await fs.mkdir(projectProfilesDir, { recursive: true });

  // Copy all profiles
  const profiles = await fs.readdir(tempProfilesDir);
  await Promise.all(
    profiles
      .filter(f => f.endsWith('.profile-meta.xml'))
      .map(profile =>
        fs.copyFile(
          path.join(tempProfilesDir, profile),
          path.join(projectProfilesDir, profile)
        )
      )
  );
}

private async cleanupTemp(tempDir: string): Promise<void> {
  await fs.rm(tempDir, { recursive: true, force: true });
}
```

### 3. Remove Dangerous Methods

❌ **DELETE**: `restoreOriginalMetadata()` - Uses git checkout
❌ **DELETE**: All git operations

## 📊 Comparison

| Aspect                | Current (git checkout) | Proposed (temp dir) |
| --------------------- | ---------------------- | ------------------- |
| **Safety**            | ❌ Dangerous           | ✅ Safe             |
| **Local changes**     | ❌ Lost                | ✅ Preserved        |
| **Git required**      | ⚠️ Yes                 | ✅ No               |
| **Clean working dir** | ⚠️ Modifies many files | ✅ Only profiles    |
| **Performance**       | ⚠️ Many git ops        | ✅ Faster           |
| **Predictability**    | ❌ Can fail            | ✅ Reliable         |

## 🧪 Testing

### Test Cases

```typescript
describe('retrieve with temp directory', () => {
  it('should not overwrite local changes', async () => {
    // 1. Create local change in a class
    await fs.writeFile('force-app/.../MyClass.cls', 'LOCAL CHANGE');

    // 2. Run retrieve
    await ProfilerRetrieve.run(['--target-org', 'myOrg']);

    // 3. Verify local change is preserved
    const content = await fs.readFile('force-app/.../MyClass.cls');
    expect(content).to.include('LOCAL CHANGE');
  });

  it('should only update profiles', async () => {
    // 1. Get checksums of all metadata
    const beforeChecksums = await getFileChecksums('force-app/');

    // 2. Run retrieve
    await ProfilerRetrieve.run(['--target-org', 'myOrg']);

    // 3. Verify only profiles changed
    const afterChecksums = await getFileChecksums('force-app/');
    const changed = getChangedFiles(beforeChecksums, afterChecksums);

    expect(changed.every((f) => f.endsWith('.profile-meta.xml'))).to.be.true;
  });

  it('should work without git', async () => {
    // 1. Create project without git
    await createNonGitProject();

    // 2. Run retrieve
    const result = await ProfilerRetrieve.run(['--target-org', 'myOrg']);

    // 3. Should succeed
    expect(result.success).to.be.true;
  });
});
```

## 🎯 Migration Steps

1. ✅ Create new temp directory methods
2. ✅ Update retrieve flow to use temp dir
3. ✅ Remove git checkout methods
4. ✅ Update tests
5. ✅ Update documentation
6. ✅ Add warning in CHANGELOG about behavior change

## 📝 User Communication

### CHANGELOG Entry

```markdown
## [2.0.0] - Breaking Changes

### Changed

- **BREAKING**: `retrieve` command no longer uses `git checkout`
- Profiles are now retrieved to a temporary directory and copied to project
- **SAFER**: Local uncommitted changes are preserved
- **IMPROVEMENT**: No longer requires git repository
- **CLEANER**: Only profiles are updated, other metadata untouched

### Migration

No action needed. The new behavior is safer and more predictable.
If you relied on git checkout restoring other metadata, you may need
to adjust your workflow.
```

### Documentation Update

```markdown
## Important: Safe Retrieval

The `retrieve` command uses a temporary directory for all operations:

1. ✅ **Your local changes are safe** - Never overwritten
2. ✅ **Only profiles updated** - Other metadata untouched
3. ✅ **Works without git** - No git repo required
4. ✅ **Predictable** - Same behavior every time

The command:

- Downloads ALL metadata to `.tmp/profiler-retrieve-{timestamp}/`
- Processes profiles (removes FLS if requested)
- Copies ONLY profiles to your project
- Cleans up temporary directory
```

## 🔐 Security Improvement

This change also improves security by:

- ✅ Not exposing temporary files in project
- ✅ Cleaning up sensitive metadata from temp
- ✅ Not leaving traces in git history
- ✅ Working in truly isolated environment

## 💡 Future Enhancements

Once this is implemented, we could add:

1. **--keep-temp** flag to inspect retrieved metadata
2. **--backup** flag to save current profiles before replacing
3. **--dry-run** to see what would be updated
4. **--interactive** to prompt before overwriting each profile

## ✅ Approval Checklist

- [ ] Review proposed implementation
- [ ] Approve breaking change
- [ ] Update version to 2.0.0
- [ ] Update all documentation
- [ ] Add comprehensive tests
- [ ] Update examples
- [ ] Create migration guide

---

**Priority**: HIGH - Security and data safety issue
**Effort**: Medium - ~2-3 hours implementation + testing
**Impact**: HIGH - Affects all retrieve operations
**Breaking**: YES - Changes behavior (but safer)
