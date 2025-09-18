import { BarChart3, TrendingUp } from 'lucide-react';

interface HomePageProps {
  onStartPlaying: () => void;
  onShowStats: () => void;
}

export const HomePage = ({ onStartPlaying, onShowStats }: HomePageProps) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 relative">
      {/* Stats Button - Top Right */}
      <button
        onClick={onShowStats}
        className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="View Statistics"
      >
        <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Main Content - Centered */}
      <div className="flex flex-col items-center justify-center min-h-screen space-y-8">
        {/* Game Title */}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white text-center">
          Predictably Wrong
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md text-center">
          Think you can predict what others think? Test your prediction skills with controversial
          questions!
        </p>

        {/* Game Description */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 max-w-sm space-y-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">How it works</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>1. Vote your opinion </p>
            <p>2. Predict what others will vote</p>
            <p>3. See how well you know the crowd</p>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onStartPlaying}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors transform hover:scale-105"
        >
          Start Playing
        </button>
      </div>
    </div>
  );
};
