// Redis CRUD wrapper for the Predictably Wrong game
// Based on Devvit's Redis API: https://developers.reddit.com/docs/versioned_docs/version-0.12/capabilities/server/redis

import type { RedisClient } from '@devvit/web/server';
import type { Question, Vote, Prediction, VoteDistribution, VoteHistogram } from '../../shared/types/core';
import { REDIS_KEYS, USER_DATA_TTL_SECONDS } from '../types/database';

export class GameRedis {
  constructor(public redis: RedisClient) {}

  // ===== QUESTION OPERATIONS =====

  async addQuestion(question: Question): Promise<void> {
    // Store question metadata
    await this.redis.hSet(REDIS_KEYS.QUESTION_METADATA(question.id), {
      id: question.id,
      text: question.text,
      date: question.date,
      totalVotes: question.totalVotes.toString(),
      voteSum: (question.averageVote * question.totalVotes).toString(), // store sum for easy updates
      isActive: question.isActive ? '1' : '0', // 1 = active (voting open), 0 = closed
      submittedBy: question.submittedBy || '',
      closingDate: question.closingDate || '', // ISO date string when voting closes
    });

    // Add question ID to the hash of all questions for tracking
    await this.redis.hSet(REDIS_KEYS.ALL_QUESTIONS(), { [question.id]: '1' });

    // Add to closing schedule sorted set if closing date is provided
    if (question.closingDate) {
      const closingTimestamp = new Date(question.closingDate).getTime();
      await this.redis.zAdd(REDIS_KEYS.QUESTION_CLOSING_SCHEDULE(), {
        member: question.id,
        score: closingTimestamp,
      });
    }

    // Track question submission by user
    if (question.submittedBy) {
      await this.trackQuestionSubmission(question.submittedBy, question.id);
    }
  }

  async trackQuestionSubmission(userId: string, questionId: string): Promise<void> {
    // Add question to user's submitted questions hash
    await this.redis.hSet(REDIS_KEYS.USER_QUESTIONS_SUBMITTED(userId), {
      [questionId]: new Date().toISOString(), // Store timestamp when submitted
    });
    
    // Set expiration for user data
    await this.setUserDataExpiration(userId);
  }

  async getUserSubmittedQuestions(userId: string): Promise<string[]> {
    const submittedQuestions = await this.redis.hGetAll(REDIS_KEYS.USER_QUESTIONS_SUBMITTED(userId));
    return Object.keys(submittedQuestions);
  }

  // Helper method to populate question submissions for existing questions (backward compatibility)
  async populateExistingQuestionSubmissions(): Promise<void> {
    try {
      const allQuestions = await this.redis.hGetAll(REDIS_KEYS.ALL_QUESTIONS());
      const questionIds = Object.keys(allQuestions);
      
      for (const questionId of questionIds) {
        const question = await this.getQuestion(questionId);
        if (question && question.submittedBy) {
          // Check if already tracked
          const existing = await this.redis.hGet(REDIS_KEYS.USER_QUESTIONS_SUBMITTED(question.submittedBy), questionId);
          if (!existing) {
            await this.trackQuestionSubmission(question.submittedBy, questionId);
            console.log(`Backfilled question submission: ${questionId} by ${question.submittedBy}`);
          }
        }
      }
    } catch (error) {
      console.error('Error populating existing question submissions:', error);
    }
  }

