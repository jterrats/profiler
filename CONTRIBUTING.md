# Contributing to Profiler Plugin

First off, thank you for considering contributing to the Profiler plugin! It's people like you that make this tool better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js >= 18.0.0
- Yarn package manager
- Git
- Salesforce CLI (`sf`)
- A Salesforce Developer org for testing

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/profiler.git
   cd profiler
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/original-owner/profiler.git
   ```

## Development Setup

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Build the project:
   ```bash
   yarn build
   ```

3. Link the plugin for local development:
   ```bash
   sf plugins link .
   ```

4. Verify the installation:
   ```bash
   sf profiler --help
   ```

## Development Workflow

### Creating a Branch

Create a feature branch for your work:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements

### Making Changes

1. Make your changes in the appropriate files
2. Follow the [Coding Standards](#coding-standards)
3. Write or update tests for your changes
4. Update documentation as needed

### Building and Testing

Build the project:
```bash
yarn build
```

Run linting:
```bash
yarn lint
```

Fix linting issues automatically:
```bash
yarn format
```

Run unit tests:
```bash
yarn test
```

Run integration tests:
```bash
yarn test:nuts
```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(retrieve): add support for custom metadata types

fix(retrieve): handle empty metadata list gracefully

docs(readme): update installation instructions

test(retrieve): add test for FLS removal
```

### Keeping Your Fork Updated

Regularly sync with the upstream repository:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Avoid `any` type - use proper types or `unknown`
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check formatting
yarn lint

# Auto-fix issues
yarn format
```

### File Organization

```
src/
  commands/          # Command implementations
    profiler/        # Profiler commands
      retrieve.ts    # Retrieve command
  hooks/             # Oclif hooks
  utils/             # Utility functions

test/
  commands/          # Command tests
    profiler/
      retrieve.test.ts  # Unit tests
      retrieve.nut.ts   # Integration tests

messages/            # i18n message files
  profiler.retrieve.md
```

### Best Practices

1. **Single Responsibility**: Each function should do one thing well
2. **DRY**: Don't Repeat Yourself
3. **Error Handling**: Always handle errors gracefully
4. **Logging**: Use appropriate log levels (log, warn, error)
5. **Type Safety**: Leverage TypeScript's type system
6. **Async/Await**: Prefer async/await over promises

### Example Code

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';

// Import messages
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('profiler', 'profiler.command');

// Define result type
export type CommandResult = {
  success: boolean;
  message: string;
};

export default class MyCommand extends SfCommand<CommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'my-flag': Flags.string({
      summary: messages.getMessage('flags.my-flag.summary'),
      required: true,
    }),
  };

  public async run(): Promise<CommandResult> {
    const { flags } = await this.parse(MyCommand);

    try {
      // Your implementation here
      this.log('Processing...');

      return {
        success: true,
        message: 'Command completed successfully',
      };
    } catch (error) {
      throw new SfError(
        messages.getMessage('error.failed', [error.message])
      );
    }
  }
}
```

## Testing

### Writing Tests

#### Unit Tests

Located in `test/commands/`:

```typescript
import { TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import MyCommand from '../../../src/commands/my/command.js';

describe('my command', () => {
  const $$ = new TestContext();

  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    $$.restore();
  });

  it('should do something', async () => {
    const result = await MyCommand.run(['--my-flag', 'value']);
    expect(result.success).to.be.true;
  });
});
```

#### Integration Tests (NUTs)

Located in `test/commands/` with `.nut.ts` extension:

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('my command NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      project: { sourceDir: 'force-app' },
    });
  });

  after(async () => {
    await session?.clean();
  });

  it('should execute command', () => {
    const result = execCmd('my command --json', {
      ensureExitCode: 0
    });
    expect(result).to.be.ok;
  });
});
```

### Test Coverage

- Aim for at least 80% code coverage
- Test both success and failure scenarios
- Test edge cases and error conditions
- Mock external dependencies (API calls, file system)

## Submitting Changes

### Pull Request Process

1. Update documentation for any user-facing changes
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md with your changes
5. Push your changes to your fork
6. Create a Pull Request from your fork to the main repository

### Pull Request Template

When creating a PR, include:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] CHANGELOG.md updated
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR
4. Your changes will be included in the next release

## Reporting Bugs

### Before Submitting

1. Check existing issues for duplicates
2. Verify you're using the latest version
3. Test with a clean environment

### Bug Report Template

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Plugin Version:
- Salesforce CLI Version:
- Node.js Version:
- Operating System:

## Additional Context
Screenshots, logs, or other relevant information
```

## Requesting Features

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should this work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Any other relevant information
```

## Development Tips

### Debugging

1. Use `console.log` or the command's `this.log()` method
2. Use VSCode debugger with launch configuration
3. Check command output with `--json` flag for structured data

### Testing with Real Orgs

```bash
# Link plugin
sf plugins link .

# Test with your org
sf profiler retrieve --target-org your-org

# Check JSON output
sf profiler retrieve --target-org your-org --json
```

### Common Issues

**Issue**: "Cannot find module"
- Solution: Run `yarn build`

**Issue**: Command not found
- Solution: Run `sf plugins link .`

**Issue**: Tests failing
- Solution: Run `yarn clean-all && yarn install && yarn build`

## Getting Help

- Review existing documentation in `/docs`
- Check closed issues for solutions
- Ask questions in GitHub Discussions
- Contact maintainers

## Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Credited in release notes
- Added to contributors list

Thank you for contributing to Profiler! 🎉

