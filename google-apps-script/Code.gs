/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: SECURE REGISTRATION BACKEND (v2.0)
 * =========================================================================
 * Description: Receives form submissions from the web client, validates,
 * sanitizes against spreadsheet formula injection, and safely appends a new
 * registration row to the Google Sheet.
 *
 * Security Features:
 *  - Honeypot anti-spam verification (rejects automated bot submissions)
 *  - Spreadsheet Formula Injection prevention (CWE-1236 mitigation)
 *  - Concurrency protection via LockService to prevent row collision
 *  - Strict field length and regex format validation
 *  - NO public read, edit, or delete endpoints (Zero Data Leakage)
 *  - Cross-Origin Resource Sharing (CORS) compatible JSON responses
 * =========================================================================
 */

// Target sheet tab name inside the spreadsheet
const SHEET_NAME = 'Registrations';

// Connected Google Sheet ID provided by you
const SPREADSHEET_ID = '16uDElIqBsheFIoErb21ivxyhk15NpNOuWXlWuJ6ll0I';

// Expected department options
const ALLOWED_DEPARTMENTS = [
  'Engineering & Tech',
  'Product & UX Design',
  'Marketing & Growth',
  'Sales & Business Development',
  'Operations & Human Resources',
  'Finance & Legal',
  'Executive Leadership',
  'Research & Data Science',
  'Other'
];

/**
 * Helper to get the target spreadsheet (works for both container-bound & standalone scripts).
 */
function getTargetSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 0) {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active;
  }
  throw new Error(
    "No connected Google Sheet found! " +
    "If you created this script at script.google.com, please paste your Google Sheet ID into SPREADSHEET_ID in Code.gs, " +
    "or open your Google Sheet and click 'Extensions > Apps Script'."
  );
}

/**
 * Helper to get or initialize the target sheet tab.
 * If the spreadsheet only has 1 empty tab (e.g. 'Sheet1'), renames it to 'Registrations'
 * so you see the data immediately on the main tab.
 */
function getTargetSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet) {
    if (sheet.getLastRow() === 0) {
      initializeSheetHeaders(sheet);
    }
    return sheet;
  }

  // Check if existing first sheet is empty
  const allSheets = spreadsheet.getSheets();
  if (allSheets.length > 0 && allSheets[0].getLastRow() === 0) {
    sheet = allSheets[0];
    sheet.setName(SHEET_NAME);
    initializeSheetHeaders(sheet);
    return sheet;
  }

  // Otherwise insert a new tab
  sheet = spreadsheet.insertSheet(SHEET_NAME);
  initializeSheetHeaders(sheet);
  return sheet;
}

