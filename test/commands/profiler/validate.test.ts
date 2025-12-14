import { TestContext, MockTestOrgData } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { SfProject } from '@salesforce/core';
import ProfilerValidate from '../../../src/commands/profiler/validate.js';

describe('profiler validate', () => {
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

  it('requires a project', () => {
    expect(ProfilerValidate.requiresProject).to.equal(true);
  });

  it('has correct command structure', () => {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    expect(ProfilerValidate.flags.name).to.exist;
    expect(ProfilerValidate.flags['target-org']).to.exist;
    expect(ProfilerValidate.flags.strict).to.exist;
    expect(ProfilerValidate.flags['api-version']).to.exist;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  });

  it('has correct default values for flags', () => {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    expect(ProfilerValidate.flags.strict.default).to.equal(false);
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  });

  it('has summary and description', () => {
    expect(ProfilerValidate.summary).to.be.a('string');
    expect(ProfilerValidate.summary.length).to.be.greaterThan(0);
    expect(ProfilerValidate.description).to.be.a('string');
    expect(ProfilerValidate.description.length).to.be.greaterThan(0);
  });

  it('has examples', () => {
    expect(ProfilerValidate.examples).to.be.an('array');
    expect(ProfilerValidate.examples.length).to.be.greaterThan(0);
  });
});
