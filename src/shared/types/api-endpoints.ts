// DEPRECATED: This file is being replaced by the new structure
// Use: src/shared/types/api.ts for API contracts
// Use: src/shared/types/core.ts for core data types
// Use: src/server/types/database.ts for server-specific types
// Use: src/client/types/ui.ts for client-specific types

// Re-export for backward compatibility
export { API_ENDPOINTS } from './api';
export type {
  CurrentQuestionResponse,
  YesterdayResultsResponse,
  MyVoteResponse,
  MyPredictionResponse,
  VoteRequest,
  VoteResponse,
  PredictRequest,
  PredictResponse,
  SubmitQuestionRequest,
  SubmitQuestionResponse,
  MyHistoryRequest,
  MyHistoryResponse,
  MyStatsResponse,
  QuestionDetailsResponse,
  QuestionsResponse,
  SelectQuestionRequest,
  SelectQuestionResponse,
} from './api';
