import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

interface QuestionCardProps {
  question: {
    id: string;
    text: string;
    date: string;
    totalVotes: number;
    averageVote: number;
    isActive: boolean;
    submittedBy?: string;
    closingDate?: string;
  };
  showVotingStatus?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  showVotingStatus = true 
}) => {
  const isQuestionClosed = !question.isActive;

  // Calculate closing time (24 hours after question creation)
  const closingTime = new Date(question.date);
  closingTime.setHours(closingTime.getHours() + 24);

  // Format closing time as date and time
  const closingTimeString = closingTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
      {/* Question Text */}
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {question.text}
      </h1>

      {/* Voting Status */}
      {showVotingStatus && (
        <div className="flex items-center space-x-2">
          {isQuestionClosed ? (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Voting Closed</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Voting closes {closingTimeString}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
