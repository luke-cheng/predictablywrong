// API contract types for client-server communication
// These define the request/response structure for API endpoints

import type { 
  Question, 
  Vote, 
  PredictionResult, 
  UserStats, 
  VoteHistogram 
} from './core';

// ===== API ENDPOINTS =====
export const API_ENDPOINTS = {
  // Game state endpoints
  CURRENT_QUESTION: '/api/current-question',
  YESTERDAY_RESULTS: '/api/yesterday-results',
  
  // Voting endpoints
  VOTE: '/api/vote',
  MY_VOTE: '/api/my-vote',
  
  // Prediction endpoints
  PREDICT: '/api/predict',
  MY_PREDICTION: '/api/my-prediction',
  
  // Question submission
  SUBMIT_QUESTION: '/api/submit-question',
  
  // User stats and history
  MY_HISTORY: '/api/my-history',
  MY_STATS: '/api/my-stats',
  QUESTION_DETAILS: '/api/question-details',
  
  // Admin endpoints (for selecting tomorrow's question)
  QUESTIONS: '/api/questions',
  SELECT_QUESTION: '/api/select-question',
} as const;

// ===== REQUEST/RESPONSE TYPES =====

// GET /api/current-question
export type CurrentQuestionResponse = {
  type: 'current_question';
  question: Question | null;
  myVote: Vote | null;
};

// GET /api/yesterday-results
export type YesterdayResultsResponse = {
  type: 'yesterday_results';
  question: Question | null;
  myPrediction: PredictionResult | null;
  myVote: Vote | null;
};

// GET /api/my-vote
export type MyVoteResponse = {
  type: 'my_vote';
  vote: Vote | null;
  question: Question | null;
};

// GET /api/my-prediction
export type MyPredictionResponse = {
  type: 'my_prediction';
  prediction: PredictionResult | null;
  question: Question | null;
};

// POST /api/vote
export type VoteRequest = {
  questionId: string;
  value: number; // -50 to 50 scale
};

export type VoteResponse = {
  type: 'vote';
  success: boolean;
  vote: Vote;
  voteHistogram: VoteHistogram; // For client to generate graph
  message?: string;
};

// POST /api/predict
export type PredictRequest = {
  questionId: string;
  predictedAverage: number; // -50 to 50 scale
};

export type PredictResponse = {
  type: 'prediction';
  success: boolean;
  prediction: PredictionResult;
  actualAverage: number;
  isCorrect: boolean;
  voteHistogram: VoteHistogram; // For client to generate graph
  message?: string;
};

// POST /api/submit-question
export type SubmitQuestionRequest = {
  questionText: string;
};

export type SubmitQuestionResponse = {
  type: 'question_submission';
  success: boolean;
  questionId: string;
  message?: string;
};

// GET /api/my-history
export type MyHistoryRequest = {
  limit?: number;
  offset?: number;
};

export type MyHistoryResponse = {
  type: 'my_history';
  userHistory: Array<{
    question: Question;
    myVote: number | null;
    myPrediction: number | null;
    predictionCorrect: boolean | null;
    predictionAccuracy: number | null;
    voteHistogram: VoteHistogram; // Complete histogram for charting
  }>;
  totalCount: number;
  message?: string;
};

// GET /api/my-stats
export type MyStatsResponse = {
  type: 'my_stats';
  userStats: UserStats;
  message?: string;
};

// GET /api/question-details/{questionId}
export type QuestionDetailsResponse = {
  type: 'question_details';
  questionDetails: {
    question: Question;
    myVote: number | null;
    myPrediction: number | null;
    predictionCorrect: boolean | null;
    predictionAccuracy: number | null;
    voteHistogram: VoteHistogram; // Complete histogram for charting
    allVotes: Vote[];
    allPredictions: PredictionResult[];
  };
  message?: string;
};

// Admin endpoints
// GET /api/questions
export type QuestionsResponse = {
  type: 'questions';
  submittedQuestions: Array<{
    id: string;
    text: string;
    submittedBy: string;
    submittedAt: string;
    upvotes: number;
  }>;
  message?: string;
};

// POST /api/select-question
export type SelectQuestionRequest = {
  questionId: string;
};

export type SelectQuestionResponse = {
  type: 'select_question';
  success: boolean;
  selectedQuestion: Question;
  message?: string;
};
