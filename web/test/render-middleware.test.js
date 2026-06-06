import test from 'node:test';
import assert from 'node:assert';
import renderMiddleware from '../middleware/render.js';

test('render middleware adds templateRender and formats vars', async () => {
    const fixedVars = { appName: 'atesdoc', version: '1.0.0' };
    const middleware = renderMiddleware(fixedVars);

    const req = {};
    const res = {
        renderCalled: false,
        view: null,
        vars: null,
        render(view, vars) {
            this.renderCalled = true;
            this.view = view;
            this.vars = vars;
        }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    middleware(req, res, next);

    assert.ok(nextCalled);
    assert.ok(res.templateRender);

    // Call templateRender
    await res.templateRender('home', { customVar: 'hello', undefinedVar: undefined });

    assert.ok(res.renderCalled);
    assert.strictEqual(res.view, 'home');
    assert.strictEqual(res.vars.appName, 'atesdoc');
    assert.strictEqual(res.vars.version, '1.0.0');
    assert.strictEqual(res.vars.customVar, 'hello');
    assert.strictEqual(res.vars.undefinedVar, undefined);
    assert.ok(res.vars['template-vars'].includes('atesdoc'));
});
