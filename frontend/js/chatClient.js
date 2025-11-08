// Mobile Keyboard Manager - Handles mobile keyboard positioning and layout
class MobileKeyboardManager {
    constructor(chatInput, chatInputContainer, chatMessages) {
        this.chatInput = chatInput;
        this.chatInputContainer = chatInputContainer;
        this.chatMessages = chatMessages;
        this.isKeyboardVisible = false;
        this.isInputFocused = false;
        this.inputContainerHeight = 0;
        this.updateThrottle = null;
        this.resizeObserver = null;
    }

    // Detect keyboard visibility
    detectKeyboard() {
        if (window.visualViewport) {
            const viewport = window.visualViewport;
            const keyboardHeight = window.innerHeight - viewport.height;
            return {
                isVisible: keyboardHeight > 50, // Threshold to account for small variations
                keyboardHeight: keyboardHeight,
                viewportHeight: viewport.height
            };
        } else {
            // Fallback: detect via window resize
            // This is less reliable but works on older browsers
            const currentHeight = window.innerHeight;
            const expectedHeight = window.screen.height;
            const keyboardHeight = expectedHeight - currentHeight;
            return {
                isVisible: keyboardHeight > 150,
                keyboardHeight: keyboardHeight,
                viewportHeight: currentHeight
            };
        }
    }

    // Calculate input container height
    calculateInputContainerHeight() {
        if (!this.chatInputContainer) return 0;
        return this.chatInputContainer.offsetHeight;
    }

    // Position input container at keyboard top or bottom
    positionInputContainer() {
        if (!this.chatInputContainer) return;

        const keyboardInfo = this.detectKeyboard();
        this.isKeyboardVisible = keyboardInfo.isVisible;
        this.inputContainerHeight = this.calculateInputContainerHeight();

        if (this.isKeyboardVisible) {
            // Keyboard visible: position above keyboard
            const topPosition = keyboardInfo.viewportHeight - this.inputContainerHeight;
            this.chatInputContainer.style.top = `${topPosition}px`;
            this.chatInputContainer.style.bottom = 'auto';
        } else {
            // Keyboard hidden: stick to bottom
            this.chatInputContainer.style.top = 'auto';
            this.chatInputContainer.style.bottom = '0';
        }
    }

    // Update messages container padding to prevent overlap
    updateMessagesPadding() {
        if (!this.chatMessages) return;

        this.inputContainerHeight = this.calculateInputContainerHeight();
        this.chatMessages.style.paddingBottom = `${this.inputContainerHeight}px`;
    }

    // Prevent body scroll when input is focused
    preventBodyScroll(shouldPrevent) {
        this.isInputFocused = shouldPrevent;
        
        if (shouldPrevent) {
            document.body.classList.add('chat-input-focused');
        } else {
            // Only remove if keyboard is also hidden
            if (!this.isKeyboardVisible) {
                document.body.classList.remove('chat-input-focused');
            }
        }
    }

    // Handle input container resize (from auto-expand)
    handleInputResize() {
        // Debounce rapid resize events
        if (this.updateThrottle) {
            clearTimeout(this.updateThrottle);
        }
        
        this.updateThrottle = setTimeout(() => {
            this.updateLayout();
        }, 50);
    }

    // Main update function (throttled)
    updateLayout() {
        // Small delay to ensure DOM has updated
        requestAnimationFrame(() => {
            this.positionInputContainer();
            this.updateMessagesPadding();
            
            // Update body scroll prevention based on focus state
            if (this.isInputFocused) {
                this.preventBodyScroll(true);
            } else if (!this.isKeyboardVisible) {
                this.preventBodyScroll(false);
            }
        });
    }

    // Initialize keyboard manager
    initialize() {
        if (!this.chatInput || !this.chatInputContainer || !this.chatMessages) return;

        // Initial layout calculation
        this.updateLayout();

        // Set up Visual Viewport API listeners
        if (window.visualViewport) {
            const handleViewportChange = () => {
                // Small delay to ensure keyboard animation completes
                setTimeout(() => {
                    this.updateLayout();
                }, 50);
            };

            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
        } else {
            // Fallback for browsers without Visual Viewport API
            let lastHeight = window.innerHeight;
            
            const handleResize = () => {
                const currentHeight = window.innerHeight;
                const heightDiff = Math.abs(lastHeight - currentHeight);
                
                if (heightDiff > 50) {
                    setTimeout(() => {
                        this.updateLayout();
                    }, 100);
                }
                
                lastHeight = currentHeight;
            };
            
            window.addEventListener('resize', handleResize);
        }

        // Set up ResizeObserver for input container height changes
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleInputResize();
            });
            this.resizeObserver.observe(this.chatInputContainer);
        }

        // Handle input focus
        this.chatInput.addEventListener('focus', () => {
            this.preventBodyScroll(true);
            // Delay to allow keyboard to appear
            setTimeout(() => {
                this.updateLayout();
            }, 100);
        });

        // Handle input blur
        this.chatInput.addEventListener('blur', () => {
            this.preventBodyScroll(false);
            // Delay to allow keyboard to hide
            setTimeout(() => {
                this.updateLayout();
            }, 100);
        });

        // Handle window resize (orientation change, etc.)
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.updateLayout();
            }, 100);
        });
    }

    // Cleanup (if needed)
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.updateThrottle) {
            clearTimeout(this.updateThrottle);
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
            if (this.keyboardManager) {
                this.keyboardManager.handleInputResize();
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
        
        // Initialize MobileKeyboardManager
        this.keyboardManager = new MobileKeyboardManager(
            this.chatInput,
            this.chatInputContainer,
            this.chatMessages
        );
        this.keyboardManager.initialize();
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
                this.addMessage(`Got it. I’ve kicked off your personalized news feed. You’ll receive it by email shortly.`, 'bot');
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
