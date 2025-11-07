// About Intro Modal - Handles intro modal on landing page
// Shows sections one at a time with navigation
class AboutIntroModal {
    constructor() {
        this.isOpen = false;
        this.currentSectionIndex = 0;
        this.sections = [];
        this.modalContainer = null;
        this.overlay = null;
        this.closeButton = null;
        this.contentContainer = null;
        this.navigationButton = null;
        this.startChattingButton = null;
        
        this.initialize();
        this.loadSections();
        this.bindEvents();
        // Auto-open on page load
        this.open();
    }

    // Initialize modal DOM structure
    initialize() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'about-intro-modal-overlay';
        this.overlay.setAttribute('aria-hidden', 'true');
        
        // Create modal container
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'about-intro-modal-container';
        this.modalContainer.setAttribute('role', 'dialog');
        this.modalContainer.setAttribute('aria-labelledby', 'about-intro-modal-title');
        
        // Create close button
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'about-intro-modal-close';
        this.closeButton.setAttribute('aria-label', 'Close modal');
        this.closeButton.innerHTML = '×';
        
        // Create modal header
        const header = document.createElement('div');
        header.className = 'about-intro-modal-header';
        const title = document.createElement('h1');
        title.id = 'about-intro-modal-title';
        title.textContent = 'About Juggernaut';
        header.appendChild(title);
        
        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'about-intro-modal-content';
        
        // Create navigation button (swipe up for more)
        this.navigationButton = document.createElement('button');
        this.navigationButton.className = 'about-intro-modal-nav-button';
        this.navigationButton.innerHTML = `
            <span>swipe up for more . . .</span>
            <span class="arrow-up">↑</span>
        `;
        
        // Create start chatting button (only shown on last section)
        this.startChattingButton = document.createElement('button');
        this.startChattingButton.className = 'about-intro-modal-start-button';
        this.startChattingButton.textContent = 'start chatting';
        this.startChattingButton.style.display = 'none';
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'about-intro-modal-buttons';
        buttonContainer.appendChild(this.navigationButton);
        buttonContainer.appendChild(this.startChattingButton);
        
        // Assemble modal structure
        this.modalContainer.appendChild(this.closeButton);
        this.modalContainer.appendChild(header);
        this.modalContainer.appendChild(this.contentContainer);
        this.modalContainer.appendChild(buttonContainer);
        this.overlay.appendChild(this.modalContainer);
        
        // Initially hidden
        this.overlay.style.display = 'none';
        
        // Append to body
        document.body.appendChild(this.overlay);
    }

    // Load sections from aboutContent.js
    async loadSections() {
        try {
            const { aboutContent } = await import('./aboutContent.js');
            this.sections = aboutContent.introSections || [];
            
            if (this.sections.length > 0) {
                this.showSection(0);
            }
        } catch (error) {
            console.error('Error loading about content:', error);
            this.contentContainer.innerHTML = '<p>Error loading content.</p>';
        }
    }

    // Show specific section
    showSection(index) {
        if (index < 0 || index >= this.sections.length) {
            return;
        }
        
        this.currentSectionIndex = index;
        
        // Update content
        this.contentContainer.innerHTML = '';
        const sectionText = document.createElement('p');
        sectionText.textContent = this.sections[index];
        this.contentContainer.appendChild(sectionText);
        
        // Update navigation button visibility
        if (index === this.sections.length - 1) {
            // Last section: hide nav button, show start chatting button
            this.navigationButton.style.display = 'none';
            this.startChattingButton.style.display = 'block';
        } else {
            // Not last section: show nav button, hide start chatting button
            this.navigationButton.style.display = 'block';
            this.startChattingButton.style.display = 'none';
        }
    }

    // Navigate to next section
    nextSection() {
        if (this.currentSectionIndex < this.sections.length - 1) {
            this.showSection(this.currentSectionIndex + 1);
        }
    }

    // Handle start chatting button click
    handleStartChatting() {
        this.close();
        // Allow form interaction after modal closes
        const emailForm = document.getElementById('emailForm');
        if (emailForm) {
            emailForm.style.pointerEvents = 'auto';
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
        
        // Navigation button click
        this.navigationButton.addEventListener('click', () => this.nextSection());
        
        // Start chatting button click
        this.startChattingButton.addEventListener('click', () => this.handleStartChatting());
        
        // Swipe up gesture support (for mobile)
        let touchStartY = 0;
        let touchEndY = 0;
        
        this.modalContainer.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        });
        
        this.modalContainer.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            const swipeDistance = touchStartY - touchEndY;
            
            // Swipe up (at least 50px upward)
            if (swipeDistance > 50 && this.currentSectionIndex < this.sections.length - 1) {
                this.nextSection();
            }
        });
    }

    // Open modal
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        this.modalContainer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
        
        // Disable form interaction while modal is open
        const emailForm = document.getElementById('emailForm');
        if (emailForm) {
            emailForm.style.pointerEvents = 'none';
        }
        
        // Trigger fade-in animation
        requestAnimationFrame(() => {
            this.overlay.classList.add('about-intro-modal-open');
        });
        
        // Focus management for accessibility
        this.closeButton.focus();
    }

    // Close modal
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.overlay.classList.remove('about-intro-modal-open');
        this.modalContainer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Restore body scroll
        
        // Re-enable form interaction
        const emailForm = document.getElementById('emailForm');
        if (emailForm) {
            emailForm.style.pointerEvents = 'auto';
        }
        
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
    window.aboutIntroModal = new AboutIntroModal();
});

