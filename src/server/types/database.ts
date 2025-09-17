// Server-specific database and Redis types
// These are internal to the server and not shared with client

import type { Question, VoteDistribution, BaseGameState, UserStats } from '../../shared/types/core';

// Redis key patterns for server use
export const REDIS_KEYS = {
  QUESTION_METADATA: (id: string) => `question:${id}:metadata`,
  QUESTION_VOTES: (id: string) => `question:${id}:votes`,
  QUESTION_PREDICTIONS: (id: string) => `question:${id}:predictions`,
  USER_HISTORY: (userId: string) => `user:${userId}:history`,
  USER_VOTES: (userId: string) => `user:${userId}:votes`,
  USER_PREDICTIONS: (userId: string) => `user:${userId}:predictions`,
  ALL_QUESTIONS: () => `questions:all`, // Hash of all question IDs
  QUESTION_CLOSING_SCHEDULE: () => `questions:closing-schedule`, // Sorted set: question ID -> closing timestamp
} as const;

// Global TTLs (in seconds)
export const USER_DATA_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Server internal types for Redis operations
export type RedisQuestionMetadata = {
  id: string;
  text: string;
  date: string;
  totalVotes: string; // Redis stores as string
  voteSum: string; // Redis stores as string
  isActive: string; // Redis stores as '1' or '0'
};

// Server internal types for business logic
export type QuestionWithStats = Question & {
  voteDistribution: VoteDistribution[];
  predictionDistribution: VoteDistribution[];
};

export type UserGameState = BaseGameState & {
  userStats: UserStats;
  historicalQuestions: Question[];
};

// Server service types
export type PredictionAccuracyService = {
  calculateAccuracy(predicted: number, actual: number): number;
  isCorrect(predicted: number, actual: number, threshold?: number): boolean;
  calculatePredictionQuality(userId: string, questionId: string): number;
};
