#!/usr/bin/env node

/**
 * Complete test script for Guardian API improvements
 * 
 * This script tests:
 * 1. Current Guardian API functionality
 * 2. AI-powered section mapping
 * 3. Large page-size (200) testing
 * 4. Results analysis and validation
 */

require('dotenv').config();
const GuardianService = require('./services/guardianService');
const NewsDiscoveryService = require('./services/conversationService');

class GuardianTestRunner {
    constructor() {
        this.guardianService = new GuardianService();
        this.newsDiscoveryService = new NewsDiscoveryService();
    }

    async runAllTests() {
        console.log('🚀 Guardian API Complete Test Suite');
        console.log('=====================================\n');
        
        const testTopics = ['artificial intelligence', 'climate change', 'renewable energy'];
        
        // Test 1: Current API functionality
        console.log('1️⃣ Testing Current API...');
        const currentResult = await this.testCurrentAPI(testTopics);
        
        // Test 2: AI Section Mapping
        console.log('\n2️⃣ Testing AI Section Mapping...');
        const sections = await this.testSectionMapping(testTopics);
        
        // Test 3: Large Page Size
        console.log('\n3️⃣ Testing Large Page Size (200)...');
        const largePageResult = await this.testLargePageSize(testTopics, sections);
        
        // Test 4: Results Analysis
        console.log('\n4️⃣ Analyzing Results...');
        this.analyzeResults(currentResult, largePageResult);
        
        console.log('\n✅ All tests completed!');
    }

    async testCurrentAPI(topics) {
        const now = new Date();
        const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const fromDate = from.toISOString().slice(0, 10);
        const toDate = now.toISOString().slice(0, 10);

        try {
            const result = await this.guardianService.fetchArticles(topics, {
                fromDate,
                toDate,
                pageSize: 50, // Current cap
                orderBy: 'newest',
                section: 'technology',
                includeBodyText: false
            });

            console.log('✅ Current API test successful');
            const totalArticles = result.articlesByTopic.reduce((sum, group) => sum + group.articles.length, 0);
            console.log(`📊 Total articles: ${totalArticles}`);
            
            return result;
        } catch (error) {
            console.log('❌ Current API test failed:', error.message);
            return null;
        }
    }

    async testSectionMapping(topics) {
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

    async testLargePageSize(topics, sections) {
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

            console.log('✅ Large page size test successful');
            const totalArticles = result.articlesByTopic.reduce((sum, group) => sum + group.articles.length, 0);
            console.log(`📊 Total articles: ${totalArticles}`);
            
            return result;
        } catch (error) {
            console.log('❌ Large page size test failed:', error.message);
            return null;
        }
    }

    analyzeResults(currentResult, largePageResult) {
        if (!currentResult || !largePageResult) {
            console.log('❌ Cannot analyze results - some tests failed');
            return;
        }

        const currentTotal = currentResult.articlesByTopic.reduce((sum, group) => sum + group.articles.length, 0);
        const largePageTotal = largePageResult.articlesByTopic.reduce((sum, group) => sum + group.articles.length, 0);

        console.log('📈 Results Comparison:');
        console.log(`   Current API (page-size 50): ${currentTotal} articles`);
        console.log(`   Large page-size (200): ${largePageTotal} articles`);
        console.log(`   Improvement: ${((largePageTotal - currentTotal) / currentTotal * 100).toFixed(1)}%`);

        // Check for duplicates in large page result
        const allIds = [];
        largePageResult.articlesByTopic.forEach(group => {
            group.articles.forEach(article => allIds.push(article.id));
        });
        const uniqueIds = new Set(allIds);
        console.log(`   Unique articles: ${uniqueIds.size}`);
        console.log(`   Duplicates: ${allIds.length - uniqueIds.size}`);
    }
}

// Run the test suite
const runner = new GuardianTestRunner();
runner.runAllTests()
    .then(() => {
        console.log('\n🎉 Test suite completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
