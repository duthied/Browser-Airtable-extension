// Options page logic for managing Airtable credentials

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settingsForm');
  const testButton = document.getElementById('testButton');
  const showApiKeyCheckbox = document.getElementById('showApiKey');
  const apiKeyInput = document.getElementById('apiKey');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  await loadSettings();

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
  });

  // Test connection button
  testButton.addEventListener('click', async () => {
    await testConnection();
  });

  // Show/hide API key
  showApiKeyCheckbox.addEventListener('change', (e) => {
    apiKeyInput.type = e.target.checked ? 'text' : 'password';
  });

  // Draft management
  await loadDrafts();

  document.getElementById('refreshDraftsButton').addEventListener('click', async () => {
    await loadDrafts();
  });

  document.getElementById('clearAllDraftsButton').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all saved drafts? This cannot be undone.')) {
      await clearAllDrafts();
    }
  });

  document.getElementById('cleanupOldDraftsButton').addEventListener('click', async () => {
    await cleanupOldDrafts();
  });
});

async function loadSettings() {
  try {
    const settings = await StorageHelper.getSettings();

    if (settings.apiKey) {
      document.getElementById('apiKey').value = settings.apiKey;
    }
    if (settings.baseId) {
      document.getElementById('baseId').value = settings.baseId;
    }
    if (settings.tableName) {
      document.getElementById('tableName').value = settings.tableName;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

async function saveSettings() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const baseId = document.getElementById('baseId').value.trim();
  const tableName = document.getElementById('tableName').value.trim();

  // Validate inputs
  if (!apiKey || !baseId || !tableName) {
    showStatus('Please fill in all fields', 'error');
    return;
  }

  // Validate Base ID format
  if (!baseId.match(/^app[a-zA-Z0-9]{14}$/)) {
    showStatus('Invalid Base ID format. Should start with "app" followed by 14 characters', 'error');
    return;
  }

  try {
    await StorageHelper.saveSettings({ apiKey, baseId, tableName });
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings: ' + error.message, 'error');
  }
}

async function testConnection() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const baseId = document.getElementById('baseId').value.trim();
  const tableName = document.getElementById('tableName').value.trim();

  // Validate inputs
  if (!apiKey || !baseId || !tableName) {
    showStatus('Please fill in all fields before testing', 'error');
    return;
  }

  showStatus('Testing connection...', 'info');
  const testButton = document.getElementById('testButton');
  testButton.disabled = true;

  try {
    // Send to service worker to test (avoids CORS issues)
    const result = await chrome.runtime.sendMessage({
      type: 'TEST_CONNECTION',
      apiKey: apiKey,
      baseId: baseId,
      tableName: tableName
    });

    if (result.success) {
      showStatus('Connection successful! Your Airtable is configured correctly.', 'success');
    } else {
      showStatus('Connection failed: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    showStatus('Connection test failed: ' + error.message, 'error');
  } finally {
    testButton.disabled = false;
  }
}

function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 5000);
  }
}

// Draft Management Functions

async function loadDrafts() {
  const draftListDiv = document.getElementById('draftList');
  const draftCountSpan = document.getElementById('draftCount');

  try {
    // Get all storage items
    const all = await chrome.storage.local.get(null);
    const drafts = [];

    // Filter and collect draft items
    Object.entries(all).forEach(([key, value]) => {
      if (key.startsWith('draft_') && value.url && value.formData) {
        drafts.push({ key, ...value });
      }
    });

    // Sort by timestamp (newest first)
    drafts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Update count
    if (drafts.length === 0) {
      draftCountSpan.textContent = 'No saved drafts';
      draftListDiv.innerHTML = '<div class="empty-state">No drafts saved yet. Drafts will appear here when you start filling out job forms.</div>';
      return;
    }

    draftCountSpan.textContent = `${drafts.length} draft${drafts.length === 1 ? '' : 's'} saved`;

    // Build draft list HTML
    draftListDiv.innerHTML = drafts.map(draft => {
      const date = new Date(draft.timestamp);
      const timeAgo = getTimeAgo(date);
      const { company, jobTitle, location, description } = draft.formData;

      return `
        <div class="draft-item" data-key="${draft.key}">
          <div class="draft-item-header">
            <a href="${draft.url}" target="_blank" class="draft-url" title="${draft.url}">
              ${truncateUrl(draft.url, 60)}
            </a>
            <button class="draft-delete" data-key="${draft.key}">Delete</button>
          </div>
          <div class="draft-meta">Saved ${timeAgo}</div>
          <div class="draft-data">
            ${company ? `<div><strong>Company:</strong> ${escapeHtml(company)}</div>` : ''}
            ${jobTitle ? `<div><strong>Job Title:</strong> ${escapeHtml(jobTitle)}</div>` : ''}
            ${location ? `<div><strong>Location:</strong> ${escapeHtml(location)}</div>` : ''}
            ${description ? `<div><strong>Description:</strong> ${escapeHtml(truncateText(description, 100))}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Add delete button handlers
    const deleteButtons = draftListDiv.querySelectorAll('.draft-delete');
    deleteButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const key = button.getAttribute('data-key');
        await deleteDraft(key);
      });
    });

  } catch (error) {
    console.error('Error loading drafts:', error);
    draftCountSpan.textContent = 'Error loading drafts';
    draftListDiv.innerHTML = '<div class="empty-state">Error loading drafts. Please try refreshing.</div>';
  }
}

async function deleteDraft(key) {
  try {
    await chrome.storage.local.remove(key);
    await loadDrafts(); // Reload list
    showStatus('Draft deleted', 'success');
  } catch (error) {
    console.error('Error deleting draft:', error);
    showStatus('Error deleting draft', 'error');
  }
}

async function clearAllDrafts() {
  try {
    const count = await DraftStorage.clearAllDrafts();
    await loadDrafts(); // Reload list
    showStatus('All drafts cleared successfully', 'success');
  } catch (error) {
    console.error('Error clearing drafts:', error);
    showStatus('Error clearing drafts', 'error');
  }
}

async function cleanupOldDrafts() {
  try {
    const count = await DraftStorage.cleanupOldDrafts();
    await loadDrafts(); // Reload list
    if (count > 0) {
      showStatus(`Cleaned up ${count} old draft${count === 1 ? '' : 's'}`, 'success');
    } else {
      showStatus('No old drafts to clean up', 'info');
    }
  } catch (error) {
    console.error('Error cleaning up drafts:', error);
    showStatus('Error cleaning up drafts', 'error');
  }
}

// Helper functions

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
}

function truncateUrl(url, maxLength) {
  if (url.length <= maxLength) return url;

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;

    if (domain.length + path.length <= maxLength) {
      return domain + path;
    }

    return domain + path.substring(0, maxLength - domain.length - 3) + '...';
  } catch {
    return url.substring(0, maxLength) + '...';
  }
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
