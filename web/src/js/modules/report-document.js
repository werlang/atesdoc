// const sampleFormattedData = {
//     professor: {
//         name: 'Pablo Santos Werlang',
//         siape: '1234567',
//     },
//     semesters: {
//         '2025.1': {
//             books: [
//                 {
//                     program: 'Curso Técnico de Informática',
//                     course: 'Programação Web I',
//                     classes: {
//                         quantity: 2,
//                         weekly: 1,
//                         semester: 20,
//                         hours: 15,
//                     }
//                 },
//             ],
//             total: {
//                 classes: 1,
//                 components: 1,
//                 weekly: 2,
//                 semesterHours: 30,
//             }
//         },
//     },
// }

import Toast from "../components/toast.js";


export default async function generateDocument(wsserver, data) {
    // console.log(data);

    const formattedData = {
        professor: {
            name: data.professor.name,
            siape: data.professor.siape,
        },
        semesters: Object.fromEntries(data.semesters.map(semester => [semester, {}]))
    };

    for (const semester in formattedData.semesters) {
        data.books.forEach(book => {
            if (book.report.semesters[semester]) {
                if (!formattedData.semesters[semester].books) {
                    formattedData.semesters[semester].books = [];
                }

                formattedData.semesters[semester].books.push({
                    program: book.program,
                    book: book.book,
                    classes: {
                        weekly: book.report.semesters[semester].weekly,
                        semester: book.report.semesters[semester].blocks,
                        hours: book.report.semesters[semester].hours,
                    }
                });
            }
        });

        let books = formattedData.semesters[semester].books;
        let newBooks = [];
        while (books && books.length) {
            const sameBooks = books.filter(book => book.book === books[0].book && book.program === books[0].program);
            books = books.filter(book => book.book !== books[0].book || book.program !== books[0].program);
            if (sameBooks.length > 0) {
                newBooks.push({
                    program: sameBooks[0].program,
                    course: sameBooks[0].book,
                    classes: {
                        weekly: sameBooks.reduce((acc, book) => acc + book.classes.weekly, 0) / sameBooks.length,
                        semester: sameBooks.reduce((acc, book) => acc + book.classes.semester, 0) / sameBooks.length,
                        hours: sameBooks.reduce((acc, book) => acc + book.classes.hours, 0) / sameBooks.length,
                        quantity: sameBooks.length,
                    }
                });
            }
        }

        if (newBooks.length) {
            formattedData.semesters[semester].books = newBooks;
    
            formattedData.semesters[semester].total = {
                classes: formattedData.semesters[semester].books.reduce((acc, book) => acc + book.classes.quantity, 0),
                components: formattedData.semesters[semester].books.length,
                weekly: formattedData.semesters[semester].books.reduce((acc, book) => acc + book.classes.weekly * book.classes.quantity, 0),
                semesterHours: formattedData.semesters[semester].books.reduce((acc, book) => acc + book.classes.hours * book.classes.quantity, 0),
            };
        }
    }

    // console.log(formattedData);
    let closeStream;
    await new Promise(async (resolve, reject) => {
        
        let toast = null;
        closeStream = await wsserver.stream('post_report', {
            report: formattedData,
        }, message => {
            console.log(new Date().toISOString(), message);

            if (message.status === 'processing') {
                if (toast) toast.close();
                toast = Toast.info('Gerando documento PDF...', null);
            }

            const pdfData = message.pdfData;
            if (pdfData) {
                const link = document.createElement('a');
                link.href = `data:${message.mimeType};base64,${pdfData}`;
                link.download = message.filename || 'report.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                resolve(message);
                if (closeStream) closeStream();
                if (toast) toast.close();
                Toast.success('PDF gerado com sucesso!');
            }
    
            if (message.error) {
                console.error('Error generating PDF:', message.error);
                reject(message.error);
                if (closeStream) closeStream();
                if (toast) toast.close();
                Toast.error(`Erro ao gerar PDF: ${message.error}`);
            }

        });
    });
    closeStream();
}
