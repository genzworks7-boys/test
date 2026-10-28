# NexusReg — Modern Registration Portal & Google Sheets Integration

A complete, production-ready, responsive registration website with a custom-engineered blue-and-white theme, real-time client validation, anti-spam protections, and direct cloud synchronization into **Google Sheets** via **Google Apps Script** (with **zero paid APIs or vendor lock-in**).

---

## Table of Contents
1. [Project Overview & Key Features](#project-overview--key-features)
2. [File Structure & Directory Explanation](#file-structure--directory-explanation)
3. [Step-by-Step Google Sheets & Apps Script Setup](#step-by-step-google-sheets--apps-script-setup)
4. [Deploying Google Apps Script as a Web App](#deploying-google-apps-script-as-a-web-app)
5. [Connecting the Web App `/exec` URL to the Website](#connecting-the-web-app-exec-url-to-the-website)
6. [CORS, Redirects & Apps Script Technical Architecture](#cors-redirects--apps-script-technical-architecture)
7. [Security & Abuse Prevention Mechanisms](#security--abuse-prevention-mechanisms)
8. [End-to-End Testing Procedure](#end-to-end-testing-procedure)
9. [Comprehensive Troubleshooting Guide](#comprehensive-troubleshooting-guide)
10. [Free Production Hosting Options](#free-production-hosting-options)

---

## 1. Project Overview & Key Features

- **No Paid Dependencies**: Uses standard HTML5, CSS3, JavaScript on the frontend, and Google Apps Script + Google Sheets on the backend.
- **Design System**: Tailored Sapphire Blue and Crisp Slate color palette, glassmorphism accents, accessible focus rings, responsive typography, and mobile-friendly touch targets.
- **Client-Side Live Validation**: Immediate feedback on name length, RFC 5322 email syntax, international phone formats, and department selection.
- **Duplicate Click Prevention**: Submit button immediately disables, transforms to a loading spinner, and locks against re-clicks while the request is in flight.
- **Verified Success Screen**: Transitions seamlessly to a confirmation view displaying a unique reference code (`REG-YYYY-XXXXXX`), timestamp, and receipt actions (Print / Register Another).
- **Interactive Configuration Drawer**: Update your Google Apps Script URL directly in the browser UI (persisted in `localStorage`) with a built-in **"Test Endpoint Connection"** ping tool.
- **Demo Mode**: Built-in toggle to simulate full latency, validation, and confirmation receipts offline or before deploying the backend.

---

## 2. File Structure & Directory Explanation

```
├── index.html                   # Main semantic HTML structure, SEO tags, accessible form, FAQ & config modal
├── css/
│   └── styles.css               # Complete styling, blue-and-white design system, animations, responsive & print media
├── js/
│   ├── config.js                # Configuration manager, localStorage persistence, URL validator, Demo Mode toggle
│   ├── validation.js            # Input validators (Name, Email, Phone, Department, Honeypot) & HTML escaping
│   ├── api.js                   # CORS-compatible fetch client, redirect handler, timeout guard, diagnostic ping
│   └── app.js                   # Application controller, DOM events, UI states, confetti particles, print receipt
├── google-apps-script/
│   └── Code.gs                  # Production Google Apps Script backend with LockService & Formula Injection guard
├── test-validation.js           # Automated test suite covering 25 test cases for validation and sanitization
└── README.md                    # Detailed documentation and operational manual
```

---

## 3. Step-by-Step Google Sheets & Apps Script Setup

### Step 1: Create a New Google Sheet
1. Navigate to [Google Sheets](https://sheets.new) in your web browser.
2. Name your spreadsheet (e.g., `Summit 2026 Attendee Registrations`).
3. Rename the first sheet tab at the bottom to `Registrations` (or leave it as default; our script will create or target the `Registrations` sheet tab automatically).

### Step 2: Open the Apps Script Editor
1. In the Google Sheets top menu bar, click **Extensions > Apps Script**.
2. A new tab will open with the Apps Script code editor.
3. Name your project at the top left (e.g., `NexusReg Backend`).

### Step 3: Paste the Server Code
1. In the left panel, click on `Code.gs`.
2. Delete any existing template code (`function myFunction() { ... }`).
3. Open the file `google-apps-script/Code.gs` from this repository, copy its entire contents, and paste it into the Apps Script editor.
4. Click the **Save** icon (💾) or press `Ctrl + S` (`Cmd + S` on Mac).

### Step 4: Run Initial Setup & Grant Permissions
1. In the toolbar at the top of the Apps Script editor, look for the function dropdown (it usually defaults to `doPost` or `doGet`).
2. Select **`initialSetup`** from the dropdown.
3. Click the **Run** button (▶️).
4. Google will display an **"Authorization Required"** prompt:
   - Click **Review Permissions**.
   - Select your Google Account.
   - You may see a warning screen saying *"Google hasn’t verified this app"*. Click **Advanced** at the bottom left, then click **"Go to NexusReg Backend (unsafe)"**.
   - Click **Allow** to give the script permission to manage the connected spreadsheet.
5. Once execution finishes, switch back to your Google Sheet. You will see that row 1 is now formatted with royal blue headers, white bold text, and frozen:
   `Registration ID | Timestamp (UTC) | Timestamp (Local) | Full Name | Email Address | Phone Number | Department | Status`

---

## 4. Deploying Google Apps Script as a Web App

To allow the frontend website to send form data to your script, you must deploy it as a public **Web App**:

1. In the Apps Script editor, click the blue **Deploy** button at the top right and select **New deployment**.
2. In the modal that appears, click the **gear icon (⚙️)** next to "Select type" and choose **Web app**.
3. Configure the following deployment fields exactly as described:
   - **Description**: `Production Registration Web App v1`
   - **Execute as**: **Me (`your-email@gmail.com`)**  
     *(This ensures the script runs with your spreadsheet write permissions without requiring visitors to log into Google).*
   - **Who has access**: **Anyone**  
     *(CRITICAL: Do NOT choose "Only myself" or "Anyone with a Google account". Choosing "Anyone" allows external public POST requests from web visitors without triggering an authentication redirect that blocks CORS).*
4. Click **Deploy**.
5. Google will provide a **Web app URL** that looks like:
   ```
   https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
   ```
6. Click **Copy** to copy this `/exec` URL.

> **CRITICAL DEPLOYMENT NOTE:**
> - Always copy the URL ending in **`/exec`**.
> - **NEVER** use the URL ending in **`/dev`**. The `/dev` URL is a private test environment that always requires a Google Account login, causing web requests to fail with CORS errors.
> - Whenever you modify `Code.gs` in the future, you must create a new deployment version: Click **Deploy > Manage deployments > Edit (pencil icon) > Version: New version > Deploy**.

---

## 5. Connecting the Web App `/exec` URL to the Website

You have two convenient ways to configure the endpoint:

### Option A: Using the In-App "API Config" Drawer (Instant & No Code Edits)
1. Open `index.html` in your web browser.
2. In the top right navigation bar, click the **"⚙️ API Config"** button.
3. Paste your copied Google Apps Script `/exec` URL into the **Google Apps Script Web App URL** input.
4. Click **"Test Endpoint Connection"**.
   - The system will send a diagnostic ping (`?action=ping`).
   - If properly deployed, a green checkmark will appear: `✓ Connected! Response time: 240ms`.
5. Ensure the **Interactive Demo Mode** toggle is switched **OFF** (so submissions go to your live Google Sheet).
6. Click **Save Settings**.
7. The status badge in the navbar will update to **"● Live Sync Ready"**, and your URL is saved to your browser's `localStorage`.

### Option B: Hardcoding the Default URL in Code (Recommended for Production Deployment)
If you are deploying the website publicly and want all visitors to automatically submit to your sheet without opening the configuration drawer:
1. Open `js/config.js` in your code editor.
2. Locate line 16:
   ```javascript
   DEFAULT_SCRIPT_URL: '',
   ```
3. Paste your `/exec` URL between the quotes:
   ```javascript
   DEFAULT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec',
   ```
4. Save the file. Any visitor loading the page will now communicate with your Google Sheet automatically!

---

## 6. CORS, Redirects & Apps Script Technical Architecture

### The Google Apps Script Cross-Origin Dilemma
Google Apps Script Web Apps have a unique HTTP behavior that causes standard AJAX/Fetch implementations to fail if not engineered correctly:

1. **No HTTP OPTIONS Preflight Support**:
   - When a browser makes a `fetch()` request with `Content-Type: application/json`, the browser sends an HTTP `OPTIONS` preflight request first.
   - Google Apps Script does **NOT** implement the `OPTIONS` method. It returns an HTTP 405 error or misses CORS headers on preflights, causing the browser to abort with:
     ```
     Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
     ```

2. **The HTTP 302 Redirect Flow**:
   - Google Apps Script responds to valid POST requests with an HTTP `302 Found` redirect to a temporary execution node: `https://script.googleusercontent.com/macros/echo?user_content_key=...`.
   - The redirected response on `script.googleusercontent.com` DOES include the required header: `Access-Control-Allow-Origin: *`.

### Our Solution in `js/api.js`
To overcome this without paid proxies or backend servers:
1. **Simple Header Strategy**: We send the JSON body using `Content-Type: text/plain;charset=utf-8`.
2. Because `text/plain` is classified by the W3C Fetch standard as a simple content type, the browser **bypasses the OPTIONS preflight** and dispatches the POST request directly to Apps Script.
3. In `google-apps-script/Code.gs`, `doPost(e)` reads `e.postData.contents`, parses it as JSON, and appends the row.
4. Apps Script returns the response wrapped in `ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)`.
5. The browser automatically follows the 302 redirect (`redirect: 'follow'`), receives the JSON with `Access-Control-Allow-Origin: *`, and parses the confirmation response.
6. The frontend **only** displays a success state when `result.status === 'success'` and a confirmed `registrationId` is returned. If a network interruption occurs, it surfaces actionable diagnostics rather than falsely claiming success.

---

## 7. Security & Abuse Prevention Mechanisms

### 1. Spreadsheet Formula Injection Protection (CWE-1236 / CSV Injection)
- **The Threat**: In spreadsheets, if an attendee enters `=IMPORTXML(...)` or `=IMAGE(...)` into the Name field, the spreadsheet engine executes it when viewed, potentially exfiltrating other sheet rows or executing malicious scripts.
- **Our Defense**: Both client-side and in `google-apps-script/Code.gs`, any user value beginning with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`) is prepended with a single apostrophe (`'`). In Google Sheets, a leading apostrophe forces the cell to treat the content as literal text, completely neutralizing formula execution while preserving the original input.

### 2. Honeypot Anti-Bot Shield
- **The Mechanism**: An input field named `website` is placed in the form, completely hidden from humans using off-screen CSS coordinates (`position: absolute; left: -9999px; opacity: 0; pointer-events: none; tabindex: -1;`).
- Automated spam bots and web crawlers parse raw HTML and attempt to populate every input field. If `website` contains any text upon submission, the request is instantly rejected on both the client and server.
- **Important Anti-Spam Reality**: A honeypot stops opportunistic scrapers and automated bots. However, it does not stop targeted human attackers or sophisticated bots designed specifically for your form. For high-volume public campaigns, you can supplement this by integrating Cloudflare Turnstile or Google reCAPTCHA v3.

### 3. ScriptLock Concurrency Guard
- When dozens or hundreds of attendees click "Submit" simultaneously, race conditions can cause rows to overwrite or skip.
- `google-apps-script/Code.gs` implements `LockService.getScriptLock()`:
  ```javascript
  const lock = LockService.getScriptLock();
  const acquired = lock.tryLock(30000); // 30-second concurrency queue
  ```
  This serializes submissions, ensuring every registration is assigned a unique row and sequential ID without collision.

### 4. Zero Read / Edit Exposure (Privacy Protection)
- The Google Apps Script endpoint provides **only** write-append capability.
- `doGet(e)` explicitly rejects requests attempting to query or inspect registered attendee data (it only responds to a safe diagnostic ping).
- Visitors to the website have zero ability to query, list, modify, or delete existing registrations.

---

## 8. End-to-End Testing Procedure

### Pre-Flight Automated Validation Test
Run the included test script to verify all 25 client validation rules and sanitization filters:
```bash
node test-validation.js
```
Expected output: `Results: 25 passed, 0 failed.`

### Manual Test 1: Empty & Invalid Field Validation
1. Open the website in your browser (`http://localhost:8080` or `index.html`).
2. Leave all fields blank and click **"Complete Registration"**.
3. **Verify**:
   - The form does NOT submit.
   - An alert banner appears: *"Form Incomplete — Please review and correct the highlighted fields before submitting."*
   - Red error indicators appear under Full Name, Email Address, Phone Number, Department, and Terms Checkbox.
   - Keyboard focus jumps automatically to the first invalid field (`Full Name`).

### Manual Test 2: Field Format Restrictions
1. Enter `A` for Full Name -> Verify message: *"Name must be at least 2 characters."*
2. Enter `user@` for Email -> Verify message: *"Please enter a valid email address (e.g., name@example.com)."*
3. Enter `123` for Phone -> Verify message: *"Phone number must contain at least 7 digits."*

### Manual Test 3: Live Registration Submission
1. Fill in valid test data:
   - **Full Name**: `Elena Rostova`
   - **Email Address**: `elena.rostova@enterprise.org`
   - **Phone Number**: `+1 (555) 234-5678`
   - **Department**: `Engineering & Tech`
   - **Terms Checkbox**: Checked
2. Click **"Complete Registration"**.
3. **Verify**:
   - Button immediately disables and displays a spinning loader with text: *"Recording in Google Sheets..."*.
   - Rapid clicking cannot submit duplicate requests.
   - After 1–2 seconds, the screen transitions to the **Success Confirmation Card**.
   - Confetti particles animate across the screen.
   - A unique Registration Reference Code is displayed (e.g., `REG-2026-F9A8B2`).
   - The summary table shows Elena Rostova, her email, phone, and department.
4. Check your Google Sheet:
   - A new row is appended with the exact ID, timestamps (UTC and Local), Name, Email, Phone, Department, and Status: `Confirmed`.

### Manual Test 4: Formula Injection Attack Prevention
1. Submit another registration with:
   - **Full Name**: `=HYPERLINK("http://evil.com","Click Me")`
   - **Email Address**: `security@test.com`
   - **Phone Number**: `+1 (555) 999-0000`
   - **Department**: `Research & Data Science`
2. Submit the form.
3. Open your Google Sheet:
   - In the Name column, notice that the cell begins with an apostrophe: `'=HYPERLINK(...)`.
   - The formula is rendered as inert plain text and is NOT executed as an active formula!

### Manual Test 5: Receipt Printing & Form Reset
1. On the success screen, click **"Print Confirmation"** -> Verify your browser's print dialog opens with a clean, printer-optimized receipt (navigation, banners, and buttons are automatically hidden).
2. Click **"Register Another Person"** -> Verify the form returns to a clean, empty state with focus reset on the Full Name field.

---

## 9. Comprehensive Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **"Unable to connect to Google Apps Script endpoint" / CORS error** | Apps Script Web App was deployed with *"Who has access: Only myself"* or *"Anyone with a Google account"*. Google forces a 302 redirect to a Google Login screen, which blocks CORS. | In Apps Script, click **Deploy > Manage deployments > Edit**. Set **"Who has access"** to **"Anyone"**. Click **Deploy**. |
| **"Script function not found" or 404** | You copied the test URL ending in `/dev` instead of `/exec`. | In Apps Script, click **Deploy > Manage deployments**, and copy the URL ending in `/exec`. |
| **Submissions work, but rows are not appearing in Google Sheets** | Apps Script project was not granted authorization to access the spreadsheet. | In the Apps Script toolbar, select `initialSetup`, click **Run**, and approve permissions in the Google OAuth prompt. |
| **Changes made to `Code.gs` do not take effect** | Apps Script deployments run against a locked version. Editing code without creating a new version leaves the old version active. | Click **Deploy > Manage deployments > Edit > Version: New version > Deploy**. |
| **Honeypot rejection alert appears for legitimate users** | A third-party browser auto-fill extension automatically filled hidden fields. | Temporarily disable form auto-fill for that page or submit manually. |
| **Request timed out after 25 seconds** | Google servers experienced transient latency or your internet disconnected. | The form preserves all user-entered values. Click "Complete Registration" again to retry. |

---

## 10. Free Production Hosting Options

Because this website is built with clean Vanilla HTML5, CSS3, and JavaScript, it can be hosted for free with SSL on any static hosting provider in under two minutes:

### Option 1: GitHub Pages (100% Free)
1. Push this folder to a GitHub repository.
2. In your repository on GitHub, navigate to **Settings > Pages**.
3. Under **Branch**, select `main` (or `master`) and folder `/ (root)`. Click **Save**.
4. Your website is live at `https://<your-username>.github.io/<repo-name>/`.

### Option 2: Netlify Drop (No CLI Required)
1. Visit [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop this project directory into the browser window.
3. Your website will be live in 10 seconds with a free `.netlify.app` domain and free SSL.

### Option 3: Cloudflare Pages
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages > Pages > Create application**.
2. Connect your Git repository or drag-and-drop the directory.
3. Deploy for free on Cloudflare's global edge network.
