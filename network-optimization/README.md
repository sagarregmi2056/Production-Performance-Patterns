# Network Call Optimization

## Why Network Optimization Matters

Network calls are often the biggest performance bottleneck in modern applications:
- Each HTTP request has overhead
- Network latency is unpredictable
- Mobile networks are unreliable
- Bandwidth costs money

## Key Optimization Strategies

### 1. Request Batching
```javascript
// Bad: Multiple individual requests
async function fetchUserData(userIds) {
  const users = [];
  for (const id of userIds) {
    users.push(await fetch(`/api/users/${id}`));
  }
  return users;
}

// Good: Single batched request
async function fetchUserData(userIds) {
  return fetch('/api/users/batch', {
    method: 'POST',
    body: JSON.stringify({ ids: userIds })
  });
}
```

### 2. Connection Pooling
```python
# Database connection pooling
pool = ConnectionPool(
    min_connections=5,
    max_connections=20,
    idle_timeout=300
)

async def get_connection():
    async with pool.acquire() as connection:
        return connection
```

### 3. Keep-Alive Connections
```python
# HTTP client with keep-alive
session = aiohttp.ClientSession()
async with session.get('https://api.example.com') as response:
    data = await response.json()
```

## GraphQL vs REST

### REST Multiple Requests
```javascript
// Need multiple requests for related data
async function getUserWithPosts(userId) {
  const user = await fetch(`/api/users/${userId}`);
  const posts = await fetch(`/api/users/${userId}/posts`);
  const comments = await fetch(`/api/users/${userId}/comments`);
  return { user, posts, comments };
}
```

### GraphQL Single Request
```graphql
query {
  user(id: "123") {
    name
    email
    posts {
      title
      content
    }
    comments {
      text
    }
  }
}
```

## Circuit Breakers

```javascript
class CircuitBreaker {
  constructor(request, options = {}) {
    this.request = request;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.failures = 0;
    this.state = 'CLOSED';
  }

  async execute() {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await this.request();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        setTimeout(() => {
          this.state = 'CLOSED';
          this.failures = 0;
        }, this.resetTimeout);
      }
      
      throw error;
    }
  }
}
```

## Best Practices

### 1. Request Optimization
- Use HTTP/2 multiplexing
- Implement request caching
- Compress payloads
- Use CDNs for static content

### 2. Response Optimization
- Implement pagination
- Use partial responses
- Stream large responses
- Compress responses

### 3. Error Handling
- Implement retries with backoff
- Use circuit breakers
- Handle timeouts gracefully
- Log network errors

### 4. Security
- Use HTTPS everywhere
- Implement rate limiting
- Validate request sizes
- Use API keys/tokens

## Common Anti-patterns

1. Not using connection pooling
2. Excessive polling
3. Chatty APIs
4. Not implementing timeouts
5. Missing retry logic

## Monitoring Network Performance

### Key Metrics
- Request latency
- Error rates
- Bandwidth usage
- Connection pool stats
- Cache hit rates

### Tools
- New Relic
- DataDog
- Prometheus
- Grafana
- Jaeger (tracing)

## Load Testing

```javascript
// k6 load test example
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('http://test.k6.io');
  check(res, { 'status was 200': (r) => r.status === 200 });
  sleep(1);
}
```

## Real-world Examples

### API Gateway Pattern
```javascript
class ApiGateway {
  async getUserProfile(userId) {
    const [user, posts, analytics] = await Promise.all([
      this.userService.getUser(userId),
      this.postService.getUserPosts(userId),
      this.analyticsService.getUserStats(userId)
    ]);

    return {
      ...user,
      posts,
      analytics
    };
  }
}
```

### Streaming Large Datasets
```javascript
async function* streamUsers() {
  let page = 1;
  while (true) {
    const users = await fetchUsers(page);
    if (users.length === 0) break;
    
    for (const user of users) {
      yield user;
    }
    page++;
  }
}

// Usage
for await (const user of streamUsers()) {
  processUser(user);
}
```

## Advanced Topics

1. WebSocket Optimization
2. gRPC Implementation
3. Service Mesh
4. Edge Computing
5. P2P Networking

## Performance Testing Tools

1. Apache JMeter
2. k6
3. Artillery
4. Gatling
5. Locust

## Further Reading

- [High Performance Browser Networking](https://hpbn.co/)
- [HTTP/2 Explained](https://daniel.haxx.se/http2/)
- [gRPC Documentation](https://grpc.io/docs/)
- [WebSocket Best Practices](https://websocket.org/) 