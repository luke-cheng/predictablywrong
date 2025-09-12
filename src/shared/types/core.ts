// Core data types shared between client and server
// These represent the fundamental data structures of the game

export type Question = {
  id: string;
  text: string;
  date: string;
  totalVotes: number;
  averageVote: number; // -50 to 50 scale
  isActive: boolean; // true = voting open, false = closed
};

export type Vote = {
  userId: string;
  questionId: string;
  value: number; // -50 to 50 scale
  timestamp: string;
};

// Raw prediction data (what client sends to server)
export type PredictionInput = {
  userId: string;
  questionId: string;
  predictedAverage: number; // -50 to 50 scale
  timestamp: string;
};

// Computed prediction data (what server calculates and sends to client)
export type PredictionResult = {
  userId: string;
  questionId: string;
  predictedAverage: number; // -50 to 50 scale
  actualAverage: number; // -50 to 50 scale
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
  value: number; // -50 to 50 scale
  count: number; // number of votes at this value
};

// Complete histogram for charting (all buckets, even zero counts)
export type VoteHistogram = {
  buckets: VoteDistribution[]; // 101 buckets from -50 to 50
  totalVotes: number;
  averageVote: number;
};
