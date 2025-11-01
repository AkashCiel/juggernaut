const https = require('https');
const { logger } = require('../utils/logger-vercel');
const { MAX_ARTICLES_FOR_CURATION } = require('../config/constants');

class PreLoadService {
    constructor() {
        this.sectionSummaries = null;
        this.articleLibraries = new Map(); // Store article libraries per section
        this.fetchSectionSummariesPromise = null;
        this.fetchArticleLibrariesPromise = null;
        this.summariesUrl = 'https://raw.githubusercontent.com/AkashCiel/juggernaut-reports/main/backend/data/functional_section_summaries.json';
        this.articleLibraryBaseUrl = 'https://raw.githubusercontent.com/AkashCiel/juggernaut-reports/main/backend/data/article-library/';
    }

    /**
     * Fetch section summaries from GitHub
     * @returns {Promise<Object|null>} Section summaries object or null if fetch fails
     */
    async fetchSectionSummaries() {
        // If fetch is already in progress, return the existing promise
        if (this.fetchSectionSummariesPromise) {
            return this.fetchSectionSummariesPromise;
        }

        // If summaries are already loaded, return them immediately
        if (this.sectionSummaries) {
            logger.info('✅ Section summaries already loaded in memory');
            return this.sectionSummaries;
        }

        logger.info('📥 Fetching section summaries from GitHub...');

        // Start new fetch
        this.fetchSectionSummariesPromise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
                logger.warn(`⚠️ GitHub request timeout for section summaries`);
                this.fetchSectionSummariesPromise = null;
                resolve(null);
            }, 10000);
            
            https.get(this.summariesUrl, (res) => {
                clearTimeout(timeout);
                
                if (res.statusCode !== 200) {
                    logger.warn(`⚠️ GitHub returned status ${res.statusCode} for section summaries`);
                    this.fetchSectionSummariesPromise = null;
                    resolve(null);
                    return;
                }
                
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const summaries = JSON.parse(data);
                        this.sectionSummaries = summaries;
                        this.fetchSectionSummariesPromise = null;
                        
                        const sectionCount = summaries?.sections ? Object.keys(summaries.sections).length : 0;
                        logger.info(`✅ Loaded ${sectionCount} section summaries into memory`);
                        resolve(summaries);
                    } catch (e) {
                        logger.error(`❌ Failed to parse section summaries: ${e.message}`);
                        this.fetchSectionSummariesPromise = null;
                        resolve(null);
                    }
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                logger.error(`❌ Failed to fetch section summaries: ${err.message}`);
                this.fetchSectionSummariesPromise = null;
                resolve(null);
            });
        });

        return this.fetchSectionSummariesPromise;
    }

    /**
     * Fetch article library for a single section
     * @param {string} section - Section name (e.g., 'technology')
     * @returns {Promise<Object|null>} Article library object or null if fetch fails
     */
    async fetchArticleLibrary(section) {
        // Check if already loaded
        if (this.articleLibraries.has(section)) {
            logger.info(`✅ Article library for section '${section}' already loaded in memory`);
            return this.articleLibraries.get(section);
        }

        const url = `${this.articleLibraryBaseUrl}${section}.json`;
        logger.info(`📥 Fetching article library for section '${section}' from GitHub...`);

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                logger.warn(`⚠️ GitHub request timeout for article library: ${section}`);
                resolve(null);
            }, 15000);

            https.get(url, (res) => {
                clearTimeout(timeout);
                
                if (res.statusCode !== 200) {
                    logger.warn(`⚠️ GitHub returned status ${res.statusCode} for article library: ${section}`);
                    resolve(null);
                    return;
                }
                
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const library = JSON.parse(data);
                        const articleCount = library?.articles ? library.articles.length : 0;
                        this.articleLibraries.set(section, library);
                        logger.info(`✅ Loaded ${articleCount} articles for section '${section}' into memory`);
                        resolve(library);
                    } catch (e) {
                        logger.error(`❌ Failed to parse article library for '${section}': ${e.message}`);
                        resolve(null);
                    }
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                logger.error(`❌ Failed to fetch article library for '${section}': ${err.message}`);
                resolve(null);
            });
        });
    }

    /**
     * Fetch all available article libraries from GitHub
     * Discovers sections from section summaries first
     * @returns {Promise<Object>} Object with section names as keys and success status as values
     */
    async fetchAllArticleLibraries() {
        // If fetch is already in progress, return the existing promise
        if (this.fetchArticleLibrariesPromise) {
            return this.fetchArticleLibrariesPromise;
        }

        logger.info('📥 Starting to fetch all article libraries from GitHub...');

        this.fetchArticleLibrariesPromise = (async () => {
            // First, ensure section summaries are loaded to discover available sections
            if (!this.sectionSummaries) {
                logger.info('⏳ Waiting for section summaries to discover sections...');
                await this.fetchSectionSummaries();
            }

            if (!this.sectionSummaries || !this.sectionSummaries.sections) {
                logger.warn('⚠️ Cannot discover sections without section summaries');
                this.fetchArticleLibrariesPromise = null;
                return {};
            }

            const sections = Object.keys(this.sectionSummaries.sections);
            logger.info(`📋 Discovered ${sections.length} sections: ${sections.join(', ')}`);
            logger.info(`🔄 Fetching article libraries for ${sections.length} sections...`);

            const results = {};
            const fetchPromises = sections.map(async (section) => {
                const library = await this.fetchArticleLibrary(section);
                results[section] = library !== null;
                return library;
            });

            await Promise.all(fetchPromises);

            const successCount = Object.values(results).filter(Boolean).length;
            logger.info(`✅ Completed fetching article libraries: ${successCount}/${sections.length} sections loaded successfully`);
            
            this.fetchArticleLibrariesPromise = null;
            return results;
        })();

        return this.fetchArticleLibrariesPromise;
    }

    /**
     * Get cached section summaries
     * @returns {Object|null} Section summaries or null if not loaded
     */
    getSectionSummaries() {
        return this.sectionSummaries;
    }

    /**
     * Get cached article library for a section
     * @param {string} section - Section name
     * @returns {Object|null} Article library or null if not loaded
     */
    getArticleLibrary(section) {
        return this.articleLibraries.get(section) || null;
    }

    /**
     * Prepare data for curation by filtering to selected sections and applying article limit
     * Drops articles from non-selected sections from memory
     * @param {string} selectedSections - Pipe-separated list of section names (e.g., "technology|business")
     * @returns {Object} Prepared article data with filtered articles (max MAX_ARTICLES_FOR_CURATION)
     */
    prepare_data_for_curation(selectedSections) {
        const selectedSectionsArray = selectedSections.split('|').map(s => s.trim()).filter(Boolean);
        
        logger.info(`🔍 Preparing data for curation. Selected sections: ${selectedSectionsArray.join(', ')}`);

        // Collect articles from selected sections
        const articlesBySection = {};
        let totalArticles = 0;

        for (const section of selectedSectionsArray) {
            const library = this.articleLibraries.get(section);
            if (library && library.articles && Array.isArray(library.articles)) {
                // Sort articles by publishedDate (most recent first)
                const sortedArticles = [...library.articles].sort((a, b) => {
                    const dateA = new Date(a.publishedDate || 0);
                    const dateB = new Date(b.publishedDate || 0);
                    return dateB - dateA; // Most recent first
                });
                
                articlesBySection[section] = sortedArticles;
                totalArticles += sortedArticles.length;
                logger.info(`📰 Section '${section}': ${sortedArticles.length} articles available`);
            } else {
                logger.warn(`⚠️ No article library found for section '${section}'`);
                articlesBySection[section] = [];
            }
        }

        logger.info(`📊 Total articles across selected sections: ${totalArticles}`);

        // Apply proportional filtering if needed
        let filteredArticles = [];
        
        if (totalArticles > MAX_ARTICLES_FOR_CURATION) {
            logger.info(`⚙️ Total articles (${totalArticles}) exceeds limit (${MAX_ARTICLES_FOR_CURATION}). Applying proportional filtering...`);
            
            // Calculate proportions for each section
            const sectionProportions = {};
            let totalProportion = 0;
            
            for (const section of selectedSectionsArray) {
                const count = articlesBySection[section].length;
                totalProportion += count;
                sectionProportions[section] = count;
            }
            
            // Allocate articles proportionally
            for (const section of selectedSectionsArray) {
                const sectionArticles = articlesBySection[section];
                if (!sectionArticles || sectionArticles.length === 0) continue;
                
                const proportion = sectionProportions[section] / totalProportion;
                const targetCount = Math.round(MAX_ARTICLES_FOR_CURATION * proportion);
                const selectedCount = Math.min(targetCount, sectionArticles.length);
                
                // Take most recent articles
                const selected = sectionArticles.slice(0, selectedCount);
                filteredArticles.push(...selected);
                
                logger.info(`📊 Section '${section}': Selected ${selectedCount} out of ${sectionArticles.length} articles (${(proportion * 100).toFixed(1)}% proportion)`);
            }
            
            // Ensure we don't exceed limit due to rounding
            if (filteredArticles.length > MAX_ARTICLES_FOR_CURATION) {
                filteredArticles = filteredArticles.slice(0, MAX_ARTICLES_FOR_CURATION);
                logger.info(`🔧 Trimmed to ${MAX_ARTICLES_FOR_CURATION} articles after rounding`);
            }
        } else {
            // Use all articles from selected sections
            for (const section of selectedSectionsArray) {
                filteredArticles.push(...articlesBySection[section]);
            }
            logger.info(`✅ Using all ${totalArticles} articles (within limit)`);
        }

        // Drop articles from non-selected sections from memory
        const allLoadedSections = Array.from(this.articleLibraries.keys());
        const sectionsToDrop = allLoadedSections.filter(s => !selectedSectionsArray.includes(s));
        
        for (const section of sectionsToDrop) {
            this.articleLibraries.delete(section);
            logger.info(`🗑️ Dropped article library for section '${section}' from memory`);
        }

        logger.info(`✅ Prepared ${filteredArticles.length} articles for curation from ${selectedSectionsArray.length} sections`);

        // Calculate selected counts per section for logging
        const sectionSelectedCounts = {};
        for (const article of filteredArticles) {
            const articleSection = article.section || (article.id ? article.id.split('/')[0] : 'unknown');
            sectionSelectedCounts[articleSection] = (sectionSelectedCounts[articleSection] || 0) + 1;
        }

        // Return prepared data structure
        return {
            selectedSections: selectedSectionsArray,
            articles: filteredArticles,
            articleCount: filteredArticles.length,
            sectionsData: selectedSectionsArray.map(section => ({
                section,
                articleCount: articlesBySection[section] ? articlesBySection[section].length : 0,
                selectedCount: sectionSelectedCounts[section] || 0
            }))
        };
    }
}

module.exports = PreLoadService;

