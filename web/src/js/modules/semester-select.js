import { updateProgressStep } from "./common.js";

export default function() {
    const form = document.querySelector('form.semester-selection');
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        updateProgressStep(1);
    });

    document.addEventListener('professor-selected', (event) => {
        const professor = event.detail;
        form.querySelector('.form-header .professor-name').textContent = professor.name;
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
        semesterList.forEach(({ semester, year, checked }) => {
            const container = document.createElement('div');
            container.classList.add('semester-button');
            container.innerHTML = `
            <input type="checkbox" id="semester-${year}-${semester}" value="${year}.${semester}" ${checked ? 'checked' : ''}>
            <label for="semester-${year}-${semester}">${year}/${semester}</label>
        `;

            semesterSelectContainer.appendChild(container);
        });
    }

    // check first four semesters
    const firstFour = semesterList.slice(0, 4);
    firstFour.forEach(sem => sem.checked = true);

    renderSemesterList();
}