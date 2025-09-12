// Redis CRUD wrapper for the Predictably Wrong game
// Based on Devvit's Redis API: https://developers.reddit.com/docs/versioned_docs/version-0.12/capabilities/server/redis

import type { RedisClient } from '@devvit/web/server';
import type { Question, Vote, Prediction, VoteDistribution } from '../../shared/types/api';

// Global TTLs (in seconds)
const USER_DATA_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Redis key patterns
const KEYS = {
  QUESTION_METADATA: (id: string) => `question:${id}:metadata`,
  QUESTION_VOTES: (id: string) => `question:${id}:votes`,
  QUESTION_PREDICTIONS: (id: string) => `question:${id}:predictions`,
  TODAY_QUESTION_ID: 'question:today:id',
  YESTERDAY_QUESTION_ID: 'question:yesterday:id',
  USER_HISTORY: (userId: string) => `user:${userId}:history`,
  USER_VOTES: (userId: string) => `user:${userId}:votes`,
  USER_PREDICTIONS: (userId: string) => `user:${userId}:predictions`,
} as const;

export class GameRedis {
  constructor(private redis: RedisClient) {}

  // ===== QUESTION OPERATIONS =====

  async addQuestion(question: Question): Promise<void> {
    // Store question metadata
    await this.redis.hSet(KEYS.QUESTION_METADATA(question.id), {
      id: question.id,
      text: question.text,
      date: question.date,
      totalVotes: question.totalVotes.toString(),
      voteSum: (question.averageVote * question.totalVotes).toString(), // store sum for easy updates
      isActive: '1', // 1 = active (voting open), 0 = closed
    });
  }

