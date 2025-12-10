/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { expect } from 'chai';
import { describe, it } from 'mocha';

/**
 * Multi-Source Comparison - Error Tests (EDD Step 2)
 *
 * These tests validate error handling for parallel multi-environment retrieval.
 *
 * Test philosophy (EDD):
 * 1. All environments fail → MultipleEnvironmentFailureError (UserError)
 * 2. Some environments fail → PartialRetrievalError (show partial results)
 * 3. Matrix build fails → MatrixBuildError (retry or reduce scope)
 * 4. Parallel execution fails → ParallelExecutionError (fallback to sequential)
 */

describe('Multi-Source Comparison - Error Handling (EDD)', () => {
  describe('MultipleEnvironmentFailureError - Total Failure', () => {
    it('should throw when all environments fail to connect', async () => {
      const { MultipleEnvironmentFailureError } = await import('../../src/core/errors/operation-errors.js');

      const failedOrgs = [
        { alias: 'qa', error: 'Not authenticated' },
        { alias: 'uat', error: 'Not authenticated' },
        { alias: 'prod', error: 'Not authenticated' },
      ];

      const error = new MultipleEnvironmentFailureError(failedOrgs, 3);

      expect(error).to.be.instanceOf(Error);
      expect(error.name).to.equal('MultipleEnvironmentFailureError');
      expect(error.code).to.equal('MULTIPLE_ENVIRONMENT_FAILURE');
      expect(error.message).to.include('3 of 3 environments failed');
      expect(error.actions).to.be.an('array');
      expect(error.actions.join(' ')).to.include('authentication');
    });

    it('should throw when most environments fail (2 of 3)', async () => {
      const { MultipleEnvironmentFailureError } = await import('../../src/core/errors/operation-errors.js');

      const failedOrgs = [
        { alias: 'uat', error: 'Connection timeout' },
        { alias: 'prod', error: 'Org not found' },
      ];

      const error = new MultipleEnvironmentFailureError(failedOrgs, 3);

      expect(error.message).to.include('2 of 3 environments failed');
      expect(error.actions).to.include.members([
        'Multiple org connections failed',
        'Check org authentication and network connection',
        'Verify org aliases are correct',
        'Try authenticating again: sf org login web --alias <alias>',
      ]);
    });

    it('should list failed environments in error message', async () => {
      const { MultipleEnvironmentFailureError } = await import('../../src/core/errors/operation-errors.js');

      const failedOrgs = [
        { alias: 'qa', error: 'Invalid credentials' },
        { alias: 'uat', error: 'Expired session' },
        { alias: 'prod', error: 'Network error' },
        { alias: 'sandbox', error: 'Timeout' },
      ];

      const error = new MultipleEnvironmentFailureError(failedOrgs, 4);

      // Should show first 3 failures
      expect(error.actions.join(' ')).to.include('qa: Invalid credentials');
      expect(error.actions.join(' ')).to.include('uat: Expired session');
      expect(error.actions.join(' ')).to.include('prod: Network error');
      expect(error.actions.join(' ')).to.include('...'); // Truncated indicator
    });

    it('should be a UserError (not recoverable)', async () => {
      const { MultipleEnvironmentFailureError } = await import('../../src/core/errors/operation-errors.js');
      const { UserError } = await import('../../src/core/errors/base-errors.js');

      const error = new MultipleEnvironmentFailureError([{ alias: 'qa', error: 'Failed' }], 1);

      expect(error).to.be.instanceOf(UserError);
      expect(error.recoverable).to.be.false; // User must fix auth
    });
  });

  describe('PartialRetrievalError - Partial Success', () => {
    it('should throw when some environments fail', async () => {
      const { PartialRetrievalError } = await import('../../src/core/errors/operation-errors.js');

      const successOrgs = ['qa', 'uat'];
      const failedOrgs = [{ alias: 'prod', error: 'Connection timeout' }];

      const error = new PartialRetrievalError(successOrgs, failedOrgs);

      expect(error).to.be.instanceOf(Error);
      expect(error.name).to.equal('PartialRetrievalError');
      expect(error.code).to.equal('PARTIAL_RETRIEVAL');
      expect(error.message).to.include('2 succeeded, 1 failed');
      expect(error.recoverable).to.be.true; // Can show partial results
    });

    it('should list successful and failed environments', async () => {
      const { PartialRetrievalError } = await import('../../src/core/errors/operation-errors.js');

      const successOrgs = ['qa', 'uat'];
      const failedOrgs = [
        { alias: 'prod', error: 'Auth failed' },
        { alias: 'sandbox', error: 'Network error' },
      ];

      const error = new PartialRetrievalError(successOrgs, failedOrgs);

      expect(error.actions.join(' ')).to.include('Successful: qa, uat');
      expect(error.actions.join(' ')).to.include('Failed: prod, sandbox');
      expect(error.actions.join(' ')).to.include('Comparison will show available data');
    });

    it('should be a SystemError (recoverable with graceful degradation)', async () => {
      const { PartialRetrievalError } = await import('../../src/core/errors/operation-errors.js');
      const { SystemError } = await import('../../src/core/errors/base-errors.js');

      const error = new PartialRetrievalError(['qa'], [{ alias: 'prod', error: 'Failed' }]);

      expect(error).to.be.instanceOf(SystemError);
      expect(error.recoverable).to.be.true; // Show partial results
    });

    it('should provide actionable recovery guidance', async () => {
      const { PartialRetrievalError } = await import('../../src/core/errors/operation-errors.js');

      const error = new PartialRetrievalError(['qa', 'uat'], [{ alias: 'prod', error: 'Failed' }]);

      expect(error.actions).to.be.an('array');
      expect(error.actions.length).to.be.greaterThan(0);
      expect(error.actions.join(' ')).to.include('environments retrieved successfully');
      expect(error.actions.join(' ')).to.include('retry');
    });
  });

  describe('MatrixBuildError - Matrix Construction Failure', () => {
    it('should throw when matrix cannot be built', async () => {
      const { MatrixBuildError } = await import('../../src/core/errors/operation-errors.js');

      const error = new MatrixBuildError('Incompatible profile structures');

      expect(error).to.be.instanceOf(Error);
      expect(error.name).to.equal('MatrixBuildError');
      expect(error.code).to.equal('MATRIX_BUILD_ERROR');
      expect(error.message).to.include('Incompatible profile structures');
      expect(error.recoverable).to.be.true;
    });

    it('should preserve cause chain', async () => {
      const { MatrixBuildError } = await import('../../src/core/errors/operation-errors.js');

      const originalError = new Error('XML parse failed');
      const error = new MatrixBuildError('Cannot parse profile', originalError);

      expect(error.cause).to.equal(originalError);
      expect((error.cause as Error).message).to.equal('XML parse failed');
    });

    it('should provide recovery actions', async () => {
      const { MatrixBuildError } = await import('../../src/core/errors/operation-errors.js');

      const error = new MatrixBuildError('Structure mismatch');

      expect(error.actions).to.include.members([
        'Could not construct comparison matrix',
        'Profiles may have incompatible structure',
        'Try comparing fewer environments',
        'Verify profile XML is valid',
      ]);
    });

    it('should be a SystemError (recoverable)', async () => {
      const { MatrixBuildError } = await import('../../src/core/errors/operation-errors.js');
      const { SystemError } = await import('../../src/core/errors/base-errors.js');

      const error = new MatrixBuildError('Build failed');

      expect(error).to.be.instanceOf(SystemError);
      expect(error.recoverable).to.be.true;
    });
  });

  describe('ParallelExecutionError - Parallel Task Failure', () => {
    it('should throw when parallel execution fails', async () => {
      const { ParallelExecutionError } = await import('../../src/core/errors/operation-errors.js');

      const error = new ParallelExecutionError(2, 5);

      expect(error).to.be.instanceOf(Error);
      expect(error.name).to.equal('ParallelExecutionError');
      expect(error.code).to.equal('PARALLEL_EXECUTION_ERROR');
      expect(error.message).to.include('2 of 5 tasks failed');
      expect(error.recoverable).to.be.true;
    });

    it('should suggest fallback to sequential', async () => {
      const { ParallelExecutionError } = await import('../../src/core/errors/operation-errors.js');

      const error = new ParallelExecutionError(3, 5);

      expect(error.actions).to.include.members([
        'Parallel retrieval encountered errors',
        'Will retry failed tasks sequentially',
        'This may take longer but will be more reliable',
        'Consider reducing --max-parallel value',
      ]);
    });

    it('should preserve cause chain for debugging', async () => {
      const { ParallelExecutionError } = await import('../../src/core/errors/operation-errors.js');

      const originalError = new Error('Promise.all() rejected');
      const error = new ParallelExecutionError(2, 5, originalError);

      expect(error.cause).to.equal(originalError);
      expect((error.cause as Error).message).to.equal('Promise.all() rejected');
    });

    it('should be a SystemError (recoverable with sequential fallback)', async () => {
      const { ParallelExecutionError } = await import('../../src/core/errors/operation-errors.js');
      const { SystemError } = await import('../../src/core/errors/base-errors.js');

      const error = new ParallelExecutionError(1, 3);

      expect(error).to.be.instanceOf(SystemError);
      expect(error.recoverable).to.be.true; // Can fallback to sequential
    });
  });

  describe('Error Classification and Recovery Strategy', () => {
    it('should classify errors correctly (User vs System)', async () => {
      const { MultipleEnvironmentFailureError, PartialRetrievalError, MatrixBuildError, ParallelExecutionError } =
        await import('../../src/core/errors/operation-errors.js');
      const { UserError, SystemError } = await import('../../src/core/errors/base-errors.js');

      // UserError: requires user action (not recoverable by system)
      const userError = new MultipleEnvironmentFailureError([{ alias: 'qa', error: 'Failed' }], 1);
      expect(userError).to.be.instanceOf(UserError);
      expect(userError.recoverable).to.be.false;

      // SystemErrors: recoverable with graceful degradation
      const partialError = new PartialRetrievalError(['qa'], [{ alias: 'prod', error: 'Failed' }]);
      expect(partialError).to.be.instanceOf(SystemError);
      expect(partialError.recoverable).to.be.true;

      const matrixError = new MatrixBuildError('Failed');
      expect(matrixError).to.be.instanceOf(SystemError);
      expect(matrixError.recoverable).to.be.true;

      const parallelError = new ParallelExecutionError(1, 3);
      expect(parallelError).to.be.instanceOf(SystemError);
      expect(parallelError.recoverable).to.be.true;
    });

    it('should provide appropriate recovery strategies', async () => {
      const { MultipleEnvironmentFailureError, PartialRetrievalError, ParallelExecutionError } = await import(
        '../../src/core/errors/operation-errors.js'
      );

      // UserError: requires authentication fix
      const userError = new MultipleEnvironmentFailureError([{ alias: 'qa', error: 'Auth' }], 1);
      expect(userError.actions.join(' ')).to.include('authentication');

      // SystemError: show partial results
      const partialError = new PartialRetrievalError(['qa'], [{ alias: 'prod', error: 'Failed' }]);
      expect(partialError.actions.join(' ')).to.include('environments retrieved successfully');
      expect(partialError.actions.join(' ')).to.include('available data');

      // SystemError: fallback to sequential
      const parallelError = new ParallelExecutionError(1, 3);
      expect(parallelError.actions.join(' ')).to.include('sequential');
      expect(parallelError.actions.join(' ')).to.include('retry');
    });
  });
});
