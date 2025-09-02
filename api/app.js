import Route from "./helpers/router.js";
import Professor from "./model/professor.js";
import Book from "./model/books.js";
import puppeteer from 'puppeteer-core';
import SUAPScraper from "./helpers/scraper.js";
import fs from 'fs';
import path from 'path';

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
    console.log('Generating PDF report...', payload);
    
    try {
        // Connect to the browserless Chrome container
        const browser = await puppeteer.connect({
            browserURL: `http://chrome:${SUAPScraper.chromePort}`,
        });
        
        const page = await browser.newPage();
        
        // Read the HTML file from disk
        const htmlPath = path.join(process.cwd(), 'foo.html');
        
        if (!fs.existsSync(htmlPath)) {
            throw new Error(`HTML file not found at: ${htmlPath}`);
        }
        
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Set the HTML content
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });
        
        await page.close();
        
        // Convert Buffer to Base64
        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `relatorio_ensino_${timestamp}.pdf`;
        
        console.log(`PDF generated successfully - Size: ${pdfBuffer.length} bytes`);
        
        return { 
            success: true, 
            pdfData: pdfBase64,
            filename: filename,
            mimeType: 'application/pdf',
            size: pdfBuffer.length,
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