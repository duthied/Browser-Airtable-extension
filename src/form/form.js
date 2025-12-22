// Form page logic for displaying and submitting job data (full-tab version)

// Global variables for draft management
let currentUrl = null;
let detectedData = null;
let draftSaveTimeout = null;
let targetTabId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Get URL from query parameter
  const params = new URLSearchParams(window.location.search);
  currentUrl = params.get('url');

  // If no URL provided, try to get from current active tab
  if (!currentUrl) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab ? tab.url : null;
    targetTabId = tab ? tab.id : null;
  } else {
    // Find the tab with this URL
    const tabs = await chrome.tabs.query({ url: currentUrl });
    if (tabs.length > 0) {
      targetTabId = tabs[0].id;
    }
  }

  // Check if configured
  const isConfigured = await chrome.storage.sync.get(['apiKey', 'baseId', 'tableName'])
    .then(result => !!(result.apiKey && result.baseId && result.tableName));

  if (!isConfigured) {
    showNotConfiguredState();
    return;
  }

  // Show loading and start detection
  showLoadingState();
  await detectJobData();

  // Check for draft after detection
  await checkForDraft();

  // Set up event listeners
  setupEventListeners();
  setupAutoSave();
  setupDraftHandlers();
});

/**
 * Detect job data from target page
 */
async function detectJobData() {
  try {
    // Use targetTabId if available, otherwise get active tab
    let tabId = targetTabId;

    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab ? tab.id : null;
    }

    if (!tabId) {
      throw new Error('No target tab found');
    }

    // Send message to content script to detect job data
    chrome.tabs.sendMessage(tabId, { type: 'DETECT_JOB_DATA' }, (response) => {
      if (chrome.runtime.lastError) {
        showError('Failed to detect job data. Please refresh the page and try again.');
        return;
      }

      if (!response) {
        showError('No response from page. Please refresh and try again.');
        return;
      }

      if (response.success) {
        showForm(response.data);
      } else {
        showError(response.error || 'Detection failed');
      }
    });
  } catch (error) {
    console.error('Detection error:', error);
    showError(error.message);
  }
}

/**
 * Show form with detected data
 */
function showForm(data) {
  // Store detected data globally
  detectedData = data;

  hideAllStates();
  document.getElementById('formState').classList.remove('hidden');

  // Populate fields
  document.getElementById('company').value = data.company || '';
  document.getElementById('jobTitle').value = data.jobTitle || '';
  document.getElementById('location').value = data.location || '';
  document.getElementById('description').value = data.description || '';

  // Set confidence indicators
  setConfidenceIndicator('companyConfidence', data.confidence?.company || 0);
  setConfidenceIndicator('jobTitleConfidence', data.confidence?.jobTitle || 0);
  setConfidenceIndicator('locationConfidence', data.confidence?.location || 0);
  setConfidenceIndicator('descriptionConfidence', data.confidence?.description || 0);
}

/**
 * Set confidence indicator color
 */
function setConfidenceIndicator(elementId, confidence) {
  const indicator = document.getElementById(elementId);

  if (!indicator) return;

  // Remove all confidence classes
  indicator.className = 'confidence-indicator';

  // Add appropriate class
  if (confidence >= 70) {
    indicator.classList.add('confidence-high');
    indicator.title = `High confidence (${confidence}%) - Auto-detected`;
  } else if (confidence >= 40) {
    indicator.classList.add('confidence-medium');
    indicator.title = `Medium confidence (${confidence}%) - Please review`;
  } else if (confidence > 0) {
    indicator.classList.add('confidence-low');
    indicator.title = `Low confidence (${confidence}%) - Manual entry recommended`;
  } else {
    indicator.classList.add('confidence-none');
    indicator.title = 'Not detected - Please enter manually';
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Form submission
  const form = document.getElementById('jobForm');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Clear button
  const clearButton = document.getElementById('clearButton');
  if (clearButton) {
    clearButton.addEventListener('click', async () => {
      form.reset();
      // Clear saved draft too
      if (currentUrl) {
        await DraftStorage.clearDraft(currentUrl);
      }
      hideStatus();
    });
  }

  // Settings link
  const settingsLink = document.getElementById('settingsLink');
  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  // Help link
  const helpLink = document.getElementById('helpLink');
  if (helpLink) {
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com' }); // Update with actual help URL
    });
  }

  // Open settings button (in not configured state)
  const openSettingsButton = document.getElementById('openSettingsButton');
  if (openSettingsButton) {
    openSettingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Retry button (in error state)
  const retryButton = document.getElementById('retryButton');
  if (retryButton) {
    retryButton.addEventListener('click', async () => {
      showLoadingState();
      await detectJobData();
    });
  }
}

/**
 * Setup auto-save functionality
 */
function setupAutoSave() {
  const fields = ['company', 'jobTitle', 'location', 'description'];

  fields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.addEventListener('input', () => {
        // Debounce auto-save (500ms after last keystroke)
        if (draftSaveTimeout) {
          clearTimeout(draftSaveTimeout);
        }
        draftSaveTimeout = setTimeout(async () => {
          await saveCurrentDraft();
        }, 500);
      });
    }
  });
}

