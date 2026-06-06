import test from 'node:test';
import assert from 'node:assert';
import DocumentBuilder from '../helpers/document-builder.js';

test('DocumentBuilder html compilation', async (t) => {
    const sampleData = {
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

    await t.test('compiles template and replaces placeholders', () => {
        const builder = new DocumentBuilder(sampleData);
        const result = builder.build();

        assert.ok(result);
        assert.ok(result.includes('John Doe'));
        assert.ok(result.includes('1234567'));
        assert.ok(result.includes('Web Development'));
        assert.ok(result.includes('TADS'));
        assert.ok(result.includes('2026/1')); // Period formatting replaces '.' with '/'
    });

    await t.test('replaceVariables works recursively on nested objects', () => {
        const builder = new DocumentBuilder(sampleData);
        const template = 'Hello {{user.profile.name}}!';
        const vars = { user: { profile: { name: 'Alice' } } };
        const replaced = builder.replaceVariables(template, vars);
        assert.strictEqual(replaced, 'Hello Alice!');
    });
});
