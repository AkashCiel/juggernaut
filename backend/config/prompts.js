/**
 * Centralized OpenAI Prompts Configuration
 * 
 * This file contains all OpenAI prompts used throughout the application.
 * Centralizing prompts makes them easier to maintain, modify, and version control.
 * 
 * @author AI News Agent Team
 * @version 1.0.0
 */

/**
 * Research Paper Summary Prompts
 */
const RESEARCH_SUMMARY_PROMPTS = {
    /**
     * High-level summary prompt for general research papers
     * Used when generating overall summaries of multiple papers
     * 
     * @param {Array} papers - Array of research paper objects
     * @returns {string} Formatted prompt for OpenAI
     */
    generalSummary: (papers) => {
        const papersText = papers.map((paper, index) => {
            const authors = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors;
            const title = paper.title || '';
            const summary = paper.summary || '';
            
            return `${index + 1}. **${title}**\n   Authors: ${authors}\n   Summary: ${summary}\n`;
        }).join('\n');

        return `You are a research assistant. Please provide a high-level summary of the following research papers. 
        Avoid using jargon and technical terms. Break the sumamry down into most important trends, breakthroughs, and implications.
        Structure the summary according to the following format:
        - Most important trends
        - Breakthroughs
        - Implications

Research Papers:
${papersText}

Please provide a clear, well-structured summary that highlights the key findings and their significance.`;
    },

    /**
     * Topic-focused summary prompt for specific research areas
     * Used when generating summaries for papers related to a specific topic
     * 
     * @param {Array} papers - Array of research paper objects
     * @param {string} topic - The specific research topic to focus on
     * @returns {string} Formatted prompt for OpenAI
     */
    topicSummary: (papers, topic) => {
        const papersText = papers.map((paper, index) => {
            const authors = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors;
            const title = paper.title || '';
            const summary = paper.summary || '';
            
            return `${index + 1}. **${title}**\n   Authors: ${authors}\n   Summary: ${summary}\n`;
        }).join('\n');

        return `You are a research assistant. Please provide a high-level summary of the following research papers. 
        Avoid using jargon and technical terms. Break the sumamry down into most important trends, breakthroughs, and implications.
        Structure the summary according to the following format:
        - Most important trends
        - Breakthroughs
        - Implications

Research Papers for "${topic}":
${papersText}

Please provide a clear, well-structured summary that highlights the key findings and their significance in the context of ${topic}.`;
    }
};

/**
 * System Role Prompts
 * These define the AI assistant's behavior and role
 */
const SYSTEM_ROLES = {
    /**
     * Research assistant system role
     * Used for paper summary generation
     */
    researchAssistant: 'You are an AI research assistant that provides clear, insightful summaries of research papers.',
    
    /**
     * Directory naming assistant system role
     * Used for creating concise directory names
     */
    directoryNaming: 'You are a helpful assistant that creates concise directory names.'
};

/**
 * Utility Prompts
 * Specialized prompts for specific tasks
 */
const UTILITY_PROMPTS = {
    /**
     * Topic directory name generation prompt
     * Creates concise directory names for organizing reports by topic
     * 
     * @param {Array} topics - Array of research topic strings
     * @returns {string} Formatted prompt for OpenAI
     */
    topicDirectoryName: (topics) => {
        const topicsText = topics.join(', ');
        return `Create a 3-5 word directory name for these research topics: ${topicsText}. Return only the name, no quotes or extra text.`;
    }
};

/**
 * OpenAI API Configuration
 * Default settings for OpenAI API calls
 */
const OPENAI_CONFIG = {
    /**
     * Default model to use for all API calls
     */
    defaultModel: 'gpt-4o',
    
    /**
     * Default token limits for different prompt types
     */
    maxTokens: {
        summary: 4000,
        directoryName: 20
    },
    
    /**
     * Default temperature settings for different prompt types
     */
    temperature: {
        summary: 0.7,
        directoryName: 0.3
    },
    
    /**
     * Default timeout settings (in milliseconds)
     */
    timeouts: {
        summary: 60000,
        directoryName: 10000
    }
};

module.exports = {
    RESEARCH_SUMMARY_PROMPTS,
    SYSTEM_ROLES,
    UTILITY_PROMPTS,
    OPENAI_CONFIG
};