/**
 * Setup draft prompt button handlers
 */
function setupDraftHandlers() {
  const restoreButton = document.getElementById('restoreDraft');
  const ignoreButton = document.getElementById('ignoreDraft');
  const closeTabLink = document.getElementById('closeTabLink');

  if (restoreButton) {
    restoreButton.addEventListener('click', async () => {
      await restoreDraft();
    });
  }

  if (ignoreButton) {
    ignoreButton.addEventListener('click', () => {
      // Hide draft prompt and continue with detected data
      document.getElementById('draftPrompt').classList.add('hidden');
    });
  }

  if (closeTabLink) {
    closeTabLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Close this tab
      window.close();
    });
  }
}

/**
 * Check for existing draft and show restore prompt if found
 */
async function checkForDraft() {
  if (!currentUrl) return;

  const draft = await DraftStorage.getDraft(currentUrl);

  if (draft && draft.formData) {
    // Show draft prompt
    document.getElementById('draftPrompt').classList.remove('hidden');
  }
}

/**
 * Restore draft data
 */
async function restoreDraft() {
  if (!currentUrl) return;

  const draft = await DraftStorage.getDraft(currentUrl);

  if (draft && draft.formData) {
    // Populate form with draft data
    document.getElementById('company').value = draft.formData.company || '';
    document.getElementById('jobTitle').value = draft.formData.jobTitle || '';
    document.getElementById('location').value = draft.formData.location || '';
    document.getElementById('description').value = draft.formData.description || '';

    // Hide draft prompt
    document.getElementById('draftPrompt').classList.add('hidden');

    // Show brief confirmation
    showDraftIndicator();
  }
}

/**
 * Save current form data as draft
 */
async function saveCurrentDraft() {
  if (!currentUrl) return;

  const formData = {
    company: document.getElementById('company').value,
    jobTitle: document.getElementById('jobTitle').value,
    location: document.getElementById('location').value,
    description: document.getElementById('description').value
  };

  // Only save if at least one field has data
  const hasData = Object.values(formData).some(val => val.trim() !== '');

  if (hasData) {
    await DraftStorage.saveDraft(currentUrl, formData, detectedData?.confidence);
    showDraftIndicator();
  }
}

/**
 * Show draft saved indicator briefly
 */
function showDraftIndicator() {
  const indicator = document.getElementById('draftIndicator');
  if (!indicator) return;

  indicator.classList.remove('hidden');
  indicator.classList.add('show');

  // Fade out after 2 seconds
  setTimeout(() => {
    indicator.classList.remove('show');
  }, 2000);
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
  e.preventDefault();

  const company = document.getElementById('company').value.trim();
  const jobTitle = document.getElementById('jobTitle').value.trim();
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();

  // Validate required fields
  if (!company || !jobTitle || !location) {
    showStatus('Please fill in required fields', 'error');
    return;
  }

  // Disable submit button
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';

  showStatus('Sending to Airtable...', 'info');

  try {
    // Get current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab ? tab.url : '';

    // Get current timestamp in format: YYYY-MM-DD HH:MM:SS
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const lastUpdated = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // Generate unique JobID using UUID
    const jobId = crypto.randomUUID();

    // Build data object (include description only if it has a value)
    const data = {
      JobID: jobId,
      Company: company,
      Title: jobTitle,
      Location: location,
      Status: 'New',
      'Last Updated': lastUpdated,
      Score: 0,
      Source: 'Browser',
      Link: currentUrl
    };

    if (description) {
      data.Summary = description;
    }

    // Send to service worker
    const response = await chrome.runtime.sendMessage({
      type: 'SEND_TO_AIRTABLE',
      data: data
    });

    if (response.success) {
      // Clear draft after successful submission
      if (currentUrl) {
        await DraftStorage.clearDraft(currentUrl);
      }

      showStatus('Successfully sent to Airtable!', 'success');

      // Clear form after 2 seconds
      setTimeout(() => {
        document.getElementById('jobForm').reset();
        hideStatus();
      }, 2000);
    } else {
      showStatus('Failed: ' + response.error, 'error');
    }
  } catch (error) {
    console.error('Submission error:', error);
    showStatus('Error: ' + error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Send to Airtable';
  }
}

/**
 * Show loading state
 */
function showLoadingState() {
  hideAllStates();
  document.getElementById('loadingState').classList.remove('hidden');
}

/**
 * Show error state
 */
function showError(message) {
  hideAllStates();
  const errorState = document.getElementById('errorState');
  errorState.classList.remove('hidden');
  document.getElementById('errorMessage').textContent = message;
}

/**
 * Show not configured state
 */
function showNotConfiguredState() {
  hideAllStates();
  document.getElementById('notConfiguredState').classList.remove('hidden');
}

/**
 * Hide all states
 */
function hideAllStates() {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.getElementById('notConfiguredState').classList.add('hidden');
  document.getElementById('formState').classList.add('hidden');
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      hideStatus();
    }, 3000);
  }
}

/**
 * Hide status message
 */
function hideStatus() {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.classList.add('hidden');
  }
}
