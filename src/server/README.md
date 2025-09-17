# Predictably Wrong - Server Documentation

This document describes the server-side implementation of the Predictably Wrong game, including the database structure, API endpoints, and internal architecture.

## Overview

The server is a Node.js backend built on Devvit's serverless platform that provides:
- RESTful API endpoints for the game
- Redis-based data persistence
- User authentication via Reddit
- Real-time vote and prediction processing
- User-submitted question management

## Architecture

```
src/server/
├── index.ts          # Main server file and entry point
├── core/             # Core business logic
│   └── redis.ts      # Redis database operations
├── routes/           # API route handlers
│   ├── api.ts        # Public API endpoints
│   ├── internal.ts   # Internal/cron job endpoints
│   ├── test.ts       # Test data management endpoints
│   ├── menu.ts       # Menu action handlers
│   └── index.ts      # Route exports
├── types/            # Server-specific types
│   └── database.ts   # Database types and Redis key patterns
└── README.md         # This file
```

## Database Structure

The application uses Redis because it is the only database option available under the Devvit framework. All data is stored using structured key patterns, as this is the only way to organize data in Redis.

### Redis Key Patterns

All Redis key patterns are centrally defined in `types/database.ts` as `REDIS_KEYS`:

```typescript
// Question data (using Reddit post IDs as question IDs)
question:{postId}:metadata     // Question details (text, date, stats, submittedBy)
question:{postId}:votes        // Hash of user votes for this question
question:{postId}:predictions  // Hash of user predictions for this question

// User data 
// Note that it has overlaps with question metadata, but we do not have access to a database besides Redis.

user:{userId}:history      // Sorted set of question IDs by timestamp
user:{userId}:votes        // Hash of user's votes by question ID
user:{userId}:predictions  // Hash of user's predictions by question ID
```

### Data Models

#### Question Metadata
Stored in `question:{postId}:metadata` as a Redis hash:
```typescript
{
  id: string;           // Question ID (Reddit post ID)
  text: string;         // Question text
  date: string;         // ISO date string
  totalVotes: string;   // Number of votes (Redis stores as string)
  voteSum: string;      // Sum of all votes (for average calculation)
  isActive: string;     // '1' for active, '0' for closed
  submittedBy: string;  // Username who submitted the question
}
```

#### Vote Data
Stored in `question:{id}:votes` as a Redis hash:
```typescript
{
  [userId]: string;     // Vote value (-10 to 10) as string
}
```

#### Prediction Data
Stored in `question:{id}:predictions` as a Redis hash:
```typescript
{
  [userId]: string;     // Predicted average (-10 to 10) as string
}
```

#### User History
Stored in `user:{userId}:history` as a Redis sorted set:
```typescript
{
  member: string;       // Question ID
  score: number;        // Timestamp in milliseconds
}
```

#### Vote Histogram
Generated on-demand for API responses:
```typescript
{
  buckets: VoteDistribution[];  // 21 buckets from -10 to 10
  totalVotes: number;           // Total number of votes
  averageVote: number;         // Calculated average vote
}
```

## Core Services

### GameRedis Class

The `GameRedis` class in `core/redis.ts` provides a high-level interface for all database operations:

#### Question Operations
- `addQuestion(question)` - Store a new question
- `getQuestion(id)` - Retrieve question by ID
- `getQuestionsByIds(ids)` - Retrieve multiple questions
- `deleteQuestion(id)` - Remove question and all related data
- `setQuestionActive(id, isActive)` - Update question status

#### Vote Operations
- `addVote(vote)` - Add a user vote (updates question stats)
- `getUserVote(userId, questionId)` - Get user's vote for a question
- `getQuestionVotes(questionId)` - Get all votes for a question
- `getVoteDistribution(questionId)` - Get vote distribution for charts
- `getVoteHistogram(questionId)` - Get complete vote histogram with all buckets (-10 to 10)

#### Prediction Operations
- `addPrediction(prediction)` - Add a user prediction
- `getUserPrediction(userId, questionId)` - Get user's prediction
- `getQuestionPredictions(questionId)` - Get all predictions for a question

#### User Data Operations
- `getUserHistory(userId, limit?, offset?)` - Get user's question history
- `calculateUserStats(userId)` - Calculate comprehensive user statistics
- `setUserDataExpiration(userId, days?)` - Set TTL for user data

#### State Management
- `setTodayQuestionId(id)` - Set current day's question
- `setYesterdayQuestionId(id)` - Set previous day's question
- `getTodayQuestionId()` - Get today's question ID
- `getYesterdayQuestionId()` - Get yesterday's question ID
- `getCurrentQuestion()` - Get today's active question
- `getYesterdayQuestion()` - Get yesterday's question

