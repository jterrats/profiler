/*
 * Copyright (c) 2024, Jorge Terrats
 * All rights reserved.
 * Licensed under the MIT License.
 * For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Integration Tests - Monadic Operations
 *
 * Tests the integration and composition of monadic operations:
 * - retrieve
 * - compare
 * - merge
 * - validate
 * - pipeline DSL
 *
 * These tests validate the functional pipeline approach.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { expect } from 'chai';

import type { Org } from '@salesforce/core';
import { ProfilerMonad } from '../../src/core/monad/profiler-monad.js';
import {
  validateProfileOperation,
  readProfileXml,
  detectDuplicates,
  detectInvalidPermissions,
} from '../../src/operations/validate-operation.js';
import { validateMergeStrategy, type MergeStrategy } from '../../src/operations/merge-operation.js';
import { pipeline, type PipelineContext } from '../../src/core/dsl/pipeline-builder.js';

describe('Operations Integration Tests', () => {
  let testProjectPath: string;

  beforeEach(async () => {
    // Create temporary test project structure
    testProjectPath = path.join(os.tmpdir(), `profiler-integration-test-${Date.now()}`);
    const profilesPath = path.join(testProjectPath, 'force-app', 'main', 'default', 'profiles');
    await fs.mkdir(profilesPath, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup temporary directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Validate Operation', () => {
    it('should validate a valid profile successfully', async () => {
      // Create a valid profile
      const profileContent = `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <userLicense>Salesforce</userLicense>
    <fieldPermissions>
        <field>Account.Name</field>
        <readable>true</readable>
        <editable>true</editable>
    </fieldPermissions>
    <objectPermissions>
        <object>Account</object>
        <allowRead>true</allowRead>
        <allowCreate>true</allowCreate>
        <allowEdit>true</allowEdit>
        <allowDelete>false</allowDelete>
    </objectPermissions>
</Profile>`;

      const profilePath = path.join(
        testProjectPath,
        'force-app',
        'main',
        'default',
        'profiles',
        'TestProfile.profile-meta.xml'
      );
      await fs.writeFile(profilePath, profileContent);

      // Validate using monadic operation
      const result = await validateProfileOperation({
        profileName: 'TestProfile',
        projectPath: testProjectPath,
      }).run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.valid).to.be.true;
        expect(result.value.issues).to.have.lengthOf(0);
      }
    });

    it('should detect invalid permission combinations', async () => {
      // Create profile with invalid permissions (editable without readable)
      const profileContent = `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <userLicense>Salesforce</userLicense>
    <fieldPermissions>
        <field>Account.Name</field>
        <readable>false</readable>
        <editable>true</editable>
    </fieldPermissions>
</Profile>`;

      const profilePath = path.join(
        testProjectPath,
        'force-app',
        'main',
        'default',
        'profiles',
        'InvalidProfile.profile-meta.xml'
      );
      await fs.writeFile(profilePath, profileContent);

      // Validate
      const result = await validateProfileOperation({
        profileName: 'InvalidProfile',
        projectPath: testProjectPath,
      }).run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.valid).to.be.false;
        expect(result.value.issues.length).to.be.greaterThan(0);
        expect(result.value.issues[0].type).to.equal('invalid-permission');
        expect(result.value.fixable).to.be.true;
      }
    });

    it('should handle missing profile file gracefully', async () => {
      // Try to validate non-existent profile
      const result = await validateProfileOperation({
        profileName: 'NonExistent',
        projectPath: testProjectPath,
      }).run();

      // Assert - should succeed with error as issue
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.valid).to.be.false;
        expect(result.value.issues).to.have.lengthOf(1);
        expect(result.value.issues[0].type).to.equal('xml-error');
      }
    });
  });

  describe('Monadic Composition', () => {
    it('should compose validate operations using chain', async () => {
      // Create a profile
      const profileContent = `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <userLicense>Salesforce</userLicense>
    <fieldPermissions>
        <field>Account.Name</field>
        <readable>true</readable>
        <editable>true</editable>
    </fieldPermissions>
</Profile>`;

      const profilePath = path.join(
        testProjectPath,
        'force-app',
        'main',
        'default',
        'profiles',
        'ChainTest.profile-meta.xml'
      );
      await fs.writeFile(profilePath, profileContent);

      // Compose operations: read -> detect duplicates -> detect invalid permissions
      const result = await readProfileXml('ChainTest', testProjectPath)
        .chain((profileData) =>
          detectDuplicates('ChainTest', profileData).chain((duplicates) =>
            detectInvalidPermissions('ChainTest', profileData).map((invalidPerms) => ({
              duplicates,
              invalidPerms,
            }))
          )
        )
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.duplicates).to.be.an('array');
        expect(result.value.invalidPerms).to.be.an('array');
      }
    });

    it('should execute multiple validations in parallel using ProfilerMonad.all', async () => {
      // Create a profile
      const profileContent = `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <userLicense>Salesforce</userLicense>
</Profile>`;

      const profilePath = path.join(
        testProjectPath,
        'force-app',
        'main',
        'default',
        'profiles',
        'ParallelTest.profile-meta.xml'
      );
      await fs.writeFile(profilePath, profileContent);

      // Execute validations in parallel
      const result = await readProfileXml('ParallelTest', testProjectPath)
        .chain((profileData) =>
          ProfilerMonad.all([
            detectDuplicates('ParallelTest', profileData),
            detectInvalidPermissions('ParallelTest', profileData),
          ])
        )
        .run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        const [duplicates, invalidPerms] = result.value;
        expect(duplicates).to.be.an('array');
        expect(invalidPerms).to.be.an('array');
      }
    });
  });

  describe('Merge Strategy Validation', () => {
    it('should validate all supported merge strategies', async () => {
      const strategies: MergeStrategy[] = [
        'local',
        'org',
        'union',
        'local-wins',
        'org-wins',
        'interactive',
        'abort-on-conflict',
      ];

      for (const strategy of strategies) {
        // eslint-disable-next-line no-await-in-loop
        const result = await validateMergeStrategy(strategy).run();
        expect(result.isSuccess()).to.be.true;
        if (result.isSuccess()) {
          expect(result.value).to.equal(strategy);
        }
      }
    });

    it('should reject invalid merge strategy', async () => {
      const result = await validateMergeStrategy('invalid' as MergeStrategy).run();
      expect(result.isFailure()).to.be.true;
      if (result.isFailure()) {
        expect(result.error.message).to.include('invalid');
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from validation errors with default value', async () => {
      // Try to validate non-existent profile with recovery
      const result = await validateProfileOperation({
        profileName: 'NonExistent',
        projectPath: testProjectPath,
      })
        .recover(() => ({
          profileName: 'NonExistent',
          valid: false,
          issues: [
            {
              type: 'xml-error' as const,
              severity: 'error' as const,
              element: 'Profile',
              message: 'Recovered from error',
              suggestion: 'Create the profile',
            },
          ],
          fixable: false,
        }))
        .run();

      // Assert - should succeed with recovered value
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.valid).to.be.false;
        expect(result.value.issues[0].message).to.include('ENOENT');
      }
    });

    it('should stop pipeline on first error', async () => {
      let secondOperationExecuted = false;

      // Create a pipeline that should fail on first operation
      const result = await readProfileXml('NonExistent', testProjectPath)
        .chain((profileData) => {
          secondOperationExecuted = true;
          return detectDuplicates('NonExistent', profileData);
        })
        .run();

      // Assert - second operation should not execute
      expect(result.isFailure()).to.be.true;
      expect(secondOperationExecuted).to.be.false;
    });
  });

  describe('Lazy Evaluation', () => {
    it('should not execute operations until run() is called', async () => {
      let operationExecuted = false;

      // Create a monad but don't call run()
      const monad = new ProfilerMonad(async () => {
        operationExecuted = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { isSuccess: () => true, value: 'test' } as any;
      });

      // Assert - operation not executed yet
      expect(operationExecuted).to.be.false;

      // Now call run()
      await monad.run();

      // Assert - operation executed
      expect(operationExecuted).to.be.true;
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety through monadic chain', async () => {
      // Create a profile
      const profileContent = `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <userLicense>Salesforce</userLicense>
</Profile>`;

      const profilePath = path.join(
        testProjectPath,
        'force-app',
        'main',
        'default',
        'profiles',
        'TypeTest.profile-meta.xml'
      );
      await fs.writeFile(profilePath, profileContent);

      // Chain operations with different types
      const result = await readProfileXml('TypeTest', testProjectPath)
        .map((profileData) => Object.keys(profileData).length) // Record<string, unknown> -> number
        .map((keyCount) => `Profile has ${keyCount} keys`) // number -> string
        .run();

      // Assert - types should be maintained
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value).to.be.a('string');
        expect(result.value).to.include('Profile has');
      }
    });
  });

  describe('Incremental Retrieve Error Handling', () => {
    it('should throw LocalMetadataReadError when local files cannot be read', async () => {
      // Test will be implemented with actual retrieve logic
      // For now, validate error can be instantiated correctly
      const { LocalMetadataReadError } = await import('../../src/core/errors/operation-errors.js');

      const error = new LocalMetadataReadError('/invalid/path');

      expect(error.name).to.equal('LocalMetadataReadError');
      expect(error.code).to.equal('LOCAL_METADATA_READ_ERROR');
      expect(error.message).to.include('Failed to read local metadata');
      expect(error.recoverable).to.be.true; // Should fallback to full retrieve
    });

    it('should throw MetadataComparisonError when comparison fails', async () => {
      const { MetadataComparisonError } = await import('../../src/core/errors/operation-errors.js');

      const error = new MetadataComparisonError('Cannot diff metadata lists');

      expect(error.name).to.equal('MetadataComparisonError');
      expect(error.code).to.equal('METADATA_COMPARISON_ERROR');
      expect(error.message).to.include('Metadata comparison failed');
      expect(error.recoverable).to.be.true; // Should fallback to full retrieve
    });

    it('should throw IncrementalRetrieveError when incremental logic fails', async () => {
      const { IncrementalRetrieveError } = await import('../../src/core/errors/operation-errors.js');

      const error = new IncrementalRetrieveError('Diff algorithm failed');

      expect(error.name).to.equal('IncrementalRetrieveError');
      expect(error.code).to.equal('INCREMENTAL_RETRIEVE_ERROR');
      expect(error.message).to.include('Incremental retrieve failed');
      expect(error.recoverable).to.be.true; // Should fallback to full retrieve
    });

    it('should preserve error cause chain', async () => {
      const { LocalMetadataReadError } = await import('../../src/core/errors/operation-errors.js');

      const originalError = new Error('ENOENT: no such file or directory');
      const wrappedError = new LocalMetadataReadError('/missing/path', originalError);

      expect(wrappedError.cause).to.equal(originalError);
      expect(wrappedError.message).to.include('Failed to read local metadata');
    });

    it('should provide actionable recovery actions', async () => {
      const { LocalMetadataReadError } = await import('../../src/core/errors/operation-errors.js');
      const { MetadataComparisonError } = await import('../../src/core/errors/operation-errors.js');
      const { IncrementalRetrieveError } = await import('../../src/core/errors/operation-errors.js');

      const localError = new LocalMetadataReadError('/path');
      const comparisonError = new MetadataComparisonError('diff failed');
      const incrementalError = new IncrementalRetrieveError('strategy failed');

      // All should suggest fallback to full retrieve
      expect(localError.actions).to.include('Will fallback to full retrieve for safety');
      expect(comparisonError.actions).to.include('Will fallback to full retrieve for safety');
      expect(incrementalError.actions).to.include('Falling back to full retrieve for safety');
    });
  });

  describe('Incremental Retrieve Happy Path', () => {
    it('should read local metadata successfully', async () => {
      const { readLocalMetadata } = await import('../../src/operations/retrieve-operation.js');

      // Create test profile in local project
      const profileContent = `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <userLicense>Salesforce</userLicense>
</Profile>`;

      const profilePath = path.join(
        testProjectPath,
        'force-app',
        'main',
        'default',
        'profiles',
        'TestProfile.profile-meta.xml'
      );
      await fs.writeFile(profilePath, profileContent);

      // Read local metadata
      const result = await readLocalMetadata(testProjectPath, ['Profile']).run();

      // Assert
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.metadataTypes).to.have.lengthOf(1);
        expect(result.value.metadataTypes[0].type).to.equal('Profile');
        expect(result.value.metadataTypes[0].members).to.include('TestProfile');
        expect(result.value.totalMembers).to.equal(1);
      }
    });

    it('should return empty result when no local metadata exists', async () => {
      const { readLocalMetadata } = await import('../../src/operations/retrieve-operation.js');

      // Read local metadata from empty project
      const result = await readLocalMetadata(testProjectPath, ['Profile']).run();

      // Assert - success with empty result (not an error)
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.metadataTypes).to.have.lengthOf(0);
        expect(result.value.totalMembers).to.equal(0);
      }
    });

    it('should compare metadata and find new items', async () => {
      const { compareMetadataLists } = await import('../../src/operations/retrieve-operation.js');

      const local = {
        metadataTypes: [{ type: 'Profile', members: ['Admin'] }],
        totalMembers: 1,
      };

      const org = {
        metadataTypes: [{ type: 'Profile', members: ['Admin', 'Sales', 'Custom'] }],
        totalMembers: 3,
      };

      // Compare
      const result = await compareMetadataLists(local, org).run();

      // Assert - should return only new items
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.metadataTypes).to.have.lengthOf(1);
        expect(result.value.metadataTypes[0].type).to.equal('Profile');
        expect(result.value.metadataTypes[0].members).to.have.lengthOf(2); // Sales + Custom
        expect(result.value.metadataTypes[0].members).to.include('Sales');
        expect(result.value.metadataTypes[0].members).to.include('Custom');
        expect(result.value.metadataTypes[0].members).to.not.include('Admin'); // Already exists locally
        expect(result.value.totalMembers).to.equal(2);
      }
    });

    it('should return empty result when no changes detected', async () => {
      const { compareMetadataLists } = await import('../../src/operations/retrieve-operation.js');

      const local = {
        metadataTypes: [{ type: 'Profile', members: ['Admin', 'Sales'] }],
        totalMembers: 2,
      };

      const org = {
        metadataTypes: [{ type: 'Profile', members: ['Admin', 'Sales'] }],
        totalMembers: 2,
      };

      // Compare
      const result = await compareMetadataLists(local, org).run();

      // Assert - no changes
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.metadataTypes).to.have.lengthOf(0);
        expect(result.value.totalMembers).to.equal(0);
      }
    });

    it('should handle new metadata types not in local', async () => {
      const { compareMetadataLists } = await import('../../src/operations/retrieve-operation.js');

      const local = {
        metadataTypes: [{ type: 'Profile', members: ['Admin'] }],
        totalMembers: 1,
      };

      const org = {
        metadataTypes: [
          { type: 'Profile', members: ['Admin'] },
          { type: 'ApexClass', members: ['NewClass1', 'NewClass2'] },
        ],
        totalMembers: 3,
      };

      // Compare
      const result = await compareMetadataLists(local, org).run();

      // Assert - should return ALL items for new type
      expect(result.isSuccess()).to.be.true;
      if (result.isSuccess()) {
        expect(result.value.metadataTypes).to.have.lengthOf(1); // Only ApexClass (Profile has no changes)
        expect(result.value.metadataTypes[0].type).to.equal('ApexClass');
        expect(result.value.metadataTypes[0].members).to.have.lengthOf(2);
        expect(result.value.totalMembers).to.equal(2);
      }
    });
  });

  describe('Pipeline DSL Integration', () => {
    it('should create pipeline builder with context', () => {
      // Arrange
      const mockOrg = {
        getUsername: () => 'test@example.com',
      } as unknown as Org;

      const context: PipelineContext = {
        org: mockOrg,
        projectPath: testProjectPath,
        profileNames: ['Admin'],
        apiVersion: '60.0',
      };

      // Act
      const builder = pipeline(context);

      // Assert
      expect(builder).to.exist;
      expect(typeof builder.compare).to.equal('function');
      expect(typeof builder.merge).to.equal('function');
      expect(typeof builder.validate).to.equal('function');
      expect(typeof builder.run).to.equal('function');
    });

    it('should allow chaining operations', () => {
      // Arrange
      const mockOrg = {
        getUsername: () => 'test@example.com',
      } as unknown as Org;

      const context: PipelineContext = {
        org: mockOrg,
        projectPath: testProjectPath,
        profileNames: ['Admin'],
        apiVersion: '60.0',
      };

      // Act
      const builder = pipeline(context);
      const chained = builder.compare().merge().validate();

      // Assert
      expect(chained).to.equal(builder); // Should return same instance
    });

    it('should have run method that returns Promise', () => {
      // Arrange
      const mockOrg = {
        getUsername: () => 'test@example.com',
      } as unknown as Org;

      const context: PipelineContext = {
        org: mockOrg,
        projectPath: testProjectPath,
        profileNames: ['Admin'],
        apiVersion: '60.0',
      };

      // Act
      const builder = pipeline(context);
      builder.compare();
      const result = builder.run();

      // Assert
      expect(result).to.be.a('promise');
    });
  });
});
