// UI Management and Interactions
export class UIManager {
    constructor() {
        this.statusTimeout = null;
    }

    init() {
        console.log('UI Manager initialized');
    }

    showStatusMessage(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        
        if (!statusDiv) {
            console.log(`Status: ${message} (${type})`);
            return;
        }

        // Clear any existing timeout
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
        }

        statusDiv.className = `status-message status-${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        
        // Add fade-in animation
        statusDiv.classList.add('fade-in');
        
        // Auto-hide after 5 seconds
        this.statusTimeout = setTimeout(() => {
            statusDiv.style.display = 'none';
            statusDiv.classList.remove('fade-in');
        }, 5000);
    }

    hideStatusMessage() {
        const statusDiv = document.getElementById('statusMessage');
        if (statusDiv) {
            statusDiv.style.display = 'none';
            statusDiv.classList.remove('fade-in');
        }
        
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
            this.statusTimeout = null;
        }
    }

    // Utility methods for common UI operations
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
            element.classList.add('fade-in');
        }
    }

    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
            element.classList.remove('fade-in');
        }
    }

    toggleElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            if (element.style.display === 'none') {
                this.showElement(elementId);
            } else {
                this.hideElement(elementId);
            }
        }
    }

    addLoadingSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Loading...
                </div>
            `;
        }
    }

    removeLoadingSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const loading = container.querySelector('.loading');
            if (loading) {
                loading.remove();
            }
        }
    }

    // Animation helpers
    animateElementIn(element, animationClass = 'fade-in') {
        if (element) {
            element.classList.add(animationClass);
            
            // Remove animation class after animation completes
            setTimeout(() => {
                element.classList.remove(animationClass);
            }, 500);
        }
    }

    // Form validation helpers
    validateInput(inputId, errorMessage) {
        const input = document.getElementById(inputId);
        if (!input || !input.value.trim()) {
            this.showStatusMessage(errorMessage, 'error');
            input?.focus();
            return false;
        }
        return true;
    }

    // Smooth scrolling
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
}