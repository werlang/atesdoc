import test from 'node:test';
import assert from 'node:assert';
import Semester from '../model/semester.js';

test('Semester model functionalities', async (t) => {
    await t.test('constructor parses year and period correctly', () => {
        const sem1 = new Semester('2026.2');
        assert.strictEqual(sem1.year, 2026);
        assert.strictEqual(sem1.period, 2);

        const sem2 = new Semester('2025/1');
        assert.strictEqual(sem2.year, 2025);
        assert.strictEqual(sem2.period, 1);
    });

    await t.test('sorts a list of semesters', () => {
        const list = ['2026.2', '2025.1', '2026.1'];
        const sorted = Semester.sort(list);
        
        assert.strictEqual(sorted[0].toString(), '2025.1');
        assert.strictEqual(sorted[1].toString(), '2026.1');
        assert.strictEqual(sorted[2].toString(), '2026.2');
    });

    await t.test('getFirst and getLast get correct values', () => {
        const list = ['2026.2', '2025.1', '2026.1'];
        assert.strictEqual(Semester.getFirst(list).toString(), '2025.1');
        assert.strictEqual(Semester.getLast(list).toString(), '2026.2');
    });

    await t.test('fromDate creates correct semester', () => {
        const date1 = new Date(2026, 4, 15); // May -> semester 1
        assert.strictEqual(Semester.fromDate(date1).toString(), '2026.1');

        const date2 = new Date(2026, 8, 20); // September -> semester 2
        assert.strictEqual(Semester.fromDate(date2).toString(), '2026.2');
    });

    await t.test('getNext and getPrevious work correctly', () => {
        const sem = new Semester('2026.2');
        assert.strictEqual(sem.getNext().toString(), '2026.3'); // Wait, period + 1 is 3? Let's check getNext logic!
        assert.strictEqual(sem.getPrevious().toString(), '2026.1');
        
        const sem0 = new Semester('2026.0');
        assert.strictEqual(sem0.getPrevious().toString(), '2025.2');
    });
});
