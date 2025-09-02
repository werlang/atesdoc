export default class Semester {

    constructor(semester) {
        this.year = parseInt(semester.split(/[\/\.]/)[0]);
        this.period = parseInt(semester.split(/[\/\.]/)[1]);
    }

    static getFirst(semesterList) {
        const sorted = Semester.sort(semesterList);
        return sorted[0];
    }

    static getLast(semesterList) {
        const sorted = Semester.sort(semesterList);
        return sorted[sorted.length - 1];
    }

    static sort(semesterList) {
        const list = semesterList.map(sem => {
            if (sem instanceof Semester) return sem;
            return new Semester(sem);
        });

        // sort
        list.sort((a, b) => {
            if (a.year !== b.year) {
                return a.year - b.year;
            }
            return a.semester - b.semester;
        });
        return list;
    }

    static fromDate(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const semester = month <= 6 ? 1 : 2;
        return new Semester(`${year}.${semester}`);
    }

    toString() {
        return `${this.year}.${this.period}`;
    }

    getNext() {
        const nextSemester = `${this.year}.${this.period + 1}`;
        if (this.period === 2) {
            return new Semester(nextSemester);
        }
        return new Semester(`${this.year + 1}.1`);
    }

    getPrevious() {
        const previousSemester = `${this.year}.${this.period - 1}`;
        if (this.period === 0) {
            return new Semester(`${this.year - 1}.2`);
        }
        return new Semester(previousSemester);
    }

}