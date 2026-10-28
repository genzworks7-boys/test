/**
 * =========================================================================
 * GOOGLE APPS SCRIPT API CLIENT & CORS HANDLER
 * =========================================================================
 * Manages communication between the frontend registration form and the
 * deployed Google Apps Script Web App (/exec).
 *
 * CORS & Cross-Origin Architecture:
 * 1. Google Apps Script does NOT support HTTP OPTIONS preflight requests.
 * 2. Sending `Content-Type: application/json` causes modern browsers to send
 *    an OPTIONS preflight, resulting in a 405 or CORS preflight error.
 * 3. By sending `Content-Type: text/plain;charset=utf-8` containing a JSON
 *    string, we avoid triggering an OPTIONS preflight.
 * 4. Google Apps Script receives the POST request and answers with a 302
 *    redirect to `script.googleusercontent.com/macros/echo?...`.
 * 5. Modern browsers follow this redirect automatically (`redirect: 'follow'`).
 * 6. The redirected response from Google's echo server includes
 *    `Access-Control-Allow-Origin: *`, allowing the browser to read the JSON response.
 *
 * Integrity Guarantee:
 * - This client strictly verifies server responses. It NEVER claims data was saved
 *   unless a confirmed success JSON response is returned from Google Apps Script.
 * =========================================================================
 */

