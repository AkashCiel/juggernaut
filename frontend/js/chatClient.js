// Chat Client - Handles chat functionality
class ChatClient {
    constructor() {
        this.apiUrl = this.getApiUrl();
        this.sessionId = null;
        this.isTyping = false;
        this.conversationComplete = false;
        this.userEmail = this.getUserEmail();
        
        this.initializeElements();
        this.bindEvents();
        this.startChat();
    }

    // Get user email from URL parameter
    getUserEmail() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('email');
    }

    // Get API URL based on environment
    getApiUrl() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::]') {
            return 'http://localhost:8000';  // Local development
        }
        return 'https://juggernaut-37yk.onrender.com';  // Production
    }

    // Initialize DOM elements
    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.status = document.getElementById('status');
    }

    // Bind event listeners
    bindEvents() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-focus input
        this.chatInput.focus();
    }

    // Start chat session
    async startChat() {
        try {
            this.showStatus('Starting chat...', 'info');
            
            const response = await fetch(`${this.apiUrl}/api/chat/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.sessionId = result.data.sessionId;
                this.addMessage(result.data.welcomeMessage, 'bot');
                this.hideStatus();
            } else {
                this.showStatus('Failed to start chat session', 'error');
            }
        } catch (error) {
            console.error('Chat start error:', error);
            this.showStatus('Network error. Please try again.', 'error');
        }
    }

    // Send message to backend
    async sendMessage() {
        const message = this.chatInput.value.trim();
        
        if (!message) {
            return;
        }
        
        // Disable input while processing
        this.setInputState(false);
        
        // Add user message to chat
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await fetch(`${this.apiUrl}/api/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message: message,
                    sessionId: this.sessionId,
                    email: this.userEmail
                })
            });
            
            const result = await response.json();
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            if (result.success) {
                this.addMessage(result.data.response, 'bot');
                
                // Check if conversation is complete
                if (result.data.conversationComplete) {
                    this.conversationComplete = true;
                    this.handleConversationComplete(result.data.userInterestsDescription);
                }
            } else {
                this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            }
        } catch (error) {
            console.error('Message send error:', error);
            this.hideTypingIndicator();
            this.addMessage('Network error. Please try again.', 'bot');
        } finally {
            this.setInputState(true);
        }
    }

    // Add message to chat display
    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.textContent = text;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    // Show typing indicator
    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                AI is typing
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    // Hide typing indicator
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        this.isTyping = false;
    }

    // Set input state (enabled/disabled)
    setInputState(enabled) {
        this.chatInput.disabled = !enabled;
        this.sendButton.disabled = !enabled;
        
        if (enabled) {
            this.chatInput.focus();
        }
    }

    // Show status message
    showStatus(message, type = 'info') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.status.style.display = 'block';
    }

    // Hide status message
    hideStatus() {
        this.status.style.display = 'none';
    }

    // Handle conversation completion
    handleConversationComplete(userInterestsDescription) {
        if (userInterestsDescription) {
            // Show completion status with the full description
            this.showStatus(`✅ Your interests have been identified!`, 'success');
        }
    }

    // Scroll to bottom of chat
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatClient();
});
