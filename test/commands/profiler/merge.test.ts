/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the MIT License.
 * For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TestContext, MockTestOrgData } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { SfProject } from '@salesforce/core';
import ProfilerMerge from '../../../src/commands/profiler/merge.js';

describe('profiler merge', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();

  beforeEach(async () => {
    stubSfCommandUx($$.SANDBOX);
    await $$.stubAuths(testOrg);
    $$.SANDBOX.stub(SfProject, 'resolve').resolves({
      getPath: () => '/test/project',
    } as unknown as SfProject);
    $$.SANDBOX.stub(SfProject, 'getInstance').resolves({
      getPath: () => '/test/project',
    } as unknown as SfProject);
  });

  afterEach(() => {
    $$.restore();
  });

  it('requires a project', () => {
    expect(ProfilerMerge.requiresProject).to.equal(true);
  });

  it('has correct command structure', () => {
    expect(ProfilerMerge.summary).to.exist;
    expect(ProfilerMerge.description).to.exist;
    expect(ProfilerMerge.examples).to.exist;
    expect(ProfilerMerge.requiresProject).to.be.true;
    expect(ProfilerMerge.flags['target-org']).to.exist;
    expect(ProfilerMerge.flags.name).to.exist;
    expect(ProfilerMerge.flags.strategy).to.exist;
    expect(ProfilerMerge.flags['dry-run']).to.exist;
    expect(ProfilerMerge.flags['skip-backup']).to.exist;
  });

  it('has correct default values for flags', () => {
    expect(ProfilerMerge.flags.strategy.default).to.equal('local-wins');
    expect(ProfilerMerge.flags['dry-run'].default).to.equal(false);
    expect(ProfilerMerge.flags['skip-backup'].default).to.equal(false);
  });

  it('requires target-org flag', () => {
    expect(ProfilerMerge.flags['target-org'].required).to.be.true;
  });

  it('requires name flag', () => {
    expect(ProfilerMerge.flags.name.required).to.be.true;
  });

  it('has summary and description', () => {
    expect(ProfilerMerge.summary).to.be.a('string').and.not.empty;
    expect(ProfilerMerge.description).to.be.a('string').and.not.empty;
  });

  it('has examples', () => {
    expect(ProfilerMerge.examples).to.be.an('array').and.not.empty;
  });

  it('has correct strategy options', () => {
    const strategyFlag = ProfilerMerge.flags.strategy;
    expect(strategyFlag.options).to.include.members([
      'local-wins',
      'org-wins',
      'union',
      'local',
      'org',
      'abort-on-conflict',
    ]);
  });
});
