import Modal from "../components/modal.js";

export default function showBookDetails(book, state) {
    // Generate semester details HTML
    const semestersInLessons = [...new Set(book.report.lessons.map(lesson => lesson.semester))].sort();
    const semesterDetailsHtml = semestersInLessons.map((semester) => {
        const lessons = book.report.lessons.filter(lesson => lesson.semester === semester);
        const semesterData = { blocks: 0, hours: 0 };
        const eligibleLessons = lessons.filter(lesson => isLessonInSelectedPeriod(lesson.date, state.get().semesters) && lesson.isEligible);
        semesterData.blocks = eligibleLessons.reduce((sum, lesson) => sum + (lesson.blocks || 1), 0);
        semesterData.hours = semesterData.blocks * 0.75; // Each period is 45 minutes = 0.75 hours
        return `<div class="semester-detail-card">
            <div class="semester-detail-header">
                <h4><i class="fa-solid fa-calendar"></i> ${semester}</h4>
            </div>
            <div class="semester-stats-grid">
                <div class="stat-item">
                    <i class="fa-solid fa-chalkboard-user"></i>
                    <span class="stat-label">Aulas</span>
                    <span class="stat-value">${eligibleLessons.length}</span>
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
        </div>`
    }).join('');

    // Calculate totals from semester data
    const eligibleLessons = book.report.eligibleLessons.filter(lesson => isLessonInSelectedPeriod(lesson.date, state.get().semesters));
    const totalBlocks = eligibleLessons.reduce((sum, lesson) => sum + (lesson.blocks || 1), 0);
    const totalHours = totalBlocks * 0.75; // Each period is 45 minutes = 0.75 hours
    
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
                        <span class="summary-stat-value">${eligibleLessons.length}</span>
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
                <div class="semester-details-grid">${semesterDetailsHtml}</div>
            </div>
            
            <div class="period-explanation">
                <p><i class="fa-solid fa-info-circle"></i> As aulas elegíveis são aquelas que foram registradas em nome do professor <strong>${state.get().professor.name}</strong> nos semestres <strong>${state.get().semesters.join(', ')}</strong>.</p>
                <p><i class="fa-solid fa-info-circle"></i> O período considerado para cada semestre segue o calendário civil: o <strong>primeiro semestre</strong> abrange aulas registradas de <strong>janeiro a junho</strong>, enquanto o <strong>segundo semestre</strong> corresponde às aulas de <strong>julho a dezembro</strong>.</p>
                <p><i class="fa-solid fa-info-circle"></i> Cada período corresponde a 45 minutos de aula.</p>
            </div>
        </div>
    `, { large: true });

    // Add event handlers for details buttons after modal is created
    const detailsButtons = modal.getAll('.details-btn');
    detailsButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const selectedSemester = semestersInLessons[index];
            showLessonDetails(book, selectedSemester, state);
        });
    });
}

// Determine if lesson is within selected semester period (civil calendar)
function isLessonInSelectedPeriod(lessonDate, semesters) {
    const date = new Date(lessonDate);
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    
    for (const semester of semesters) {
        // Extract semester year and number from semester string (e.g., "2024.1" or "2024.2")
        const [year, semesterNum] = semester.split('.').map(Number);
        const lessonYear = date.getFullYear();
        
        // Check if lesson year matches semester year
        if (lessonYear !== year) continue;
        
        // First semester: January to June (months 1-6)
        // Second semester: July to December (months 7-12)
        if (semesterNum === 1 && month >= 1 && month <= 6) return true;
        if (semesterNum === 2 && month >= 7 && month <= 12) return true;
    }
    
    return false;
};

function showLessonDetails(book, semester, state) {
    const chosenSemesters = state.get().semesters;
    // Filter lessons for the specific semester. Sort lessons by date
    const semesterLessons = book.report.lessons.filter(lesson => lesson.semester === semester);
    semesterLessons.sort((a, b) => new Date(a.date) - new Date(b.date));

    const semesterEligibleLessons = book.report.eligibleLessons.filter(lesson => isLessonInSelectedPeriod(lesson.date, chosenSemesters) && lesson.semester === semester);

    // Create lesson table HTML
    const lessonsTableHtml = semesterLessons.map(lesson => {
        const formattedDate = new Date(lesson.date).toLocaleDateString('pt-BR');
        const isInPeriod = isLessonInSelectedPeriod(lesson.date, chosenSemesters);
        
        // Determine badge type: eligible (green check), not-eligible (red x), or outside-period (yellow calendar)
        let badgeClass, badgeIcon, rowClass, statusTitle;
        if (lesson.isEligible && isInPeriod) {
            badgeClass = 'eligible';
            badgeIcon = 'fa-check';
            rowClass = 'eligible';
            statusTitle = 'Aula elegível';
        } else {
            badgeClass = 'not-eligible';
            badgeIcon = 'fa-times';
            rowClass = 'not-eligible';
            statusTitle = 'Aula não elegível';
        }
        
        return `
            <tr class="lesson-row ${rowClass}">
                <td class="lesson-eligibility">
                    <div class="eligibility-badge ${badgeClass}" title="${statusTitle}">
                        <i class="fa-solid ${badgeIcon}"></i>
                    </div>
                </td>
                <td class="lesson-date ${!isInPeriod ? 'outside-period' : ''}">${formattedDate}</td>
                <td class="lesson-topic">${lesson.topic || 'Sem tópico registrado'}</td>
                <td class="lesson-professor ${!lesson.isEligible ? 'not-eligible' : ''}">${lesson.professor || currentReportData.professor.name}</td>
                <td class="lesson-periods">
                    <span class="periods-badge">${lesson.blocks || 1}</span>
                </td>
            </tr>
        `;
    }).join('');

    // lessons from selected professor and within period
    const eligibleCount = semesterEligibleLessons.length;
    const eligiblePeriods = semesterEligibleLessons.reduce((sum, lesson) => sum + (lesson.blocks || 1), 0);
    const totalHours = eligiblePeriods * 0.75; // Each period is 45 minutes = 0.75 hours

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
                    <span class="stat-label">Períodos Elegíveis</span>
                    <span class="stat-value">${eligiblePeriods}</span>
                </div>
                <div class="lesson-stat eligible">
                    <span class="stat-label">Total de Horas</span>
                    <span class="stat-value">${totalHours}</span>
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