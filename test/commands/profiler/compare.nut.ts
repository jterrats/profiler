import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('profiler compare NUTs', () => {
  let session: TestSession;

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

  it('should display help for profiler compare', () => {
    const result = execCmd('profiler compare --help', { ensureExitCode: 0 }).shellOutput.stdout;
    expect(result).to.include('USAGE');
    expect(result).to.include('profiler compare');
    expect(result).to.include('--target-org');
    expect(result).to.include('--name');
  });

  it('should fail without target-org flag', () => {
    const result = execCmd('profiler compare --json', { ensureExitCode: 1 });
    const output = JSON.parse(result.shellOutput.stdout) as { status: number };
    expect(output.status).to.equal(1);
  });

  // Note: These integration tests require a real org connection
  // Uncomment and modify when you have a test org available

  // it('should compare a specific profile', () => {
  //   const result = execCmd('profiler compare --target-org testOrg --name Admin --json', {
  //     ensureExitCode: 0
  //   });
  //   const output = JSON.parse(result.shellOutput.stdout);
  //   expect(output.status).to.equal(0);
  //   expect(output.result.success).to.equal(true);
  // });

  // it('should compare all profiles', () => {
  //   const result = execCmd('profiler compare --target-org testOrg --json', {
  //     ensureExitCode: 0
  //   });
  //   const output = JSON.parse(result.shellOutput.stdout);
  //   expect(output.status).to.equal(0);
  //   expect(output.result.totalProfilesCompared).to.be.greaterThan(0);
  // });
});


