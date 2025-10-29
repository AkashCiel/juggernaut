/**
 * Section Summary Configuration
 * Constants and prompts for section summary generation
 */

// OpenAI Configuration
const SECTION_SUMMARY_MODEL = 'gpt-4o';

// System prompt for section summary generation
const SYSTEM_PROMPT = `You are responsible for writing highly informative, insightful, and information dense summaries of a collection of news articles.
Your summary will be used to identify if those articles map to the implicit or explicit interests of a reader.

Your summary should:
1. Start with a statement of the main theme or topic of the section.
2. Identify all major themes or topic clusters within the section
3. Describe the typical subject matter and focus areas
4. Note any geographic or temporal patterns (e.g., US-focused, breaking news vs analysis)
5. Highlight the breadth vs depth of coverage (broad topics vs specialized niches)

Output format: 500 words

DO NOT:
- List individual articles or specific stories
- Include metadata or article counts
- Add disclaimers or caveats`;

// OpenAI Configuration
const OPENAI_TEMPERATURE = 0.7;

// Analysis Configuration
const ARTICLES_TO_ANALYZE = 100; // Top N articles per section

// GitHub Configuration
const GITHUB_REPO_OWNER = 'AkashCiel';
const GITHUB_REPO_NAME = 'juggernaut-reports';
const GITHUB_BRANCH = 'main';

// Path Configuration (in juggernaut-reports repo)
const SUMMARY_FILE_PATH = 'backend/data/functional_section_summaries.json';
const LIBRARY_PATH_PREFIX = 'backend/data/article-library/';

// Rate Limiting
const DELAY_BETWEEN_SECTIONS_MS = 60000; // 1 minute delay

module.exports = {
    SECTION_SUMMARY_MODEL,
    SYSTEM_PROMPT,
    OPENAI_TEMPERATURE,
    ARTICLES_TO_ANALYZE,
    GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME,
    GITHUB_BRANCH,
    SUMMARY_FILE_PATH,
    LIBRARY_PATH_PREFIX,
    DELAY_BETWEEN_SECTIONS_MS
};

