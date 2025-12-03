/**
 * ERROR-DRIVEN DEVELOPMENT: ProfilerMonad Error Tests
 * 
 * These tests MUST be written BEFORE implementation.
 * They MUST FAIL initially, then pass after implementation.
 * 
 * Purpose: Ensure ProfilerMonad handles all error cases properly.
 */

import { expect } from 'chai';
import { ComputationError, FlatMapError, RecoveryError, type ProfilerError } from '../../src/core/errors/index.js';
import { liftAsync, pure } from '../../src/core/monad/profiler-monad.js';

describe('ProfilerMonad - Error Handling', () => {
  describe('ComputationError', () => {
    it('should capture computation errors', async () => {
      // Arrange
      const monad = liftAsync(() => {
        throw new Error('Computation failed');
      });

      // Act
      const result = await monad.run();

      // Assert
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error).to.be.instanceOf(ComputationError);
        expect(result.error.message).to.include('Computation failed');
      }
    });

    it('should include original error as cause', async () => {
      // Arrange
      const originalError = new Error('Database connection failed');
      const monad = liftAsync(() => {
        throw originalError;
      });

      // Act
      const result = await monad.run();

      // Assert
      if (result.isFailure()) {
        expect((result.error as any).cause).to.equal(originalError);
      }
    });

    it('should have correct error code', async () => {
      // Arrange
      const monad = liftAsync(() => {
        throw new Error('Test');
      });

      // Act
      const result = await monad.run();

      // Assert
      if (result.isFailure()) {
        expect((result.error as ProfilerError).code).to.equal('COMPUTATION_ERROR');
      }
    });
  });

  describe('FlatMapError', () => {
    it('should capture flatMap errors', async () => {
      // Arrange
      const monad = pure(5).flatMap(() => {
        throw new Error('FlatMap failed');
      });

      // Act
      const result = await monad.run();

      // Assert
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error).to.be.instanceOf(FlatMapError);
        expect(result.error.message).to.include('FlatMap failed');
      }
    });

    it('should capture errors in nested flatMap', async () => {
      // Arrange
      const monad = pure(1)
        .flatMap(x => pure(x + 1))
        .flatMap(() => {
          throw new Error('Second flatMap failed');
        });

      // Act
      const result = await monad.run();

      // Assert
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error).to.be.instanceOf(FlatMapError);
      }
    });
  });

  describe('RecoveryError', () => {
    it('should capture recovery function errors', async () => {
      // Arrange
      const monad = liftAsync(() => {
        throw new Error('Initial error');
      }).recover(() => {
        throw new Error('Recovery failed');
      });

      // Act
      const result = await monad.run();

      // Assert
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error).to.be.instanceOf(RecoveryError);
        expect(result.error.message).to.include('Recovery failed');
      }
    });

    it('should include both original and recovery errors', async () => {
      // Arrange
      const originalError = new Error('Original');
      const recoveryError = new Error('Recovery');
      
      const monad = liftAsync(() => {
        throw originalError;
      }).recover(() => {
        throw recoveryError;
      });

      // Act
      const result = await monad.run();

      // Assert
      if (result.isFailure()) {
        expect(result.error.message).to.include('Original');
        expect(result.error.message).to.include('Recovery');
        expect((result.error as any).cause).to.equal(recoveryError);
      }
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors through chain', async () => {
      // Arrange
      const monad = pure(5)
        .map(x => x * 2)
        .flatMap(() => liftAsync(() => {
          throw new Error('Step 2 failed');
        }))
        .map(x => x + 1); // Should not execute

      // Act
      const result = await monad.run();

      // Assert
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error.message).to.include('Step 2 failed');
      }
    });

    it('should not execute subsequent operations after error', async () => {
      // Arrange
      let executed = false;
      const monad = liftAsync(() => {
        throw new Error('First error');
      })
        .map(() => {
          executed = true;
          return 42;
        });

      // Act
      await monad.run();

      // Assert
      expect(executed).to.be.false;
    });

    it('should stop chain on first error', async () => {
      // Arrange
      let step2Executed = false;
      let step3Executed = false;

      const monad = pure(1)
        .flatMap(() => liftAsync(() => {
          throw new Error('Step 1 error');
        }))
        .flatMap(() => {
          step2Executed = true;
          return pure(2);
        })
        .map(() => {
          step3Executed = true;
          return 3;
        });

      // Act
      await monad.run();

      // Assert
      expect(step2Executed).to.be.false;
      expect(step3Executed).to.be.false;
    });
  });

  describe('Lazy Evaluation', () => {
    it('should not execute until run() is called', () => {
      // Arrange
      let executed = false;
      liftAsync(() => {
        executed = true;
        return 42;
      });

      // Assert (before run)
      expect(executed).to.be.false;
    });

    it('should execute when run() is called', async () => {
      // Arrange
      let executed = false;
      const monad = liftAsync(() => {
        executed = true;
        return 42;
      });

      // Act
      await monad.run();

      // Assert
      expect(executed).to.be.true;
    });
  });

  describe('Error Recovery', () => {
    it('should recover from errors with valid value', async () => {
      // Arrange
      const monad = liftAsync<number>(() => {
        throw new Error('Failed');
      }).recover(() => 42);

      // Act
      const result = await monad.run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(42);
      }
    });

    it('should not execute recover on success', async () => {
      // Arrange
      let recoveryExecuted = false;
      const monad = pure(10).recover(() => {
        recoveryExecuted = true;
        return 99;
      });

      // Act
      const result = await monad.run();

      // Assert
      expect(recoveryExecuted).to.be.false;
      if (result.isSuccess()) {
        expect(result.value).to.equal(10);
      }
    });
  });

  describe('Error Information', () => {
    it('should provide exit codes', async () => {
      // Arrange
      const monad = liftAsync(() => {
        throw new Error('Test');
      });

      // Act
      const result = await monad.run();

      // Assert
      if (result.isFailure()) {
        expect((result.error as ProfilerError).exitCode).to.be.a('number');
      }
    });

    it('should provide error codes', async () => {
      // Arrange
      const monad = liftAsync(() => {
        throw new Error('Test');
      });

      // Act
      const result = await monad.run();

      // Assert
      if (result.isFailure()) {
        expect((result.error as ProfilerError).code).to.be.a('string');
        expect((result.error as ProfilerError).code).to.not.be.empty;
      }
    });
  });
});

