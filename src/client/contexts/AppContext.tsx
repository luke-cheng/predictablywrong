import React, { createContext, useContext, useEffect, useState } from 'react';
import { context } from '@devvit/web/client';
import type { 
  QuestionDetailsResponse,
  MyVoteResponse,
  MyPredictionResponse,
  MyStatsResponse,
  MyHistoryResponse
} from '../../shared/types/api';

type AppData = {
  questionDetails: QuestionDetailsResponse | null;
  myVote: MyVoteResponse | null;
  myPrediction: MyPredictionResponse | null;
  myStats: MyStatsResponse | null;
  myHistory: MyHistoryResponse | null;
  loading: boolean;
  error: string | null;
};

type AppContextType = AppData & {
  refetch: () => void;
};

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [questionDetails, setQuestionDetails] = useState<QuestionDetailsResponse | null>(null);
  const [myVote, setMyVote] = useState<MyVoteResponse | null>(null);
  const [myPrediction, setMyPrediction] = useState<MyPredictionResponse | null>(null);
  const [myStats, setMyStats] = useState<MyStatsResponse | null>(null);
  const [myHistory, setMyHistory] = useState<MyHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
    const questionId = context.postId;
    if (!questionId) {
      setError('No post context found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [questionDetailsRes, myVoteRes, myPredictionRes, myStatsRes, myHistoryRes] = await Promise.all([
        fetch(`/api/question-details/${questionId}`).then(res => res.ok ? res.json() : null),
        fetch(`/api/my-vote/${questionId}`).then(res => res.ok ? res.json() : null),
        fetch(`/api/my-prediction/${questionId}`).then(res => res.ok ? res.json() : null),
        fetch('/api/my-stats').then(res => res.ok ? res.json() : null),
        fetch('/api/my-history').then(res => res.ok ? res.json() : null)
      ]);

      setQuestionDetails(questionDetailsRes);
      setMyVote(myVoteRes);
      setMyPrediction(myPredictionRes);
      setMyStats(myStatsRes);
      setMyHistory(myHistoryRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching app data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const value: AppContextType = {
    questionDetails,
    myVote,
    myPrediction,
    myStats,
    myHistory,
    loading,
    error,
    refetch: fetchAllData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
