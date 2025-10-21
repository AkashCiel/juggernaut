#!/usr/bin/env node

/**
 * Simple test script for Guardian API changes
 * Tests current functionality and planned improvements
 */

require('dotenv').config();
const GuardianService = require('./services/guardianService');

async function testGuardianAPI() {
    console.log('🧪 Testing Guardian API...\n');
    
    const service = new GuardianService();
    
    // Test parameters
    const now = new Date();
    const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fromDate = from.toISOString().slice(0, 10);
    const toDate = now.toISOString().slice(0, 10);
    
    console.log(`📅 Date range: ${fromDate} to ${toDate}`);
    console.log(`🔍 Testing with topics: ['AI', 'climate change']`);
    console.log(`📰 Section: technology|business|world|us-news|science`);
    console.log(`📄 Page size: 200 (Guardian maximum)`);
    console.log(`🔄 Order: newest\n`);
    
    try {
        const result = await service.fetchArticles(['AI', 'climate change'], {
            fromDate,
            toDate,
            pageSize: 200,
            orderBy: 'newest',
            section: 'technology|business|world|us-news|science',
            includeBodyText: false
        });
        
        console.log('✅ API call successful!\n');
        
        // Analyze results
        result.articlesByTopic.forEach(group => {
            console.log(`📊 Topic: "${group.topic}"`);
            console.log(`   Articles found: ${group.articles.length}`);
            
            if (group.articles.length > 0) {
                console.log(`   Sample article: "${group.articles[0].title}"`);
                console.log(`   Section: ${group.articles[0].section}`);
                console.log(`   Published: ${group.articles[0].publishedAt}`);
            }
            console.log('');
        });
        
        const totalArticles = result.articlesByTopic.reduce((sum, group) => sum + group.articles.length, 0);
        console.log(`📈 Total articles: ${totalArticles}`);
        
        // Check for duplicates
        const allIds = [];
        result.articlesByTopic.forEach(group => {
            group.articles.forEach(article => allIds.push(article.id));
        });
        const uniqueIds = new Set(allIds);
        console.log(`🔍 Unique articles: ${uniqueIds.size}`);
        console.log(`🔄 Duplicates: ${allIds.length - uniqueIds.size}`);
        
        return result;
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        return null;
    }
}

// Run the test
testGuardianAPI()
    .then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
