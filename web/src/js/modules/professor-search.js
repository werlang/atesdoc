import Form from '../components/form.js';
import Toast from '../components/toast.js';
import { updateProgressStep } from './common.js';

export default function(wsserver) {
    const professorListContainer = document.querySelector('.professor-list');

    const form = new Form(document.querySelector('form.user-search'));
    form.submit(async data => {
        // Show skeleton cards immediately when form is submitted
        renderSkeletonList();
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

    function renderSkeletonList(count = 2) {
        professorListContainer.classList.remove('empty-state');
        professorListContainer.innerHTML = `
            <div class="list-header">
                <h2>Buscando Professores...</h2>
                <p>Aguarde enquanto carregamos os resultados</p>
            </div>
        `;

        const professorsGrid = document.createElement('div');
        professorsGrid.classList.add('professors-grid');

        // Create skeleton cards
        for (let i = 0; i < count; i++) {
            const card = createSkeletonCard();
            professorsGrid.append(card);
        }

        professorListContainer.append(professorsGrid);

        // Scroll to the results
        professorListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function createSkeletonCard() {
        const card = document.createElement('div');
        card.classList.add('professor-card', 'skeleton');
        card.innerHTML = `
            <div class="professor-avatar">
                <div class="skeleton-img"></div>
                <div class="skeleton-id"></div>
            </div>
            <div class="professor-info">
                <div class="skeleton-name"></div>
                <div class="professor-details">
                    <div class="detail-item">
                        <div class="skeleton-icon"></div>
                        <div class="skeleton-text"></div>
                    </div>
                    <div class="detail-item">
                        <div class="skeleton-icon"></div>
                        <div class="skeleton-text"></div>
                    </div>
                    <div class="detail-item">
                        <div class="skeleton-icon"></div>
                        <div class="skeleton-text skeleton-text-long"></div>
                    </div>
                </div>
            </div>
            <div class="professor-actions">
                <div class="skeleton-button"></div>
            </div>
        `;
        return card;
    }

    function createProfessorCard(data) {
        const card = document.createElement('div');
        card.classList.add('professor-card');
        card.innerHTML = `
            <div class="professor-avatar">
                <img src="${data.picture}" alt="Foto do professor ${data.name}">
                <div class="professor-id">ID: ${data.id}</div>
            </div>
            <div class="professor-info">
                <h3 class="professor-name">${data.name}</h3>
                <div class="professor-details">
                    <div class="detail-item">
                        <i class="fa-solid fa-id-card"></i>
                        <span>CPF: ${data.cpf}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fa-solid fa-user-tie"></i>
                        <span>SIAPE: ${data.siape}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fa-solid fa-envelope"></i>
                        <span>${data.email}</span>
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

        card.querySelector('button.select-professor').addEventListener('click', () => {
            card.parentElement.querySelectorAll('.professor-card').forEach((c) => {
                c.classList.toggle('selected', c === card);
                const button = c.querySelector('button.select-professor');
                button.innerHTML = `
                    <i class="fa-solid ${c === card ? 'fa-check' : ''}"></i>
                    <span>${c === card ? 'Selecionado' : 'Selecionar'}</span>
                `;
            });

            document.dispatchEvent(new CustomEvent('professor-selected', { detail: data }));
            updateProgressStep(2);
        });

        return card;
    }

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

        professorListContainer.classList.remove('empty-state');
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
            const card = createProfessorCard(professor);
            professorsGrid.append(card);
        });

        professorListContainer.append(professorsGrid);

        // Scroll to the results
        professorListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updateProgressStep(2)
}