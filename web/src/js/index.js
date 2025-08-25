import Form from './components/form.js';
import WSClient from "./helpers/wsclient.js";
import Toast from "./components/toast.js";

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

const professorListContainer = document.querySelector('.professor-list');

const form = new Form(document.querySelector('form.user-search'));
form.submit(async data => {
    professorListContainer.innerHTML = '';
    // console.log(data);
    let closeStream = null;
    let processing = false;
    let toast = null;
    await new Promise(async (resolve) => {
        closeStream = await wsserver.stream('get_professors', {
            query: data['professor-id']
        }, message => {
            console.log(new Date().toISOString(), message);

            if (message.status === 'in queue' && message.position > 1) {
                if (toast) { toast.close(); }
                toast = Toast.info(`Outro processo está em andamento. Sua posição na fila: <strong>${message.position}.</strong>`, null);
                return;
            }
            
            if (message.position === 0) {
                if (toast) { toast.close(); }
                toast = Toast.success('Buscando professores...', null);
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

            if (message.professors) {
                if (toast) { toast.close(); }
                renderProfessorList(message.professors);
                resolve(message.professors);
                return;
            }
        });
    });
    closeStream();
});

function renderProfessorList(professors) {
    // Handle empty results
    if (!professors || professors.length === 0) {
        professorListContainer.classList.add('empty-state');
        professorListContainer.innerHTML = `
            <div class="list-header">
                <h2>Nenhum Professor Encontrado</h2>
                <p>Não foram encontrados professores com os critérios de busca informados.</p>
            </div>
        `;
        return;
    }

    professorListContainer.innerHTML = `
        <div class="list-header">
            <h2>Professores Encontrados</h2>
            <p>Selecione o professor desejado para continuar (${professors.length} resultado${professors.length !== 1 ? 's' : ''})</p>
        </div>
    `;
    
    const professorsGrid = document.createElement('div');
    professorsGrid.classList.add('professors-grid');
    
    // Create professor cards
    professors.forEach((professor) => {
        const professorCard = document.createElement('div');
        professorCard.classList.add('professor-card');
        professorCard.innerHTML = `
            <div class="professor-avatar">
                <img src="${professor.picture}" alt="Foto do professor ${professor.name}">
                <div class="professor-id">ID: ${professor.id}</div>
            </div>
            <div class="professor-info">
                <h3 class="professor-name">${professor.name}</h3>
                <div class="professor-details">
                    <div class="detail-item">
                        <i class="fa-solid fa-id-card"></i>
                        <span>CPF: ${professor.cpf}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fa-solid fa-user-tie"></i>
                        <span>SIAPE: ${professor.siape}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fa-solid fa-envelope"></i>
                        <span>${professor.email}</span>
                    </div>
                </div>
            </div>
            <div class="professor-actions">
                <button type="button" class="select-professor">
                    <i class="fa-solid"></i>
                    <span>Selecionar</span>
                </button>
            </div>
        `;
        
        professorsGrid.appendChild(professorCard);

        professorCard.querySelector('button.select-professor').addEventListener('click', () => {
            document.querySelectorAll('.professor-card').forEach((card) => {
                card.classList.toggle('selected', card === professorCard);
                const button = card.querySelector('button.select-professor');
                button.innerHTML = `
                    <i class="fa-solid ${card === professorCard ? 'fa-check' : ''}"></i>
                    <span>${card === professorCard ? 'Selecionado' : 'Selecionar'}</span>
                `;
            });
            selectProfessor(professor);
        });
    });
    
    professorListContainer.appendChild(professorsGrid);

    // Scroll to the results
    professorListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectProfessor(professor) {
    // console.log('Professor selecionado:', professor);
    
    // Update progress indicator
    updateProgressStep(2);
    
}

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

/* <button type="button" class="default" id="search-btn">
    <i class="fa-solid fa-magnifying-glass"></i>
    Buscar Professor
</button>
<button type="button" class="default" id="prev-btn">
    <i class="fa-solid fa-arrow-left"></i>
    Anterior
</button>
<button type="button" class="default" id="next-btn">
    Próximo
    <i class="fa-solid fa-arrow-right"></i>
</button>
<button type="button" class="default" id="generate-btn">
    <i class="fa-regular fa-file-lines"></i>
    Gerar Atestado
</button> */