# Performance Benchmarks

This directory contains benchmarks that demonstrate the performance impact of various optimization techniques. The benchmarks cover database operations, caching strategies, network calls, and memory management.



## Installation

```bash
npm install
```

## Running the Benchmarks

### MongoDB Benchmarks
```bash
npm run benchmark:mongo
```

Tests:
1. Indexed vs Non-indexed Queries
2. Projected vs Full Document Queries
3. Individual vs Bulk Operations
4. Optimized vs Unoptimized Aggregations
5. Memory Usage: Full Result Set vs Streaming

### Caching Benchmarks
```bash
npm run benchmark:cache
```

Tests:
1. No Cache vs Different Cache Types:
   - In-memory Cache
   - Redis Cache
   - LRU Cache
2. Cache Hit Performance
3. Memory Usage Comparison

## Understanding the Results

### MongoDB Benchmark Results

Example output:
```
Query without index x 1,234 ops/sec ±1.23% (45 runs sampled)
Query with index x 5,678 ops/sec ±1.23% (45 runs sampled)
Fastest is Query with index

Batch size 10: 1.234 seconds
Batch size 100: 2.345 seconds
Batch size 1000: 3.456 seconds

Memory for full result set: 45.67 MB
Memory for streamed results: 1.23 MB
```

### Caching Benchmark Results

Example output:
```
No cache x 123 ops/sec ±1.23% (45 runs sampled)
In-memory cache x 45,678 ops/sec ±1.23% (45 runs sampled)
Redis cache x 12,345 ops/sec ±1.23% (45 runs sampled)
LRU cache x 34,567 ops/sec ±1.23% (45 runs sampled)
Fastest is In-memory cache

Memory cache hits: 0.123 seconds
Redis cache hits: 0.456 seconds
LRU cache hits: 0.234 seconds

Memory cache size: 12.34 MB
LRU cache size: 3.45 MB
```

## Key Findings

1. Database Operations
   - Indexed queries are typically 10-100x faster
   - Bulk operations are 5-10x faster than individual operations
   - Proper aggregation ordering can improve performance by 2-5x

2. Caching Strategies
   - In-memory caching is fastest but uses most memory
   - Redis provides good balance of speed and memory usage
   - LRU cache effectively manages memory with slight performance trade-off

## Best Practices Demonstrated

1. Database
   - Use appropriate indexes
   - Implement bulk operations
   - Optimize aggregation pipelines
   - Use projection to limit data transfer

2. Caching
   - Choose appropriate cache type for use case
   - Implement TTL for cache entries
   - Use memory-efficient cache strategies
   - Handle cache misses gracefully

## Adding New Benchmarks

1. Create a new benchmark file:
   ```javascript
   const Benchmark = require('benchmark');
   const suite = new Benchmark.Suite;
   
   suite.add('Test case 1', () => {
     // Your test code
   })
   .add('Test case 2', () => {
     // Your test code
   })
   .run();
   ```

2. Add script to package.json:
   ```json
   {
     "scripts": {
       "benchmark:new": "node new-benchmark.js"
     }
   }
   ```

## Contributing

1. Fork the repository
2. Create your benchmark branch
3. Add your benchmarks
4. Submit a pull request

## Notes

- Results may vary based on hardware and system load
- Run benchmarks multiple times for accurate results
- Consider system resources when running memory tests
- Some benchmarks require database setup 
