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
        paragraph1: "You are deciding to support the further use and development of this product. Which also means that you have a fair and democratic say in this process - what features to build, which order to build them in, and so on. Since this is an experiment for both me and you, let us start with a simple, one-time payment. I will not save your card details. Which means if you don't do anything, you will not be charged further.",
        paragraph2: "If there is sufficient interest, I will roll out subscription plans in the future. If not, you can walk away, no obligations."
    },
    benefits: {
        heading: "Benefits:",
        items: [
            "Access to regular personalised news feed - daily or once every x days. You decide.",
            "Access to chat to modify or refine your news feed.",
            "Access to an exclusive community - give feedback, propose, and vote for new features.",
            "Full refund of your payment in the case of future subscriptions."
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
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRICING_FEEDBACK_CONTENT;
}

