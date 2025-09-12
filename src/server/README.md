# Predictably Wrong - Server Documentation

This document describes the server-side implementation of the Predictably Wrong game, including the database structure, API endpoints, and internal architecture.

## Overview

The server is a Node.js backend built on Devvit's serverless platform that provides:
- RESTful API endpoints for the game
- Redis-based data persistence
- User authentication via Reddit
- Real-time vote and prediction processing

## Architecture

```
src/server/
├── index.ts          # Main server file with API endpoints
├── core/             # Core business logic
│   ├── redis.ts      # Redis database operations
│   └── post.ts       # Reddit post creation
├── types/            # Server-specific types
│   └── database.ts   # Database and Redis types
└── README.md         # This file
```

## Database Structure

The application uses Redis as the primary database. All data is stored using structured key patterns for efficient querying and management.

### Redis Key Patterns

```typescript
// Question data
question:{id}:metadata     // Question details (text, date, stats)
question:{id}:votes        // Hash of user votes for this question
question:{id}:predictions  // Hash of user predictions for this question

// Current state
question:today:id          // ID of today's active question
question:yesterday:id      // ID of yesterday's question

// User data
user:{userId}:history      // Sorted set of question IDs by timestamp
user:{userId}:votes        // Hash of user's votes by question ID
user:{userId}:predictions  // Hash of user's predictions by question ID
```

### Data Models

#### Question Metadata
Stored in `question:{id}:metadata` as a Redis hash:
```typescript
{
  id: string;           // Question ID
  text: string;         // Question text
  date: string;         // ISO date string
  totalVotes: string;   // Number of votes (Redis stores as string)
  voteSum: string;      // Sum of all votes (for average calculation)
  isActive: string;     // '1' for active, '0' for closed
}
```

#### Vote Data
Stored in `question:{id}:votes` as a Redis hash:
```typescript
{
  [userId]: string;     // Vote value (-50 to 50) as string
}
```

#### Prediction Data
Stored in `question:{id}:predictions` as a Redis hash:
```typescript
{
  [userId]: string;     // Predicted average (-50 to 50) as string
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

## API Endpoints

The server implements all endpoints defined in the [shared API documentation](../shared/readme.md):

### Game State
- `GET /api/current-question` - Get current question and user vote
- `GET /api/yesterday-results` - Get yesterday's results

### Voting
- `GET /api/my-vote` - Get user's current vote
- `POST /api/vote` - Submit a vote

### Predictions
- `GET /api/my-prediction` - Get user's current prediction
- `POST /api/predict` - Submit a prediction

### User Data
- `GET /api/my-history` - Get user's history
- `GET /api/my-stats` - Get user's statistics
- `GET /api/question-details/:id` - Get question details

### Admin
- `GET /api/questions` - Get submitted questions
- `POST /api/select-question` - Select next day's question

### Internal Jobs
- `POST /internal/jobs/daily-results` - Process daily question selection
- `POST /internal/jobs/weekly-cleanup` - Clean up old data

## Data Lifecycle

### Question Lifecycle
1. **Creation**: Questions are created via admin selection or user submission
2. **Active Period**: Users can vote and make predictions
3. **Closure**: Voting closes, final results are calculated
4. **Archival**: Question becomes "yesterday's question" for result viewing

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
The server runs on Devvit's platform and can be tested locally using their development tools.

### Testing
- Unit tests for Redis operations
- Integration tests for API endpoints
- Load testing for vote processing

## Related Documentation

- [Shared API Documentation](../shared/readme.md) - Complete API contract and data types
- [Core Types](../shared/types/core.ts) - Shared data structures
- [API Types](../shared/types/api.ts) - Request/response type definitions
- [Devvit Documentation](https://developers.reddit.com/docs) - Platform-specific documentation

## Future Enhancements

- Implement question submission queue
- Add real-time vote updates via WebSockets
- Implement advanced analytics and insights
- Add question categories and tags
- Implement user reputation system
