import { chromium } from 'playwright-core';
import suapConfig from '../suap-config.js';
import CustomError from './error.js';

/**
 * Static scraper class for interacting with the SUAP portal using Playwright.
 * Provides robust login, navigation, content evaluation, and PDF generation with automatic retry limits.
 */
export default class PlaywrightScraper {
    
    static browser = null;
    static context = null;
    static page = null;
    static connected = false;
    static logged = false;
    static username = process.env.SUAP_USERNAME;
    static password = process.env.SUAP_PASSWORD;
    static chromePort = process.env.CHROME_PORT || 3000;

    // Private constructor to prevent instantiation
    constructor() {
        throw new Error('PlaywrightScraper is a static class. Use static methods instead.');
    }

    /**
     * Cleans up existing browser and page instances to avoid memory leaks.
     * 
     * @returns {Promise<void>}
     */
    static async disconnect() {
        try {
            if (PlaywrightScraper.page) {
                await PlaywrightScraper.page.close().catch(() => {});
            }
        } catch (e) {
            console.error('Error closing page during disconnect:', e);
        }
        try {
            if (PlaywrightScraper.context) {
                await PlaywrightScraper.context.close().catch(() => {});
            }
        } catch (e) {
            console.error('Error closing context during disconnect:', e);
        }
        try {
            if (PlaywrightScraper.browser) {
                await PlaywrightScraper.browser.close().catch(() => {});
            }
        } catch (e) {
            console.error('Error closing browser connection during disconnect:', e);
        }
        PlaywrightScraper.page = null;
        PlaywrightScraper.context = null;
        PlaywrightScraper.browser = null;
        PlaywrightScraper.connected = false;
        PlaywrightScraper.logged = false;
    }

    /**
     * Connects to the browserless Chrome instance.
     * Implements a maximum retry limit to prevent hanging if the Chrome container is down.
     * 
     * @param {number} [retries=5] - Number of connection retries remaining.
     * @returns {Promise<typeof PlaywrightScraper>} Resolves with the PlaywrightScraper class.
     * @throws {CustomError} Thrown if connection fails after all retries are exhausted.
     */
    static async connect(retries = 5) {
        // Disconnect from any stale sessions/tabs to prevent leaking resources in Chrome
        await PlaywrightScraper.disconnect();

        try {
            PlaywrightScraper.browser = await chromium.connectOverCDP(`ws://chrome:${PlaywrightScraper.chromePort}`);
            PlaywrightScraper.context = await PlaywrightScraper.browser.newContext({
                viewport: { width: 1920, height: 2000 }
            });
            PlaywrightScraper.page = await PlaywrightScraper.context.newPage();

            console.log('Connected to Chrome via Playwright.');

            PlaywrightScraper.connected = true;
            return PlaywrightScraper;
        } catch (error) {
            console.error(`Could not connect to Chrome via Playwright. Retries left: ${retries}`, error);
            if (retries <= 0) {
                throw new CustomError(
                    'CHROME_CONNECTION_FAILED',
                    `Could not connect to the Chrome browser instance: ${error.message}`
                );
            }
            // Wait 3 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 3000));
            return await PlaywrightScraper.connect(retries - 1);
        }
    }

