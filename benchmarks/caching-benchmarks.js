const { MongoClient } = require('mongodb');
const Redis = require('redis');
const Benchmark = require('benchmark');
const microtime = require('microtime');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/benchmark_db';
const mongoClient = new MongoClient(mongoUri);
const redisClient = Redis.createClient();

// In-memory cache
const memoryCache = new Map();
const CACHE_TTL = 300; // 5 minutes in seconds

// LRU Cache implementation
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

const lruCache = new LRUCache(1000);

// Setup test data
async function setupData() {
  try {
    await mongoClient.connect();
    await redisClient.connect();
    
    const db = mongoClient.db();
    await db.collection('users').deleteMany({});
    
    // Insert test data
    const users = Array.from({ length: 10000 }, (_, i) => ({
      _id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      profile: {
        age: Math.floor(Math.random() * 50) + 18,
        city: ['New York', 'London', 'Tokyo', 'Paris', 'Berlin'][Math.floor(Math.random() * 5)],
        interests: Array.from({ length: 5 }, (_, j) => `Interest ${j}`)
      }
    }));
    
    await db.collection('users').insertMany(users);
    console.log('Test data setup completed');
  } catch (err) {
    console.error('Setup error:', err);
    process.exit(1);
  }
}

// Benchmark different caching strategies
async function runCachingBenchmarks() {
  const db = mongoClient.db();
  const suite = new Benchmark.Suite;

  // 1. No Cache vs Different Cache Types
  suite.add('No cache', {
    defer: true,
    fn: async (deferred) => {
      const userId = Math.floor(Math.random() * 10000);
      await db.collection('users').findOne({ _id: userId });
      deferred.resolve();
    }
  })
  .add('In-memory cache', {
    defer: true,
    fn: async (deferred) => {
      const userId = Math.floor(Math.random() * 10000);
      const cacheKey = `user:${userId}`;
      
      if (memoryCache.has(cacheKey)) {
        memoryCache.get(cacheKey);
      } else {
        const user = await db.collection('users').findOne({ _id: userId });
        memoryCache.set(cacheKey, user);
      }
      deferred.resolve();
    }
  })
  .add('Redis cache', {
    defer: true,
    fn: async (deferred) => {
      const userId = Math.floor(Math.random() * 10000);
      const cacheKey = `user:${userId}`;
      
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        JSON.parse(cached);
      } else {
        const user = await db.collection('users').findOne({ _id: userId });
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(user));
      }
      deferred.resolve();
    }
  })
  .add('LRU cache', {
    defer: true,
    fn: async (deferred) => {
      const userId = Math.floor(Math.random() * 10000);
      const cacheKey = `user:${userId}`;
      
      let user = lruCache.get(cacheKey);
      if (!user) {
        user = await db.collection('users').findOne({ _id: userId });
        lruCache.set(cacheKey, user);
      }
      deferred.resolve();
    }
  });

  // Run benchmarks
  suite.on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });
}

// Time-based cache performance tests
async function runTimedCacheBenchmarks() {
  const db = mongoClient.db();
  const iterations = 1000;
  
  console.log('\nRunning timed cache benchmarks...');

  // 1. Cache Hit Performance
  const userId = Math.floor(Math.random() * 10000);
  const user = await db.collection('users').findOne({ _id: userId });
  
  // Warm up caches
  memoryCache.set(`user:${userId}`, user);
  await redisClient.setEx(`user:${userId}`, CACHE_TTL, JSON.stringify(user));
  lruCache.set(`user:${userId}`, user);

  // Memory Cache
  const memStart = microtime.now();
  for (let i = 0; i < iterations; i++) {
    memoryCache.get(`user:${userId}`);
  }
  const memEnd = microtime.now();
  console.log(`Memory cache hits: ${(memEnd - memStart) / 1000000} seconds`);

  // Redis Cache
  const redisStart = microtime.now();
  for (let i = 0; i < iterations; i++) {
    await redisClient.get(`user:${userId}`);
  }
  const redisEnd = microtime.now();
  console.log(`Redis cache hits: ${(redisEnd - redisStart) / 1000000} seconds`);

  // LRU Cache
  const lruStart = microtime.now();
  for (let i = 0; i < iterations; i++) {
    lruCache.get(`user:${userId}`);
  }
  const lruEnd = microtime.now();
  console.log(`LRU cache hits: ${(lruEnd - lruStart) / 1000000} seconds`);
}

// Memory usage comparison
async function runMemoryUsageBenchmarks() {
  const db = mongoClient.db();
  
  console.log('\nRunning memory usage benchmarks...');
  
  // Load test data
  const users = await db.collection('users').find({}).limit(1000).toArray();
  
  // Memory Cache
  const memBaseline = process.memoryUsage().heapUsed;
  users.forEach(user => {
    memoryCache.set(`user:${user._id}`, user);
  });
  const memAfter = process.memoryUsage().heapUsed;
  console.log(`Memory cache size: ${(memAfter - memBaseline) / 1024 / 1024} MB`);
  
  // LRU Cache
  const lruBaseline = process.memoryUsage().heapUsed;
  users.forEach(user => {
    lruCache.set(`user:${user._id}`, user);
  });
  const lruAfter = process.memoryUsage().heapUsed;
  console.log(`LRU cache size: ${(lruAfter - lruBaseline) / 1024 / 1024} MB`);
  
  // Redis memory usage is managed by the Redis server
}

// Run all benchmarks
async function runAllBenchmarks() {
  try {
    await setupData();
    console.log('\nRunning caching benchmarks...');
    await runCachingBenchmarks();
    await runTimedCacheBenchmarks();
    await runMemoryUsageBenchmarks();
  } catch (err) {
    console.error('Benchmark error:', err);
  } finally {
    await mongoClient.close();
    await redisClient.quit();
  }
}

// Execute benchmarks
runAllBenchmarks(); 