import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { context } from '@devvit/web/client';
import { Slider } from './Slider';
import { QuestionCard } from './QuestionCard';
import { useSubmitVote, useSubmitPrediction } from '../hooks/useApi';
import { useAppContext } from '../contexts/AppContext';
import type { VoteFormData, PredictionFormData } from '../../shared/types/core';

interface VotePredictionPageProps {
  questionId: string;
  onBack: () => void;
  onShowResults: () => void;
}

export const VotePredictionPage = ({
  questionId,
  onBack,
  onShowResults,
}: VotePredictionPageProps) => {
  const [userVote, setUserVote] = useState(0);
  const [userPrediction, setUserPrediction] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { questionDetails, myVote, myPrediction, loading, refetch, isVotingOpen } = useAppContext();
  const { submitVote, loading: voteSubmitting } = useSubmitVote();
  const { submitPrediction, loading: predictionSubmitting } = useSubmitPrediction();

  // Determine user state and permissions
  const hasVoted = myVote?.vote !== null;
  const hasPredicted = myPrediction?.prediction !== null;
  const question = questionDetails?.questionDetails?.question;
  const isQuestionByCurrentUser = question?.submittedBy === context.userId;

  // Voting permissions
  const canVote = !hasVoted && isVotingOpen && !isQuestionByCurrentUser;

  // Prediction permissions
  const canPredict = !hasPredicted;

  // Set initial values if user already voted/predicted
  useEffect(() => {
    if (hasVoted && myVote?.vote) {
      setUserVote(myVote.vote.value);
    }
    if (hasPredicted && myPrediction?.prediction) {
      setUserPrediction(myPrediction.prediction.predictedAverage);
    }
  }, [hasVoted, hasPredicted, myVote, myPrediction]);

  const handleSubmit = async () => {
    if (!question) return;

    setIsSubmitting(true);

    try {
      // Submit vote only if user can vote
      if (canVote) {
        const voteData: VoteFormData = {
          questionId,
          value: userVote,
        };
        await submitVote(voteData);
      }

      // Submit prediction only if user can predict
      if (canPredict) {
        const predictionData: PredictionFormData = {
          questionId,
          predictedAverage: userPrediction,
        };
        await submitPrediction(predictionData);
      }

      // Refresh the app data to get updated vote/prediction info
      await refetch();

      // Go to results
      onShowResults();
    } catch (error) {
      console.error('Error submitting vote/prediction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading question...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Question not found</p>
          <button
            onClick={onBack}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

      </div>

      {/* Question */}
      <QuestionCard question={question} showVotingStatus={true} isVotingOpen={isVotingOpen} />

      {/* Sliders */}
      <div className="space-y-8">
        {/* User Vote Slider */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <Slider
            value={userVote}
            {...(canVote ? { onChange: setUserVote } : {})}
            label={
              hasVoted
                ? 'Your Vote (Already Submitted)'
                : canVote
                  ? "What's your opinion?"
                  : 'Voting Not Available'
            }
            className="mb-4"
            locked={!canVote || hasVoted}
          />
          {!canVote && !hasVoted && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {!isVotingOpen && 'Voting is closed, but you can still predict the average!'}
              {isQuestionByCurrentUser && 'You cannot vote on your own question.'}
            </div>
          )}
        </div>

        {/* Prediction Slider */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <Slider
            value={userPrediction}
            {...(canPredict ? { onChange: setUserPrediction } : {})}
            label={
              hasPredicted
                ? 'Your Prediction (Already Submitted)'
                : 'What do you think the average will be?'
            }
            className="mb-4"
            locked={!canPredict || hasPredicted}
          />
          {!canPredict && !hasPredicted && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You have already made a prediction for this question.
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-8">
        {canVote || canPredict ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || voteSubmitting || predictionSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isSubmitting || voteSubmitting || predictionSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit'
            )}
          </button>
        ) : (
          <button
            onClick={onShowResults}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            View Results
          </button>
        )}
      </div>
    </div>
  );
};
