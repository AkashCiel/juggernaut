document.addEventListener('DOMContentLoaded', () => {
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

    // Set up form submission
    const submitButton = document.getElementById('submitButton');
    const formSection = document.getElementById('formSection');
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
                    // Hide form and show success message
                    formSection.style.display = 'none';
                    successMessage.textContent = PRICING_FEEDBACK_CONTENT.success.message;
                    successMessage.classList.add('show');
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

    // Intro section
    const introTitle = document.getElementById('introTitle');
    const introContext = document.getElementById('introContext');
    if (introTitle) introTitle.textContent = content.intro.title;
    if (introContext) {
        const contextText = document.createTextNode(content.intro.context);
        introContext.appendChild(contextText);
        const bulletList = document.createElement('ul');
        bulletList.style.marginTop = 'var(--spacing-small)';
        bulletList.style.paddingLeft = 'var(--spacing-large)';
        content.intro.bulletPoints.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point;
            bulletList.appendChild(li);
        });
        introContext.appendChild(bulletList);
    }

    // Experiment section
    const experimentP1 = document.getElementById('experimentP1');
    const experimentP2 = document.getElementById('experimentP2');
    if (experimentP1) experimentP1.textContent = content.experiment.paragraph1;
    if (experimentP2) experimentP2.textContent = content.experiment.paragraph2;

    // Benefits section
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

    // CTA section
    const ctaText = document.getElementById('ctaText');
    if (ctaText) ctaText.textContent = content.callToAction;

    // Plans section
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

