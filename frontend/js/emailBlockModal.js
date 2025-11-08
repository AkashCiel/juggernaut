// Email Block Modal - Displays blocking message for unpaid repeat users
class EmailBlockModal {
    constructor() {
        this.overlay = null;
        this.modalContainer = null;
        this.closeButton = null;
        this.messageText = null;
        this.pricingButton = null;
        this.isOpen = false;
        
        this.initialize();
    }

    // Initialize modal DOM structure
    initialize() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'email-block-modal-overlay';
        this.overlay.setAttribute('aria-hidden', 'true');
        
        // Create modal container
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'email-block-modal-container';
        this.modalContainer.setAttribute('role', 'dialog');
        this.modalContainer.setAttribute('aria-labelledby', 'email-block-modal-title');
        
        // Create close button
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'email-block-modal-close';
        this.closeButton.setAttribute('aria-label', 'Close modal');
        this.closeButton.innerHTML = '×';
        
        // Create modal header
        const header = document.createElement('div');
        header.className = 'email-block-modal-header';
        const title = document.createElement('h1');
        title.id = 'email-block-modal-title';
        title.textContent = 'Access Restricted';
        header.appendChild(title);
        
        // Create message text
        this.messageText = document.createElement('div');
        this.messageText.className = 'email-block-modal-content';
        this.messageText.innerHTML = `
            <p>I think you have already tried this. Please check your email for your personalised news feed. If you want to keep using this service in the future, visit the pricing page.</p>
        `;
        
        // Create pricing button
        this.pricingButton = document.createElement('button');
        this.pricingButton.className = 'email-block-modal-button';
        this.pricingButton.textContent = 'Visit Pricing Page';
        
        // Assemble modal structure
        this.modalContainer.appendChild(this.closeButton);
        this.modalContainer.appendChild(header);
        this.modalContainer.appendChild(this.messageText);
        this.modalContainer.appendChild(this.pricingButton);
        this.overlay.appendChild(this.modalContainer);
        
        // Initially hidden
        this.overlay.style.display = 'none';
        
        // Append to body
        document.body.appendChild(this.overlay);
        
        // Bind events
        this.bindEvents();
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
        
        // Pricing button click
        this.pricingButton.addEventListener('click', () => {
            this.handlePricingClick();
        });
    }

    // Handle pricing button click
    handlePricingClick() {
        // Get email from current context (should be passed when showing modal)
        const email = this.currentEmail;
        if (email) {
            // Redirect to pricing page with email parameter
            window.location.href = `pricing-feedback.html?email=${encodeURIComponent(email)}`;
        } else {
            // Fallback: redirect without email
            window.location.href = 'pricing-feedback.html';
        }
    }

    // Show modal with email
    show(email) {
        if (this.isOpen) return;
        
        this.currentEmail = email;
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        this.modalContainer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
        
        // Trigger fade-in animation
        requestAnimationFrame(() => {
            this.overlay.classList.add('email-block-modal-open');
        });
        
        // Focus management for accessibility
        this.closeButton.focus();
    }

    // Close modal
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.overlay.classList.remove('email-block-modal-open');
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

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailBlockModal;
}

// Initialize modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.emailBlockModal = new EmailBlockModal();
});

