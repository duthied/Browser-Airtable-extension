# Job Lead to Airtable Chrome Extension

A Chrome browser extension that intelligently extracts job posting data from any website and sends it to Airtable with one click. Perfect for job seekers, recruiters, and anyone tracking job opportunities.

## Features

- **Auto-Save Drafts**: Form data automatically saves as you type, never lose your work
- **Full-Tab Form Option**: Open form in a dedicated tab that stays open while you browse
- **Side Panel Interface**: Persistent sidebar that stays open while you work (Chrome 114+)
- **Universal Browser Support**: Automatic fallback to popup in Brave and older Chrome versions
- **Smart Detection**: Multi-layer detection algorithm that works on any job site
- **One-Click Save**: Extract and save job data to Airtable instantly
- **Confidence Indicators**: Visual feedback on detection accuracy
- **Universal Compatibility**: Works on LinkedIn, Indeed, Glassdoor, company career pages, and more
- **Secure**: API credentials stored securely via Chrome's encrypted storage

## Detected Fields

- Company Name
- Job Title
- Location
- Job Description (optional)

## Installation

### From Source (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/Browser-Airtable-extension.git
   cd Browser-Airtable-extension
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select the project directory

5. The extension icon should appear in your toolbar

### From Chrome Web Store

Coming soon!

## Setup

### 1. Create Airtable Base

