import test from 'node:test';
import assert from 'node:assert';
import Professor from '../model/professor.js';
import SUAPScraper from '../helpers/scraper.js';

test('Professor model', async (t) => {
    t.afterEach(() => {
        t.mock.restoreAll();
    });

    await t.test('constructor maps properties correctly', () => {
        const prof = new Professor({
            id: 'prof-123',
            name: 'Jane Doe',
            email: 'jane.doe@ifsul.edu.br',
            siape: '12345',
            cpf: '123.456.789-00',
            picture: '/media/pic.jpg'
        }, () => {});

        assert.strictEqual(prof.id, 'prof-123');
        assert.strictEqual(prof.name, 'Jane Doe');
        assert.strictEqual(prof.email, 'jane.doe@ifsul.edu.br');
        assert.strictEqual(prof.siape, '12345');
        assert.strictEqual(prof.cpf, '123.456.789-00');
        assert.strictEqual(prof.picture, '/media/pic.jpg');
    });

    await t.test('search calls scraper and maps professors', async () => {
        const mockReply = () => {};
        
        t.mock.method(SUAPScraper, 'initialize', async () => {});
        t.mock.method(SUAPScraper, 'goto', async () => {});
        t.mock.method(SUAPScraper, 'evaluate', async () => {
            return [
                {
                    id: 'prof-123',
                    name: 'Jane Doe',
                    email: 'jane.doe@ifsul.edu.br',
                    siape: '12345',
                    cpf: '123.456.789-00',
                    picture: '/media/pic.jpg'
                }
            ];
        });

        const results = await Professor.search('Jane', mockReply);

        assert.strictEqual(results.length, 1);
        assert.ok(results[0] instanceof Professor);
        assert.strictEqual(results[0].name, 'Jane Doe');
        assert.strictEqual(results[0].siape, '12345');
    });

    await t.test('fetchUsualName resolves name and sets property', async () => {
        const mockReply = () => {};
        const prof = new Professor({ siape: '12345' }, mockReply);

        t.mock.method(SUAPScraper, 'initialize', async () => {});
        t.mock.method(SUAPScraper, 'goto', async () => {});
        t.mock.method(SUAPScraper, 'evaluate', async () => {
            return 'Jane D. Usual';
        });

        const usualName = await prof.fetchUsualName();
        assert.strictEqual(usualName, 'Jane D. Usual');
        assert.strictEqual(prof.usualName, 'Jane D. Usual');
    });
});
