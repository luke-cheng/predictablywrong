// Client-specific UI and component types
// These are internal to the client and not shared with server

import type { Question, Vote, PredictionResult, VoteHistogram } from '../../shared/types/core';

// UI component props
export type QuestionCardProps = {
  question: Question;
  myVote: Vote | null;
  onVote: (value: number) => void;
  disabled?: boolean;
};

export type PredictionCardProps = {
  question: Question;
  myPrediction: PredictionResult | null;
  onPredict: (value: number) => void;
  disabled?: boolean;
};

export type ResultsCardProps = {
  question: Question;
  myVote: Vote | null;
  myPrediction: PredictionResult | null;
  voteHistogram: VoteHistogram;
};

export type HistoryItemProps = {
  question: Question;
  myVote: number | null;
  myPrediction: number | null;
  predictionCorrect: boolean | null;
  predictionAccuracy: number | null;
  voteHistogram: VoteHistogram;
};

// Chart component types
export type LineChartData = {
  labels: string[]; // -50 to 50
  datasets: Array<{
    label: string;
    data: number[]; // vote counts
    borderColor: string;
    backgroundColor: string;
  }>;
};

export type VoteChartProps = {
  histogram: VoteHistogram;
  myVote?: number | null;
  averageVote: number;
};

// Form types
export type VoteFormData = {
  value: number; // -50 to 50
};

export type PredictionFormData = {
  predictedAverage: number; // -50 to 50
};

export type QuestionSubmissionFormData = {
  questionText: string;
};

// Client state types
export type GameState = {
  currentQuestion: Question | null;
  yesterdayQuestion: Question | null;
  myVote: Vote | null;
  myPrediction: PredictionResult | null;
  loading: boolean;
  error: string | null;
};

export type HistoryState = {
  items: HistoryItemProps[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
};

// Client hook types
export type UseGameReturn = {
  gameState: GameState;
  submitVote: (value: number) => Promise<void>;
  submitPrediction: (value: number) => Promise<void>;
  refreshGameState: () => Promise<void>;
};

export type UseHistoryReturn = {
  historyState: HistoryState;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
};
