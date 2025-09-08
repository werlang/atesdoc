import DocumentBuilder from '../helpers/document-builder.js';
import SUAPScraper from '../helpers/scraper.js';

export default class Report {

    constructor({ professor, semesters }) {
        this.professor = professor;
        this.semesters = semesters;
    }

    get() {
        return {
            professor: this.professor,
            semesters: this.semesters,
        };
    }

    toJSON(beautify = false) {
        return JSON.stringify(this.get(), null, beautify ? 2 : 0);
    }

    async toPDF() {
        const { html, filename } = this.toHTML();
        console.log(html);
        const pdf = await SUAPScraper.generatePDF(html);
        return { pdf, filename: filename.replace('.html', '.pdf') };
    }

    toHTML() {
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('.')[0].replace(/[:T]/g, '-');
        const filename = `report_${timestamp}_${this.professor.siape}.html`;

        const html = new DocumentBuilder(this.get()).build();
        return { html, filename };
    }
    
}