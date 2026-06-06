import puppeteer from 'puppeteer-core';
import suapConfig from '../suap-config.js';
import CustomError from './error.js';

/**
 * Static scraper class for interacting with the SUAP portal using Puppeteer.
 * Provides robust login, navigation, content evaluation, and PDF generation with automatic retry limits.
 */
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

    /**
     * Connects to the browserless Chrome instance.
     * Implements a maximum retry limit to prevent hanging if the Chrome container is down.
     * 
     * @param {number} [retries=5] - Number of connection retries remaining.
     * @returns {Promise<typeof SUAPScraper>} Resolves with the SUAPScraper class.
     * @throws {CustomError} Thrown if connection fails after all retries are exhausted.
     */
    static async connect(retries = 5) {
        // Remote debug: edge://inspect/#devices
        try {
            SUAPScraper.browser = await puppeteer.connect({
                browserWSEndpoint: `ws://chrome:${SUAPScraper.chromePort}`,
            });
        } catch (error) {
            console.error(`Could not connect to Chrome. Retries left: ${retries}`);
            if (retries <= 0) {
                throw new CustomError(
                    'CHROME_CONNECTION_FAILED',
                    `Could not connect to the Chrome browser instance: ${error.message}`
                );
            }
            // Wait 3 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 3000));
            return await SUAPScraper.connect(retries - 1);
        }

        const page = await SUAPScraper.browser.newPage();
        await page.setViewport({ width: 1920, height: 2000 });

        console.log('Connected to Chrome.');

        SUAPScraper.page = page;
        SUAPScraper.connected = true;
        return SUAPScraper;
    }

    /**
     * Authenticates with SUAP using credentials from the environment.
     * Performs error analysis on failure (e.g., wrong credentials or timeout) to throw a clear message.
     * 
     * @returns {Promise<typeof SUAPScraper>} Resolves with the SUAPScraper class.
     * @throws {CustomError} Thrown if credentials are missing or login fails.
     */
    static async login() {
        if (!SUAPScraper.username || !SUAPScraper.password) {
            throw new CustomError(
                'SUAP_CONFIG_ERROR',
                'SUAP credentials are not configured. Please set SUAP_USERNAME and SUAP_PASSWORD in the .env file.'
            );
        }

        console.log(`Logging in as ${SUAPScraper.username}`);
        
        try {
            await SUAPScraper.page.goto(`${suapConfig.baseUrl}/${suapConfig.login.url}`, {
                waitUntil: 'load',
                timeout: 20000
            });
        } catch (error) {
            throw new CustomError('SUAP_LOGIN_PAGE_FAILED', `Failed to load SUAP login page: ${error.message}`);
        }

        try {
            await SUAPScraper.page.$eval(suapConfig.login.username, (el, _username) => el.value = _username, SUAPScraper.username);
            await SUAPScraper.page.$eval(suapConfig.login.password, (el, _password) => el.value = _password, SUAPScraper.password);
            await SUAPScraper.page.click(suapConfig.login.submit);
        } catch (error) {
            throw new CustomError(
                'SUAP_LOGIN_FORM_FAILED',
                `Failed to populate or submit the login form. The form structure may have changed: ${error.message}`
            );
        }

        try {
            await SUAPScraper.page.waitForSelector(suapConfig.login.ready, { timeout: 8000 });
            console.log('Login successful');
            SUAPScraper.logged = true;
            return SUAPScraper;
        } catch (error) {
            // Analyze the failure: check if we are still on the login page or redirected to another error page
            const currentUrl = SUAPScraper.page.url();
            const isLoginPage = currentUrl.includes(suapConfig.login.url) || 
                               (await SUAPScraper.page.$(suapConfig.login.username)) !== null;
            
            if (isLoginPage) {
                let errorMessage = 'Authentication failed. Please verify your SUAP username and password.';
                try {
                    const errorMsg = await SUAPScraper.page.evaluate(() => {
                        const el = document.querySelector('.errornote, .alert-danger, .msg.alert, .alert-error');
                        return el ? el.textContent.trim() : null;
                    });
                    if (errorMsg) {
                        errorMessage = `Authentication failed: ${errorMsg}`;
                    }
                } catch (e) {
                    console.error('Error fetching error message from login page:', e);
                }
                throw new CustomError('SUAP_AUTH_FAILED', errorMessage);
            } else {
                throw new CustomError('SUAP_LOGIN_TIMEOUT', `Timeout waiting for SUAP login confirmation: ${error.message}`);
            }
        }
    }

    /**
     * Navigates to a specific SUAP URL and waits for a confirming element to be present.
     * Features automatic authentication check, reconnection on network failures, and retry limits.
     * 
     * @param {string} url - Target URL to navigate to.
     * @param {string} [confirmElement] - CSS selector to wait for to confirm page loaded.
     * @param {Function} [reply] - Callback to report status back to the client.
     * @param {number} [retryCount=0] - Internal retry counter.
     * @returns {Promise<typeof SUAPScraper>} Resolves with the SUAPScraper class.
     * @throws {CustomError} Thrown if navigation or session recovery fails repeatedly.
     */
    static async goto(url, confirmElement, reply, retryCount = 0) {
        const MAX_RETRIES = 3;
        try {
            if (!SUAPScraper.logged) {
                if (reply) reply({ status: 'authenticating' });
                await SUAPScraper.login();
            }
            await SUAPScraper.page.goto(url, { waitUntil: 'load', timeout: 30000 });
        } catch (err) {
            console.error(`Error in goto (retry ${retryCount}/${MAX_RETRIES}):`, err);
            
            // If the failure is due to invalid configuration or bad credentials, fail immediately.
            if (err.code === 'SUAP_AUTH_FAILED' || err.code === 'SUAP_CONFIG_ERROR') {
                throw err;
            }

            if (retryCount >= MAX_RETRIES) {
                throw new CustomError(
                    'SUAP_NAVIGATION_FAILED',
                    `Failed to navigate to ${url} after ${MAX_RETRIES} attempts. Error: ${err.message}`
                );
            }

            SUAPScraper.connected = false;
            SUAPScraper.logged = false;
            await SUAPScraper.connect();
            console.log('Reconnected to browser, trying to load page again...');
            return await SUAPScraper.goto(url, confirmElement, reply, retryCount + 1);
        }

        if (confirmElement) {
            try {
                await SUAPScraper.page.waitForSelector(confirmElement, { timeout: 8000 });
                return SUAPScraper;
            } catch (err) {
                if (err.name === 'TimeoutError') {
                    const currentUrl = SUAPScraper.page.url();
                    const isLoginPage = currentUrl.includes(suapConfig.login.url) || 
                                       (await SUAPScraper.page.$(suapConfig.login.username)) !== null;
                    if (isLoginPage) {
                        if (retryCount >= MAX_RETRIES) {
                            throw new CustomError(
                                'SUAP_AUTH_FAILED',
                                `Redirected to login page repeatedly when trying to access ${url}. Please check credentials.`
                            );
                        }
                        console.log(`Timeout waiting for selector ${confirmElement} due to login page redirect, trying to login again...`);
                        SUAPScraper.logged = false;
                        return await SUAPScraper.goto(url, confirmElement, reply, retryCount + 1);
                    } else {
                        console.warn(`Timeout waiting for selector ${confirmElement}, but we are still logged in (URL: ${currentUrl}). Assuming element is not present.`);
                        return SUAPScraper;
                    }
                } else {
                    console.error(`Non-TimeoutError in waitForSelector (retry ${retryCount}/${MAX_RETRIES}):`, err);
                    if (retryCount >= MAX_RETRIES) {
                        throw new CustomError(
                            'SUAP_SELECTOR_FAILED',
                            `Failed to wait for selector ${confirmElement} on ${url}. Error: ${err.message}`
                        );
                    }
                    SUAPScraper.connected = false;
                    await SUAPScraper.connect();
                    console.log('Reconnected to browser, trying to load page again...');
                    return await SUAPScraper.goto(url, confirmElement, reply, retryCount + 1);
                }
            }
        }
        return SUAPScraper;
    }

    /**
     * Evaluates a function inside the browser page context.
     * Deserializes functions passed within the data object so they can be called.
     * 
     * @param {Function} fn - Function to evaluate on the page.
     * @param {Object} data - Parameters to serialize and pass to the function.
     * @returns {Promise<any>} The result of the evaluation.
     */
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
            return fn(deserialized);
        }, serialized);
    }

    /**
     * Initializes the scraper browser connection.
     * 
     * @returns {Promise<typeof SUAPScraper>} Resolves with the SUAPScraper class.
     */
    static async initialize() {
        if (!SUAPScraper.connected) {
            await SUAPScraper.connect();
        }
        return SUAPScraper;
    }

    /**
     * Generates a PDF buffer from HTML content and returns it as a Base64 string.
     * 
     * @param {string} text - HTML content to print to PDF.
     * @param {number} [retryCount=0] - Internal retry counter.
     * @returns {Promise<string>} Base64-encoded PDF data.
     * @throws {CustomError} Thrown if generation fails after all retries are exhausted.
     */
    static async generatePDF(text, retryCount = 0) {
        const MAX_RETRIES = 3;
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
            console.error(`Error in generatePDF (retry ${retryCount}/${MAX_RETRIES}):`, error);
            if (retryCount >= MAX_RETRIES) {
                throw new CustomError(
                    'SUAP_PDF_GENERATION_FAILED',
                    `Failed to generate PDF after ${MAX_RETRIES} attempts. Error: ${error.message}`
                );
            }
            SUAPScraper.connected = false;
            await SUAPScraper.connect();
            console.log('Reconnected to browser, trying to generate PDF again...');
            return await SUAPScraper.generatePDF(text, retryCount + 1);
        }
    }
}