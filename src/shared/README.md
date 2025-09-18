# Predictably Wrong - API Documentation

This document describes the API contract between the client (webview) and server (Node.js backend) for the Predictably Wrong game.

## Overview

The Predictably Wrong game is a prediction game where users:
1. Submit controversial questions via Reddit menu actions
2. Share their opinion on questions using a -10 to +10 scale
3. Predict what the average opinion will be
4. See how accurate their predictions are compared to the actual results

## API Endpoints

### Question Management Endpoints

#### GET `/api/questions`
Get all submitted questions.

**Response:**
```typescript
{
  type: 'questions';
  submittedQuestions: Question[];
  message?: string;
}
```

### Opinion Endpoints

#### GET `/api/my-vote/:questionId`
Get the current user's opinion for a specific question.

**Response:**
```typescript
{
  type: 'my_vote';
  vote: Vote | null;
  question: Question;
}
```

#### POST `/api/vote`
Submit an opinion for a question.

**Request:**
```typescript
{
  questionId: string;
  value: number; // -10 to 10 scale
}
```

**Response:**
```typescript
{
  type: 'vote';
  success: boolean;
  vote: Vote;
  voteHistogram: VoteHistogram; // For client to generate graph
  message?: string;
}
```

### Prediction Endpoints

#### GET `/api/my-prediction/:questionId`
Get the current user's prediction for a specific question.

**Response:**
```typescript
{
  type: 'my_prediction';
  prediction: PredictionResult | null;
  question: Question;
}
```

#### POST `/api/predict`
Submit a prediction for a question.

**Request:**
```typescript
{
  questionId: string;
  predictedAverage: number; // -10 to 10 scale
}
```

**Response:**
```typescript
{
  type: 'prediction';
  success: boolean;
  prediction: PredictionResult;
  actualAverage: number;
  isCorrect: boolean;
  voteHistogram: VoteHistogram; // For client to generate graph
  message?: string;
}
```

### Menu Actions

Questions are submitted via Reddit menu actions, not direct API calls:

#### POST `/internal/menu/submit-question`
Shows a form for question submission (triggered by menu action).

#### POST `/internal/form/question-submit`
Processes the submitted question form.

### User Data Endpoints

#### GET `/api/my-history`
Get the user's opinion and prediction history.

**Query Parameters:**
- `limit?: number` - Number of results to return
- `offset?: number` - Number of results to skip

**Response:**
```typescript
{
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
}
```

#### GET `/api/my-stats`
Get the user's overall statistics.

**Response:**
```typescript
{
  type: 'my_stats';
  userStats: UserStats;
  message?: string;
}
```

#### GET `/api/question-details/{questionId}`
Get detailed information about a specific question.

**Response:**
```typescript
{
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
}
```

### Admin Endpoints

#### GET `/api/questions`
Get all submitted questions (admin only).

**Response:**
```typescript
{
  type: 'questions';
  submittedQuestions: Array<{
    id: string;
    text: string;
    submittedBy: string;
    submittedAt: string;
    upvotes: number;
  }>;
  message?: string;
}
```

### Internal Jobs

#### POST `/internal/jobs/close-voting`
Automatically closes opinion gathering on questions that have been active for 24+ hours.

#### POST `/internal/jobs/weekly-cleanup`
Cleans up old user data and expired questions.

## Data Types

### Question
```typescript
{
  id: string;           // Reddit post ID used as question ID
  text: string;
  date: string;
  totalVotes: number;
  averageVote: number; // -10 to 10 scale
  isActive: boolean;   // true = opinion gathering open, false = closed
  submittedBy?: string; // Username who submitted the question
}
```

### Opinion
```typescript
{
  userId: string;
  questionId: string;
  value: number; // -10 to 10 scale
  timestamp: string;
}
```

### PredictionResult
```typescript
{
  userId: string;
  questionId: string;
  predictedAverage: number; // -10 to 10 scale
  actualAverage: number; // -10 to 10 scale
  isCorrect: boolean; // within some threshold
  accuracy: number; // distance from actual result
  timestamp: string;
}
```

### UserStats
```typescript
{
  totalVotes: number;
  correctPredictions: number;
  totalPredictions: number;
  questionsSubmitted: number;
  questionsSelected: number;
  averagePredictionAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  predictionAccuracy: number;
}
```

### OpinionDistribution
```typescript
{
  value: number; // -10 to 10 scale
  count: number; // number of opinions at this value
}
```

### OpinionHistogram
```typescript
{
  buckets: OpinionDistribution[]; // 101 buckets from -10 to 10
  totalVotes: number;
  averageVote: number;
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (user not authenticated)
- `404` - Not Found (question not found)
- `500` - Internal Server Error

Error responses include an `error` field with a descriptive message:
```typescript
{
  error: string;
}
```

## Authentication

The API uses Reddit's authentication system. All endpoints that require user data will automatically get the current user from the Reddit context. If no user is authenticated, endpoints will return a 401 status.

## Rate Limiting

Currently no rate limiting is implemented, but it may be added in the future to prevent abuse.

## Data Persistence

User data is stored in Redis with a 30-day TTL. Questions and their results are stored permanently for historical analysis.

## Client Usage

From the client (webview), make requests to the API endpoints using `fetch()`:

```typescript
// Get current question
const response = await fetch('/api/current-question');
const data = await response.json();

// Submit a vote
const voteResponse = await fetch('/api/vote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ questionId: 'q123', value: 5 })
});
```

## Related Documentation

- [Server Database Documentation](../server/README.md) - Details about the Redis database structure and server implementation
- [Core Types](./types/core.ts) - Shared TypeScript types
- [API Types](./types/api.ts) - API request/response type definitions
