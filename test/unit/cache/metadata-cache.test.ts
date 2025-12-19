/**
 * Happy Path Tests for Filesystem Metadata Cache
 * Following Error-Driven Development: These tests verify correct behavior in success scenarios.
 * Written AFTER error tests pass.
 */

/* eslint-disable @typescript-eslint/unbound-method */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { expect } from 'chai';

import { FilesystemMetadataCache, getFilesystemMetadataCache } from '../../../src/core/cache/metadata-cache.js';

describe('Filesystem Metadata Cache - Happy Path Tests', () => {
  let testCacheDir: string;
  let cache: FilesystemMetadataCache;

  beforeEach(async () => {
    // Create isolated test cache directory
    testCacheDir = path.join(os.tmpdir(), `profiler-cache-test-${Date.now()}`);
    cache = getFilesystemMetadataCache(testCacheDir);
    await cache.clearAll();
  });

  afterEach(async () => {
    // Cleanup test cache directory
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Cache Hit (Scenario 1)', () => {
    it('should return cached data when cache exists and is valid', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const metadataType = 'Profile';
      const apiVersion = '60.0';
      const testData = ['Admin', 'Standard User', 'Custom Profile'];

      // Act - Set cache
      await cache.set(orgId, metadataType, apiVersion, testData);

      // Act - Get cache
      const result = await cache.get<string[]>(orgId, metadataType, apiVersion);

      // Assert
      expect(result).to.not.be.null;
      expect(result).to.deep.equal(testData);
    });

    it('should use memory cache for faster subsequent access', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const metadataType = 'Profile';
      const apiVersion = '60.0';
      const testData = ['Admin', 'Standard User'];

      // Act - Set and get multiple times
      await cache.set(orgId, metadataType, apiVersion, testData);
      const result1 = await cache.get<string[]>(orgId, metadataType, apiVersion);
      const result2 = await cache.get<string[]>(orgId, metadataType, apiVersion);

      // Assert - Both should return same data (memory cache on second call)
      expect(result1).to.deep.equal(testData);
      expect(result2).to.deep.equal(testData);
    });
  });

  describe('Cache Miss (Scenario 2)', () => {
    it('should return null when cache does not exist', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const metadataType = 'Profile';
      const apiVersion = '60.0';

      // Act
      const result = await cache.get<string[]>(orgId, metadataType, apiVersion);

      // Assert
      expect(result).to.be.null;
    });

    it('should store data in cache after API call', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const metadataType = 'ApexClass';
      const apiVersion = '60.0';
      const testData = ['MyClass', 'AnotherClass'];

      // Act - Set cache (simulating API call result)
      await cache.set(orgId, metadataType, apiVersion, testData);

      // Act - Get cache
      const result = await cache.get<string[]>(orgId, metadataType, apiVersion);

      // Assert
      expect(result).to.deep.equal(testData);
    });
  });

  describe('Cache Expired (Scenario 7)', () => {
    it('should return null when cache is expired', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const metadataType = 'Profile';
      const apiVersion = '60.0';
      const testData = ['Admin'];
      const shortTtl = 100; // 100ms

      // Act - Set cache with short TTL
      await cache.set(orgId, metadataType, apiVersion, testData, shortTtl);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Act - Try to get expired cache
      const result = await cache.get<string[]>(orgId, metadataType, apiVersion);

      // Assert
      expect(result).to.be.null;
    });

    it('should return data when cache is not expired', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const metadataType = 'Profile';
      const apiVersion = '60.0';
      const testData = ['Admin'];
      const longTtl = 10_000; // 10 seconds

      // Act - Set cache with long TTL
      await cache.set(orgId, metadataType, apiVersion, testData, longTtl);

      // Act - Get cache immediately
      const result = await cache.get<string[]>(orgId, metadataType, apiVersion);

      // Assert
      expect(result).to.deep.equal(testData);
    });
  });

  describe('Multiple Orgs (Scenario 8)', () => {
    it('should maintain separate cache for different orgs', async () => {
      // Arrange
      const orgId1 = '00D1111111111111';
      const orgId2 = '00D2222222222222';
      const metadataType = 'Profile';
      const apiVersion = '60.0';
      const data1 = ['Org1Profile'];
      const data2 = ['Org2Profile'];

      // Act
      await cache.set(orgId1, metadataType, apiVersion, data1);
      await cache.set(orgId2, metadataType, apiVersion, data2);

      const result1 = await cache.get<string[]>(orgId1, metadataType, apiVersion);
      const result2 = await cache.get<string[]>(orgId2, metadataType, apiVersion);

      // Assert
      expect(result1).to.deep.equal(data1);
      expect(result2).to.deep.equal(data2);
      expect(result1).to.not.deep.equal(result2);
    });

    it('should clear cache for specific org only', async () => {
      // Arrange
      const orgId1 = '00D1111111111111';
      const orgId2 = '00D2222222222222';
      const metadataType = 'Profile';
      const apiVersion = '60.0';

      await cache.set(orgId1, metadataType, apiVersion, ['Org1Profile']);
      await cache.set(orgId2, metadataType, apiVersion, ['Org2Profile']);

      // Act
      await cache.clearOrg(orgId1);

      const result1 = await cache.get<string[]>(orgId1, metadataType, apiVersion);
      const result2 = await cache.get<string[]>(orgId2, metadataType, apiVersion);

      // Assert
      expect(result1).to.be.null; // Cleared
      expect(result2).to.not.equal(null); // Still cached
    });
  });

  describe('Multiple Metadata Types (Scenario 9)', () => {
    it('should maintain separate cache for different metadata types', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const apiVersion = '60.0';
      const profileData = ['Admin', 'Standard User'];
      const apexClassData = ['MyClass', 'AnotherClass'];

      // Act
      await cache.set(orgId, 'Profile', apiVersion, profileData);
      await cache.set(orgId, 'ApexClass', apiVersion, apexClassData);

      const profileResult = await cache.get<string[]>(orgId, 'Profile', apiVersion);
      const apexClassResult = await cache.get<string[]>(orgId, 'ApexClass', apiVersion);

      // Assert
      expect(profileResult).to.deep.equal(profileData);
      expect(apexClassResult).to.deep.equal(apexClassData);
    });
  });

  describe('API Version Changes (Scenario 10)', () => {
    it('should maintain separate cache for different API versions', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const metadataType = 'Profile';
      const data60 = ['Profile60'];
      const data61 = ['Profile61'];

      // Act
      await cache.set(orgId, metadataType, '60.0', data60);
      await cache.set(orgId, metadataType, '61.0', data61);

      const result60 = await cache.get<string[]>(orgId, metadataType, '60.0');
      const result61 = await cache.get<string[]>(orgId, metadataType, '61.0');

      // Assert
      expect(result60).to.deep.equal(data60);
      expect(result61).to.deep.equal(data61);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const metadataType = 'Profile';
      const apiVersion = '60.0';
      const testData = ['Admin'];

      // Act
      await cache.set(orgId, metadataType, apiVersion, testData);
      await cache.get<string[]>(orgId, metadataType, apiVersion); // Hit
      await cache.get<string[]>(orgId, metadataType, apiVersion); // Hit (memory)
      await cache.get<string[]>(orgId, 'ApexClass', apiVersion); // Miss

      const stats = cache.getStats();

      // Assert
      expect(stats.hits).to.be.greaterThan(0);
      expect(stats.misses).to.be.greaterThan(0);
      expect(stats.hitRate).to.be.greaterThan(0);
    });
  });

  describe('Clear All Cache', () => {
    it('should clear all cache entries', async () => {
      // Arrange
      const orgId = '00D1234567890ABC';
      const metadataType = 'Profile';
      const apiVersion = '60.0';
      const testData = ['Admin'];

      await cache.set(orgId, metadataType, apiVersion, testData);

      // Act
      await cache.clearAll();

      const result = await cache.get<string[]>(orgId, metadataType, apiVersion);
      const stats = cache.getStats();

      // Assert
      expect(result).to.be.null; // Cache cleared, so miss
      expect(stats.size).to.equal(0); // Memory cache cleared
      // After clearAll, counters are reset, so after get() we have 1 miss
      expect(stats.misses).to.equal(1);
    });
  });

  describe('Cache Directory Creation', () => {
    it('should create cache directory if it does not exist', async () => {
      // Arrange
      const newCacheDir = path.join(os.tmpdir(), `profiler-cache-new-${Date.now()}`);
      const newCache = getFilesystemMetadataCache(newCacheDir);

      // Act
      const isAccessible = await newCache.isAccessible();

      // Assert
      expect(isAccessible).to.be.true;

      // Cleanup
      try {
        await fs.rm(newCacheDir, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    });
  });
});

