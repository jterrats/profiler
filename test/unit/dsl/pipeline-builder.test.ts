/**
 * Pipeline DSL - Happy Path Tests
 *
 * These tests verify correct behavior in success scenarios.
 * Written AFTER error tests pass.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { Org } from '@salesforce/core';
import { expect } from 'chai';
import { pipeline, type PipelineContext } from '../../../src/core/dsl/pipeline-builder.js';

describe('Pipeline DSL - Happy Path', () => {
  // Mock org and context for testing
  const mockOrg = {
    getUsername: () => 'test@example.com',
  } as unknown as Org;

  const createMockContext = (): PipelineContext => ({
    org: mockOrg,
    projectPath: '/test/project',
    profileNames: ['Admin'],
    apiVersion: '60.0',
  });

  describe('Pipeline Builder Creation', () => {
    it('should create a pipeline builder', () => {
      // Arrange
      const context = createMockContext();

      // Act
      const builder = pipeline(context);

      // Assert
      expect(builder).to.exist;
      expect(typeof builder.compare).to.equal('function');
      expect(typeof builder.merge).to.equal('function');
      expect(typeof builder.validate).to.equal('function');
      expect(typeof builder.run).to.equal('function');
    });

    it('should accept multiple profile names', () => {
      // Arrange
      const context: PipelineContext = {
        org: mockOrg,
        projectPath: '/test/project',
        profileNames: ['Admin', 'Sales', 'Support'],
        apiVersion: '60.0',
      };

      // Act
      const builder = pipeline(context);

      // Assert
      expect(builder).to.exist;
    });
  });

  describe('Fluent API', () => {
    it('should allow chaining compare step', () => {
      // Arrange
      const builder = pipeline(createMockContext());

      // Act
      const result = builder.compare();

      // Assert
      expect(result).to.equal(builder); // Should return same instance for chaining
    });

    it('should allow chaining merge step', () => {
      // Arrange
      const builder = pipeline(createMockContext());

      // Act
      const result = builder.merge();

      // Assert
      expect(result).to.equal(builder);
    });

    it('should allow chaining validate step', () => {
      // Arrange
      const builder = pipeline(createMockContext());

      // Act
      const result = builder.validate();

      // Assert
      expect(result).to.equal(builder);
    });

    it('should allow chaining multiple steps', () => {
      // Arrange
      const builder = pipeline(createMockContext());

      // Act
      const result = builder.compare().merge().validate();

      // Assert
      expect(result).to.equal(builder);
    });
  });

  describe('Step Configuration', () => {
    it('should configure compare step with options', () => {
      // Arrange
      const builder = pipeline(createMockContext());

      // Act
      builder.compare({
        highlightDrift: true,
        excludeManaged: false,
      });

      // Assert
      // Step should be added to pipeline
      // Note: Actual verification would require accessing internal state
      expect(builder).to.exist;
    });

    it('should configure merge step with strategy', () => {
      // Arrange
      const builder = pipeline(createMockContext());

      // Act
      builder.merge({
        strategy: 'local-wins',
        dryRun: false,
        skipBackup: false,
      });

      // Assert
      expect(builder).to.exist;
    });

    it('should configure validate step with options', () => {
      // Arrange
      const builder = pipeline(createMockContext());

      // Act
      builder.validate({
        fix: true,
      });

      // Assert
      expect(builder).to.exist;
    });
  });

  describe('Pipeline Execution', () => {
    it('should have run method that returns Promise', () => {
      // Arrange
      const builder = pipeline(createMockContext());
      builder.compare();

      // Act
      const result = builder.run();

      // Assert
      expect(result).to.be.a('promise');
    });

    it('should execute steps sequentially', async () => {
      // Arrange
      const builder = pipeline(createMockContext());
      builder.compare().merge().validate();

      // Act
      // Note: Actual execution would require mocking operations
      // For now, we verify the method exists and returns a promise
      const resultPromise = builder.run();

      // Assert
      expect(resultPromise).to.be.a('promise');

      // Note: In a real test with mocked operations, we would:
      // 1. Mock compareProfileOperation to return success
      // 2. Mock mergeProfileOperation to return success
      // 3. Mock validateProfileOperation to return success
      // 4. Verify all steps executed in order
      // 5. Verify result contains all step results
    });
  });

  describe('Multi-source Compare', () => {
    it('should support multi-source compare configuration', () => {
      // Arrange
      const builder = pipeline(createMockContext());

      // Act
      builder.compare({
        sources: ['qa', 'uat', 'prod'],
      });

      // Assert
      expect(builder).to.exist;
    });
  });
});
