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

const form = new Form(document.querySelector('form.user-search'));
form.submit(async data => {
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
                toast = Toast.info(`Outro processo está em andamento. Sua posição na fila: <strong>${message.position}.</strong>`);
                return;
            }
            
            if (message.position === 0) {
                if (toast) { toast.close(); }
                toast = Toast.success('Buscando professores...');
                processing = true;
                return;
            }

            if (!processing) return;

            if (message.status === 'authenticating') {
                if (toast) { toast.close(); }
                toast = Toast.warning('Realizando autenticação no SUAP...');
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
                resolve(message.professors);
                return;
            }
        });
    });
    closeStream();
});

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