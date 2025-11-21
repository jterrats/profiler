# Profiler Plugin Examples

This directory contains examples of how to use the Profiler plugin in various scenarios.

## Available Examples

### 1. CI/CD Pipeline Script (`ci-cd-example.sh`)

A comprehensive bash script that demonstrates how to integrate the profiler plugin into a CI/CD pipeline.

**Features:**
- Authentication handling
- Profile retrieval with configuration
- Result parsing and validation
- Report generation
- Optional Git operations

**Usage:**
```bash
# Basic usage
./examples/ci-cd-example.sh

# With custom configuration
TARGET_ORG=production INCLUDE_FLS=true ./examples/ci-cd-example.sh

# With auto-commit enabled
TARGET_ORG=dev-sandbox AUTO_COMMIT=true ./examples/ci-cd-example.sh
```

**Environment Variables:**
- `TARGET_ORG`: The org alias to retrieve from (default: `dev-sandbox`)
- `INCLUDE_FLS`: Whether to include Field Level Security (default: `false`)
- `API_VERSION`: API version to use (default: `60.0`)
- `AUTO_COMMIT`: Automatically commit changes (default: `false`)
- `AUTO_PUSH`: Automatically push commits (default: `false`)
- `SFDX_AUTH_URL`: Authentication URL for org login

### 2. GitHub Actions Workflow (`github-actions.yml`)

A GitHub Actions workflow that automates profile retrieval and creates pull requests.

**Features:**
- Scheduled daily runs
- Manual trigger with parameters
- Automatic PR creation
- Artifact upload
- Summary generation

**Setup:**

1. Copy the workflow to your repository:
   ```bash
   mkdir -p .github/workflows
   cp examples/github-actions.yml .github/workflows/retrieve-profiles.yml
   ```

2. Add required secrets to your GitHub repository:
   - `SFDX_AUTH_URL`: Your Salesforce org authentication URL

   To get your auth URL:
   ```bash
   sf org display --target-org your-org --verbose | grep "Sfdx Auth Url"
   ```

3. Commit and push the workflow:
   ```bash
   git add .github/workflows/retrieve-profiles.yml
   git commit -m "Add profile retrieval workflow"
   git push
   ```

4. Run manually or wait for scheduled execution

**Manual Trigger:**
1. Go to your repository on GitHub
2. Click on "Actions"
3. Select "Retrieve Salesforce Profiles"
4. Click "Run workflow"
5. Configure parameters and run

## Common Use Cases

### Local Development

Retrieve profiles for local development without FLS:

```bash
sf profiler retrieve --target-org dev-sandbox
```

### Complete Profile Sync

Retrieve everything including Field Level Security:

```bash
sf profiler retrieve --target-org integration --all-fields
```

### JSON Output for Automation

Get structured output for parsing:

```bash
sf profiler retrieve --target-org dev-sandbox --json | jq '.result'
```

### Custom API Version

Use a specific API version:

```bash
sf profiler retrieve --target-org dev-sandbox --api-version 59.0
```

## Integration Examples

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    environment {
        SFDX_AUTH_URL = credentials('salesforce-auth-url')
    }

    stages {
        stage('Authenticate') {
            steps {
                sh '''
                    echo "${SFDX_AUTH_URL}" > authfile.txt
                    sf org login sfdx-url --sfdx-url-file authfile.txt --alias target-org
                    rm authfile.txt
                '''
            }
        }

        stage('Retrieve Profiles') {
            steps {
                sh 'sf profiler retrieve --target-org target-org --json'
            }
        }

        stage('Validate Changes') {
            steps {
                sh '''
                    if ! git diff --quiet force-app/main/default/profiles/; then
                        echo "Changes detected - creating review"
                        git diff force-app/main/default/profiles/ > profile-changes.diff
                    fi
                '''
            }
        }
    }
}
```

### GitLab CI/CD

```yaml
retrieve-profiles:
  stage: retrieve
  image: node:18
  before_script:
    - npm install -g @salesforce/cli
    - sf plugins install profiler
    - echo "$SFDX_AUTH_URL" > authfile.txt
    - sf org login sfdx-url --sfdx-url-file authfile.txt --alias target-org
  script:
    - sf profiler retrieve --target-org target-org --json
    - git diff force-app/main/default/profiles/
  artifacts:
    paths:
      - force-app/main/default/profiles/
    expire_in: 1 week
  only:
    - schedules
```

### Azure DevOps

```yaml
trigger:
  - none

schedules:
- cron: "0 2 * * *"
  displayName: Daily profile retrieval
  branches:
    include:
    - main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: |
    npm install -g @salesforce/cli
    sf plugins install profiler
  displayName: 'Install Salesforce CLI and Profiler'

- script: |
    echo "$(SFDX_AUTH_URL)" > authfile.txt
    sf org login sfdx-url --sfdx-url-file authfile.txt --alias target-org
    rm authfile.txt
  displayName: 'Authenticate to Salesforce'
  env:
    SFDX_AUTH_URL: $(SFDX_AUTH_URL)

- script: |
    sf profiler retrieve --target-org target-org --json
  displayName: 'Retrieve Profiles'

- script: |
    git config user.email "pipeline@company.com"
    git config user.name "Azure Pipeline"
    git add force-app/main/default/profiles/
    git commit -m "Update profiles [skip ci]" || echo "No changes"
  displayName: 'Commit Changes'
```

## Best Practices

1. **Always review changes**: Profile retrieval can result in unexpected changes. Always review diffs before committing.

2. **Use version control**: Keep profiles in Git to track changes over time.

3. **Schedule regular retrievals**: Set up scheduled jobs to keep profiles in sync.

4. **Separate FLS from structure**: Use `--all-fields` only when you need to manage field permissions.

5. **Test in sandbox first**: Always test profile changes in a sandbox before deploying to production.

6. **Document your process**: Keep notes on when and why you retrieve profiles.

7. **Use JSON output for automation**: Parse JSON output in scripts for better error handling.

8. **Set up notifications**: Configure your CI/CD to notify on failures or changes.

## Troubleshooting

### Authentication Issues

If authentication fails in CI/CD:
```bash
# Verify SFDX_AUTH_URL format
sf org display --target-org your-org --verbose

# Test authentication
echo "$SFDX_AUTH_URL" | sf org login sfdx-url --sfdx-url-stdin --alias test-org
```

### No Changes Detected

If no profiles are retrieved:
- Verify org authentication
- Check that profiles exist in the org
- Ensure you have proper permissions

### Git Operations Fail

If git operations fail:
- Ensure git is initialized in the project
- Check that force-app directory exists
- Verify git credentials in CI/CD

## Contributing

Have a useful example? Please contribute!

1. Create your example in this directory
2. Add documentation to this README
3. Submit a pull request

## Support

For issues or questions:
- Check the main [README](../README.md)
- Review [USAGE](../USAGE.md) documentation
- Open an issue on GitHub

