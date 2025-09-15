import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameRedis } from './redis';
import { createMockRedis, createMockQuestion, createMockVote, createMockPrediction } from '../../test/utils';
import type { MockRedisClient } from '../../test/utils';

describe('GameRedis', () => {
  let mockRedis: MockRedisClient;
  let gameRedis: GameRedis;

  beforeEach(() => {
    mockRedis = createMockRedis();
    gameRedis = new GameRedis(mockRedis as any);
  });

  describe('Question Operations', () => {
    it('should add a question', async () => {
      const question = createMockQuestion();
      
      await gameRedis.addQuestion(question);
      
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'question:test-question-1:metadata',
        {
          id: 'test-question-1',
          text: 'Test question: Will it rain tomorrow?',
          date: '2024-01-15T00:00:00.000Z',
          totalVotes: '0',
          voteSum: '0',
          isActive: '1',
        }
      );
    });

    it('should get a question', async () => {
      const question = createMockQuestion();
      mockRedis.hGetAll.mockResolvedValue({
        id: 'test-question-1',
        text: 'Test question: Will it rain tomorrow?',
        date: '2024-01-15T00:00:00.000Z',
        totalVotes: '5',
        voteSum: '100',
        isActive: '1',
      });

      const result = await gameRedis.getQuestion('test-question-1');
      
      expect(result).toEqual({
        id: 'test-question-1',
        text: 'Test question: Will it rain tomorrow?',
        date: '2024-01-15T00:00:00.000Z',
        totalVotes: 5,
        averageVote: 20,
        isActive: true,
      });
    });

    it('should return null for non-existent question', async () => {
      mockRedis.hGetAll.mockResolvedValue({});
      
      const result = await gameRedis.getQuestion('non-existent');
      
      expect(result).toBeNull();
    });

    it('should delete a question and all related data', async () => {
      await gameRedis.deleteQuestion('test-question-1');
      
      expect(mockRedis.del).toHaveBeenCalledTimes(3);
      expect(mockRedis.del).toHaveBeenCalledWith('question:test-question-1:metadata');
      expect(mockRedis.del).toHaveBeenCalledWith('question:test-question-1:votes');
      expect(mockRedis.del).toHaveBeenCalledWith('question:test-question-1:predictions');
    });
  });

  describe('Vote Operations', () => {
    it('should add a vote', async () => {
      const vote = createMockVote();
      
      await gameRedis.addVote(vote);
      
      expect(mockRedis.watch).toHaveBeenCalledWith('question:test-question-1:votes');
      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockRedis.exec).toHaveBeenCalled();
    });

    it('should get user vote', async () => {
      mockRedis.hGet.mockResolvedValue('25');
      mockRedis.hGetAll.mockResolvedValue({
        id: 'test-question-1',
        text: 'Test question',
        date: '2024-01-15T00:00:00.000Z',
        totalVotes: '1',
        voteSum: '25',
        isActive: '1',
      });

      const result = await gameRedis.getUserVote('testuser', 'test-question-1');
      
      expect(result).toEqual({
        userId: 'testuser',
        questionId: 'test-question-1',
        value: 25,
        timestamp: '2024-01-15T00:00:00.000Z',
      });
    });

    it('should return null for non-existent vote', async () => {
      mockRedis.hGet.mockResolvedValue(null);
      
      const result = await gameRedis.getUserVote('testuser', 'test-question-1');
      
      expect(result).toBeNull();
    });

    it('should get vote distribution', async () => {
      mockRedis.hGetAll.mockResolvedValue({
        'user1': '25',
        'user2': '25',
        'user3': '50',
      });

      const result = await gameRedis.getVoteDistribution('test-question-1');
      
      expect(result).toEqual([
        { value: 25, count: 2 },
        { value: 50, count: 1 },
      ]);
    });
  });

  describe('Prediction Operations', () => {
    it('should add a prediction', async () => {
      const prediction = createMockPrediction();
      
      await gameRedis.addPrediction(prediction);
      
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'question:test-question-1:predictions',
        { testuser: '20' }
      );
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'user:testuser:predictions',
        { 'test-question-1': '20' }
      );
    });

    it('should get user prediction', async () => {
      mockRedis.hGet.mockResolvedValue('20');
      mockRedis.hGetAll.mockResolvedValue({
        id: 'test-question-1',
        text: 'Test question',
        date: '2024-01-15T00:00:00.000Z',
        totalVotes: '1',
        voteSum: '15',
        isActive: '1',
      });

      const result = await gameRedis.getUserPrediction('testuser', 'test-question-1');
      
      expect(result).toEqual({
        userId: 'testuser',
        questionId: 'test-question-1',
        predictedAverage: 20,
        actualAverage: 15,
        isCorrect: true,
        timestamp: '2024-01-15T00:00:00.000Z',
      });
    });
  });

  describe('User History Operations', () => {
    it('should get user history', async () => {
      mockRedis.zRange.mockResolvedValue([
        { member: 'question-1', score: 1640995200000 },
        { member: 'question-2', score: 1641081600000 },
      ]);
      
      mockRedis.hGetAll.mockResolvedValue({
        id: 'question-1',
        text: 'Question 1',
        date: '2024-01-01T00:00:00.000Z',
        totalVotes: '0',
        voteSum: '0',
        isActive: '1',
      });

      const result = await gameRedis.getUserHistory('testuser', 10, 0);
      
      expect(mockRedis.zRange).toHaveBeenCalledWith(
        'user:testuser:history',
        0,
        9,
        { by: 'rank' }
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('Stats Calculation', () => {
    it('should calculate user stats', async () => {
      mockRedis.hGetAll
        .mockResolvedValueOnce({ 'question-1': '25', 'question-2': '30' }) // user votes
        .mockResolvedValueOnce({ 'question-1': '20', 'question-2': '25' }) // user predictions
        .mockResolvedValueOnce({ // question 1 metadata
          id: 'question-1',
          text: 'Question 1',
          date: '2024-01-01T00:00:00.000Z',
          totalVotes: '1',
          voteSum: '25',
          isActive: '1',
        })
        .mockResolvedValueOnce({ // question 2 metadata
          id: 'question-2',
          text: 'Question 2',
          date: '2024-01-02T00:00:00.000Z',
          totalVotes: '1',
          voteSum: '30',
          isActive: '1',
        });

      const result = await gameRedis.calculateUserStats('testuser');
      
      expect(result).toEqual({
        totalVotes: 2,
        correctPredictions: 2, // Both predictions are within 5 points
        totalPredictions: 2,
        questionsSubmitted: 0,
        questionsSelected: 0,
        averagePredictionAccuracy: 5, // |20-25| + |25-30| = 5 + 5 = 10, 10/2 = 5
        currentStreak: 2,
        bestStreak: 2,
        predictionAccuracy: 100,
      });
    });
  });

  describe('State Management', () => {
    it('should set today question ID', async () => {
      await gameRedis.setTodayQuestionId('test-question-1');
      
      expect(mockRedis.set).toHaveBeenCalledWith('question:today:id', 'test-question-1');
    });

    it('should get current question', async () => {
      mockRedis.get.mockResolvedValue('test-question-1');
      mockRedis.hGetAll.mockResolvedValue({
        id: 'test-question-1',
        text: 'Test question',
        date: '2024-01-15T00:00:00.000Z',
        totalVotes: '0',
        voteSum: '0',
        isActive: '1',
      });

      const result = await gameRedis.getCurrentQuestion();
      
      expect(result).toEqual({
        id: 'test-question-1',
        text: 'Test question',
        date: '2024-01-15T00:00:00.000Z',
        totalVotes: 0,
        averageVote: 0,
        isActive: true,
      });
    });
  });
});