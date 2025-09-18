import { ArrowLeft, BarChart3, Target, TrendingUp, RotateCcw } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface PersonalStatsPageProps {
  onBack: () => void;
}

export const PersonalStatsPage = ({ onBack }: PersonalStatsPageProps) => {
  const { myStats, myHistory, loading } = useAppContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading stats...</p>
        </div>
      </div>
    );
  }

  const stats = myStats?.userStats;
  const history = myHistory?.userHistory || [];

  const handleResetVotes = () => {
    // TODO: Implement reset functionality
    console.log('Reset votes clicked');
  };

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
        
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Your Stats
        </h1>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Opinions</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {stats.totalVotes}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {stats.predictionAccuracy.toFixed(1)}%
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Best Streak</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {stats.bestStreak}
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Questions</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {stats.questionsSubmitted}
            </p>
          </div>
        </div>
      )}

      {/* Recent History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        
        {history.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No opinion history yet. Start playing to see your stats!
          </p>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.question.text}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Vote: {item.myVote} | Prediction: {item.myPrediction}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    item.predictionCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {item.predictionCorrect ? '✓' : '✗'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.predictionAccuracy?.toFixed(1)} off
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Settings
        </h2>
        
        <button
          onClick={handleResetVotes}
          className="flex items-center space-x-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm">Reset All Stats</span>
        </button>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          This will delete all your history and start fresh! Are you sure?
        </p>
      </div>
    </div>
  );
};
