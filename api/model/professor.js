import SUAPScraper from '../helpers/scraper.js';
import suapConfig from '../suap-config.js';

export default class Professor {

    constructor({ id, name, email, siape, cpf, picture }, reply) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.siape = siape;
        this.cpf = cpf;
        this.picture = picture;
        this.reply = reply;
    }

    /**
     * Search for professors in SUAP
     * @param {string} query - Search query for professor name
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

    async fetchUsualName() {
        await SUAPScraper.initialize();

        const url = `${suapConfig.baseUrl}/${suapConfig.professorFunctionalPage.url}/${this.siape}/`;
        console.log(`Fetching professor usual name: ${url}`);
        await SUAPScraper.goto(url, suapConfig.professorFunctionalPage.ready, this.reply);

        const name = await SUAPScraper.evaluate((template) => {
            return document.querySelector(template.item)?.textContent.trim();
        }, suapConfig.professorFunctionalPage);
        this.usualName = name;
        return name;
    }
}