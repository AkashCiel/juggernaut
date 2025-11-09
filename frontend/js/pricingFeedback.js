// Collapsible Section Class
class CollapsibleSection {
    constructor(sectionElement, autoExpand = false) {
        this.section = sectionElement;
        this.button = sectionElement.querySelector('.collapsible-button');
        this.content = sectionElement.querySelector('.collapsible-content');
        this.isExpanded = false;
        
        if (autoExpand) {
            this.expand();
        }
        
        this.bindEvents();
    }
    
    expand() {
        if (this.isExpanded) return;
        
        this.isExpanded = true;
        this.section.classList.add('expanded');
        this.content.classList.add('expanded');
        this.button.setAttribute('aria-expanded', 'true');
        
        // Auto-scroll section to top of viewport
        this.scrollToTop();
    }
    
    collapse() {
        if (!this.isExpanded) return;
        
        this.isExpanded = false;
        this.section.classList.remove('expanded');
        this.content.classList.remove('expanded');
        this.button.setAttribute('aria-expanded', 'false');
    }
    
    toggle() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }
    
    scrollToTop() {
        // Scroll section to top of viewport with smooth behavior
        const sectionTop = this.section.offsetTop;
        const scrollOffset = Math.max(0, sectionTop - 16); // Small offset from top (16px)
        
        window.scrollTo({
            top: scrollOffset,
            behavior: 'smooth'
        });
    }
    
    bindEvents() {
        this.button.addEventListener('click', () => this.toggle());
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const yearDisplay = document.getElementById('currentYear');

    // Update footer year
    if (yearDisplay) {
        yearDisplay.textContent = new Date().getFullYear();
    }

    // Populate content from pricingFeedbackContent.js
    if (typeof PRICING_FEEDBACK_CONTENT !== 'undefined') {
        populateContent();
    }

    // Initialize collapsible sections
    initializeCollapsibleSections();

    // Initialize subscribe section
    if (email) {
        await initializeSubscribeSection(email);
    }

    // Set up form submission
    const submitButton = document.getElementById('submitButton');
    const successMessage = document.getElementById('successMessage');

    if (submitButton) {
        submitButton.addEventListener('click', async () => {
            if (!email) {
                alert('Email is required. Please use the link from your email.');
                return;
            }

            const selectedPlan = document.querySelector('input[name="paymentIntent"]:checked');
            const userFeedback = document.getElementById('userFeedback').value.trim();

            // Disable button during submission
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        paymentIntentInMonths: selectedPlan ? parseInt(selectedPlan.value) : null,
                        userFeedback: userFeedback || null
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Hide submit button and show success message
                    if (submitButton) submitButton.style.display = 'none';
                    if (successMessage) {
                        successMessage.textContent = PRICING_FEEDBACK_CONTENT.success.message;
                        successMessage.classList.add('show');
                    }
                } else {
                    throw new Error(data.error || 'Failed to submit feedback');
                }
            } catch (error) {
                console.error('Error submitting feedback:', error);
                alert('Failed to submit feedback. Please try again.');
                submitButton.disabled = false;
                submitButton.textContent = 'Submit';
            }
        });
    }
});

function populateContent() {
    const content = PRICING_FEEDBACK_CONTENT;

    // Page title
    const introTitle = document.getElementById('introTitle');
    if (introTitle) introTitle.textContent = content.intro.title;

    // Section 1: Philosophy and vision
    const philosophyText = document.getElementById('philosophyText');
    const visionText = document.getElementById('visionText');
    if (philosophyText) philosophyText.textContent = content.intro.philosophy;
    if (visionText) visionText.textContent = content.intro.vision;

    // Section 2: About me (with link)
    const aboutMeText = document.getElementById('aboutMeText');
    if (aboutMeText) {
        const aboutMeContent = content.about_me;
        const linkText = "you can";
        const linkIndex = aboutMeContent.indexOf(linkText);
        
        if (linkIndex !== -1) {
            const beforeLink = aboutMeContent.substring(0, linkIndex);
            const afterLink = aboutMeContent.substring(linkIndex + linkText.length);
            
            aboutMeText.innerHTML = `${beforeLink}<a href="https://www.akash-singh.org/" target="_blank" rel="noopener noreferrer">${linkText}</a>${afterLink}`;
        } else {
            aboutMeText.textContent = aboutMeContent;
        }
    }

    // Section 3: Subscribe to my free news feed
    const subscribeDescription = document.getElementById('subscribeDescription');
    if (subscribeDescription) subscribeDescription.textContent = content.subscribe.description;

    // Section 4: Build your own news feed
    const experimentP1 = document.getElementById('experimentP1');
    const experimentP2 = document.getElementById('experimentP2');
    if (experimentP1) experimentP1.textContent = content.experiment.paragraph1;
    if (experimentP2) experimentP2.textContent = content.experiment.paragraph2;

    const benefitsHeading = document.getElementById('benefitsHeading');
    const benefitsList = document.getElementById('benefitsList');
    if (benefitsHeading) benefitsHeading.textContent = content.benefits.heading;
    if (benefitsList) {
        content.benefits.items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            benefitsList.appendChild(li);
        });
    }

    const ctaText = document.getElementById('ctaText');
    if (ctaText) ctaText.textContent = content.callToAction;

    const plansHeading = document.getElementById('plansHeading');
    const plansRadioGroup = document.getElementById('plansRadioGroup');
    if (plansHeading) plansHeading.textContent = content.plans.heading + ' (optional)';
    if (plansRadioGroup) {
        content.plans.options.forEach(option => {
            const radioOption = document.createElement('div');
            radioOption.className = 'radio-option';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'paymentIntent';
            radio.id = `plan-${option.value}`;
            radio.value = option.value;
            radio.required = false;
            
            const label = document.createElement('label');
            label.htmlFor = `plan-${option.value}`;
            label.textContent = option.label;
            
            radioOption.appendChild(radio);
            radioOption.appendChild(label);
            plansRadioGroup.appendChild(radioOption);
        });
    }
}

