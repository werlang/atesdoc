import Route from "./helpers/router.js";
import Professor from "./model/professor.js";
import Book from "./model/books.js";
import Report from "./model/report.js";

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

new Route('post_report', async (payload, reply) => {
    
    try {
        const report = new Report(payload.report);
        console.log('Generating PDF report...', report.toJSON(true));

        const { pdf, filename } = await report.toPDF();
        
        return { 
            success: true, 
            pdfData: pdf,
            filename: filename,
            mimeType: 'application/pdf',
            size: pdf.length,
            message: 'PDF generated and ready for download'
        };
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

console.log('WebSocket server is running on ws://localhost:8080');