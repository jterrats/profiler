/**
 * Error Tests for Validate Operation
 * Following Error-Driven Development: These tests are written BEFORE implementation
 *
 * Tests cover all 3 possible errors in validate operation
 */

import { expect } from 'chai';
import {
  MissingMetadataReferenceError,
  DuplicateEntryError,
  InvalidPermissionError,
} from '../../src/core/errors/index.js';

describe('Validate Operation - Error Tests', () => {
  describe('MissingMetadataReferenceError', () => {
    it('should create error with profile name and missing references', () => {
      // Arrange
      const profileName = 'Admin';
      const missingRefs = [
        { type: 'objectPermissions', name: 'DeletedObject__c' },
        { type: 'fieldPermissions', name: 'Account.DeletedField__c' },
      ];

      // Act
      const error = new MissingMetadataReferenceError(profileName, missingRefs);

      // Assert
      expect(error.message).to.include(profileName);
      expect(error.message).to.include(missingRefs.length.toString());
      expect(error.code).to.equal('MISSING_METADATA_REFERENCE');
      expect(error.recoverable).to.be.true; // Can be cleaned up
    });

    it('should list missing references in actions', () => {
      // Arrange
      const refs = [{ type: 'objectPermissions', name: 'CustomObj__c' }];

      // Act
      const error = new MissingMetadataReferenceError('Test', refs);

      // Assert
      expect(error.actions.some((a) => a.includes('CustomObj__c'))).to.be.true;
      expect(error.actions.some((a) => a.includes('objectPermissions'))).to.be.true;
    });

    it('should suggest validate --fix', () => {
      // Arrange & Act
      const error = new MissingMetadataReferenceError('Profile', [{ type: 'field', name: 'test' }]);

      // Assert
      expect(error.actions.some((a) => a.includes('validate --fix'))).to.be.true;
    });

    it('should limit displayed references to 5', () => {
      // Arrange
      const manyRefs = Array.from({ length: 10 }, (_, i) => ({
        type: 'field',
        name: `field${i}`,
      }));

      // Act
      const error = new MissingMetadataReferenceError('Test', manyRefs);

      // Assert
      expect(error.message).to.include('10');
    });

    it('should be recoverable system error', () => {
      // Arrange & Act
      const error = new MissingMetadataReferenceError('Test', [{ type: 'object', name: 'test' }]);

      // Assert
      expect(error.recoverable).to.be.true;
      expect(error.exitCode).to.equal(1);
    });
  });

  describe('DuplicateEntryError', () => {
    it('should create error with profile name and duplicates', () => {
      // Arrange
      const profileName = 'CustomProfile';
      const duplicates = [
        { type: 'objectPermissions', name: 'Account' },
        { type: 'fieldPermissions', name: 'Contact.Email' },
      ];

      // Act
      const error = new DuplicateEntryError(profileName, duplicates);

      // Assert
      expect(error.message).to.include(profileName);
      expect(error.message).to.include(duplicates.length.toString());
      expect(error.code).to.equal('DUPLICATE_ENTRY');
      expect(error.recoverable).to.be.true;
    });

    it('should list duplicate entries', () => {
      // Arrange
      const dups = [{ type: 'tabVisibilities', name: 'Account' }];

      // Act
      const error = new DuplicateEntryError('Test', dups);

      // Assert
      expect(error.actions.some((a) => a.includes('Account'))).to.be.true;
      expect(error.actions.some((a) => a.includes('tabVisibilities'))).to.be.true;
    });

    it('should suggest validate --fix', () => {
      // Arrange & Act
      const error = new DuplicateEntryError('Profile', [{ type: 'permission', name: 'test' }]);

      // Assert
      expect(error.actions.some((a) => a.includes('validate --fix'))).to.be.true;
    });

    it('should warn about deployment errors', () => {
      // Arrange & Act
      const error = new DuplicateEntryError('Test', [{ type: 'field', name: 'duplicate' }]);

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('deployment'))).to.be.true;
    });

    it('should limit displayed duplicates to 5', () => {
      // Arrange
      const manyDups = Array.from({ length: 8 }, (_, i) => ({
        type: 'permission',
        name: `perm${i}`,
      }));

      // Act
      const error = new DuplicateEntryError('Test', manyDups);

      // Assert
      expect(error.message).to.include('8');
    });
  });

  describe('InvalidPermissionError', () => {
    it('should create error with profile name and invalid permissions', () => {
      // Arrange
      const profileName = 'Admin';
      const invalidPerms = [
        { object: 'Account', issue: 'Create without Read' },
        { object: 'Contact', issue: 'Edit without Read' },
      ];

      // Act
      const error = new InvalidPermissionError(profileName, invalidPerms);

      // Assert
      expect(error.message).to.include(profileName);
      expect(error.message).to.include(invalidPerms.length.toString());
      expect(error.code).to.equal('INVALID_PERMISSION');
      expect(error.recoverable).to.be.true;
    });

    it('should list invalid permissions with issues', () => {
      // Arrange
      const perms = [{ object: 'CustomObject__c', issue: 'Delete without Edit' }];

      // Act
      const error = new InvalidPermissionError('Test', perms);

      // Assert
      expect(error.actions.some((a) => a.includes('CustomObject__c'))).to.be.true;
      expect(error.actions.some((a) => a.includes('Delete without Edit'))).to.be.true;
    });

    it('should mention common issues', () => {
      // Arrange & Act
      const error = new InvalidPermissionError('Profile', [{ object: 'Test', issue: 'Invalid combo' }]);

      // Assert
      expect(
        error.actions.some(
          (a) =>
            a.toLowerCase().includes('create') || a.toLowerCase().includes('edit') || a.toLowerCase().includes('delete')
        )
      ).to.be.true;
      expect(error.actions.some((a) => a.toLowerCase().includes('read'))).to.be.true;
    });

    it('should suggest validate --fix', () => {
      // Arrange & Act
      const error = new InvalidPermissionError('Test', [{ object: 'Obj', issue: 'issue' }]);

      // Assert
      expect(error.actions.some((a) => a.includes('validate --fix'))).to.be.true;
    });

    it('should limit displayed permissions to 5', () => {
      // Arrange
      const manyPerms = Array.from({ length: 12 }, (_, i) => ({
        object: `Object${i}`,
        issue: `Issue${i}`,
      }));

      // Act
      const error = new InvalidPermissionError('Test', manyPerms);

      // Assert
      expect(error.message).to.include('12');
    });

    it('should be recoverable system error', () => {
      // Arrange & Act
      const error = new InvalidPermissionError('Test', [{ object: 'obj', issue: 'test' }]);

      // Assert
      expect(error.recoverable).to.be.true;
      expect(error.exitCode).to.equal(1);
    });
  });
});
