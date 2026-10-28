// Unit tests for Validator and Apps Script Sanitizer
const Validator = {
  REGEX: {
    NAME: /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{1,99}$/u,
    EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
    PHONE: /^[0-9+\s\-().]{7,30}$/
  },
  validateName: function (name) {
    if (!name || typeof name !== 'string') return { isValid: false, message: 'Full name is required.' };
    const trimmed = name.trim();
    if (trimmed.length < 2) return { isValid: false, message: 'Name must be at least 2 characters.' };
    if (trimmed.length > 100) return { isValid: false, message: 'Name cannot exceed 100 characters.' };
    if (!this.REGEX.NAME.test(trimmed)) return { isValid: false, message: 'Please enter a valid name using letters, spaces, or hyphens.' };
    return { isValid: true, message: '' };
  },
  validateEmail: function (email) {
    if (!email || typeof email !== 'string') return { isValid: false, message: 'Email address is required.' };
    const trimmed = email.trim();
    if (trimmed.length > 150) return { isValid: false, message: 'Email cannot exceed 150 characters.' };
    if (!this.REGEX.EMAIL.test(trimmed)) return { isValid: false, message: 'Please enter a valid email address.' };
    return { isValid: true, message: '' };
  },
  validatePhone: function (phone) {
    if (!phone || typeof phone !== 'string') return { isValid: false, message: 'Phone number is required.' };
    const trimmed = phone.trim();
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 7) return { isValid: false, message: 'Phone number must contain at least 7 digits.' };
    if (trimmed.length > 30) return { isValid: false, message: 'Phone number cannot exceed 30 characters.' };
    if (!this.REGEX.PHONE.test(trimmed)) return { isValid: false, message: 'Please enter a valid phone number.' };
    return { isValid: true, message: '' };
  },
  isHoneypotClean: function (val) {
    return !val || val.trim().length === 0;
  }
};

function sanitizeForSpreadsheet(val) {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (/^[=+\-@\t\r%]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return trimmed;
}

// Assert helper
let totalPassed = 0;
let totalFailed = 0;

function assert(condition, testName) {
  if (condition) {
    totalPassed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    totalFailed++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

console.log('=== RUNNING INTEGRATION & VALIDATION TESTS ===');

// 1. Name validation
assert(Validator.validateName('Elena Rostova').isValid, 'Valid English name');
assert(Validator.validateName("John O'Connor").isValid, 'Name with apostrophe');
assert(Validator.validateName('Jean-Luc Picard').isValid, 'Name with hyphen');
assert(Validator.validateName('René Descartes').isValid, 'Name with unicode accents');
assert(!Validator.validateName('A').isValid, 'Reject single letter name');
assert(!Validator.validateName('').isValid, 'Reject empty name');
assert(!Validator.validateName('123456').isValid, 'Reject numeric name');

// 2. Email validation
assert(Validator.validateEmail('alex.morgan@enterprise.org').isValid, 'Valid corporate email');
assert(Validator.validateEmail('user+tag@domain.co.uk').isValid, 'Valid tagged email');
assert(!Validator.validateEmail('test@').isValid, 'Reject incomplete email test@');
assert(!Validator.validateEmail('test@domain').isValid, 'Reject missing TLD');
assert(!Validator.validateEmail('').isValid, 'Reject empty email');

// 3. Phone validation
assert(Validator.validatePhone('+1 (555) 382-9471').isValid, 'Valid US format with +1');
assert(Validator.validatePhone('+44 20 7946 0958').isValid, 'Valid UK format');
assert(Validator.validatePhone('9876543210').isValid, 'Valid 10-digit national number');
assert(!Validator.validatePhone('123').isValid, 'Reject short number 123');
assert(!Validator.validatePhone('call-me-now').isValid, 'Reject letters in phone');

// 4. Honeypot check
assert(Validator.isHoneypotClean(''), 'Honeypot empty is valid (human)');
assert(Validator.isHoneypotClean(undefined), 'Honeypot undefined is valid');
assert(!Validator.isHoneypotClean('http://spam-bot.xyz'), 'Honeypot populated is rejected (bot)');

// 5. Formula Injection Sanitization
assert(sanitizeForSpreadsheet('=SUM(A1:A10)') === "'=SUM(A1:A10)", 'Escape formula starting with =');
assert(sanitizeForSpreadsheet('+12345') === "'+12345", 'Escape starting with +');
assert(sanitizeForSpreadsheet('-cmd|/c calc') === "'-cmd|/c calc", 'Escape command starting with -');
assert(sanitizeForSpreadsheet('@SUM') === "'@SUM", 'Escape starting with @');
assert(sanitizeForSpreadsheet('Regular Text') === 'Regular Text', 'Preserve benign regular text without quotes');

console.log(`\nResults: ${totalPassed} passed, ${totalFailed} failed.`);
if (totalFailed > 0) process.exit(1);
