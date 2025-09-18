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
  showSubmitter?: boolean;
  isVotingOpen?: boolean;
}

export const QuestionCard = ({
  question,
  showVotingStatus = true,
  showSubmitter = false,
  isVotingOpen = false,
}: QuestionCardProps) => {

  // Format closing time as date and time
  // Use the browser's language for formatting the closing time string
  const userLocale = navigator.language || 'en-US';
  const closingTimeString = new Date(question.closingDate || '').toLocaleString(userLocale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
      {/* Question Text */}
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{question.text}</h1>

      {showSubmitter && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Submitted by {question.submittedBy}
          </span>
        </div>
      )}

      {/* Voting Status */}
      {showVotingStatus && (
        <div className="flex items-center space-x-2">
          {isVotingOpen ? (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">
                Voting is open &mdash; closes on {closingTimeString}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-orange-500 dark:text-orange-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Voting is closed</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
