const path = require('path');
const fs = require('fs');

module.exports = (data) => {
    const templatePath = `template`;

    const template = {
        root: fs.readFileSync(path.join(__dirname, templatePath, 'document.html'), 'utf-8'),
        table: fs.readFileSync(path.join(__dirname, templatePath, 'table.html'), 'utf-8'),
        courseFirstRow: fs.readFileSync(path.join(__dirname, templatePath, 'course-1st-row.html'), 'utf-8'),
        courseRow: fs.readFileSync(path.join(__dirname, templatePath, 'course-row.html'), 'utf-8'),
    };

    const replaceVariables = (template, variables, prefix = '') => {
        for (const [key, value] of Object.entries(variables)) {
            // nested
            if (typeof value === 'object') {
                return replaceVariables(template, value, `${prefix}${key}.`);
            }
            const regex = new RegExp(`{{${prefix}${key}}}`, 'g');
            template = template.replace(regex, value);
        }
        return template;
    }

    const getCourse = (course) => {
        return course.componentes.map((componente, index) => {
            return replaceVariables(index === 0 ? template.courseFirstRow : template.courseRow, {
                classesLength: course.componentes.length,
                courseName: course.nome,
                name: componente.componente,
                classes: componente.turmas.length,
                weekly: componente.total.semanal.toString().replace('.',','),
                semester: componente.total.semestral.toString().replace('.',','),
                hours: componente.total.carga.toString().replace('.',','),
            });
        }).join('');
    }

    const periodsDocument = Object.entries(data.periodos).map(([periodKey, period]) => replaceVariables(template.table, {
        period: periodKey.replace(/_/g, '/'),
        coursesTable: period.cursos.map((course) => getCourse(course)).join(''),
        summary: {
            classes: period.resumo.turmas,
            components: period.resumo.componentes,
            weeklyClasses: period.resumo.aulasSemanais.toString().replace('.',','),
            semesterHours: period.resumo.cargaSemestral.toString().replace('.',','),
        }
    })).join('');

    const rootDocument = replaceVariables(template.root, {
        teacherName: data.nome,
        teacherSiape: data.siape,
        periods: Object.keys(data.periodos).map(key => key.replace(/_/g, '/')).join(', '),
        periodsTables: periodsDocument,
        depex: 'Lisiane Araujo Pinheiro',
        city: 'Charqueadas',
        day: new Date().getDate(),
        month: new Date().toLocaleString('pt-br', { month: 'long' }),
        year: new Date().getFullYear(),
    });

    return rootDocument;
}