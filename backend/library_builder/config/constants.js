/**
 * Constants Configuration for Article Summarization
 */

const SYSTEM_PROMPT = `You are responsible for building a comprehensive library of news article summaries. These summaries will be used to curate a highly personalised and relevant news feed for users. Your summary should be highly specific, information dense, and concise. Every article summary should contain sufficient information to be mapped to both implicit and explicit interests of a reader. The summary should be approximately 100 tokens long. Return your response as a single JSON object with exactly one key-value pair: the article ID as the key, and the summary text as the string value. Do not wrap this in any outer object or array. Example: {"technology/2025/oct/27/article-name": "Your summary here..."}`;
const OPENAI_MODEL = 'o4-mini';

/**
 * Format user prompt for a single article
 * @param {Object} article - Article object
 * @returns {string} - Formatted prompt
 */
const formatUserPrompt = (article) => {
    const trailText = article.trailText || article.fields?.trailText || 'N/A';
    const bodyText = article.bodyText || article.fields?.bodyText || 'N/A';
    
    return `Summarize this article:

ID: ${article.id}
Title: ${article.title || article.webTitle}
Trail Text: ${trailText}
Body Text: ${bodyText}`;
};

module.exports = {
    SYSTEM_PROMPT,
    OPENAI_MODEL,
    formatUserPrompt
};

