import SUAPScraper from '../helpers/scraper.js';
import suapConfig from '../suap-config.js';
import Semester from './semester.js';

export default class Book {

    constructor({ id, professor, semester, link, title, className, component, program }) {
        this.id = id;
        this.professor = professor;
        this.semester = semester;
        this.link = link;
        this.book = title;
        this.class = className;
        this.component = component;
        this.program = program;
    }

    formatLessons(data) {
        // console.log(data);
        let lessons = data.filter(lesson => lesson.length);

        const mapping = (tr) => [
            tr?.findIndex(th => th.includes('Quantidade')),
            tr?.findIndex(th => th.includes('Data')),
            tr?.findIndex(th => th.includes('Conteúdo')),
            tr?.findIndex(th => th.includes('Professor')),
        ];
        const colMap = mapping(lessons.shift());

        lessons = lessons.map(lesson => {
            const lessonObject = {
                blocks: parseInt(lesson[colMap[0]].split(' ')[0]),
                date: new Date(lesson[colMap[1]].split('/').reverse().join('-')),
                topic: lesson[colMap[2]],
                professor: colMap[3] !== -1 ? lesson[colMap[3]] : this.professor,
            };

            lessonObject.semester = Semester.fromDate(lessonObject.date).toString();
            lessonObject.isEligible = lessonObject.professor === null || lessonObject.professor.includes(this.professor);

            return lessonObject;
        });

        return lessons;
    }

    async fetchLessons(reply) {
        await SUAPScraper.initialize();

        // https://suap.ifsul.edu.br/edu/registrar_chamada/55325/1/
        const lessons = [];

        for (const period of [1, 2]) {
            const url = `${suapConfig.baseUrl}/${suapConfig.bookDetails.url}/${this.id}/${period}`;
            console.log(`Fetching book details for book ${this.id} period ${period}: ${url}`);
            await SUAPScraper.goto(url, suapConfig.bookDetails.ready, reply);
    
            let lessonsPeriod = await SUAPScraper.evaluate((template) => {
                const lessons = [];
                document.querySelectorAll(template.rows).forEach(tr => {
                    const lesson = template.data(tr);
                    lessons.push(lesson);
                });
                return lessons;
            }, suapConfig.bookDetails);
            lessonsPeriod = this.formatLessons(lessonsPeriod);

            lessons.push(...lessonsPeriod);
        }

        this.lessons = lessons;
        this.report = this.generateReport(lessons);
        reply({ status: 'fetched', book: this });

        // [
        //     'EditarRemover',
        //     '2',
        //     '4 Hora(s)/Aula',
        //     '26/08/2025',
        //.    'Pablo Werlang',
        //     'Aula inicial da disciplina'
        // ],

        console.log(this.lessons);
    } 

    generateReport(lessons) {
        const blockDuration = 45; // minutes
        const weeksInSemester = 20; // weeks
        const report = {};
        
        report.lessons = lessons;
        report.eligibleLessons = lessons.filter(lesson => lesson.isEligible);
        
        report.semesters = {};

        report.eligibleLessons.forEach(lesson => {
            let lessonReport = report.semesters[lesson.semester];
            if (!lessonReport) {
                lessonReport = {
                    lessons: [],
                    blocks: 0,
                    hours: 0,
                };
            }
            lessonReport.lessons.push(lesson);
            lessonReport.blocks += lesson.blocks;
            lessonReport.hours = lessonReport.blocks * blockDuration / 60;
            lessonReport.weekly = lessonReport.blocks / weeksInSemester;
            report.semesters[lesson.semester] = lessonReport;
        });

        return report;
    }

    /**
     * Fetches books for a given professor and semesters from SUAP.
     * @static
     * @param {Object} params - Parameters for fetching books.
     * @param {string} params.professor - The professor's ID.
     * @param {Array<string>} params.semesters - List of semesters to fetch books for.
     * @param {Function} reply - Callback function to report progress or status.
     * @returns {Promise<Array<Book>>} - A promise that resolves to an array of Book instances.
     */

    static async fetch({ professor, semesters }, reply) {
        await SUAPScraper.initialize();

        // always fetch 1 semester before
        const firstSemester = Semester.getFirst(semesters);
        const previousSemester = firstSemester.getPrevious().toString();
        if (!semesters.includes(previousSemester)) {
            semesters.push(previousSemester);
        }

        let books = [];
        for (const semester of semesters) {
            const url = `${suapConfig.baseUrl}/${suapConfig.bookSearch.url.base}/${professor}/?${suapConfig.bookSearch.url.query}${semester}`;
            console.log(`Fetching books for professor ${professor} in semester ${semester}: ${url}`);
            await SUAPScraper.goto(url, suapConfig.bookSearch.ready, reply);
        
            let data = await SUAPScraper.evaluate((template) => {
                const books = [];
        
                document.querySelectorAll(template.rows).forEach(tr => {
                    const book = {};
        
                    for (const [key, fn] of Object.entries(template.data)) {
                        book[key] = fn(tr);
                    }
        
                    books.push(book);
                });
                return books;
            }, suapConfig.bookSearch);
            books.push(...data);
        }
        books = books.filter(book => book.link && book.semester).map(book => ({
            ...book,
            book: book.book.split(' - ')[2]?.trim(),
            component: book.book.trim(),
            class: (m => m ? `${m[2]}-${m[1]}${m[3]}` : '-')(book.class.match(/\d+\.(\d{1,2})\.CH\.([A-Z]{1,3}).*([A-Z])/)),
        }));
        books.forEach(book => book.program = suapConfig.programMapping[book.class.split('-')[0]]);
        books = books.filter((v, i, a) => a.findIndex(t => (t.link === v.link)) === i);
    
        console.log(books);
        return books.map(book => new Book({
            id: book.link.match(/[meu_]{0,1}diario\/(\d+)\//)?.[1],
            component: book.component,
            professor,
            semester: book.semester,
            link: book.link,
            title: book.book,
            className: book.class,
            program: book.program,
        }));
    }
}
