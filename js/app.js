/**
 * =========================================================================
 * APPLICATION CONTROLLER & UI INTERACTIONS
 * =========================================================================
 * Coordinates DOM events, input validation feedback, loading states,
 * success confirmation view, modal management, and confetti animations.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element References ---
  const registrationForm = document.getElementById('registrationForm');
  const formCard = document.getElementById('formCard');
  const successCard = document.getElementById('successCard');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitSpinner = document.getElementById('submitSpinner');
  const alertBanner = document.getElementById('alertBanner');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');
  const alertDiagnostics = document.getElementById('alertDiagnostics');
  const resetFormBtn = document.getElementById('resetFormBtn');
  const printReceiptBtn = document.getElementById('printReceiptBtn');

  // Input Fields
  const inputName = document.getElementById('name');
  const inputEmail = document.getElementById('email');
  const inputPhone = document.getElementById('phone');
  const selectDepartment = document.getElementById('department');
  const inputHoneypot = document.getElementById('website');
  const inputTerms = document.getElementById('termsConsent');

  // Error Containers
  const errorName = document.getElementById('nameError');
  const errorEmail = document.getElementById('emailError');
  const errorPhone = document.getElementById('phoneError');
  const errorDepartment = document.getElementById('departmentError');
  const errorTerms = document.getElementById('termsError');

  // Success Card Fields
  const summaryRegId = document.getElementById('summaryRegId');
  const summaryTimestamp = document.getElementById('summaryTimestamp');
  const summaryName = document.getElementById('summaryName');
  const summaryEmail = document.getElementById('summaryEmail');
  const summaryPhone = document.getElementById('summaryPhone');
  const summaryDepartment = document.getElementById('summaryDepartment');
  const summaryModeBadge = document.getElementById('summaryModeBadge');

  // Config Drawer & Modal
  const openConfigBtn = document.getElementById('openConfigBtn');
  const closeConfigBtn = document.getElementById('closeConfigBtn');
  const configModal = document.getElementById('configModal');
  const configOverlay = document.getElementById('configOverlay');
  const configScriptUrl = document.getElementById('configScriptUrl');
  const testConnBtn = document.getElementById('testConnBtn');
  const testConnStatus = document.getElementById('testConnStatus');
  const demoModeToggle = document.getElementById('demoModeToggle');
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  const navStatusBadge = document.getElementById('navStatusBadge');

  // If a live default script URL is present, ensure demo mode is turned off
  if (window.CONFIG && window.CONFIG.DEFAULT_SCRIPT_URL) {
    window.CONFIG.setDemoMode(false);
  }

  // Populate Department Dropdown from CONFIG
  function populateDepartments() {
    if (!selectDepartment) return;
    const currentVal = selectDepartment.value;
    selectDepartment.innerHTML = '<option value="" disabled selected>Select an authorized department...</option>';
    window.CONFIG.DEPARTMENTS.forEach(dept => {
      const opt = document.createElement('option');
      opt.value = dept;
      opt.textContent = dept;
      selectDepartment.appendChild(opt);
    });
    if (currentVal) selectDepartment.value = currentVal;
  }
  populateDepartments();

  // Update Status Pill in Navbar
  function updateNavStatus() {
    if (!navStatusBadge) return;
    const isDemo = window.CONFIG.isDemoMode();
    const scriptUrl = window.CONFIG.getScriptUrl();

    if (isDemo) {
      navStatusBadge.className = 'status-pill status-demo';
      navStatusBadge.innerHTML = '<span class="status-dot"></span> Demo Mode Active';
      navStatusBadge.title = 'Submissions are currently simulated with live feedback.';
    } else if (scriptUrl && window.CONFIG.isValidScriptUrl(scriptUrl)) {
      navStatusBadge.className = 'status-pill status-connected';
      navStatusBadge.innerHTML = '<span class="status-dot"></span> Live Sync Ready';
      navStatusBadge.title = 'Connected to deployed Google Apps Script.';
    } else {
      navStatusBadge.className = 'status-pill status-unconfigured';
      navStatusBadge.innerHTML = '<span class="status-dot"></span> Setup Required';
      navStatusBadge.title = 'Click ⚙️ API Config to paste your Google Apps Script URL.';
    }
  }
  updateNavStatus();

  // --- Real-Time Field Validation Helpers ---
  function setFieldState(inputEl, errorEl, isValid, message = '') {
    if (!inputEl) return;
    const formGroup = inputEl.closest('.form-group');

    if (isValid) {
      inputEl.setAttribute('aria-invalid', 'false');
      if (formGroup) {
        formGroup.classList.remove('has-error');
        formGroup.classList.add('is-valid');
      }
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('visible');
      }
    } else {
      inputEl.setAttribute('aria-invalid', 'true');
      if (formGroup) {
        formGroup.classList.remove('is-valid');
        formGroup.classList.add('has-error');
      }
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('visible');
      }
    }
  }

  function clearFieldState(inputEl, errorEl) {
    if (!inputEl) return;
    inputEl.removeAttribute('aria-invalid');
    const formGroup = inputEl.closest('.form-group');
    if (formGroup) {
      formGroup.classList.remove('has-error', 'is-valid');
    }
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
  }

  // --- Input Event Listeners ---
  inputName.addEventListener('blur', () => {
    if (!inputName.value.trim()) return;
    const res = window.Validator.validateName(inputName.value);
    setFieldState(inputName, errorName, res.isValid, res.message);
  });
  inputName.addEventListener('input', () => {
    if (inputName.closest('.form-group').classList.contains('has-error')) {
      const res = window.Validator.validateName(inputName.value);
      if (res.isValid) setFieldState(inputName, errorName, true);
    }
  });

  inputEmail.addEventListener('blur', () => {
    if (!inputEmail.value.trim()) return;
    const res = window.Validator.validateEmail(inputEmail.value);
    setFieldState(inputEmail, errorEmail, res.isValid, res.message);
  });
  inputEmail.addEventListener('input', () => {
    if (inputEmail.closest('.form-group').classList.contains('has-error')) {
      const res = window.Validator.validateEmail(inputEmail.value);
      if (res.isValid) setFieldState(inputEmail, errorEmail, true);
    }
  });

  inputPhone.addEventListener('blur', () => {
    if (!inputPhone.value.trim()) return;
    const res = window.Validator.validatePhone(inputPhone.value);
    setFieldState(inputPhone, errorPhone, res.isValid, res.message);
  });
  inputPhone.addEventListener('input', () => {
    if (inputPhone.closest('.form-group').classList.contains('has-error')) {
      const res = window.Validator.validatePhone(inputPhone.value);
      if (res.isValid) setFieldState(inputPhone, errorPhone, true);
    }
  });

  selectDepartment.addEventListener('change', () => {
    const res = window.Validator.validateDepartment(selectDepartment.value);
    setFieldState(selectDepartment, errorDepartment, res.isValid, res.message);
  });

  inputTerms.addEventListener('change', () => {
    if (inputTerms.checked) {
      errorTerms.classList.remove('visible');
      errorTerms.textContent = '';
    }
  });

  // --- Alert Banner Helpers ---
  function showAlert(title, message, diagnostics = []) {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertDiagnostics.innerHTML = '';

    if (diagnostics && diagnostics.length > 0) {
      const list = document.createElement('ul');
      list.className = 'diagnostics-list';
      diagnostics.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      alertDiagnostics.appendChild(list);
    }

    alertBanner.classList.remove('hidden');
    alertBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideAlert() {
    alertBanner.classList.add('hidden');
  }

  // --- Submit Handler & Duplicate Click Prevention ---
  let isSubmitting = false;

  registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Prevent duplicate clicks if already processing
    if (isSubmitting) return;

    hideAlert();

    // 1. Gather form values
    const formData = {
      name: inputName.value.trim(),
      email: inputEmail.value.trim(),
      phone: inputPhone.value.trim(),
      department: selectDepartment.value,
      website: inputHoneypot.value // Honeypot field
    };

    // 2. Validate all fields
    const validationResult = window.Validator.validateForm(formData);

    // Validate terms checkbox
    let termsValid = true;
    if (!inputTerms.checked) {
      termsValid = false;
      errorTerms.textContent = 'Please confirm the registration terms before submitting.';
      errorTerms.classList.add('visible');
    } else {
      errorTerms.classList.remove('visible');
    }

    if (!validationResult.isValid || !termsValid) {
      // Highlight individual fields
      if (validationResult.errors.name) {
        setFieldState(inputName, errorName, false, validationResult.errors.name);
      }
      if (validationResult.errors.email) {
        setFieldState(inputEmail, errorEmail, false, validationResult.errors.email);
      }
      if (validationResult.errors.phone) {
        setFieldState(inputPhone, errorPhone, false, validationResult.errors.phone);
      }
      if (validationResult.errors.department) {
        setFieldState(selectDepartment, errorDepartment, false, validationResult.errors.department);
      }

      // Honeypot check failure
      if (validationResult.errors.website) {
        showAlert('Security Verification Notice', 'Submission rejected by automatic security validation.', [
          'Hidden anti-bot field was populated. If you are using an auto-fill extension, disable it for this page and try again.'
        ]);
        return;
      }

      // Focus first erroneous input for accessibility
      const firstInvalid = registrationForm.querySelector('[aria-invalid="true"]');
      if (firstInvalid) {
        firstInvalid.focus();
      }

      showAlert('Form Incomplete', 'Please review and correct the highlighted fields before submitting.');
      return;
    }

    // 3. Set Submitting Loading State
    isSubmitting = true;
    submitBtn.disabled = true;
    submitSpinner.classList.remove('hidden');
    submitBtnText.textContent = 'Recording in Google Sheets...';

    try {
      // 4. Send request to API Client
      const response = await window.ApiClient.submitRegistration(formData);

      if (response.success) {
        // Successful registration confirmed by Google Sheets
        renderSuccessView(response.data);
      } else {
        // Submission failed or unverified
        showAlert(
          response.error || 'Submission Unsuccessful',
          'Your registration was not saved to Google Sheets.',
          response.diagnostics || []
        );
      }
    } catch (err) {
      showAlert(
        'Unexpected Connection Error',
        'An unexpected error occurred while communicating with Google Apps Script: ' + err.message,
        ['Please verify your internet connection or check the browser developer console.']
      );
    } finally {
      // Restore submit button state
      isSubmitting = false;
      submitBtn.disabled = false;
      submitSpinner.classList.add('hidden');
      submitBtnText.textContent = 'Submit Registration';
    }
  });

  // --- Render Success State View ---
  function renderSuccessView(data) {
    // Populate receipt details safely escaped
    summaryRegId.textContent = data.registrationId;
    summaryTimestamp.textContent = new Date(data.timestamp).toLocaleString();
    summaryName.textContent = data.details.name;
    summaryEmail.textContent = data.details.email;
    summaryPhone.textContent = data.details.phone;
    summaryDepartment.textContent = data.details.department;

    if (data.isDemo) {
      summaryModeBadge.classList.remove('hidden');
    } else {
      summaryModeBadge.classList.add('hidden');
    }

    // Switch view cards with smooth fade/slide
    formCard.classList.add('hidden');
    successCard.classList.remove('hidden');
    successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Launch confetti celebration
    launchConfetti();
  }

  // --- Reset Form for Another Registration ---
  resetFormBtn.addEventListener('click', () => {
    registrationForm.reset();
    clearFieldState(inputName, errorName);
    clearFieldState(inputEmail, errorEmail);
    clearFieldState(inputPhone, errorPhone);
    clearFieldState(selectDepartment, errorDepartment);
    errorTerms.classList.remove('visible');
    hideAlert();

    successCard.classList.add('hidden');
    formCard.classList.remove('hidden');
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => {
      inputName.focus();
    }, 200);
  });

  // --- Print / Save Receipt ---
  printReceiptBtn.addEventListener('click', () => {
    window.print();
  });

  // --- Configuration Drawer / Modal Interactions ---
  function openConfigModal() {
    configScriptUrl.value = window.CONFIG.getScriptUrl();
    demoModeToggle.checked = window.CONFIG.isDemoMode();
    testConnStatus.className = 'test-conn-result hidden';
    configModal.classList.remove('hidden');
    configOverlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => configScriptUrl.focus(), 150);
  }

  function closeConfigModal() {
    configModal.classList.add('hidden');
    configOverlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  openConfigBtn.addEventListener('click', openConfigModal);
  closeConfigBtn.addEventListener('click', closeConfigModal);
  configOverlay.addEventListener('click', closeConfigModal);

  // Close modal on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !configModal.classList.contains('hidden')) {
      closeConfigModal();
    }
  });

  // Save Settings
  saveConfigBtn.addEventListener('click', () => {
    const rawUrl = configScriptUrl.value.trim();
    if (rawUrl && !window.CONFIG.isValidScriptUrl(rawUrl)) {
      alert('Please enter a valid Google Apps Script Web App URL ending in "/exec".\nExample: https://script.google.com/macros/s/.../exec');
      return;
    }

    window.CONFIG.setScriptUrl(rawUrl);
    window.CONFIG.setDemoMode(demoModeToggle.checked);
    updateNavStatus();
    closeConfigModal();

    // Show feedback toast
    showToast('Configuration settings updated successfully.');
  });

  // Test Connection Ping
  testConnBtn.addEventListener('click', async () => {
    const url = configScriptUrl.value.trim();
    if (!url) {
      testConnStatus.className = 'test-conn-result test-error';
      testConnStatus.textContent = 'Please enter an Apps Script URL to test.';
      testConnStatus.classList.remove('hidden');
      return;
    }

    testConnBtn.disabled = true;
    testConnBtn.textContent = 'Testing...';
    testConnStatus.className = 'test-conn-result test-pending';
    testConnStatus.textContent = 'Pinging Google Apps Script endpoint...';
    testConnStatus.classList.remove('hidden');

    const result = await window.ApiClient.testEndpoint(url);

    testConnBtn.disabled = false;
    testConnBtn.textContent = 'Test Endpoint Connection';

    if (result.isOnline) {
      testConnStatus.className = 'test-conn-result test-success';
      testConnStatus.textContent = `✓ Connected! Response time: ${result.latencyMs}ms. Ready for submissions.`;
    } else {
      testConnStatus.className = 'test-conn-result test-error';
      testConnStatus.textContent = `✗ ${result.message}`;
    }
  });

  // --- Lightweight Toast Notification ---
  function showToast(message) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  // --- Accordion FAQ Support ---
  const faqButtons = document.querySelectorAll('.faq-question');
  faqButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      const answer = btn.nextElementSibling;

      // Close all other accordions for neatness
      faqButtons.forEach(otherBtn => {
        if (otherBtn !== btn) {
          otherBtn.setAttribute('aria-expanded', 'false');
          if (otherBtn.nextElementSibling) {
            otherBtn.nextElementSibling.classList.add('hidden');
          }
        }
      });

      if (isExpanded) {
        btn.setAttribute('aria-expanded', 'false');
        answer.classList.add('hidden');
      } else {
        btn.setAttribute('aria-expanded', 'true');
        answer.classList.remove('hidden');
      }
    });
  });

  // --- Lightweight Canvas Confetti Particles ---
  function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#2563eb', '#38bdf8', '#60a5fa', '#3b82f6', '#1d4ed8', '#10b981', '#f59e0b'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 14,
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animationFrameId;
    let frames = 0;

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frames++;

      let activeParticles = 0;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.vr;
        p.opacity -= 0.012;

        if (p.opacity > 0) {
          activeParticles++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      if (activeParticles > 0 && frames < 140) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrameId);
      }
    }

    render();
  }
});
