import suapConfig from '../suap-config.js';
import path from 'path';
import fs from 'fs';

export default class DocumentBuilder {

    constructor(data) {
        this.data = data;
        const templatePath = `template`;

        this.template = {
            root: fs.readFileSync(path.join(process.cwd(), templatePath, 'document.html'), 'utf-8'),
            table: fs.readFileSync(path.join(process.cwd(), templatePath, 'table.html'), 'utf-8'),
            courseFirstRow: fs.readFileSync(path.join(process.cwd(), templatePath, 'course-1st-row.html'), 'utf-8'),
            courseRow: fs.readFileSync(path.join(process.cwd(), templatePath, 'course-row.html'), 'utf-8'),
        };
    }

    replaceVariables(template, variables, prefix = '') {
        for (const [key, value] of Object.entries(variables)) {
            // nested
            if (typeof value === 'object') {
                return this.replaceVariables(template, value, `${prefix}${key}.`);
            }
            const regex = new RegExp(`{{${prefix}${key}}}`, 'g');
            template = template.replace(regex, value);
        }
        return template;
    }

    getBook(book, index, programClasses) {
        return this.replaceVariables(index === 0 ? this.template.courseFirstRow : this.template.courseRow, {
            programsLength: programClasses,
            programName: book.program || '---',
            name: book.course,
            classes: book.classes.quantity,
            weekly: book.classes.weekly?.toFixed(2).replace('.',','),
            semester: book.classes.semester?.toFixed(2).replace('.',','),
            hours: book.classes.hours?.toFixed(2).replace('.',','),
        });
    }

    build() {
        const data = this.data;
        const semestersDocument = Object.entries(data.semesters).sort().map(([semester, semesterData]) => this.replaceVariables(this.template.table, {
            semester: semester.replace(/\./g, '/'),
            booksTable: semesterData.books
                .toSorted((a,b) => (a.program + a.course).localeCompare(b.program + b.course))
                .map((book, _, books) => 
                    this.getBook(
                        // the book
                        book, 
                        // index of the book within its program
                        books.filter(b => b.program === book.program).indexOf(book),
                        // total classes in the same program
                        books.filter(b => b.program === book.program).length)).join(''),
            summary: {
                classes: semesterData.total.classes,
                components: semesterData.total.components,
                weeklyClasses: semesterData.total.weekly?.toFixed(2).replace('.',','),
                semesterHours: semesterData.total.semesterHours?.toFixed(2).replace('.',','),
            }
        })).join('');

        const rootDocument = this.replaceVariables(this.template.root, {
            professorName: data.professor.name,
            professorSiape: data.professor.siape,
            semesters: Object.keys(data.semesters).sort().map(semester => semester.replace(/\./g, '/')).join(', '),
            semestersTables: semestersDocument,
            depex: suapConfig.documentBuilder.depex,
            city: suapConfig.documentBuilder.city,
            day: new Date().getDate(),
            month: new Date().toLocaleString('pt-br', { month: 'long' }),
            year: new Date().getFullYear(),
        });

        return rootDocument;
    }
}