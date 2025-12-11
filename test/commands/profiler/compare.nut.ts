import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * NUT (Non-Unit Tests) for profiler compare command
 *
 * These tests require real Salesforce org connections.
 * Set environment variables to run org-dependent tests:
 *
 * Single-org tests:
 *   export PROFILER_TEST_ORG_ALIAS=myDevOrg
 *
 * Multi-source tests:
 *   export PROFILER_TEST_ORG_ALIAS_2=testOrg1
 *   export PROFILER_TEST_ORG_ALIAS_3=testOrg2
 *
 * Example:
 *   export PROFILER_TEST_ORG_ALIAS=myDevOrg
 *   export PROFILER_TEST_ORG_ALIAS_2=testOrg1
 *   export PROFILER_TEST_ORG_ALIAS_3=testOrg2
 *   npm run test:nuts
 */
describe('profiler compare NUTs', () => {
  let session: TestSession;
  const testOrgAlias = process.env.PROFILER_TEST_ORG_ALIAS;
  const testOrgAlias2 = process.env.PROFILER_TEST_ORG_ALIAS_2;
  const testOrgAlias3 = process.env.PROFILER_TEST_ORG_ALIAS_3;

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

  it('should display help for profiler compare', () => {
    const result = execCmd('profiler compare --help', { ensureExitCode: 0 }).shellOutput.stdout;
    expect(result).to.include('USAGE');
    expect(result).to.include('profiler compare');
    expect(result).to.include('--target-org');
    expect(result).to.include('--name');
    expect(result).to.include('--sources');
    expect(result).to.include('--output-format');
  });

  it('should fail without target-org or sources flag', () => {
    const result = execCmd('profiler compare --json', { ensureExitCode: 1 });
    const output = JSON.parse(result.shellOutput.stdout) as { status: number };
    expect(output.status).to.equal(1);
  });

  // ============================================================
  // Single-Org Tests (require PROFILER_TEST_ORG_ALIAS)
  // ============================================================

  (testOrgAlias ? describe : describe.skip)('with single org connection', () => {
    it('should compare a specific profile (local vs org)', () => {
      const result = execCmd(`profiler compare --target-org ${testOrgAlias} --name Admin --json`, {
        ensureExitCode: 0,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
    });

    it('should compare all profiles (local vs org)', () => {
      const result = execCmd(`profiler compare --target-org ${testOrgAlias} --json`, {
        ensureExitCode: 0,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean; totalProfilesCompared?: number };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
      if (output.result.totalProfilesCompared) {
        expect(output.result.totalProfilesCompared).to.be.greaterThan(0);
      }
    });
  });

  // ============================================================
  // Multi-Source Tests (require all 3 org aliases)
  // ============================================================

  (testOrgAlias && testOrgAlias2 && testOrgAlias3 ? describe : describe.skip)('with multiple orgs', () => {
    it('should compare with --sources flag (multi-org)', () => {
      const sources = `${testOrgAlias},${testOrgAlias2},${testOrgAlias3}`;
      const result = execCmd(`profiler compare --sources "${sources}" --name Admin --json`, {
        ensureExitCode: 0,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean; matrix?: unknown };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
      expect(output.result.matrix).to.exist;
    });

    it('should compare with --output-format json', () => {
      const sources = `${testOrgAlias},${testOrgAlias2}`;
      const result = execCmd(
        `profiler compare --sources "${sources}" --name Admin --output-format json --json`,
        {
          ensureExitCode: 0,
        }
      );
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean; formattedOutput?: string };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
      // Should contain valid JSON
      if (output.result.formattedOutput) {
        expect(() => JSON.parse(output.result.formattedOutput)).to.not.throw();
      }
    });

    it('should compare with --output-format html', () => {
      const sources = `${testOrgAlias},${testOrgAlias2}`;
      const result = execCmd(
        `profiler compare --sources "${sources}" --name Admin --output-format html --json`,
        {
          ensureExitCode: 0,
        }
      );
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean; formattedOutput?: string };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);
      // Should contain HTML
      if (output.result.formattedOutput) {
        expect(output.result.formattedOutput).to.include('<html');
        expect(output.result.formattedOutput).to.include('</html>');
      }
    });

    it('should compare with --output-file', function () {
      // eslint-disable-next-line no-invalid-this
      this.timeout(60000); // Increase timeout for file operations

      const sources = `${testOrgAlias},${testOrgAlias2}`;
      const outputFile = path.join(session.dir, 'comparison-output.html');

      const result = execCmd(
        `profiler compare --sources "${sources}" --name Admin --output-format html --output-file "${outputFile}" --json`,
        {
          ensureExitCode: 0,
        }
      );
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        result: { success: boolean };
      };
      expect(output.status).to.equal(0);
      expect(output.result.success).to.equal(true);

      // Verify file was created
      expect(fs.existsSync(outputFile)).to.be.true;
      const fileContent = fs.readFileSync(outputFile, 'utf8');
      expect(fileContent).to.include('<html');
    });

    it('should fail with invalid alias in --sources', () => {
      const sources = `${testOrgAlias},invalid-org-alias`;
      const result = execCmd(`profiler compare --sources "${sources}" --name Admin --json`, {
        ensureExitCode: 1,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        name?: string;
      };
      expect(output.status).to.equal(1);
      // Should be an authentication or org resolution error
      expect(output.name).to.match(/Error/);
    });

    it('should fail with only 1 org in --sources', () => {
      const result = execCmd(`profiler compare --sources "${testOrgAlias}" --name Admin --json`, {
        ensureExitCode: 1,
      });
      const output = JSON.parse(result.shellOutput.stdout) as {
        status: number;
        message?: string;
      };
      expect(output.status).to.equal(1);
      expect(output.message).to.include('at least 2');
    });
  });
});


