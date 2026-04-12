import express from 'express';
import mustacheExpress from 'mustache-express';
import renderMiddleware from './middleware/render.js';

const port = 3000;
const host = '0.0.0.0';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', import.meta.dirname + '/view/');

// render middleware, setting some variables to be used in all views
app.use(renderMiddleware({
    wsserver: process.env.WEBSOCKET_URL,
    year: new Date().getFullYear(),

    webUrl: process.env.WEBSITE_URL,
    metaTitle: 'Gerador de Atestado de Docência - IFSUL',
    metaDescription: 'Gerador de Atestado de Docência para o Instituto Federal Sul-Rio-Grandense - Campus Charqueadas é uma ferramenta online que permite aos servidores do Campus criar atestados de docência necessários para realização de suas progressões funcionais junto à CPPD.',
    metaKeywords: 'atesdoc, atestado, docência, IFSUL, Charqueadas',
    siteName: 'Gerador de Atestado de Docência'
}));

app.get('/', (req, res) => {
    res.templateRender('index', {
        metaRobots: 'index, follow',
        canonicalPath: '/',
    });
});

// static assets
app.use(express.static(import.meta.dirname + '/public/'));

// 404
app.use((req, res) => {
    res.status(404).templateRender('notfound');
});

app.listen(port, host, () => {
    console.log(`Web Server running at http://${host}:${port}/`);
});

export default app;