import Redis from 'ioredis';
import { env } from '../config/env.js';

// Cache configuration with TTL in seconds
const CACHE_CONFIG: Record<string, number> = {
  'student:profile': 3600,           // 1 hour
  'employee:profile': 3600,          // 1 hour
  'config:public': 86400,            // 24 hours
  'academic:current-semester': 3600, // 1 hour
  'academic:current-year': 3600,     // 1 hour
  'dashboard:admin': 300,            // 5 minutes
  'dashboard:student': 300,          // 5 minutes
  'dashboard:lecturer': 300,         // 5 minutes
  'schedule:student': 1800,          // 30 minutes
  'schedule:lecturer': 1800,         // 30 minutes
  'grades:student': 1800,            // 30 minutes
  'permissions:user': 3600,          // 1 hour
  'fee-structure': 86400,            // 24 hours
};

class CacheService {
  private redis: Redis | null = null;
  private enabled: boolean = false;
  private prefix: string = 'hums:';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (env.REDIS_URL) {
      try {
        this.redis = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              console.warn('Redis: Max retries reached, disabling cache');
              this.enabled = false;
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        });

        this.redis.on('connect', () => {
          console.info('Redis: Connected');
          this.enabled = true;
        });

        this.redis.on('error', (err) => {
          console.warn('Redis error:', err.message);
          this.enabled = false;
        });

        this.redis.on('close', () => {
          console.warn('Redis: Connection closed');
          this.enabled = false;
        });
      } catch (error) {
        console.warn('Redis: Failed to initialize, caching disabled');
        this.enabled = false;
      }
    } else {
      console.info('Redis: No URL configured, caching disabled');
    }
  }

  /**
   * Build a cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get TTL for a key pattern
   */
  private getTTL(key: string): number {
    // Find matching pattern
    for (const pattern of Object.keys(CACHE_CONFIG)) {
      if (key.startsWith(pattern)) {
        return CACHE_CONFIG[pattern];
      }
    }
    return 300; // Default 5 minutes
  }

  /**
   * Get cached data or fetch and cache it
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    if (!this.enabled || !this.redis) {
      return fetcher();
    }

    const cacheKey = this.buildKey(key);

    try {
      // Try to get from cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }

      // Fetch data
      const data = await fetcher();

      // Cache it
      const expiry = ttl ?? this.getTTL(key);
      await this.redis.setex(cacheKey, expiry, JSON.stringify(data));

      return data;
    } catch (error) {
      console.warn('Cache error, falling back to fetcher:', error);
      return fetcher();
    }
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      const cacheKey = this.buildKey(key);
      const cached = await this.redis.get(cacheKey);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const cacheKey = this.buildKey(key);
      const expiry = ttl ?? this.getTTL(key);
      await this.redis.setex(cacheKey, expiry, JSON.stringify(data));
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const cacheKey = this.buildKey(key);
      await this.redis.del(cacheKey);
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  /**
   * Delete multiple cached entries by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Cache deletePattern error:', error);
    }
  }

  /**
   * Invalidate user-specific caches
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.deletePattern(`*:${userId}`);
    await this.deletePattern(`*:${userId}:*`);
  }

  /**
   * Invalidate student-specific caches
   */
  async invalidateStudent(studentId: string): Promise<void> {
    await this.deletePattern(`student:*:${studentId}`);
    await this.deletePattern(`grades:student:${studentId}`);
    await this.deletePattern(`schedule:student:${studentId}`);
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    keyCount: number;
    memoryUsage: string;
  }> {
    if (!this.enabled || !this.redis) {
      return { enabled: false, keyCount: 0, memoryUsage: '0' };
    }

    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        enabled: true,
        keyCount: keys.length,
        memoryUsage,
      };
    } catch {
      return { enabled: this.enabled, keyCount: 0, memoryUsage: 'unknown' };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.enabled = false;
    }
  }
}

export const cacheService = new CacheService();

// Helper functions for common cache operations
export const cache = {
  /**
   * Cache student profile
   */
  studentProfile: (studentId: string) => ({
    key: `student:profile:${studentId}`,
    ttl: CACHE_CONFIG['student:profile'],
  }),

  /**
   * Cache student schedule
   */
  studentSchedule: (studentId: string, semesterId: string) => ({
    key: `schedule:student:${studentId}:${semesterId}`,
    ttl: CACHE_CONFIG['schedule:student'],
  }),

  /**
   * Cache student grades
   */
  studentGrades: (studentId: string, semesterId: string) => ({
    key: `grades:student:${studentId}:${semesterId}`,
    ttl: CACHE_CONFIG['grades:student'],
  }),

  /**
   * Cache public config
   */
  publicConfig: () => ({
    key: 'config:public',
    ttl: CACHE_CONFIG['config:public'],
  }),

  /**
   * Cache current semester
   */
  currentSemester: () => ({
    key: 'academic:current-semester',
    ttl: CACHE_CONFIG['academic:current-semester'],
  }),

  /**
   * Cache current academic year
   */
  currentYear: () => ({
    key: 'academic:current-year',
    ttl: CACHE_CONFIG['academic:current-year'],
  }),

  /**
   * Cache dashboard stats
   */
  dashboardStats: (type: string, userId?: string) => ({
    key: userId ? `dashboard:${type}:${userId}` : `dashboard:${type}`,
    ttl: CACHE_CONFIG[`dashboard:${type}`] || 300,
  }),

  /**
   * Cache fee structure
   */
  feeStructure: (programId: string, academicYear: string) => ({
    key: `fee-structure:${programId}:${academicYear}`,
    ttl: CACHE_CONFIG['fee-structure'],
  }),
};
