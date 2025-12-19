/**
 * Error Tests for Metadata Cache
 * Following Error-Driven Development: These tests are written BEFORE implementation
 *
 * Tests cover all 4 possible errors in cache operations with graceful degradation.
 * All cache errors should be non-fatal - operations continue without cache.
 */

import { expect } from 'chai';
import {
  CacheCorruptedError,
  CacheWriteError,
  CacheReadError,
  CacheDiskFullError,
} from '../../src/core/errors/index.js';

describe('Metadata Cache - Error Tests', () => {
  describe('CacheCorruptedError', () => {
    it('should create error with org alias and cache path', () => {
      // Arrange
      const orgAlias = 'production';
      const cachePath = '/home/user/.sf/profiler-cache/prod.json';

      // Act
      const error = new CacheCorruptedError(orgAlias, cachePath);

      // Assert
      expect(error.message).to.include(orgAlias);
      expect(error.code).to.equal('CACHE_CORRUPTED');
      expect(error.recoverable).to.be.true;
      expect(error.exitCode).to.equal(1);
      expect(error.actions).to.include('Cache cleared automatically');
      expect(error.actions).to.include('Fresh metadata will be fetched');
    });

    it('should include cause error if provided', () => {
      // Arrange
      const cause = new Error('JSON parse error');

      // Act
      const error = new CacheCorruptedError('test', '/path', cause);

      // Assert
      expect(error.cause).to.equal(cause);
    });

    it('should be recoverable (non-fatal)', () => {
      // Arrange & Act
      const error = new CacheCorruptedError('test', '/path');

      // Assert
      expect(error.recoverable).to.be.true;
      // Cache errors should not stop operations
    });
  });

  describe('CacheWriteError', () => {
    it('should create error with cache path', () => {
      // Arrange
      const cachePath = '/home/user/.sf/profiler-cache/test.json';
      const cause = new Error('Permission denied');

      // Act
      const error = new CacheWriteError(cachePath, cause);

      // Assert
      expect(error.message).to.include('Failed to write cache');
      expect(error.message).to.include(cause.message);
      expect(error.code).to.equal('CACHE_WRITE_ERROR');
      expect(error.recoverable).to.be.true;
      expect(error.actions).to.include('Check disk space');
      expect(error.actions.some((a) => a.includes(cachePath))).to.be.true;
    });

    it('should suggest continuing without cache', () => {
      // Arrange & Act
      const error = new CacheWriteError('/path', new Error('test'));

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('continue without caching'))).to.be.true;
    });

    it('should be recoverable (graceful degradation)', () => {
      // Arrange & Act
      const error = new CacheWriteError('/path');

      // Assert
      expect(error.recoverable).to.be.true;
      // Operations should continue without cache
    });
  });

  describe('CacheReadError', () => {
    it('should create error with cache path', () => {
      // Arrange
      const cachePath = '/home/user/.sf/profiler-cache/test.json';
      const cause = new Error('File not found');

      // Act
      const error = new CacheReadError(cachePath, cause);

      // Assert
      expect(error.message).to.include('Failed to read cache');
      expect(error.message).to.include(cause.message);
      expect(error.code).to.equal('CACHE_READ_ERROR');
      expect(error.recoverable).to.be.true;
      expect(error.actions).to.include('Metadata will be fetched from API');
    });

    it('should suggest fetching from API as fallback', () => {
      // Arrange & Act
      const error = new CacheReadError('/path', new Error('test'));

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('api'))).to.be.true;
      expect(error.actions.some((a) => a.toLowerCase().includes('no user action'))).to.be.true;
    });

    it('should be recoverable (fallback to API)', () => {
      // Arrange & Act
      const error = new CacheReadError('/path');

      // Assert
      expect(error.recoverable).to.be.true;
      // Should fetch from API instead
    });
  });

  describe('CacheDiskFullError', () => {
    it('should create error with cache path', () => {
      // Arrange
      const cachePath = '/home/user/.sf/profiler-cache/';

      // Act
      const error = new CacheDiskFullError(cachePath);

      // Assert
      expect(error.message).to.include('Disk full');
      expect(error.code).to.equal('CACHE_DISK_FULL');
      expect(error.recoverable).to.be.true;
      expect(error.actions).to.include('Old cache entries will be cleared automatically');
    });

    it('should include available space if provided', () => {
      // Arrange
      const cachePath = '/path';
      const availableSpace = 1024;

      // Act
      const error = new CacheDiskFullError(cachePath, availableSpace);

      // Assert
      expect(error.message).to.include(availableSpace.toString());
    });

    it('should suggest clearing old entries', () => {
      // Arrange & Act
      const error = new CacheDiskFullError('/path');

      // Assert
      expect(error.actions.some((a) => a.toLowerCase().includes('clear'))).to.be.true;
    });

    it('should be recoverable (clear old entries)', () => {
      // Arrange & Act
      const error = new CacheDiskFullError('/path');

      // Assert
      expect(error.recoverable).to.be.true;
      // Should attempt to clear old entries
    });
  });

  describe('Graceful Degradation Strategy', () => {
    it('should allow operations to continue without cache on CacheCorruptedError', () => {
      // Arrange
      const error = new CacheCorruptedError('test', '/path');

      // Assert
      expect(error.recoverable).to.be.true;
      // Operations should continue, fetching fresh data
    });

    it('should allow operations to continue without cache on CacheWriteError', () => {
      // Arrange
      const error = new CacheWriteError('/path');

      // Assert
      expect(error.recoverable).to.be.true;
      // Operations should continue, just slower
    });

    it('should allow operations to continue without cache on CacheReadError', () => {
      // Arrange
      const error = new CacheReadError('/path');

      // Assert
      expect(error.recoverable).to.be.true;
      // Operations should continue, fetching from API
    });

    it('should allow operations to continue after clearing old entries on CacheDiskFullError', () => {
      // Arrange
      const error = new CacheDiskFullError('/path');

      // Assert
      expect(error.recoverable).to.be.true;
      // Operations should continue after clearing old entries
    });
  });
});

