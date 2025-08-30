import Modal from "../components/modal.js";
import Toast from "../components/toast.js";

export default function(wsserver, state) {
    let closeStream = null;
    let currentReportData = {};

    state.onUpdate((newState) => {
        if (newState.step === 4) {
            initializeReportGeneration();
        }
    });

    function initializeReportGeneration() {
        const reportContainer = document.querySelector('section.content:nth-child(5)');
        if (!reportContainer) return;

        // Clear any existing content
        reportContainer.innerHTML = '';
        
        // Reset report data
        currentReportData = {
            professor: state.get().professor,
            semesters: state.get().semesters,
            books: state.get().books?.filter(book => book.checked) || [],
            isComplete: false,
        };

        // reset fetched status
        currentReportData.books.forEach(book => {
            book.fetched = false;
        });

        renderReportUI(reportContainer);
        startReportGeneration();
    }

    function renderReportUI(container) {
        container.innerHTML = `
            <div class="report-generation">
                <div class="report-header">
                    <h2>Gerando Atestado de Docência</h2>
                    <p>Analisando diários e coletando informações detalhadas...</p>
                </div>

                <div class="report-progress">
                    <div class="progress-stats">
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="fa-solid fa-user-tie"></i>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label">Professor</span>
                                <span class="stat-value">${currentReportData.professor?.name || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="fa-solid fa-calendar-days"></i>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label">Semestres</span>
                                <span class="stat-value">${currentReportData.semesters?.join(', ') || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="fa-solid fa-book"></i>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label">Diários Selecionados</span>
                                <span class="stat-value">${currentReportData.books.length}</span>
                            </div>
                        </div>
                    </div>

                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">
                            <span class="progress-status"></span>
                            <span class="progress-count">0 / ${currentReportData.books.length}</span>
                        </div>
                    </div>
                </div>

                <div class="fetched-books-container">
                    <h3>
                        <i class="fa-solid fa-clipboard-list"></i>
                        Diários Analisados
                        <span class="fetched-count">(0 de ${currentReportData.books.length})</span>
                    </h3>
                    <div class="fetched-books-grid">
                        <!-- Books will be added here as they are fetched -->
                    </div>
                </div>

                <div class="report-actions">
                    <button class="back-btn">
                        <i class="fa-solid fa-arrow-left"></i>
                        <span>Voltar aos Diários</span>
                    </button>
                    <button class="generate-btn">
                        <i class="fa-solid fa-file-pdf"></i>
                        <span>Gerar Documento</span>
                    </button>
                    <button class="view-report-btn">
                        <i class="fa-solid fa-eye"></i>
                        <span>Visualizar Relatório</span>
                    </button>
                </div>
            </div>
        `;

        // Add event listeners for action buttons
        const backBtn = container.querySelector('.back-btn');
        const generateBtn = container.querySelector('.generate-btn');
        const viewReportBtn = container.querySelector('.view-report-btn');

        backBtn?.addEventListener('click', () => {
            if (closeStream) closeStream();
            state.update({ step: 3 });
        });

        generateBtn?.addEventListener('click', () => {
            generateDocument();
        });

        viewReportBtn?.addEventListener('click', () => {
            showReportPreview();
        });
    }

    let isFetching = false;
    async function startReportGeneration() {
        if (isFetching) return;
        isFetching = true;

        if (currentReportData.books.length === 0) {
            Toast.error('Nenhum diário selecionado para análise.');
            return;
        }

        const booksToFetch = currentReportData.books;
        let processing = false;
        let toast = null;
        let fetchedCount = 0;

        try {
            closeStream = await wsserver.stream('get_report', {
                books: booksToFetch,
                semesters: currentReportData.semesters,
                professorName: currentReportData.professor,
            }, message => {
                console.log(new Date().toISOString(), message);

                if (message.status === 'in queue' && message.position > 1) {
                    updateProgressStatus(`Na fila - Posição ${message.position}`, 0, booksToFetch.length);
                    if (toast) toast.close();
                    toast = Toast.info(`Outro processo está em andamento. Sua posição na fila: <strong>${message.position}.</strong>`, null);
                    return;
                }

                if (message.position === 0) {
                    updateProgressStatus('Analisando diários...', 0, booksToFetch.length);
                    if (toast) toast.close();
                    toast = Toast.warning(`Analisando aulas registradas nos diários. Isso pode levar alguns minutos...`, null);
                    processing = true;
                    return;
                }

                if (!processing) return;

                if (message.status === 'authenticating') {
                    updateProgressStatus('Autenticando no SUAP...', fetchedCount, booksToFetch.length);
                    if (toast) toast.close();
                    toast = Toast.warning('Realizando autenticação no SUAP...', null);
                    return;
                }

                if (message.status === 'fetched') {
                    fetchedCount++;
                    updateProgressStatus(`Analisando diários...`, fetchedCount, booksToFetch.length);
                    
                    if (toast) {
                        toast.type = 'info';
                        toast.setText(`<i class="fa-solid fa-spinner fa-spin-pulse"></i> Diários analisados: ${fetchedCount}/${booksToFetch.length}`);
                    }

                    const currentBook = currentReportData.books.find(b => b.id === message.book.id);
                    if (currentBook) {
                        currentBook.fetched = true;
                        currentBook.report = message.book.report;
                    }
                    renderFetchedBooks(currentReportData.books.filter(b => b.fetched));

                    return;
                }

                if (message.error) {
                    updateProgressStatus('Erro durante o processamento', fetchedCount, booksToFetch.length);
                    if (toast) toast.close();
                    Toast.error(message.error);
                    showErrorState(message.error);
                    return;
                }

                if (message.books) {
                    if (toast) toast.close();
                    updateProgressStatus('Análise concluída!', booksToFetch.length, booksToFetch.length);
                    state.update({ books: currentReportData.books });
                    renderFetchedBooks(currentReportData.books);
                    showReportActions();
                    Toast.success('Análise concluída com sucesso!');
                    isFetching = false;
                    currentReportData.isComplete = true;
                    return;
                }
            });
        } catch (error) {
            console.error('Error starting report generation:', error);
            updateProgressStatus('Erro de conexão', 0, booksToFetch.length);
            Toast.error('Erro ao conectar com o servidor');
            showErrorState('Erro ao conectar com o servidor');
        }
    }

    function updateProgressStatus(status, current, total) {
        const progressStatus = document.querySelector('.progress-status');
        const progressCount = document.querySelector('.progress-count');
        const progressFill = document.querySelector('.progress-fill');

        if (progressStatus) progressStatus.textContent = status;
        if (progressCount) progressCount.textContent = `${current} / ${total}`;
        
        if (progressFill && total > 0) {
            const percentage = (current / total) * 100;
            progressFill.style.width = `${percentage}%`;
        }
    }

    function renderFetchedBooks(books) {
        const grid = document.querySelector('.fetched-books-grid');
        if (!grid) return;

        // Clear placeholder cards
        grid.innerHTML = '';

        books.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'fetched-book-card completed';
            
            bookCard.innerHTML = `
                <div class="book-card-header">
                    <div class="semester-badge-container">
                        ${Object.keys(book.report.semesters).map(sem => `
                            <div class="semester-badge">${sem}</div>
                        `).join('')}
                    </div>
                    <div class="completion-icon"><i class="fa-solid fa-check"></i></div>
                </div>
                <div class="book-card-content">
                    <h4 class="book-title">${book.book}</h4>
                    <p class="book-class">${book.class}</p>
                </div>
            `;

            const infoIcon = document.createElement('div');
            infoIcon.className = 'info-icon';
            infoIcon.title = `Mais informações`;
            infoIcon.innerHTML = ` <i class="fa-solid fa-circle-info"></i> `;
            bookCard.querySelector('.book-card-header .semester-badge-container').append(infoIcon);
            infoIcon.addEventListener('click', () => {
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
                    </div>
                `).join('');

                new Modal(`
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
                        </div>
                        
                        <div class="semester-details">
                            <h3><i class="fa-solid fa-chart-bar"></i> Detalhes por Semestre</h3>
                            <div class="semester-details-grid">
                                ${semesterDetailsHtml}
                            </div>
                        </div>
                        
                        <div class="period-explanation">
                            <p><i class="fa-solid fa-info-circle"></i> As aulas elegíveis são aquelas que foram registradas em nome do professor <strong>${book.teacher}</strong>.</p>
                            <p><i class="fa-solid fa-info-circle"></i> O período considerado para cada semestre segue o calendário civil: o <strong>primeiro semestre</strong> abrange aulas registradas de <strong>janeiro a junho</strong>, enquanto o <strong>segundo semestre</strong> corresponde às aulas de <strong>julho a dezembro</strong>.</p>
                            <p><i class="fa-solid fa-info-circle"></i> Cada perído corresponde a 45 minutos de aula.
                        </div>
                    </div>
                `, { large: true });
            });

            grid.appendChild(bookCard);
        });

        // Update final count
        const fetchedCountEl = document.querySelector('.fetched-count');
        if (fetchedCountEl) {
            fetchedCountEl.textContent = `(${books.length} de ${currentReportData.books.length})`;
        }
    }

    function showReportActions() {
        const actionsContainer = document.querySelector('.report-actions');
        if (actionsContainer) {
            actionsContainer.classList.add('show');
        }
    }

    function showErrorState(error) {
        const reportContainer = document.querySelector('.report-generation');
        if (!reportContainer) return;

        reportContainer.innerHTML += `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3>Erro durante o processamento</h3>
                <p>${error}</p>
                <div class="error-actions">
                    <button class="retry-btn">
                        <i class="fa-solid fa-rotate-right"></i>
                        <span>Tentar Novamente</span>
                    </button>
                    <button class="back-btn">
                        <i class="fa-solid fa-arrow-left"></i>
                        <span>Voltar</span>
                    </button>
                </div>
            </div>
        `;

        const retryBtn = reportContainer.querySelector('.error-actions .retry-btn');
        const backBtn = reportContainer.querySelector('.error-actions .back-btn');

        retryBtn?.addEventListener('click', () => {
            initializeReportGeneration();
        });

        backBtn?.addEventListener('click', () => {
            state.update({ step: 3 });
        });
    }

    function generateDocument() {
        Toast.info('Função de geração de documento será implementada em breve...');
    }

    function showReportPreview() {
        Toast.info('Função de visualização será implementada em breve...');
    }

    // Cleanup function
    function cleanup() {
        if (closeStream) {
            closeStream();
            closeStream = null;
        }
    }

    // Handle page unload or navigation away
    window.addEventListener('beforeunload', cleanup);
}