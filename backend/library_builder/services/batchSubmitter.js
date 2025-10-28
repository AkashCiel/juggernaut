const https = require('https');
const fs = require('fs');
const FormData = require('form-data');
const { logger } = require('../utils/logger');

/**
 * BatchSubmitter - Uploads files and submits batches to OpenAI
 */
class BatchSubmitter {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY environment variable not set');
        }
    }

    /**
     * Upload JSONL file to OpenAI Files API
     * @param {string} filePath - Path to JSONL file
     * @returns {Promise<string>} - File ID
     */
    async uploadFile(filePath) {
        logger.info('Uploading batch file to OpenAI', { filePath });
        
        return new Promise((resolve, reject) => {
            const form = new FormData();
            form.append('purpose', 'batch');
            form.append('file', fs.createReadStream(filePath));
            
            const options = {
                hostname: 'api.openai.com',
                port: 443,
                path: '/v1/files',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    ...form.getHeaders()
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        if (res.statusCode !== 200) {
                            logger.error('File upload failed', { 
                                status: res.statusCode,
                                response 
                            });
                            reject(new Error(`Upload failed: ${response.error?.message || data}`));
                            return;
                        }
                        
                        logger.info('File uploaded successfully', { 
                            fileId: response.id,
                            filename: response.filename,
                            bytes: response.bytes
                        });
                        
                        resolve(response.id);
                    } catch (e) {
                        logger.error('Failed to parse upload response', { error: e.message });
                        reject(e);
                    }
                });
            });
            
            req.on('error', (err) => {
                logger.error('Upload request failed', { error: err.message });
                reject(err);
            });
            
            form.pipe(req);
        });
    }

    /**
     * Create batch processing job
     * @param {string} fileId - Input file ID
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} - Batch object
     */
    async createBatch(fileId, metadata = {}) {
        logger.info('Creating batch job', { fileId, metadata });
        
        const requestData = {
            input_file_id: fileId,
            endpoint: '/v1/chat/completions',
            completion_window: '24h',
            metadata: {
                ...metadata,
                created_at: new Date().toISOString()
            }
        };
        
        const data = JSON.stringify(requestData);
        
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/batches',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
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
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (res.statusCode !== 200) {
                            logger.error('Batch creation failed', { 
                                status: res.statusCode,
                                response 
                            });
                            reject(new Error(`Batch creation failed: ${response.error?.message || responseData}`));
                            return;
                        }
                        
                        logger.info('Batch created successfully', { 
                            batchId: response.id,
                            status: response.status,
                            requestCounts: response.request_counts
                        });
                        
                        resolve(response);
                    } catch (e) {
                        logger.error('Failed to parse batch response', { error: e.message });
                        reject(e);
                    }
                });
            });
            
            req.on('error', (err) => {
                logger.error('Batch request failed', { error: err.message });
                reject(err);
            });
            
            req.write(data);
            req.end();
        });
    }
}

module.exports = BatchSubmitter;

