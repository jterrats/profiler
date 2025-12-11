import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('profiler retrieve NUTs', () => {
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

  // Note: These integration tests require a real org connection
  // Uncomment and modify when you have a test org available

  // it('should retrieve profiles from org', () => {
  //   const result = execCmd('profiler retrieve --target-org testOrg --json', {
  //     ensureExitCode: 0
  //   });
  //   const output = JSON.parse(result.shellOutput.stdout);
  //   expect(output.status).to.equal(0);
  //   expect(output.result.success).to.equal(true);
  // });

  // it('should retrieve profiles with all-fields flag', () => {
  //   const result = execCmd('profiler retrieve --target-org testOrg --all-fields --json', {
  //     ensureExitCode: 0
  //   });
  //   const output = JSON.parse(result.shellOutput.stdout);
  //   expect(output.status).to.equal(0);
  //   expect(output.result.success).to.equal(true);
  // });
});

