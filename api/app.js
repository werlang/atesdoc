import WSServer from "./helpers/wsserver.js";
import SUAPScraper from "./scraper/scraper.js";
import Queue from "./helpers/queue.js";

const wss = new WSServer();

const scraper = await new SUAPScraper().connect();

const queue = new Queue();

wss.on('get_professors', async (payload, reply) => {
    const qid = queue.add({
        data: payload,
        callback: async (payload) => {
            try {
                // console.log(payload);
                const professors = await scraper.findProfessor(payload.query);
                reply({ professors });
            }
            catch (error) {
                console.error('Error in get_professors:', error);
                reply({ error: error.message || 'An error occurred' });
            }
        }
    });

    queue.onUpdate(qid, data => {
        console.log(data);
        reply(data);
    })
});

// TODO: Implement the main scraping logic
// TODO: Implement queue to scraper
// TODO: receive api ws requests, call scrapers, return results