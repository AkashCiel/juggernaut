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
        
        // Generate frontend CSS
        const frontendCSS = generateFrontendCSS(designSystem);
        const frontendCSSPath = path.join(__dirname, '..', 'frontend', 'css', 'design-system.css');
        
        // Ensure CSS directory exists
        const frontendCSSDir = path.dirname(frontendCSSPath);
        if (!fs.existsSync(frontendCSSDir)) {
            fs.mkdirSync(frontendCSSDir, { recursive: true });
        }
        
        fs.writeFileSync(frontendCSSPath, frontendCSS);
        console.log('✅ Generated frontend/css/design-system.css');
        
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

function generateFrontendCSS(designSystem) {
    return `/**
 * Design System CSS Variables
 * Auto-generated from design-system/design-system.json
 * Version: ${designSystem.version}
 * Generated: ${new Date().toISOString()}
 */

:root {
  /* Colors */
  --color-primary: ${designSystem.colors.primary};
  --color-secondary: ${designSystem.colors.secondary};
  --color-text: ${designSystem.colors.text};
  --color-text-light: ${designSystem.colors.textLight};
  --color-background: ${designSystem.colors.background};
  --color-white: ${designSystem.colors.white};
  --color-border: ${designSystem.colors.border};
  --color-hover: ${designSystem.colors.hover};

  /* Fonts */
  --font-primary: ${designSystem.fonts.primary};
  --font-size-small: ${designSystem.fonts.size.small};
  --font-size-medium: ${designSystem.fonts.size.medium};
  --font-size-large: ${designSystem.fonts.size.large};
  --font-size-xlarge: ${designSystem.fonts.size.xlarge};
  --font-size-xxlarge: ${designSystem.fonts.size.xxlarge};
  --font-weight-normal: ${designSystem.fonts.weight.normal};
  --font-weight-medium: ${designSystem.fonts.weight.medium};
  --font-weight-semibold: ${designSystem.fonts.weight.semibold};
  --font-weight-bold: ${designSystem.fonts.weight.bold};

  /* Spacing */
  --spacing-xs: ${designSystem.spacing.xs};
  --spacing-small: ${designSystem.spacing.small};
  --spacing-medium: ${designSystem.spacing.medium};
  --spacing-large: ${designSystem.spacing.large};
  --spacing-xl: ${designSystem.spacing.xl};
  --spacing-xxl: ${designSystem.spacing.xxl};

  /* Border Radius */
  --border-radius-small: ${designSystem.borderRadius.small};
  --border-radius-medium: ${designSystem.borderRadius.medium};

  /* Shadows */
  --shadow-light: ${designSystem.shadows.light};
  --shadow-medium: ${designSystem.shadows.medium};

  /* Gradients */
  --gradient-primary: ${designSystem.gradients.primary};

  /* Breakpoints */
  --breakpoint-mobile: ${designSystem.breakpoints.mobile};

  /* Transitions */
  --transition-fast: ${designSystem.transitions.fast};
  --transition-medium: ${designSystem.transitions.medium};
}

/* Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-primary);
  line-height: 1.6;
  color: var(--color-text);
  background: var(--gradient-primary);
  min-height: 100vh;
}

/* Utility Classes */
.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-secondary); }
.text-light { color: var(--color-text-light); }
.bg-primary { background: var(--color-primary); }
.bg-secondary { background: var(--color-secondary); }
.bg-white { background: var(--color-white); }
.bg-gradient { background: var(--gradient-primary); }

.font-small { font-size: var(--font-size-small); }
.font-medium { font-size: var(--font-size-medium); }
.font-large { font-size: var(--font-size-large); }
.font-xlarge { font-size: var(--font-size-xlarge); }
.font-xxlarge { font-size: var(--font-size-xxlarge); }

.font-normal { font-weight: var(--font-weight-normal); }
.font-medium-weight { font-weight: var(--font-weight-medium); }
.font-semibold { font-weight: var(--font-weight-semibold); }
.font-bold { font-weight: var(--font-weight-bold); }

.p-xs { padding: var(--spacing-xs); }
.p-small { padding: var(--spacing-small); }
.p-medium { padding: var(--spacing-medium); }
.p-large { padding: var(--spacing-large); }
.p-xl { padding: var(--spacing-xl); }
.p-xxl { padding: var(--spacing-xxl); }

.m-xs { margin: var(--spacing-xs); }
.m-small { margin: var(--spacing-small); }
.m-medium { margin: var(--spacing-medium); }
.m-large { margin: var(--spacing-large); }
.m-xl { margin: var(--spacing-xl); }
.m-xxl { margin: var(--spacing-xxl); }

.rounded-small { border-radius: var(--border-radius-small); }
.rounded-medium { border-radius: var(--border-radius-medium); }

.shadow-light { box-shadow: var(--shadow-light); }
.shadow-medium { box-shadow: var(--shadow-medium); }

.transition-fast { transition: var(--transition-fast); }
.transition-medium { transition: var(--transition-medium); }
`;
}

// Run if called directly
if (require.main === module) {
    propagateDesignSystem();
}

module.exports = { propagateDesignSystem };
