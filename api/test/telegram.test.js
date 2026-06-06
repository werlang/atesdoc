import test from 'node:test';
import assert from 'node:assert';
import Telegram from '../helpers/telegram.js';

test('Telegram alert service', async (t) => {
    // Save original config
    const originalEnabled = Telegram.enabled;
    const originalIsProduction = Telegram.isProduction;
    const originalChatId = Telegram.chatId;
    const originalToken = Telegram.token;

    t.afterEach(() => {
        Telegram.enabled = originalEnabled;
        Telegram.isProduction = originalIsProduction;
        Telegram.chatId = originalChatId;
        Telegram.token = originalToken;
        t.mock.restoreAll();
    });

    await t.test('returns false when disabled', async () => {
        Telegram.enabled = false;
        const result = await Telegram.alert('hello');
        assert.strictEqual(result, false);
    });

    await t.test('logs to console and returns true in non-production', async () => {
        Telegram.enabled = true;
        Telegram.isProduction = false;
        
        let consoleLogged = false;
        t.mock.method(console, 'log', (...args) => {
            if (args.join(' ').includes('DEV LOG: Telegram alert:')) {
                consoleLogged = true;
            }
        });

        const result = await Telegram.alert('hello dev');
        assert.strictEqual(result, true);
        assert.strictEqual(consoleLogged, true);
    });

    await t.test('sends request via fetch in production', async () => {
        Telegram.enabled = true;
        Telegram.isProduction = true;
        Telegram.chatId = '12345';
        Telegram.token = 'my-bot-token';

        let fetchUrl = null;
        t.mock.method(globalThis, 'fetch', async (url) => {
            fetchUrl = url;
            return {
                json: async () => ({ ok: true, result: 'message_sent' })
            };
        });

        const result = await Telegram.alert('hello prod');
        
        assert.deepStrictEqual(result, { ok: true, result: 'message_sent' });
        assert.ok(fetchUrl);
        assert.ok(fetchUrl.startsWith('https://api.telegram.org/botmy-bot-token/sendMessage'));
        assert.ok(fetchUrl.includes('chat_id=12345'));
        assert.ok(fetchUrl.includes('text=hello+prod'));
    });

    await t.test('formats object messages and enables markdown', async () => {
        Telegram.enabled = true;
        Telegram.isProduction = true;
        Telegram.chatId = '12345';
        Telegram.token = 'my-bot-token';

        let fetchUrl = null;
        t.mock.method(globalThis, 'fetch', async (url) => {
            fetchUrl = url;
            return {
                json: async () => ({ ok: true })
            };
        });

        const result = await Telegram.alert({ key1: 'value1', key2: 'value2' });
        assert.ok(result);
        assert.ok(fetchUrl.includes('parse_mode=MarkdownV2'));
    });

    await t.test('handles fetch error gracefully', async () => {
        Telegram.enabled = true;
        Telegram.isProduction = true;
        Telegram.chatId = '12345';
        Telegram.token = 'my-bot-token';

        t.mock.method(globalThis, 'fetch', async () => {
            throw new Error('Network failure');
        });

        const result = await Telegram.alert('fail message');
        assert.strictEqual(result, false);
    });
});
