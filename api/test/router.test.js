import test from 'node:test';
import assert from 'node:assert';
import Route from '../helpers/router.js';
import { WebSocket } from 'ws';

test('Route helper registers and runs handlers via queue', async (t) => {
    // Get the dynamic port assigned to Route.wss
    const port = Route.wss.ws.address().port;

    await t.test('executes registered route successfully', () => {
        return new Promise((resolve, reject) => {
            let handlerCalled = false;
            
            new Route('test_route', async (payload, reply) => {
                assert.deepStrictEqual(payload, { query: 'run' });
                handlerCalled = true;
                return { success: true, payload };
            });

            const ws = new WebSocket(`ws://localhost:${port}`);
            const messages = [];

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    id: 'msg-route-1',
                    method: 'test_route',
                    payload: { query: 'run' }
                }));
            });

            ws.on('message', (data) => {
                const response = JSON.parse(data.toString());
                messages.push(response);

                // We expect responses:
                // 1. in queue
                // 2. processing
                // 3. handler return data
                if (messages.length === 3) {
                    assert.strictEqual(messages[0].data.status, 'in queue');
                    assert.strictEqual(messages[1].data.status, 'processing');
                    assert.deepStrictEqual(messages[2].data.success, true);
                    assert.strictEqual(handlerCalled, true);
                    ws.close();
                    resolve();
                }
            });

            ws.on('error', reject);
        });
    });

    await t.test('handles route handler execution failure gracefully', () => {
        return new Promise((resolve, reject) => {
            new Route('fail_route', async () => {
                throw new Error('Test handler failed');
            });

            const ws = new WebSocket(`ws://localhost:${port}`);
            const messages = [];

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    id: 'msg-route-2',
                    method: 'fail_route',
                    payload: {}
                }));
            });

            ws.on('message', (data) => {
                const response = JSON.parse(data.toString());
                messages.push(response);

                if (messages.length === 3) {
                    assert.strictEqual(messages[0].data.status, 'in queue');
                    assert.strictEqual(messages[1].data.status, 'processing');
                    assert.strictEqual(messages[2].data.error, 'Test handler failed');
                    ws.close();
                    resolve();
                }
            });

            ws.on('error', reject);
        });
    });
});
