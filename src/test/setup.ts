// Test setup file for Vitest
import { vi } from 'vitest';

// Mock Devvit server modules
vi.mock('@devvit/web/server', () => ({
  redis: {
    hSet: vi.fn(),
    hGetAll: vi.fn(),
    hGet: vi.fn(),
    del: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    watch: vi.fn(),
    multi: vi.fn(),
    exec: vi.fn(),
    zAdd: vi.fn(),
    zRange: vi.fn(),
    expire: vi.fn(),
  },
  reddit: {
    getCurrentUsername: vi.fn(),
  },
  createServer: vi.fn(),
  getServerPort: vi.fn(() => 3000),
}));

// Global test utilities
global.testUtils = {
  createMockRedis: () => ({
    hSet: vi.fn().mockResolvedValue(1),
    hGetAll: vi.fn().mockResolvedValue({}),
    hGet: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    watch: vi.fn().mockReturnThis(),
    multi: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([1, 1, 1]),
    zAdd: vi.fn().mockResolvedValue(1),
    zRange: vi.fn().mockResolvedValue([]),
    expire: vi.fn().mockResolvedValue(1),
  }),
  
  createMockReddit: () => ({
    getCurrentUsername: vi.fn().mockResolvedValue('testuser'),
  }),
};