# Centralized Prompts Configuration

This directory contains centralized configuration files for the AI News Agent application.

## 📝 Prompts Configuration (`prompts.js`)

The `prompts.js` file centralizes all OpenAI prompts used throughout the application, making them easier to maintain, modify, and version control.

### **Structure**

#### **1. Research Summary Prompts (`RESEARCH_SUMMARY_PROMPTS`)**
- **`generalSummary(papers)`**: Generates high-level summaries of multiple research papers
- **`topicSummary(papers, topic)`**: Generates focused summaries for specific research topics

#### **2. System Role Prompts (`SYSTEM_ROLES`)**
- **`researchAssistant`**: Defines the AI's role for paper summary generation
- **`directoryNaming`**: Defines the AI's role for creating directory names

#### **3. Utility Prompts (`UTILITY_PROMPTS`)**
- **`topicDirectoryName(topics)`**: Creates concise directory names for organizing reports by topic

#### **4. OpenAI Configuration (`OPENAI_CONFIG`)**
- **`defaultModel`**: Default model to use (currently 'gpt-4o')
- **`maxTokens`**: Token limits for different prompt types
- **`temperature`**: Temperature settings for different prompt types
- **`timeouts`**: Timeout settings for different API calls

### **Usage Examples**

#### **Using Research Summary Prompts**
```javascript
const { RESEARCH_SUMMARY_PROMPTS } = require('../config/prompts');

// Generate a general summary
const generalPrompt = RESEARCH_SUMMARY_PROMPTS.generalSummary(papers);

// Generate a topic-specific summary
const topicPrompt = RESEARCH_SUMMARY_PROMPTS.topicSummary(papers, 'machine learning');
```

#### **Using System Roles**
```javascript
const { SYSTEM_ROLES } = require('../config/prompts');

// Use in OpenAI API call
const systemMessage = SYSTEM_ROLES.researchAssistant;
```

#### **Using Utility Prompts**
```javascript
const { UTILITY_PROMPTS } = require('../config/prompts');

// Generate directory name
const directoryPrompt = UTILITY_PROMPTS.topicDirectoryName(['AI', 'machine learning']);
```

#### **Using OpenAI Configuration**
```javascript
const { OPENAI_CONFIG } = require('../config/prompts');

// Use default settings
const model = OPENAI_CONFIG.defaultModel;
const maxTokens = OPENAI_CONFIG.maxTokens.summary;
const temperature = OPENAI_CONFIG.temperature.summary;
const timeout = OPENAI_CONFIG.timeouts.summary;
```

### **Modifying Prompts**

To modify any prompt:

1. **Edit the prompt function** in `prompts.js`
2. **Test the changes** to ensure they work as expected
3. **Update documentation** if the prompt's purpose or parameters change
4. **Commit the changes** with a descriptive message

### **Adding New Prompts**

To add a new prompt:

1. **Choose the appropriate category** (Research, System, Utility, or Config)
2. **Add the prompt function** with proper JSDoc documentation
3. **Export it** in the module.exports section
4. **Update this documentation** to include the new prompt

### **Best Practices**

1. **Keep prompts focused**: Each prompt should have a single, clear purpose
2. **Use consistent formatting**: Maintain consistent structure and tone across similar prompts
3. **Document parameters**: Always document what parameters the prompt expects
4. **Test changes**: Verify that prompt modifications don't break existing functionality
5. **Version control**: Commit prompt changes with descriptive messages

### **File Locations**

- **Prompts file**: `backend/config/prompts.js`
- **Services using prompts**: 
  - `backend/services/summaryService.js`
  - `backend/utils/userUtils.js`
- **Documentation**: `backend/config/README.md`

### **Migration Notes**

This centralized system replaces the previous approach where prompts were scattered across multiple service files. All existing functionality remains identical - this is purely a refactoring for better maintainability.

### **Support**

For questions about the prompts system or suggestions for improvements, please refer to the main project documentation or create an issue in the project repository.
