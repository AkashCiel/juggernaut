// Pricing & Feedback Page Content
// This file contains all text content for easy refinement

const PRICING_FEEDBACK_CONTENT = {
    intro: {
        title: "Thank you for trying out Juggernaut.",
        philosophy: "Some aspects of the world may deeply interest you. The world is likely evolving in those aspects. There must be high quality information channels, like journalism, out there, capturing this evolution. This system can find and deliver that information to you.",
        vision: "I will keep this system as free from bias or external motivations as possible. This means I will not seek sponsorship or investors. My current source of information is The Guardian. They are extremely generous with their content. I might expand this source in the near future, but carefully. The ideal of truth is absolutely non-negotiable here."
    },
    experiment: {
        paragraph1: "If you are reading this, you must have used the app to build your own news feed. If you want to keep receiving it, choose one of the options below for a one-time payment.",
        paragraph2: "If there is sufficient interest, I will roll out subscription plans in the future. If not, you can walk away, no obligations."
    },
    benefits: {
        heading: "Benefits:",
        items: [
            "Receive your personalised news feed once every x days (as soon as enough new and relevant articles are released). So something like once every 2-5 days.",
            "Access to chat to modify or refine your news feed.",
            "Full refund within 14 days (more details if you decide to pay)."
        ]
    },
    about_me:"To you, I am just a random guy on the internet. If you want to know more about me, you can.",
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

