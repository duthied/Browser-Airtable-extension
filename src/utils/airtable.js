// Airtable API client for creating records and validating connections

const AirtableClient = {
  /**
   * Create a record in Airtable
   * @param {string} apiKey - Airtable API key
   * @param {string} baseId - Airtable base ID
   * @param {string} tableName - Table name
   * @param {Object} fields - Record fields {Company, "Job Title", Location}
   * @returns {Promise<Object>} Result with success status and data or error
   */
  async createRecord(apiKey, baseId, tableName, fields) {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: fields
          }]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: this.parseErrorMessage(data, response.status)
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
  },

  /**
   * Validate connection by fetching table info
   * @param {string} apiKey - Airtable API key
   * @param {string} baseId - Airtable base ID
   * @param {string} tableName - Table name
   * @returns {Promise<Object>} Result with success status
   */
  async validateConnection(apiKey, baseId, tableName) {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=1`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: this.parseErrorMessage(data, response.status)
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
  },

  /**
   * Parse Airtable error response into user-friendly message
   * @param {Object} data - Error response data
   * @param {number} status - HTTP status code
   * @returns {string} User-friendly error message
   */
  parseErrorMessage(data, status) {
    if (status === 401) {
      return 'Invalid API key. Please check your credentials.';
    }

    if (status === 404) {
      return 'Base or table not found. Please verify your Base ID and Table Name.';
    }

    if (status === 403) {
      return 'Access denied. Your API key may not have permission to access this base.';
    }

    if (status === 422) {
      if (data.error && data.error.type === 'INVALID_REQUEST_BODY') {
        return 'Invalid field names. Make sure your table has fields named: Company, Job Title, and Location (case-sensitive).';
      }
      return 'Invalid request. Please check your table structure.';
    }

    if (status === 429) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }

    if (data.error && data.error.message) {
      return data.error.message;
    }

    return `Request failed with status ${status}`;
  },

  /**
   * Retry a function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<any>} Result from function
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn();

        // If result indicates success or a non-retryable error, return immediately
        if (result.success || !this.isRetryableError(result.error)) {
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
  },

  /**
   * Check if an error is retryable
   * @param {string} error - Error message
   * @returns {boolean} Whether error is retryable
   */
  isRetryableError(error) {
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
};

// Make it available globally for use in other scripts
if (typeof window !== 'undefined') {
  window.AirtableClient = AirtableClient;
}
