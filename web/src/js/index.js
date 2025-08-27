import WSClient from "./helpers/wsclient.js";
import Toast from "./components/toast.js";
import professorSearch from "./modules/professor-search.js";
import semesterSelect from "./modules/semester-select.js";
import StateManager from "./helpers/state.js";
import bookSelect from "./modules/book-select.js";

import '../less/index.less';

const wsserver = new WSClient({ url: 'ws://localhost:8080' });

let firstConnection = true;
wsserver.onConnect(() => {
    if (!firstConnection) {
        Toast.success('Reconectado ao servidor WebSocket');
    }
    firstConnection = false;
});
wsserver.onDisconnect(() => {
    Toast.error('Conexão perdida com o servidor WebSocket');
});

function updateProgressStep(step) {
    const steps = document.querySelectorAll('.progress-indicator .step');
    steps.forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        if (index + 1 < step) {
            stepEl.classList.add('completed');
        } else if (index + 1 === step) {
            stepEl.classList.add('active');
        }

        document.querySelectorAll('section.content').forEach((contentEl, index) => {
            contentEl.classList.toggle('active', index + 1 === step);
        });
    });
}

const state = new StateManager({
    key: 'state',
    defaults: {
        step: 1,
        professor: null,
        semesters: [],
        books: null,
    }
});
state.onUpdate((newState) => {
    updateProgressStep(newState.step);
});

professorSearch(wsserver, state);
semesterSelect(wsserver, state);
bookSelect(wsserver, state);

state.alert();
