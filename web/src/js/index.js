import Form from './components/form.js';
import WSClient from "./helpers/wsclient.js";
import Toast from "./components/toast.js";

import '../less/index.less';

const wsserver = new WSClient({ url: 'ws://localhost:8080' });

let firstConnection = true;
wsserver.onConnect(() => {
    if (!firstConnection) {
        Toast.success('Reconnected to WebSocket server');
    }
    firstConnection = false;
});
wsserver.onDisconnect(() => {
    Toast.error('Disconnected from WebSocket server');
});


// const data = await this.server.send('run', {
//     gladiators: this.gladiators,
//     realTime: this.realTime,
// });
// this.server.stream('simulation', { simulation: this.id }, data => {
// });

const form = new Form(document.querySelector('form.user-search'));
form.submit(async data => {
    // console.log(data);
    wsserver.stream('get_professors', {
        query: data['professor-id']
    }, response => {
        console.log(response);
    });
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