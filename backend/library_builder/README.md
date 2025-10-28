# Article Library Builder

Automated system for building a comprehensive library of news article summaries using Guardian API and OpenAI GPT-5.

## Overview

The Library Builder fetches articles from The Guardian, generates AI summaries via OpenAI Batch API, and uploads the resulting library to the juggernaut-reports GitHub repository.

## Architecture

```
library_builder/
├── services/           # Core business logic
│   ├── guardianFetcher.js      # Fetch articles from Guardian
│   ├── batchFormatter.js       # Create OpenAI batch JSONL files
│   ├── batchSubmitter.js       # Submit batches to OpenAI
│   ├── batchMonitor.js         # Monitor batch status
│   ├── resultsProcessor.js     # Process batch results
│   ├── libraryBuilder.js       # Build final library JSON
│   └── githubUploader.js       # Upload to GitHub
├── utils/              # Helper utilities
│   ├── logger.js               # Logging system
│   ├── stateManager.js         # Batch state management
│   └── validator.js            # Data validation
├── config/             # Configuration
│   └── prompts.js              # OpenAI prompts
├── commands/           # CLI command handlers
│   ├── fetch.js                # Fetch articles command
│   ├── submit.js               # Submit batch command
│   ├── check.js                # Check status command
│   └── complete.js             # Complete & upload command
├── data/               # Working files (gitignored)
│   ├── batches/                # Generated JSONL files
│   ├── results/                # Downloaded results
│   ├── logs/                   # Detailed logs
│   └── state.json              # Current batch state
└── generate-library.js # Main CLI script
```

## Requirements

- Node.js >= 18
- Environment variables:
  - `OPENAI_API_KEY` - OpenAI API key (with GPT-5 access)
  - `GUARDIAN_API_KEY` - Guardian API key
  - `GITHUB_TOKEN` - GitHub personal access token

## Installation

```bash
cd backend/library_builder
# Dependencies already installed in parent backend/
```

## Usage

### Step 1: Fetch Articles

Fetch articles from Guardian and create batch file:

```bash
node generate-library.js fetch --section technology --days 2
```

**Output:**
- Fetches articles from Guardian
- Creates JSONL batch file in `data/batches/`
- Saves state to `data/state.json` (status: "fetched")

**Next:** Review the batch file to verify the input looks correct

### Step 2: Submit Batch

Submit the batch to OpenAI:

```bash
node generate-library.js submit
```

**Output:**
- Uploads batch file to OpenAI
- Creates batch job
- Updates state (status: "submitted")

**Next:** Wait ~24 hours for batch processing

### Step 3: Check Status

Check batch processing progress:

```bash
node generate-library.js check
```

**Output:**
- Current batch status
- Progress percentage
- Estimated completion time

**Repeat** this command periodically until status is "completed"

### Step 4: Complete

Download results and build library:

```bash
node generate-library.js complete
```

**Output:**
- Downloads batch results
- Handles failures with automatic retry (up to 3 attempts)
- Builds library JSON
- Validates completeness
- Uploads to GitHub (juggernaut-reports/backend/data/article-library/)
- Clears state

## Workflow Example

```bash
# Terminal 1: Submit batch
$ node generate-library.js submit --section technology --days 40

✅ Fetched 148 articles
✅ Batch file created: data/batches/technology-2025-10-28.jsonl
✅ File uploaded: file-abc123
✅ Batch created: batch-xyz789

Next steps:
  1. Wait ~24 hours for batch processing
  2. Run: node generate-library.js check

# Wait 24 hours...

# Terminal 2: Check status (next day)
$ node generate-library.js check

✅ Batch processing complete!

Next step:
  Run: node generate-library.js complete

# Terminal 3: Complete and upload
$ node generate-library.js complete

✅ ALL ARTICLES PROCESSED SUCCESSFULLY
✅ Library built (148 articles)
✅ Uploaded to GitHub

🎉 COMPLETE!
GitHub URL: https://github.com/AkashCiel/juggernaut-reports/blob/main/backend/data/article-library/technology.json
```

## Error Handling

### Automatic Retry

The `complete` command automatically retries failed articles up to 3 times:
- Creates new batch for failed articles only
- Waits for completion
- Merges with successful results
- Repeats until all articles succeed or max retries reached

### Manual Recovery

If errors occur:

1. **Check logs:**
   ```bash
   cat data/logs/library-2025-10-28T*.log
   ```

2. **Check state:**
   ```bash
   cat data/state.json
   ```

3. **Clear state (if needed):**
   ```bash
   rm data/state.json
   ```

4. **Resubmit:**
   ```bash
   node generate-library.js submit --section technology --days 40
   ```

## Output Format

Library JSON structure:

```json
{
  "metadata": {
    "section": "technology",
    "generated_at": "2025-10-28T12:00:00Z",
    "date_range": {
      "from": "2025-09-18",
      "to": "2025-10-28"
    },
    "article_count": 148,
    "batch_info": {
      "initial_batch_id": "batch_xyz789",
      "retry_batches": [],
      "total_tokens": 290000,
      "processing_time_hours": 24.5
    }
  },
  "articles": [
    {
      "id": "technology/2025/oct/27/article-slug",
      "title": "Article Title",
      "webUrl": "https://www.theguardian.com/...",
      "apiUrl": "https://content.guardianapis.com/...",
      "section": "technology",
      "publishedDate": "2025-10-27T15:30:00Z",
      "summary": "Information-dense summary (~400 tokens)...",
      "summaryTokens": 412,
      "generatedAt": "2025-10-28T10:15:30Z"
    }
  ]
}
```

## Cost Estimation

### Technology Section (148 articles, 40 days)
- Input tokens: ~230K
- Output tokens: ~60K
- **Total cost (Batch API 50% off):** ~$1.50

### Full Scale (8000 articles, 40 days)
- Input tokens: ~12.4M
- Output tokens: ~3.2M
- **Total cost (Batch API 50% off):** ~$40

## Logs

Detailed logs saved to: `data/logs/library-{timestamp}.log`

**Log levels:**
- File: DEBUG (everything)
- Console: INFO (summary only)

## Development

### Testing

Test with small batch:

```bash
# Test with 10 days (fewer articles)
node generate-library.js submit --section technology --days 10
```

### Adding New Sections

To process additional sections:

```bash
node generate-library.js submit --section science --days 40
node generate-library.js submit --section business --days 40
# etc.
```

Each section gets its own state and output file.

## Troubleshooting

### "OPENAI_API_KEY not set"
- Ensure `.env` file exists in `backend/` directory
- Check `OPENAI_API_KEY` is defined

### "No batch found"
- Run `submit` command first
- Check `data/state.json` exists

### "Batch not complete yet"
- Wait longer, then run `check` again
- Batch processing takes ~24 hours

### "Library incomplete"
- Some articles failed after 3 retries
- Check logs for specific errors
- May need to investigate failed article IDs

## Architecture Decisions

**Why separate commands?**
- Batch processing takes 24 hours
- Allows monitoring without keeping process running
- State persisted to disk between commands

**Why automatic retry?**
- Ensures 100% completion rate
- Handles transient API errors
- Exponential backoff for rate limits

**Why JSONL format?**
- Required by OpenAI Batch API
- One article per line
- Parallel processing by OpenAI

## Future Enhancements

- [ ] Support for multiple sections in single run
- [ ] Incremental updates (only new articles)
- [ ] Cost tracking dashboard
- [ ] Email notifications when batch completes
- [ ] Library querying/search tool

