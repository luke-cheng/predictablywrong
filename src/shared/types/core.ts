// Core data types shared between client and server
// These represent the fundamental data structures of the game

export type Question = {
  id: string;
  text: string;
  date: string;
  totalVotes: number;
  averageVote: number; // -10 to 10 scale
  isActive: boolean; // true = voting open, false = closed
  submittedBy?: string; // Username who submitted the question
  closingDate?: string; // ISO date string when voting closes (optional for backward compatibility)
};

export type Vote = {
  userId: string;
  questionId: string;
  value: number; // -10 to 10 scale
  timestamp: string;
};

// Raw prediction data (what client sends to server)
export type PredictionInput = {
  userId: string;
  questionId: string;
  predictedAverage: number; // -10 to 10 scale
  timestamp: string;
};

// Computed prediction data (what server calculates and sends to client)
export type PredictionResult = {
  userId: string;
  questionId: string;
  predictedAverage: number; // -10 to 10 scale
  actualAverage: number; // -10 to 10 scale
  isCorrect: boolean; // within some threshold
  accuracy: number; // distance from actual result
  timestamp: string;
};

// Legacy type for backward compatibility
export type Prediction = PredictionResult;

export type UserStats = {
  totalVotes: number;
  correctPredictions: number;
  totalPredictions: number;
  questionsSubmitted: number;
  questionsSelected: number;
  averagePredictionAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  predictionAccuracy: number;
};

export type VoteDistribution = {
  value: number; // -10 to 10 scale
  count: number; // number of votes at this value
};

// Complete histogram for charting (all buckets, even zero counts)
export type VoteHistogram = {
  buckets: VoteDistribution[]; // 21 buckets from -10 to 10
  totalVotes: number;
  averageVote: number;
};

// Base game state shared between client and server
export type BaseGameState = {
  myVote: Vote | null;
  myPrediction: PredictionResult | null;
};

// Form data types (re-exported from API types for consistency)
export type VoteFormData = {
  questionId: string;
  value: number; // -10 to 10 scale
};

export type PredictionFormData = {
  questionId: string;
  predictedAverage: number; // -10 to 10 scale
};

export type QuestionSubmissionFormData = {
  questionText: string;
};
