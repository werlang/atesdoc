import Route from "./helpers/router.js";
import Professor from "./model/professor.js";
import Book from "./model/books.js";

new Route('get_professors', async (payload, reply) => {
    const professors = await Professor.search(payload.query, reply);
    return { professors };
});

new Route('get_books', async (payload, reply) => {
    const books = await Book.fetch({
        professor: payload.professorId,
        semesters: payload.semesters,
        professorName: payload.professorName,
    }, reply);
    return { books };
});

new Route('get_report', async (payload, reply) => {
    // console.log(payload);
    const professorName = await new Professor({...payload.professorName}, reply).fetchUsualName();
    const books = payload.books.map(book => new Book({ ...book, professor: professorName }));
    // console.log(books);
    for (const book of books) {
        await book.fetchLessons(reply);
    }
    return { books };
});

console.log('WebSocket server is running on ws://localhost:8080');