### Data Consistency

The Redis operations use transactions where necessary to ensure data consistency:

```typescript
// Example: Adding a vote updates multiple keys atomically
const txn = await this.redis.watch(KEYS.QUESTION_VOTES(vote.questionId));
await txn.multi();
await txn.hSet(KEYS.QUESTION_VOTES(vote.questionId), { [vote.userId]: vote.value.toString() });
await txn.hSet(KEYS.USER_VOTES(vote.userId), { [vote.questionId]: vote.value.toString() });
await txn.zAdd(KEYS.USER_HISTORY(vote.userId), {
  member: vote.questionId,
  score: new Date(vote.timestamp).getTime(),
});
await txn.exec();
```

## Route Organization

The server endpoints are organized into separate files for better maintainability:

### Public API Routes (`routes/api.ts`)
- Voting endpoints (`/api/vote`, `/api/my-vote/:questionId`)
- Prediction endpoints (`/api/predict`, `/api/my-prediction/:questionId`)
- User data endpoints (`/api/my-history`, `/api/my-stats`, `/api/question-details/:questionId`)
- Question management (`/api/questions`)

### Menu Routes (`routes/menu.ts`)
- Question submission (`/internal/menu/submit-question`)
- Form handling (`/internal/form/question-submit`)

### Internal Routes (`routes/internal.ts`)
- Cron job endpoints (`/internal/jobs/close-voting`, `/internal/jobs/weekly-cleanup`)
- System maintenance and automation

### Test Routes (`routes/test.ts`)
- Test data management (`/api/test/reset-all`, `/api/test/reset-user/:userId`)
- Development and testing utilities

## API Endpoints

The server implements all endpoints defined in the [shared API documentation](../shared/readme.md):

### Voting
- `GET /api/my-vote/:questionId` - Get user's vote for a specific question
- `POST /api/vote` - Submit a vote

### Predictions
- `GET /api/my-prediction/:questionId` - Get user's prediction for a specific question
- `POST /api/predict` - Submit a prediction

### User Data
- `GET /api/my-history` - Get user's history
- `GET /api/my-stats` - Get user's statistics
- `GET /api/question-details/:questionId` - Get question details

### Question Management
- `GET /api/questions` - Get all submitted questions

### Menu Actions
- `POST /internal/menu/submit-question` - Show question submission form
- `POST /internal/form/question-submit` - Process question submission

### Internal Jobs
- `POST /internal/jobs/close-voting` - Close voting on questions after 24 hours
- `POST /internal/jobs/weekly-cleanup` - Clean up old data

## Data Lifecycle

### Question Lifecycle
1. **Creation**: Questions are created via user submission through menu action
2. **Active Period**: Users can vote and make predictions (voting closes after 24 hours)
3. **Closure**: Voting closes automatically, predictions remain open
4. **Archival**: Question becomes available for result viewing

### User Data Lifecycle
1. **Creation**: User data is created on first vote/prediction
2. **Updates**: Data is updated with each new vote/prediction
3. **Expiration**: User data expires after 30 days (configurable)
4. **Cleanup**: Weekly cleanup job removes expired data

## Performance Considerations

### Redis Optimizations
- Use hash operations for efficient vote/prediction storage
- Use sorted sets for chronological user history
- Batch operations where possible
- Set appropriate TTLs to prevent memory bloat

### Caching Strategy
- Question metadata is cached in memory during active periods
- Vote distributions are calculated on-demand
- User stats are calculated on-demand (could be cached for active users)

## Error Handling

The server implements comprehensive error handling:

```typescript
try {
  // API operation
  const result = await gameRedis.getCurrentQuestion();
  res.json(result);
} catch (error) {
  console.error('Error getting current question:', error);
  res.status(500).json({ error: 'Failed to get current question' });
}
```

## Security

- All user operations require Reddit authentication
- Input validation on all endpoints
- Rate limiting considerations (not yet implemented)
- Data sanitization for user inputs

## Monitoring and Logging

- All operations are logged with appropriate detail levels
- Error tracking for failed operations
- Performance monitoring for database operations

## Development

### Local Development

You can't run the server locally. Devvit runs the server on their platform to a dev subreddit.

### Testing (TODO)
- Unit tests for Redis operations
- Integration tests for API endpoints
- Load testing for vote processing

## Related Documentation

- [Shared API Documentation](../shared/readme.md) - Complete API contract and data types
- [Core Types](../shared/types/core.ts) - Shared data structures
- [API Types](../shared/types/api.ts) - Request/response type definitions
- [Devvit Documentation](https://developers.reddit.com/docs) - Platform-specific documentation
