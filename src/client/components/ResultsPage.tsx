import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  BarChart,
  Bar,
} from 'recharts';
import { useAppContext } from '../contexts/AppContext';
import { Slider } from './Slider';
import { QuestionCard } from './QuestionCard';

interface ResultsPageProps {
  questionId: string;
  onBack: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ onBack }) => {
  const { questionDetails, loading } = useAppContext();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!questionDetails?.questionDetails) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Results not found</p>
          <button
            onClick={onBack}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { question, myVote, myPrediction, voteHistogram } = questionDetails.questionDetails;
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

  const chartData = voteHistogram?.buckets || [];

  // Calculate max count for Y-axis
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

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
      </div>

      {/* Question */}
      <QuestionCard question={question} showVotingStatus={true} />

      {/* Results */}
      <div className="space-y-6">
        {/* Your Vote & Prediction */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Your Response
          </h2>
          <div className="space-y-6">
            {/* Your Vote Slider */}
            {myVote !== null && (
              <Slider
                value={myVote}
                label={myVote ? 'You Voted' : 'Your Opinion'}
                locked={true}
                className="mb-4"
              />
            )}

            {/* Fallback text if no votes/predictions */}
            {myVote === null && myPrediction === null && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  You haven't voted or made a prediction yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Voting Status Message */}
        {!isQuestionClosed ? (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <p className="text-orange-800 dark:text-orange-200">
                Voting is still open! Check back after {closingTimeString} to see the final results.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <p className="text-blue-800 dark:text-blue-200">
                Voting is closed, but you can still predict the average!
              </p>
            </div>
          </div>
        )}

        {/* Current Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Results
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Vote</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {question.averageVote.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Votes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {question.totalVotes}
              </p>
            </div>
          </div>

          {/* Chart - Always show if we have histogram data */}
          {voteHistogram && chartData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Vote Distribution
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {isMobile ? (
                    <BarChart data={chartData} layout="vertical">
                      <XAxis
                        type="number"
                        dataKey="count"
                        stroke="#6B7280"
                        fontSize={10}
                        domain={[1, maxCount]}
                        tickCount={Math.min(maxCount, 5)}
                      />
                      <YAxis type="category" dataKey="value" stroke="#6B7280" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [value, 'Votes']}
                        labelFormatter={() => ''}
                      />
                      <Bar dataKey="count" fill="#3B82F6" fillOpacity={0.7} />
                      {/* Center line */}
                      <ReferenceLine y={0} stroke="#9CA3AF" strokeWidth={1} strokeDasharray="2 2" />
                      {/* Average line */}
                      <ReferenceLine
                        y={question.averageVote}
                        stroke="#10B981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />

                      {myPrediction !== null && (
                        <ReferenceDot
                          y={myPrediction}
                          x={chartData.find((d) => d.value === myPrediction)?.count || 0}
                          r={6}
                          fill="#F59E0B"
                          stroke="#F59E0B"
                          strokeWidth={2}
                        />
                      )}
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData}>
                      <XAxis
                        dataKey="value"
                        stroke="#6B7280"
                        fontSize={12}
                        tickCount={5}
                        tickFormatter={(value) => {
                          if (value === 0) return '0';
                          return '';
                        }}
                      />
                      <YAxis
                        stroke="#6B7280"
                        fontSize={12}
                        domain={[1, maxCount]}
                        tickCount={Math.min(maxCount, 6)}
                        tick={{ fontSize: 12 }}
                        label={{ value: '# of Votes', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB',
                        }}
                        formatter={(value) => [value, 'Votes']}
                        labelFormatter={() => ''}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      {/* Center line */}
                      <ReferenceLine x={0} stroke="#9CA3AF" strokeWidth={1} strokeDasharray="2 2" />
                      {/* Average line */}
                      <ReferenceLine
                        x={question.averageVote}
                        stroke="#10B981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      {myPrediction !== null && (
                        <ReferenceDot
                          x={myPrediction}
                          y={0}
                          r={6}
                          fill="#F59E0B"
                          stroke="#F59E0B"
                          strokeWidth={2}
                        />
                      )}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
