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
    apiurl: process.env.API_URL,
}));

app.get('/', (req, res) => {
    res.templateRender('index', {
        year: new Date().getFullYear(),
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