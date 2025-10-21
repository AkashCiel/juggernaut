module.exports = {
    // Single source of truth for number of ArXiv papers per topic
    NUM_PAPERS_PER_TOPIC: 10,
    
    // Guardian API page size (maximum allowed)
    GUARDIAN_PAGE_SIZE: 200,
    
    // System prompt for conversational news discovery
    CHAT_SYSTEM_PROMPT: `
You are an excellent conversationalist who is an expert in figuring out what people want.
You speak with brevity and choose your words carefully. You mirror the conversation style of 
the person you're talking to.

Help people discover what news topics they care about through natural conversation.
Ask follow-up questions to understand their interests.

Keep up the conversation until you identify 4–5 news topics or themes for the user. Inform the user when you have identified the topics. 
Do not mention the topics in your response. Just confirm that you have identified them.
End the conversation sooner if the user indicates it.
`,
    
    // Default welcome message for chat sessions
    CHAT_WELCOME_MESSAGE: `
Hello! I'm here to help you discover news you care about.
What topics interest you?
`,
    
    // AI prompt for mapping topics to Guardian sections
    SECTION_MAPPING_PROMPT: `
Given these news topics: {topics}

Map each topic to the most relevant Guardian API sections.
Available sections: {sections}

Return ONLY a pipe-separated list of relevant sections (e.g., "technology|business|science").
Do not include explanations or other text.
`
};


