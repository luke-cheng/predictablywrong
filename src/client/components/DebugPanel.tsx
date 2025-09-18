import React, { useState } from 'react';
import { context } from '@devvit/web/client';
import { useAppContext } from '../contexts/AppContext';

interface DebugPanelProps {
  questionId: string | null;
}

export const DebugPanel = ({ questionId }: DebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { questionDetails, myVote, myPrediction, myStats, myHistory, loading, error, refetch } = useAppContext();

  if (!questionId) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-2 py-1 text-xs rounded shadow-lg hover:bg-gray-700 transition-colors"
      >
        🐛 Debug
      </button>
      
      {isOpen && (
        <div className="absolute top-8 left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 max-w-sm max-h-96 overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Debug Panel
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {/* Post Context Info */}
          <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
            <p><strong>Post ID:</strong> {context.postId || 'None'}</p>
            <p><strong>Subreddit:</strong> {context.subredditName || 'None'}</p>
            <p><strong>Post Data:</strong> {JSON.stringify(context.postData, null, 2) || 'None'}</p>
          </div>
          
          {/* API Data */}
          <div className="space-y-3">
            <button
              onClick={refetch}
              disabled={loading}
              className="w-full bg-blue-500 text-white px-3 py-1 text-xs rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
            
            {error && (
              <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                Error: {error}
              </div>
            )}
            
            {!loading && (questionDetails || myVote || myPrediction || myStats || myHistory) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">API Responses:</h4>
                
                <div className="space-y-2">
                  {questionDetails && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Question Details:</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(questionDetails, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {myVote && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">My Vote:</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(myVote, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {myPrediction && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">My Prediction:</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(myPrediction, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {myStats && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">My Stats:</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(myStats, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {myHistory && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">My History:</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(myHistory, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
