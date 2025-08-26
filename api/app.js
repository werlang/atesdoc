import SUAPScraper from "./scraper/scraper.js";
import Route from "./helpers/router.js";

const scraper = await new SUAPScraper().connect();

new Route('get_professors', async (payload, reply) => {
    const professors = await scraper.findProfessor(payload.query, reply);
    return { professors };
});

new Route('get_books', async (payload, reply) => {
    const books = await scraper.findBooks(payload.professorId, payload.semesters, reply);
    return { books };
});

console.log('WebSocket server is running on ws://localhost:8080');