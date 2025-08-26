import WSServer from "./helpers/wsserver.js";
import SUAPScraper from "./scraper/scraper.js";
import Queue from "./helpers/queue.js";

const wss = new WSServer();

const scraper = await new SUAPScraper().connect();

const queue = new Queue();

wss.on('get_professors', async (payload, reply) => {
    scraper.emitter.on('login', () => {
        reply({ status: 'authenticating' });
    });

    const qid = queue.add({
        data: payload,
        callback: async (payload) => {
            try {
                // console.log(payload);
                reply({ status: 'processing', position: 0 });
                const professors = await scraper.findProfessor(payload.query);
                reply({ professors });
            }
            catch (error) {
                console.error('Error in get_professors:', error);
                reply({ error: error.message || 'An error occurred' });
            }
        }
    });

    reply({ status: 'in queue', position: queue.getPosition(qid) + 1 });
    queue.onUpdate(qid, data => {
        // console.log(data);
        reply({ status: 'in queue', ...data });
    });
});

wss.on('get_books', async (payload, reply) => {
    scraper.emitter.on('login', () => {
        reply({ status: 'authenticating' });
    });

    const qid = queue.add({
        data: payload,
        callback: async (payload) => {
            try {
                reply({ status: 'processing', position: 0 });
                const books = await scraper.findBooks(payload.professorId, payload.semesters);
                reply({ books });
            } catch (error) {
                console.error('Error in get_books:', error);
                reply({ error: error.message || 'An error occurred' });
            }
        }
    });

    reply({ status: 'in queue', position: queue.getPosition(qid) + 1 });
    queue.onUpdate(qid, data => {
        reply({ status: 'in queue', ...data });
    });
});

// TODO: Implement the main scraping logic
// TODO: Implement queue to scraper
// TODO: receive api ws requests, call scrapers, return results