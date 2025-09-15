import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { GameRedis } from './core/redis';
import { createMockRedis, createMockQuestion, createMockVote } from '../test/utils';
import type { MockRedisClient } from '../test/utils';

// Mock the Devvit server modules
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
  createServer: vi.fn((app) => ({
    listen: vi.fn(),
    on: vi.fn(),
  })),
  getServerPort: vi.fn(() => 3000),
}));

// Create a test app without the Devvit-specific setup
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text());

  const router = express.Router();
  const mockRedis = createMockRedis();
  const gameRedis = new GameRedis(mockRedis as any);

  // Mock reddit.getCurrentUsername
  const mockReddit = {
    getCurrentUsername: vi.fn().mockResolvedValue('testuser'),
  };

  // Copy the route handlers from index.ts but with mocked dependencies
  router.get('/api/current-question', async (_req, res): Promise<void> => {
    try {
      const [currentQuestion, username] = await Promise.all([
        gameRedis.getCurrentQuestion(),
        mockReddit.getCurrentUsername(),
      ]);

      let myVote = null;
      if (currentQuestion && username) {
        myVote = await gameRedis.getUserVote(username, currentQuestion.id);
      }

      res.json({
        type: 'current_question',
        question: currentQuestion,
        myVote,
      });
    } catch (error) {
      console.error('Error getting current question:', error);
      res.status(500).json({ error: 'Failed to get current question' });
    }
  });

  router.post('/api/vote', async (req, res): Promise<void> => {
    try {
      const username = await mockReddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { questionId, value } = req.body;

      if (typeof value !== 'number' || value < -50 || value > 50) {
        res.status(400).json({ error: 'Vote value must be between -50 and 50' });
        return;
      }

      const question = await gameRedis.getQuestion(questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      const vote = {
        userId: username,
        questionId,
        value,
        timestamp: new Date().toISOString(),
      };

      await gameRedis.addVote(vote);
      await gameRedis.setUserDataExpiration(username);

      res.json({
        type: 'vote',
        success: true,
        vote,
      });
    } catch (error) {
      console.error('Error adding vote:', error);
      res.status(500).json({ error: 'Failed to add vote' });
    }
  });

  router.get('/api/my-stats', async (_req, res): Promise<void> => {
    try {
      const username = await mockReddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const userStats = await gameRedis.calculateUserStats(username);

      res.json({
        type: 'my_stats',
        userStats,
      });
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({ error: 'Failed to get user stats' });
    }
  });

  app.use(router);
  return { app, mockRedis, mockReddit };
}

describe('API Endpoints', () => {
  let app: express.Application;
  let mockRedis: MockRedisClient;
  let mockReddit: any;

  beforeEach(() => {
    const testApp = createTestApp();
    app = testApp.app;
    mockRedis = testApp.mockRedis;
    mockReddit = testApp.mockReddit;
  });

  describe('GET /api/current-question', () => {
    it('should return current question and user vote', async () => {
      const question = createMockQuestion();
      mockRedis.get.mockResolvedValue('test-question-1');
      mockRedis.hGetAll.mockResolvedValue({
        id: 'test-question-1',
        text: 'Test question: Will it rain tomorrow?',
        date: '2024-01-15T00:00:00.000Z',
        totalVotes: '0',
        voteSum: '0',
        isActive: '1',
      });
      mockRedis.hGet.mockResolvedValue('25');

      const response = await request(app)
        .get('/api/current-question')
        .expect(200);

      expect(response.body).toEqual({
        type: 'current_question',
        question: {
          id: 'test-question-1',
          text: 'Test question: Will it rain tomorrow?',
          date: '2024-01-15T00:00:00.000Z',
          totalVotes: 0,
          averageVote: 0,
          isActive: true,
        },
        myVote: {
          userId: 'testuser',
          questionId: 'test-question-1',
          value: 25,
          timestamp: '2024-01-15T00:00:00.000Z',
        },
      });
    });

    it('should handle no current question', async () => {
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/current-question')
        .expect(200);

      expect(response.body).toEqual({
        type: 'current_question',
        question: null,
        myVote: null,
      });
    });
  });

  describe('POST /api/vote', () => {
    it('should accept a valid vote', async () => {
      const question = createMockQuestion();
      mockRedis.hGetAll.mockResolvedValue({
        id: 'test-question-1',
        text: 'Test question',
        date: '2024-01-15T00:00:00.000Z',
        totalVotes: '0',
        voteSum: '0',
        isActive: '1',
      });

      const response = await request(app)
        .post('/api/vote')
        .send({ questionId: 'test-question-1', value: 25 })
        .expect(200);

      expect(response.body.type).toBe('vote');
      expect(response.body.success).toBe(true);
      expect(response.body.vote.userId).toBe('testuser');
      expect(response.body.vote.questionId).toBe('test-question-1');
      expect(response.body.vote.value).toBe(25);
    });

    it('should reject invalid vote values', async () => {
      const response = await request(app)
        .post('/api/vote')
        .send({ questionId: 'test-question-1', value: 100 })
        .expect(400);

      expect(response.body.error).toBe('Vote value must be between -50 and 50');
    });

    it('should reject votes for non-existent questions', async () => {
      mockRedis.hGetAll.mockResolvedValue({});

      const response = await request(app)
        .post('/api/vote')
        .send({ questionId: 'non-existent', value: 25 })
        .expect(404);

      expect(response.body.error).toBe('Question not found');
    });

    it('should handle unauthenticated users', async () => {
      mockReddit.getCurrentUsername.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/vote')
        .send({ questionId: 'test-question-1', value: 25 })
        .expect(401);

      expect(response.body.error).toBe('User not authenticated');
    });
  });

  describe('GET /api/my-stats', () => {
    it('should return user statistics', async () => {
      mockRedis.hGetAll
        .mockResolvedValueOnce({ 'question-1': '25' }) // user votes
        .mockResolvedValueOnce({ 'question-1': '20' }) // user predictions
        .mockResolvedValueOnce({ // question metadata
          id: 'question-1',
          text: 'Question 1',
          date: '2024-01-01T00:00:00.000Z',
          totalVotes: '1',
          voteSum: '25',
          isActive: '1',
        });

      const response = await request(app)
        .get('/api/my-stats')
        .expect(200);

      expect(response.body.type).toBe('my_stats');
      expect(response.body.userStats).toHaveProperty('totalVotes');
      expect(response.body.userStats).toHaveProperty('totalPredictions');
      expect(response.body.userStats).toHaveProperty('predictionAccuracy');
    });

    it('should handle unauthenticated users', async () => {
      mockReddit.getCurrentUsername.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/my-stats')
        .expect(401);

      expect(response.body.error).toBe('User not authenticated');
    });
  });
});