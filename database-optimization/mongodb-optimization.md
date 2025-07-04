# MongoDB Performance Optimization

## Key Performance Concepts

### 1. Indexing Strategies
```javascript
// Bad: No index for frequent queries
db.users.find({ email: "user@example.com" })

// Good: Create index for frequently queried fields
db.users.createIndex({ email: 1 })

// Compound Index for multiple fields
db.users.createIndex({ age: 1, city: 1 })

// Text Index for full-text search
db.articles.createIndex({ content: "text" })
```

### 2. Query Optimization
```javascript
// Bad: Fetching entire documents
db.users.find({})

// Good: Project only needed fields
db.users.find({}, { name: 1, email: 1 })

// Bad: In-memory sorting without index
db.users.find().sort({ age: 1 })

// Good: Index for sorting
db.users.createIndex({ age: 1 })
db.users.find().sort({ age: 1 })
```

### 3. Aggregation Pipeline Optimization
```javascript
// Bad: Complex pipeline without indexes
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $sort: { createdAt: -1 } },
  { $group: { _id: "$userId", total: { $sum: "$amount" } } }
])

// Good: Add indexes and optimize stages
db.orders.createIndex({ status: 1, createdAt: -1 })
db.orders.createIndex({ userId: 1 })

// Use early $match to reduce documents
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$userId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } }
])
```

## Schema Design Best Practices

### 1. Embedding vs Referencing
```javascript
// Embedding (1:Few relationship)
{
  _id: 1,
  user: "John",
  addresses: [
    { street: "123 Main St", city: "NYC" },
    { street: "456 Park Ave", city: "NYC" }
  ]
}

// Referencing (1:Many relationship)
// users collection
{ _id: 1, name: "John" }

// orders collection
{ _id: 101, userId: 1, items: [...] }
{ _id: 102, userId: 1, items: [...] }
```

### 2. Denormalization for Performance
```javascript
// Normalized (requires joins)
// users collection
{ _id: 1, name: "John" }

// orders collection
{ _id: 101, userId: 1, total: 100 }

// Denormalized (faster reads)
// orders collection
{
  _id: 101,
  userId: 1,
  userName: "John",  // Denormalized
  total: 100
}
```

## Monitoring and Profiling

### 1. Query Profiling
```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 })

// Check slow queries
db.system.profile.find().sort({ ts: -1 })

// Explain query plan
db.users.find({ age: { $gt: 25 } }).explain("executionStats")
```

### 2. Performance Metrics
```javascript
// Server stats
db.serverStatus()

// Collection stats
db.users.stats()

// Index usage stats
db.users.aggregate([
  { $indexStats: {} }
])
```

## Common Anti-patterns

### 1. Unbounded Arrays
```javascript
// Bad: Unbounded array growth
{
  _id: 1,
  user: "John",
  logs: [] // Can grow indefinitely
}

// Good: Separate collection with reference
// users collection
{ _id: 1, name: "John" }

// logs collection
{ userId: 1, timestamp: ISODate(), action: "login" }
```

### 2. Massive Documents
```javascript
// Bad: Large document with all data
{
  _id: 1,
  user: "John",
  posts: [], // Hundreds of posts
  comments: [], // Thousands of comments
  likes: [] // Millions of likes
}

// Good: Split into separate collections
// users collection
{ _id: 1, name: "John" }

// posts collection
{ userId: 1, content: "..." }

// comments collection
{ postId: 1, userId: 1, content: "..." }
```

## Performance Patterns

### 1. Bulk Operations
```javascript
// Bad: Individual inserts
for (let i = 0; i < 1000; i++) {
  db.users.insertOne({ name: `User ${i}` })
}

// Good: Bulk insert
const bulk = db.users.initializeUnorderedBulkOp()
for (let i = 0; i < 1000; i++) {
  bulk.insert({ name: `User ${i}` })
}
bulk.execute()
```

### 2. Read Preferences
```javascript
// Read from secondary for analytics
const client = new MongoClient(uri, {
  readPreference: 'secondary'
})

// Read from primary for critical data
const client = new MongoClient(uri, {
  readPreference: 'primary'
})
```

## Sharding Strategies

### 1. Shard Key Selection
```javascript
// Good shard key properties:
// 1. High cardinality
// 2. Even distribution
// 3. Monotonic changes

// Enable sharding
sh.enableSharding("mydb")

// Shard collection
sh.shardCollection("mydb.users", { userId: "hashed" })
```

### 2. Zone Sharding
```javascript
// Add zones
sh.addShardToZone("shard0", "US")
sh.addShardToZone("shard1", "EU")

// Configure zone ranges
sh.updateZoneKeyRange(
  "mydb.users",
  { region: "US" },
  { region: "US" },
  "US"
)
```

## Caching with MongoDB

### 1. In-Memory Storage Engine
```javascript
// Configure in-memory storage
storage:
  engine: inMemory
  inMemory:
    engineConfig:
      inMemorySizeGB: 2
```

### 2. Application-Level Caching
```javascript
const cache = new Map()

async function getUserWithCache(id) {
  if (cache.has(id)) {
    return cache.get(id)
  }
  
  const user = await db.users.findOne({ _id: id })
  cache.set(id, user)
  return user
}
```

## Security Best Practices

### 1. Field-Level Encryption
```javascript
// Enable client-side field level encryption
const clientEncryption = new ClientEncryption(client, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders: {
    local: {
      key: localMasterKey
    }
  }
})

// Insert encrypted data
await collection.insertOne({
  name: "John",
  ssn: clientEncryption.encrypt(
    "123-45-6789",
    "AEAD_AES_256_CBC_HMAC_SHA_512_Deterministic"
  )
})
```

### 2. Role-Based Access Control
```javascript
// Create role
db.createRole({
  role: "readOnly",
  privileges: [{
    resource: { db: "mydb", collection: "" },
    actions: [ "find" ]
  }],
  roles: []
})

// Create user with role
db.createUser({
  user: "reader",
  pwd: "password",
  roles: ["readOnly"]
})
```

## Tools and Resources

### 1. Monitoring Tools
- MongoDB Compass
- MongoDB Atlas
- Datadog MongoDB Integration
- Prometheus MongoDB Exporter

### 2. Development Tools
- MongoDB Shell
- Mongoose ODM
- MongoDB Compass
- Studio 3T

## Further Reading

- [MongoDB Manual - Performance](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [MongoDB University](https://university.mongodb.com/)
- [MongoDB Blog - Performance Best Practices](https://www.mongodb.com/blog/post/performance-best-practices-mongodb)
- [MongoDB Atlas Best Practices](https://www.mongodb.com/docs/atlas/best-practices/) 