// Collapsible Header - Manages header expand/collapse behavior on mobile
export class CollapsibleHeader {
    constructor(chatHeader, chatMessages, keyboardManager) {
        this.chatHeader = chatHeader;
        this.chatMessages = chatMessages;
        this.keyboardManager = keyboardManager;
        this.isExpanded = false;
        this.touchStartY = null;
        this.swipeThreshold = 50; // Minimum swipe distance to trigger collapse
    }

    // Toggle header expanded/collapsed state
    toggle() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    // Expand header to show full content
    expand() {
        if (this.isExpanded) return;
        
        this.isExpanded = true;
        this.chatHeader.classList.add('header-expanded');
        this.chatMessages.classList.add('messages-header-overlay');
        
        // Update layout when header expands
        if (this.keyboardManager) {
            this.keyboardManager.updateLayout();
        }
    }

    // Collapse header to minimal state
    collapse() {
        if (!this.isExpanded) return;
        
        this.isExpanded = false;
        this.chatHeader.classList.remove('header-expanded');
        this.chatMessages.classList.remove('messages-header-overlay');
        
        // Update layout when header collapses
        if (this.keyboardManager) {
            this.keyboardManager.updateLayout();
        }
    }

    // Handle touch start for swipe detection
    handleTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
    }

    // Handle touch move for swipe detection
    handleTouchMove(e) {
        if (!this.isExpanded || !this.touchStartY) return;
        
        const touchCurrentY = e.touches[0].clientY;
        const swipeDistance = touchCurrentY - this.touchStartY;
        
        // Swipe up to collapse
        if (swipeDistance < -this.swipeThreshold) {
            this.collapse();
            this.touchStartY = null;
        }
    }

    // Handle outside tap to close
    handleOutsideTap(e) {
        if (!this.isExpanded) return;
        
        // If click is outside header, collapse
        if (!this.chatHeader.contains(e.target)) {
            this.collapse();
        }
    }

    // Initialize collapsible header
    initialize() {
        if (!this.chatHeader) return;

        // Add collapsed state class initially
        this.chatHeader.classList.add('header-collapsible');

        // Wire up About button in header
        const headerAboutButton = this.chatHeader.querySelector('#headerAboutButton');
        if (headerAboutButton) {
            headerAboutButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header toggle
                // Trigger About modal if available
                if (window.aboutModal) {
                    window.aboutModal.open();
                }
            });
        }

        // Tap on header to toggle (but not on About button)
        this.chatHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking on About button (it has its own handler)
            if (e.target.closest('#headerAboutButton')) {
                return;
            }
            // Toggle for any other click on header (h1, p, triangle, empty space)
            this.toggle();
        });

        // Swipe up to collapse
        this.chatHeader.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        });

        this.chatHeader.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        });

        // Outside tap to close
        document.addEventListener('click', (e) => {
            this.handleOutsideTap(e);
        });
    }

    // Cleanup
    destroy() {
        this.chatHeader.classList.remove('header-expanded', 'header-collapsible');
        this.chatMessages.classList.remove('messages-header-overlay');
    }
}

