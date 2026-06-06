import test from 'node:test';
import assert from 'node:assert';
import CustomError from '../helpers/error.js';

test('CustomError sets expected properties', () => {
    const error = new CustomError(500, 'Test error message', { detail: 'something' });
    assert.strictEqual(error.code, 500);
    assert.strictEqual(error.message, 'Test error message');
    assert.deepStrictEqual(error.data, { detail: 'something' });
    assert.ok(error instanceof Error);
});
