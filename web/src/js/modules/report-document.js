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
    console.log(data);

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
                    course: book.component,
                    classes: {
                        weekly: book.report.semesters[semester].weekly,
                        semester: book.report.semesters[semester].blocks,
                        hours: book.report.semesters[semester].hours,
                    }
                });
            }
        });
    }


    console.log(formattedData);
}