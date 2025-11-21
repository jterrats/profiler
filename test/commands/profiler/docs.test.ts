import { expect } from 'chai';

describe('profiler docs', () => {
  it('should be registered', async () => {
    const DocsCommand = (await import('../../../src/commands/profiler/docs.js')).default;
    expect(DocsCommand).to.not.be.undefined;
  });

  it('should have correct command properties', async () => {
    const DocsCommand = (await import('../../../src/commands/profiler/docs.js')).default;
    expect(DocsCommand.summary).to.be.a('string');
    expect(DocsCommand.description).to.be.a('string');
    expect(DocsCommand.examples).to.be.an('array');
    expect(DocsCommand.flags).to.have.property('name');
    expect(DocsCommand.flags).to.have.property('output-dir');
  });

  it('should have name flag with correct properties', async () => {
    const DocsCommand = (await import('../../../src/commands/profiler/docs.js')).default;
    expect(DocsCommand.flags.name).to.have.property('char', 'n');
    expect(DocsCommand.flags.name).to.have.property('required', false);
  });

  it('should have output-dir flag with correct properties', async () => {
    const DocsCommand = (await import('../../../src/commands/profiler/docs.js')).default;
    expect(DocsCommand.flags['output-dir']).to.have.property('char', 'd');
    expect(DocsCommand.flags['output-dir']).to.have.property('default', 'profile-docs');
  });
});

