import { vi } from 'vitest';
import type { RedisClient } from '@devvit/web/server';

export type MockRedisClient = {
  hSet: ReturnType<typeof vi.fn>;
  hGetAll: ReturnType<typeof vi.fn>;
  hGet: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  watch: ReturnType<typeof vi.fn>;
  multi: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
  zAdd: ReturnType<typeof vi.fn>;
  zRange: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
};

export function createMockRedis(): MockRedisClient {
  return {
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
  };
}

export function createMockQuestion(id: string = 'test-question-1') {
  return {
    id,
    text: 'Test question: Will it rain tomorrow?',
    date: '2024-01-15T00:00:00.000Z',
    totalVotes: 0,
    averageVote: 0,
    isActive: true,
  };
}

export function createMockVote(userId: string = 'testuser', questionId: string = 'test-question-1') {
  return {
    userId,
    questionId,
    value: 25,
    timestamp: '2024-01-15T00:00:00.000Z',
  };
}

export function createMockPrediction(userId: string = 'testuser', questionId: string = 'test-question-1') {
  return {
    userId,
    questionId,
    predictedAverage: 20,
    actualAverage: 15,
    isCorrect: true,
    timestamp: '2024-01-15T00:00:00.000Z',
  };
}