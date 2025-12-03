/**
 * Error Tests for Retrieve Operation
 * Following Error-Driven Development: These tests are written BEFORE implementation
 *
 * Tests cover all 8 possible errors in retrieve operation
 */

import { expect } from 'chai';
import {
  ProfileNotFoundError,
  OrgNotAuthenticatedError,
  MetadataApiError,
  RetrieveTimeoutError,
  InsufficientPermissionsError,
  InvalidProjectError,
  DiskSpaceError,
  ManagedPackageError,
} from '../../src/core/errors/index.js';

describe('Retrieve Operation - Error Tests', () => {
  describe('ProfileNotFoundError', () => {
    it('should create error with profile name', () => {
      // Arrange
      const profileName = 'NonExistentProfile';

      // Act
      const error = new ProfileNotFoundError(profileName);

      // Assert
      expect(error.message).to.include(profileName);
      expect(error.code).to.equal('PROFILE_NOT_FOUND');
      expect(error.exitCode).to.equal(1);
      expect(error.recoverable).to.be.false;
      expect(error.actions).to.have.length.greaterThan(0);
    });

    it('should suggest verification actions', () => {
      // Arrange & Act
      const error = new ProfileNotFoundError('TestProfile');

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('verify'))).to.be.true;
      expect(error.actions.some((a) => a.toLowerCase().includes('query'))).to.be.true;
    });
  });

  describe('OrgNotAuthenticatedError', () => {
    it('should create error with org alias', () => {
      // Arrange
      const orgAlias = 'myOrg';

      // Act
      const error = new OrgNotAuthenticatedError(orgAlias);

      // Assert
      expect(error.message).to.include(orgAlias);
      expect(error.code).to.equal('ORG_NOT_AUTHENTICATED');
      expect(error.exitCode).to.equal(1);
      expect(error.recoverable).to.be.false;
    });

    it('should suggest login command', () => {
      // Arrange & Act
      const error = new OrgNotAuthenticatedError('myOrg');

      // Assert
      expect(error.actions.some((a) => a.includes('org login'))).to.be.true;
    });
  });

  describe('MetadataApiError', () => {
    it('should create error with API message', () => {
      // Arrange
      const apiMessage = 'INVALID_SESSION_ID: Session expired or invalid';

      // Act
      const error = new MetadataApiError(apiMessage);

      // Assert
      expect(error.message).to.include(apiMessage);
      expect(error.code).to.equal('METADATA_API_ERROR');
      expect(error.exitCode).to.equal(1);
      expect(error.recoverable).to.be.true; // System error, recoverable
    });

    it('should include cause if provided', () => {
      // Arrange
      const cause = new Error('Network timeout');
      const error = new MetadataApiError('API failed', cause);

      // Assert
      expect(error.cause).to.equal(cause);
    });

    it('should suggest retry and status check', () => {
      // Arrange & Act
      const error = new MetadataApiError('Connection failed');

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('retry') || a.toLowerCase().includes('again'))).to.be
        .true;
      expect(error.actions.some((a) => a.includes('status.salesforce.com'))).to.be.true;
    });
  });

  describe('RetrieveTimeoutError', () => {
    it('should create error with timeout value', () => {
      // Arrange
      const timeoutMs = 60000;

      // Act
      const error = new RetrieveTimeoutError(timeoutMs);

      // Assert
      expect(error.message).to.include(timeoutMs.toString());
      expect(error.code).to.equal('RETRIEVE_TIMEOUT');
      expect(error.recoverable).to.be.true;
    });

    it('should suggest increasing timeout', () => {
      // Arrange & Act
      const error = new RetrieveTimeoutError(30000);

      // Assert
      expect(error.actions.some((a) => a.includes('--timeout'))).to.be.true;
    });
  });

  describe('InsufficientPermissionsError', () => {
    it('should create error with permission name', () => {
      // Arrange
      const permission = 'View All Profiles';

      // Act
      const error = new InsufficientPermissionsError(permission);

      // Assert
      expect(error.message).to.include(permission);
      expect(error.code).to.equal('INSUFFICIENT_PERMISSIONS');
      expect(error.recoverable).to.be.false;
    });

    it('should suggest contacting admin', () => {
      // Arrange & Act
      const error = new InsufficientPermissionsError('API Enabled');

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('administrator'))).to.be.true;
    });
  });

  describe('InvalidProjectError', () => {
    it('should create error with missing item', () => {
      // Arrange
      const missingItem = 'sfdx-project.json';

      // Act
      const error = new InvalidProjectError(missingItem);

      // Assert
      expect(error.message).to.include(missingItem);
      expect(error.code).to.equal('INVALID_PROJECT');
      expect(error.recoverable).to.be.false;
    });

    it('should suggest project creation', () => {
      // Arrange & Act
      const error = new InvalidProjectError('force-app directory');

      // Assert
      expect(error.actions.some((a) => a.includes('project generate'))).to.be.true;
    });
  });

  describe('DiskSpaceError', () => {
    it('should create error with space requirements', () => {
      // Arrange
      const required = 100 * 1024 * 1024; // 100MB
      const available = 50 * 1024 * 1024; // 50MB

      // Act
      const error = new DiskSpaceError(required, available);

      // Assert
      expect(error.message).to.include('100');
      expect(error.message).to.include('50');
      expect(error.code).to.equal('DISK_SPACE_ERROR');
      expect(error.recoverable).to.be.true;
    });

    it('should convert bytes to MB in message', () => {
      // Arrange
      const required = 1024 * 1024 * 2; // 2MB
      const available = 1024 * 1024; // 1MB

      // Act
      const error = new DiskSpaceError(required, available);

      // Assert
      expect(error.message).to.include('MB');
      expect(error.message).not.to.include('bytes');
    });
  });

  describe('ManagedPackageError', () => {
    it('should create error with package namespace', () => {
      // Arrange
      const namespace = 'salesforce';

      // Act
      const error = new ManagedPackageError(namespace);

      // Assert
      expect(error.message).to.include(namespace);
      expect(error.code).to.equal('MANAGED_PACKAGE_ERROR');
      expect(error.recoverable).to.be.false;
    });

    it('should suggest exclude-managed flag', () => {
      // Arrange & Act
      const error = new ManagedPackageError('myPackage');

      // Assert
      expect(error.actions.some((a) => a.includes('--exclude-managed'))).to.be.true;
    });
  });
});
