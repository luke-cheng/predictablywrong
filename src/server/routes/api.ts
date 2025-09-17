import express from 'express';
import { reddit } from '@devvit/web/server';
import { GameRedis } from '../core/redis';
import type {
  MyVoteResponse,
  MyPredictionResponse,
  VoteRequest,
  VoteResponse,
  PredictRequest,
  PredictResponse,
  MyHistoryRequest,
  MyHistoryResponse,
  MyStatsResponse,
  QuestionDetailsResponse,
  QuestionsResponse,
} from '../../shared/types/api';

export function createApiRoutes(gameRedis: GameRedis): express.Router {
  const router = express.Router();

  // ===== VOTE ENDPOINTS =====

  router.get('/api/my-vote/:questionId', async (req, res): Promise<void> => {
    try {
      // Step 1: Authenticate user and get username
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Step 2: Get question ID from URL params
      const { questionId } = req.params;

      // Step 3: Get question from Redis DB
      const question = await gameRedis.getQuestion(questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      // Step 4: Fetch user's vote for this question
      const vote = await gameRedis.getUserVote(username, questionId);

      // Step 5: Return vote data with question context
      const response: MyVoteResponse = {
        type: 'my_vote',
        vote,
        question,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user vote:', error);
      res.status(500).json({ error: 'Failed to get user vote' });
    }
  });

  router.post('/api/vote', async (req, res): Promise<void> => {
    try {
      // Step 1: Authenticate user and get username
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Step 2: Extract vote data from request body
      const { questionId, value }: VoteRequest = req.body;

      // Step 3: Validate vote value is within allowed range (-10 to 10)
      if (typeof value !== 'number' || value < -10 || value > 10) {
        res.status(400).json({ error: 'Vote value must be between -10 and 10' });
        return;
      }

      // Step 4: Verify question exists in Redis DB
      const question = await gameRedis.getQuestion(questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      // Step 5: Create vote object with timestamp
      const vote = {
        userId: username,
        questionId,
        value,
        timestamp: new Date().toISOString(),
      };

      // Step 6: Save vote to Redis and set user data expiration
      await gameRedis.addVote(vote);
      await gameRedis.setUserDataExpiration(username);

      // Step 7: Get vote histogram for response
      const voteHistogram = await gameRedis.getVoteHistogram(questionId);

      // Step 8: Return success response with vote data
      const response: VoteResponse = {
        type: 'vote',
        success: true,
        vote,
        voteHistogram,
        message: 'Vote submitted successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error adding vote:', error);
      res.status(500).json({ error: 'Failed to add vote' });
    }
  });

  // ===== PREDICTION ENDPOINTS =====

  router.get('/api/my-prediction/:questionId', async (req, res): Promise<void> => {
    try {
      // Step 1: Authenticate user and get username
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Step 2: Get question ID from URL params
      const { questionId } = req.params;

      // Step 3: Get question from Redis DB
      const question = await gameRedis.getQuestion(questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      // Step 4: Fetch user's prediction for this question
      const prediction = await gameRedis.getUserPrediction(username, questionId);

      // Step 5: Return prediction data with question context
      const response: MyPredictionResponse = {
        type: 'my_prediction',
        prediction,
        question,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user prediction:', error);
      res.status(500).json({ error: 'Failed to get user prediction' });
    }
  });

  router.post('/api/predict', async (req, res): Promise<void> => {
    try {
      // Step 1: Authenticate user and get username
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Step 2: Extract prediction data from request body
      const { questionId, predictedAverage }: PredictRequest = req.body;

      // Step 3: Validate prediction value is within allowed range (-10 to 10)
      if (typeof predictedAverage !== 'number' || predictedAverage < -10 || predictedAverage > 10) {
        res.status(400).json({ error: 'Prediction must be between -10 and 10' });
        return;
      }

      // Step 4: Verify question exists in Redis DB
      const question = await gameRedis.getQuestion(questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      // Step 5: Create prediction object with accuracy calculation
      const accuracy = Math.abs(predictedAverage - question.averageVote);
      const prediction = {
        userId: username,
        questionId,
        predictedAverage,
        actualAverage: question.averageVote,
        isCorrect: accuracy <= 2, // Within 2 points = correct
        accuracy,
        timestamp: new Date().toISOString(),
      };

      // Step 6: Save prediction to Redis and set user data expiration
      await gameRedis.addPrediction(prediction);
      await gameRedis.setUserDataExpiration(username);

      // Step 7: Get vote histogram for response
      const voteHistogram = await gameRedis.getVoteHistogram(questionId);

      // Step 8: Return success response with prediction and accuracy data
      const response: PredictResponse = {
        type: 'prediction',
        success: true,
        prediction,
        actualAverage: question.averageVote,
        isCorrect: prediction.isCorrect,
        voteHistogram,
        message: 'Prediction submitted successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error adding prediction:', error);
      res.status(500).json({ error: 'Failed to add prediction' });
    }
  });

  // ===== USER DATA ENDPOINTS =====

  router.get('/api/my-history', async (req, res): Promise<void> => {
    try {
      // Step 1: Authenticate user and get username
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Step 2: Extract pagination parameters from query string
      const { limit, offset } = req.query as MyHistoryRequest;

      // Step 3: Get user's question history from Redis with pagination
      const questions = await gameRedis.getUserHistory(username, limit, offset);

      // Step 4: For each question, populate with user's vote, prediction, and vote distribution
      const userHistory = await Promise.all(
        questions.map(async (question) => {
          const [myVote, myPrediction] = await Promise.all([
            gameRedis.getUserVote(username, question.id), // Get user's vote
            gameRedis.getUserPrediction(username, question.id), // Get user's prediction
          ]);

          // Step 5: Get vote histogram for this question
          const voteHistogram = await gameRedis.getVoteHistogram(question.id);

          // Step 6: Calculate prediction accuracy and return enriched question data
          return {
            question,
            myVote: myVote?.value || null,
            myPrediction: myPrediction?.predictedAverage || null,
            predictionCorrect: myPrediction?.isCorrect || null,
            predictionAccuracy: myPrediction
              ? Math.abs(myPrediction.predictedAverage - myPrediction.actualAverage)
              : null,
            voteHistogram,
          };
        })
      );

      // Step 6: Return comprehensive user history
      const response: MyHistoryResponse = {
        type: 'my_history',
        userHistory,
        totalCount: userHistory.length,
        message: 'User history retrieved successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user history:', error);
      res.status(500).json({ error: 'Failed to get user history' });
    }
  });

  router.get('/api/my-stats', async (_req, res): Promise<void> => {
    try {
      // Step 1: Authenticate user and get username
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Step 2: Calculate user statistics from Redis data
      const userStats = await gameRedis.calculateUserStats(username);

      // Step 3: Return aggregated user statistics
      const response: MyStatsResponse = {
        type: 'my_stats',
        userStats,
        message: 'User statistics retrieved successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({ error: 'Failed to get user stats' });
    }
  });

  router.get('/api/question-details/:questionId', async (req, res): Promise<void> => {
    try {
      // Step 1: Get question ID from URL params and optionally authenticate user
      const username = await reddit.getCurrentUsername();
      const { questionId } = req.params;

      // Step 2: Fetch comprehensive question data in parallel
      const [question, myVote, myPrediction, allVotes, allPredictions] = await Promise.all([
        gameRedis.getQuestion(questionId), // Get question object
        username ? gameRedis.getUserVote(username, questionId) : null, // Get user's vote if authenticated
        username ? gameRedis.getUserPrediction(username, questionId) : null, // Get user's prediction if authenticated
        gameRedis.getQuestionVotes(questionId), // Get all votes
        gameRedis.getQuestionPredictions(questionId), // Get all predictions
      ]);

      // Step 3: Verify question exists
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      // Step 4: Get vote histogram for this question
      const voteHistogram = await gameRedis.getVoteHistogram(questionId);

      // Step 5: Return comprehensive question details with all data
      const response: QuestionDetailsResponse = {
        type: 'question_details',
        questionDetails: {
          question,
          myVote: myVote?.value || null,
          myPrediction: myPrediction?.predictedAverage || null,
          predictionCorrect: myPrediction?.isCorrect || null,
          predictionAccuracy: myPrediction
            ? Math.abs(myPrediction.predictedAverage - myPrediction.actualAverage)
            : null,
          voteHistogram,
          allVotes,
          allPredictions,
        },
        message: 'Question details retrieved successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting question details:', error);
      res.status(500).json({ error: 'Failed to get question details' });
    }
  });

  // ===== ADMIN ENDPOINTS =====

  router.get('/api/questions', async (_req, res): Promise<void> => {
    try {
      // Step 1: Get all submitted questions from Redis
      const submittedQuestions = await gameRedis.getAllQuestions();

      // Step 2: Return questions list
      const response: QuestionsResponse = {
        type: 'questions',
        submittedQuestions,
        message: 'Questions retrieved successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting questions:', error);
      res.status(500).json({ error: 'Failed to get questions' });
    }
  });

  // Removed select-question endpoint - questions are now user-submitted

  return router;
}
