const https = require('https');
const { logger } = require('../utils/logger');

/**
 * BatchMonitor - Monitors batch processing status
 */
class BatchMonitor {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY environment variable not set');
        }
    }

    /**
     * Check batch status
     * @param {string} batchId - Batch ID
     * @returns {Promise<Object>} - Batch status object
     */
    async checkStatus(batchId) {
        logger.debug('Checking batch status', { batchId });
        
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: `/v1/batches/${batchId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            }
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        if (res.statusCode !== 200) {
                            logger.error('Status check failed', { 
                                status: res.statusCode,
                                response 
                            });
                            reject(new Error(`Status check failed: ${response.error?.message || data}`));
                            return;
                        }
                        
                        const { status, request_counts, output_file_id, error_file_id } = response;
                        
                        logger.info('Batch status', { 
                            batchId,
                            status,
                            completed: request_counts?.completed || 0,
                            failed: request_counts?.failed || 0,
                            total: request_counts?.total || 0
                        });
                        
                        resolve({
                            batchId: response.id,
                            status,
                            requestCounts: request_counts,
                            outputFileId: output_file_id,
                            errorFileId: error_file_id,
                            createdAt: response.created_at,
                            completedAt: response.completed_at,
                            metadata: response.metadata
                        });
                    } catch (e) {
                        logger.error('Failed to parse status response', { error: e.message });
                        reject(e);
                    }
                });
            });
            
            req.on('error', (err) => {
                logger.error('Status request failed', { error: err.message });
                reject(err);
            });
            
            req.end();
        });
    }

    /**
     * Poll batch status until completion
     * @param {string} batchId - Batch ID
     * @param {number} intervalMinutes - Polling interval in minutes
     * @returns {Promise<Object>} - Final batch status
     */
    async pollUntilComplete(batchId, intervalMinutes = 10) {
        logger.info(`Starting batch monitoring (polling every ${intervalMinutes} mins)`);
        
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const intervalMs = intervalMinutes * 60 * 1000;
        
        while (true) {
            const status = await this.checkStatus(batchId);
            
            if (status.status === 'completed') {
                logger.info('Batch completed successfully', { 
                    batchId,
                    outputFileId: status.outputFileId
                });
                return status;
            }
            
            if (status.status === 'failed' || status.status === 'expired' || status.status === 'cancelled') {
                logger.error('Batch processing failed', { 
                    batchId,
                    status: status.status
                });
                throw new Error(`Batch ${status.status}`);
            }
            
            // Still processing
            const progress = status.requestCounts?.completed || 0;
            const total = status.requestCounts?.total || 0;
            const percentage = total > 0 ? ((progress / total) * 100).toFixed(1) : 0;
            
            logger.info(`Batch in progress: ${percentage}% (${progress}/${total})`);
            logger.info(`Next check in ${intervalMinutes} minutes...`);
            
            await sleep(intervalMs);
        }
    }
}

module.exports = BatchMonitor;

