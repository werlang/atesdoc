import WSServer from "./helpers/wsserver.js";

const wss = new WSServer();

wss.on('get_professors', async (payload, reply) => {
    console.log(payload);
    reply({ professors: [{ name: 'Fulano de Tal', id: '123456' }] });
});