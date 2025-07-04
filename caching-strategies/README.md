# Caching Strategies with Redis

## Why Redis?

Redis is the go-to solution for caching because it offers:
- In-memory data storage
- Rich data structures
- Pub/Sub capabilities
- High availability
- Persistence options
- Cluster support

## Common Caching Patterns

### 1. Cache-Aside (Lazy Loading)
```python
def get_user(user_id):
    # Try cache first
    user = redis.get(f"user:{user_id}")
    if user:
        return json.loads(user)
    
    # Cache miss - get from DB
    user = db.query(f"SELECT * FROM users WHERE id = {user_id}")
    
    # Store in cache for next time
    redis.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user
```

### 2. Write-Through
```python
def save_user(user):
    # Save to DB
    db.execute("INSERT INTO users ...", user)
    
    # Update cache immediately
    redis.setex(f"user:{user.id}", 3600, json.dumps(user))
```

### 3. Write-Behind (Write-Back)
```python
def save_user(user):
    # Save to cache first
    redis.setex(f"user:{user.id}", 3600, json.dumps(user))
    
    # Add to write queue for async processing
    write_queue.append(user)
```

## Cache Invalidation Strategies

1. **Time-Based (TTL)**
   - Set expiration time on cache entries
   - Automatic invalidation
   - Good for relatively static data

2. **Event-Based**
   - Invalidate on specific events
   - Publish invalidation events
   - Good for real-time updates

3. **Version-Based**
   - Add version to cache key
   - Increment version on updates
   - Clean old versions periodically

## Redis Data Structures

### 1. Strings
- Simple key-value storage
- Counters
- Session storage

### 2. Lists
- Queue implementation
- Recent items
- Timeline data

### 3. Sets
- Unique collections
- Tag systems
- Relationship storage

### 4. Sorted Sets
- Leaderboards
- Priority queues
- Time-series data

### 5. Hashes
- Object storage
- Field-level operations
- Nested data structures

## Best Practices

1. **Key Design**
   - Use consistent naming conventions
   - Include version/type in key
   - Consider key expiry

2. **Memory Management**
   - Set appropriate maxmemory
   - Choose eviction policies
   - Monitor memory usage

3. **Error Handling**
   - Handle cache misses gracefully
   - Implement circuit breakers
   - Have fallback strategies

4. **Performance Optimization**
   - Use pipelining
   - Batch operations
   - Compress large values

## Common Anti-patterns

1. Caching everything
2. Not setting TTL
3. Inconsistent key naming
4. Missing error handling
5. Cache stampede

## Monitoring and Maintenance

### Key Metrics
- Hit/Miss ratio
- Memory usage
- Eviction rate
- Connection count
- Command latency

### Tools
- Redis CLI
- Redis Insight
- Prometheus + Grafana
- DataDog

## Exercises

1. Implement different caching patterns
2. Handle cache invalidation
3. Design efficient key structures
4. Set up monitoring
5. Implement error handling

## Advanced Topics

1. Redis Cluster
2. Redis Sentinel
3. Lua Scripting
4. Redis Streams
5. Geospatial features

## Real-world Examples

### E-commerce
```python
# Product cache with inventory
def get_product(product_id):
    cache_key = f"product:{product_id}"
    product = redis.hgetall(cache_key)
    
    if not product:
        product = fetch_from_db(product_id)
        redis.hmset(cache_key, product)
        redis.expire(cache_key, 3600)
    
    return product
```

### Social Media
```python
# User timeline cache
def get_timeline(user_id):
    cache_key = f"timeline:{user_id}"
    posts = redis.lrange(cache_key, 0, 49)  # Get latest 50 posts
    
    if not posts:
        posts = fetch_timeline_from_db(user_id)
        redis.rpush(cache_key, *posts)
        redis.expire(cache_key, 300)  # 5 minutes TTL
    
    return posts
```

## Further Reading

- [Redis Documentation](https://redis.io/documentation)
- [Redis Best Practices](https://redis.com/redis-best-practices/)
- [Caching at Scale](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/)
- [Redis University](https://university.redis.com/) 