  async getQuestion(id: string): Promise<Question | null> {
    const metadata = await this.redis.hGetAll(REDIS_KEYS.QUESTION_METADATA(id));
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
      ...(metadata.submittedBy && { submittedBy: metadata.submittedBy }),
      ...(metadata.closingDate && { closingDate: metadata.closingDate }),
    };
  }

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    if (ids.length === 0) return [];
    const results = await Promise.all(ids.map((id) => this.redis.hGetAll(REDIS_KEYS.QUESTION_METADATA(id))));
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
          ...(metadata.submittedBy && { submittedBy: metadata.submittedBy }),
          ...(metadata.closingDate && { closingDate: metadata.closingDate }),
        } as Question;
      })
      .filter((q): q is Question => q !== null);
  }

  // Note: getAllQuestions removed - use getQuestionsByIds() with known IDs instead
  // Devvit Redis doesn't support keys() command for pattern matching

  async deleteQuestion(id: string): Promise<void> {
    // Delete all related data
    await Promise.all([
      this.redis.del(REDIS_KEYS.QUESTION_METADATA(id)),
      this.redis.del(REDIS_KEYS.QUESTION_VOTES(id)),
      this.redis.del(REDIS_KEYS.QUESTION_PREDICTIONS(id)),
      this.redis.hDel(REDIS_KEYS.ALL_QUESTIONS(), [id]), // Remove from all questions hash
      this.redis.zRem(REDIS_KEYS.QUESTION_CLOSING_SCHEDULE(), [id]), // Remove from closing schedule
    ]);
  }

  // ===== QUESTION DISCOVERY =====
  // Note: Removed today/yesterday methods since we're no longer using daily questions
  // Questions are now user-submitted Reddit posts identified by post IDs

  async setQuestionActive(questionId: string, isActive: boolean): Promise<void> {
    await this.redis.hSet(REDIS_KEYS.QUESTION_METADATA(questionId), {
      isActive: isActive ? '1' : '0',
    });
  }

  // ===== VOTE OPERATIONS =====

  async addVote(vote: Vote): Promise<void> {
    const txn = await this.redis.watch(REDIS_KEYS.QUESTION_VOTES(vote.questionId));
    
    await txn.multi();
    await txn.hSet(REDIS_KEYS.QUESTION_VOTES(vote.questionId), { [vote.userId]: vote.value.toString() });
    await txn.hSet(REDIS_KEYS.USER_VOTES(vote.userId), { [vote.questionId]: vote.value.toString() });
    await txn.zAdd(REDIS_KEYS.USER_HISTORY(vote.userId), {
      member: vote.questionId,
      score: new Date(vote.timestamp).getTime(),
    });
    await txn.exec();

    // Update question vote count and average
    await this.updateQuestionVoteStats(vote.questionId);
  }

  async getUserVote(userId: string, questionId: string): Promise<Vote | null> {
    const voteValue = await this.redis.hGet(REDIS_KEYS.QUESTION_VOTES(questionId), userId);
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
    const votes = await this.redis.hGetAll(REDIS_KEYS.QUESTION_VOTES(questionId));
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
    const votes = await this.redis.hGetAll(REDIS_KEYS.QUESTION_VOTES(questionId));
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

  async getVoteHistogram(questionId: string): Promise<VoteHistogram> {
    const question = await this.getQuestion(questionId);
    const distribution = await this.getVoteDistribution(questionId);
    
    // Create complete histogram with all buckets from -10 to 10
    const buckets: VoteDistribution[] = [];
    for (let i = -10; i <= 10; i++) {
      const existing = distribution.find(d => d.value === i);
      buckets.push({
        value: i,
        count: existing ? existing.count : 0,
      });
    }
    
    return {
      buckets,
      totalVotes: question?.totalVotes || 0,
      averageVote: question?.averageVote || 0,
    };
  }

  // ===== PREDICTION OPERATIONS =====

  async addPrediction(prediction: Prediction): Promise<void> {
    await this.redis.hSet(REDIS_KEYS.QUESTION_PREDICTIONS(prediction.questionId), {
      [prediction.userId]: prediction.predictedAverage.toString(),
    });
    
    await this.redis.hSet(REDIS_KEYS.USER_PREDICTIONS(prediction.userId), {
      [prediction.questionId]: prediction.predictedAverage.toString(),
    });
  }

  async getUserPrediction(userId: string, questionId: string): Promise<Prediction | null> {
    const predictionValue = await this.redis.hGet(REDIS_KEYS.QUESTION_PREDICTIONS(questionId), userId);
    if (!predictionValue) return null;

    const question = await this.getQuestion(questionId);
    if (!question) return null;

    const predictedAverage = parseFloat(predictionValue);
    const actualAverage = question.averageVote;
    const accuracy = Math.abs(predictedAverage - actualAverage);

    return {
      userId,
      questionId,
      predictedAverage,
      actualAverage,
      isCorrect: accuracy <= 5, // 5 point threshold
      accuracy,
      timestamp: question.date,
    };
  }

  async getQuestionPredictions(questionId: string): Promise<Prediction[]> {
    const predictions = await this.redis.hGetAll(REDIS_KEYS.QUESTION_PREDICTIONS(questionId));
    const question = await this.getQuestion(questionId);
    if (!question) return [];

    return Object.entries(predictions).map(([userId, predictedValue]) => {
      const predictedAverage = parseFloat(predictedValue);
      const actualAverage = question.averageVote;
      const accuracy = Math.abs(predictedAverage - actualAverage);
      
      return {
        userId,
        questionId,
        predictedAverage,
        actualAverage,
        isCorrect: accuracy <= 5,
        accuracy,
        timestamp: question.date,
      };
    });
  }

  // ===== USER HISTORY OPERATIONS =====

  async getUserHistory(userId: string, limit?: number, offset?: number): Promise<Question[]> {
    const start = offset || 0;
    const end = limit ? start + limit - 1 : -1;
    
    const questionData = await this.redis.zRange(REDIS_KEYS.USER_HISTORY(userId), start, end, { by: 'rank' });
    const questions = await Promise.all(
      questionData.map(data => this.getQuestion(data.member))
    );
    
    return questions.filter((q: Question | null): q is Question => q !== null);
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
    const [userVotes, userPredictions, userQuestionsSubmitted] = await Promise.all([
      this.redis.hGetAll(REDIS_KEYS.USER_VOTES(userId)),
      this.redis.hGetAll(REDIS_KEYS.USER_PREDICTIONS(userId)),
      this.redis.hGetAll(REDIS_KEYS.USER_QUESTIONS_SUBMITTED(userId)),
    ]);

    const totalVotes = Object.keys(userVotes).length;
    const totalPredictions = Object.keys(userPredictions).length;
    const questionsSubmitted = Object.keys(userQuestionsSubmitted).length;
    
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
      questionsSubmitted,
      questionsSelected: 0, // TODO: Track question selections
      averagePredictionAccuracy: totalPredictions > 0 ? totalAccuracy / totalPredictions : 0,
      currentStreak,
      bestStreak,
      predictionAccuracy: totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0,
    };
  }

  // ===== HELPER METHODS =====

  private async updateQuestionVoteStats(questionId: string): Promise<void> {
    const votes = await this.redis.hGetAll(REDIS_KEYS.QUESTION_VOTES(questionId));
    const voteValues = Object.values(votes).map(v => parseInt(v));
    
    const totalVotes = voteValues.length;
    const voteSum = voteValues.reduce((sum, v) => sum + v, 0);

    await this.redis.hSet(REDIS_KEYS.QUESTION_METADATA(questionId), {
      totalVotes: totalVotes.toString(),
      voteSum: voteSum.toString(),
    });
  }

  // ===== DATA CLEANUP =====

  async setUserDataExpiration(userId: string, days?: number): Promise<void> {
    const seconds = days ? days * 24 * 60 * 60 : USER_DATA_TTL_SECONDS;
    await Promise.all([
      this.redis.expire(REDIS_KEYS.USER_HISTORY(userId), seconds),
      this.redis.expire(REDIS_KEYS.USER_VOTES(userId), seconds),
      this.redis.expire(REDIS_KEYS.USER_PREDICTIONS(userId), seconds),
    ]);
  }

  /**
   * Get all submitted questions
   * Since questions are Reddit posts, we need to track post IDs
   * For now, returns empty array - implement based on your post tracking strategy
   */
  async getAllQuestions(): Promise<Question[]> {
    // TODO: Implement based on how you track post IDs
    // Options:
    // 1. Store post IDs in a separate Redis key when questions are created
    // 2. Use Reddit API to fetch posts created by the app
    // 3. Implement a different tracking mechanism
    return [];
  }

  /**
   * Get all active questions that might need voting closure
   * This method should be implemented to return all active questions
   * so the cron job can check which ones should be closed
   */
  async getActiveQuestions(): Promise<Question[]> {
    // Get all question IDs from the hash
    const questionIdsHash = await this.redis.hKeys(REDIS_KEYS.ALL_QUESTIONS());
    if (questionIdsHash.length === 0) return [];

    // Get all questions and filter for active ones
    const questions = await this.getQuestionsByIds(questionIdsHash);
    return questions.filter(q => q.isActive);
  }

  /**
   * Close voting on questions that have passed their closing date
   * This method should be called by the cron job
   * Uses sorted set for efficient processing - only checks questions that should be closed
   */
  async closeExpiredVoting(): Promise<{ closedCount: number; closedQuestions: string[] }> {
    const now = new Date().getTime();
    const closedQuestions: string[] = [];

    // Get all questions that should be closed (score <= current timestamp)
    const expiredQuestions = await this.redis.zRange(
      REDIS_KEYS.QUESTION_CLOSING_SCHEDULE(),
      0, // min score (start of time)
      now, // max score (current time)
      { by: 'score' }
    );

    if (expiredQuestions.length === 0) {
      return { closedCount: 0, closedQuestions: [] };
    }

    // Process each expired question
    for (const questionData of expiredQuestions) {
      const questionId = questionData.member;
      
      // Check if question is still active before closing
      const question = await this.getQuestion(questionId);
      if (question && question.isActive) {
        // Close voting for this question
        await this.setQuestionActive(questionId, false);
        closedQuestions.push(questionId);
        console.log(`Closed voting for question ${questionId} (expired at ${new Date(questionData.score).toISOString()})`);
      }

      // Remove from closing schedule since it's been processed
      await this.redis.zRem(REDIS_KEYS.QUESTION_CLOSING_SCHEDULE(), [questionId]);
    }

    return { 
      closedCount: closedQuestions.length, 
      closedQuestions 
    };
  }
}
