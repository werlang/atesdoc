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
    await new Promise((resolve, reject) => wsserver.stream('get_professors', {
        query: data['professor-id']
    }, message => {
        console.log(message);

        if (message.position && message.position > 1) {
            Toast.info(`Outro processo está em andamento. Sua posição na fila: <strong>${message.position}.</strong>`);
        }

        if (message.error) {
            Toast.error(message.error);
            resolve(message.error);
            return;
        }

        if (message.professors) {
            resolve(message.professors);
            return;
        }
    }));
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