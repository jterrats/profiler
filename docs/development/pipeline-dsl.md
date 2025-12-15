# Pipeline DSL - Developer Guide

The Pipeline DSL provides a fluent API for composing profile operations (retrieve, compare, merge, validate) into reusable pipelines. This guide explains how to use the Pipeline DSL in your code.

## Overview

The Pipeline DSL allows you to chain operations together in a readable, composable way:

```typescript
import { pipeline } from '@salesforce/profiler/core';

const result = await pipeline({ org, profileNames: ['Admin'], projectPath })
  .compare({ highlightDrift: true })
  .merge({ strategy: 'local-wins' })
  .validate()
  .run();
```

## Basic Usage

### Creating a Pipeline

Start by creating a pipeline with a context:

```typescript
import { pipeline, type PipelineContext } from '@salesforce/profiler/core';
import { Org } from '@salesforce/core';

const context: PipelineContext = {
  org: myOrg, // Salesforce org connection
  projectPath: '/path/to/project', // Local project path
  profileNames: ['Admin'], // Profile names to process
  apiVersion: '60.0', // Optional: API version
};

const builder = pipeline(context);
```

### Adding Steps

Chain operations using the fluent API:

```typescript
builder
  .compare() // Compare local vs org
  .merge({ strategy: 'local-wins' }) // Merge changes
  .validate(); // Validate result
```

### Executing the Pipeline

Execute all steps sequentially:

```typescript
const result = await builder.run();

if (result.isSuccess()) {
  const pipelineResult = result.value;
  console.log(`Executed ${pipelineResult.successfulSteps} steps`);
  console.log(`Failed: ${pipelineResult.failedSteps} steps`);

  // Access individual step results
  for (const stepResult of pipelineResult.stepResults) {
    console.log(`${stepResult.stepName}: ${stepResult.result.isSuccess() ? 'Success' : 'Failed'}`);
  }
} else {
  console.error('Pipeline failed:', result.error.message);
}
```

## Step Configuration

### Compare Step

```typescript
builder.compare({
  highlightDrift: true, // Highlight configuration drift
  excludeManaged: false, // Include managed package permissions
  sources: ['qa', 'uat'], // Multi-source compare (optional)
});
```

### Merge Step

```typescript
builder.merge({
  strategy: 'local-wins', // 'local-wins' | 'org-wins' | 'union' | 'interactive'
  dryRun: false, // Preview changes without applying
  skipBackup: false, // Skip backup creation
});
```

### Validate Step

```typescript
builder.validate({
  fix: true, // Auto-fix issues if possible
});
```

## Error Handling

The Pipeline DSL wraps errors with step context for better debugging:

```typescript
const result = await pipeline(context).compare().merge().validate().run();

if (result.isFailure()) {
  const error = result.error;

  if (error instanceof PipelineStepFailedError) {
    console.error(`Failed at step: ${error.stepName}`);
    console.error(`Step index: ${error.stepIndex}`);
    console.error(`Original error: ${error.originalError.message}`);
    console.error(`Recovery actions:`, error.actions);
  } else if (error instanceof PipelineInterruptedError) {
    console.error(`Interrupted at: ${error.stepName}`);
    console.error(`Reason: ${error.reason}`);
  }
}
```

### Error Types

#### PipelineStepFailedError

Thrown when a step in the pipeline fails:

- `stepName`: Human-readable step name (e.g., "Compare (step 1)")
- `stepIndex`: Zero-based index of the failed step
- `originalError`: The original error from the operation
- `actions`: Array of recovery actions

#### PipelineInterruptedError

Thrown when the pipeline is interrupted:

- `stepName`: Step where interruption occurred
- `stepIndex`: Zero-based index of interrupted step
- `reason`: 'user-cancelled' | 'timeout' | 'unknown'

## Advanced Usage

### Conditional Steps

```typescript
const builder = pipeline(context);

if (shouldCompare) {
  builder.compare();
}

if (shouldMerge) {
  builder.merge({ strategy: mergeStrategy });
}

builder.validate();

const result = await builder.run();
```

### Multiple Profiles

```typescript
const context: PipelineContext = {
  org: myOrg,
  projectPath: '/path/to/project',
  profileNames: ['Admin', 'Sales', 'Support'], // Multiple profiles
  apiVersion: '60.0',
};

const result = await pipeline(context).compare().merge().validate().run();
```

### Pipeline Result Structure

```typescript
type PipelineResult = {
  stepResults: Array<{
    stepName: string; // "Compare (step 1)", "Merge (step 2)", etc.
    stepIndex: number; // 0, 1, 2, etc.
    result: Result<CompareResult | MergeResult | ValidationResult>;
  }>;
  successfulSteps: number; // Count of successful steps
  failedSteps: number; // Count of failed steps
};
```

## Best Practices

1. **Always check results**: Use `result.isSuccess()` before accessing values
2. **Handle errors gracefully**: Check for specific error types and provide recovery actions
3. **Use dry-run for testing**: Set `dryRun: true` in merge step to preview changes
4. **Create backups**: Don't skip backups unless absolutely necessary (`skipBackup: false`)
5. **Sequential execution**: Steps execute sequentially - each step may depend on previous results

## Examples

### Complete Workflow

```typescript
import { pipeline } from '@salesforce/profiler/core';
import { Org } from '@salesforce/core';

async function syncProfile(org: Org, profileName: string, projectPath: string) {
  const result = await pipeline({
    org,
    projectPath,
    profileNames: [profileName],
    apiVersion: '60.0',
  })
    .compare({ highlightDrift: true })
    .merge({ strategy: 'local-wins', dryRun: false })
    .validate({ fix: true })
    .run();

  if (result.isSuccess()) {
    const pipelineResult = result.value;
    console.log(`✅ Pipeline completed: ${pipelineResult.successfulSteps} steps succeeded`);
    return pipelineResult;
  } else {
    console.error(`❌ Pipeline failed: ${result.error.message}`);
    throw result.error;
  }
}
```

### Error Recovery

```typescript
async function safePipeline(context: PipelineContext) {
  try {
    const result = await pipeline(context).compare().merge().validate().run();

    if (result.isFailure()) {
      if (result.error instanceof PipelineStepFailedError) {
        // Log step context for debugging
        console.error(`Step ${result.error.stepIndex + 1} failed: ${result.error.stepName}`);
        console.error(`Original error:`, result.error.originalError);

        // Provide recovery actions
        console.log('Recovery actions:');
        result.error.actions.forEach((action) => console.log(`  - ${action}`));
      }
      throw result.error;
    }

    return result.value;
  } catch (error) {
    if (error instanceof PipelineInterruptedError) {
      console.warn(`Pipeline interrupted: ${error.reason}`);
      console.warn('You can resume from the last successful step');
    }
    throw error;
  }
}
```

## Integration with Commands

The Pipeline DSL is used internally by CLI commands but can also be used programmatically:

```typescript
import { pipeline } from '@salesforce/profiler/core';
import { Org } from '@salesforce/core';

// Use in custom scripts or tools
const org = await Org.create({ aliasOrUsername: 'myOrg' });
const result = await pipeline({
  org,
  projectPath: process.cwd(),
  profileNames: ['Admin'],
})
  .compare()
  .merge({ strategy: 'interactive' })
  .run();
```

## See Also

- [Error-Driven Development](ERROR_DRIVEN_DEVELOPMENT.md) - Understanding error handling
- [Error Catalog](ERROR_CATALOG.md) - Complete error reference
- [Contributing Guide](contributing.md) - How to contribute
