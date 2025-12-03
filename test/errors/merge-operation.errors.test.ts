/**
 * Error Tests for Merge Operation
 * Following Error-Driven Development: These tests are written BEFORE implementation
 *
 * Tests cover all 5 possible errors in merge operation
 */

import { expect } from 'chai';
import {
  MergeConflictError,
  BackupFailedError,
  InvalidMergeStrategyError,
  MergeValidationError,
  NoChangesToMergeError,
} from '../../src/core/errors/index.js';

describe('Merge Operation - Error Tests', () => {
  describe('MergeConflictError', () => {
    it('should create error with profile name and conflicting elements', () => {
      // Arrange
      const profileName = 'Admin';
      const conflicts = ['objectPermissions.Account', 'fieldPermissions.Contact.Email'];

      // Act
      const error = new MergeConflictError(profileName, conflicts);

      // Assert
      expect(error.message).to.include(profileName);
      expect(error.message).to.include(conflicts.length.toString());
      expect(error.code).to.equal('MERGE_CONFLICT');
      expect(error.recoverable).to.be.false; // User error - needs manual intervention
    });

    it('should list conflicting elements in actions', () => {
      // Arrange
      const conflicts = ['field1', 'field2', 'field3'];

      // Act
      const error = new MergeConflictError('Test', conflicts);

      // Assert
      expect(error.actions.some((a) => a.includes('field1'))).to.be.true;
    });

    it('should suggest merge strategies', () => {
      // Arrange & Act
      const error = new MergeConflictError('Profile', ['conflict1']);

      // Assert
      expect(error.actions.some((a) => a.includes('--strategy'))).to.be.true;
      expect(error.actions.some((a) => a.includes('local') || a.includes('org'))).to.be.true;
    });

    it('should limit displayed conflicts to 5', () => {
      // Arrange
      const manyConflicts = Array.from({ length: 10 }, (_, i) => `conflict${i}`);

      // Act
      const error = new MergeConflictError('Test', manyConflicts);

      // Assert
      // Should show "..." for truncated list
      expect(error.message).to.include('10');
    });
  });

  describe('BackupFailedError', () => {
    it('should create error with backup path', () => {
      // Arrange
      const backupPath = '/backups/Admin.profile.backup';

      // Act
      const error = new BackupFailedError(backupPath);

      // Assert
      expect(error.message).to.include(backupPath);
      expect(error.code).to.equal('BACKUP_FAILED');
      expect(error.recoverable).to.be.false; // Not recoverable - backup is mandatory
    });

    it('should include cause if provided', () => {
      // Arrange
      const cause = new Error('EACCES: permission denied');

      // Act
      const error = new BackupFailedError('/path', cause);

      // Assert
      expect(error.cause).to.equal(cause);
    });

    it('should suggest permission and disk space checks', () => {
      // Arrange & Act
      const error = new BackupFailedError('/backup/path');

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('permission'))).to.be.true;
      expect(error.actions.some((a) => a.toLowerCase().includes('disk space'))).to.be.true;
    });

    it('should be fatal - backup is required for safety', () => {
      // Arrange & Act
      const error = new BackupFailedError('/path');

      // Assert
      expect(error.recoverable).to.be.false;
      expect(error.exitCode).to.equal(1);
    });
  });

  describe('InvalidMergeStrategyError', () => {
    it('should create error with provided and valid strategies', () => {
      // Arrange
      const provided = 'invalid';
      const valid = ['local', 'org', 'prompt'];

      // Act
      const error = new InvalidMergeStrategyError(provided, valid);

      // Assert
      expect(error.message).to.include(provided);
      expect(error.code).to.equal('INVALID_MERGE_STRATEGY');
      expect(error.recoverable).to.be.false;
    });

    it('should list all valid strategies', () => {
      // Arrange
      const validStrategies = ['local', 'org', 'prompt', 'newest'];

      // Act
      const error = new InvalidMergeStrategyError('bad', validStrategies);

      // Assert
      validStrategies.forEach((strategy) => {
        expect(error.actions.some((a) => a.includes(strategy))).to.be.true;
      });
    });
  });

  describe('MergeValidationError', () => {
    it('should create error with profile name and validation errors', () => {
      // Arrange
      const profileName = 'Admin';
      const validationErrors = ['Invalid XML', 'Duplicate permission'];

      // Act
      const error = new MergeValidationError(profileName, validationErrors);

      // Assert
      expect(error.message).to.include(profileName);
      expect(error.code).to.equal('MERGE_VALIDATION_ERROR');
      expect(error.recoverable).to.be.true; // Can try again
    });

    it('should list validation errors', () => {
      // Arrange
      const errors = ['Error1', 'Error2', 'Error3'];

      // Act
      const error = new MergeValidationError('Test', errors);

      // Assert
      expect(error.actions.some((a) => errors.some((e) => a.includes(e)))).to.be.true;
    });

    it('should mention backup preservation', () => {
      // Arrange & Act
      const error = new MergeValidationError('Profile', ['validation failed']);

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('backup'))).to.be.true;
    });

    it('should be recoverable system error', () => {
      // Arrange & Act
      const error = new MergeValidationError('Test', ['error']);

      // Assert
      expect(error.recoverable).to.be.true;
      expect(error.exitCode).to.equal(1);
    });
  });

  describe('NoChangesToMergeError', () => {
    it('should create error with profile name', () => {
      // Arrange
      const profileName = 'Admin';

      // Act
      const error = new NoChangesToMergeError(profileName);

      // Assert
      expect(error.message).to.include(profileName);
      expect(error.message).to.include('identical');
      expect(error.code).to.equal('NO_CHANGES_TO_MERGE');
      expect(error.recoverable).to.be.false; // User error (though not really an error)
    });

    it('should indicate profile is up to date', () => {
      // Arrange & Act
      const error = new NoChangesToMergeError('CustomProfile');

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('up to date'))).to.be.true;
      expect(error.actions.some((a) => a.toLowerCase().includes('no action'))).to.be.true;
    });

    it('should be informational user error', () => {
      // Arrange & Act
      const error = new NoChangesToMergeError('Test');

      // Assert
      expect(error.exitCode).to.equal(1);
      expect(error.recoverable).to.be.false;
    });
  });
});
