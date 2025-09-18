import express from 'express';
import { context, reddit } from '@devvit/web/server';
import { GameRedis } from '../core/redis';
import type { UiResponse } from '@devvit/web/shared';

export function createMenuRoutes(gameRedis: GameRedis): express.Router {
  const router = express.Router();

  // Menu action for showing question form
  router.post('/internal/menu/question-form', async (_req, res): Promise<void> => {
    try {
      // Step 1: Authenticate user and get username
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res
          .status(401)
          .json({
            error: 'User not authenticated',
            showToast: 'Please login to submit a question',
          });
        return;
      }

      // Step 2: Show form for question submission
      const response: UiResponse = {
        showForm: {
          name: 'questionForm',
          form: {
            fields: [
              {
                type: 'string',
                name: 'questionText',
                label: 'Propose a statement for community voting',
                placeholder: 'Pineapple belongs on pizza.',
                required: true,
              },
              {
                type: 'number',
                name: 'ttlHours',
                label: 'How many hours do you want the question to be open?',
                defaultValue: 24,
              },
            ],
          },
          data: { questionText: '' },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error showing question form:', error);
      res.status(500).json({
        showToast: 'Failed to open question form',
      });
    }
  });

  // Form submission handler for question processing
  router.post('/internal/form/process-question', async (req, res): Promise<void> => {
    try {
      // Step 1: Authenticate user and get username
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Step 2: Extract question text and TTL from form data
      const { questionText, ttlHours } = req.body;

      // Step 3: Validate question text
      if (!questionText || questionText.trim().length === 0) {
        res.json({
          showToast: 'Question text is required',
        });
        return;
      }

      if (questionText.trim().length < 10) {
        res.json({
          showToast: 'Question must be at least 10 characters long',
        });
        return;
      }

      // Step 3.5: Validate TTL hours and calculate closing date
      const ttlHoursNum = parseInt(ttlHours) || 24; // Default to 24 hours if not provided
      if (ttlHoursNum < 1 || ttlHoursNum > 168) { // Between 1 hour and 1 week
        res.json({
          showToast: 'TTL must be between 1 and 168 hours (1 week)',
        });
        return;
      }

      // Calculate closing date from TTL
      const now = new Date();
      const closingDate = new Date(now.getTime() + (ttlHoursNum * 60 * 60 * 1000));

      // Step 4: Get current subreddit name
      const { subredditName } = context;
      console.log('Context subreddit name:', subredditName);
      if (!subredditName) {
        res.json({
          showToast: 'Error: Could not determine subreddit',
        });
        return;
      }

      // Step 5: Create Devvit app post as the user
      const postData = {
        title: `🎯 ${questionText.trim()}`,
        text: `Think you can predict what others think? Test your prediction skills with this question!\n\n*Use the menu to participate*`,
        subredditName: subredditName,
        splash: {
          appDisplayName: 'Predictably Wrong',
          buttonLabel: 'Start Guessing',
          description:
            'Predict what others think, and see how well you know the crowd!',
          heading: '🎯 Predictably Wrong',
        },
        postData: {
          gameType: 'voting',
          submittedBy: username,
          votingOpen: true,
          createdAt: new Date().toISOString()
        }
      };

      console.log('Attempting to create custom post with data:', postData);
      const post = await reddit.submitCustomPost(postData);
      console.log('Post created successfully:', post);
      console.log('Post ID:', post.id);
      console.log('Post URL:', post.url);

      // Step 6: Create question object using post ID as question ID
      const question = {
        id: post.id, // Use Reddit post ID as question ID
        text: questionText.trim(),
        date: new Date().toISOString(),
        totalVotes: 0,
        averageVote: 0,
        isActive: true,
        submittedBy: username,
        closingDate: closingDate.toISOString(),
      };

      // Step 7: Save question to Redis
      await gameRedis.addQuestion(question);

      // Step 8: Show success message and redirect to the new post
      res.json({
        showToast: `Question posted successfully! Post ID: ${post.id}`,
        navigateTo: post.url,
      });
    } catch (error) {
      console.error('Error submitting question:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      res.json({
        showToast: `Failed to submit question: ${errorMessage}`,
      });
    }
  });

  return router;
}