1. Go to [Airtable](https://airtable.com) and create a new base
2. Create a table with these exact field names (case-sensitive):
   - **JobID** (Single line text) - Auto-generated UUID for unique record identification
   - **Company** (Single line text) - Required
   - **Title** (Single line text) - Required
   - **Location** (Single line text) - Required
   - **Status** (Single line text) - Auto-set to "New"
   - **Last Updated** (Single line text) - Auto-filled with timestamp (YYYY-MM-DD HH:MM:SS)
   - **Score** (Number) - Auto-set to 0
   - **Source** (Single line text) - Auto-set to "Browser"
   - **Link** (URL) - Auto-filled with job posting URL
   - **Summary** (Long text) - Optional, for job descriptions

### 2. Get Airtable Credentials

You need three pieces of information:

#### API Key (Personal Access Token)
1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click "Create new token"
3. Give it a name (e.g., "Job Lead Extension")
4. Add these scopes:
   - `data.records:read`
   - `data.records:write`
5. Add access to your base
6. Click "Create token" and copy it

#### Base ID
1. Open your Airtable base
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. The Base ID is the part that starts with `app` (17 characters total)

#### Table Name
1. This is the name of your table (e.g., "Job Leads")
2. Must match exactly (case-sensitive)

### 3. Configure Extension

1. Click the extension icon in your toolbar
2. Click "Settings" (or right-click icon → "Options")
3. Enter your:
   - Airtable API Key
   - Base ID
   - Table Name
4. Click "Test Connection" to verify
5. Click "Save Settings"

## Usage

### Quick Start
1. Navigate to any job posting (LinkedIn, Indeed, company career pages, etc.)
2. Click the extension icon in your toolbar
3. **Chrome 114+**: Side panel opens on the right
   **Brave/Older Chrome**: Traditional popup opens
4. Review the detected job data (auto-saved as you edit)
5. Click "Send to Airtable"

### Auto-Save Feature
- Form data **automatically saves** every 500ms as you type
- Close the popup/panel at any time - your work is saved
- Reopen on the same job → get prompted to restore your draft
- Drafts are scoped to each job posting URL
- Cleared automatically after successful submission

### Full-Tab Form Option
- Click **"Open in Full Tab"** button in popup/side panel
- Opens a dedicated tab with the form
- Tab stays open while you browse other pages
- Perfect for copying long job descriptions
- Shares the same auto-save system

### Detection Confidence
- Green dot = High confidence (70%+)
- Yellow dot = Medium confidence (40-69%)
- Red dot = Low confidence (<40%)

## How It Works

The extension uses a sophisticated 4-layer detection system:

### Layer 1: Structured Data (95% confidence)
- Parses JSON-LD schema with `@type: "JobPosting"`
- Extracts OpenGraph meta tags
- Most accurate when available

### Layer 2: Semantic HTML (75-80% confidence)
- Recognizes patterns on popular sites (LinkedIn, Indeed, Glassdoor)
- Looks for common CSS classes and ARIA labels
- Checks semantic HTML attributes

### Layer 3: Text Analysis (60% confidence)
- Pattern matching for company names ("at Company", "Join Company")
- Job title keyword detection (Engineer, Manager, etc.)
- Location pattern matching (City, State format)
- Visual prominence heuristics

### Layer 4: Fallback (35-40% confidence)
- Parses page title
- Extracts company from domain name
- Uses first H1 heading

The extension always uses the highest-confidence detection for each field.

## Project Structure

```
Browser-Airtable-extension/
├── manifest.json              # Extension configuration
├── src/
│   ├── popup/                # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── content/              # Content scripts
│   │   ├── content.js        # Message handling
│   │   └── detector.js       # Smart detection engine
│   ├── background/
│   │   └── service-worker.js # Airtable API integration
│   ├── options/              # Settings page
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   └── utils/                # Shared utilities
│       ├── storage.js        # Chrome storage wrapper
│       └── airtable.js       # Airtable API client
└── assets/
    └── icons/                # Extension icons
```

## Testing Your Setup

Before using the extension, you can test your Airtable connection using the included test file.

### Using the Test File

1. **Open the test file** in Chrome:
   - **Option A:** Drag `test-airtable.html` from the project folder into Chrome
   - **Option B:** Open Chrome and press `Cmd + O`, then select `test-airtable.html`
   - **Option C:** Navigate to: `file:///path/to/Browser-Airtable-extension/test-airtable.html`

2. **Enter your credentials:**
   - API Key (Personal Access Token)
   - Base ID (from your Airtable URL)
   - Table Name

3. **Test in order:**
   - Click **"1️⃣ Test Connection"** - Verifies you can read from the table
   - Click **"3️⃣ Create Without Summary"** - Tests required fields only (safest)
   - Click **"2️⃣ Create Test Record"** - Tests all fields including Summary

### What You'll See

**✅ Success:**
```
Record Created Successfully!
Record ID: recXXXXXXXXXXXXX
```

**❌ Error Example:**
```
Failed to Create Record (422)
{
  "error": {
    "type": "UNKNOWN_FIELD_NAME",
    "message": "Unknown field name: 'Summary'"
  }
}
```

If you see "Unknown field name", add that field to your Airtable table!

### Benefits of Testing First

- Verify field names are correct (case-sensitive!)
- Test your API token permissions
- See exact error messages from Airtable
- No need to reload the extension to test changes

## Troubleshooting

### Extension shows "Please configure your Airtable settings"
- Go to extension settings and enter your Airtable credentials
- Click "Test Connection" to verify they work

### "Connection failed" when testing
- Check your API key is correct and has proper scopes
- Verify Base ID starts with "app" and is 17 characters
- Ensure table name matches exactly (case-sensitive)

### No data detected / Low confidence
- Try refreshing the page
- Make sure you're on an actual job posting page
- Some sites may have unusual structures
- You can always enter data manually

### "Invalid field names" error
- Your Airtable table must have these exact fields:
  - `Company` (not "company" or "Company Name")
  - `Title` (not "Job Title" or "title")
  - `Location` (not "location" or "Job Location")
  - `Status`, `Last Updated`, `Score`, `Source`, `Link`, `Summary`
- Field names are case-sensitive!

### Extension not working after page load
- The extension runs when the page is idle
- For SPAs (React, Vue sites), try waiting a moment
- If still not working, refresh and try again

## Browser Compatibility

### Supported Browsers
- **Google Chrome 114+**: Full side panel support
- **Google Chrome (older versions)**: Popup fallback
- **Brave Browser**: Popup fallback
- **Microsoft Edge**: Should work with side panel (Chromium-based)
- **Other Chromium browsers**: Popup fallback

The extension automatically detects browser capabilities and uses the best interface available.

## Privacy & Security

- All data stays between your browser and Airtable
- API keys are stored in Chrome's encrypted sync storage
- No data is sent to any third-party servers
- Open source - inspect the code yourself

## Development

### Prerequisites
- Chrome browser
- Basic knowledge of JavaScript, HTML, CSS

### Local Development
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Test your changes

### Building
No build step required - this is vanilla JavaScript!

To package for distribution:
```bash
zip -r extension.zip . -x "*.git*" "*.DS_Store" "node_modules/*"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Ideas for Contributions
- Support for additional fields (salary, description, date posted)
- Custom field mapping
- Batch processing (multiple job listings)
- Firefox/Edge support
- Improved detection algorithms
- Additional job site patterns

## License


## Changelog

### v1.3.2 (2024-12-22)
- **JobID Field**: Added unique JobID field to all Airtable submissions
  - Auto-generated UUID (RFC 4122 v4) for each record
  - Enables unique identification and tracking of job leads
  - 36-character format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
  - Requires "JobID" (Short text) field in Airtable table

### v1.3.1 (2024-12-22)
- **Draft Management in Settings**: Added comprehensive draft management section to options page
  - View all saved drafts with job details (company, title, location, description)
  - See draft count and statistics
  - Individual delete buttons for each draft
  - "Clear All Drafts" button with confirmation dialog
  - "Cleanup Old Drafts (30+ days)" button to remove stale drafts
  - Clickable URLs to navigate back to job postings
  - Relative timestamps (e.g., "5 minutes ago")
  - Scrollable list for handling many drafts
  - Empty state when no drafts exist
- Improved draft visibility and management workflow

### v1.3.0 (2024-12-22)
- **Auto-Save Drafts**: Form data now automatically saves as you type
  - Drafts persist across popup closes and browser restarts
  - Scoped to job posting URL - separate draft for each job
  - Auto-save every 500ms after typing stops
  - "Restore draft?" prompt when reopening same job
  - Drafts cleared automatically after successful submission
  - Visual "Draft saved" indicator
- **Full-Tab Form Option**: New dedicated form page
  - Click "Open in Full Tab" to open form in a new browser tab
  - Tab stays open while browsing other pages
  - Perfect for copying long job descriptions
  - Shares auto-save system with popup/side panel
  - Larger, more comfortable layout for editing
- Added draft storage utility (`chrome.storage.local`)
- Improved user experience for copy/paste workflows

### v1.2.2 (2024-12-22)
- **Universal Browser Support**: Added automatic fallback for browsers without side panel support
  - Chrome 114+: Opens in side panel automatically
  - Brave/Older Chrome: Falls back to traditional popup
  - Seamless detection and upgrade when side panel is available
  - No user configuration needed
- Added browser compatibility documentation

### v1.2.1 (2024-12-22)
- **Side Panel Interface**: Extension now opens in a persistent side panel instead of popup
  - Panel stays open while you interact with the page
  - Perfect for copying and pasting content without losing your work
  - Resizable and closable like any browser sidebar
  - Click extension icon to toggle panel open/closed
- Updated CSS to support flexible side panel width

### v1.2.0 (2024-12-22)
- Added automatic tracking fields to all records:
  - **Last Updated**: Current timestamp in format YYYY-MM-DD HH:MM:SS
  - **Score**: Initialized to 0 for tracking job lead priority
  - **Source**: Set to "Browser" to indicate record origin
  - **Link**: Job posting URL automatically captured from current tab
- Updated field requirements documentation across all files
- Updated test-airtable.html to include new auto-filled fields

### v1.1.0 (2024-12-22)
- Added Job Description field (stored in Airtable "Summary" field)
- Enhanced detection to extract job descriptions from structured data and semantic HTML
- Job description field is optional and uses textarea for long text
- Added automatic Status field - all records are created with Status="New"
- Updated Airtable field requirements documentation
- Field names: Company, Title, Location, Status, Summary (all capitalized for consistency)

### v1.0.1 (2024-12-22)
- Fixed CORS issue with "Test Connection" feature in options page
- Validation requests now route through service worker for proper permissions

### v1.0.0 (2024-12-22)
- Initial release
- Smart 4-layer detection system
- Support for LinkedIn, Indeed, Glassdoor, and generic sites
- Confidence indicators
- Airtable integration with retry logic
- Comprehensive error handling

## Support

If you encounter issues or have questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Open an issue on GitHub
3. Provide details: browser version, site URL, error messages

## Author

Created by Devlon Duthie

## Acknowledgments

- Built with Chrome Extension Manifest V3
- Uses Airtable REST API
- Inspired by the need to streamline job searching