/**
 * ERROR-DRIVEN DEVELOPMENT: Result Monad Error Tests
 *
 * These tests MUST be written BEFORE implementation.
 * They MUST FAIL initially, then pass after implementation.
 *
 * Purpose: Ensure Result type handles all error cases properly.
 */

import { expect } from 'chai';
import { UnwrapError } from '../../src/core/errors/monad-errors.js';
import { success, failure, type Result } from '../../src/core/monad/result.js';

describe('Result Monad - Error Handling', () => {
  describe('UnwrapError', () => {
    it('should throw UnwrapError when unwrapping a Failure', () => {
      // Arrange
      const error = new Error('Test error');
      const result = failure(error);

      // Act & Assert
      expect(() => result.unsafeUnwrap()).to.throw(UnwrapError);
      expect(() => result.unsafeUnwrap()).to.throw('Attempted to unwrap Failure: Test error');
    });

    it('should include the original error in UnwrapError', () => {
      // Arrange
      const originalError = new Error('Original error');
      const result = failure(originalError);

      // Act & Assert
      try {
        result.unsafeUnwrap();
        expect.fail('Should have thrown UnwrapError');
      } catch (error) {
        expect(error).to.be.instanceOf(UnwrapError);
        expect((error as UnwrapError).cause).to.equal(originalError);
      }
    });

    it('should have correct error code', () => {
      // Arrange
      const result = failure(new Error('Test'));

      // Act & Assert
      try {
        result.unsafeUnwrap();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as UnwrapError).code).to.equal('UNWRAP_FAILURE');
      }
    });

    it('should have exit code 2 (fatal)', () => {
      // Arrange
      const result = failure(new Error('Test'));

      // Act & Assert
      try {
        result.unsafeUnwrap();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as UnwrapError).exitCode).to.equal(2);
      }
    });

    it('should not be recoverable', () => {
      // Arrange
      const result = failure(new Error('Test'));

      // Act & Assert
      try {
        result.unsafeUnwrap();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as UnwrapError).recoverable).to.be.false;
      }
    });
  });

  describe('Type Guard Safety', () => {
    it('should not allow accessing value on Failure', () => {
      // Arrange
      const result: Result<number> = failure(new Error('Test'));

      // Act & Assert
      if (result.isFailure()) {
        // TypeScript should prevent accessing .value here
        // This is a compile-time check, but we test runtime behavior
        expect((result as any).value).to.be.undefined;
      }
    });

    it('should not allow accessing error on Success', () => {
      // Arrange
      const result: Result<number> = success(42);

      // Act & Assert
      if (result.isSuccess()) {
        // TypeScript should prevent accessing .error here
        expect((result as any).error).to.be.undefined;
      }
    });

    it('should properly narrow types with isSuccess', () => {
      // Arrange
      const result: Result<number> = success(42);

      // Act
      if (result.isSuccess()) {
        // TypeScript must know this is Success<number>
        const value: number = result.value; // Must compile

        // Assert
        expect(value).to.equal(42);
      } else {
        expect.fail('Should have been Success');
      }
    });

    it('should properly narrow types with isFailure', () => {
      // Arrange
      const testError = new Error('Test error');
      const result: Result<number> = failure(testError);

      // Act
      if (result.isFailure()) {
        // TypeScript must know this is Failure<never>
        const error: Error = result.error; // Must compile

        // Assert
        expect(error).to.equal(testError);
      } else {
        expect.fail('Should have been Failure');
      }
    });
  });

  describe('Error Propagation', () => {
    it('should preserve error through multiple operations', () => {
      // Arrange
      const originalError = new Error('Original');
      const result = failure(originalError);

      // Act & Assert
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error).to.equal(originalError);
      }
    });

    it('should throw when accessing value of Failure via unsafeUnwrap', () => {
      // Arrange
      const result = failure(new Error('Cannot unwrap'));

      // Act & Assert
      expect(() => result.unsafeUnwrap()).to.throw(UnwrapError);
    });
  });

  describe('Error Information', () => {
    it('should provide helpful error message', () => {
      // Arrange
      const result = failure(new Error('Database connection failed'));

      // Act & Assert
      try {
        result.unsafeUnwrap();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).to.include('Database connection failed');
      }
    });

    it('should provide recovery actions', () => {
      // Arrange
      const result = failure(new Error('Test'));

      // Act & Assert
      try {
        result.unsafeUnwrap();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as UnwrapError).actions).to.be.an('array');
        expect((error as UnwrapError).actions).to.have.length.greaterThan(0);
      }
    });
  });
});

