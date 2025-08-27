import Toast from "../components/toast.js";

export default function(wsserver, state) {
    state.onUpdate((newState) => {
        if (newState.books) {
            renderBookList(newState.books);
        }
    });

    function renderBookList(books) {
        const bookListContainer = document.querySelector('.book-list');

        // Handle empty results
        if (books.length === 0) {
            bookListContainer.classList.add('empty-state');
            bookListContainer.innerHTML = `
                <div class="list-header">
                    <h2>Nenhum Diário Encontrado</h2>
                    <p>Não foram encontrados diários para os semestres selecionados.</p>
                </div>
            `;
            return;
        }

        bookListContainer.classList.remove('empty-state');
        bookListContainer.innerHTML = `
            <div class="list-header">
                <h2>Diários Encontrados</h2>
                <p>Encontrados ${books.length} diário${books.length !== 1 ? 's' : ''} para os semestres selecionados</p>
            </div>
        `;

        const tableContainer = document.createElement('div');
        tableContainer.classList.add('book-table-container');
        
        const table = document.createElement('table');
        table.classList.add('book-table');
        
        // Table header
        table.innerHTML = `
            <thead>
                <tr>
                    <th></th>
                    <th><i class="fa-solid fa-calendar"></i> Semestre</th>
                    <th><i class="fa-solid fa-chalkboard-user"></i> Turma</th>
                    <th><i class="fa-solid fa-book"></i> Componente Curricular</th>
                    <th><i class="fa-solid fa-external-link"></i> Link</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tbody = table.querySelector('tbody');

        // Create book rows
        books.forEach((book, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="check-cell">
                    <input type="checkbox" class="book-checkbox" ${book.checked ? 'checked' : ''}>
                </td>
                <td class="semester-cell">
                    <span class="semester-badge">${book.semester}</span>
                </td>
                <td class="class-cell">
                    <span class="class-name">${book.class}</span>
                </td>
                <td class="title-cell">
                    <span class="book-title">${book.book}</span>
                </td>
                <td class="link-cell">
                    <a href="${book.link}" target="_blank" class="book-link" title="Abrir diário em nova aba">
                        <i class="fa-solid fa-external-link"></i>
                        <span>Diário</span>
                    </a>
                </td>
            `;

            // Add selected class for checked checkboxes
            const checkbox = row.querySelector('.book-checkbox');
            if (checkbox.checked) {
                row.classList.add('selected');
            }

            // Add event listener to toggle selected class
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    row.classList.add('selected');
                } else {
                    row.classList.remove('selected');
                }

                books[index].checked = checkbox.checked;
                state.update({ books });
                updateProgressSummary();
            });

            tbody.appendChild(row);
        });

        tableContainer.appendChild(table);
        bookListContainer.appendChild(tableContainer);

        // Add proceed to next step button and summary
        const existingSummary = document.querySelector('.progress-summary');
        if (existingSummary) {
            updateProgressSummary();
        }
        else {
            renderProgressSummary(books);
        }
    }

    function renderProgressSummary(books) {
        // Remove existing summary if present
        const existingSummary = document.querySelector('.progress-summary');
        if (existingSummary) {
            existingSummary.remove();
        }

        const selectedBooks = books.filter(book => book.checked);
        
        const summaryContainer = document.createElement('div');
        summaryContainer.classList.add('progress-summary');
        summaryContainer.innerHTML = `
            <div class="summary-content">
                <div class="summary-info">
                    <div class="summary-icon">
                        <i class="fa-solid fa-clipboard-check"></i>
                    </div>
                    <div class="summary-text">
                        <h3>Seleção Concluída</h3>
                        <p><span class="selected-count">${selectedBooks.length}</span> de ${books.length} diários selecionados</p>
                    </div>
                </div>
                <button class="proceed-btn" ${selectedBooks.length === 0 ? 'disabled' : ''}>
                    <i class="fa-solid fa-arrow-right"></i>
                    <span>Gerar Atestado</span>
                </button>
            </div>
        `;

        // Add click handler for proceed button
        const proceedBtn = summaryContainer.querySelector('.proceed-btn');
        proceedBtn.addEventListener('click', () => {
            if (selectedBooks.length === 0) return;
            state.update({ step: 3, });
        });

        // Insert after the book list container
        const bookListContainer = document.querySelector('.book-list');
        bookListContainer.parentNode.insertBefore(summaryContainer, bookListContainer.nextSibling);
    }

    function updateProgressSummary() {
        const summaryContainer = document.querySelector('.progress-summary');
        if (!summaryContainer) return;

        const books = state.get().books || [];
        const selectedBooks = books.filter(book => book.checked);
        
        // Update count
        const selectedCountElement = summaryContainer.querySelector('.selected-count');
        if (selectedCountElement) {
            selectedCountElement.textContent = selectedBooks.length;
        }

        // Update button state
        const proceedBtn = summaryContainer.querySelector('.proceed-btn');
        if (proceedBtn) {
            if (selectedBooks.length === 0) {
                proceedBtn.disabled = true;
                proceedBtn.setAttribute('disabled', '');
            } else {
                proceedBtn.disabled = false;
                proceedBtn.removeAttribute('disabled');
            }
        }
    }

}

// TODO: a way to go back to step 2
// TODO: fetch inside books and go to step 4.