// Initialize collapsible sections
function initializeCollapsibleSections() {
    const philosophySection = document.getElementById('section-philosophy');
    const aboutSection = document.getElementById('section-about');
    const subscribeSection = document.getElementById('section-subscribe');
    const buildSection = document.getElementById('section-build');

    // Initialize all sections (philosophy auto-expands)
    if (philosophySection) {
        window.philosophyCollapsible = new CollapsibleSection(philosophySection, true);
    }
    if (aboutSection) {
        window.aboutCollapsible = new CollapsibleSection(aboutSection, false);
    }
    if (subscribeSection) {
        window.subscribeCollapsible = new CollapsibleSection(subscribeSection, false);
    }
    if (buildSection) {
        window.buildCollapsible = new CollapsibleSection(buildSection, false);
    }
}

// Initialize subscribe section
async function initializeSubscribeSection(email) {
    const subscribeButton = document.getElementById('subscribeButton');
    const subscribedMessage = document.getElementById('subscribedMessage');
    const interestsDisplay = document.getElementById('primaryEmailInterests');

    // Check subscription status
    let isSubscribed = false;
    try {
        const statusResponse = await fetch(`/api/subscription-status?email=${encodeURIComponent(email)}`);
        const statusData = await statusResponse.json();
        if (statusResponse.ok && statusData.success) {
            isSubscribed = statusData.data.isSubscribed;
        }
    } catch (error) {
        console.error('Error checking subscription status:', error);
    }

    // Show appropriate UI based on subscription status
    if (isSubscribed) {
        if (subscribeButton) subscribeButton.classList.add('hidden');
        if (subscribedMessage) subscribedMessage.classList.add('show');
    } else {
        if (subscribeButton) subscribeButton.classList.remove('hidden');
        if (subscribedMessage) subscribedMessage.classList.remove('show');
    }

    // Fetch and display primary email interests
    if (interestsDisplay) {
        interestsDisplay.innerHTML = '<p class="loading">Loading...</p>';
        
        try {
            const response = await fetch('/api/primary-email-interests');
            const data = await response.json();
            
            if (response.ok && data.success) {
                const userInterests = data.data.userInterests || '';
                if (userInterests) {
                    interestsDisplay.innerHTML = `<p><strong>${userInterests}</strong></p>`;
                } else {
                    interestsDisplay.innerHTML = '<p class="loading">No interests found.</p>';
                }
            } else {
                interestsDisplay.innerHTML = '<p class="loading">Failed to load interests.</p>';
            }
        } catch (error) {
            console.error('Error fetching primary email interests:', error);
            interestsDisplay.innerHTML = '<p class="loading">Failed to load interests.</p>';
        }
    }

    // Set up subscribe button click handler
    if (subscribeButton && !isSubscribed) {
        subscribeButton.addEventListener('click', async () => {
            if (!email) {
                alert('Email is required. Please use the link from your email.');
                return;
            }

            // Disable button during subscription
            subscribeButton.disabled = true;
            subscribeButton.textContent = PRICING_FEEDBACK_CONTENT.subscribe.subscribingText;

            try {
                const response = await fetch('/api/subscribe-free-newsfeed', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Hide button and show subscribed message
                    subscribeButton.classList.add('hidden');
                    if (subscribedMessage) {
                        subscribedMessage.textContent = PRICING_FEEDBACK_CONTENT.subscribe.subscribedText;
                        subscribedMessage.classList.add('show');
                    }
                } else {
                    throw new Error(data.error || 'Failed to subscribe');
                }
            } catch (error) {
                console.error('Error subscribing:', error);
                alert('Failed to subscribe. Please try again.');
                subscribeButton.disabled = false;
                subscribeButton.textContent = PRICING_FEEDBACK_CONTENT.subscribe.buttonText;
            }
        });
    }
}