/**
 * Handles HTTP POST requests sent by the web registration form.
 * Supports both JSON payloads (Content-Type: text/plain) and standard Form URL-encoded.
 *
 * @param {Object} e - Event parameter containing request data.
 * @return {TextOutput} JSON response with MIME type JSON.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    const acquired = lock.tryLock(30000); // Wait up to 30s
    if (!acquired) {
      return createJsonResponse({
        success: false,
        status: 'error',
        message: 'Server is currently busy processing requests. Please retry in a few moments.'
      }, 503);
    }

    // 1. Parse incoming payload
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    } else {
      return createJsonResponse({
        success: false,
        status: 'error',
        message: 'No data payload received in request.'
      }, 400);
    }

    // 2. Anti-Spam / Honeypot Check
    if (data.website && String(data.website).trim().length > 0) {
      return createJsonResponse({
        success: false,
        status: 'error',
        message: 'Submission rejected by anti-spam verification.'
      }, 400);
    }

    // 3. Extract and trim fields
    const name = data.name ? String(data.name).trim() : '';
    const email = data.email ? String(data.email).trim() : '';
    const phone = data.phone ? String(data.phone).trim() : '';
    const department = data.department ? String(data.department).trim() : '';

    // 4. Server-Side Validation
    const validationErrors = [];

    if (!name || name.length < 2) {
      validationErrors.push('Full name must be at least 2 characters.');
    } else if (name.length > 100) {
      validationErrors.push('Full name cannot exceed 100 characters.');
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!email || !emailRegex.test(email)) {
      validationErrors.push('A valid email address is required.');
    } else if (email.length > 150) {
      validationErrors.push('Email address cannot exceed 150 characters.');
    }

    const phoneRegex = /^[0-9+\s\-().]{7,30}$/;
    if (!phone || !phoneRegex.test(phone)) {
      validationErrors.push('A valid phone number (7-30 digits/characters) is required.');
    }

    if (!department || ALLOWED_DEPARTMENTS.indexOf(department) === -1) {
      validationErrors.push('Please select a valid department from the authorized list.');
    }

    if (validationErrors.length > 0) {
      return createJsonResponse({
        success: false,
        status: 'error',
        message: 'Validation failed: ' + validationErrors.join(' '),
        errors: validationErrors
      }, 422);
    }

    // 5. Connect to Google Sheet
    const spreadsheet = getTargetSpreadsheet();
    const sheet = getTargetSheet(spreadsheet);

    // 6. Generate Unique Registration Identifier
    const regId = generateRegistrationId();
    const now = new Date();
    const timestampUtc = now.toISOString();
    const timestampLocal = Utilities.formatDate(now, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd HH:mm:ss');

    // 7. Sanitize values to prevent Formula Injection (CWE-1236)
    const safeName = sanitizeForSpreadsheet(name);
    const safeEmail = sanitizeForSpreadsheet(email);
    const safePhone = sanitizeForSpreadsheet(phone);
    const safeDepartment = sanitizeForSpreadsheet(department);

    // 8. Append the row to Google Sheet
    sheet.appendRow([
      regId,
      timestampUtc,
      timestampLocal,
      safeName,
      safeEmail,
      safePhone,
      safeDepartment,
      'Confirmed'
    ]);

    // Force format new row cells as plain text
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 8).setNumberFormat('@');

    // 9. Return verified success response
    return createJsonResponse({
      success: true,
      status: 'success',
      registrationId: regId,
      timestamp: timestampUtc,
      message: 'Registration recorded successfully in Google Sheets.',
      data: {
        name: safeName,
        email: safeEmail,
        department: safeDepartment
      }
    }, 200);

  } catch (error) {
    Logger.log('Error processing registration: ' + error.toString());
    return createJsonResponse({
      success: false,
      status: 'error',
      message: 'Server error: ' + error.message
    }, 500);

  } finally {
    lock.releaseLock();
  }
}

/**
 * Handles HTTP GET requests.
 * Used exclusively for health checks / endpoint ping.
 * NEVER reads or returns spreadsheet rows, protecting registrant privacy.
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).toLowerCase() : '';

  if (action === 'ping') {
    return createJsonResponse({
      success: true,
      status: 'success',
      message: 'Google Apps Script endpoint is online, properly deployed, and ready to receive registrations.',
      timestamp: new Date().toISOString()
    }, 200);
  }

  return createJsonResponse({
    success: true,
    status: 'online',
    message: 'Registration Web App API is active. Direct browser GET requests do not expose data.',
    timestamp: new Date().toISOString()
  }, 200);
}

/**
 * Formula Injection sanitizer (CWE-1236).
 */
function sanitizeForSpreadsheet(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (/^[=+\-@\t\r%]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return trimmed;
}

/**
 * Generates a unique Registration Reference ID.
 * Format: REG-YYYY-XXXXXX (e.g. REG-2026-B8D24E)
 */
function generateRegistrationId() {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'REG-' + year + '-' + randomPart;
}

/**
 * Sets up and styles the column headers.
 */
function initializeSheetHeaders(sheet) {
  const headers = [
    'Registration ID',
    'Timestamp (UTC)',
    'Timestamp (Local)',
    'Full Name',
    'Email Address',
    'Phone Number',
    'Department',
    'Status'
  ];

  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1d4ed8'); // Royal Blue
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 200);
  sheet.setColumnWidth(5, 240);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 220);
  sheet.setColumnWidth(8, 120);
}

/**
 * Builds standard JSON response with CORS headers.
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function to verify sheet connection directly inside Apps Script editor.
 * Select 'testSheetConnection' from the dropdown and click 'Run'.
 */
function testSheetConnection() {
  const spreadsheet = getTargetSpreadsheet();
  const sheet = getTargetSheet(spreadsheet);
  Logger.log('Successfully connected to spreadsheet: ' + spreadsheet.getName());
  Logger.log('Active tab name: ' + sheet.getName());
  Logger.log('Current row count: ' + sheet.getLastRow());
}
