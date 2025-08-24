import puppeteer from 'puppeteer-core';
import suapConfig from '../suap-config.js';
import CustomError from '../helpers/error.js';

export default class SUAPScraper {

    constructor({ username, password, chromePort }={}) {
        this.username = username || process.env.SUAP_USERNAME;
        this.password = password || process.env.SUAP_PASSWORD;
        this.chromePort = chromePort || process.env.CHROME_PORT || 3000;
    }

    async connect() {
        // Remote debug: edge://inspect/#devices
        try {
            this.browser = await puppeteer.connect({
                browserURL: `http://chrome:${this.chromePort}`,
                // slowMo: 250
            });
        } catch (error) {
            console.error('Could not connect to Chrome.');
            throw error;
        }

        const page = await this.browser.newPage();
        await page.setViewport({ width: 1920, height: 2000 });

        console.log('Connected to Chrome.');

        this.page = page;
        this.connected = true;
        return this;
    }

    async login() {
        console.log(`Logging in as ${this.username}`);
        await this.page.goto(`${suapConfig.baseUrl}/${suapConfig.login.url}`);
        await this.page.$eval(suapConfig.login.username, (el, _username) => el.value = _username, this.username);
        await this.page.$eval(suapConfig.login.password, (el, _password) => el.value = _password, this.password);
        await this.page.click(suapConfig.login.submit);

        await this.page.waitForSelector(suapConfig.login.ready, { timeout: 5000 });
        console.log('Login successful');

        this.logged = true;
        return this;
    }

    async goto(url, confirmElement) {
        if (!this.logged) {
            await this.login();
        }

        try {
            await this.page.goto(url);
        } catch (err) {
            this.connected = false;
            await this.connect();
            console.log('Reconnected to browser, trying to load page again...');
            return await this.goto(url, confirmElement);
        }

        if (confirmElement) {
            try {
                await this.page.waitForSelector(confirmElement, { timeout: 5000 });
                return this;
            } catch (err) {
                if (err.name === 'TimeoutError') {
                    console.log('Timeout waiting for selector, trying to login again...');
                    this.logged = false;
                    return await this.goto(url, confirmElement);
                } else {
                    throw new CustomError(500, 'Error loading professor search results');
                }
            }
        }
    }

    async findProfessor(query) {
        if (!this.connected) {
            throw new CustomError(500, 'Not connected to browser. Call connect() first.');
        }

        const campus = {
            CH: 4
        }
        // https://suap.ifsul.edu.br/admin/edu/professor/?vinculo__setor__uo=4&q=pablo&tab=tab_any_data
        suapConfig.professorSearch.query.q = query;
        query = new URLSearchParams(suapConfig.professorSearch.query).toString();
        const url = `${suapConfig.baseUrl}/${suapConfig.professorSearch.url}?${query}`;
        console.log(`Accessing URL: ${url}`);
        await this.goto(url, suapConfig.professorSearch.ready);

        const data = await this.page.evaluate(async () => {
            const professors = [];

            document.querySelectorAll('table#result_list tr').forEach(tr => {
                if (!tr.querySelector('td.field-get_dados_gerais dd')) return;

                const professor = {};

                // /edu/professor/ID/
                professor.id = parseInt(tr.querySelector('th a.icon-view')?.href.match(/\/edu\/professor\/(\d*)\//)[1]);

                const generalData = Array.from(tr.querySelectorAll('td.field-get_dados_gerais dd')).map(dd => dd.textContent.trim());

                professor.name = generalData[0];
                professor.cpf = generalData[1];
                professor.email = generalData[3];

                professor.siape = tr.querySelector('td.field-display_matricula')?.textContent.trim();

                professor.picture = tr.querySelector('td.field-get_foto img')?.src;

                professors.push(professor);
            });
            return professors;
        });
        console.log(data);

        return data;
    }
}