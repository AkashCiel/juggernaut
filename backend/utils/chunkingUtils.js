/**
 * Chunking Utility Functions
 * 
 * Provides reusable chunking functionality for processing large arrays
 * in manageable pieces, commonly used for API calls with limits.
 * 
 * @author AI News Agent Team
 * @version 1.0.0
 */

/**
 * Split an array into chunks of specified size
 * @param {Array} array - Array to chunk
 * @param {number} chunkSize - Maximum size of each chunk
 * @returns {Array<Array>} Array of chunks
 */
function chunkArray(array, chunkSize) {
    if (!Array.isArray(array) || chunkSize <= 0) {
        return [];
    }
    
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    
    return chunks;
}

/**
 * Process chunks sequentially with a provided processor function
 * @param {Array<Array>} chunks - Array of chunks to process
 * @param {Function} processor - Function to process each chunk
 * @param {Object} options - Processing options
 * @param {Function} options.onChunkStart - Callback when chunk processing starts
 * @param {Function} options.onChunkComplete - Callback when chunk processing completes
 * @param {Function} options.onChunkError - Callback when chunk processing fails
 * @returns {Promise<Array>} Array of results from all chunks
 */
async function processChunksSequentially(chunks, processor, options = {}) {
    const results = [];
    
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkNumber = i + 1;
        
        try {
            if (options.onChunkStart) {
                options.onChunkStart(chunk, chunkNumber, chunks.length);
            }
            
            const result = await processor(chunk, chunkNumber);
            results.push(result);
            
            if (options.onChunkComplete) {
                options.onChunkComplete(result, chunkNumber, chunks.length);
            }
            
        } catch (error) {
            if (options.onChunkError) {
                const fallbackResult = options.onChunkError(error, chunk, chunkNumber, chunks.length);
                if (fallbackResult !== undefined) {
                    results.push(fallbackResult);
                }
            } else {
                throw error;
            }
        }
    }
    
    return results;
}

/**
 * Sleep utility for delays between operations
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    chunkArray,
    processChunksSequentially,
    sleep
};
