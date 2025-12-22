// Service worker for handling Airtable API calls

// Listen for messages from popup and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEND_TO_AIRTABLE') {
    handleAirtableSubmission(request.data, sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.type === 'TEST_CONNECTION') {
    handleTestConnection(request.apiKey, request.baseId, request.tableName, sendResponse);
    return true; // Keep channel open for async response
  }
});

/**
 * Handle submission to Airtable
 */
async function handleAirtableSubmission(data, sendResponse) {
  try {
    // Get credentials from storage
    const settings = await chrome.storage.sync.get(['apiKey', 'baseId', 'tableName']);

    if (!settings.apiKey || !settings.baseId || !settings.tableName) {
      sendResponse({
        success: false,
        error: 'Airtable credentials not configured. Please check settings.'
      });
      return;
    }

    // Make API call with retry logic
    const result = await retryWithBackoff(async () => {
      return await createAirtableRecord(
        settings.apiKey,
        settings.baseId,
        settings.tableName,
        data
      );
    });

    sendResponse(result);
  } catch (error) {
    console.error('Service worker error:', error);
    sendResponse({
      success: false,
      error: error.message || 'An unexpected error occurred'
    });
  }
}

/**
 * Handle test connection request
 */
async function handleTestConnection(apiKey, baseId, tableName, sendResponse) {
  try {
    const result = await validateConnection(apiKey, baseId, tableName);
    sendResponse(result);
  } catch (error) {
    console.error('Test connection error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Connection test failed'
    });
  }
}

/**
 * Validate connection to Airtable
 */
async function validateConnection(apiKey, baseId, tableName) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=1`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: parseErrorMessage(data, response.status)
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      success: false,
      error: error.message || 'Network error occurred'
    };
  }
}

/**
 * Create a record in Airtable
 */
async function createAirtableRecord(apiKey, baseId, tableName, fields) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

  try {
    const requestBody = {
      records: [{
        fields: fields
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: parseErrorMessage(data, response.status)
      };
    }

    return {
      success: true,
      data: data.records[0]
    };
  } catch (error) {
    console.error('Airtable API error:', error);
    return {
      success: false,
      error: error.message || 'Network error occurred'
    };
  }
}

/**
 * Parse Airtable error response into user-friendly message
 */
function parseErrorMessage(data, status) {
  if (status === 401) {
    return 'Invalid API key. Please check your settings.';
  }

  if (status === 404) {
    return 'Base or table not found. Please verify your Base ID and Table Name in settings.';
  }

  if (status === 403) {
    return 'Access denied. Your API key may not have permission to access this base.';
  }

  if (status === 422) {
    if (data.error && data.error.type === 'INVALID_REQUEST_BODY') {
      return 'Invalid field names. Ensure your table has these exact fields: Company, Job Title, Location (case-sensitive).';
    }
    return 'Invalid request. Please check your table structure in settings.';
  }

  if (status === 429) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }

  if (data.error && data.error.message) {
    return data.error.message;
  }

  return `Request failed with status ${status}`;
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();

      // If result indicates success or a non-retryable error, return immediately
      if (result.success || !isRetryableError(result.error)) {
        return result;
      }

      lastError = result;
    } catch (error) {
      lastError = { success: false, error: error.message };
    }

    // Wait before retrying (exponential backoff: 1s, 2s, 4s)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return lastError;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error) {
  if (!error) return false;

  const retryablePatterns = [
    'network error',
    'timeout',
    'rate limit',
    'ECONNRESET',
    'ETIMEDOUT'
  ];

  const errorLower = error.toLowerCase();
  return retryablePatterns.some(pattern => errorLower.includes(pattern));
}
