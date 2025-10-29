# Section Summary Generator

Generates high-quality summaries for Guardian news sections. These summaries are used to map user interests to relevant sections for personalized news curation.

---

## 📁 Directory Structure

```
backend/section_summaries/
├── config/
│   └── constants.js                     # Configuration and prompts
├── services/
│   ├── sectionSummaryGenerator.js       # OpenAI summary generation
│   └── sectionSummaryStorage.js         # GitHub operations
├── commands/
│   └── generateSectionSummaries.js      # Main workflow orchestration
├── generate-section-summaries.js        # CLI entry point
└── README.md                            # This file
```

---

## 🚀 Usage

### Prerequisites

Ensure these environment variables are set in `backend/.env`:

```bash
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_api_key
DISCORD_WEBHOOK_URL=your_discord_webhook  # Optional
```

### Commands

**Generate all sections (auto-detect from GitHub):**
```bash
node backend/section_summaries/generate-section-summaries.js
```

**Generate single section:**
```bash
node backend/section_summaries/generate-section-summaries.js technology
```

**Generate multiple specific sections:**
```bash
node backend/section_summaries/generate-section-summaries.js technology science business
```

**Get help:**
```bash
node backend/section_summaries/generate-section-summaries.js --help
```

---

## 📊 What It Does

### Workflow

1. **Discover Sections** - Auto-detects available section libraries from `juggernaut-reports/backend/data/article-library/`
2. **Generate Summaries** - For each section:
   - Fetches the section library from GitHub
   - Analyzes top 100 articles
   - Generates 500-word summary using GPT-4o
   - Waits 60 seconds before processing next section (rate limit protection)
3. **Merge Results** - Merges new summaries with existing ones (section-level replace)
4. **Upload to GitHub** - Uploads to `juggernaut-reports/backend/data/functional_section_summaries.json`
5. **Notify via Discord** - Sends success/failure notification (if webhook configured)

### Processing Time

- **Single section**: ~20 seconds
- **All sections (10)**: ~11 minutes (includes 9 minutes of delays)
- **Multiple sections**: ~(20s × N) + (60s × (N-1))

### Rate Limiting

- 1-minute delay between sections to avoid OpenAI rate limits
- No delay after the last section

---

## 📄 Output Format

The generated file is uploaded to GitHub at:
```
juggernaut-reports/backend/data/functional_section_summaries.json
```

### JSON Structure

```json
{
  "metadata": {
    "generated_at": "2025-10-29T12:00:00.000Z",
    "total_sections": 10,
    "model": "gpt-4o",
    "articles_per_section": 100,
    "repository": "AkashCiel/juggernaut-reports",
    "last_updated": "2025-10-29T12:00:00.000Z"
  },
  "sections": {
    "technology": {
      "summary": "The technology section covers...",
      "article_count": 143,
      "date_range": {
        "from": "2024-09-20",
        "to": "2024-10-28"
      },
      "tokens_used": 15234,
      "generated_at": "2025-10-29T12:05:00.000Z"
    },
    "science": {
      "summary": "...",
      "article_count": 74,
      "date_range": {
        "from": "...",
        "to": "..."
      },
      "tokens_used": 12890,
      "generated_at": "2025-10-29T12:07:00.000Z"
    }
  }
}
```

---

## 🔧 Configuration

### File: `config/constants.js`

Key configuration values:

| Constant | Value | Description |
|----------|-------|-------------|
| `SECTION_SUMMARY_MODEL` | `gpt-4o` | OpenAI model for summary generation |
| `OPENAI_TEMPERATURE` | `0.7` | Temperature for OpenAI API |
| `ARTICLES_TO_ANALYZE` | `100` | Top N articles per section to analyze |
| `DELAY_BETWEEN_SECTIONS_MS` | `60000` | 1-minute delay between sections |
| `SUMMARY_FILE_PATH` | `backend/data/functional_section_summaries.json` | Output path in GitHub |

### System Prompt

The system prompt is optimized for AI-based section mapping. It instructs GPT-4o to:
1. Start with main theme/topic statement
2. Identify all major themes and topic clusters
3. Describe typical subject matter and focus areas
4. Note geographic or temporal patterns
5. Highlight breadth vs depth of coverage
6. Output 500 words

---

## 🧩 Components

### 1. SectionSummaryGenerator

**File:** `services/sectionSummaryGenerator.js`

Handles:
- Fetching section libraries from GitHub
- Calling OpenAI API to generate summaries
- Managing delays between sections

**Key Methods:**
- `fetchSectionLibrary(section)` - Downloads library from GitHub
- `generateSummary(section)` - Generates summary for single section
- `generateSummaries(sections)` - Generates summaries for multiple sections with delays
- `callOpenAI(articleTexts)` - Calls OpenAI API

