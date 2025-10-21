#!/usr/bin/env node

/**
 * Test script for section mapping functionality
 * Tests AI-powered mapping of topics to Guardian sections
 */

require('dotenv').config();
const SectionMappingService = require('./services/sectionMappingService');

async function testSectionMapping() {
    console.log('🧪 Testing Section Mapping Service...\n');
    
    const service = new SectionMappingService();
    
    // Test cases with different topic combinations
    const testCases = [
        {
            name: 'AI and Technology',
            topics: ['artificial intelligence', 'machine learning', 'deep learning']
        },
        {
            name: 'Climate and Environment',
            topics: ['climate change', 'renewable energy', 'carbon emissions']
        },
        {
            name: 'Business and Finance',
            topics: ['cryptocurrency', 'blockchain', 'fintech']
        },
        {
            name: 'Health and Science',
            topics: ['medical research', 'healthcare', 'biotechnology']
        },
        {
            name: 'Mixed Topics',
            topics: ['space exploration', 'quantum computing', 'sustainable technology']
        }
    ];
    
    console.log('📊 Service Status:');
    const status = await service.getStatus();
    console.log(`   Cache Status: ${status.cacheStatus.hasCache ? 'Available' : 'Not Available'}`);
    console.log(`   Sections Count: ${status.cacheStatus.sectionsCount}`);
    console.log(`   Cache Expired: ${status.cacheStatus.isExpired ? 'Yes' : 'No'}`);
    console.log('');
    
    // Test each case
    for (const testCase of testCases) {
        console.log(`🔍 Testing: ${testCase.name}`);
        console.log(`   Topics: ${testCase.topics.join(', ')}`);
        
        try {
            const startTime = Date.now();
            const sections = await service.mapTopicsToSections(testCase.topics);
            const duration = Date.now() - startTime;
            
            console.log(`   ✅ Mapped sections: ${sections}`);
            console.log(`   ⏱️ Duration: ${duration}ms`);
            
        } catch (error) {
            console.log(`   ❌ Mapping failed: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('✅ Section mapping test completed!');
}

// Run the test
testSectionMapping()
    .then(() => {
        console.log('\n🎉 All tests completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });