import test from 'node:test';
import assert from 'node:assert';
import Book from '../model/books.js';
import SUAPScraper from '../helpers/scraper.js';

test('Book model', async (t) => {
    t.afterEach(() => {
        t.mock.restoreAll();
    });

    await t.test('constructor maps properties correctly', () => {
        const book = new Book({
            id: 'book-1',
            professor: 'Jane Doe',
            semester: '2026.1',
            link: '/edu/diario/123/',
            title: 'Software Testing',
            className: 'TADS-5',
            component: 'Testing',
            program: 'TADS'
        });

        assert.strictEqual(book.id, 'book-1');
        assert.strictEqual(book.professor, 'Jane Doe');
        assert.strictEqual(book.semester, '2026.1');
        assert.strictEqual(book.link, '/edu/diario/123/');
        assert.strictEqual(book.book, 'Software Testing');
        assert.strictEqual(book.class, 'TADS-5');
        assert.strictEqual(book.component, 'Testing');
        assert.strictEqual(book.program, 'TADS');
    });

    await t.test('formatLessons parses and filters lessons', () => {
        const book = new Book({ professor: 'Jane Doe' });
        const rawData = [
            ['Quantidade de Aulas', 'Data da Aula', 'Conteúdo', 'Professor'],
            ['2 Aulas', '01/04/2026', 'Topic A', 'Jane Doe'],
            ['4 Aulas', '02/04/2026', 'Topic B', 'Other Professor'],
            ['2 Aulas', '03/04/2026', 'Topic C', null], // Null defaults to current professor, hence eligible
        ];

        const formatted = book.formatLessons(rawData);
        
        assert.strictEqual(formatted.length, 3);
        
        assert.strictEqual(formatted[0].blocks, 2);
        assert.strictEqual(formatted[0].isEligible, true);
        assert.strictEqual(formatted[0].semester, '2026.1');

        assert.strictEqual(formatted[1].blocks, 4);
        assert.strictEqual(formatted[1].isEligible, false);

        assert.strictEqual(formatted[2].blocks, 2);
        assert.strictEqual(formatted[2].isEligible, true);
    });

    await t.test('generateReport calculates summaries', () => {
        const book = new Book({ professor: 'Jane Doe' });
        const lessons = [
            { blocks: 2, isEligible: true, semester: '2026.1', date: new Date('2026-04-01') },
            { blocks: 4, isEligible: true, semester: '2026.1', date: new Date('2026-04-02') },
            { blocks: 2, isEligible: false, semester: '2026.1', date: new Date('2026-04-03') }
        ];

        const report = book.generateReport(lessons);

        assert.strictEqual(report.lessons.length, 3);
        assert.strictEqual(report.eligibleLessons.length, 2);
        assert.strictEqual(report.semesters['2026.1'].blocks, 6);
        assert.strictEqual(report.semesters['2026.1'].hours, 4.5); // 6 * 45 / 60 = 4.5
        assert.strictEqual(report.semesters['2026.1'].weekly, 0.3); // 6 / 20 = 0.3
    });

    await t.test('fetchLessons visits pages and saves reports', async () => {
        const book = new Book({
            id: '123',
            professor: 'Jane Doe'
        });

        t.mock.method(SUAPScraper, 'initialize', async () => {});
        t.mock.method(SUAPScraper, 'goto', async () => {});
        
        // Mock two calls to evaluate:
        // 1. Getting periods info
        // 2. Getting lessons info for period 1 (period 2 has 0 count in mock)
        let evaluateCount = 0;
        t.mock.method(SUAPScraper, 'evaluate', async () => {
            evaluateCount++;
            if (evaluateCount === 1) {
                return {
                    1: { exists: true, count: 2, text: '2 Aulas' },
                    2: { exists: true, count: 0, text: '0 Aulas' }
                };
            }
            return [
                ['Quantidade', 'Data', 'Conteúdo', 'Professor'],
                ['2 Aulas', '01/04/2026', 'Topic A', 'Jane Doe']
            ];
        });

        let replyCalled = false;
        const reply = (msg) => {
            if (msg.status === 'fetched') replyCalled = true;
        };

        await book.fetchLessons(reply);

        assert.strictEqual(replyCalled, true);
        assert.strictEqual(book.lessons.length, 1);
        assert.strictEqual(book.lessons[0].topic, 'Topic A');
        assert.ok(book.report);
    });

    await t.test('fetch queries semesters and maps books', async () => {
        t.mock.method(SUAPScraper, 'initialize', async () => {});
        t.mock.method(SUAPScraper, 'goto', async () => {});
        t.mock.method(SUAPScraper, 'evaluate', async () => {
            return [
                {
                    link: '/edu/diario/123/',
                    semester: '2026.1',
                    book: 'Software Testing - TADS',
                    class: '2026.1.1.CH.TADS.A' // Will match class parsing regex
                }
            ];
        });

        const books = await Book.fetch({
            professor: 'jane-doe',
            semesters: ['2026.1']
        }, () => {});

        assert.strictEqual(books.length, 1);
        assert.ok(books[0] instanceof Book);
        assert.strictEqual(books[0].id, '123');
        assert.strictEqual(books[0].book, 'Software Testing - TADS');
    });
});
