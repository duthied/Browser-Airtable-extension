// Chrome storage wrapper for managing Airtable credentials and settings

const StorageHelper = {
  /**
   * Save settings to Chrome storage
   * @param {Object} settings - Settings object with apiKey, baseId, tableName
   * @returns {Promise<void>}
   */
  async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(settings, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Get all settings from Chrome storage
   * @returns {Promise<Object>} Settings object with apiKey, baseId, tableName
   */
  async getSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['apiKey', 'baseId', 'tableName'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve({
            apiKey: result.apiKey || '',
            baseId: result.baseId || '',
            tableName: result.tableName || ''
          });
        }
      });
    });
  },

  /**
   * Get API key from storage
   * @returns {Promise<string>}
   */
  async getApiKey() {
    const settings = await this.getSettings();
    return settings.apiKey;
  },

  /**
   * Get Base ID from storage
   * @returns {Promise<string>}
   */
  async getBaseId() {
    const settings = await this.getSettings();
    return settings.baseId;
  },

  /**
   * Get Table name from storage
   * @returns {Promise<string>}
   */
  async getTableName() {
    const settings = await this.getSettings();
    return settings.tableName;
  },

  /**
   * Check if all required settings are configured
   * @returns {Promise<boolean>}
   */
  async isConfigured() {
    const settings = await this.getSettings();
    return !!(settings.apiKey && settings.baseId && settings.tableName);
  },

  /**
   * Clear all settings
   * @returns {Promise<void>}
   */
  async clearSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.remove(['apiKey', 'baseId', 'tableName'], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
};

// Make it available globally for use in other scripts
if (typeof window !== 'undefined') {
  window.StorageHelper = StorageHelper;
}
