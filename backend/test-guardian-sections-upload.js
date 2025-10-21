#!/usr/bin/env node

/**
 * Test script for Guardian sections cache upload
 * Tests the GitHub upload functionality with mock data
 */

require('dotenv').config();
const GuardianSectionsService = require('./services/guardianSectionsService');

async function testGuardianSectionsUpload() {
    console.log('🧪 Testing Guardian sections cache upload...\n');
    
    const service = new GuardianSectionsService();
    
    // Mock Guardian sections data
    const mockSections = [
        'technology', 'business', 'world', 'us-news', 'science', 'politics', 
        'sport', 'culture', 'lifestyle', 'opinion', 'environment', 'society',
        'global-development', 'education', 'media', 'money', 'travel', 'food',
        'fashion', 'artanddesign', 'books', 'film', 'music', 'stage',
        'television-radio', 'games', 'lifeandstyle'
    ];
    
    console.log(`📊 Mock sections count: ${mockSections.length}`);
    console.log(`📝 Sample sections: ${mockSections.slice(0, 5).join(', ')}...`);
    
    try {
        console.log('\n📤 Testing GitHub upload with mock data...');
        
        // Test the upload functionality directly
        const result = await service.uploadSectionsToGitHub(mockSections);
        
        console.log('✅ Guardian sections upload test successful!');
        console.log(`📁 File URL: ${result.fileUrl}`);
        console.log(`🔑 SHA: ${result.sha.substring(0, 8)}...`);
        
        return result;
        
    } catch (error) {
        console.log('❌ Guardian sections upload test failed:', error.message);
        return null;
    }
}

// Run the test
testGuardianSectionsUpload()
    .then((result) => {
        if (result) {
            console.log('\n🎉 Test completed successfully!');
            console.log('📋 You can now check the uploaded file on GitHub:');
            console.log(`🔗 ${result.fileUrl}`);
        } else {
            console.log('\n❌ Test failed');
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
