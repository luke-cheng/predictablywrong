// Server-specific database and Redis types
// These are internal to the server and not shared with client

import type { Question, Vote, PredictionResult, VoteDistribution } from '../../shared/types/core';

// Redis key patterns for server use
export const REDIS_KEYS = {
  QUESTION_METADATA: (id: string) => `question:${id}:metadata`,
  QUESTION_VOTES: (id: string) => `question:${id}:votes`,
  QUESTION_PREDICTIONS: (id: string) => `question:${id}:predictions`,
  TODAY_QUESTION_ID: 'question:today:id',
  YESTERDAY_QUESTION_ID: 'question:yesterday:id',
  USER_HISTORY: (userId: string) => `user:${userId}:history`,
  USER_VOTES: (userId: string) => `user:${userId}:votes`,
  USER_PREDICTIONS: (userId: string) => `user:${userId}:predictions`,
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

export type UserGameState = {
  currentQuestion: Question | null;
  yesterdayQuestion: Question | null;
  userVote: Vote | null;
  userPrediction: PredictionResult | null;
  userStats: import('../../shared/types/core').UserStats;
  historicalQuestions: Question[];
};

// Server service types
export type PredictionAccuracyService = {
  calculateAccuracy(predicted: number, actual: number): number;
  isCorrect(predicted: number, actual: number, threshold?: number): boolean;
  calculatePredictionQuality(userId: string, questionId: string): number;
};
