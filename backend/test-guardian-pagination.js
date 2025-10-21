#!/usr/bin/env node

/**
 * Test script for Guardian API pagination and section mapping
 * 
 * This script tests:
 * 1. Current Guardian API functionality
 * 2. Section mapping from topics using AI
 * 3. Pagination with page-size 200
 * 4. Results analysis and deduplication
 */

require('dotenv').config();
const GuardianService = require('./services/guardianService');
const ConversationService = require('./services/conversationService');

class GuardianTestSuite {
    constructor() {
        this.guardianService = new GuardianService();
        this.conversationService = new ConversationService();
    }

    /**
     * Test current Guardian API with basic parameters
     */
    async testCurrentAPI() {
        console.log('\n=== Testing Current Guardian API ===');
        
        const now = new Date();
        const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const fromDate = from.toISOString().slice(0, 10);
        const toDate = now.toISOString().slice(0, 10);

        try {
            const result = await this.guardianService.fetchArticles(['AI'], {
                fromDate,
                toDate,
                pageSize: 50,
                orderBy: 'newest',
                section: 'technology',
                includeBodyText: false
            });

            console.log('✅ Current API test successful');
            console.log(`Articles found: ${result.articlesByTopic[0]?.articles?.length || 0}`);
            console.log(`Date range: ${fromDate} to ${toDate}`);
            
            if (result.articlesByTopic[0]?.articles?.length > 0) {
                console.log('Sample article:', {
                    title: result.articlesByTopic[0].articles[0].title,
                    section: result.articlesByTopic[0].articles[0].section,
                    publishedAt: result.articlesByTopic[0].articles[0].publishedAt
                });
            }
            
            return result;
        } catch (error) {
            console.log('❌ Current API test failed:', error.message);
            return null;
        }
    }

    /**
     * Test section mapping using AI
     */
    async testSectionMapping(topics) {
        console.log('\n=== Testing AI Section Mapping ===');
        
        const prompt = `
Given these news topics: ${topics.join(', ')}

Map each topic to the most relevant Guardian API sections. 
Guardian sections include: technology, business, world, us-news, science, politics, sport, culture, lifestyle, opinion, environment, society, global-development, education, media, money, travel, food, fashion, artanddesign, books, film, music, stage, television-radio, games, lifeandstyle, fashion, food, travel, money, education, global-development, society, environment, politics, sport, culture, opinion, media, science, us-news, world, business, technology.

Return ONLY a pipe-separated list of relevant sections (e.g., "technology|business|science").
Do not include explanations or other text.
`;

        try {
            const response = await this.conversationService.generateResponse(prompt, []);
            const sections = response.trim();
            console.log(`✅ AI mapped sections: ${sections}`);
            return sections;
        } catch (error) {
            console.log('❌ AI section mapping failed:', error.message);
            return 'technology|business|world|us-news|science'; // fallback
        }
    }

    /**
     * Test pagination with page-size 200
     */
    async testPaginationWithLargePageSize(topics, sections) {
        console.log('\n=== Testing Pagination with Page-Size 200 ===');
        
        const now = new Date();
        const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const fromDate = from.toISOString().slice(0, 10);
        const toDate = now.toISOString().slice(0, 10);

        try {
            const result = await this.guardianService.fetchArticles(topics, {
                fromDate,
                toDate,
                pageSize: 200, // Maximum Guardian allows
                orderBy: 'newest',
                section: sections,
                includeBodyText: false
            });

            console.log('✅ Pagination test successful');
            
            // Analyze results
            let totalArticles = 0;
            result.articlesByTopic.forEach(group => {
                console.log(`Topic "${group.topic}": ${group.articles.length} articles`);
                totalArticles += group.articles.length;
            });
            
            console.log(`Total articles across all topics: ${totalArticles}`);
            
            // Check for duplicates (should be none with current implementation)
            const allIds = [];
            result.articlesByTopic.forEach(group => {
                group.articles.forEach(article => allIds.push(article.id));
            });
            const uniqueIds = new Set(allIds);
            console.log(`Unique articles: ${uniqueIds.size} (duplicates: ${allIds.length - uniqueIds.size})`);
            
            return result;
        } catch (error) {
            console.log('❌ Pagination test failed:', error.message);
            return null;
        }
    }

    /**
     * Test with multiple topics and comprehensive analysis
     */
    async runComprehensiveTest() {
        console.log('🚀 Starting Guardian API Comprehensive Test');
        console.log('===============================================');

        const testTopics = ['artificial intelligence', 'climate change', 'renewable energy'];
        
        // Test 1: Current API
        const currentResult = await this.testCurrentAPI();
        
        // Test 2: AI Section Mapping
        const sections = await this.testSectionMapping(testTopics);
        
        // Test 3: Pagination with large page size
        const paginationResult = await this.testPaginationWithLargePageSize(testTopics, sections);
        
        // Summary
        console.log('\n=== Test Summary ===');
        console.log(`Test topics: ${testTopics.join(', ')}`);
        console.log(`Mapped sections: ${sections}`);
        console.log(`Current API working: ${currentResult ? '✅' : '❌'}`);
        console.log(`Pagination working: ${paginationResult ? '✅' : '❌'}`);
        
        if (paginationResult) {
            const totalArticles = paginationResult.articlesByTopic.reduce((sum, group) => sum + group.articles.length, 0);
            console.log(`Total articles retrieved: ${totalArticles}`);
        }
        
        return {
            currentResult,
            sections,
            paginationResult
        };
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    const tester = new GuardianTestSuite();
    tester.runComprehensiveTest()
        .then(() => {
            console.log('\n✅ Test suite completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = GuardianTestSuite;
