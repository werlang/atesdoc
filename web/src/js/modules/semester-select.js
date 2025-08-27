import Form from "../components/form.js";
import Toast from "../components/toast.js";

export default function(wsserver, state) {
    const form = new Form(document.querySelector('form.semester-selection'));

    let currentSelection = null;

    form.submit(async () => {
        state.update({ step: 3 });
;
        if (!currentSelection || currentSelection.semesters != state.get().semesters || currentSelection.professor != state.get().professor) {
            // Show skeleton cards immediately when form is submitted
            renderSkeletonList();
            getBooks();
            currentSelection = { semesters: state.get().semesters, professor: state.get().professor };
        }
    });

    form.getButton('prev-semester-btn').click(() => {
        state.update({ step: 1 });
    });

    function formatSemester(text) {
        const [year, semester] = text.split(/[\.\/]/).map(Number);
        return { year, semester, checked: true };
    }

    state.onUpdate((newState) => {
        form.get().querySelector('.form-header .professor-name').textContent = newState.professor?.name;

        if (newState.semesters === null) {
            newState.semesters = firstFour.map(sem => `${sem.year}.${sem.semester}`);
            state.update({ semesters: newState.semesters });
            return;
        };
        const formattedSemesters = newState.semesters.map(formatSemester);
        semesterList.forEach(sem => {
            const found = formattedSemesters.find(s => s.year === sem.year && s.semester === sem.semester);
            sem.checked = !!found;
        });
        renderSemesterList();

        if (newState.semesters?.length === 0) {
            form.getButton('search-books-btn').disable(false);
        }
        else {
            form.getButton('search-books-btn').enable();
            if (currentSelection === null) {
                currentSelection = { semesters: newState.semesters, professor: newState.professor };
            }
        }
    });

    function createSemesterList() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const currentSemester = currentMonth < 6 ? 1 : 2;
    
        const listSize = 9;
        const semesterList = Array.from({ length: listSize }, (_, i) => {
            let semester = currentSemester - i;
            let year = currentYear;
            while (semester <= 0) {
                semester += 2;
                year -= 1;
            }
            return { semester, year, checked: false };
        });

        return semesterList;
    }

    const semesterSelectContainer = document.querySelector('.semester-list');
    const semesterList = createSemesterList();

    function renderSemesterList() {
        semesterSelectContainer.innerHTML = '';
        semesterList.forEach(({ semester, year, checked }) => {
            const container = document.createElement('div');
            container.classList.add('semester-button');
            container.innerHTML = `
                <input type="checkbox" name="semester-${year}-${semester}" id="semester-${year}-${semester}" value="${year}.${semester}" ${checked ? 'checked' : ''}>
                <label for="semester-${year}-${semester}">${year}/${semester}</label>
            `;

            semesterSelectContainer.appendChild(container);

            container.querySelector('input').addEventListener('change', () => {
                const semesters = Array.from(semesterSelectContainer.querySelectorAll('input[type="checkbox"]:checked')).map(e => e.value);
                state.update({ semesters });
            });
        });
    }

    // check first four semesters
    const firstFour = semesterList.slice(0, 4);
    firstFour.forEach(sem => sem.checked = true);

    renderSemesterList();

    function renderSkeletonList(count = 5) {
        const existingSummary = document.querySelector('.progress-summary');
        if (existingSummary) {
            existingSummary.remove();
        }
        
        const bookListContainer = document.querySelector('.book-list');
        bookListContainer.classList.remove('empty-state');
        bookListContainer.innerHTML = `
            <div class="list-header">
                <h2>Carregando Diários...</h2>
                <p>Aguarde enquanto buscamos os diários</p>
            </div>
        `;

        const tableContainer = document.createElement('div');
        tableContainer.classList.add('book-table-container');
        
        const table = document.createElement('table');
        table.classList.add('book-table', 'skeleton');
        
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

        // Create skeleton rows
        const tbody = table.querySelector('tbody');
        for (let i = 0; i < count; i++) {
            const row = document.createElement('tr');
            row.classList.add('skeleton-row');
            row.innerHTML = `
                <td><div class="skeleton-checkbox"></div></td>
                <td><div class="skeleton-text skeleton-semester"></div></td>
                <td><div class="skeleton-text skeleton-class"></div></td>
                <td><div class="skeleton-text skeleton-title"></div></td>
                <td><div class="skeleton-link"></div></td>
            `;
            tbody.appendChild(row);
        }

        tableContainer.appendChild(table);
        bookListContainer.appendChild(tableContainer);

        // Scroll to the results
        bookListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function getBooks() {
        let closeStream;
        let processing = false;
        let toast = null;
        await new Promise(async (resolve) => {
            closeStream = await wsserver.stream('get_books', {
                semesters: state.get().semesters,
                professorId: state.get().professor.id,
            }, message => {
                console.log(new Date().toISOString(), message);

                if (message.status === 'in queue' && message.position > 1) {
                    if (toast) { toast.close(); }
                    toast = Toast.info(`Outro processo está em andamento. Sua posição na fila: <strong>${message.position}.</strong>`, null);
                    return;
                }

                if (message.position === 0) {
                    if (toast) { toast.close(); }
                    toast = Toast.success('Buscando diários...', null);
                    processing = true;
                    return;
                }

                if (!processing) return;

                if (message.status === 'authenticating') {
                    if (toast) { toast.close(); }
                    toast = Toast.warning('Realizando autenticação no SUAP...', null);
                    return;
                }

                if (message.error) {
                    if (toast) { toast.close(); }
                    toast = Toast.error(message.error);
                    resolve(message.error);
                    return;
                }

                if (message.books) {
                    if (toast) { toast.close(); }
                    const books = message.books.map(b => ({
                        ...b,
                        checked: true,
                    }));
                    state.update({ books });
                    resolve(books);
                    return;
                }
            });
        });
        closeStream();
    }
}