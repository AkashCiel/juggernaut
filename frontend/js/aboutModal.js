// About Modal - Handles modal popup for about page
class AboutModal {
    constructor() {
        this.isOpen = false;
        this.modalContainer = null;
        this.overlay = null;
        this.closeButton = null;
        this.contentContainer = null;
        
        this.initialize();
        this.bindEvents();
    }

    // Initialize modal DOM structure
    initialize() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'about-modal-overlay';
        this.overlay.setAttribute('aria-hidden', 'true');
        
        // Create modal container
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'about-modal-container';
        this.modalContainer.setAttribute('role', 'dialog');
        this.modalContainer.setAttribute('aria-labelledby', 'about-modal-title');
        
        // Create close button
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'about-modal-close';
        this.closeButton.setAttribute('aria-label', 'Close modal');
        this.closeButton.innerHTML = '×';
        
        // Create modal header
        const header = document.createElement('div');
        header.className = 'about-modal-header';
        const title = document.createElement('h1');
        title.id = 'about-modal-title';
        title.textContent = 'About Juggernaut';
        header.appendChild(title);
        
        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'about-modal-content';
        
        // Assemble modal structure
        this.modalContainer.appendChild(this.closeButton);
        this.modalContainer.appendChild(header);
        this.modalContainer.appendChild(this.contentContainer);
        this.overlay.appendChild(this.modalContainer);
        
        // Initially hidden
        this.overlay.style.display = 'none';
        
        // Append to body
        document.body.appendChild(this.overlay);
        
        // Load content
        this.loadContent();
    }

    // Load content from aboutContent.js
    async loadContent() {
        try {
            const { aboutContent } = await import('./aboutContent.js');
            const paragraphs = aboutContent.philosophy.split('. ');
            
            // Clear existing content
            this.contentContainer.innerHTML = '';
            
            // Add paragraphs
            paragraphs.forEach((para, index) => {
                if (para.trim()) {
                    const p = document.createElement('p');
                    p.textContent = para.trim() + (index < paragraphs.length - 1 && !para.endsWith('.') ? '.' : '');
                    this.contentContainer.appendChild(p);
                }
            });
        } catch (error) {
            console.error('Error loading about content:', error);
            this.contentContainer.innerHTML = '<p>Error loading content.</p>';
        }
    }

    // Bind event listeners
    bindEvents() {
        // Close button click
        this.closeButton.addEventListener('click', () => this.close());
        
        // Overlay click (backdrop) - close modal
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
        
        // Find and bind trigger button (About link in floating nav)
        const aboutTrigger = document.getElementById('aboutModalTrigger');
        if (aboutTrigger) {
            aboutTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
        }
    }

    // Open modal
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        this.modalContainer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
        
        // Trigger fade-in animation
        requestAnimationFrame(() => {
            this.overlay.classList.add('about-modal-open');
        });
        
        // Focus management for accessibility
        this.closeButton.focus();
    }

    // Close modal
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.overlay.classList.remove('about-modal-open');
        this.modalContainer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Restore body scroll
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (!this.isOpen) {
                this.overlay.style.display = 'none';
            }
        }, 250); // Match animation duration
    }
}

// Initialize modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aboutModal = new AboutModal();
});

