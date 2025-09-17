import { useState, useEffect } from 'react';
import type { 
  QuestionDetailsResponse,
  MyVoteResponse,
  MyPredictionResponse,
  MyStatsResponse,
  MyHistoryResponse,
  VoteRequest,
  PredictRequest,
  SubmitQuestionRequest,
  VoteResponse,
  PredictResponse,
  SubmitQuestionResponse
} from '../../shared/types/api';

// Generic API hook for fetching data
export const useApi = () => {
  const fetchData = async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    return response.json();
  };

  return { fetchData };
};

// Hook for question details
export const useQuestionDetails = (questionId: string | null) => {
  const [data, setData] = useState<QuestionDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!questionId) return;

    const fetchQuestionDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/question-details/${questionId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch question details: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionDetails();
  }, [questionId]);

  return { data, loading, error };
};

// Hook for user's vote
export const useMyVote = (questionId: string | null) => {
  const [data, setData] = useState<MyVoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!questionId) return;

    const fetchMyVote = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/my-vote/${questionId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch my vote: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMyVote();
  }, [questionId]);

  return { data, loading, error };
};

// Hook for user's prediction
export const useMyPrediction = (questionId: string | null) => {
  const [data, setData] = useState<MyPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!questionId) return;

    const fetchMyPrediction = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/my-prediction/${questionId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch my prediction: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMyPrediction();
  }, [questionId]);

  return { data, loading, error };
};

// Hook for user stats
export const useMyStats = () => {
  const [data, setData] = useState<MyStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/my-stats');
        if (!response.ok) {
          throw new Error(`Failed to fetch my stats: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMyStats();
  }, []);

  return { data, loading, error };
};

// Hook for user history
export const useMyHistory = () => {
  const [data, setData] = useState<MyHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/my-history');
        if (!response.ok) {
          throw new Error(`Failed to fetch my history: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMyHistory();
  }, []);

  return { data, loading, error };
};

// Hook for submitting votes
export const useSubmitVote = () => {
  const [loading, setLoading] = useState(false);

  const submitVote = async (voteData: VoteRequest): Promise<VoteResponse> => {
    setLoading(true);
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit vote: ${response.statusText}`);
      }

      return response.json();
    } finally {
      setLoading(false);
    }
  };

  return { submitVote, loading };
};

// Hook for submitting predictions
export const useSubmitPrediction = () => {
  const [loading, setLoading] = useState(false);

  const submitPrediction = async (predictionData: PredictRequest): Promise<PredictResponse> => {
    setLoading(true);
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(predictionData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit prediction: ${response.statusText}`);
      }

      return response.json();
    } finally {
      setLoading(false);
    }
  };

  return { submitPrediction, loading };
};

// Hook for submitting questions
export const useSubmitQuestion = () => {
  const [loading, setLoading] = useState(false);

  const submitQuestion = async (questionData: SubmitQuestionRequest): Promise<SubmitQuestionResponse> => {
    setLoading(true);
    try {
      const response = await fetch('/api/submit-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit question: ${response.statusText}`);
      }

      return response.json();
    } finally {
      setLoading(false);
    }
  };

  return { submitQuestion, loading };
};
