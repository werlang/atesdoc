import test from 'node:test';
import assert from 'node:assert';
import Report from '../model/report.js';
import SUAPScraper from '../helpers/scraper.js';

test('Report model functionalities', async (t) => {
    const sampleReportData = {
        professor: {
            name: 'John Doe',
            siape: '1234567'
        },
        semesters: {
            '2026.1': {
                books: [
                    {
                        program: 'TADS',
                        course: 'Web Development',
                        classes: {
                            quantity: 4,
                            weekly: 4,
                            semester: 80,
                            hours: 60
                        }
                    }
                ],
                total: {
                    classes: 4,
                    components: 1,
                    weekly: 4,
                    semesterHours: 60
                }
            }
        }
    };

    t.afterEach(() => {
        t.mock.restoreAll();
    });

    await t.test('constructor and getters', () => {
        const report = new Report(sampleReportData);
        assert.deepStrictEqual(report.get(), sampleReportData);
        assert.strictEqual(report.toJSON(), JSON.stringify(sampleReportData));
        assert.ok(report.toJSON(true).includes('\n'));
    });

    await t.test('compiles to HTML', () => {
        const report = new Report(sampleReportData);
        const { html, filename } = report.toHTML();
        assert.ok(html);
        assert.ok(filename.startsWith('report_'));
        assert.ok(filename.endsWith('_1234567.html'));
        assert.ok(html.includes('John Doe'));
    });

    await t.test('generates PDF using scraper', async () => {
        const report = new Report(sampleReportData);

        let pdfGeneratedWithHtml = null;
        t.mock.method(SUAPScraper, 'generatePDF', async (html) => {
            pdfGeneratedWithHtml = html;
            return Buffer.from('mock-pdf-content');
        });

        const { pdf, filename } = await report.toPDF();
        assert.strictEqual(pdf.toString(), 'mock-pdf-content');
        assert.ok(filename.endsWith('.pdf'));
        assert.ok(pdfGeneratedWithHtml);
        assert.ok(pdfGeneratedWithHtml.includes('John Doe'));
    });
});
