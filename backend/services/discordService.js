const https = require('https');
const { URL } = require('url');

/**
 * DiscordService - Send notifications to Discord via webhooks
 * 
 * Usage:
 * const discord = new DiscordService(webhookUrl);
 * await discord.send('Hello Discord!');
 * await discord.sendError('Something went wrong', errorObject);
 * await discord.sendInfo('Process started', { userId: 123 });
 */
class DiscordService {
    /**
     * @param {string} webhookUrl - Discord webhook URL
     */
    constructor(webhookUrl) {
        if (!webhookUrl) {
            throw new Error('Discord webhook URL is required');
        }
        
        this.webhookUrl = webhookUrl;
        this.parseWebhookUrl();
    }
    
    /**
     * Parse webhook URL to extract hostname and path
     */
    parseWebhookUrl() {
        try {
            const url = new URL(this.webhookUrl);
            this.hostname = url.hostname;
            this.path = url.pathname;
        } catch (e) {
            throw new Error(`Invalid webhook URL: ${e.message}`);
        }
    }
    
    /**
     * Send a message to Discord
     * @param {string} message - Message text
     * @param {object} options - Additional options
     * @param {string} options.type - Message type: 'info', 'success', 'warning', 'error'
     * @param {object} options.data - Additional data to include (will be formatted)
     * @returns {Promise<void>}
     */
    async send(message, options = {}) {
        const { type = 'info', data = null } = options;
        
        // Build embed
        const embed = {
            title: this.getEmojiForType(type) + ' ' + this.getTitleForType(type),
            description: message,
            color: this.getColorForType(type),
            timestamp: new Date().toISOString()
        };
        
        // Add data as fields if provided
        if (data && typeof data === 'object') {
            embed.fields = Object.entries(data).map(([key, value]) => ({
                name: key,
                value: String(value),
                inline: true
            }));
        }
        
        const payload = {
            embeds: [embed]
        };
        
        return this.sendRaw(payload);
    }
    
    /**
     * Send an info message
     */
    async sendInfo(message, data = null) {
        return this.send(message, { type: 'info', data });
    }
    
    /**
     * Send a success message
     */
    async sendSuccess(message, data = null) {
        return this.send(message, { type: 'success', data });
    }
    
    /**
     * Send a warning message
     */
    async sendWarning(message, data = null) {
        return this.send(message, { type: 'warning', data });
    }
    
    /**
     * Send an error message
     */
    async sendError(message, errorOrData = null) {
        let data = errorOrData;
        
        // If it's an Error object, extract useful info
        if (errorOrData instanceof Error) {
            data = {
                error: errorOrData.message,
                stack: errorOrData.stack?.split('\n').slice(0, 3).join('\n')
            };
        }
        
        return this.send(message, { type: 'error', data });
    }
    
    /**
     * Send raw payload to Discord
     * @param {object} payload - Discord API payload
     * @returns {Promise<void>}
     */
    async sendRaw(payload) {
        const data = JSON.stringify(payload);
        
        const options = {
            hostname: this.hostname,
            path: this.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 204) {
                        // Success - Discord returns 204 No Content
                        resolve();
                    } else if (res.statusCode === 429) {
                        // Rate limited
                        reject(new Error('Discord rate limit exceeded'));
                    } else {
                        reject(new Error(`Discord API returned ${res.statusCode}: ${responseData}`));
                    }
                });
            });
            
            req.on('error', (err) => {
                reject(new Error(`Discord request failed: ${err.message}`));
            });
            
            req.write(data);
            req.end();
        });
    }
    
    /**
     * Get emoji for message type
     */
    getEmojiForType(type) {
        const emojis = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return emojis[type] || emojis.info;
    }
    
    /**
     * Get title for message type
     */
    getTitleForType(type) {
        const titles = {
            info: 'Info',
            success: 'Success',
            warning: 'Warning',
            error: 'Error'
        };
        return titles[type] || titles.info;
    }
    
    /**
     * Get color for message type (Discord embed colors)
     */
    getColorForType(type) {
        const colors = {
            info: 3447003,    // Blue
            success: 3066993, // Green
            warning: 16776960, // Yellow
            error: 15158332   // Red
        };
        return colors[type] || colors.info;
    }
}

module.exports = DiscordService;

