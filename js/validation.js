/**
 * =========================================================================
 * CLIENT-SIDE VALIDATION & SANITIZATION ENGINE
 * =========================================================================
 * Enforces robust, accessible, and secure user input handling.
 * Provides immediate visual feedback, accessible error descriptions,
 * and defenses against Cross-Site Scripting (XSS) and bot spam.
 */

const Validator = {
  // Regex definitions
  REGEX: {
    // Allows international names, spaces, hyphens, apostrophes, and periods
    NAME: /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{1,99}$/u,
    // RFC 5322 compliant email regex
    EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
    // Flexible international phone format: digits, +, spaces, hyphens, parentheses, 7 to 30 chars
    PHONE: /^[0-9+\s\-().]{7,30}$/
  },

  /**
   * Validates Full Name.
   * @param {string} name
   * @returns {{ isValid: boolean, message: string }}
   */
  validateName: function (name) {
    if (!name || typeof name !== 'string') {
      return { isValid: false, message: 'Full name is required.' };
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return { isValid: false, message: 'Name must be at least 2 characters.' };
    }
    if (trimmed.length > 100) {
      return { isValid: false, message: 'Name cannot exceed 100 characters.' };
    }
    if (!this.REGEX.NAME.test(trimmed)) {
      return { isValid: false, message: 'Please enter a valid name using letters, spaces, or hyphens.' };
    }
    return { isValid: true, message: '' };
  },

  /**
   * Validates Email Address.
   * @param {string} email
   * @returns {{ isValid: boolean, message: string }}
   */
  validateEmail: function (email) {
    if (!email || typeof email !== 'string') {
      return { isValid: false, message: 'Email address is required.' };
    }
    const trimmed = email.trim();
    if (trimmed.length > 150) {
      return { isValid: false, message: 'Email cannot exceed 150 characters.' };
    }
    if (!this.REGEX.EMAIL.test(trimmed)) {
      return { isValid: false, message: 'Please enter a valid email address (e.g., name@example.com).' };
    }
    return { isValid: true, message: '' };
  },

  /**
   * Validates Phone Number.
   * @param {string} phone
   * @returns {{ isValid: boolean, message: string }}
   */
  validatePhone: function (phone) {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, message: 'Phone number is required.' };
    }
    const trimmed = phone.trim();
    // Count only digits to ensure at least 7 digits
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return { isValid: false, message: 'Phone number must contain at least 7 digits.' };
    }
    if (trimmed.length > 30) {
      return { isValid: false, message: 'Phone number cannot exceed 30 characters.' };
    }
    if (!this.REGEX.PHONE.test(trimmed)) {
      return { isValid: false, message: 'Please enter a valid phone number (e.g., +1 (555) 019-2834).' };
    }
    return { isValid: true, message: '' };
  },

  /**
   * Validates Department Selection.
   * @param {string} department
   * @returns {{ isValid: boolean, message: string }}
   */
  validateDepartment: function (department) {
    if (!department || typeof department !== 'string' || department.trim() === '') {
      return { isValid: false, message: 'Please select your department from the list.' };
    }
    const trimmed = department.trim();
    if (window.CONFIG && window.CONFIG.DEPARTMENTS) {
      if (!window.CONFIG.DEPARTMENTS.includes(trimmed)) {
        return { isValid: false, message: 'Selected department is not in the authorized list.' };
      }
    }
    return { isValid: true, message: '' };
  },

  /**
   * Validates Honeypot field.
   * Must remain strictly empty for genuine users.
   * @param {string} honeypotValue
   * @returns {boolean} True if clean (empty), false if spam bot detected.
   */
  isHoneypotClean: function (honeypotValue) {
    return !honeypotValue || honeypotValue.trim().length === 0;
  },

  /**
   * Validates the entire form payload.
   * @param {Object} formData - Object containing { name, email, phone, department, website }
   * @returns {{ isValid: boolean, errors: Object }}
   */
  validateForm: function (formData) {
    const errors = {};
    
    // Check honeypot first
    if (!this.isHoneypotClean(formData.website)) {
      errors.website = 'Spam submission detected.';
      return { isValid: false, errors };
    }

    const nameRes = this.validateName(formData.name);
    if (!nameRes.isValid) errors.name = nameRes.message;

    const emailRes = this.validateEmail(formData.email);
    if (!emailRes.isValid) errors.email = emailRes.message;

    const phoneRes = this.validatePhone(formData.phone);
    if (!phoneRes.isValid) errors.phone = phoneRes.message;

    const deptRes = this.validateDepartment(formData.department);
    if (!deptRes.isValid) errors.department = deptRes.message;

    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors
    };
  },

  /**
   * Safely escapes HTML special characters to prevent XSS when rendering user input.
   * @param {string} str
   * @returns {string} Sanitized string safe for DOM insertion.
   */
  escapeHtml: function (str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

window.Validator = Validator;
