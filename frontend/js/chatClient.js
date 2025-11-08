// Mobile Keyboard Manager - Simple padding solution
class MobileKeyboardManager {
    constructor(chatInput, chatInputContainer, chatMessages, chatContainer) {
        this.chatInput = chatInput;
        this.chatInputContainer = chatInputContainer;
        this.chatMessages = chatMessages;
        this.chatContainer = chatContainer;
        this.resizeObserver = null;
        this.visualViewport = null;
    }

    // Update layout: container height and messages padding-bottom
    updateLayout() {
        if (!this.chatMessages || !this.chatInputContainer) return;
        
        // Get actual viewport height (accounts for keyboard)
        const viewportHeight = window.visualViewport 
            ? window.visualViewport.height 
            : window.innerHeight;
        
        // Calculate input container height
        const inputHeight = this.chatInputContainer.offsetHeight;
        
        // Set chat-container height to viewport height minus input height
        if (this.chatContainer) {
            this.chatContainer.style.height = `${viewportHeight - inputHeight}px`;
        }
        
        // Set messages padding-bottom to match input height
        this.chatMessages.style.paddingBottom = `${inputHeight}px`;
    }

    // Prevent body scroll when input is focused
    preventBodyScroll(shouldPrevent) {
        if (shouldPrevent) {
            document.body.classList.add('chat-input-focused');
        } else {
            document.body.classList.remove('chat-input-focused');
        }
    }

    // Initialize keyboard manager
    initialize() {
        if (!this.chatInput || !this.chatInputContainer || !this.chatMessages || !this.chatContainer) return;

        // Initial layout calculation
        this.updateLayout();

        // Listener 1: ResizeObserver for input container height changes (auto-expand)
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateLayout();
            });
            this.resizeObserver.observe(this.chatInputContainer);
        }

        // Listener 2: visualViewport for keyboard appearing/disappearing
        if (window.visualViewport) {
            this.visualViewport = window.visualViewport;
            // Bind the method so it can be removed later
            this.handleViewportResize = () => {
                this.updateLayout();
            };
            this.visualViewport.addEventListener('resize', this.handleViewportResize);
        }

        // Handle input focus - prevent body scroll
        this.chatInput.addEventListener('focus', () => {
            this.preventBodyScroll(true);
            // Small delay to allow keyboard to appear, then update layout
            setTimeout(() => {
                this.updateLayout();
            }, 150);
        });

        // Handle input blur - restore body scroll
        this.chatInput.addEventListener('blur', () => {
            this.preventBodyScroll(false);
            // Small delay to allow keyboard to hide, then update layout
            setTimeout(() => {
                this.updateLayout();
            }, 150);
        });
    }

    // Cleanup
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.visualViewport && this.handleViewportResize) {
            this.visualViewport.removeEventListener('resize', this.handleViewportResize);
        }
        document.body.classList.remove('chat-input-focused');
    }
}

// Chat Client - Handles chat functionality
class ChatClient {
    constructor() {
        this.apiUrl = this.getApiUrl();
        this.sessionId = null;
        this.chatHistory = []; // Maintain chat history on client side
        this.isTyping = false;
        this.conversationComplete = false;
        this.isCurationTriggered = false; // Track if curation has been triggered
        this.userEmail = this.getUserEmail();
        
        this.initializeElements();
        this.setupAutoExpandInput();
        this.setupMobileKeyboardHandling();
        this.setupCollapsibleHeader();
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
        // For Vercel deployment, use the same domain (no CORS issues)
        return window.location.origin;
    }

