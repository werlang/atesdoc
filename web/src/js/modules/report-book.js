import Modal from "../components/modal.js";

export default function showBookDetails(book, state) {
    // Generate semester details HTML
    const semesterDetailsHtml = Object.entries(book.report.semesters).map(([semesterKey, semesterData]) => `
        <div class="semester-detail-card">
            <div class="semester-detail-header">
                <h4><i class="fa-solid fa-calendar"></i> ${semesterKey}</h4>
            </div>
            <div class="semester-stats-grid">
                <div class="stat-item">
                    <i class="fa-solid fa-chalkboard-user"></i>
                    <span class="stat-label">Períodos</span>
                    <span class="stat-value">${semesterData.blocks}</span>
                </div>
                <div class="stat-item">
                    <i class="fa-solid fa-clock"></i>
                    <span class="stat-label">Horas</span>
                    <span class="stat-value">${semesterData.hours}h</span>
                </div>
            </div>
            <div class="details-container">
                <button class="details-btn">
                    <i class="fa-solid fa-list"></i>
                    <span>Detalhes</span>
                </button>
            </div>
        </div>
    `).join('');

    // Calculate totals from semester data
    const totalBlocks = Object.values(book.report.semesters).reduce((sum, semester) => sum + (semester.blocks || 0), 0);
    const totalHours = Object.values(book.report.semesters).reduce((sum, semester) => sum + (semester.hours || 0), 0);

    const modal = new Modal(`
        <h2>${book.book} - ${book.class}</h2>
        <div class="book-report-summary">
            <div class="summary-stats">
                <div class="summary-stat">
                    <div class="summary-stat-icon">
                        <i class="fa-solid fa-list-check"></i>
                    </div>
                    <div class="summary-stat-content">
                        <span class="summary-stat-label">Aulas Totais Registradas</span>
                        <span class="summary-stat-value">${book.report.lessons.length}</span>
                    </div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-icon">
                        <i class="fa-solid fa-check-circle"></i>
                    </div>
                    <div class="summary-stat-content">
                        <span class="summary-stat-label">Aulas Elegíveis</span>
                        <span class="summary-stat-value">${book.report.eligibleLessons.length}</span>
                    </div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-icon">
                        <i class="fa-solid fa-chalkboard-user"></i>
                    </div>
                    <div class="summary-stat-content">
                        <span class="summary-stat-label">Total de Períodos</span>
                        <span class="summary-stat-value">${totalBlocks}</span>
                    </div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-icon">
                        <i class="fa-solid fa-clock"></i>
                    </div>
                    <div class="summary-stat-content">
                        <span class="summary-stat-label">Total de Horas</span>
                        <span class="summary-stat-value">${totalHours}h</span>
                    </div>
                </div>
            </div>
            
            <div class="semester-details">
                <h3><i class="fa-solid fa-chart-bar"></i> Detalhes por Semestre</h3>
                <div class="semester-details-grid">
                    ${!Object.keys(book.report.semesters).length ?
                        `<p>Nenhuma aula elegível foi encontrada para este diário no período selecionado.</p>`
                        : semesterDetailsHtml
                    }
                </div>
            </div>
            
            <div class="period-explanation">
                <p><i class="fa-solid fa-info-circle"></i> As aulas elegíveis são aquelas que foram registradas em nome do professor <strong>${state.get().professor.name}</strong>.</p>
                <p><i class="fa-solid fa-info-circle"></i> O período considerado para cada semestre segue o calendário civil: o <strong>primeiro semestre</strong> abrange aulas registradas de <strong>janeiro a junho</strong>, enquanto o <strong>segundo semestre</strong> corresponde às aulas de <strong>julho a dezembro</strong>.</p>
                <p><i class="fa-solid fa-info-circle"></i> Cada período corresponde a 45 minutos de aula.</p>
            </div>
        </div>
    `, { large: true });

    // Add event handlers for details buttons after modal is created
    const detailsButtons = modal.getAll('.details-btn');
    detailsButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const semesterKeys = Object.keys(book.report.semesters);
            const selectedSemester = semesterKeys[index];
            showLessonDetails(book, selectedSemester);
        });
    });
}

