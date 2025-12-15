# Progress Indicators and Quiet Mode

The Profiler plugin provides visual feedback during long-running operations through progress indicators. These indicators help you understand what the plugin is doing and how long operations might take.

## Overview

Progress indicators include:

- **Spinners** - Animated indicators for single operations
- **Progress Bars** - Visual bars showing completion percentage for parallel operations
- **Status Messages** - Clear messages with emojis and timing information

All progress indicators automatically adapt to your environment:

- **Interactive terminals** - Full visual indicators
- **Non-interactive/CI environments** - Graceful degradation (no animations)
- **Quiet mode** - Disabled for scripting scenarios

## Using Progress Indicators

Progress indicators are enabled by default for all commands:

```bash
# Retrieve with progress indicators
sf profiler retrieve --name Admin --target-org myOrg

# Compare with progress indicators
sf profiler compare --name Admin --target-org myOrg

# Merge with progress indicators
sf profiler merge --name Admin --target-org myOrg --strategy local-wins

# Validate with progress indicators
sf profiler validate --name Admin
```

### What You'll See

#### Single Operations (Spinners)

For operations that run sequentially, you'll see animated spinners:

```
Retrieving profile from org: myOrg@example.com
⠋ Retrieving profile metadata...
✓ Profile retrieved successfully (2.3s)
```

#### Parallel Operations (Progress Bars)

For operations that run in parallel (like multi-source compare), you'll see progress bars:

```
Comparing profiles across 3 orgs...
Org 1: [████████████████████████████] 100% (2.1s)
Org 2: [████████████████████████████] 100% (2.3s)
Org 3: [████████████████████████████] 100% (2.0s)
```

#### Status Messages

Status messages provide context and timing:

```
🔍 Validating profile 'Admin'...
✓ Validation complete: 1 profile(s) valid, 0 issue(s) found (1.2s)
```

## Quiet Mode

Use the `--quiet` flag to disable all progress indicators. This is useful for:

- **Scripting** - Clean output for parsing
- **CI/CD pipelines** - Reduced log noise
- **Automation** - Predictable output format

### Examples

```bash
# Quiet retrieve
sf profiler retrieve --name Admin --target-org myOrg --quiet

# Quiet compare
sf profiler compare --name Admin --target-org myOrg --quiet

# Quiet merge
sf profiler merge --name Admin --target-org myOrg --strategy local-wins --quiet

# Quiet validate
sf profiler validate --name Admin --quiet
```

### Quiet Mode Behavior

When `--quiet` is enabled:

- ✅ No spinners or animations
- ✅ No progress bars
- ✅ Minimal status messages
- ✅ Only essential output (errors, results)
- ✅ Exit codes preserved for scripting

**Example Output (Quiet Mode)**:

```bash
$ sf profiler retrieve --name Admin --target-org myOrg --quiet
Profile "Admin" retrieved successfully
```

## Environment Detection

The plugin automatically detects your environment:

### Interactive Terminal

- Full progress indicators enabled
- Animated spinners and progress bars
- Rich status messages with emojis

### Non-Interactive Terminal (CI/CD)

- Automatic graceful degradation
- No animations (prevents log pollution)
- Essential status messages only
- Progress indicators still show completion status

### Detection Logic

The plugin checks:

1. **TTY availability** - Is stdout a terminal?
2. **CI environment variables** - CI, GITHUB_ACTIONS, etc.
3. **Terminal capabilities** - Can it display colors/animations?

## Command-Specific Behavior

### Retrieve Command

**With Progress Indicators:**

```
Retrieving profile from org: myOrg@example.com
⠋ Retrieving profile metadata...
⠙ Fetching dependencies...
✓ Profile retrieved successfully (3.2s)
```

**Quiet Mode:**

```
Profile "Admin" retrieved successfully
```

### Compare Command

**Single Source (Spinner):**

```
Comparing profiles...
⠋ Loading local profile...
⠙ Loading org profile...
⠹ Comparing permissions...
✓ Comparison complete (2.1s)
```

**Multi-Source (Progress Bars):**

```
Comparing profiles across 3 orgs...
Org 1: [████████████████████████████] 100% (2.1s)
Org 2: [████████████████████████████] 100% (2.3s)
Org 3: [████████████████████████████] 100% (2.0s)
✓ All comparisons complete (2.3s)
```

**Quiet Mode:**

```
Comparison complete
```

### Merge Command

**With Progress Indicators:**

```
Merging profile 'Admin'...
⠋ Retrieving profile from org: myOrg@example.com
⠙ Detecting conflicts...
⠹ Merging profiles...
✓ Merge complete: 0 conflicts resolved (4.2s)
```

**Quiet Mode:**

```
Merge complete: 0 conflicts resolved
```

### Validate Command

**Single Profile (Spinner):**

```
Validating profile 'Admin'...
⠋ Checking XML structure...
⠙ Detecting duplicates...
⠹ Validating permissions...
✓ Validation complete: 1 profile(s) valid, 0 issue(s) found (1.2s)
```

**Multiple Profiles (Progress Updates):**

```
Validating 3 profiles...
Validating 1/3: Admin...
Validating 2/3: Standard...
Validating 3/3: Custom...
✓ All 3 profile(s) valid (3.5s)
```

**Quiet Mode:**

```
Validation complete: 1 profile(s) valid, 0 issue(s) found
```

## Best Practices

### For Interactive Use

- ✅ Use default behavior (progress indicators enabled)
- ✅ Monitor progress for long-running operations
- ✅ Use status messages to understand what's happening

### For Scripting

- ✅ Always use `--quiet` flag
- ✅ Parse exit codes for error handling
- ✅ Use JSON output when available (`--json`)

### For CI/CD

- ✅ Progress indicators automatically degrade
- ✅ Use `--quiet` if you want minimal output
- ✅ Check exit codes for pipeline failures

## Troubleshooting

### Progress Indicators Not Showing

**Possible Causes:**

1. Non-interactive terminal detected
2. `--quiet` flag is enabled
3. Terminal doesn't support ANSI codes

**Solutions:**

- Check if you're in a CI environment
- Verify `--quiet` is not set
- Try running in a standard terminal

### Too Much Output in Scripts

**Solution:**
Use the `--quiet` flag:

```bash
sf profiler retrieve --name Admin --target-org myOrg --quiet
```

### Progress Indicators in CI Logs

**Current Behavior:**

- Automatically disabled in CI environments
- No animations (prevents log pollution)
- Essential messages only

**To Force Quiet Mode:**

```bash
sf profiler retrieve --name Admin --target-org myOrg --quiet
```

## Technical Details

### Implementation

Progress indicators are implemented in `src/core/ui/progress.ts`:

- `Spinner` - Single operation spinner
- `ProgressBar` - Single progress bar
- `MultiProgressBar` - Multiple parallel progress bars
- `StatusMessage` - Status messages with timing

### Dependencies

- `ora` - Spinner library
- `cli-progress` - Progress bar library

### Environment Detection

The plugin uses:

- `process.stdout.isTTY` - Terminal detection
- `process.env.CI` - CI environment detection
- `process.env.GITHUB_ACTIONS` - GitHub Actions detection

## Related Documentation

- [Usage Guide](usage.md) - Complete command reference
- [Compare Command](compare-command.md) - Detailed compare examples
- [Quick Start](quick-start.md) - Getting started guide
