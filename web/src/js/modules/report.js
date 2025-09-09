import Button from "../components/button.js";
import Toast from "../components/toast.js";
import showBookDetails from "./report-book.js";
import generateDocument from "./report-document.js";

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
            books: state.get().books,
            isComplete: false,
        };

        // reset fetched status
        currentReportData.books.forEach(book => {
            book.fetched = false;
        });

        renderReportUI(reportContainer);

        if (currentReportData.books.filter(book => book.checked).every(book => book.report)) {
            // If some books already have reports, assume generation was completed before
            currentReportData.isComplete = true;
            renderFetchedBooks(currentReportData.books.filter(book => book.checked) || []);
            showReportActions();
        }
        else {
            startReportGeneration();
        }
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
                                <span class="stat-value">${currentReportData.books.filter(book => book.checked).length}</span>
                            </div>
                        </div>
                    </div>

                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">
                            <span class="progress-status"></span>
                            <span class="progress-count"></span>
                        </div>
                    </div>
                </div>

                <div class="fetched-books-container">
                    <h3>
                        <i class="fa-solid fa-clipboard-list"></i>
                        Diários Analisados
                        <span class="fetched-count">(0 de ${currentReportData.books.filter(book => book.checked).length})</span>
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
                </div>
            </div>
        `;

        // Add event listeners for action buttons
        const backBtn = container.querySelector('.back-btn');
        backBtn?.addEventListener('click', () => {
            if (closeStream) closeStream();
            state.update({ step: 3 });
        });

        new Button({ element: container.querySelector('.generate-btn') }).click(async () => {
            await generateDocument(wsserver, { ...currentReportData, books: currentReportData.books.filter(book => book.checked && book.report) });
        })
    }

    let isFetching = false;
    async function startReportGeneration() {
        if (isFetching) return;
        isFetching = true;

        if (currentReportData.books.length === 0) {
            Toast.error('Nenhum diário selecionado para análise.');
            return;
        }

        const booksToFetch = currentReportData.books.filter(book => book.checked);
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
                    renderFetchedBooks(currentReportData.books.filter(book => book.checked) || []);
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
                            <div class="semester-badge ${
                                currentReportData.semesters.includes(sem) ? 'included' : 'excluded'
                            }">${sem}</div>
                        `).join('')}
                    </div>
                    <div class="completion-icon"><i class="fa-solid fa-check"></i></div>
                </div>
                <div class="book-card-content">
                    <h4 class="book-title">${book.book}</h4>
                    <p class="book-class">${book.class}</p>
                    <div class="book-card-actions">
                        <button class="view-details-btn">
                            <i class="fa-solid fa-chart-line"></i>
                            <span>Ver Detalhes</span>
                        </button>
                    </div>
                </div>
            `;

            const viewDetailsBtn = bookCard.querySelector('.view-details-btn');
            viewDetailsBtn.addEventListener('click', () => {
                showBookDetails(book, state);
            });

            grid.appendChild(bookCard);
        });

        // Update final count
        const fetchedCountEl = document.querySelector('.fetched-count');
        if (fetchedCountEl) {
            fetchedCountEl.textContent = `(${books.length} de ${currentReportData.books.filter(book => book.checked).length})`;
        }
    }

    function showReportActions() {
        const actionsContainer = document.querySelector('.report-actions');
        if (actionsContainer) {
            actionsContainer.classList.add('show');
            // scrolls to buttons
            actionsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            currentReportData.books.forEach(book => {
                book.fetched = false;
                book.report = null;
            });
            initializeReportGeneration();
        });

        backBtn?.addEventListener('click', () => {
            currentReportData.books.forEach(book => {
                book.fetched = false;
                book.report = null;
            });
            state.update({ step: 3 });
        });
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