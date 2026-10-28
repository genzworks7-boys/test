/**
 * =========================================================================
 * APPLICATION CONFIGURATION & STATE MANAGEMENT
 * =========================================================================
 */

const CONFIG = {
  // Storage keys for localStorage persistence
  STORAGE_KEYS: {
    SCRIPT_URL: 'nexus_reg_apps_script_url',
    DEMO_MODE: 'nexus_reg_demo_mode'
  },

  // Default fallback Google Apps Script Web App URL
  DEFAULT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz0U-6EeU-tl1uHnJfyYnApuX8Z0X1FXBBXCcE_oCcbZoPGGOCi9GwtBVRKUVe5kY2A/exec',

  // Allowed department list (must match Google Apps Script ALLOWED_DEPARTMENTS)
  DEPARTMENTS: [
    'Engineering & Tech',
    'Product & UX Design',
    'Marketing & Growth',
    'Sales & Business Development',
    'Operations & Human Resources',
    'Finance & Legal',
    'Executive Leadership',
    'Research & Data Science',
    'Other'
  ],

  // Network request timeout in milliseconds (25 seconds)
  REQUEST_TIMEOUT_MS: 25000,

  /**
   * Retrieves the configured Google Apps Script /exec URL.
   * Priority: DEFAULT_SCRIPT_URL > localStorage
   */
  getScriptUrl: function () {
    if (this.DEFAULT_SCRIPT_URL && this.DEFAULT_SCRIPT_URL.trim().length > 0) {
      return this.DEFAULT_SCRIPT_URL.trim();
    }
    const savedUrl = localStorage.getItem(this.STORAGE_KEYS.SCRIPT_URL);
    if (savedUrl && savedUrl.trim().length > 0) {
      return savedUrl.trim();
    }
    return '';
  },

  /**
   * Persists a new Google Apps Script /exec URL to localStorage.
   * @param {string} url - Deployed web app URL.
   */
  setScriptUrl: function (url) {
    if (!url) {
      localStorage.removeItem(this.STORAGE_KEYS.SCRIPT_URL);
    } else {
      localStorage.setItem(this.STORAGE_KEYS.SCRIPT_URL, url.trim());
    }
  },

  /**
   * Checks whether Demo / Mock Mode is currently activated.
   */
  isDemoMode: function () {
    const saved = localStorage.getItem(this.STORAGE_KEYS.DEMO_MODE);
    if (!this.getScriptUrl()) {
      return true; // No URL set -> Demo mode
    }
    // When a live script URL is set, only run demo if explicitly set to 'true'
    return saved === 'true';
  },

  /**
   * Enables or disables Demo Mode.
   * @param {boolean} enabled
   */
  setDemoMode: function (enabled) {
    localStorage.setItem(this.STORAGE_KEYS.DEMO_MODE, enabled ? 'true' : 'false');
  },

  /**
   * Validates if a string matches the standard Google Apps Script Web App URL structure.
   * Format: https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
   * @param {string} url
   */
  isValidScriptUrl: function (url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/i.test(trimmed);
  }
};

// Auto-activate live sync and clear stale demo mode flag when a live endpoint is configured
if (CONFIG.DEFAULT_SCRIPT_URL) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.DEMO_MODE, 'false');
    localStorage.setItem(CONFIG.STORAGE_KEYS.SCRIPT_URL, CONFIG.DEFAULT_SCRIPT_URL);
  } catch (e) {}
}

window.CONFIG = CONFIG;
