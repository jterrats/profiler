/**
 * ProfilerMonad - Happy Path Tests
 *
 * These tests verify correct behavior in success scenarios.
 * Written AFTER error tests pass.
 */

import { expect } from 'chai';
import { pure, liftAsync, sequence, traverse, type ProfilerMonad } from '../../src/core/monad/profiler-monad.js';

describe('ProfilerMonad - Happy Path', () => {
  describe('pure()', () => {
    it('should create a monad with a value', async () => {
      // Arrange & Act
      const monad = pure(42);
      const result = await monad.run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(42);
      }
    });

    it('should work with different types', async () => {
      // String
      const strMonad = pure('hello');
      const strResult = await strMonad.run();
      expect(strResult.isSuccess()).to.be.true;

      // Object
      const objMonad = pure({ name: 'test' });
      const objResult = await objMonad.run();
      expect(objResult.isSuccess()).to.be.true;

      // Array
      const arrMonad = pure([1, 2, 3]);
      const arrResult = await arrMonad.run();
      expect(arrResult.isSuccess()).to.be.true;
    });
  });

  describe('liftAsync()', () => {
    it('should lift sync function into monad', async () => {
      // Arrange & Act
      const monad = liftAsync(() => 42);
      const result = await monad.run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(42);
      }
    });

    it('should lift async function into monad', async () => {
      // Arrange & Act
      const monad = liftAsync(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });
      const result = await monad.run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal('async result');
      }
    });
  });

  describe('map()', () => {
    it('should transform value', async () => {
      // Arrange
      const monad = pure(10);

      // Act
      const mapped = monad.map(x => x * 2);
      const result = await mapped.run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(20);
      }
    });

    it('should chain multiple maps', async () => {
      // Arrange
      const monad = pure(5);

      // Act
      const result = await monad
        .map(x => x * 2)   // 10
        .map(x => x + 3)   // 13
        .map(x => x * 10)  // 130
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(130);
      }
    });

    it('should work with async lifted functions', async () => {
      // Arrange
      const monad = liftAsync(async () => 'hello');

      // Act
      const result = await monad
        .map(s => s.toUpperCase())
        .map(s => s + '!')
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal('HELLO!');
      }
    });
  });

  describe('flatMap()', () => {
    it('should chain monad-returning functions', async () => {
      // Arrange
      const divide = (a: number, b: number): ProfilerMonad<number> => {
        return liftAsync(() => a / b);
      };

      // Act
      const result = await pure(10)
        .flatMap(x => divide(x, 2))
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(5);
      }
    });

    it('should chain multiple flatMaps', async () => {
      // Arrange
      const add = (a: number, b: number) => pure(a + b);
      const multiply = (a: number, b: number) => pure(a * b);

      // Act
      const result = await pure(5)
        .flatMap(x => add(x, 3))      // 8
        .flatMap(x => multiply(x, 2)) // 16
        .flatMap(x => add(x, 4))      // 20
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(20);
      }
    });

    it('should work with async operations', async () => {
      // Arrange
      const fetchData = (id: number) => liftAsync(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { id, name: `Item ${id}` };
      });

      // Act
      const result = await pure(42)
        .flatMap(id => fetchData(id))
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.deep.equal({ id: 42, name: 'Item 42' });
      }
    });
  });

  describe('chain() (alias for flatMap)', () => {
    it('should work the same as flatMap', async () => {
      // Arrange
      const add = (a: number, b: number) => pure(a + b);

      // Act
      const result = await pure(5)
        .chain(x => add(x, 3))
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(8);
      }
    });
  });

  describe('tap()', () => {
    it('should execute side effect without changing value', async () => {
      // Arrange
      let sideEffect = 0;
      const monad = pure(42);

      // Act
      const result = await monad
        .tap(x => { sideEffect = x; })
        .run();

      // Assert
      expect(sideEffect).to.equal(42);
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(42);
      }
    });

    it('should allow multiple taps', async () => {
      // Arrange
      const log: string[] = [];

      // Act
      const result = await pure('test')
        .tap(s => log.push(`Before: ${s}`))
        .map(s => s.toUpperCase())
        .tap(s => log.push(`After: ${s}`))
        .run();

      // Assert
      expect(log).to.deep.equal(['Before: test', 'After: TEST']);
      expect(result.isSuccess()).to.be.true;
    });

    it('should not break chain if tap throws', async () => {
      // Arrange & Act
      const result = await pure(10)
        .tap(() => { throw new Error('Tap error'); })
        .map(x => x * 2)
        .run();

      // Assert - tap errors are ignored
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(20);
      }
    });
  });

  describe('recover()', () => {
    it('should not execute on success', async () => {
      // Arrange
      let recoveryExecuted = false;

      // Act
      const result = await pure(42)
        .recover(() => {
          recoveryExecuted = true;
          return 99;
        })
        .run();

      // Assert
      expect(recoveryExecuted).to.be.false;
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(42);
      }
    });

    it('should recover from error with fallback value', async () => {
      // Arrange
      const monad = liftAsync<number>(() => {
        throw new Error('Failed');
      }).recover(() => 99);

      // Act
      const result = await monad.run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.equal(99);
      }
    });

    it('should access error in recovery function', async () => {
      // Arrange
      let errorMessage = '';
      const monad = liftAsync<string>(() => {
        throw new Error('Database error');
      }).recover(error => {
        errorMessage = error.message;
        return 'default';
      });

      // Act
      const result = await monad.run();

      // Assert
      expect(errorMessage).to.include('Database error');
      expect(result.isSuccess()).to.be.true;
    });
  });

  describe('Lazy Evaluation', () => {
    it('should not execute until run() is called', async () => {
      // Arrange
      let executed = false;
      const monad = liftAsync(() => {
        executed = true;
        return 42;
      });

      // Assert (before run)
      expect(executed).to.be.false;

      // Act
      await monad.run();

      // Assert (after run)
      expect(executed).to.be.true;
    });

    it('should execute each time run() is called', async () => {
      // Arrange
      let count = 0;
      const monad = liftAsync(() => {
        count++;
        return count;
      });

      // Act
      const result1 = await monad.run();
      const result2 = await monad.run();

      // Assert
      expect(count).to.equal(2);
      if (result1.isSuccess() && result2.isSuccess()) {
        expect(result1.value).to.equal(1);
        expect(result2.value).to.equal(2);
      }
    });
  });

  describe('unsafeRun()', () => {
    it('should return value directly', async () => {
      // Arrange
      const monad = pure(42);

      // Act
      const value = await monad.unsafeRun();

      // Assert
      expect(value).to.equal(42);
    });

    it('should work with complex types', async () => {
      // Arrange
      const data = { name: 'test', items: [1, 2, 3] };
      const monad = pure(data);

      // Act
      const value = await monad.unsafeRun();

      // Assert
      expect(value).to.deep.equal(data);
    });
  });

  describe('sequence()', () => {
    it('should execute multiple monads and collect results', async () => {
      // Arrange
      const monads = [
        pure(1),
        pure(2),
        pure(3),
      ];

      // Act
      const result = await sequence(monads).run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.deep.equal([1, 2, 3]);
      }
    });

    it('should work with async monads', async () => {
      // Arrange
      const monads = [
        liftAsync(async () => 'a'),
        liftAsync(async () => 'b'),
        liftAsync(async () => 'c'),
      ];

      // Act
      const result = await sequence(monads).run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.deep.equal(['a', 'b', 'c']);
      }
    });
  });

  describe('traverse()', () => {
    it('should map array to monads and sequence', async () => {
      // Arrange
      const numbers = [1, 2, 3, 4, 5];
      const double = (n: number) => pure(n * 2);

      // Act
      const result = await traverse(numbers, double).run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.deep.equal([2, 4, 6, 8, 10]);
      }
    });

    it('should work with async operations', async () => {
      // Arrange
      const ids = [1, 2, 3];
      const fetchItem = (id: number) => liftAsync(async () => ({
        id,
        name: `Item ${id}`,
      }));

      // Act
      const result = await traverse(ids, fetchItem).run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.have.length(3);
        expect(result.value[0]).to.deep.equal({ id: 1, name: 'Item 1' });
      }
    });
  });

  describe('Real-world workflow', () => {
    it('should handle complete profile retrieval workflow', async () => {
      // Simulate real workflow
      type Profile = { name: string; permissions: string[] };

      const fetchProfile = (name: string) => liftAsync(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { name, permissions: ['read'] } as Profile;
      });

      const addPermission = (profile: Profile, perm: string) => pure({
        ...profile,
        permissions: [...profile.permissions, perm],
      });

      const validateProfile = (profile: Profile) => liftAsync(async () => {
        if (profile.permissions.length === 0) {
          throw new Error('No permissions');
        }
        return profile;
      });

      // Act
      const result = await fetchProfile('Admin')
        .tap(p => console.log(`Fetched: ${p.name}`))
        .flatMap(p => addPermission(p, 'write'))
        .flatMap(p => addPermission(p, 'delete'))
        .flatMap(p => validateProfile(p))
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.name).to.equal('Admin');
        expect(result.value.permissions).to.include.members(['read', 'write', 'delete']);
      }
    });

    it('should handle error recovery in workflow', async () => {
      // Arrange
      const riskyOperation = () => liftAsync<{ status: string }>(() => {
        throw new Error('Operation failed');
      });

      const fallback = { status: 'fallback' };

      // Act
      const result = await pure('start')
        .flatMap(() => riskyOperation())
        .recover(() => fallback)
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.deep.equal(fallback);
      }
    });
  });
});

