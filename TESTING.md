# Testing Guide for Devvit Backend

## Overview

Since Devvit runs in a serverless environment on Reddit's infrastructure, you **cannot run your Express + Redis backend locally**. However, you can thoroughly test your backend logic using unit tests and integration tests with mocked dependencies.

## Testing Strategy

### 1. Unit Tests (Recommended)
- **What**: Test individual functions and classes in isolation
- **How**: Mock Redis and Reddit APIs
- **Benefits**: Fast, reliable, no external dependencies
- **Coverage**: Business logic, data transformations, error handling

### 2. Integration Tests
- **What**: Test API endpoints with mocked dependencies
- **How**: Use supertest with Express app
- **Benefits**: Test request/response flow, middleware, routing
- **Coverage**: Endpoint behavior, authentication, validation

### 3. Devvit Playtest (For Full Testing)
- **What**: Test on actual Reddit subreddit
- **How**: Use `devvit playtest` command
- **Benefits**: Real Redis, real Reddit auth, real environment
- **Limitations**: Requires Reddit subreddit, slower feedback

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests Once (CI Mode)
```bash
npm run test:run
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Structure

```
src/
├── test/
│   ├── setup.ts          # Global test setup and mocks
│   └── utils.ts           # Test utilities and helpers
├── server/
│   ├── core/
│   │   └── redis.test.ts  # GameRedis class tests
│   └── index.test.ts      # API endpoint tests
```

## What's Tested

### GameRedis Class (`redis.test.ts`)
- ✅ Question CRUD operations
- ✅ Vote operations and validation
- ✅ Prediction operations
- ✅ User history and statistics
- ✅ State management (today/yesterday questions)
- ✅ Data consistency and transactions
- ✅ Error handling

### API Endpoints (`index.test.ts`)
- ✅ GET /api/current-question
- ✅ POST /api/vote
- ✅ GET /api/my-stats
- ✅ Authentication handling
- ✅ Input validation
- ✅ Error responses

## Mock Strategy

### Redis Mocking
```typescript
const mockRedis = {
  hSet: vi.fn().mockResolvedValue(1),
  hGetAll: vi.fn().mockResolvedValue({}),
  hGet: vi.fn().mockResolvedValue(null),
  // ... other Redis methods
};
```

### Reddit API Mocking
```typescript
const mockReddit = {
  getCurrentUsername: vi.fn().mockResolvedValue('testuser'),
};
```

## Testing Best Practices

### 1. Test Data Isolation
- Each test creates fresh mock instances
- No shared state between tests
- Clean up after each test

### 2. Realistic Test Data
- Use realistic question texts
- Test edge cases (boundary values)
- Include both success and failure scenarios

### 3. Comprehensive Coverage
- Test happy paths
- Test error conditions
- Test edge cases
- Test authentication flows

### 4. Assertion Quality
- Test both return values and side effects
- Verify mock function calls
- Check error messages and status codes

## Example Test Cases

### Redis Operations
```typescript
it('should add a vote and update question stats', async () => {
  const vote = createMockVote();
  await gameRedis.addVote(vote);
  
  expect(mockRedis.watch).toHaveBeenCalledWith('question:test-question-1:votes');
  expect(mockRedis.multi).toHaveBeenCalled();
  expect(mockRedis.exec).toHaveBeenCalled();
});
```

### API Endpoints
```typescript
it('should reject invalid vote values', async () => {
  const response = await request(app)
    .post('/api/vote')
    .send({ questionId: 'test-question-1', value: 100 })
    .expect(400);

  expect(response.body.error).toBe('Vote value must be between -50 and 50');
});
```

## Devvit Playtest (Alternative Testing)

For full integration testing with real Redis and Reddit:

### 1. Set Up Development Subreddit
```bash
# Create a test subreddit on Reddit
# Example: r/yourusername-test
```

### 2. Configure Playtest
```bash
# Update package.json
"dev:devvit": "devvit playtest r/yourusername-test"
```

### 3. Run Playtest
```bash
npm run dev:devvit
```

### 4. Test in Browser
- Visit the generated test post URL
- Interact with your app
- Check Reddit logs for errors
- Test all user flows

## Continuous Integration

Add to your CI pipeline:
```yaml
- name: Run Tests
  run: npm run test:run

- name: Generate Coverage
  run: npm run test:coverage
```

## Debugging Tests

### Common Issues
1. **Mock not working**: Check `vi.mock()` calls in setup
2. **Async/await**: Ensure proper async test functions
3. **Type errors**: Use `as any` for mock types when needed

### Debug Commands
```bash
# Run specific test file
npm test redis.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Debug mode
npm test -- --inspect-brk
```

## Future Enhancements

- Add performance tests
- Add load testing for vote processing
- Add end-to-end tests with Playwright
- Add contract tests for API responses
- Add database migration tests

## Conclusion

While you can't run your Devvit backend locally, comprehensive unit and integration tests provide excellent coverage of your business logic. Use `devvit playtest` for final validation before deployment to production.