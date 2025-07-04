const Redis = require('ioredis');
const amqp = require('amqplib');
const { performance } = require('perf_hooks');

// Redis client setup
const redis = new Redis();

// RabbitMQ connection setup
let rabbitmqChannel;
async function setupRabbitMQ() {
    const connection = await amqp.connect('amqp://localhost');
    rabbitmqChannel = await connection.createChannel();
    await rabbitmqChannel.assertQueue('benchmark_queue');
}

// Redis Benchmarks

async function benchmarkRedisSimpleOps(iterations = 10000) {
    console.log(`\nRunning Redis Simple Operations Benchmark (${iterations} iterations)`);
    
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        await redis.set(`key${i}`, `value${i}`);
        await redis.get(`key${i}`);
    }
    
    const duration = performance.now() - start;
    console.log(`Total time: ${duration.toFixed(2)}ms`);
    console.log(`Average per operation: ${(duration/iterations).toFixed(2)}ms`);
    
    // Cleanup
    for (let i = 0; i < iterations; i++) {
        await redis.del(`key${i}`);
    }
}

async function benchmarkRedisPipeline(iterations = 10000) {
    console.log(`\nRunning Redis Pipeline Benchmark (${iterations} iterations)`);
    
    const pipeline = redis.pipeline();
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        pipeline.set(`pipeline_key${i}`, `value${i}`);
        pipeline.get(`pipeline_key${i}`);
    }
    
    await pipeline.exec();
    
    const duration = performance.now() - start;
    console.log(`Total time: ${duration.toFixed(2)}ms`);
    console.log(`Average per operation: ${(duration/iterations).toFixed(2)}ms`);
    
    // Cleanup
    const cleanupPipeline = redis.pipeline();
    for (let i = 0; i < iterations; i++) {
        cleanupPipeline.del(`pipeline_key${i}`);
    }
    await cleanupPipeline.exec();
}

async function benchmarkRedisHash(iterations = 10000) {
    console.log(`\nRunning Redis Hash Operations Benchmark (${iterations} iterations)`);
    
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        await redis.hset('hash_benchmark', `field${i}`, `value${i}`);
        await redis.hget('hash_benchmark', `field${i}`);
    }
    
    const duration = performance.now() - start;
    console.log(`Total time: ${duration.toFixed(2)}ms`);
    console.log(`Average per operation: ${(duration/iterations).toFixed(2)}ms`);
    
    // Cleanup
    await redis.del('hash_benchmark');
}

// RabbitMQ Benchmarks

async function benchmarkRabbitMQPublish(iterations = 10000) {
    console.log(`\nRunning RabbitMQ Publish Benchmark (${iterations} iterations)`);
    
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        await rabbitmqChannel.sendToQueue('benchmark_queue', 
            Buffer.from(`message${i}`));
    }
    
    const duration = performance.now() - start;
    console.log(`Total time: ${duration.toFixed(2)}ms`);
    console.log(`Average per message: ${(duration/iterations).toFixed(2)}ms`);
}

async function benchmarkRabbitMQConsume(iterations = 10000) {
    console.log(`\nRunning RabbitMQ Consume Benchmark (${iterations} iterations)`);
    
    return new Promise((resolve) => {
        let received = 0;
        const start = performance.now();
        
        rabbitmqChannel.consume('benchmark_queue', (msg) => {
            rabbitmqChannel.ack(msg);
            received++;
            
            if (received === iterations) {
                const duration = performance.now() - start;
                console.log(`Total time: ${duration.toFixed(2)}ms`);
                console.log(`Average per message: ${(duration/iterations).toFixed(2)}ms`);
                resolve();
            }
        });
    });
}

async function benchmarkRabbitMQPubSub(iterations = 1000) {
    console.log(`\nRunning RabbitMQ Pub/Sub Benchmark (${iterations} iterations)`);
    
    // Setup exchange
    const exchange = 'benchmark_exchange';
    await rabbitmqChannel.assertExchange(exchange, 'fanout', {durable: false});
    
    // Setup queue
    const q = await rabbitmqChannel.assertQueue('', {exclusive: true});
    await rabbitmqChannel.bindQueue(q.queue, exchange, '');
    
    const start = performance.now();
    
    // Publisher
    for (let i = 0; i < iterations; i++) {
        rabbitmqChannel.publish(exchange, '', Buffer.from(`message${i}`));
    }
    
    // Subscriber
    return new Promise((resolve) => {
        let received = 0;
        
        rabbitmqChannel.consume(q.queue, (msg) => {
            received++;
            
            if (received === iterations) {
                const duration = performance.now() - start;
                console.log(`Total time: ${duration.toFixed(2)}ms`);
                console.log(`Average per message: ${(duration/iterations).toFixed(2)}ms`);
                resolve();
            }
        }, {noAck: true});
    });
}

// Combined Benchmark Scenarios

async function benchmarkCacheWithQueue(iterations = 1000) {
    console.log(`\nRunning Cache with Queue Benchmark (${iterations} iterations)`);
    
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        // Cache data
        await redis.set(`cache_key${i}`, `value${i}`);
        
        // Send notification
        await rabbitmqChannel.sendToQueue('benchmark_queue',
            Buffer.from(JSON.stringify({
                type: 'CACHE_UPDATE',
                key: `cache_key${i}`
            })));
        
        // Read cache
        await redis.get(`cache_key${i}`);
    }
    
    const duration = performance.now() - start;
    console.log(`Total time: ${duration.toFixed(2)}ms`);
    console.log(`Average per operation: ${(duration/iterations).toFixed(2)}ms`);
    
    // Cleanup
    const cleanupPipeline = redis.pipeline();
    for (let i = 0; i < iterations; i++) {
        cleanupPipeline.del(`cache_key${i}`);
    }
    await cleanupPipeline.exec();
}

// Run all benchmarks
async function runAllBenchmarks() {
    try {
        await setupRabbitMQ();
        
        console.log('Starting Benchmarks...\n');
        
        // Redis benchmarks
        await benchmarkRedisSimpleOps(1000);
        await benchmarkRedisPipeline(1000);
        await benchmarkRedisHash(1000);
        
        // RabbitMQ benchmarks
        await benchmarkRabbitMQPublish(1000);
        await benchmarkRabbitMQConsume(1000);
        await benchmarkRabbitMQPubSub(1000);
        
        // Combined scenario
        await benchmarkCacheWithQueue(1000);
        
        console.log('\nBenchmarks completed successfully!');
        
        // Close connections
        await redis.quit();
        await rabbitmqChannel.close();
        process.exit(0);
    } catch (error) {
        console.error('Error running benchmarks:', error);
        process.exit(1);
    }
}

// Run benchmarks
runAllBenchmarks(); 