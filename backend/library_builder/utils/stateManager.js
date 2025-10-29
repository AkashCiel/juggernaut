const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

/**
 * StateManager - Manages batch processing state
 * Stores current batch information to allow resuming operations
 */
class StateManager {
    constructor(statePath = path.join(__dirname, '../data/state.json')) {
        this.statePath = statePath;
    }

    /**
     * Save current batch state
     * @param {Object} state - Batch state object
     */
    saveState(state) {
        try {
            const stateData = {
                ...state,
                lastUpdated: new Date().toISOString()
            };
            
            fs.writeFileSync(
                this.statePath,
                JSON.stringify(stateData, null, 2),
                'utf8'
            );
            
            logger.debug('State saved', { statePath: this.statePath });
            return true;
        } catch (error) {
            logger.error('Failed to save state', { error: error.message });
            throw error;
        }
    }

    /**
     * Load current batch state
     * @returns {Object|null} - Batch state or null if no state exists
     */
    loadState() {
        try {
            if (!fs.existsSync(this.statePath)) {
                logger.debug('No state file found');
                return null;
            }

            const stateData = fs.readFileSync(this.statePath, 'utf8');
            const state = JSON.parse(stateData);
            
            logger.debug('State loaded', { batchId: state.batchId });
            return state;
        } catch (error) {
            logger.error('Failed to load state', { error: error.message });
            return null;
        }
    }

    /**
     * Check if a state exists
     * @returns {boolean}
     */
    hasState() {
        return fs.existsSync(this.statePath);
    }

    /**
     * Clear state after successful completion
     */
    clearState() {
        try {
            if (fs.existsSync(this.statePath)) {
                fs.unlinkSync(this.statePath);
                logger.debug('State cleared');
            }
        } catch (error) {
            logger.error('Failed to clear state', { error: error.message });
        }
    }

    /**
     * Update specific fields in state
     * @param {Object} updates - Fields to update
     */
    updateState(updates) {
        const currentState = this.loadState();
        if (!currentState) {
            throw new Error('No state to update');
        }

        const newState = {
            ...currentState,
            ...updates
        };

        this.saveState(newState);
    }
}

module.exports = StateManager;

