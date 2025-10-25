#!/usr/bin/env node

/**
 * Design System Propagation Script
 * Reads design-system.json and generates config files for frontend and backend
 */

const fs = require('fs');
const path = require('path');

function propagateDesignSystem() {
    try {
        console.log('🔄 Starting design system propagation...');
        
        // Read design system file
        const designSystemPath = path.join(__dirname, 'design-system.json');
        if (!fs.existsSync(designSystemPath)) {
            throw new Error('design-system.json not found');
        }
        
        const designSystem = JSON.parse(fs.readFileSync(designSystemPath, 'utf8'));
        console.log(`✅ Read design system v${designSystem.version}`);
        
        // Generate backend config
        const backendConfig = generateBackendConfig(designSystem);
        const backendPath = path.join(__dirname, '..', 'backend', 'config', 'designSystem.js');
        
        // Ensure directory exists
        const backendDir = path.dirname(backendPath);
        if (!fs.existsSync(backendDir)) {
            fs.mkdirSync(backendDir, { recursive: true });
        }
        
        fs.writeFileSync(backendPath, backendConfig);
        console.log('✅ Generated backend/config/designSystem.js');
        
        // Generate frontend config
        const frontendConfig = generateFrontendConfig(designSystem);
        const frontendPath = path.join(__dirname, '..', 'frontend', 'config', 'designSystem.js');
        
        // Ensure directory exists
        const frontendDir = path.dirname(frontendPath);
        if (!fs.existsSync(frontendDir)) {
            fs.mkdirSync(frontendDir, { recursive: true });
        }
        
        fs.writeFileSync(frontendPath, frontendConfig);
        console.log('✅ Generated frontend/config/designSystem.js');
        
        console.log('🎉 Design system propagated successfully!');
        
    } catch (error) {
        console.error('❌ Design system propagation failed:', error.message);
        process.exit(1);
    }
}

function generateBackendConfig(designSystem) {
    return `/**
 * Design System Configuration
 * Auto-generated from design-system/design-system.json
 * Version: ${designSystem.version}
 * Generated: ${new Date().toISOString()}
 */

const designSystem = ${JSON.stringify(designSystem, null, 2)};

module.exports = designSystem;
`;
}

function generateFrontendConfig(designSystem) {
    return `/**
 * Design System Configuration
 * Auto-generated from design-system/design-system.json
 * Version: ${designSystem.version}
 * Generated: ${new Date().toISOString()}
 */

export const designSystem = ${JSON.stringify(designSystem, null, 2)};
`;
}

// Run if called directly
if (require.main === module) {
    propagateDesignSystem();
}

module.exports = { propagateDesignSystem };
