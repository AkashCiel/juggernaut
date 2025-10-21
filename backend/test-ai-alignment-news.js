#!/usr/bin/env node

/**
 * Test script for AI Alignment Research news query
 * Tests the complete flow: topic → sections → articles
 */

require('dotenv').config();
const NewsDiscoveryService = require('./services/conversationService');
const GuardianService = require('./services/guardianService');
const GuardianSectionsCacheService = require('./services/guardianSectionsCacheService');

class AIAlignmentNewsTest {
    constructor() {
        this.newsDiscoveryService = new NewsDiscoveryService();
        this.guardianService = new GuardianService();
        this.sectionsCacheService = new GuardianSectionsCacheService();
    }

    async runTest() {
        console.log('🧪 Testing AI Alignment Research News Query');
        console.log('==========================================\n');

        const topic = 'I worry that humanity will fail at AI Alignment and this will cause massive disruptions. Therefore, I want to stay vigilant about emerging news about AI misalignment, no matter how faint or subtle';
        console.log(`📝 Topic: ${topic}\n`);

        try {
            // Step 1: Get Guardian sections from cache
            console.log('🔄 Fetching Guardian sections from cache...');
            const sections = await this.sectionsCacheService.getSections();
            console.log(`✅ Fetched ${sections.length} Guardian sections\n`);

            // Step 2: Map topic to sections using AI
            console.log('🤖 Mapping topic to Guardian sections using AI...');
            const mappedSections = await this.newsDiscoveryService.mapTopicsToSections([topic], sections);
            console.log(`✅ Mapped sections: ${mappedSections}\n`);

            // Step 3: Set up date range (past 3 days)
            const now = new Date();
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            const fromDate = threeDaysAgo.toISOString().slice(0, 10);
            const toDate = now.toISOString().slice(0, 10);

            console.log(`📅 Date range: ${fromDate} to ${toDate}\n`);

            // Step 4: Fetch ALL articles from mapped sections (no topic filtering)
            console.log('📰 Fetching ALL articles from Guardian sections...');
            const allArticles = await this.guardianService.fetchAllArticlesFromSections(mappedSections, {
                fromDate,
                toDate,
                pageSize: 200, // Get more articles for better filtering
                orderBy: 'newest',
                includeBodyText: false // We don't need full body text for this test
            });

            console.log(`📊 Found ${allArticles.length} total articles from sections\n`);

            // Step 5: Filter articles for relevance using AI
            console.log('🤖 Filtering articles for relevance using AI...');
            const relevantArticles = await this.newsDiscoveryService.filterRelevantArticles(allArticles, topic);

            // Step 6: Display results
            console.log('\n📊 RESULTS:');
            console.log('============');

            if (relevantArticles.length === 0) {
                console.log('❌ No relevant articles found for this topic');
                return;
            }
            console.log(`\n📰 Found ${relevantArticles.length} relevant articles:\n`);

            relevantArticles.forEach((article, index) => {
                console.log(`${index + 1}. ${article.title}`);
                console.log(`   📅 Published: ${article.publishedAt}`);
                console.log(`   🏷️  Section: ${article.section}`);
                console.log(`   🔗 URL: ${article.url}`);
                if (article.summarySource) {
                    const summary = article.summarySource.length > 150 
                        ? article.summarySource.substring(0, 150) + '...'
                        : article.summarySource;
                    console.log(`   📝 Summary: ${summary}`);
                }
                console.log('');
            });

            // Step 7: Summary statistics
            console.log('📈 SUMMARY:');
            console.log('============');
            console.log(`Topic: ${topic}`);
            console.log(`Mapped sections: ${mappedSections}`);
            console.log(`Date range: ${fromDate} to ${toDate}`);
            console.log(`Total articles from sections: ${allArticles.length}`);
            console.log(`Relevant articles found: ${relevantArticles.length}`);
            console.log(`Sections used: ${mappedSections.split('|').join(', ')}`);
            console.log(`Filtering efficiency: ${((relevantArticles.length / allArticles.length) * 100).toFixed(1)}%`);

        } catch (error) {
            console.error('❌ Test failed:', error.message);
            console.error('Stack trace:', error.stack);
        }
    }
}

// Run the test
async function main() {
    const test = new AIAlignmentNewsTest();
    await test.runTest();
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Run the test
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = { AIAlignmentNewsTest };
