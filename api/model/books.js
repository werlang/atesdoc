import SUAPScraper from '../helpers/scraper.js';
import suapConfig from '../suap-config.js';

export default class Book {

    constructor(id, professor, semester) {
        this.id = id;
        this.professor = professor;
        this.semester = semester;
        this.courses = [];
        this.workload = 0;
    }

    /**
     * Fetch books/courses for a professor in specific semesters
     * @param {number} professorId - Professor ID
     * @param {Array<string>} semesters - Array of semester strings (e.g. ['2024.1', '2024.2'])
     * @param {function} reply - WebSocket reply function for status updates
     * @returns {Promise<Array>} Array of book/course data
     */
    static async fetchForProfessor(professorId, semesters, reply) {
        await SUAPScraper.initialize();

        return semesters.map(semester => 
            `${suapConfig.baseUrl}/${suapConfig.bookSearch.url.base}/${professorId}/?${suapConfig.bookSearch.url.query}${semester}`
        );
    }

}