    /**
     * Authenticates with SUAP using credentials from the environment.
     * Performs error analysis on failure (e.g., wrong credentials or timeout) to throw a clear message.
     * 
     * @returns {Promise<typeof PlaywrightScraper>} Resolves with the PlaywrightScraper class.
     * @throws {CustomError} Thrown if credentials are missing or login fails.
     */
    static async login() {
        if (!PlaywrightScraper.username || !PlaywrightScraper.password) {
            throw new CustomError(
                'SUAP_CONFIG_ERROR',
                'SUAP credentials are not configured. Please set SUAP_USERNAME and SUAP_PASSWORD in the .env file.'
            );
        }

        console.log(`Logging in via Playwright as ${PlaywrightScraper.username}`);
        
        try {
            await PlaywrightScraper.page.goto(`${suapConfig.baseUrl}/${suapConfig.login.url}`, {
                waitUntil: 'load',
                timeout: 20000
            });
        } catch (error) {
            throw new CustomError('SUAP_LOGIN_PAGE_FAILED', `Failed to load SUAP login page: ${error.message}`);
        }

        try {
            await PlaywrightScraper.page.fill(suapConfig.login.username, PlaywrightScraper.username);
            await PlaywrightScraper.page.fill(suapConfig.login.password, PlaywrightScraper.password);
            await PlaywrightScraper.page.click(suapConfig.login.submit);
        } catch (error) {
            throw new CustomError(
                'SUAP_LOGIN_FORM_FAILED',
                `Failed to populate or submit the login form. The form structure may have changed: ${error.message}`
            );
        }

        try {
            await PlaywrightScraper.page.waitForSelector(suapConfig.login.ready, { timeout: 8000 });
            console.log('Login successful');
            PlaywrightScraper.logged = true;
            return PlaywrightScraper;
        } catch (error) {
            // Safe page check: check if we are still on the login page
            let isLoginPage = false;
            try {
                const currentUrl = PlaywrightScraper.page.url();
                isLoginPage = currentUrl.includes(suapConfig.login.url) || 
                                   (await PlaywrightScraper.page.$(suapConfig.login.username)) !== null;
            } catch (e) {
                console.warn('Could not determine if we are on the login page:', e.message);
            }
            
            if (isLoginPage) {
                let errorMessage = null;
                try {
                    errorMessage = await PlaywrightScraper.page.evaluate(() => {
                        const el = document.querySelector('.errornote, .alert-danger, .msg.alert, .alert-error');
                        return el ? el.textContent.trim() : null;
                    });
                } catch (e) {
                    console.error('Error fetching error message from login page:', e);
                }

                if (errorMessage) {
                    throw new CustomError('SUAP_AUTH_FAILED', `Authentication failed: ${errorMessage}`);
                }
                
                throw new CustomError('SUAP_LOGIN_TIMEOUT', `Timeout waiting for SUAP login confirmation (still on login page without error message).`);
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
     * @returns {Promise<typeof PlaywrightScraper>} Resolves with the PlaywrightScraper class.
     * @throws {CustomError} Thrown if navigation or session recovery fails repeatedly.
     */
    static async goto(url, confirmElement, reply, retryCount = 0) {
        const MAX_RETRIES = 3;
        try {
            if (!PlaywrightScraper.logged) {
                if (reply) reply({ status: 'authenticating' });
                await PlaywrightScraper.login();
            }
            await PlaywrightScraper.page.goto(url, { waitUntil: 'load', timeout: 30000 });
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

            PlaywrightScraper.connected = false;
            PlaywrightScraper.logged = false;
            await PlaywrightScraper.connect();
            console.log('Reconnected to browser, trying to load page again...');
            return await PlaywrightScraper.goto(url, confirmElement, reply, retryCount + 1);
        }

        if (confirmElement) {
            try {
                await PlaywrightScraper.page.waitForSelector(confirmElement, { timeout: 8000 });
                return PlaywrightScraper;
            } catch (err) {
                if (err.name === 'TimeoutError' || err.message?.includes('Timeout')) {
                    let isLoginPage = false;
                    try {
                        const currentUrl = PlaywrightScraper.page.url();
                        isLoginPage = currentUrl.includes(suapConfig.login.url) || 
                                           (await PlaywrightScraper.page.$(suapConfig.login.username)) !== null;
                    } catch (e) {
                        console.warn('Could not determine if redirected to login page:', e.message);
                    }

                    if (isLoginPage) {
                        if (retryCount >= MAX_RETRIES) {
                            throw new CustomError(
                                'SUAP_NAVIGATION_FAILED',
                                `Redirected to login page repeatedly when trying to access ${url}.`
                            );
                        }
                        console.log(`Timeout waiting for selector ${confirmElement} due to login page redirect, trying to login again...`);
                        PlaywrightScraper.logged = false;
                        return await PlaywrightScraper.goto(url, confirmElement, reply, retryCount + 1);
                    } else {
                        let currentUrl = 'unknown';
                        try { currentUrl = PlaywrightScraper.page.url(); } catch (e) {}
                        console.warn(`Timeout waiting for selector ${confirmElement}, but we are still logged in (URL: ${currentUrl}). Assuming element is not present.`);
                        return PlaywrightScraper;
                    }
                } else {
                    console.error(`Non-TimeoutError in waitForSelector (retry ${retryCount}/${MAX_RETRIES}):`, err);
                    if (retryCount >= MAX_RETRIES) {
                        throw new CustomError(
                            'SUAP_SELECTOR_FAILED',
                            `Failed to wait for selector ${confirmElement} on ${url}. Error: ${err.message}`
                        );
                    }
                    PlaywrightScraper.connected = false;
                    await PlaywrightScraper.connect();
                    console.log('Reconnected to browser, trying to load page again...');
                    return await PlaywrightScraper.goto(url, confirmElement, reply, retryCount + 1);
                }
            }
        }
        return PlaywrightScraper;
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
            if (typeof data !== 'object' || data === null) {
                return data;
            }
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

        return PlaywrightScraper.page.evaluate((data) => {
            // in the browser, deserialize functions in data
            const deserializeFunctions = (data) => {
                if (typeof data !== 'object' || data === null) {
                    return data;
                }
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
     * @returns {Promise<typeof PlaywrightScraper>} Resolves with the PlaywrightScraper class.
     */
    static async initialize() {
        if (!PlaywrightScraper.connected) {
            await PlaywrightScraper.connect();
        }
        return PlaywrightScraper;
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
        await PlaywrightScraper.initialize();

        try {
            // Set the HTML content
            await PlaywrightScraper.page.setContent(text, {
                waitUntil: 'networkidle'
            });
    
            // Generate PDF
            const pdfBuffer = await PlaywrightScraper.page.pdf({
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
    
            console.log(`PDF generated successfully via Playwright - Size: ${pdfBuffer.length} bytes`);
    
            return pdfBase64;
        }
        catch (error) {
            console.error(`Error in generatePDF via Playwright (retry ${retryCount}/${MAX_RETRIES}):`, error);
            if (retryCount >= MAX_RETRIES) {
                throw new CustomError(
                    'SUAP_PDF_GENERATION_FAILED',
                    `Failed to generate PDF after ${MAX_RETRIES} attempts. Error: ${error.message}`
                );
            }
            PlaywrightScraper.connected = false;
            await PlaywrightScraper.connect();
            console.log('Reconnected to browser, trying to generate PDF again...');
            return await PlaywrightScraper.generatePDF(text, retryCount + 1);
        }
    }
}
