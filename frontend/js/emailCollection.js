// Email Collection - Handles email validation and navigation
class EmailCollection {
    constructor() {
        this.apiUrl = this.getApiUrl();
        this.form = document.getElementById('emailForm');
        this.emailInput = document.getElementById('email');
        this.submitBtn = document.getElementById('submitBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.loading = document.getElementById('loading');
        
        this.bindEvents();
    }

    // Get API URL based on environment
    getApiUrl() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::]') {
            return 'http://localhost:8000';  // Local development
        }
        // For Vercel deployment, use the same domain (no CORS issues)
        return window.location.origin;
    }

    // Bind event listeners
    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.emailInput.addEventListener('input', () => this.clearError());
    }

    // Handle form submission
    async handleSubmit(e) {
        e.preventDefault();
        
        const email = this.emailInput.value.trim();
        
        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        this.setLoading(true);
        this.clearError();

        try {
            // Check email access before redirecting
            const canAccess = await this.checkEmailAccess(email);
            
            if (!canAccess) {
                this.setLoading(false);
                this.showError('I have already registered your interests. If you have paid, you will regularly receive your news feed. You don\'t need to do anything. I will roll out modifying interests via chat soon.');
                return;
            }
            
            // Store email in session storage
            sessionStorage.setItem('userEmail', email);
            
            // Redirect to chat page with email parameter
            window.location.href = `/?email=${encodeURIComponent(email)}`;
        } catch (error) {
            console.error('Error:', error);
            // On error, allow access (fail open)
            sessionStorage.setItem('userEmail', email);
            window.location.href = `/?email=${encodeURIComponent(email)}`;
        } finally {
            this.setLoading(false);
        }
    }

    // Client-side email validation
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Check email access - determines if user can access chat
    async checkEmailAccess(email) {
        try {
            const response = await fetch(`${this.apiUrl}/api/validate-email-access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                return result.data.canAccess;
            }
            
            // If response format is unexpected, allow access (fail open)
            return true;
        } catch (error) {
            console.error('Email access check error:', error);
            // Fallback to allow access if backend is unavailable (fail open)
            return true;
        }
    }

    // Validate email with backend (deprecated - kept for compatibility)
    async validateEmailWithBackend(email) {
        try {
            const response = await fetch(`${this.apiUrl}/api/validate-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Backend validation error:', error);
            // Fallback to client-side validation if backend is unavailable
            return this.validateEmail(email);
        }
    }

    // Show error message
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.emailInput.classList.add('error');
    }

    // Clear error message
    clearError() {
        this.errorMessage.style.display = 'none';
        this.emailInput.classList.remove('error');
    }

    // Set loading state
    setLoading(loading) {
        this.submitBtn.disabled = loading;
        this.loading.style.display = loading ? 'block' : 'none';
        
        if (loading) {
            this.submitBtn.textContent = 'Validating...';
        } else {
            this.submitBtn.textContent = 'Continue to Chat';
        }
    }
}

// Initialize email collection when page loads
document.addEventListener('DOMContentLoaded', () => {
    new EmailCollection();
});
