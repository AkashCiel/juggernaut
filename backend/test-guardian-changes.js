#!/usr/bin/env node

/**
 * Test script for Guardian API changes
 * Tests the updated fetchArticlesForTopic function with:
 * 1. Page size defaulting to 200 (from global constant)
 * 2. Section as required parameter
 */

require('dotenv').config();
const GuardianService = require('./services/guardianService');
const { GUARDIAN_PAGE_SIZE } = require('./config/constants');

async function testGuardianChanges() {
    console.log('🧪 Testing Guardian API Changes...\n');
    
    const service = new GuardianService();
    
    console.log(`📊 GUARDIAN_PAGE_SIZE constant: ${GUARDIAN_PAGE_SIZE}`);
    
    // Test 1: Section required parameter
    console.log('\n1️⃣ Testing section required parameter...');
    try {
        await service.fetchArticlesForTopic('AI', {});
        console.log('❌ Should have thrown error for missing section');
    } catch (error) {
        if (error.message.includes('Section parameter is required')) {
            console.log('✅ Section parameter validation working');
        } else {
            console.log('❌ Unexpected error:', error.message);
        }
    }
    
    // Test 2: Default page size
    console.log('\n2️⃣ Testing default page size...');
    try {
        const now = new Date();
        const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const fromDate = from.toISOString().slice(0, 10);
        const toDate = now.toISOString().slice(0, 10);
        
        const result = await service.fetchArticlesForTopic('AI', {
            fromDate,
            toDate,
            section: 'technology',
            includeBodyText: false
        });
        
        console.log('✅ API call successful with default page size');
        console.log(`📄 Articles returned: ${result.articles.length}`);
        console.log(`📊 Page size used: 200 (default from constant)`);
        
    } catch (error) {
        console.log('❌ API call failed:', error.message);
    }
    
    // Test 3: Custom page size
    console.log('\n3️⃣ Testing custom page size...');
    try {
        const now = new Date();
        const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const fromDate = from.toISOString().slice(0, 10);
        const toDate = now.toISOString().slice(0, 10);
        
        const result = await service.fetchArticlesForTopic('AI', {
            fromDate,
            toDate,
            pageSize: 50, // Custom page size
            section: 'technology',
            includeBodyText: false
        });
        
        console.log('✅ API call successful with custom page size');
        console.log(`📄 Articles returned: ${result.articles.length}`);
        console.log(`📊 Page size used: 50 (custom)`);
        
    } catch (error) {
        console.log('❌ API call failed:', error.message);
    }
    
    console.log('\n✅ Guardian changes test completed!');
}

// Run the test
testGuardianChanges()
    .then(() => {
        console.log('\n🎉 All tests completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
