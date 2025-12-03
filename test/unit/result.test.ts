/**
 * Result Monad - Happy Path Tests
 *
 * These tests verify correct behavior in success scenarios.
 * Written AFTER error tests pass.
 */

import { expect } from 'chai';
import { success, failure, pure, tryCatch, tryCatchAsync, type Result } from '../../src/core/monad/result.js';

describe('Result Monad - Happy Path', () => {
  describe('Success creation', () => {
    it('should create a Success with a value', () => {
      // Arrange & Act
      const result = success(42);

      // Assert
      expect(result.isSuccess()).to.be.true;
      expect(result.isFailure()).to.be.false;
      if (result.isSuccess()) {
        expect(result.value).to.equal(42);
      }
    });

    it('should work with different types', () => {
      // String
      const strResult = success('hello');
      if (strResult.isSuccess()) {
        expect(strResult.value).to.equal('hello');
      }

      // Object
      const objResult = success({ name: 'test' });
      if (objResult.isSuccess()) {
        expect(objResult.value).to.deep.equal({ name: 'test' });
      }

      // Array
      const arrResult = success([1, 2, 3]);
      if (arrResult.isSuccess()) {
        expect(arrResult.value).to.deep.equal([1, 2, 3]);
      }
    });
  });

  describe('Failure creation', () => {
    it('should create a Failure with an error', () => {
      // Arrange & Act
      const error = new Error('Test error');
      const result = failure(error);

      // Assert
      expect(result.isSuccess()).to.be.false;
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error).to.equal(error);
      }
    });
  });

  describe('unsafeUnwrap()', () => {
    it('should return value for Success', () => {
      // Arrange
      const result = success(42);

      // Act
      const value = result.unsafeUnwrap();

      // Assert
      expect(value).to.equal(42);
    });

    it('should work with complex types', () => {
      // Arrange
      const data = { name: 'test', items: [1, 2, 3] };
      const result = success(data);

      // Act
      const value = result.unsafeUnwrap();

      // Assert
      expect(value).to.deep.equal(data);
    });
  });

  describe('unwrapOr()', () => {
    it('should return value for Success', () => {
      // Arrange
      const result = success(42);

      // Act
      const value = result.unwrapOr(0);

      // Assert
      expect(value).to.equal(42);
    });

    it('should return default for Failure', () => {
      // Arrange
      const result: Result<number> = failure(new Error('Test'));

      // Act
      const value = result.unwrapOr(99);

      // Assert
      expect(value).to.equal(99);
    });
  });

  describe('map()', () => {
    it('should transform Success value', () => {
      // Arrange
      const result = success(10);

      // Act
      const mapped = result.map(x => x * 2);

      // Assert
      expect(mapped.isSuccess()).to.be.true;
      expect(mapped.unsafeUnwrap()).to.equal(20);
    });

    it('should chain multiple maps', () => {
      // Arrange
      const result = success(5);

      // Act
      const mapped = result
        .map(x => x * 2)   // 10
        .map(x => x + 3)   // 13
        .map(x => x * 10); // 130

      // Assert
      expect(mapped.unsafeUnwrap()).to.equal(130);
    });

    it('should not execute map on Failure', () => {
      // Arrange
      const result: Result<number> = failure(new Error('Test'));
      let executed = false;

      // Act
      const mapped = result.map(x => {
        executed = true;
        return x * 2;
      });

      // Assert
      expect(executed).to.be.false;
      expect(mapped.isFailure()).to.be.true;
    });

    it('should catch errors in map function', () => {
      // Arrange
      const result = success(10);

      // Act
      const mapped = result.map(() => {
        throw new Error('Map error');
      });

      // Assert
      expect(mapped.isFailure()).to.be.true;
      if (mapped.isFailure()) {
        expect(mapped.error.message).to.equal('Map error');
      }
    });
  });

  describe('flatMap()', () => {
    it('should chain Result-returning functions', () => {
      // Arrange
      const divide = (a: number, b: number): Result<number> => {
        if (b === 0) return failure(new Error('Division by zero'));
        return success(a / b);
      };

      const result = success(10);

      // Act
      const chained = result.flatMap(x => divide(x, 2));

      // Assert
      expect(chained.isSuccess()).to.be.true;
      expect(chained.unsafeUnwrap()).to.equal(5);
    });

    it('should propagate Failure through flatMap chain', () => {
      // Arrange
      const divide = (a: number, b: number): Result<number> => {
        if (b === 0) return failure(new Error('Division by zero'));
        return success(a / b);
      };

      const result = success(10);

      // Act
      const chained = result
        .flatMap(x => divide(x, 2))    // Success(5)
        .flatMap(x => divide(x, 0))    // Failure
        .flatMap(x => divide(x, 2));   // Should not execute

      // Assert
      expect(chained.isFailure()).to.be.true;
      if (chained.isFailure()) {
        expect(chained.error.message).to.equal('Division by zero');
      }
    });

    it('should not execute flatMap on Failure', () => {
      // Arrange
      const result: Result<number> = failure(new Error('Test'));
      let executed = false;

      // Act
      const chained = result.flatMap(() => {
        executed = true;
        return success(42);
      });

      // Assert
      expect(executed).to.be.false;
      expect(chained.isFailure()).to.be.true;
    });
  });

  describe('pure()', () => {
    it('should lift a value into Success', () => {
      // Arrange & Act
      const result = pure(42);

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(42);
      }
    });
  });

  describe('tryCatch()', () => {
    it('should return Success for successful function', () => {
      // Arrange & Act
      const result = tryCatch(() => 42);

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(42);
      }
    });

    it('should return Failure for throwing function', () => {
      // Arrange & Act
      const result = tryCatch(() => {
        throw new Error('Test error');
      });

      // Assert
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error.message).to.equal('Test error');
      }
    });
  });

  describe('tryCatchAsync()', () => {
    it('should return Success for successful async function', async () => {
      // Arrange & Act
      const result = await tryCatchAsync(async () => 42);

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(42);
      }
    });

    it('should return Failure for rejecting async function', async () => {
      // Arrange & Act
      const result = await tryCatchAsync(async () => {
        throw new Error('Async error');
      });

      // Assert
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error.message).to.equal('Async error');
      }
    });
  });

  describe('Type narrowing', () => {
    it('should narrow types correctly with if-else', () => {
      // Arrange
      const result: Result<number> = success(42);

      // Act & Assert
      if (result.isSuccess()) {
        // TypeScript knows result.value exists
        const value: number = result.value;
        expect(value).to.equal(42);
      } else {
        // TypeScript knows result.error exists
        const error: Error = result.error;
        expect.fail(`Unexpected error: ${error.message}`);
      }
    });

    it('should handle Failure branch', () => {
      // Arrange
      const error = new Error('Test');
      const result: Result<number> = failure(error);

      // Act & Assert
      if (result.isFailure()) {
        // TypeScript knows result.error exists
        expect(result.error).to.equal(error);
      } else {
        // TypeScript knows result.value exists
        expect.fail(`Unexpected success: ${result.value}`);
      }
    });
  });

  describe('Real-world example', () => {
    it('should handle a complete workflow', () => {
      // Simulate profile retrieval workflow
      type Profile = { name: string; permissions: string[] };

      const getProfile = (name: string): Result<Profile> => {
        if (!name) return failure(new Error('Profile name required'));
        return success({ name, permissions: ['read', 'write'] });
      };

      const validateProfile = (profile: Profile): Result<Profile> => {
        if (profile.permissions.length === 0) {
          return failure(new Error('Profile must have at least one permission'));
        }
        return success(profile);
      };

      const addPermission = (profile: Profile, perm: string): Result<Profile> => {
        return success({
          ...profile,
          permissions: [...profile.permissions, perm],
        });
      };

      // Act
      const result = getProfile('Admin')
        .flatMap(validateProfile)
        .flatMap(p => addPermission(p, 'delete'));

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.name).to.equal('Admin');
        expect(result.value.permissions).to.include('delete');
      }
    });
  });
});

