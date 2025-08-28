import SUAPScraper from '../helpers/scraper.js';
import suapConfig from '../suap-config.js';

export default class Book {

    constructor({ id, professor, semester, link, title, className  }) {
        this.id = id;
        this.professor = professor;
        this.semester = semester;
        this.link = link;
        this.book = title;
        this.class = className
    }

    formatLessons(data) {
        let lessons = data.filter(lesson => lesson.length);
        lessons = lessons.map(lesson => {
            const lessonObject = {
                period: parseInt(lesson[1]),
                duration: parseInt(lesson[2].split(' ')[0]),
                date: new Date(lesson[3].split('/').reverse().join('-')),
                // teacher: lesson[4],
                // topic: lesson[5],
            };

            if (lesson.length === 6) {
                lessonObject.professor = lesson[4];
                lessonObject.topic = lesson[5];
            }
            else {
                lessonObject.professor = null;
                lessonObject.topic = lesson[4];
            }
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
        reply({ status: 'fetched', lessons, book: this.id });
        this.lessons = lessons;

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

        let books = [];
        for (const semester of semesters) {
            const url = `${suapConfig.baseUrl}/${suapConfig.bookSearch.url.base}/${professor}/?${suapConfig.bookSearch.url.query}${semester}`;
            console.log(`Fetching books for professor ${professor} in semester ${semester}: ${url}`);
            await SUAPScraper.goto(url, suapConfig.bookSearch.ready, reply);
        
            const data = await SUAPScraper.evaluate((template) => {
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
            class: (m => m ? `${m[2]}-${m[1]}${m[3]}` : '-')(book.class.match(/\d+\.(\d{1,2})\.CH\.([A-Z]{1,3}).*([A-Z])/)),
        }));
        books = books.filter((v, i, a) => a.findIndex(t => (t.link === v.link)) === i);
    
        console.log(books);
        return books.map(book => new Book({
            id: book.link.match(/[meu_]{0,1}diario\/(\d+)\//)?.[1],
            professor,
            semester: book.semester,
            link: book.link,
            title: book.book,
            className: book.class
        }));
    }
}