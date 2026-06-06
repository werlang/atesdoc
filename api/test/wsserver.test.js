import test from 'node:test';
import assert from 'node:assert';
import WSServer from '../helpers/wsserver.js';
import { WebSocket } from 'ws';

test('WSServer message handling and registration', async (t) => {
    let wsserver;
    let port;

    t.before(() => {
        wsserver = new WSServer({ port: 0 });
        port = wsserver.ws.address().port;
    });

    t.after(() => {
        wsserver.ws.close();
    });

    await t.test('handles registration and message roundtrip', () => {
        return new Promise((resolve, reject) => {
            wsserver.on('test_method', (payload, reply) => {
                assert.deepStrictEqual(payload, { query: 'hello' });
                reply({ success: true });
            });

            const ws = new WebSocket(`ws://localhost:${port}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    id: 'msg-1',
                    method: 'test_method',
                    payload: { query: 'hello' }
                }));
            });

            ws.on('message', (data) => {
                const response = JSON.parse(data.toString());
                assert.deepStrictEqual(response, {
                    id: 'msg-1',
                    data: { success: true }
                });
                ws.close();
                resolve();
            });

            ws.on('error', reject);
        });
    });

    await t.test('handles malformed JSON error', () => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:${port}`);

            ws.on('open', () => {
                ws.send('invalid-json');
            });

            ws.on('message', (data) => {
                const response = JSON.parse(data.toString());
                assert.strictEqual(response.error, true);
                assert.strictEqual(response.message, 'Malformed JSON');
                ws.close();
                resolve();
            });

            ws.on('error', reject);
        });
    });

    await t.test('handles missing method error', () => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:${port}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    id: 'msg-2',
                    payload: {}
                }));
            });

            ws.on('message', (data) => {
                const response = JSON.parse(data.toString());
                assert.strictEqual(response.error, true);
                assert.strictEqual(response.message, 'Missing or invalid method');
                assert.strictEqual(response.id, 'msg-2');
                ws.close();
                resolve();
            });

            ws.on('error', reject);
        });
    });

    await t.test('handles method not found error', () => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:${port}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    id: 'msg-3',
                    method: 'non_existent_method',
                    payload: {}
                }));
            });

            ws.on('message', (data) => {
                const response = JSON.parse(data.toString());
                assert.strictEqual(response.error, true);
                assert.strictEqual(response.message, 'Method not found');
                assert.strictEqual(response.id, 'msg-3');
                ws.close();
                resolve();
            });

            ws.on('error', reject);
        });
    });

    await t.test('handles handler runtime errors gracefully', () => {
        return new Promise((resolve, reject) => {
            wsserver.on('error_method', () => {
                throw new Error('Fatal error inside handler');
            });

            const ws = new WebSocket(`ws://localhost:${port}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    id: 'msg-4',
                    method: 'error_method',
                    payload: {}
                }));
            });

            ws.on('message', (data) => {
                const response = JSON.parse(data.toString());
                assert.strictEqual(response.error, true);
                assert.strictEqual(response.message, 'Method handler error');
                assert.strictEqual(response.id, 'msg-4');
                ws.close();
                resolve();
            });

            ws.on('error', reject);
        });
    });
});