function showLessonDetails(book, semester) {
    // Filter lessons for the specific semester. Sort lessons by date
    const semesterLessons = book.report.lessons.filter(lesson => lesson.semester === semester);
    semesterLessons.sort((a, b) => new Date(a.date) - new Date(b.date));

    const semesterEligibleLessons = book.report.eligibleLessons.filter(lesson => lesson.semester === semester);

    // Create lesson table HTML
    const lessonsTableHtml = semesterLessons.map(lesson => {
        const formattedDate = new Date(lesson.date).toLocaleDateString('pt-BR');
        return `
            <tr class="lesson-row ${lesson.isEligible ? 'eligible' : 'not-eligible'}">
                <td class="lesson-eligibility">
                    <div class="eligibility-badge ${lesson.isEligible ? 'eligible' : 'not-eligible'}">
                        <i class="fa-solid ${lesson.isEligible ? 'fa-check' : 'fa-times'}"></i>
                    </div>
                </td>
                <td class="lesson-date">${formattedDate}</td>
                <td class="lesson-topic">${lesson.topic || 'Sem tópico registrado'}</td>
                <td class="lesson-professor">${lesson.professor || currentReportData.professor.name}</td>
                <td class="lesson-periods">
                    <span class="periods-badge">${lesson.blocks || 1}</span>
                </td>
            </tr>
        `;
    }).join('');

    const eligibleCount = semesterEligibleLessons.length;
    const totalPeriods = semesterLessons.reduce((sum, lesson) => sum + (lesson.blocks || 1), 0);
    const eligiblePeriods = semesterEligibleLessons.reduce((sum, lesson) => sum + (lesson.blocks || 1), 0);

    // Show in modal

    new Modal(`
        <h2>
            <i class="fa-solid fa-calendar-alt"></i>
            Detalhes das Aulas - ${semester}
        </h2>
        <div class="lesson-details-summary">
            <div class="lesson-stats">
                <div class="lesson-stat">
                    <span class="stat-label">Total de Aulas</span>
                    <span class="stat-value">${semesterLessons.length}</span>
                </div>
                <div class="lesson-stat eligible">
                    <span class="stat-label">Aulas Elegíveis</span>
                    <span class="stat-value">${eligibleCount}</span>
                </div>
                <div class="lesson-stat">
                    <span class="stat-label">Total de Períodos</span>
                    <span class="stat-value">${totalPeriods}</span>
                </div>
                <div class="lesson-stat eligible">
                    <span class="stat-label">Períodos Elegíveis</span>
                    <span class="stat-value">${eligiblePeriods}</span>
                </div>
            </div>
            
            <div class="lessons-table-container">
                <h3>
                    <i class="fa-solid fa-list"></i>
                    Registro de Aulas - ${book.book}
                </h3>
                ${semesterLessons.length > 0 ? `
                    <div class="table-wrapper">
                        <table class="lessons-table">
                            <thead>
                                <tr>
                                    <th class="col-eligibility">Status</th>
                                    <th class="col-date">Data</th>
                                    <th class="col-topic">Tópico da Aula</th>
                                    <th class="col-professor">Professor</th>
                                    <th class="col-periods">Períodos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lessonsTableHtml}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="no-lessons">
                        <div class="no-lessons-icon">
                            <i class="fa-solid fa-calendar-xmark"></i>
                        </div>
                        <h4>Nenhuma aula encontrada</h4>
                        <p>Não há registros de aulas para este semestre.</p>
                    </div>
                `}
            </div>
            
            <div class="lesson-legend">
                <div class="legend-item">
                    <div class="eligibility-badge eligible">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <span>Aula elegível para o atestado</span>
                </div>
                <div class="legend-item">
                    <div class="eligibility-badge not-eligible">
                        <i class="fa-solid fa-times"></i>
                    </div>
                    <span>Aula não elegível</span>
                </div>
            </div>
        </div>
    `, { large: true });
}