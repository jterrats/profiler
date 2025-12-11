import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

/**
 * NUT (Non-Unit Tests) for profiler retrieve command
 *
 * These tests require a real Salesforce org connection.
 * Set the PROFILER_TEST_ORG_ALIAS environment variable to run org-dependent tests.
 *
 * Example:
 *   export PROFILER_TEST_ORG_ALIAS=myDevOrg
 *   npm run test:nuts
 */
describe('profiler retrieve NUTs', () => {
  let session: TestSession;
  const testOrgAlias = process.env.PROFILER_TEST_ORG_ALIAS;

  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: 'force-app',
      },
      devhubAuthStrategy: 'NONE',
    });
  });

  after(async () => {
    await session?.clean();
  });

  // ============================================================
  // Basic Tests (no org required)
  // ============================================================

  it('should display help for profiler retrieve', () => {
    const result = execCmd('profiler retrieve --help', { ensureExitCode: 0 }).shellOutput.stdout;
    expect(result).to.include('USAGE');
    expect(result).to.include('profiler retrieve');
    expect(result).to.include('--target-org');
    expect(result).to.include('--all-fields');
  });

  it('should fail without target-org flag', () => {
    const result = execCmd('profiler retrieve --json', { ensureExitCode: 1 });
    const output = JSON.parse(result.shellOutput.stdout) as { status: number };
    expect(output.status).to.equal(1);
  });

  // ============================================================
  // Org-Dependent Tests (require PROFILER_TEST_ORG_ALIAS)
  // ============================================================

  (testOrgAlias ? describe : describe.skip)('with real org connection', () => {
    it('should retrieve profiles from org', () => {
      const result = execCmd(`profiler retrieve --target-org ${testOrgAlias} --json`, {
        ensureExitCode: 0,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean; message: string; profiles: string[] };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
      expect(output.result.profiles).to.be.an('array').with.length.greaterThan(0);
    });

    it('should retrieve profiles with --all-fields flag', () => {
      const result = execCmd(`profiler retrieve --target-org ${testOrgAlias} --all-fields --json`, {
        ensureExitCode: 0,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
    });

    it('should retrieve a specific profile by name', () => {
      const result = execCmd(`profiler retrieve --target-org ${testOrgAlias} --name Admin --json`, {
        ensureExitCode: 0,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean; profiles: string[] };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
      expect(output.result.profiles).to.include('Admin');
    });

    it('should retrieve with --force flag (skip incremental)', () => {
      const result = execCmd(`profiler retrieve --target-org ${testOrgAlias} --force --json`, {
        ensureExitCode: 0,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean; message: string };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
      // Should not mention skipping (force always retrieves)
    });

    it('should preview with --dry-run flag', () => {
      const result = execCmd(`profiler retrieve --target-org ${testOrgAlias} --dry-run --json`, {
        ensureExitCode: 0,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean; message: string };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
      expect(output.result.message).to.include('would retrieve');
    });

    it('should retrieve with --documentation flag', () => {
      const result = execCmd(`profiler retrieve --target-org ${testOrgAlias} --documentation --json`, {
        ensureExitCode: 0,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
    });
  });
});

