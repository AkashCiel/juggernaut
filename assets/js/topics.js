// Topics Management
class TopicsManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
    }

    init() {
        this.updateDisplay();
    }

    updateDisplay() {
        const grid = document.getElementById('topicsGrid');
        if (!grid) return;

        const topics = this.settingsManager.getTopics();
        grid.innerHTML = '';
        
        topics.forEach(topic => {
            const topicElement = this.createTopicElement(topic);
            grid.appendChild(topicElement);
        });
        
        // Add fade-in animation
        grid.classList.add('fade-in');
    }

    createTopicElement(topic) {
        const topicElement = document.createElement('div');
        topicElement.className = 'topic-tag active slide-in-left';
        topicElement.innerHTML = `
            ${this.escapeHtml(topic)}
            <button class="remove-topic" onclick="window.topicsManager.removeTopic('${this.escapeHtml(topic)}')" title="Remove topic">×</button>
        `;
        return topicElement;
    }

    addTopic() {
        const input = document.getElementById('newTopicInput');
        if (!input) return;

        const topic = input.value.trim();
        
        if (this.settingsManager.addTopic(topic)) {
            this.updateDisplay();
            input.value = '';
            
            if (window.uiManager) {
                window.uiManager.showStatusMessage(`Added topic: "${topic}"`, 'success');
            }
        } else if (topic) {
            if (window.uiManager) {
                window.uiManager.showStatusMessage('Topic already exists or is invalid', 'error');
            }
        }
    }

    removeTopic(topic) {
        this.settingsManager.removeTopic(topic);
        this.updateDisplay();
        
        if (window.uiManager) {
            window.uiManager.showStatusMessage(`Removed topic: "${topic}"`, 'info');
        }
    }

    getActiveTopics() {
        return this.settingsManager.getTopics();
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

// Make available globally
window.TopicsManager = TopicsManager;