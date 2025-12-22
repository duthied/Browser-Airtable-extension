// Draft storage helper for form data persistence

class DraftStorage {
  /**
   * Save form data as a draft for a specific URL
   * @param {string} url - The job posting URL
   * @param {Object} formData - Form field values
   * @param {Object} confidence - Optional confidence scores from detection
   */
  static async saveDraft(url, formData, confidence = null) {
    try {
      const key = this._getStorageKey(url);
      const draft = {
        url: url,
        timestamp: new Date().toISOString(),
        formData: formData,
        confidence: confidence
      };

      await chrome.storage.local.set({ [key]: draft });
      return true;
    } catch (error) {
      console.error('Error saving draft:', error);
      return false;
    }
  }

  /**
   * Get saved draft for a specific URL
   * @param {string} url - The job posting URL
   * @returns {Object|null} Draft data or null if not found
   */
  static async getDraft(url) {
    try {
      const key = this._getStorageKey(url);
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('Error getting draft:', error);
      return null;
    }
  }

  /**
   * Clear draft for a specific URL
   * @param {string} url - The job posting URL
   */
  static async clearDraft(url) {
    try {
      const key = this._getStorageKey(url);
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error('Error clearing draft:', error);
      return false;
    }
  }

  /**
   * Clear all drafts (for cleanup)
   */
  static async clearAllDrafts() {
    try {
      const all = await chrome.storage.local.get(null);
      const draftKeys = Object.keys(all).filter(key => key.startsWith('draft_'));
      await chrome.storage.local.remove(draftKeys);
      return true;
    } catch (error) {
      console.error('Error clearing all drafts:', error);
      return false;
    }
  }

  /**
   * Clean up old drafts (older than 30 days)
   */
  static async cleanupOldDrafts() {
    try {
      const all = await chrome.storage.local.get(null);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      const keysToRemove = [];

      Object.entries(all).forEach(([key, value]) => {
        if (key.startsWith('draft_') && value.timestamp) {
          const draftDate = new Date(value.timestamp);
          if (draftDate < thirtyDaysAgo) {
            keysToRemove.push(key);
          }
        }
      });

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }

      return keysToRemove.length;
    } catch (error) {
      console.error('Error cleaning up old drafts:', error);
      return 0;
    }
  }

  /**
   * Generate storage key from URL
   * Normalizes URL and creates a hash-like key
   * @param {string} url - The URL to hash
   * @returns {string} Storage key
   * @private
   */
  static _getStorageKey(url) {
    // Normalize URL (remove query params and hash)
    const normalized = this._normalizeUrl(url);
    // Create simple hash from normalized URL
    const hash = this._simpleHash(normalized);
    return `draft_${hash}`;
  }

  /**
   * Normalize URL by removing query parameters and fragments
   * @param {string} url - The URL to normalize
   * @returns {string} Normalized URL
   * @private
   */
  static _normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // Return protocol + host + pathname (no query, no hash)
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (error) {
      // If URL parsing fails, return original
      return url;
    }
  }

  /**
   * Simple hash function for creating storage keys
   * @param {string} str - String to hash
   * @returns {string} Hash string
   * @private
   */
  static _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Make available globally
window.DraftStorage = DraftStorage;
