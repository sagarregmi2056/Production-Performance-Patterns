const { MongoClient } = require('mongodb');
const Benchmark = require('benchmark');
const microtime = require('microtime');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/benchmark_db';
const client = new MongoClient(uri);

// Test data generation
const generateUsers = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: Math.floor(Math.random() * 50) + 18,
    city: ['New York', 'London', 'Tokyo', 'Paris', 'Berlin'][Math.floor(Math.random() * 5)],
    posts: Array.from({ length: 5 }, (_, j) => ({
      title: `Post ${j}`,
      content: `Content ${j}`,
      createdAt: new Date()
    }))
  }));
};

async function setupDatabase() {
  try {
    await client.connect();
    const db = client.db();
    
    // Clear existing data
    await db.collection('users').deleteMany({});
    await db.collection('posts').deleteMany({});
    
    // Insert test data
    const users = generateUsers(10000);
    await db.collection('users').insertMany(users);
    
    // Create indexes
    await db.collection('users').createIndex({ email: 1 });
    await db.collection('users').createIndex({ age: 1 });
    await db.collection('users').createIndex({ city: 1 });
    
    console.log('Database setup completed');
  } catch (err) {
    console.error('Setup error:', err);
    process.exit(1);
  }
}

// Benchmark Suites
async function runQueryBenchmarks() {
  const db = client.db();
  const suite = new Benchmark.Suite;
  
  // 1. Simple Query vs Indexed Query
  suite.add('Query without index', {
    defer: true,
    fn: async (deferred) => {
      await db.collection('users').find({ name: 'User 100' }).toArray();
      deferred.resolve();
    }
  })
  .add('Query with index', {
    defer: true,
    fn: async (deferred) => {
      await db.collection('users').find({ email: 'user100@example.com' }).toArray();
      deferred.resolve();
    }
  })
  
  // 2. Project vs Full Document
  .add('Full document query', {
    defer: true,
    fn: async (deferred) => {
      await db.collection('users').find({ age: { $gte: 25 } }).toArray();
      deferred.resolve();
    }
  })
  .add('Projected query', {
    defer: true,
    fn: async (deferred) => {
      await db.collection('users').find(
        { age: { $gte: 25 } },
        { projection: { name: 1, email: 1 } }
      ).toArray();
      deferred.resolve();
    }
  })
  
  // 3. Individual vs Bulk Operations
  .add('Individual inserts', {
    defer: true,
    fn: async (deferred) => {
      const users = generateUsers(100);
      for (const user of users) {
        await db.collection('users').insertOne(user);
      }
      deferred.resolve();
    }
  })
  .add('Bulk inserts', {
    defer: true,
    fn: async (deferred) => {
      const users = generateUsers(100);
      await db.collection('users').insertMany(users);
      deferred.resolve();
    }
  })
  
  // 4. Regular Aggregation vs Optimized Aggregation
  .add('Unoptimized aggregation', {
    defer: true,
    fn: async (deferred) => {
      await db.collection('users').aggregate([
        { $sort: { age: -1 } },
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $match: { count: { $gt: 10 } } }
      ]).toArray();
      deferred.resolve();
    }
  })
  .add('Optimized aggregation', {
    defer: true,
    fn: async (deferred) => {
      await db.collection('users').aggregate([
        { $match: { age: { $gt: 25 } } },
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $match: { count: { $gt: 10 } } },
        { $sort: { count: -1 } }
      ]).toArray();
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

// Time-based benchmarks for specific operations
async function runTimedBenchmarks() {
  const db = client.db();
  const iterations = 1000;
  
  console.log('\nRunning timed benchmarks...');

  // 1. Read Performance with Different Batch Sizes
  const batchSizes = [10, 100, 1000];
  for (const size of batchSizes) {
    const start = microtime.now();
    for (let i = 0; i < iterations; i++) {
      await db.collection('users')
        .find({})
        .limit(size)
        .toArray();
    }
    const end = microtime.now();
    console.log(`Batch size ${size}: ${(end - start) / 1000000} seconds`);
  }

  // 2. Write Performance: Single vs Bulk
  const singleWriteStart = microtime.now();
  for (let i = 0; i < 100; i++) {
    await db.collection('users').insertOne({
      name: `Test User ${i}`,
      email: `test${i}@example.com`
    });
  }
  const singleWriteEnd = microtime.now();
  console.log(`Single writes: ${(singleWriteEnd - singleWriteStart) / 1000000} seconds`);

  const bulkWriteStart = microtime.now();
  const bulkOp = db.collection('users').initializeUnorderedBulkOp();
  for (let i = 0; i < 100; i++) {
    bulkOp.insert({
      name: `Test User ${i}`,
      email: `test${i}@example.com`
    });
  }
  await bulkOp.execute();
  const bulkWriteEnd = microtime.now();
  console.log(`Bulk writes: ${(bulkWriteEnd - bulkWriteStart) / 1000000} seconds`);
}

// Memory Usage Benchmarks
async function runMemoryBenchmarks() {
  const db = client.db();
  
  console.log('\nRunning memory usage benchmarks...');
  
  // 1. Large Result Set Memory Usage
  const baseMemory = process.memoryUsage().heapUsed;
  const results = await db.collection('users').find({}).toArray();
  const afterMemory = process.memoryUsage().heapUsed;
  console.log(`Memory for full result set: ${(afterMemory - baseMemory) / 1024 / 1024} MB`);

  // 2. Streamed Results Memory Usage
  const streamBaseMemory = process.memoryUsage().heapUsed;
  const cursor = db.collection('users').find({});
  let count = 0;
  while (await cursor.hasNext()) {
    await cursor.next();
    count++;
  }
  const streamAfterMemory = process.memoryUsage().heapUsed;
  console.log(`Memory for streamed results: ${(streamAfterMemory - streamBaseMemory) / 1024 / 1024} MB`);
}

// Run all benchmarks
async function runAllBenchmarks() {
  try {
    await setupDatabase();
    console.log('\nRunning query benchmarks...');
    await runQueryBenchmarks();
    await runTimedBenchmarks();
    await runMemoryBenchmarks();
  } catch (err) {
    console.error('Benchmark error:', err);
  } finally {
    await client.close();
  }
}

// Execute benchmarks
runAllBenchmarks(); 