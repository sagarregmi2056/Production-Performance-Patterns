# Memory Management and Leak Prevention

## Why Memory Management Matters

Memory leaks can:
- Degrade application performance
- Cause crashes
- Increase infrastructure costs
- Lead to unpredictable behavior
- Impact user experience

## Common Memory Leak Patterns

### 1. Event Listeners
```javascript
// Bad: Listener not removed
class Component {
  constructor() {
    this.handleClick = this.handleClick.bind(this);
    document.addEventListener('click', this.handleClick);
  }
  
  handleClick() {
    // Handle click
  }
  
  // Component might be destroyed but listener remains
}

// Good: Proper cleanup
class Component {
  constructor() {
    this.handleClick = this.handleClick.bind(this);
    document.addEventListener('click', this.handleClick);
  }
  
  handleClick() {
    // Handle click
  }
  
  destroy() {
    document.removeEventListener('click', this.handleClick);
  }
}
```

### 2. Closure Leaks
```javascript
// Bad: Closure holding reference
function createLeak() {
  const largeData = new Array(1000000);
  
  setInterval(() => {
    console.log(largeData.length);
  }, 1000);
}

// Good: Cleanup interval
function avoidLeak() {
  const largeData = new Array(1000000);
  const intervalId = setInterval(() => {
    console.log(largeData.length);
  }, 1000);
  
  return () => clearInterval(intervalId);
}
```

### 3. Cache Management
```javascript
// Bad: Unbounded cache
const cache = new Map();

function memoize(fn) {
  return (arg) => {
    if (!cache.has(arg)) {
      cache.set(arg, fn(arg));
    }
    return cache.get(arg);
  };
}

// Good: LRU Cache
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (item) {
      // Refresh item
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

## Memory Profiling Tools

### Chrome DevTools
```javascript
// Take heap snapshot
// Chrome DevTools > Memory > Take Snapshot

// Record allocation timeline
// Chrome DevTools > Memory > Record Allocation Timeline

// Use Performance panel
// Chrome DevTools > Performance > Record
```

### Node.js
```javascript
// Memory usage
const used = process.memoryUsage();
console.log(used);

// Heap dump
const heapdump = require('heapdump');
heapdump.writeSnapshot();
```

## Best Practices

### 1. Resource Cleanup
- Implement proper dispose/cleanup methods
- Use destructors where available
- Clean up event listeners
- Close file handles and connections

### 2. Memory Pooling
```javascript
class ObjectPool {
  constructor(createFn, maxSize) {
    this.createFn = createFn;
    this.maxSize = maxSize;
    this.pool = [];
  }
  
  acquire() {
    return this.pool.pop() || this.createFn();
  }
  
  release(obj) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }
}
```

### 3. Weak References
```javascript
// Use WeakMap for caches
const cache = new WeakMap();

function getCachedData(obj) {
  if (!cache.has(obj)) {
    cache.set(obj, computeExpensiveData(obj));
  }
  return cache.get(obj);
}
```

### 4. Stream Processing
```javascript
// Instead of loading entire file
const data = fs.readFileSync('large-file.txt');

// Use streams
fs.createReadStream('large-file.txt')
  .pipe(transform)
  .pipe(process.stdout);
```

## Memory Leak Detection

### 1. Monitoring Growth
```javascript
let usage = [];

setInterval(() => {
  const mem = process.memoryUsage();
  usage.push(mem.heapUsed);
  
  // Check for consistent growth
  if (usage.length > 10) {
    const growth = usage[usage.length - 1] - usage[0];
    console.log(`Memory growth: ${growth} bytes`);
    usage = usage.slice(-10);
  }
}, 1000);
```

### 2. Automated Tests
```javascript
describe('Memory Leak Tests', () => {
  it('should not leak after multiple operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform operations
    for (let i = 0; i < 1000; i++) {
      await someOperation();
    }
    
    // Force garbage collection
    global.gc();
    
    const finalMemory = process.memoryUsage().heapUsed;
    const diff = finalMemory - initialMemory;
    
    expect(diff).toBeLessThan(1000000); // 1MB threshold
  });
});
```

## Common Anti-patterns

1. Not disposing resources
2. Global state accumulation
3. Infinite caching
4. Circular references
5. Large object retention

## Language-Specific Considerations

### JavaScript
- Understand garbage collection
- Use WeakMap/WeakSet
- Avoid accidental globals
- Clear timeouts/intervals

### Python
- Use context managers
- Implement `__del__`
- Watch for circular refs
- Use `weakref` module

### Java
- Implement AutoCloseable
- Use try-with-resources
- Watch for static references
- Use soft/weak references

## Performance Impact

### Memory vs CPU
- Balance memory usage
- Consider working set size
- Watch page faults
- Monitor swap usage

### Garbage Collection
- Understand GC pauses
- Configure GC appropriately
- Monitor GC metrics
- Use GC-friendly patterns

## Tools and Resources

1. Memory Profilers
   - Chrome DevTools
   - Node.js --inspect
   - Java VisualVM
   - Python memory_profiler

2. Monitoring Tools
   - DataDog
   - New Relic
   - Prometheus
   - Grafana

3. Testing Tools
   - Jest
   - PyTest
   - JUnit
   - Memory Leak Detectors

## Further Reading

- [Memory Management Reference](https://www.memorymanagement.org/)
- [V8 Blog - Memory Management](https://v8.dev/blog/trash-talk)
- [Python Memory Management](https://docs.python.org/3/c-api/memory.html)
- [Java Garbage Collection Handbook](https://plumbr.io/handbook/garbage-collection-in-java) 