    // Initialize DOM elements
    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.status = document.getElementById('status');
        this.chatInputContainer = document.querySelector('.chat-input-container');
    }

    // Setup auto-expand input functionality
    setupAutoExpandInput() {
        if (!this.chatInput) return;
        
        // Auto-resize textarea based on content
        const autoResize = () => {
            if (this.chatInput.disabled) return;
            
            // Reset height to auto to get the correct scrollHeight
            this.chatInput.style.height = 'auto';
            
            // Set height based on scrollHeight, with min and max constraints
            const scrollHeight = this.chatInput.scrollHeight;
            const minHeight = 48; // min-height from CSS
            const maxHeight = 150; // max-height from CSS
            const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
            
            this.chatInput.style.height = `${newHeight}px`;
            
            // Notify keyboard manager if it exists (for mobile)
            // ResizeObserver will also catch this, but this ensures immediate update
            if (this.keyboardManager) {
                this.keyboardManager.updateLayout();
            }
        };
        
        // Listen to input events
        this.chatInput.addEventListener('input', autoResize);
        
        // Also resize on paste
        this.chatInput.addEventListener('paste', () => {
            setTimeout(autoResize, 0);
        });
        
        // Initial resize
        autoResize();
    }

    // Setup mobile keyboard handling
    setupMobileKeyboardHandling() {
        if (!this.chatInputContainer || !this.chatMessages) return;
        
        // Only initialize on mobile devices
        if (window.innerWidth > 768) return;
        
        // Get chat container element
        const chatContainer = document.querySelector('.chat-container');
        
        // Initialize MobileKeyboardManager
        this.keyboardManager = new MobileKeyboardManager(
            this.chatInput,
            this.chatInputContainer,
            this.chatMessages,
            chatContainer
        );
        this.keyboardManager.initialize();
    }

    // Setup collapsible header on mobile
    setupCollapsibleHeader() {
        // Only initialize on mobile devices
        if (window.innerWidth > 768) return;
        
        const chatHeader = document.querySelector('.chat-header');
        if (!chatHeader || !this.chatMessages) return;
        
        // Import CollapsibleHeader dynamically (since it's a module)
        import('./collapsibleHeader.js').then(module => {
            const CollapsibleHeader = module.CollapsibleHeader || module.default;
            // Initialize CollapsibleHeader
            this.collapsibleHeader = new CollapsibleHeader(
                chatHeader,
                this.chatMessages,
                this.keyboardManager
            );
            this.collapsibleHeader.initialize();
        }).catch(err => {
            console.error('Failed to load CollapsibleHeader:', err);
        });
    }

    // Bind event listeners
    bindEvents() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-focus input (only if not disabled)
        if (!this.chatInput.disabled) {
            this.chatInput.focus();
        }
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
                // Initialize chat history with welcome message
                this.chatHistory = [{
                    role: 'assistant',
                    content: result.data.welcomeMessage,
                    timestamp: result.data.timestamp
                }];
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
        
        // Reset textarea height after clearing
        this.chatInput.style.height = 'auto';
        
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
                    email: this.userEmail,
                    chatHistory: this.chatHistory
                })
            });
            
            const result = await response.json();
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            if (result.success) {
                this.addMessage(result.data.response, 'bot');
                
                // Update chat history from response
                if (result.data.chatHistory) {
                    this.chatHistory = result.data.chatHistory;
                }
                
                // Check if conversation is complete
                if (result.data.conversationComplete) {
                    this.conversationComplete = true;
                    this.handleConversationComplete(result.data);
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
                thinking . . .
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
        // If curation has been triggered, always keep disabled
        if (this.isCurationTriggered) {
            enabled = false;
        }
        
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
    async handleConversationComplete(responseData) {
        const { userInterestsDescription } = responseData;
        
        if (!userInterestsDescription) {
            console.error('Missing userInterestsDescription for curation');
            this.showStatus('⚠️ Missing data for curation. Please try again.', 'error');
            return;
        }

        if (!this.userEmail) {
            console.error('User email not found');
            this.showStatus('⚠️ Email not found. Please try again.', 'error');
            return;
        }

        // Show status that curation is starting
        this.showStatus('🎯 Curating your personalized news feed...', 'info');
        this.isCurationTriggered = true; // Mark curation as triggered
        this.setInputState(false); // Disable input during curation (permanently)

        try {
            console.log('🚀 Calling curate-feed API...', { email: this.userEmail });

            const response = await fetch(`${this.apiUrl}/api/chat/curate-feed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.userEmail,
                    userInterests: userInterestsDescription
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(`✅ Your curation job has started. You'll receive an email when it's ready.`, 'success');
                this.addMessage(`Got it. I’ve kicked off your personalized news feed. You’ll receive it by email in 5 - 10 minutes. Check your spam folder if you don't see it.`, 'bot');
            } else {
                console.error('Curation failed:', result);
                this.showStatus('⚠️ Failed to curate news feed. Please try again.', 'error');
                this.addMessage('Sorry, there was an error curating your news feed. Please try again.', 'bot');
            }
        } catch (error) {
            console.error('Curation API error:', error);
            this.showStatus('⚠️ Network error during curation. Please try again.', 'error');
            this.addMessage('Sorry, there was a network error. Please try again.', 'bot');
        } finally {
            // Keep input disabled permanently since curation is triggered
            this.isCurationTriggered = true;
            this.setInputState(false);
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
