# 💻 Code Standards

Comprehensive coding standards for the Profiler Plugin project.

---

## 📋 Table of Contents

- [TypeScript Standards](#typescript-standards)
- [Architecture Patterns](#architecture-patterns)
- [Error Handling](#error-handling)
- [Testing Standards](#testing-standards)
- [Performance Guidelines](#performance-guidelines)
- [Security Standards](#security-standards)
- [Documentation Standards](#documentation-standards)

---

## 🔷 TypeScript Standards

### Strict Mode

All TypeScript code must use strict mode:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Annotations

#### ✅ DO: Explicit Types

```typescript
// Function signatures
export async function retrieveProfiles(org: Org, profileNames?: string[]): Promise<RetrieveResult> {
  // Implementation
}

// Complex return types
export function parseProfileXML(content: string): {
  permissions: UserPermission[];
  objects: ObjectPermission[];
  errors: string[];
} {
  // Implementation
}
```

#### ❌ DON'T: Implicit or Any Types

```typescript
// BAD: No return type
function processProfile(data) {
  return data;
}

// BAD: Using 'any'
function parse(xml: any): any {
  return xml;
}

// GOOD: Explicit types
function parseProfileXML(xml: string): Profile {
  return parser.parse(xml);
}
```

---

## 🏗️ Architecture Patterns

### Command Pattern

All commands follow the SF CLI command structure:

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@jterrats/profiler', 'profiler.retrieve');

export default class Retrieve extends SfCommand<RetrieveResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'all-fields': Flags.boolean({
      summary: messages.getMessage('flags.all-fields.summary'),
      char: 'f',
      default: false,
    }),
  };

  public async run(): Promise<RetrieveResult> {
    const { flags } = await this.parse(Retrieve);
    // Implementation
  }
}
```

### Separation of Concerns

- **Commands**: CLI interface only
- **Core Logic**: Business logic in separate modules
- **Utilities**: Reusable helpers
- **Types**: Type definitions

```typescript
// ✅ GOOD: Separated concerns
// src/commands/profiler/retrieve.ts
export default class Retrieve extends SfCommand<RetrieveResult> {
  public async run(): Promise<RetrieveResult> {
    const retriever = new ProfileRetriever(this.flags);
    return retriever.retrieve();
  }
}

// src/core/profile-retriever.ts
export class ProfileRetriever {
  public async retrieve(): Promise<RetrieveResult> {
    // Business logic here
  }
}
```

---

## 🚨 Error Handling

### Use Salesforce Error Classes

```typescript
import { SfError } from '@salesforce/core';

// ✅ DO: Use SfError
if (!profileExists) {
  throw new SfError(`Profile '${profileName}' not found in org`, 'ProfileNotFoundError', [
    'Verify the profile name',
    'Check org permissions',
  ]);
}

// ❌ DON'T: Generic Error
throw new Error('Profile not found');
```

### Error Context

Always provide context and actions:

```typescript
try {
  await retrieveMetadata();
} catch (error) {
  throw new SfError(
    `Failed to retrieve profiles: ${error.message}`,
    'RetrieveError',
    ['Check your org connection', 'Verify metadata API access', 'Try with --api-version flag'],
    0, // exit code
    error // original error
  );
}
```

---

## 🧪 Testing Standards

### Test Coverage

- **Minimum**: 95% code coverage
- **Target**: 100% for critical paths

### Test Structure

```typescript
import { expect } from 'chai';
import { TestContext } from '@salesforce/core/testSetup';

describe('ProfileRetriever', () => {
  const $$ = new TestContext();

  describe('retrieve()', () => {
    it('should retrieve all profiles when no names specified', async () => {
      // Arrange
      const retriever = new ProfileRetriever({ org: mockOrg });

      // Act
      const result = await retriever.retrieve();

      // Assert
      expect(result.profiles).to.have.length.gt(0);
    });

    it('should throw error when profile not found', async () => {
      // Arrange
      const retriever = new ProfileRetriever({
        org: mockOrg,
        names: ['NonExistent'],
      });

      // Act & Assert
      await expect(retriever.retrieve()).to.be.rejectedWith('ProfileNotFoundError');
    });
  });
});
```

### Test Naming

- **Unit tests**: `*.test.ts`
- **Integration tests**: `*.nut.ts` (NUT = Non-Unit Test)

---

## ⚡ Performance Guidelines

### Temporary Directory Usage

Always use OS temporary directories for intermediate files:

```typescript
import os from 'node:os';
import path from 'node:path';

// ✅ GOOD: Use system temp
const tempDir = path.join(os.tmpdir(), `profiler-${Date.now()}`);

try {
  // Operations in temp directory
  await retrieveToTemp(tempDir);
} finally {
  // Always cleanup
  await fs.rm(tempDir, { recursive: true, force: true });
}
```

### Avoid Local File Modifications

Never modify user's local files directly:

```typescript
// ❌ BAD: Modifying local files
await fs.writeFile('force-app/main/default/classes/MyClass.cls', content);

// ✅ GOOD: Work in temp, copy only what's needed
await retrieveToTemp(tempDir);
await copyOnlyProfiles(tempDir, projectPath);
```

---

## 🔒 Security Standards

### Safe File Operations

```typescript
// ✅ GOOD: Validate paths
import path from 'node:path';

function validatePath(filePath: string, baseDir: string): void {
  const resolved = path.resolve(filePath);
  const base = path.resolve(baseDir);

  if (!resolved.startsWith(base)) {
    throw new SfError('Path traversal attempt detected', 'SecurityError');
  }
}
```

### Credential Handling

- Never log credentials
- Use Salesforce Core's auth mechanisms
- Never store tokens in files

```typescript
// ✅ GOOD: Use Org API
const org = await Org.create({ aliasOrUsername: flags['target-org'] });
const connection = org.getConnection();

// ❌ BAD: Manual auth
const token = 'hardcoded-token'; // NEVER DO THIS
```

---

## 📚 Documentation Standards

### Command Documentation

All commands must have:

1. **Summary**: One-line description
2. **Description**: Detailed explanation
3. **Examples**: At least 3 usage examples
4. **Flags**: Description for each flag

```typescript
// messages/profiler.retrieve.md
# summary
Retrieves Profile metadata along with all required dependencies from a Salesforce org.

# description
This command ensures complete profile retrieval...

# examples
- Retrieve all profiles without Field Level Security:
  <%= config.bin %> <%= command.id %> --target-org myOrg

- Retrieve specific profiles with FLS:
  <%= config.bin %> <%= command.id %> --target-org myOrg --name "Admin,Sales" --all-fields
```

### Code Comments

```typescript
/**
 * Retrieves profiles from Salesforce org to a temporary directory.
 *
 * @param org - Authenticated Salesforce org
 * @param profileNames - Optional list of specific profiles to retrieve
 * @param includeFields - Whether to include Field Level Security
 * @returns Promise resolving to retrieve results with profile count and paths
 * @throws {SfError} When org is not authenticated or profiles not found
 */
export async function retrieveProfiles(
  org: Org,
  profileNames?: string[],
  includeFields = false
): Promise<RetrieveResult> {
  // Implementation
}
```

---

## 🔄 Git Workflow

### Commit Messages

Use Conventional Commits format:

```bash
# Format
<type>(<scope>): <subject>

# Examples
feat(retrieve): add --exclude-managed flag for filtering managed packages
fix(compare): handle profiles with special characters in names
docs(readme): update installation instructions for unsigned plugins
test(retrieve): add tests for temporary directory cleanup
chore(deps): update @salesforce/core to v8.5.0
```

### Branch Naming

```bash
# Features
feat/add-exclude-managed-flag
feat/support-apex-pages

# Fixes
fix/temp-directory-cleanup
fix/profile-comparison-edge-cases

# Documentation
docs/update-readme
docs/add-usage-examples

# Chores
chore/update-dependencies
chore/cleanup-temporary-files
```

---

## ✅ Pre-Commit Checklist

Before committing, ensure:

- [ ] Code compiles without errors: `yarn build`
- [ ] All tests pass: `yarn test`
- [ ] Linting passes: `yarn lint`
- [ ] Code coverage ≥ 95%
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (for releases)
- [ ] Conventional commit format used

---

## 📖 Additional Resources

- [Salesforce CLI Plugin Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Last Updated**: 2024-12-02


