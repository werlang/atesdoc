/**
 * Telegram notification service for sending alerts and messages.
 * Supports markdown formatting and multiple bot configurations.
 *
 * @class Telegram
 */
export default class Telegram {

    static baseUrl = 'https://api.telegram.org';
    static enabled = process.env.TELEGRAM_ENABLED === 'true';
    static chatId = process.env.TELEGRAM_CHAT_ID;
    static token = process.env.TELEGRAM_BOT_TOKEN;
    static isProduction = process.env.NODE_ENV === 'production';

    /**
     * Sends an alert message to Telegram.
     * @param {string|object|Array} message - The message to send. Can be a string, object, or array.
     * @param {Object} options - Optional configuration
     * @param {string} options.chatId - Override default chat ID
     * @param {string} options.token - Override default bot token
     * @param {string} options.bot - Bot identifier for token lookup
     * @param {boolean} options.markdown - Enable markdown formatting
     * @param {boolean} options.multiLine - Allow multiline messages (default: true)
     * @returns {Promise<Object|boolean>} Telegram API response or false on error
     */
    static async alert(message, options = {}) {
        if (!this.enabled) {
            return false;
        }

        if (!this.isProduction) {
            console.log('DEV LOG: Telegram alert:', message);
            return true;
        }

        const args = {
            chat_id: options.chatId || this.chatId,
            text: message,
        };

        const token = options.token || this.token;

        // if send object, convert it to multiline text
        if (typeof args.text !== 'string') {
            args.text = Object.entries(args.text).map(([k, v]) => `${k}: *${v}*`);
            options.markdown = true;
        }

        // allow multiline message to be sent as an array
        if (Array.isArray(args.text) && options.multiLine !== false) {
            args.text = args.text.join('\r\n');
        }

        if (options.markdown) {
            // formatting
            // https://core.telegram.org/bots/api#formatting-options
            args.parse_mode = 'MarkdownV2';
            // telegram MD2 does not accept . character
            args.text = args.text.replace(/\./g, '\\.');
        }

        const url = `${this.baseUrl}/bot${token}/sendMessage?${new URLSearchParams(args).toString()}`;

        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error sending telegram message:', error);
            return false;
        }
    }
}