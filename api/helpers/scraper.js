import puppeteer from 'puppeteer-core';
import suapConfig from '../suap-config.js';
import CustomError from './error.js';

export default class SUAPScraper {
    
    static browser = null;
    static page = null;
    static connected = false;
    static logged = false;
    static username = process.env.SUAP_USERNAME;
    static password = process.env.SUAP_PASSWORD;
    static chromePort = process.env.CHROME_PORT || 3000;

    // Private constructor to prevent instantiation
    constructor() {
        throw new Error('SUAPScraper is a static class. Use static methods instead.');
    }

    static async connect() {
        // Remote debug: edge://inspect/#devices
        try {
            SUAPScraper.browser = await puppeteer.connect({
                browserWSEndpoint: `ws://chrome:${SUAPScraper.chromePort}`,
                // slowMo: 250
            });
        } catch (error) {
            // console.log(error);
            console.error('Could not connect to Chrome.');
            await new Promise(resolve => setTimeout(resolve, 3000));
            return await SUAPScraper.connect();
        }

        const page = await SUAPScraper.browser.newPage();
        await page.setViewport({ width: 1920, height: 2000 });

        console.log('Connected to Chrome.');

        SUAPScraper.page = page;
        SUAPScraper.connected = true;
        return SUAPScraper;
    }

    static async login() {
        console.log(`Logging in as ${SUAPScraper.username}`);
        await SUAPScraper.page.goto(`${suapConfig.baseUrl}/${suapConfig.login.url}`);
        await SUAPScraper.page.$eval(suapConfig.login.username, (el, _username) => el.value = _username, SUAPScraper.username);
        await SUAPScraper.page.$eval(suapConfig.login.password, (el, _password) => el.value = _password, SUAPScraper.password);
        await SUAPScraper.page.click(suapConfig.login.submit);

        await SUAPScraper.page.waitForSelector(suapConfig.login.ready, { timeout: 5000 });
        console.log('Login successful');

        SUAPScraper.logged = true;
        return SUAPScraper;
    }

    static async goto(url, confirmElement, reply) {
        try {
            if (!SUAPScraper.logged) {
                reply({ status: 'authenticating' });
                await SUAPScraper.login();
            }
            await SUAPScraper.page.goto(url);
        } catch (err) {
            console.error(err);
            SUAPScraper.connected = false;
            await SUAPScraper.connect();
            console.log('Reconnected to browser, trying to load page again...');
            return await SUAPScraper.goto(url, confirmElement, reply);
        }

        if (confirmElement) {
            try {
                await SUAPScraper.page.waitForSelector(confirmElement, { timeout: 5000 });
                return SUAPScraper;
            } catch (err) {
                if (err.name === 'TimeoutError') {
                    const currentUrl = SUAPScraper.page.url();
                    const isLoginPage = currentUrl.includes(suapConfig.login.url) || 
                                       (await SUAPScraper.page.$(suapConfig.login.username)) !== null;
                    if (isLoginPage) {
                        console.log(`Timeout waiting for selector ${confirmElement} due to login page redirect, trying to login again...`);
                        SUAPScraper.logged = false;
                        return await SUAPScraper.goto(url, confirmElement, reply);
                    } else {
                        console.warn(`Timeout waiting for selector ${confirmElement}, but we are still logged in (URL: ${currentUrl}). Assuming element is not present.`);
                        return SUAPScraper;
                    }
                } else {
                    console.error('Non-TimeoutError in waitForSelector, reconnecting and retrying:', err);
                    SUAPScraper.connected = false;
                    await SUAPScraper.connect();
                    console.log('Reconnected to browser, trying to load page again...');
                    return await SUAPScraper.goto(url, confirmElement, reply);
                }
            }
        }
    }

    static async evaluate(fn, data) {
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

        return SUAPScraper.page.evaluate((data) => {
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

    static async initialize() {
        if (!SUAPScraper.connected) {
            await SUAPScraper.connect();
        }
        return SUAPScraper;
    }

    static async generatePDF(text) {
        await SUAPScraper.initialize();

        try {
            // Set the HTML content
            await SUAPScraper.page.setContent(text, {
                waitUntil: 'networkidle0'
            });
    
            // Generate PDF
            const pdfBuffer = await SUAPScraper.page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
    
            // Convert Buffer to Base64
            const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    
            console.log(`PDF generated successfully - Size: ${pdfBuffer.length} bytes`);
    
            return pdfBase64;
        }
        catch (error) {
            console.error(error);
            SUAPScraper.connected = false;
            await SUAPScraper.connect();
            console.log('Reconnected to browser, trying to generate PDF again...');
            return await SUAPScraper.generatePDF(text);
        }
    }
}