import SUAPScraper from '../helpers/scraper.js';
import suapConfig from '../suap-config.js';

export default class Professor {

    constructor({ id, name, email, siape, cpf, picture }) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.siape = siape;
        this.cpf = cpf;
        this.picture = picture;
    }

    /**
     * Search for professors in SUAP
     * @param {string} query - Search query for professor name
     * @param {function} reply - WebSocket reply function for status updates
     * @returns {Promise<Array>} Array of professor objects
     */
    static async search(query, reply) {
        await SUAPScraper.initialize();

        // Build the search URL
        suapConfig.professorSearch.query.q = query;
        query = new URLSearchParams(suapConfig.professorSearch.query).toString();
        const url = `${suapConfig.baseUrl}/${suapConfig.professorSearch.url}?${query}`;

        console.log(`Searching professors: ${url}`);
        await SUAPScraper.goto(url, suapConfig.professorSearch.ready, reply);

        // Extract professor data from the page
        const data = await SUAPScraper.evaluate((template) => {
            const professors = [];

            document.querySelectorAll(template.rows).forEach(tr => {
                if (!tr.querySelector(template.hasRows)) return;

                const professor = {};

                for (const [key, fn] of Object.entries(template.data)) {
                    professor[key] = fn(tr);
                }

                professors.push(professor);
            });
            return professors;
        }, suapConfig.professorSearch);
        console.log(data);
        return data.map(prof => new Professor(prof));
    }

}