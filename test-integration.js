// Integration Test Script for Email Functionality
// Run this with: node test-integration.js

const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Email Integration Tests...\n');

// Test 1: Check if all required files exist
function testFileStructure() {
    console.log('📁 Testing file structure...');
    
    const requiredFiles = [
        'assets/js/emailSender.js',
        'assets/js/storage.js',
        'assets/js/app.js',
        'assets/js/scheduler.js',
        'index.html',
        'package.json'
    ];
    
    const missingFiles = [];
    
    requiredFiles.forEach(file => {
        if (!fs.existsSync(file)) {
            missingFiles.push(file);
        }
    });
    
    if (missingFiles.length === 0) {
        console.log('✅ All required files exist');
        return true;
    } else {
        console.log('❌ Missing files:', missingFiles);
        return false;
    }
}

// Test 2: Check package.json dependencies
function testDependencies() {
    console.log('\n📦 Testing dependencies...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (packageJson.dependencies && packageJson.dependencies['mailgun.js']) {
            console.log('✅ mailgun.js dependency found');
            return true;
        } else {
            console.log('❌ mailgun.js dependency missing');
            return false;
        }
    } catch (error) {
        console.log('❌ Error reading package.json:', error.message);
        return false;
    }
}

// Test 3: Check HTML integration
function testHtmlIntegration() {
    console.log('\n🌐 Testing HTML integration...');
    
    try {
        const html = fs.readFileSync('index.html', 'utf8');
        
        const checks = [
            { name: 'Email sender script', pattern: 'emailSender.js', found: false },
            { name: 'Email button', pattern: 'Email Report', found: false },
            { name: 'Email settings section', pattern: '📧 Email Sharing', found: false },
            { name: 'Mailgun API key input', pattern: 'mailgunApiKey', found: false },
            { name: 'Mailgun domain input', pattern: 'mailgunDomain', found: false },
            { name: 'Email recipients list', pattern: 'emailRecipientsList', found: false },
            { name: 'Auto-email checkbox', pattern: 'autoEmailEnabled', found: false }
        ];
        
        checks.forEach(check => {
            if (html.includes(check.pattern)) {
                check.found = true;
            }
        });
        
        const allFound = checks.every(check => check.found);
        
        checks.forEach(check => {
            console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
        });
        
        return allFound;
    } catch (error) {
        console.log('❌ Error reading index.html:', error.message);
        return false;
    }
}

// Test 4: Check JavaScript integration
function testJavaScriptIntegration() {
    console.log('\n⚙️ Testing JavaScript integration...');
    
    try {
        const emailSenderJs = fs.readFileSync('assets/js/emailSender.js', 'utf8');
        const storageJs = fs.readFileSync('assets/js/storage.js', 'utf8');
        const appJs = fs.readFileSync('assets/js/app.js', 'utf8');
        const schedulerJs = fs.readFileSync('assets/js/scheduler.js', 'utf8');
        
        const checks = [
            { name: 'EmailSender class', pattern: 'class EmailSender', found: false },
            { name: 'Mailgun API integration', pattern: 'api.mailgun.net', found: false },
            { name: 'Email template creation', pattern: 'createEmailTemplate', found: false },
            { name: 'Email settings in storage', pattern: 'getEmailConfig', found: false },
            { name: 'Email sender in app.js', pattern: 'emailSender', found: false },
            { name: 'Email in scheduler', pattern: 'autoSendReport', found: false }
        ];
        
        const allFiles = [emailSenderJs, storageJs, appJs, schedulerJs].join('\n');
        
        checks.forEach(check => {
            if (allFiles.includes(check.pattern)) {
                check.found = true;
            }
        });
        
        const allFound = checks.every(check => check.found);
        
        checks.forEach(check => {
            console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
        });
        
        return allFound;
    } catch (error) {
        console.log('❌ Error reading JavaScript files:', error.message);
        return false;
    }
}

// Test 5: Check browser compatibility
function testBrowserCompatibility() {
    console.log('\n🌍 Testing browser compatibility...');
    
    try {
        const emailSenderJs = fs.readFileSync('assets/js/emailSender.js', 'utf8');
        
        const checks = [
            { name: 'Uses fetch API', pattern: 'fetch(', found: false },
            { name: 'Uses FormData', pattern: 'FormData', found: false },
            { name: 'Uses localStorage', pattern: 'localStorage', found: false },
            { name: 'Browser compatibility check', pattern: 'typeof fetch', found: false },
            { name: 'No Node.js dependencies', pattern: 'require(', found: false },
            { name: 'No ES6 imports', pattern: 'import(', found: false }
        ];
        
        checks.forEach(check => {
            if (emailSenderJs.includes(check.pattern)) {
                check.found = true;
            }
        });
        
        const allFound = checks.every(check => check.found);
        
        checks.forEach(check => {
            console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
        });
        
        return allFound;
    } catch (error) {
        console.log('❌ Error checking browser compatibility:', error.message);
        return false;
    }
}

// Test 6: Check error handling
function testErrorHandling() {
    console.log('\n🛡️ Testing error handling...');
    
    try {
        const emailSenderJs = fs.readFileSync('assets/js/emailSender.js', 'utf8');
        
        const checks = [
            { name: 'Try-catch blocks', pattern: 'try {', found: false },
            { name: 'Error logging', pattern: 'console.error', found: false },
            { name: 'User-friendly errors', pattern: 'throw new Error', found: false },
            { name: 'Graceful degradation', pattern: 'catch (error)', found: false }
        ];
        
        checks.forEach(check => {
            if (emailSenderJs.includes(check.pattern)) {
                check.found = true;
            }
        });
        
        const allFound = checks.every(check => check.found);
        
        checks.forEach(check => {
            console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
        });
        
        return allFound;
    } catch (error) {
        console.log('❌ Error checking error handling:', error.message);
        return false;
    }
}

// Run all tests
function runAllTests() {
    const tests = [
        { name: 'File Structure', fn: testFileStructure },
        { name: 'Dependencies', fn: testDependencies },
        { name: 'HTML Integration', fn: testHtmlIntegration },
        { name: 'JavaScript Integration', fn: testJavaScriptIntegration },
        { name: 'Browser Compatibility', fn: testBrowserCompatibility },
        { name: 'Error Handling', fn: testErrorHandling }
    ];
    
    const results = [];
    
    tests.forEach(test => {
        console.log(`\n🧪 Running ${test.name} test...`);
        const result = test.fn();
        results.push({ name: test.name, passed: result });
    });
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('=' * 50);
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
    });
    
    console.log('\n' + '=' * 50);
    console.log(`Overall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! Email functionality is ready for use.');
    } else {
        console.log('⚠️ Some tests failed. Please review the issues above.');
    }
    
    return passed === total;
}

// Run the tests
if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests }; 