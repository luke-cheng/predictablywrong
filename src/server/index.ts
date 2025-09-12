import express from 'express';
import { redis, reddit, createServer, getServerPort } from '@devvit/web/server';
import { GameRedis } from './core/redis';
import type {
  CurrentQuestionResponse,
  YesterdayResultsResponse,
  MyVoteResponse,
  MyPredictionResponse,
  VoteRequest,
  VoteResponse,
  PredictRequest,
  PredictResponse,
  SubmitQuestionRequest,
  SubmitQuestionResponse,
  MyHistoryRequest,
  MyHistoryResponse,
  MyStatsResponse,
  QuestionDetailsResponse,
  QuestionsResponse,
  SelectQuestionRequest,
  SelectQuestionResponse,
} from '../shared/types/api';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();
const gameRedis = new GameRedis(redis);

// ===== GAME STATE ENDPOINTS =====

router.get('/api/current-question', async (_req, res): Promise<void> => {
  try {
    const [currentQuestion, username] = await Promise.all([
      gameRedis.getCurrentQuestion(),
      reddit.getCurrentUsername(),
    ]);

    let myVote = null;
    if (currentQuestion && username) {
      myVote = await gameRedis.getUserVote(username, currentQuestion.id);
    }

    const response: CurrentQuestionResponse = {
      type: 'current_question',
      question: currentQuestion,
      myVote,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting current question:', error);
    res.status(500).json({ error: 'Failed to get current question' });
  }
});

router.get('/api/yesterday-results', async (_req, res): Promise<void> => {
  try {
    const [yesterdayQuestion, username] = await Promise.all([
      gameRedis.getYesterdayQuestion(),
      reddit.getCurrentUsername(),
    ]);

    let myPrediction = null;
    let myVote = null;
    
    if (yesterdayQuestion && username) {
      [myPrediction, myVote] = await Promise.all([
        gameRedis.getUserPrediction(username, yesterdayQuestion.id),
        gameRedis.getUserVote(username, yesterdayQuestion.id),
      ]);
    }

    const response: YesterdayResultsResponse = {
      type: 'yesterday_results',
      question: yesterdayQuestion,
      myPrediction,
      myVote,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting yesterday results:', error);
    res.status(500).json({ error: 'Failed to get yesterday results' });
  }
});

// ===== VOTE ENDPOINTS =====

router.get('/api/my-vote', async (_req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const currentQuestion = await gameRedis.getCurrentQuestion();
    if (!currentQuestion) {
      res.status(404).json({ error: 'No current question found' });
      return;
    }

    const vote = await gameRedis.getUserVote(username, currentQuestion.id);

    const response: MyVoteResponse = {
      type: 'my_vote',
      vote,
      question: currentQuestion,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting user vote:', error);
    res.status(500).json({ error: 'Failed to get user vote' });
  }
});

router.post('/api/vote', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { questionId, value }: VoteRequest = req.body;

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

    const response: VoteResponse = {
      type: 'vote',
      success: true,
      vote,
    };

    res.json(response);
  } catch (error) {
    console.error('Error adding vote:', error);
    res.status(500).json({ error: 'Failed to add vote' });
  }
});

// ===== PREDICTION ENDPOINTS =====

router.get('/api/my-prediction', async (_req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const currentQuestion = await gameRedis.getCurrentQuestion();
    if (!currentQuestion) {
      res.status(404).json({ error: 'No current question found' });
      return;
    }

    const prediction = await gameRedis.getUserPrediction(username, currentQuestion.id);

    const response: MyPredictionResponse = {
      type: 'my_prediction',
      prediction,
      question: currentQuestion,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting user prediction:', error);
    res.status(500).json({ error: 'Failed to get user prediction' });
  }
});

router.post('/api/predict', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { questionId, predictedAverage }: PredictRequest = req.body;

    if (typeof predictedAverage !== 'number' || predictedAverage < -50 || predictedAverage > 50) {
      res.status(400).json({ error: 'Prediction must be between -50 and 50' });
      return;
    }

    const question = await gameRedis.getQuestion(questionId);
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    const prediction = {
      userId: username,
      questionId,
      predictedAverage,
      actualAverage: question.averageVote,
      isCorrect: Math.abs(predictedAverage - question.averageVote) <= 5,
      timestamp: new Date().toISOString(),
    };

    await gameRedis.addPrediction(prediction);
    await gameRedis.setUserDataExpiration(username);

    const response: PredictResponse = {
      type: 'prediction',
      success: true,
      prediction,
      actualAverage: question.averageVote,
      isCorrect: prediction.isCorrect,
    };

    res.json(response);
  } catch (error) {
    console.error('Error adding prediction:', error);
    res.status(500).json({ error: 'Failed to add prediction' });
  }
});

