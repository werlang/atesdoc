import WSClient from "./helpers/wsclient.js";
import Toast from "./components/toast.js";
import professorSearch from "./modules/professor-search.js";
import semesterSelect from "./modules/semester-select.js";

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

professorSearch(wsserver);
semesterSelect(wsserver);
