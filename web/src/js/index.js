import TemplateVar from "./helpers/template-var.js";
import Form from './components/form.js';
import WSClient from "./helpers/wsclient.js";

import '../less/index.less';

const wsserver = new WSClient({ url: 'ws://localhost:8080', reconnect: false });

// const data = await this.server.send('run', {
//     gladiators: this.gladiators,
//     realTime: this.realTime,
// });
// this.server.stream('simulation', { simulation: this.id }, data => {
// });

const form = new Form(document.querySelector('form.user-search'));
form.submit(async data => {
    // console.log(data);
    const response = await wsserver.send('get_professors', {
        search: data['professor-id']
    });
    console.log(response);
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