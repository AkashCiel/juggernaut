// Pricing & Feedback Page Content
// This file contains all text content for easy refinement

const PRICING_FEEDBACK_CONTENT = {
    intro: {
        title: "Thank you for trying out Juggernaut.",
        context: "If you are reading this, you are part of the first ever wave of users testing this product. Keep reading if you:",
        bulletPoints: [
            "See value in this product",
            "Want to keep using it",
            "Want to influence its future evolution"
        ]
    },
    experiment: {
        paragraph1: "If you want to use this product further, choose one of the options below for a one-time payment.",
        paragraph2: "If there is sufficient interest, I will roll out subscription plans in the future. If not, you can walk away, no obligations."
    },
    benefits: {
        heading: "Benefits:",
        items: [
            "Receive your personalised news feed once every 3 days.",
            "Access to chat to modify or refine your news feed.",
            "Full refund within 14 days."
        ]
    },
    callToAction: "Select one of the options below and I will email you a payment link. If you are almost ready to pay but something feels missing, tell me what that is in the box below.",
    plans: {
        heading: "Plans:",
        options: [
            { value: "1", label: "One month - 15 Euros" },
            { value: "6", label: "6 months - 75 Euros" }
        ]
    },
    success: {
        message: "your response has been recorded, you can close this window"
    },
    subscribe: {
        heading: "Subscribe to my free news feed",
        description: "I use this system to keep track of the following on a regular basis. I sometimes update this to tweak my news feed. You can choose to receive the same news feed, for free",
        buttonText: "Subscribe",
        subscribedText: "Subscribed!",
        loadingText: "Loading...",
        subscribingText: "Subscribing..."
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRICING_FEEDBACK_CONTENT;
}

