import Form from "../components/form.js";

export default function(wsserver, state) {
    const form = new Form(document.querySelector('form.semester-selection'));
    form.submit((_, button) => {
        if (button.get().id === 'prev-semester-btn') {
            state.update({ step: 1 });
            return;
        }

        getBooks();
    });

    state.onUpdate((newState) => {
        form.get().querySelector('.form-header .professor-name').textContent = newState.professor?.name;
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

    function formatSemester(text) {
        const [year, semester] = text.split(/[\.\/]/).map(Number);
        return { year, semester, checked: true };
    }

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

    state.onUpdate((newState) => {
        if (!newState.semesters.length) return;
        const formattedSemesters = newState.semesters.map(formatSemester);
        semesterList.forEach(sem => {
            const found = formattedSemesters.find(s => s.year === sem.year && s.semester === sem.semester);
            sem.checked = !!found;
        });
        renderSemesterList();
    });

    async function getBooks() {
        let closeStream;
        await new Promise(async (resolve) => {
            closeStream = await wsserver.stream('get_books', {
                semesters: state.get().semesters,
                professorId: state.get().professor.id,
            }, message => {
                console.log(new Date().toISOString(), message);
            });
        });
        closeStream();
    }
}