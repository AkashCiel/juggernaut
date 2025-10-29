const SectionSummaryGenerator = require('../services/sectionSummaryGenerator');
const SectionSummaryStorage = require('../services/sectionSummaryStorage');
const DiscordService = require('../../services/discordService');

/**
 * Generate Section Summaries Command
 * Handles all sections, subset of sections, or single section
 * 
 * @param {Object} options - Options
 * @param {string[]} options.sections - Specific sections to process (null for all)
 * @returns {Promise<Object>} - Result with success status and details
 */
async function generateSectionSummaries(options = {}) {
    const startTime = Date.now();
    
    // Initialize services
    const generator = new SectionSummaryGenerator();
    const storage = new SectionSummaryStorage();
    
    // Initialize Discord if configured
    let discord = null;
    if (process.env.DISCORD_WEBHOOK_URL) {
        discord = new DiscordService(process.env.DISCORD_WEBHOOK_URL);
    }
    
    console.log('='.repeat(80));
    console.log('SECTION SUMMARY GENERATION');
    console.log('='.repeat(80));
    
    try {
        // Step 1: Determine sections to process
        let sectionsToProcess;
        
        if (options.sections && options.sections.length > 0) {
            sectionsToProcess = options.sections;
            console.log(`\nMode: Specific sections (${sectionsToProcess.length})`);
            console.log(`Sections: ${sectionsToProcess.join(', ')}`);
        } else {
            console.log(`\nMode: Auto-detect all sections`);
            sectionsToProcess = await storage.discoverSections();
        }
        
        if (sectionsToProcess.length === 0) {
            throw new Error('No sections found to process');
        }
        
        // Step 2: Generate summaries for all sections
        const results = await generator.generateSummaries(sectionsToProcess);
        
        console.log('\n' + '='.repeat(80));
        console.log('GENERATION COMPLETE');
        console.log('='.repeat(80));
        console.log(`✅ Successful: ${results.successful.length}/${sectionsToProcess.length}`);
        if (results.failed.length > 0) {
            console.log(`❌ Failed: ${results.failed.length}/${sectionsToProcess.length}`);
            results.failed.forEach(failure => {
                console.log(`   - ${failure.section}: ${failure.error}`);
            });
        }
        
        // If all failed, abort
        if (results.successful.length === 0) {
            throw new Error('All sections failed to generate summaries');
        }
        
        // Step 3: Download existing summaries
        const existingSummaries = await storage.downloadExistingSummaries();
        
        // Step 4: Merge new with existing
        const merged = storage.mergeSummaries(existingSummaries, results.successful);
        
        // Step 5: Upload to GitHub
        const commitMessage = generateCommitMessage(results.successful);
        const uploadResult = await storage.uploadSummaries(merged, commitMessage);
        
        // Calculate statistics
        const totalTokens = results.successful.reduce((sum, r) => sum + r.tokens_used, 0);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const durationMin = (duration / 60).toFixed(1);
        
        // Step 6: Discord notification
        if (discord) {
            try {
                if (results.failed.length === 0) {
                    await discord.sendSuccess('Section summaries generated', {
                        sections_processed: `${results.successful.length}/${sectionsToProcess.length}`,
                        total_tokens: totalTokens.toLocaleString(),
                        duration: durationMin > 1 ? `${durationMin}m` : `${duration}s`,
                        github_file: uploadResult.fileUrl
                    });
                } else {
                    await discord.sendWarning('Section summaries partially completed', {
                        successful: `${results.successful.length}/${sectionsToProcess.length}`,
                        failed: results.failed.map(f => f.section).join(', '),
                        total_tokens: totalTokens.toLocaleString(),
                        github_file: uploadResult.fileUrl
                    });
                }
            } catch (discordError) {
                console.log(`\n⚠️  Discord notification failed: ${discordError.message}`);
            }
        }
        
        // Final summary
        console.log('\n' + '='.repeat(80));
        console.log('COMPLETE');
        console.log('='.repeat(80));
        console.log(`Sections processed: ${results.successful.length}/${sectionsToProcess.length}`);
        console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
        console.log(`Duration: ${durationMin > 1 ? durationMin + ' minutes' : duration + ' seconds'}`);
        console.log(`GitHub file: ${uploadResult.fileUrl}`);
        console.log('='.repeat(80));
        
        return {
            success: true,
            processed: results.successful.length,
            failed: results.failed.length,
            totalTokens,
            duration,
            fileUrl: uploadResult.fileUrl,
            failedSections: results.failed
        };
        
    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('ERROR');
        console.error('='.repeat(80));
        console.error(`❌ ${error.message}`);
        console.error('='.repeat(80));
        
        // Send Discord error notification
        if (discord) {
            try {
                await discord.sendError('Section summary generation failed', error);
            } catch (discordError) {
                console.log(`⚠️  Discord notification failed: ${discordError.message}`);
            }
        }
        
        throw error;
    }
}

/**
 * Generate commit message based on summaries
 * @param {Array} summaries - Array of successful summaries
 * @returns {string} - Commit message
 */
function generateCommitMessage(summaries) {
    if (summaries.length === 1) {
        return `Update ${summaries[0].section} section summary`;
    } else if (summaries.length <= 3) {
        const sections = summaries.map(s => s.section).join(', ');
        return `Update section summaries: ${sections}`;
    } else {
        return `Update ${summaries.length} section summaries`;
    }
}

module.exports = generateSectionSummaries;