// ===== QUESTION SUBMISSION =====

router.post('/api/submit-question', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { questionText }: SubmitQuestionRequest = req.body;

    if (!questionText || questionText.trim().length === 0) {
      res.status(400).json({ error: 'Question text is required' });
      return;
    }

    // TODO: Implement question submission logic
    // For now, just return a placeholder
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response: SubmitQuestionResponse = {
      type: 'question_submission',
      success: true,
      questionId,
      message: 'Question submitted successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error submitting question:', error);
    res.status(500).json({ error: 'Failed to submit question' });
  }
});

// ===== USER DATA ENDPOINTS =====

router.get('/api/my-history', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { limit, offset } = req.query as MyHistoryRequest;
    const questions = await gameRedis.getUserHistory(username, limit, offset);

    const userHistory = await Promise.all(
      questions.map(async (question) => {
        const [myVote, myPrediction, voteDistribution] = await Promise.all([
          gameRedis.getUserVote(username, question.id),
          gameRedis.getUserPrediction(username, question.id),
          gameRedis.getVoteDistribution(question.id),
        ]);

        return {
          question,
          myVote: myVote?.value || null,
          myPrediction: myPrediction?.predictedAverage || null,
          predictionCorrect: myPrediction?.isCorrect || null,
          predictionAccuracy: myPrediction ? Math.abs(myPrediction.predictedAverage - myPrediction.actualAverage) : null,
          voteDistribution,
        };
      })
    );

    const response: MyHistoryResponse = {
      type: 'my_history',
      userHistory,
      totalCount: userHistory.length,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting user history:', error);
    res.status(500).json({ error: 'Failed to get user history' });
  }
});

router.get('/api/my-stats', async (_req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userStats = await gameRedis.calculateUserStats(username);

    const response: MyStatsResponse = {
      type: 'my_stats',
      userStats,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

router.get('/api/question-details/:questionId', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const { questionId } = req.params;

    const [question, myVote, myPrediction, voteDistribution, allVotes, allPredictions] = await Promise.all([
      gameRedis.getQuestion(questionId),
      username ? gameRedis.getUserVote(username, questionId) : null,
      username ? gameRedis.getUserPrediction(username, questionId) : null,
      gameRedis.getVoteDistribution(questionId),
      gameRedis.getQuestionVotes(questionId),
      gameRedis.getQuestionPredictions(questionId),
    ]);

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    const response: QuestionDetailsResponse = {
      type: 'question_details',
      questionDetails: {
        question,
        myVote: myVote?.value || null,
        myPrediction: myPrediction?.predictedAverage || null,
        predictionCorrect: myPrediction?.isCorrect || null,
        predictionAccuracy: myPrediction ? Math.abs(myPrediction.predictedAverage - myPrediction.actualAverage) : null,
        voteDistribution,
        allVotes,
        allPredictions,
      },
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
    // TODO: Implement question queue management
    const response: QuestionsResponse = {
      type: 'questions',
      submittedQuestions: [],
      message: 'Question queue not yet implemented',
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting questions:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

router.post('/api/select-question', async (req, res): Promise<void> => {
  try {
    const { questionId }: SelectQuestionRequest = req.body;

    const question = await gameRedis.getQuestion(questionId);
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // TODO: Implement question selection logic
    const response: SelectQuestionResponse = {
      type: 'select_question',
      success: true,
      selectedQuestion: question,
      message: 'Question selection not yet implemented',
    };

    res.json(response);
  } catch (error) {
    console.error('Error selecting question:', error);
    res.status(500).json({ error: 'Failed to select question' });
  }
});

// ===== CRON JOB ENDPOINTS =====

router.post('/internal/jobs/daily-results', async (_req, res): Promise<void> => {
  try {
    // TODO: Implement daily question selection logic
    // 1. Get top comment from current post
    // 2. Create new question from comment
    // 3. Add to questions:chronological
    // 4. Close voting on previous question
    // 5. Calculate final results
    
    console.log('Daily results processor triggered at:', new Date().toISOString());
    
    res.json({
      status: 'success',
      message: 'Daily results processing completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in daily results processor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process daily results',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/internal/jobs/weekly-cleanup', async (_req, res): Promise<void> => {
  try {
    // TODO: Implement weekly cleanup logic
    // Clean up old user data, expired questions, etc.
    
    console.log('Weekly cleanup triggered at:', new Date().toISOString());
    
    res.json({
      status: 'success',
      message: 'Weekly cleanup completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in weekly cleanup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform weekly cleanup',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
