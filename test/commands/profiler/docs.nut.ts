import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('profiler docs NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      project: {
        name: 'profilerDocsNUT',
      },
    });
  });

  after(async () => {
    await session?.clean();
  });

  it('should display help for profiler docs command', () => {
    const result = execCmd('profiler docs --help', { ensureExitCode: 0 }).shellOutput.stdout;
    expect(result).to.include('profiler docs');
    expect(result).to.include('Generate comprehensive documentation');
  });

  it('should show error when profiles directory does not exist', () => {
    const result = execCmd('profiler docs --json', { ensureExitCode: 1 }).jsonOutput;
    expect(result?.status).to.equal(1);
  });
});

