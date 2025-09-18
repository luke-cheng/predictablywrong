import { ArrowLeft } from 'lucide-react';
import {
  XAxis,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { useAppContext } from '../contexts/AppContext';
import { Slider } from './Slider';
import { QuestionCard } from './QuestionCard';

interface ResultsPageProps {
  questionId: string;
  onBack: () => void;
}

export const ResultsPage = ({ onBack }: ResultsPageProps) => {
  const { questionDetails, loading, isVotingOpen } = useAppContext();

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

  const chartData = voteHistogram?.buckets || [];

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

      {/* Results */}
      <div className="space-y-6">
        {/* Your Vote & Prediction */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Results</h2>

          {/* Short stats that can be shown with numbers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Votes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {question.totalVotes}
              </p>
            </div>

            {/* how long the poll was open */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Poll Duration</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(() => {
                  if (!question.date || !question.closingDate) return 'N/A';
                  const start = new Date(question.date);
                  const end = new Date(question.closingDate);
                  const diffMs = Math.abs(end.getTime() - start.getTime());
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                  let result = '';
                  if (diffDays > 0) {
                    result += `${diffDays}d `;
                  }
                  result += `${diffHours}h`;
                  return result.trim();
                })()}
              </p>
            </div>
          </div>
          {/* Your Vote Slider */}
          {myVote !== null && (
            <Slider
              value={myVote}
              label={'My Opinion'}
              locked={true}
              className="mb-4"
            />
          )}

          {/* Your Prediction Slider */}
          {myPrediction !== null && (
            <Slider
              value={myPrediction}
              label={'My Prediction'}
              locked={true}
              className="mb-4"
            />
          )}

          <Slider
            value={question.averageVote}
            label="The Average"
            locked={true}
            className="mb-4"
          />

          {/* Chart - Always show if we have histogram data */}
          {voteHistogram && chartData.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Distribution of Votes
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis type="number" dataKey="value"
                    domain={[-10, 10]}
                    interval="preserveStartEnd"
                    />
                    <Tooltip
                      formatter={(_, __, item) => [`${item?.payload?.count ?? ''} votes`]}
                      labelFormatter={() => ''}
                    />
                    <Bar dataKey="count" fill="#3b82f6" />
                    {/* Average vote reference line */}
                    {question.averageVote !== null && (
                      <ReferenceLine
                        ifOverflow="visible"
                        x={question.averageVote}
                        label={{ value: 'Avg', position: 'insideTop', offset: 20 }}
                        stroke="orange"
                        strokeWidth={2}
                        strokeDasharray="8 4"
                      />
                    )}
                    {/* My prediction reference line */}
                    {myPrediction !== null && (
                      <ReferenceDot
                        ifOverflow="visible"
                        label={{
                          value: 'My Prediction',
                          position: 'bottom', // Offsets the label below the dot
                          offset: 12, // Further offset the label down (in px)
                        }}
                        x={myPrediction}
                        y={0}
                        shape={(props) => {
                          const { cx, cy } = props;
                          return (
                            <polygon
                              points={`${cx},${cy - 6} ${cx - 6},${cy + 6} ${cx + 6},${cy + 6}`}
                              fill="red"
                              stroke="red"
                              strokeWidth={2}
                            />
                          );
                        }}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
