#!/usr/bin/env node
require('dotenv').config();

const EmailService = require('../services/emailService');
const { logger } = require('../utils/logger-vercel');

const DUMMY_ARTICLES = [
    {
        id: 'environment/2025/nov/05/demo-forest-town',
        title: 'Demo: Forest town blueprint inspires sustainable living',
        webUrl: 'https://example.com/demo-forest-town',
        trailText: 'Architects reveal a nature-first community design blending forests and housing.',
        relevanceScore: 95,
        section: 'environment',
        publishedDate: '2025-11-05T00:01:10Z'
    },
    {
        id: 'lifeandstyle/2025/oct/24/demo-modernist-home',
        title: 'Demo: Modernist home brings the outdoors inside',
        webUrl: 'https://example.com/demo-modernist-home',
        trailText: 'A concept home showcases how glass and timber harmonize with wild coastlines.',
        relevanceScore: 92,
        section: 'lifeandstyle',
        publishedDate: '2025-10-24T10:30:40Z'
    },
    {
        id: 'environment/2025/oct/31/demo-cool-roofs',
        title: 'Demo: Cool-roof coating keeps cities comfortable',
        webUrl: 'https://example.com/demo-cool-roofs',
        trailText: 'Researchers unveil a coating that can lower indoor temperatures by up to 6°C.',
        relevanceScore: 90,
        section: 'environment',
        publishedDate: '2025-10-30T23:39:04Z'
    },
    {
        id: 'environment/2025/oct/29/demo-forest-preschool',
        title: 'Demo: Forest preschools boost children’s immunity',
        webUrl: 'https://example.com/demo-forest-preschool',
        trailText: 'Schools embracing biodiversity see significant gains in child wellness.',
        relevanceScore: 88,
        section: 'environment',
        publishedDate: '2025-10-29T05:00:34Z'
    },
    {
        id: 'australia-news/2025/nov/02/demo-penguin-platform',
        title: 'Demo: Urban boardwalk reconnects residents with wildlife',
        webUrl: 'https://example.com/demo-penguin-platform',
        trailText: 'A redesigned waterfront gives visitors closer access to native species.',
        relevanceScore: 86,
        section: 'environment',
        publishedDate: '2025-11-01T19:00:45Z'
    },
    {
        id: 'environment/2025/oct/28/demo-flood-awareness',
        title: 'Demo: Flood-awareness drive empowers homeowners',
        webUrl: 'https://example.com/demo-flood-awareness',
        trailText: 'Community-led workshops show how to prepare for unpredictable weather.',
        relevanceScore: 84,
        section: 'environment',
        publishedDate: '2025-10-28T17:21:44Z'
    },
    {
        id: 'environment/2025/oct/26/demo-wall-insulation',
        title: 'Demo: Retrofits prove external insulation still matters',
        webUrl: 'https://example.com/demo-wall-insulation',
        trailText: 'Builders highlight the importance of trained installers to meet climate goals.',
        relevanceScore: 82,
        section: 'environment',
        publishedDate: '2025-10-26T16:41:36Z'
    },
    {
        id: 'environment/2025/oct/29/demo-planning-bill',
        title: 'Demo: Planning reforms balance growth with biodiversity',
        webUrl: 'https://example.com/demo-planning-bill',
        trailText: 'Policy experts share new safeguards designed to protect habitats.',
        relevanceScore: 80,
        section: 'environment',
        publishedDate: '2025-10-29T14:12:49Z'
    },
    {
        id: 'lifeandstyle/2025/oct/24/demo-wild-tulips',
        title: 'Demo: Wild tulips offer low-maintenance spring colour',
        webUrl: 'https://example.com/demo-wild-tulips',
        trailText: 'Gardeners explain the long-term benefits of species tulips.',
        relevanceScore: 78,
        section: 'lifeandstyle',
        publishedDate: '2025-10-24T10:00:39Z'
    },
    {
        id: 'environment/2025/nov/05/demo-bumblebee-habitats',
        title: 'Demo: Pollinator habitats thrive alongside solar farms',
        webUrl: 'https://example.com/demo-bumblebee-habitats',
        trailText: 'Sensitive planting at energy sites helps crucial species rebound.',
        relevanceScore: 76,
        section: 'environment',
        publishedDate: '2025-11-05T06:00:17Z'
    }
];

async function main() {
    const [, , ...args] = process.argv;
    const emailFlagIndex = args.indexOf('--email');
    const email = emailFlagIndex !== -1 ? args[emailFlagIndex + 1] : null;

    if (!email) {
        console.error('Usage: node scripts/send-pricing-test-email.js --email user@example.com');
        process.exit(1);
    }

    try {
        const emailService = new EmailService();

        const result = await emailService.composeAndSendEmail(
            email,
            DUMMY_ARTICLES,
            'environment|lifeandstyle|society'
        );

        if (result.success) {
            console.log(`✅ Test email sent to ${email}`);
        } else {
            console.error(`❌ Email send reported failure: ${result.error}`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Failed to send test email: ${error.message}`);
        process.exit(1);
    }
}

main();

