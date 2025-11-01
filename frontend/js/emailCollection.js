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
            // Skip backend validation - assume email is valid
            // Store email in session storage
            sessionStorage.setItem('userEmail', email);
            
            // Redirect to chat page with email parameter
            window.location.href = `/?email=${encodeURIComponent(email)}`;
        } catch (error) {
            console.error('Error:', error);
            this.showError('Unable to proceed. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    // Client-side email validation
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate email with backend
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
