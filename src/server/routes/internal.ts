import express from 'express';
import { GameRedis } from '../core/redis';

export function createInternalRoutes(gameRedis: GameRedis): express.Router {
  const router = express.Router();

  // ===== CRON JOB ENDPOINTS =====

  router.post('/internal/jobs/close-voting', async (_req, res): Promise<void> => {
    try {
      // Step 1: Close voting on questions that have been active for 24+ hours
      const result = await gameRedis.closeExpiredVoting();
      
      console.log(`Voting closure processor completed at: ${new Date().toISOString()}`);
      console.log(`Closed ${result.closedCount} questions: ${result.closedQuestions.join(', ')}`);
      
      // Step 2: Return success response with results
      res.json({
        status: 'success',
        message: `Voting closure processing completed. Closed ${result.closedCount} questions.`,
        closedCount: result.closedCount,
        closedQuestions: result.closedQuestions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in voting closure processor:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to process voting closure',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.post('/internal/jobs/weekly-cleanup', async (_req, res): Promise<void> => {
    try {
      // Step 1: TODO - Implement weekly cleanup logic
      // Clean up old user data, expired questions, etc.
      
      console.log('Weekly cleanup triggered at:', new Date().toISOString());
      
      // Step 2: Return success response (placeholder implementation)
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

  return router;
}
