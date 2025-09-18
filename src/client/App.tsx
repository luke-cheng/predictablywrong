import { useState, useEffect } from 'react';
import { context } from '@devvit/web/client';
import { HomePage } from './components/HomePage';
import { VotePredictionPage } from './components/VotePredictionPage';
import { ResultsPage } from './components/ResultsPage';
import { PersonalStatsPage } from './components/PersonalStatsPage';
import { DebugPanel } from './components/DebugPanel';
import { AppProvider, useAppContext } from './contexts/AppContext';

type Page = 'home' | 'vote' | 'results' | 'stats';

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const { questionDetails, myPrediction, loading, refetch } = useAppContext();

  // Get question ID from Reddit post context
  useEffect(() => {
    const questionId = context.postId;
    if (questionId) {
      setCurrentQuestionId(questionId);
    } else {
      throw new Error('No post context found');
    }
  }, []);

  // Implement app logic based on user state
  useEffect(() => {
    if (!questionDetails?.questionDetails?.question || loading) return;

    const hasPredicted = myPrediction?.prediction !== null;

    // Only auto-navigate if user has already predicted
    if (hasPredicted) {
      setCurrentPage('results'); // Go directly to results since they've already participated
    }
    // Otherwise, always start on home page and let user choose to start playing
  }, [questionDetails, myPrediction, loading]);

  const handleStartPlaying = () => {
    setCurrentPage('vote');
  };

  const handleShowStats = () => {
    setCurrentPage('stats');
  };

  const handleShowResults = async () => {
    // Refresh data before showing results to ensure we have the latest information
    await refetch();
    setCurrentPage('results');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
  };

  const handleBackToVote = () => {
    setCurrentPage('vote');
  };

  return (
    <>
      {/* Debug Panel */}
      {/* <DebugPanel questionId={currentQuestionId} /> */}
      
      {/* Main Content */}
      {currentPage === 'home' && (
        <HomePage 
          onStartPlaying={handleStartPlaying}
          onShowStats={handleShowStats}
        />
      )}
      
      {currentPage === 'vote' && currentQuestionId && (
        <VotePredictionPage
          questionId={currentQuestionId}
          onBack={handleBackToHome}
          onShowResults={handleShowResults}
        />
      )}
      
      {currentPage === 'results' && currentQuestionId && (
        <ResultsPage
          questionId={currentQuestionId}
          onBack={handleBackToVote}
        />
      )}
      
      {currentPage === 'stats' && (
        <PersonalStatsPage
          onBack={handleBackToHome}
        />
      )}
    </>
  );
};

export const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};
