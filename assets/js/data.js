// Data Management and Mock Data
window.AINewsData = {
    // API Keys management
    getApiKeys() {
        try {
            const saved = localStorage.getItem('aiNewsApiKeys');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading API keys:', error);
            return {};
        }
    },

    saveApiKeys(keys) {
        try {
            localStorage.setItem('aiNewsApiKeys', JSON.stringify(keys));
            console.log('✅ API keys saved successfully');
        } catch (error) {
            console.error('Error saving API keys:', error);
        }
    },

    async loadDefaultTopics() {
        // Default AI research topics
        return [
            'large language models',
            'computer vision',
            'reinforcement learning',
            'neural networks',
            'natural language processing',
            'machine learning',
            'deep learning',
            'artificial general intelligence',
            'AI safety',
            'transformers',
            'diffusion models',
            'robotics AI'
        ];
    },

    async getMockNewsData() {
        // Mock news data for demonstration
        return [
            {
                title: "THIS IS A MOCK: Breakthrough in Large Language Model Efficiency",
                summary: "THIS IS A MOCK: Researchers at Stanford announce a new architecture that reduces computational requirements by 40% while maintaining performance on benchmark tasks.",
                source: "Stanford AI Lab",
                topic: "large language models",
                time: "2 hours ago"
            },
            {
                title: "THIS IS A MOCK: New Computer Vision Model Achieves Human-Level Object Recognition",
                summary: "THIS IS A MOCK: A team from MIT has developed a computer vision system that matches human accuracy in complex object recognition tasks across diverse environments.",
                source: "MIT CSAIL",
                topic: "computer vision",
                time: "4 hours ago"
            },
            {
                title: "THIS IS A MOCK: Reinforcement Learning Breakthrough in Robotics Control",
                summary: "THIS IS A MOCK: DeepMind's latest RL algorithm enables robots to learn complex manipulation tasks 10x faster than previous methods.",
                source: "DeepMind",
                topic: "reinforcement learning",
                time: "6 hours ago"
            },
            {
                title: "THIS IS A MOCK: AI Safety Research Proposes New Alignment Framework",
                summary: "THIS IS A MOCK: Anthropic researchers introduce a novel approach to AI alignment that addresses key challenges in maintaining AI system safety at scale.",
                source: "Anthropic",
                topic: "AI safety",
                time: "8 hours ago"
            },
            {
                title: "THIS IS A MOCK: Transformer Architecture Innovation Improves Long-Context Understanding",
                summary: "THIS IS A MOCK: New research extends transformer models to process sequences 5x longer than previous architectures while maintaining computational efficiency.",
                source: "Google Research",
                topic: "transformers",
                time: "12 hours ago"
            },
            {
                title: "THIS IS A MOCK: Diffusion Models Show Promise in Scientific Simulation",
                summary: "THIS IS A MOCK: Scientists demonstrate how diffusion models can accelerate physics simulations, potentially revolutionizing materials science research.",
                source: "Nature AI",
                topic: "diffusion models",
                time: "1 day ago"
            },
            {
                title: "THIS IS A MOCK: Neural Network Pruning Technique Reduces Model Size by 80%",
                summary: "THIS IS A MOCK: Researchers develop a new pruning method that dramatically reduces neural network size without significant performance loss.",
                source: "Carnegie Mellon",
                topic: "neural networks",
                time: "1 day ago"
            },
            {
                title: "THIS IS A MOCK: Natural Language Processing Advances in Multilingual Understanding",
                summary: "THIS IS A MOCK: New model achieves state-of-the-art performance across 100+ languages with minimal training data per language.",
                source: "Facebook AI",
                topic: "natural language processing",
                time: "2 days ago"
            },
            {
                title: "THIS IS A MOCK: Deep Learning Framework Optimizes Edge Device Deployment",
                summary: "THIS IS A MOCK: New framework enables complex deep learning models to run efficiently on mobile and IoT devices.",
                source: "NVIDIA Research",
                topic: "deep learning",
                time: "2 days ago"
            },
            {
                title: "THIS IS A MOCK: Robotics AI Achieves Dexterous Manipulation Milestone",
                summary: "THIS IS A MOCK: Robot hand system demonstrates human-like dexterity in complex object manipulation tasks using advanced AI control.",
                source: "Boston Dynamics",
                topic: "robotics AI",
                time: "3 days ago"
            },
            {
                title: "THIS IS A MOCK: Machine Learning Model Predicts Protein Folding with 95% Accuracy",
                summary: "THIS IS A MOCK: Breakthrough in computational biology uses ML to predict protein structures, accelerating drug discovery research.",
                source: "DeepMind",
                topic: "machine learning",
                time: "3 days ago"
            },
            {
                title: "THIS IS A MOCK: AGI Research Milestone: Multi-Modal Reasoning System",
                summary: "THIS IS A MOCK: Research team develops AI system capable of reasoning across text, images, and audio simultaneously with human-like performance.",
                source: "OpenAI",
                topic: "artificial general intelligence",
                time: "4 days ago"
            }
        ];
    },

    // Future: Add functions for real API integration
    async fetchRealNewsData(topics, sources = []) {
        // Placeholder for real API integration
        console.log('Real news fetching not implemented yet');
        return this.getMockNewsData();
    },

    async loadConfiguration() {
        // Placeholder for loading external configuration
        return {
            apiKeys: {},
            sources: [],
            updateInterval: 3600000, // 1 hour in milliseconds
            maxArticles: 50
        };
    }
};