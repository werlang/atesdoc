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


export default function generateDocument(data) {
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
                    course: book.component,
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
                    course: sameBooks[0].course,
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

    console.log(formattedData);
}