import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    subredditName: subredditName,
    title: '🎯 Predictably Wrong - Test Your Prediction Skills!',
    splash: {
      appDisplayName: 'Predictably Wrong',
      buttonLabel: 'Start Guessing',
      description: 'Vote on questions, predict what others think, and see how well you know the crowd!',
      heading: 'Predictably Wrong',
      backgroundUri: 'background.png'
    
    },
    postData: {
      gameType: 'prediction',
      initialized: false
    }
  });
};
