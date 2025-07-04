# Redis & RabbitMQ Implementation Examples 🚀

## Table of Contents
- [Redis Patterns](#redis-patterns)
- [RabbitMQ Patterns](#rabbitmq-patterns)
- [Combined Patterns](#combined-patterns)
- [Performance Benchmarks](#performance-benchmarks)

## Redis Patterns

### 1. Caching Strategies

#### Simple Key-Value Cache
```javascript
// Basic cache implementation
const Redis = require('ioredis');
const redis = new Redis();

async function cacheData(key, data, ttl = 3600) {
  await redis.setex(key, ttl, JSON.stringify(data));
}

async function getCachedData(key) {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}
```

#### Cache-Aside Pattern
```javascript
async function getUser(userId) {
  // Try cache first
  const cachedUser = await getCachedData(`user:${userId}`);
  if (cachedUser) return cachedUser;

  // Cache miss - get from DB
  const user = await db.users.findById(userId);
  if (user) {
    await cacheData(`user:${userId}`, user);
  }
  return user;
}
```

#### Write-Through Cache
```javascript
async function updateUser(userId, userData) {
  // Update DB first
  const updatedUser = await db.users.update(userId, userData);
  
  // Then update cache
  await cacheData(`user:${userId}`, updatedUser);
  return updatedUser;
}
```

### 2. Redis Data Structures

#### Sorted Sets for Leaderboards
```javascript
async function updateScore(userId, score) {
  await redis.zadd('leaderboard', score, userId);
}

async function getTopPlayers(count = 10) {
  return redis.zrevrange('leaderboard', 0, count - 1, 'WITHSCORES');
}
```

#### Lists for Recent Items
```javascript
async function addRecentItem(item) {
  await redis.lpush('recent_items', JSON.stringify(item));
  await redis.ltrim('recent_items', 0, 9); // Keep only 10 items
}

async function getRecentItems() {
  return redis.lrange('recent_items', 0, -1);
}
```

#### Hash Sets for Session Storage
```javascript
async function saveSession(sessionId, userData) {
  await redis.hmset(`session:${sessionId}`, userData);
  await redis.expire(`session:${sessionId}`, 3600); // 1 hour TTL
}

async function getSession(sessionId) {
  return redis.hgetall(`session:${sessionId}`);
}
```

## RabbitMQ Patterns

### 1. Basic Message Patterns

#### Publisher-Subscriber
```javascript
const amqp = require('amqplib');

// Publisher
async function publishEvent(event) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  const exchange = 'events';
  await channel.assertExchange(exchange, 'fanout', { durable: false });
  channel.publish(exchange, '', Buffer.from(JSON.stringify(event)));
}

// Subscriber
async function subscribeToEvents(callback) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  const exchange = 'events';
  await channel.assertExchange(exchange, 'fanout', { durable: false });
  const q = await channel.assertQueue('', { exclusive: true });
  
  await channel.bindQueue(q.queue, exchange, '');
  channel.consume(q.queue, msg => {
    callback(JSON.parse(msg.content.toString()));
  }, { noAck: true });
}
```

#### Work Queue Pattern
```javascript
// Task Producer
async function queueTask(task) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  const queue = 'task_queue';
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(task)), {
    persistent: true
  });
}

// Worker
async function processTasks() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  const queue = 'task_queue';
  await channel.assertQueue(queue, { durable: true });
  channel.prefetch(1);
  
  channel.consume(queue, async msg => {
    const task = JSON.parse(msg.content.toString());
    await processTask(task);
    channel.ack(msg);
  });
}
```

### 2. Advanced Patterns

#### Dead Letter Exchange
```javascript
async function setupDeadLetterQueue() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  // Setup dead letter exchange
  await channel.assertExchange('dlx', 'direct');
  const dlq = await channel.assertQueue('dead_letter_queue');
  await channel.bindQueue(dlq.queue, 'dlx', 'dead');
  
  // Main queue with dead letter config
  await channel.assertQueue('main_queue', {
    deadLetterExchange: 'dlx',
    deadLetterRoutingKey: 'dead'
  });
}
```

#### Priority Queue
```javascript
async function setupPriorityQueue() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  await channel.assertQueue('priority_queue', {
    maxPriority: 10
  });
}

async function sendPriorityMessage(msg, priority) {
  channel.sendToQueue('priority_queue', Buffer.from(msg), {
    priority: priority // 0-10
  });
}
```

## Combined Patterns

### 1. Caching with Message Queue
```javascript
// Cache invalidation via message queue
async function setupCacheInvalidation() {
  await subscribeToEvents(async event => {
    if (event.type === 'DATA_UPDATED') {
      await redis.del(`data:${event.id}`);
    }
  });
}

// Update data with cache invalidation
async function updateData(id, data) {
  // Update database
  await db.update(id, data);
  
  // Publish cache invalidation event
  await publishEvent({
    type: 'DATA_UPDATED',
    id: id
  });
}
```

### 2. Rate Limiting with Redis
```javascript
async function rateLimiter(key, limit, window) {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }
  return current <= limit;
}

// Usage with RabbitMQ consumer
channel.consume('queue', async msg => {
  const allowed = await rateLimiter('api_calls', 100, 60);
  if (allowed) {
    await processMessage(msg);
    channel.ack(msg);
  } else {
    // Requeue or move to dead letter
    channel.nack(msg);
  }
});
```

## Performance Benchmarks

### Redis Performance Tests
```javascript
async function redisBenchmark() {
  const start = Date.now();
  const iterations = 10000;
  
  for (let i = 0; i < iterations; i++) {
    await redis.set(`key${i}`, `value${i}`);
    await redis.get(`key${i}`);
  }
  
  const duration = Date.now() - start;
  console.log(`Redis: ${iterations} operations in ${duration}ms`);
  console.log(`Average: ${duration/iterations}ms per operation`);
}
```

### RabbitMQ Performance Tests
```javascript
async function rabbitmqBenchmark() {
  const start = Date.now();
  const iterations = 10000;
  
  for (let i = 0; i < iterations; i++) {
    await channel.sendToQueue('benchmark', Buffer.from(`message${i}`));
  }
  
  const duration = Date.now() - start;
  console.log(`RabbitMQ: ${iterations} messages in ${duration}ms`);
  console.log(`Average: ${duration/iterations}ms per message`);
}
```

## Best Practices

### Redis Best Practices
1. Use appropriate data structures
2. Set TTL for cache entries
3. Implement cache invalidation
4. Use pipelining for bulk operations
5. Monitor memory usage

### RabbitMQ Best Practices
1. Use acknowledgments for important messages
2. Implement dead letter queues
3. Set appropriate prefetch values
4. Use persistent messages for critical data
5. Implement retry mechanisms

## Common Issues and Solutions

### Redis
1. Memory management
2. Cache invalidation strategies
3. Connection pooling
4. Error handling
5. Monitoring and alerts

### RabbitMQ
1. Message persistence
2. Queue overflow
3. Consumer scaling
4. Error handling
5. Dead letter handling

Remember to adapt these patterns based on your specific use case and requirements! 