  async getQuestion(id: string): Promise<Question | null> {
    const metadata = await this.redis.hGetAll(KEYS.QUESTION_METADATA(id));
    if (!metadata || Object.keys(metadata).length === 0) {
      return null;
    }

    const totalVotes = parseInt(metadata.totalVotes || '0');
    const voteSum = parseFloat(metadata.voteSum || '0');
    
    return {
      id: metadata.id || '',
      text: metadata.text || '',
      date: metadata.date || '',
      totalVotes,
      averageVote: totalVotes > 0 ? voteSum / totalVotes : 0,
      isActive: metadata.isActive === '1',
    };
  }

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    if (ids.length === 0) return [];
    const results = await Promise.all(ids.map((id) => this.redis.hGetAll(KEYS.QUESTION_METADATA(id))));
    return results
      .map((metadata) => {
        if (!metadata || Object.keys(metadata).length === 0) return null;
        const totalVotes = parseInt(metadata.totalVotes || '0');
        const voteSum = parseFloat(metadata.voteSum || '0');
        
        return {
          id: metadata.id || '',
          text: metadata.text || '',
          date: metadata.date || '',
          totalVotes,
          averageVote: totalVotes > 0 ? voteSum / totalVotes : 0,
          isActive: metadata.isActive === '1',
        } as Question;
      })
      .filter((q): q is Question => q !== null);
  }

  // Note: getAllQuestions removed - use getQuestionsByIds() with known IDs instead
  // Devvit Redis doesn't support keys() command for pattern matching

  async deleteQuestion(id: string): Promise<void> {
    // Delete all related data
    await Promise.all([
      this.redis.del(KEYS.QUESTION_METADATA(id)),
      this.redis.del(KEYS.QUESTION_VOTES(id)),
      this.redis.del(KEYS.QUESTION_PREDICTIONS(id)),
    ]);
  }

  // ===== TODAY/YESTERDAY ID MANAGEMENT =====

  async setTodayQuestionId(questionId: string): Promise<void> {
    await this.redis.set(KEYS.TODAY_QUESTION_ID, questionId);
  }

  async setYesterdayQuestionId(questionId: string): Promise<void> {
    await this.redis.set(KEYS.YESTERDAY_QUESTION_ID, questionId);
  }

  async getTodayQuestionId(): Promise<string | null> {
    const id = await this.redis.get(KEYS.TODAY_QUESTION_ID);
    return id ?? null;
    
  }

  async getYesterdayQuestionId(): Promise<string | null> {
    const id = await this.redis.get(KEYS.YESTERDAY_QUESTION_ID);
    return id ?? null;
  }

  async setQuestionActive(questionId: string, isActive: boolean): Promise<void> {
    await this.redis.hSet(KEYS.QUESTION_METADATA(questionId), {
      isActive: isActive ? '1' : '0',
    });
  }

  // ===== VOTE OPERATIONS =====

  async addVote(vote: Vote): Promise<void> {
    const txn = await this.redis.watch(KEYS.QUESTION_VOTES(vote.questionId));
    
    await txn.multi();
    await txn.hSet(KEYS.QUESTION_VOTES(vote.questionId), { [vote.userId]: vote.value.toString() });
    await txn.hSet(KEYS.USER_VOTES(vote.userId), { [vote.questionId]: vote.value.toString() });
    await txn.zAdd(KEYS.USER_HISTORY(vote.userId), {
      member: vote.questionId,
      score: new Date(vote.timestamp).getTime(),
    });
    await txn.exec();

    // Update question vote count and average
    await this.updateQuestionVoteStats(vote.questionId);
  }

  async getUserVote(userId: string, questionId: string): Promise<Vote | null> {
    const voteValue = await this.redis.hGet(KEYS.QUESTION_VOTES(questionId), userId);
    if (!voteValue) return null;

    const question = await this.getQuestion(questionId);
    if (!question) return null;

    return {
      userId,
      questionId,
      value: parseInt(voteValue),
      timestamp: question.date, // We don't store individual timestamps, use question date
    };
  }

  async getQuestionVotes(questionId: string): Promise<Vote[]> {
    const votes = await this.redis.hGetAll(KEYS.QUESTION_VOTES(questionId));
    const question = await this.getQuestion(questionId);
    if (!question) return [];

    return Object.entries(votes).map(([userId, value]) => ({
      userId,
      questionId,
      value: parseInt(value),
      timestamp: question.date,
    }));
  }

  async getVoteDistribution(questionId: string): Promise<VoteDistribution[]> {
    const votes = await this.redis.hGetAll(KEYS.QUESTION_VOTES(questionId));
    const distribution: { [key: number]: number } = {};

    Object.values(votes).forEach(value => {
      const voteValue = parseInt(value);
      distribution[voteValue] = (distribution[voteValue] || 0) + 1;
    });

    return Object.entries(distribution).map(([value, count]) => ({
      value: parseInt(value),
      count,
    }));
  }

  // ===== PREDICTION OPERATIONS =====

  async addPrediction(prediction: Prediction): Promise<void> {
    await this.redis.hSet(KEYS.QUESTION_PREDICTIONS(prediction.questionId), {
      [prediction.userId]: prediction.predictedAverage.toString(),
    });
    
    await this.redis.hSet(KEYS.USER_PREDICTIONS(prediction.userId), {
      [prediction.questionId]: prediction.predictedAverage.toString(),
    });
  }

  async getUserPrediction(userId: string, questionId: string): Promise<Prediction | null> {
    const predictionValue = await this.redis.hGet(KEYS.QUESTION_PREDICTIONS(questionId), userId);
    if (!predictionValue) return null;

    const question = await this.getQuestion(questionId);
    if (!question) return null;

    return {
      userId,
      questionId,
      predictedAverage: parseFloat(predictionValue),
      actualAverage: question.averageVote,
      isCorrect: Math.abs(parseFloat(predictionValue) - question.averageVote) <= 5, // 5 point threshold
      timestamp: question.date,
    };
  }

  async getQuestionPredictions(questionId: string): Promise<Prediction[]> {
    const predictions = await this.redis.hGetAll(KEYS.QUESTION_PREDICTIONS(questionId));
    const question = await this.getQuestion(questionId);
    if (!question) return [];

    return Object.entries(predictions).map(([userId, predictedValue]) => ({
      userId,
      questionId,
      predictedAverage: parseFloat(predictedValue),
      actualAverage: question.averageVote,
      isCorrect: Math.abs(parseFloat(predictedValue) - question.averageVote) <= 5,
      timestamp: question.date,
    }));
  }

  // ===== USER HISTORY OPERATIONS =====

  async getUserHistory(userId: string, limit?: number, offset?: number): Promise<Question[]> {
    const start = offset || 0;
    const end = limit ? start + limit - 1 : -1;
    
    const questionData = await this.redis.zRange(KEYS.USER_HISTORY(userId), start, end, { by: 'rank' });
    const questions = await Promise.all(
      questionData.map(data => this.getQuestion(data.member))
    );
    
    return questions.filter((q): q is Question => q !== null);
  }

  // ===== STATS CALCULATION =====

  async calculateUserStats(userId: string): Promise<{
    totalVotes: number;
    correctPredictions: number;
    totalPredictions: number;
    questionsSubmitted: number;
    questionsSelected: number;
    averagePredictionAccuracy: number;
    currentStreak: number;
    bestStreak: number;
    predictionAccuracy: number;
  }> {
    const [userVotes, userPredictions] = await Promise.all([
      this.redis.hGetAll(KEYS.USER_VOTES(userId)),
      this.redis.hGetAll(KEYS.USER_PREDICTIONS(userId)),
    ]);

    const totalVotes = Object.keys(userVotes).length;
    const totalPredictions = Object.keys(userPredictions).length;
    
    // Calculate prediction accuracy
    let correctPredictions = 0;
    let totalAccuracy = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (const [questionId, predictedValue] of Object.entries(userPredictions)) {
      const question = await this.getQuestion(questionId);
      if (question) {
        const accuracy = Math.abs(parseFloat(predictedValue) - question.averageVote);
        totalAccuracy += accuracy;
        
        const isCorrect = accuracy <= 5;
        if (isCorrect) {
          correctPredictions++;
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
    }

    currentStreak = tempStreak; // Current streak is the last temp streak

    return {
      totalVotes,
      correctPredictions,
      totalPredictions,
      questionsSubmitted: 0, // TODO: Track question submissions
      questionsSelected: 0, // TODO: Track question selections
      averagePredictionAccuracy: totalPredictions > 0 ? totalAccuracy / totalPredictions : 0,
      currentStreak,
      bestStreak,
      predictionAccuracy: totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0,
    };
  }

  // ===== HELPER METHODS =====

  private async updateQuestionVoteStats(questionId: string): Promise<void> {
    const votes = await this.redis.hGetAll(KEYS.QUESTION_VOTES(questionId));
    const voteValues = Object.values(votes).map(v => parseInt(v));
    
    const totalVotes = voteValues.length;
    const voteSum = voteValues.reduce((sum, v) => sum + v, 0);

    await this.redis.hSet(KEYS.QUESTION_METADATA(questionId), {
      totalVotes: totalVotes.toString(),
      voteSum: voteSum.toString(),
    });
  }

  // ===== DATA CLEANUP =====

  async setUserDataExpiration(userId: string, days?: number): Promise<void> {
    const seconds = days ? days * 24 * 60 * 60 : USER_DATA_TTL_SECONDS;
    await Promise.all([
      this.redis.expire(KEYS.USER_HISTORY(userId), seconds),
      this.redis.expire(KEYS.USER_VOTES(userId), seconds),
      this.redis.expire(KEYS.USER_PREDICTIONS(userId), seconds),
    ]);
  }
}
