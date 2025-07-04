const { MongoClient } = require('mongodb');
const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/optimization_demo';
const client = new MongoClient(uri);

// Connection pool configuration
const clientOptions = {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
};

async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Create indexes for better performance
    const db = client.db();
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ age: 1 });
    await db.collection('posts').createIndex({ userId: 1 });
    await db.collection('posts').createIndex({ createdAt: -1 });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// Example of efficient querying
async function getUserWithPosts(userId) {
  const db = client.db();
  
  try {
    // Use Promise.all for parallel execution
    const [user, posts] = await Promise.all([
      // Project only needed fields
      db.collection('users').findOne(
        { _id: userId },
        { projection: { name: 1, email: 1 } }
      ),
      // Use limit for pagination
      db.collection('posts').find(
        { userId: userId }
      )
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()
    ]);

    return { user, posts };
  } catch (err) {
    console.error('Error fetching user data:', err);
    throw err;
  }
}

// Example of bulk operations
async function createBulkUsers(users) {
  const db = client.db();
  
  try {
    const bulk = db.collection('users').initializeUnorderedBulkOp();
    
    users.forEach(user => {
      bulk.insert(user);
    });

    return await bulk.execute();
  } catch (err) {
    console.error('Bulk operation error:', err);
    throw err;
  }
}

// Example of aggregation optimization
async function getUserStats(minAge) {
  const db = client.db();
  
  try {
    // Use aggregation pipeline optimization
    const stats = await db.collection('users').aggregate([
      // Early filtering to reduce documents
      { $match: { age: { $gte: minAge } } },
      // Group after filtering
      { $group: {
          _id: "$city",
          userCount: { $sum: 1 },
          avgAge: { $avg: "$age" }
        }
      },
      // Sort after reducing data
      { $sort: { userCount: -1 } }
    ]).toArray();

    return stats;
  } catch (err) {
    console.error('Aggregation error:', err);
    throw err;
  }
}

// Example of caching implementation
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

async function getUserWithCache(userId) {
  const cacheKey = `user:${userId}`;
  
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
    cache.delete(cacheKey);
  }

  const userData = await getUserWithPosts(userId);
  cache.set(cacheKey, {
    data: userData,
    timestamp: Date.now()
  });

  return userData;
}

// API Routes
app.get('/users/:userId', async (req, res) => {
  try {
    const userData = await getUserWithCache(req.params.userId);
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const minAge = parseInt(req.query.minAge) || 18;
    const stats = await getUserStats(minAge);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cleanup function
async function cleanup() {
  try {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});