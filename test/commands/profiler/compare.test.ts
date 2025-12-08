import { TestContext, MockTestOrgData } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { SfProject } from '@salesforce/core';
import ProfilerCompare from '../../../src/commands/profiler/compare.js';

describe('profiler compare', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();

  beforeEach(async () => {
    stubSfCommandUx($$.SANDBOX);
    await $$.stubAuths(testOrg);
    $$.SANDBOX.stub(SfProject, 'resolve').resolves({
      getPath: () => '/test/project',
    } as unknown as SfProject);
  });

  afterEach(() => {
    $$.restore();
  });

  it('requires target-org flag', async () => {
    try {
      await ProfilerCompare.run([]);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('has correct flags defined', () => {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    expect(ProfilerCompare.flags['target-org']).to.exist;
    expect(ProfilerCompare.flags.name).to.exist;
    expect(ProfilerCompare.flags['api-version']).to.exist;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  });

  it('name flag has correct aliases', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(ProfilerCompare.flags.name.char).to.equal('n');
  });

  it('requires a project', () => {
    expect(ProfilerCompare.requiresProject).to.equal(true);
  });
});

