import test from 'node:test';
import assert from 'node:assert';
import Queue from '../helpers/queue.js';

test('Queue basic functionalities', async (t) => {
    await t.test('adds items and starts processing', async () => {
        const queue = new Queue();
        let processed = false;
        
        const itemId = queue.add({
            data: 'test-data',
            callback: async (data) => {
                assert.strictEqual(data, 'test-data');
                processed = true;
            }
        });

        assert.ok(itemId);
        // Wait slightly for async queue execution loop
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.strictEqual(processed, true);
        assert.strictEqual(queue.getSize(), 0);
    });

    await t.test('tracks queue size and processing order', async () => {
        const queue = new Queue();
        const executionOrder = [];

        // Add a long-running first job to block the queue
        let resolveFirstJob;
        const firstJobPromise = new Promise(resolve => {
            resolveFirstJob = resolve;
        });

        queue.add({
            data: 'first',
            callback: async () => {
                executionOrder.push('first');
                await firstJobPromise;
            }
        });

        // Add second and third jobs
        queue.add({
            data: 'second',
            callback: async () => {
                executionOrder.push('second');
            }
        });

        queue.add({
            data: 'third',
            callback: async () => {
                executionOrder.push('third');
            }
        });

        assert.strictEqual(queue.getSize(), 2);

        // Resolve first job and wait for queue to process remaining
        resolveFirstJob();
        await new Promise(resolve => setTimeout(resolve, 20));

        assert.strictEqual(queue.getSize(), 0);
        assert.deepStrictEqual(executionOrder, ['first', 'second', 'third']);
    });

    await t.test('updates position callbacks', async () => {
        const queue = new Queue();
        let resolveFirstJob;
        const firstJobPromise = new Promise(resolve => {
            resolveFirstJob = resolve;
        });

        queue.add({
            data: 'first',
            callback: async () => {
                await firstJobPromise;
            }
        });

        const secondId = queue.add({
            data: 'second',
            callback: async () => {}
        });

        const thirdId = queue.add({
            data: 'third',
            callback: async () => {}
        });

        assert.strictEqual(queue.getPosition(secondId), 1);
        assert.strictEqual(queue.getPosition(thirdId), 2);

        let secondPositionCallbackResult = null;
        queue.onUpdate(secondId, (update) => {
            secondPositionCallbackResult = update;
        });

        // Resolve first job to trigger queue position updates
        resolveFirstJob();
        await new Promise(resolve => setTimeout(resolve, 20));

        // When second job starts, third job position should shift, second becomes completed
        assert.strictEqual(queue.getPosition(secondId), null);
    });
});
