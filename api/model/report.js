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
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('.')[0].replace(/[:T]/g, '-');
        const filename = `report_${timestamp}_${this.professor.siape}.pdf`;

        const pdf = await SUAPScraper.generatePDF('report.html', {
            professorName: this.professor.name,
            professorSiape: this.professor.siape,
        });

        return { pdf, filename };
    }
    
}