const ApiClient = {
  /**
   * Submits registration form data to Google Apps Script.
   *
   * @param {Object} formData - { name, email, phone, department, website }
   * @returns {Promise<{ success: boolean, data?: Object, error?: string, diagnostics?: string[] }>}
   */
  submitRegistration: async function (formData) {
    // 1. Check if Demo Mode is enabled
    if (window.CONFIG.isDemoMode()) {
      return this._simulateDemoSubmission(formData);
    }

    // 2. Validate endpoint configuration
    const scriptUrl = window.CONFIG.getScriptUrl();
    if (!scriptUrl) {
      return {
        success: false,
        error: 'Google Apps Script endpoint is not configured.',
        diagnostics: [
          'No Apps Script URL is set. Click "⚙️ API Config" in the top bar.',
          'Deploy your Google Apps Script as a Web App and paste the "/exec" URL.',
          'Or enable "Demo Mode" to test the form interface immediately.'
        ]
      };
    }

    if (!window.CONFIG.isValidScriptUrl(scriptUrl)) {
      return {
        success: false,
        error: 'Invalid Google Apps Script Web App URL.',
        diagnostics: [
          'The URL must begin with "https://script.google.com/macros/s/" and end with "/exec".',
          'Make sure you did NOT copy the "/dev" URL (test deployments require Google login).'
        ]
      };
    }

    // 3. Prepare payload with required fields + honeypot
    const payload = {
      name: String(formData.name || '').trim(),
      email: String(formData.email || '').trim(),
      phone: String(formData.phone || '').trim(),
      department: String(formData.department || '').trim(),
      website: String(formData.website || '').trim() // Honeypot field (must be empty)
    };

    // 4. Setup AbortController for network timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), window.CONFIG.REQUEST_TIMEOUT_MS);

    try {
      /**
       * Crucial CORS Strategy:
       * Content-Type: 'text/plain;charset=utf-8' sends a CORS-simple request,
       * avoiding the unsupported OPTIONS preflight on Google Apps Script.
       */
      const response = await fetch(scriptUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Verify HTTP status
      if (!response.ok && response.status !== 0) {
        return {
          success: false,
          error: `Server responded with HTTP error status: ${response.status} (${response.statusText}).`,
          diagnostics: [
            'Verify that your Google Apps Script project has no syntax errors.',
            'Check the Execution Log in your Apps Script dashboard for details.'
          ]
        };
      }

      // Parse JSON response body
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse confirmation response from Google Apps Script.',
          diagnostics: [
            'The server did not return valid JSON.',
            'Ensure your Apps Script returns ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON).'
          ]
        };
      }

      // Verify the application-level status (supports result.status === 'success', result.success === true, or result.result === 'success')
      const isConfirmed = result && (
        result.status === 'success' ||
        result.success === true ||
        result.result === 'success'
      );

      if (isConfirmed) {
        return {
          success: true,
          data: {
            registrationId: result.registrationId || ('REG-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase()),
            timestamp: result.timestamp || new Date().toISOString(),
            message: result.message || 'Registration recorded successfully.',
            details: result.data || {
              name: payload.name,
              email: payload.email,
              phone: payload.phone,
              department: payload.department
            }
          }
        };
      } else {
        return {
          success: false,
          error: result.message || result.error || 'Google Apps Script rejected the registration request.',
          diagnostics: result.errors || ['Check input values against backend rules.']
        };
      }

    } catch (networkError) {
      clearTimeout(timeoutId);

      if (networkError.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out after 25 seconds.',
          diagnostics: [
            'Google Apps Script took too long to respond.',
            'Check your internet connection and verify the Apps Script status.'
          ]
        };
      }

      // Common CORS / Authentication / Authorization network failures
      return {
        success: false,
        error: 'Unable to connect to Google Apps Script endpoint.',
        diagnostics: [
          'Most Common Cause: Deployment permissions. In Apps Script, click "Deploy" > "Manage Deployments", and verify "Who has access" is set to "Anyone" (NOT "Only myself").',
          'URL Mismatch: Ensure you copied the "/exec" URL, NOT the "/dev" URL.',
          'Google Authorization: Open your Google Apps Script editor, run the `initialSetup` function once, and approve any required Google Drive/Sheets permissions.',
          'Ad-Blockers / Privacy Extensions: Some strict tracking blockers may intercept requests to googleusercontent.com.'
        ]
      };
    }
  },

  /**
   * Diagnostic test function to ping the configured Google Apps Script Web App.
   * Sends a GET request with ?action=ping.
   *
   * @param {string} url - Target Apps Script /exec URL.
   * @returns {Promise<{ isOnline: boolean, latencyMs: number, message: string }>}
   */
  testEndpoint: async function (url) {
    if (!url || !window.CONFIG.isValidScriptUrl(url)) {
      return {
        isOnline: false,
        latencyMs: 0,
        message: 'Invalid URL format. Expected: https://script.google.com/macros/s/.../exec'
      };
    }

    const startTime = performance.now();
    const pingUrl = url + (url.includes('?') ? '&' : '?') + 'action=ping&t=' + Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(pingUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        const text = await response.text();
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.message || text;
        } catch (e) {
          message = text;
        }
        return {
          isOnline: true,
          latencyMs: latencyMs,
          message: message || 'Endpoint reachable and responsive.'
        };
      } else {
        return {
          isOnline: false,
          latencyMs: latencyMs,
          message: `Endpoint returned HTTP status ${response.status}`
        };
      }
    } catch (err) {
      return {
        isOnline: false,
        latencyMs: 0,
        message: 'Endpoint unreachable. Ensure "Who has access" is set to "Anyone" in Web App deployment settings.'
      };
    }
  },

  /**
   * Simulates a real submission in Demo Mode with artificial latency.
   * @private
   */
  _simulateDemoSubmission: function (formData) {
    return new Promise((resolve) => {
      // Simulate 1.2 second network delay for realistic UI state testing
      setTimeout(() => {
        // Honeypot check in demo mode as well
        if (formData.website && formData.website.trim().length > 0) {
          resolve({
            success: false,
            error: 'Bot submission rejected by honeypot filter.',
            diagnostics: ['The hidden honeypot field contained text.']
          });
          return;
        }

        const randomCode = 'DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const now = new Date();

        resolve({
          success: true,
          data: {
            registrationId: `REG-2026-${randomCode}`,
            timestamp: now.toISOString(),
            message: '[DEMO MODE] Registration simulated and confirmed.',
            isDemo: true,
            details: {
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              department: formData.department
            }
          }
        });
      }, 1200);
    });
  }
};

window.ApiClient = ApiClient;