### 2. SectionSummaryStorage

**File:** `services/sectionSummaryStorage.js`

Handles:
- Auto-detecting available sections
- Downloading existing summaries from GitHub
- Merging new summaries with existing
- Uploading to GitHub

**Key Methods:**
- `discoverSections()` - Lists all section libraries in GitHub
- `downloadExistingSummaries()` - Downloads existing summary file
- `mergeSummaries(existing, newSummaries)` - Merges at section level
- `uploadSummaries(summaries, commitMessage)` - Uploads to GitHub

### 3. generateSectionSummaries Command

**File:** `commands/generateSectionSummaries.js`

Orchestrates the complete workflow:
1. Determine sections to process (auto-detect or user-specified)
2. Generate summaries for all sections
3. Download existing summaries
4. Merge new with existing
5. Upload to GitHub
6. Send Discord notification

---

## 🔔 Discord Notifications

If `DISCORD_WEBHOOK_URL` is set, notifications are sent:

**Success:**
```
✅ Section summaries generated
sections_processed: 10/10
total_tokens: 142,567
duration: 11.5m
github_file: https://github.com/...
```

**Partial Success:**
```
⚠️ Section summaries partially completed
successful: 8/10
failed: science, business
total_tokens: 120,345
github_file: https://github.com/...
```

**Failure:**
```
❌ Section summary generation failed
error: OpenAI API error: ...
sections_attempted: 10
```

---

## 🚨 Error Handling

- **Missing library file**: Logs warning, skips section, continues
- **OpenAI rate limit**: Reports failure for that section, continues
- **GitHub download fails**: Treats as "no existing file"
- **GitHub upload fails**: Throws error, stops workflow (critical)
- **Partial failures**: Completes workflow, reports failed sections

---

## 💡 Usage Tips

### Testing

Start with a single section to test:
```bash
node backend/section_summaries/generate-section-summaries.js technology
```

### Updating Specific Sections

If only certain sections need updates:
```bash
node backend/section_summaries/generate-section-summaries.js technology science
```

### Cost Management

- Each section uses ~15K tokens (~$0.15 with GPT-4o)
- Total for 10 sections: ~150K tokens (~$1.50)
- Run selectively to minimize costs

### Scheduling

For weekly automated updates, create a script:
```bash
#!/bin/bash
# weekly-section-summaries.sh
cd /path/to/juggernaut/backend/section_summaries
node generate-section-summaries.js
```

---

## 📝 Console Output Example

```
================================================================================
SECTION SUMMARY GENERATION
================================================================================

Mode: Auto-detect all sections

🔍 Discovering section libraries from GitHub...
   ✅ Found 10 sections: business, commentisfree, environment, ...

📊 Generating summaries for 10 sections

[1/10] business
📚 Processing section: business
   Fetching library from GitHub...
   ✅ Loaded: 298 articles
   Analyzing top 100 articles
   Generating summary with gpt-4o...
   ✅ Generated (15.2s, 15234 tokens)

⏳ Waiting 60s before next section...

[2/10] commentisfree
...

================================================================================
GENERATION COMPLETE
================================================================================
✅ Successful: 10/10

📥 Downloading existing summaries from GitHub...
   ✅ Found existing file with 7 sections

🔀 Merging summaries...
   ✅ Merged: 10 processed, 7 updated, 3 added
   Total sections in file: 10

📤 Uploading to GitHub...
   ✅ Uploaded: backend/data/functional_section_summaries.json
   URL: https://github.com/AkashCiel/juggernaut-reports/...

================================================================================
COMPLETE
================================================================================
Sections processed: 10/10
Total tokens: 142,567
Duration: 11.5 minutes
GitHub file: https://github.com/AkashCiel/juggernaut-reports/...
================================================================================
```

---

## 🔗 Related

- Article libraries: `juggernaut-reports/backend/data/article-library/*.json`
- Output file: `juggernaut-reports/backend/data/functional_section_summaries.json`
- Library builder: `backend/library_builder/`
- Discord service: `backend/services/discordService.js`

---

## 📚 Next Steps

After generating section summaries, they will be used in:
- **Phase 1**: User registration → map user interests to relevant sections
- **Phase 2**: Daily library updates → maintain fresh section summaries
- **Phase 3**: Concurrent user handling → scale to multiple users

---

## 🤝 Contributing

To modify the summary generation:

1. **Change prompt**: Edit `config/constants.js` → `SYSTEM_PROMPT`
2. **Change model**: Edit `config/constants.js` → `SECTION_SUMMARY_MODEL`
3. **Change article count**: Edit `config/constants.js` → `ARTICLES_TO_ANALYZE`
4. **Change delay**: Edit `config/constants.js` → `DELAY_BETWEEN_SECTIONS_MS`

After making changes, test with a single section before running on all sections.

