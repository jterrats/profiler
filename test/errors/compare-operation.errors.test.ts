/**
 * Error Tests for Compare Operation
 * Following Error-Driven Development: These tests are written BEFORE implementation
 *
 * Tests cover all 4 possible errors in compare operation
 */

import { expect } from 'chai';
import {
  NoLocalProfileError,
  NoOrgProfileError,
  InvalidXmlError,
  ComparisonTimeoutError,
} from '../../src/core/errors/index.js';

describe('Compare Operation - Error Tests', () => {
  describe('NoLocalProfileError', () => {
    it('should create error with profile name and path', () => {
      // Arrange
      const profileName = 'Admin';
      const expectedPath = '/force-app/main/default/profiles/Admin.profile-meta.xml';

      // Act
      const error = new NoLocalProfileError(profileName, expectedPath);

      // Assert
      expect(error.message).to.include(profileName);
      expect(error.message).to.include(expectedPath);
      expect(error.code).to.equal('NO_LOCAL_PROFILE');
      expect(error.exitCode).to.equal(1);
      expect(error.recoverable).to.be.false;
    });

    it('should suggest retrieving profile first', () => {
      // Arrange & Act
      const error = new NoLocalProfileError('Admin', '/some/path');

      // Assert
      expect(error.actions.some((a) => a.includes('retrieve'))).to.be.true;
      expect(error.actions.some((a) => a.includes('profiler retrieve'))).to.be.true;
    });
  });

  describe('NoOrgProfileError', () => {
    it('should create error with profile name and org', () => {
      // Arrange
      const profileName = 'CustomProfile';
      const orgAlias = 'production';

      // Act
      const error = new NoOrgProfileError(profileName, orgAlias);

      // Assert
      expect(error.message).to.include(profileName);
      expect(error.message).to.include(orgAlias);
      expect(error.code).to.equal('NO_ORG_PROFILE');
      expect(error.recoverable).to.be.false;
    });

    it('should suggest verifying profile exists', () => {
      // Arrange & Act
      const error = new NoOrgProfileError('Test', 'myOrg');

      // Assert
      expect(error.actions.some((a) => a.includes('query'))).to.be.true;
      expect(error.actions.some((a) => a.includes('Profile'))).to.be.true;
    });

    it('should suggest profile may have been deleted', () => {
      // Arrange & Act
      const error = new NoOrgProfileError('Deleted', 'org');

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('deleted') || a.toLowerCase().includes('renamed'))).to
        .be.true;
    });
  });

  describe('InvalidXmlError', () => {
    it('should create error with file path and parse error', () => {
      // Arrange
      const filePath = '/profiles/Admin.profile-meta.xml';
      const parseError = 'Unexpected closing tag at line 42';

      // Act
      const error = new InvalidXmlError(filePath, parseError);

      // Assert
      expect(error.message).to.include(filePath);
      expect(error.message).to.include(parseError);
      expect(error.code).to.equal('INVALID_XML');
      expect(error.recoverable).to.be.false;
    });

    it('should suggest XML validation', () => {
      // Arrange & Act
      const error = new InvalidXmlError('/some/file.xml', 'Parse error');

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('xml'))).to.be.true;
      expect(error.actions.some((a) => a.toLowerCase().includes('validate') || a.toLowerCase().includes('validator')))
        .to.be.true;
    });

    it('should suggest re-retrieving', () => {
      // Arrange & Act
      const error = new InvalidXmlError('/corrupt.xml', 'Corrupted');

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('retrieve'))).to.be.true;
    });
  });

  describe('ComparisonTimeoutError', () => {
    it('should create error with profile count and timeout', () => {
      // Arrange
      const profileCount = 50;
      const timeoutMs = 120000;

      // Act
      const error = new ComparisonTimeoutError(profileCount, timeoutMs);

      // Assert
      expect(error.message).to.include(profileCount.toString());
      expect(error.message).to.include(timeoutMs.toString());
      expect(error.code).to.equal('COMPARISON_TIMEOUT');
      expect(error.recoverable).to.be.true;
    });

    it('should suggest reducing profile count', () => {
      // Arrange & Act
      const error = new ComparisonTimeoutError(100, 60000);

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('reduce'))).to.be.true;
      expect(error.actions.some((a) => a.toLowerCase().includes('one at a time'))).to.be.true;
    });

    it('should be recoverable system error', () => {
      // Arrange & Act
      const error = new ComparisonTimeoutError(10, 30000);

      // Assert
      expect(error.recoverable).to.be.true;
      expect(error.exitCode).to.equal(1); // System error
    });
  });
});
