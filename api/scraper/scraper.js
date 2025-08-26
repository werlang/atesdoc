import puppeteer from 'puppeteer-core';
import suapConfig from '../suap-config.js';
import CustomError from '../helpers/error.js';

export default class SUAPScraper {

    constructor({ username, password, chromePort }={}) {
        this.username = username || process.env.SUAP_USERNAME;
        this.password = password || process.env.SUAP_PASSWORD;
        this.chromePort = chromePort || process.env.CHROME_PORT || 3000;
        this.connected = false;
        this.logged = false;
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
            return await new Promise(resolve => {
                setTimeout(async () => {
                    await this.connect();
                    resolve(this);
                }, 3000);
            });
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

    async goto(url, confirmElement, reply) {
        try {
            if (!this.logged) {
                reply({ status: 'authenticating' });
                await this.login();
            }
            await this.page.goto(url);
        } catch (err) {
            console.error(err);
            this.connected = false;
            await this.connect();
            console.log('Reconnected to browser, trying to load page again...');
            return await this.goto(url, confirmElement, reply);
        }

        if (confirmElement) {
            try {
                await this.page.waitForSelector(confirmElement, { timeout: 5000 });
                return this;
            } catch (err) {
                if (err.name === 'TimeoutError') {
                    console.log('Timeout waiting for selector, trying to login again...');
                    this.logged = false;
                    return await this.goto(url, confirmElement, reply);
                } else {
                    throw new CustomError(500, 'Error loading professor search results');
                }
            }
        }
    }

    async evaluate(fn, data) {
        // Serialize functions in data
        const serializeFunctions = (data) => {
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'function') {
                    data[key] = `fn:${value.toString()}`;
                } 
                else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    data[key] = serializeFunctions(value);
                }
                else if (Array.isArray(value)) {
                    data[key] = value.map(item => serializeFunctions(item));
                }
                else {
                    data[key] = value;
                }
            }
            return data;
        };
        const serialized = serializeFunctions(data);
        // serialize function argument
        serialized.fn = fn.toString();
        // console.log(serialized);

        return this.page.evaluate((data) => {
            // in the browser, deserialize functions in data
            const deserializeFunctions = (data) => {
                for (const [key, value] of Object.entries(data)) {
                    if (typeof value === 'string' && value.startsWith('fn:')) {
                        data[key] = eval(`(${value.slice(3)})`);
                    }
                    else if (typeof value === 'object' && !Array.isArray(value)) {
                        data[key] = deserializeFunctions(value);
                    }
                    else if (Array.isArray(value)) {
                        data[key] = value.map(item => deserializeFunctions(item));
                    }
                }
                return data;
            };

            // Deserialize function argument
            const fn = eval(`(${data.fn})`);
            delete data.fn;
            const deserialized = deserializeFunctions(data);

            // execute function with deserialized data
            // if inside the function some function is called from data object, it will now work properly
            return fn(deserialized);
        }, serialized);
    }

    async findProfessor(query, reply) {
        if (!this.connected) {
            throw new CustomError(500, 'Not connected to browser. Call connect() first.');
        }

        // https://suap.ifsul.edu.br/admin/edu/professor/?vinculo__setor__uo=4&q=pablo&tab=tab_any_data
        suapConfig.professorSearch.query.q = query;
        query = new URLSearchParams(suapConfig.professorSearch.query).toString();
        const url = `${suapConfig.baseUrl}/${suapConfig.professorSearch.url}?${query}`;
        console.log(`Accessing URL: ${url}`);
        await this.goto(url, suapConfig.professorSearch.ready, reply);

        // Extract data

        const data = await this.evaluate((template) => {
            const professors = [];

            document.querySelectorAll(template.rows).forEach(tr => {
                if (!tr.querySelector(template.hasRows)) return;

                const professor = {};

                for (const [key, fn] of Object.entries(template.data)) {
                    professor[key] = fn(tr);
                }

                professors.push(professor);
            });
            return professors;
        }, suapConfig.professorSearch);
        console.log(data);

        return data;
    }

    async findBooks(professorId, semesters, reply) {
        if (!this.connected) {
            throw new CustomError(500, 'Not connected to browser. Call connect() first.');
        }
        return semesters.map(semester => {
            const url = `${suapConfig.baseUrl}/${suapConfig.bookSearch.url.base}/${professorId}/?${suapConfig.bookSearch.url.query}${semester}`;
            return url;
        })
    }
}