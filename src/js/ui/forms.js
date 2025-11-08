/* ============================================
   FORM VALIDATION SYSTEM
   CodeLapras - Reusable Form Validation & Error Display
   ============================================ */

/**
 * Form Validation System
 * Provides consistent form validation, error display, and real-time feedback
 * across the application.
 */

// ============ Built-in Validators ============

/**
 * Required field validator
 * @param {string} message - Custom error message
 * @returns {Function} Validator function
 */
function required(message = 'This field is required') {
  return (value) => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return message;
    }
    return null; // Valid
  };
}

/**
 * Email format validator
 * @param {string} message - Custom error message
 * @returns {Function} Validator function
 */
function email(message = 'Please enter a valid email address') {
  return (value) => {
    if (!value) return null; // Empty is valid (use required() separately)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value) ? null : message;
  };
}

/**
 * Phone format validator
 * @param {string} message - Custom error message
 * @returns {Function} Validator function
 */
function phone(message = 'Please enter a valid phone number') {
  return (value) => {
    if (!value) return null; // Empty is valid (use required() separately)
    const phonePattern = /^[\d\s\-\(\)\+]+$/;
    const digitsOnly = value.replace(/\D/g, '');
    if (!phonePattern.test(value) || digitsOnly.length < 10) {
      return message;
    }
    return null;
  };
}

/**
 * Number validator
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @param {string} message - Custom error message
 * @returns {Function} Validator function
 */
function number(min = null, max = null, message = null) {
  return (value) => {
    if (!value && value !== 0) return null; // Empty is valid

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
      return message || 'Please enter a valid number';
    }

    if (min !== null && num < min) {
      return message || `Value must be at least ${min}`;
    }

    if (max !== null && num > max) {
      return message || `Value must be at most ${max}`;
    }

    return null;
  };
}

/**
 * Minimum length validator
 * @param {number} length - Minimum length
 * @param {string} message - Custom error message
 * @returns {Function} Validator function
 */
function minLength(length, message = null) {
  return (value) => {
    if (!value) return null; // Empty is valid
    if (value.length < length) {
      return message || `Must be at least ${length} characters`;
    }
    return null;
  };
}

/**
 * Maximum length validator
 * @param {number} length - Maximum length
 * @param {string} message - Custom error message
 * @returns {Function} Validator function
 */
function maxLength(length, message = null) {
  return (value) => {
    if (!value) return null; // Empty is valid
    if (value.length > length) {
      return message || `Must be at most ${length} characters`;
    }
    return null;
  };
}

/**
 * Minimum value validator
 * @param {number} threshold - Minimum value
 * @param {string} message - Custom error message
 * @returns {Function} Validator function
 */
function min(threshold, message = null) {
  return (value) => {
    if (!value && value !== 0) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num < threshold) {
      return message || `Value must be at least ${threshold}`;
    }
    return null;
  };
}

/**
 * Maximum value validator
 * @param {number} threshold - Maximum value
 * @param {string} message - Custom error message
 * @returns {Function} Validator function
 */
function max(threshold, message = null) {
  return (value) => {
    if (!value && value !== 0) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num > threshold) {
      return message || `Value must be at most ${threshold}`;
    }
    return null;
  };
}

/**
 * Pattern (regex) validator
 * @param {RegExp|string} regex - Regular expression to match
 * @param {string} message - Custom error message
 * @returns {Function} Validator function
 */
function pattern(regex, message = 'Invalid format') {
  return (value) => {
    if (!value) return null; // Empty is valid
    const re = typeof regex === 'string' ? new RegExp(regex) : regex;
    return re.test(value) ? null : message;
  };
}

/**
 * Custom validator
 * @param {Function} validatorFn - Custom validation function (value) => error message or null
 * @returns {Function} Validator function
 */
function custom(validatorFn) {
  return (value) => {
    try {
      return validatorFn(value);
    } catch (err) {
      console.error('Custom validator error:', err);
      return 'Validation error';
    }
  };
}

// ============ Validation Functions ============

/**
 * Validate a single field with an array of validators
 * @param {HTMLElement} fieldElement - Field element to validate
 * @param {Array<Function>} validators - Array of validator functions
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateField(fieldElement, validators = []) {
  if (!fieldElement) {
    return { isValid: true, errors: [] };
  }

  const value = getFieldValue(fieldElement);
  const errors = [];

  for (const validator of validators) {
    const error = validator(value);
    if (error) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate entire form with schema
 * @param {HTMLElement} formElement - Form element to validate
 * @param {object} schema - Validation schema { fieldName: [validators...] }
 * @returns {object} { isValid: boolean, errors: { fieldName: string[] } }
 */
function validateForm(formElement, schema = {}) {
  if (!formElement) {
    return { isValid: true, errors: {} };
  }

  const allErrors = {};
  let isValid = true;

  for (const [fieldName, validators] of Object.entries(schema)) {
    const field = formElement.querySelector(`[name="${fieldName}"], #${fieldName}`);

    if (!field) {
      console.warn(`Field not found: ${fieldName}`);
      continue;
    }

    const result = validateField(field, validators);

    if (!result.isValid) {
      allErrors[fieldName] = result.errors;
      isValid = false;
    }
  }

  return {
    isValid,
    errors: allErrors
  };
}

/**
 * Get typed value from field element
 * @param {HTMLElement} fieldElement - Field element
 * @returns {*} Field value (string, number, boolean, etc.)
 */
function getFieldValue(fieldElement) {
  if (!fieldElement) return null;

  const type = fieldElement.type?.toLowerCase();
  const tagName = fieldElement.tagName?.toLowerCase();

  // Checkbox
  if (type === 'checkbox') {
    return fieldElement.checked;
  }

  // Radio
  if (type === 'radio') {
    const form = fieldElement.closest('form') || document;
    const selected = form.querySelector(`input[name="${fieldElement.name}"]:checked`);
    return selected ? selected.value : null;
  }

  // Number input
  if (type === 'number') {
    const val = fieldElement.value;
    return val === '' ? null : parseFloat(val);
  }

  // Select
  if (tagName === 'select') {
    return fieldElement.value;
  }

  // Default: string value
  return fieldElement.value;
}

// ============ Error Display Functions ============

/**
 * Show error message for a field
 * @param {HTMLElement} fieldElement - Field element
 * @param {string} message - Error message to display
 */
function showFieldError(fieldElement, message) {
  if (!fieldElement) return;

  // Add error class to field
  fieldElement.classList.add('field-error');

  // Remove existing error message
  clearFieldError(fieldElement, false);

  // Create error message element
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;
  errorEl.setAttribute('role', 'alert');

  // Insert after field
  if (fieldElement.parentNode) {
    fieldElement.parentNode.insertBefore(errorEl, fieldElement.nextSibling);
  }
}

/**
 * Clear error message from a field
 * @param {HTMLElement} fieldElement - Field element
 * @param {boolean} removeClass - Whether to remove error class (default: true)
 */
function clearFieldError(fieldElement, removeClass = true) {
  if (!fieldElement) return;

  if (removeClass) {
    fieldElement.classList.remove('field-error');
  }

  // Find and remove error message
  const errorEl = fieldElement.nextElementSibling;
  if (errorEl && errorEl.classList.contains('error-message')) {
    errorEl.remove();
  }
}

/**
 * Show all form errors
 * @param {HTMLElement} formElement - Form element
 * @param {object} errors - Errors object { fieldName: [messages...] }
 */
function showFormErrors(formElement, errors = {}) {
  if (!formElement) return;

  // Clear existing errors first
  clearFormErrors(formElement);

  for (const [fieldName, messages] of Object.entries(errors)) {
    const field = formElement.querySelector(`[name="${fieldName}"], #${fieldName}`);

    if (field && messages.length > 0) {
      showFieldError(field, messages[0]); // Show first error
    }
  }

  // Focus first error field
  const firstErrorField = formElement.querySelector('.field-error');
  if (firstErrorField) {
    firstErrorField.focus();
  }
}

/**
 * Clear all form errors
 * @param {HTMLElement} formElement - Form element
 */
function clearFormErrors(formElement) {
  if (!formElement) return;

  // Remove all error classes
  const errorFields = formElement.querySelectorAll('.field-error');
  errorFields.forEach(field => {
    clearFieldError(field);
  });

  // Remove any orphaned error messages
  const errorMessages = formElement.querySelectorAll('.error-message');
  errorMessages.forEach(msg => msg.remove());
}

// ============ Real-time Validation ============

/**
 * Attach real-time validation to form
 * @param {HTMLElement} formElement - Form element
 * @param {object} schema - Validation schema
 */
function attachValidator(formElement, schema = {}) {
  if (!formElement) return;

  for (const [fieldName, validators] of Object.entries(schema)) {
    const field = formElement.querySelector(`[name="${fieldName}"], #${fieldName}`);

    if (!field) continue;

    // Validate on blur
    field.addEventListener('blur', () => {
      const result = validateField(field, validators);

      if (!result.isValid) {
        showFieldError(field, result.errors[0]);
      } else {
        clearFieldError(field);
      }
    });

    // Clear error on input
    field.addEventListener('input', () => {
      if (field.classList.contains('field-error')) {
        clearFieldError(field);
      }
    });
  }
}

/**
 * Detach validation listeners from form
 * @param {HTMLElement} formElement - Form element
 */
function detachValidator(formElement) {
  if (!formElement) return;

  // Clone and replace to remove all event listeners
  const newForm = formElement.cloneNode(true);
  if (formElement.parentNode) {
    formElement.parentNode.replaceChild(newForm, formElement);
  }
}

// ============ Integration with Model Validators ============

/**
 * Convert model validator result to form errors format
 * @param {object} modelResult - Result from model validator { isValid, errors: string[] }
 * @param {object} fieldMapping - Map error messages to field names
 * @returns {object} Form errors format { fieldName: [messages...] }
 */
function convertModelErrors(modelResult, fieldMapping = {}) {
  if (modelResult.isValid) {
    return {};
  }

  const formErrors = {};

  modelResult.errors.forEach(errorMsg => {
    // Try to find field name in error message
    let fieldName = 'general';

    for (const [field, patterns] of Object.entries(fieldMapping)) {
      const patternArray = Array.isArray(patterns) ? patterns : [patterns];

      for (const pattern of patternArray) {
        if (errorMsg.toLowerCase().includes(pattern.toLowerCase())) {
          fieldName = field;
          break;
        }
      }

      if (fieldName !== 'general') break;
    }

    if (!formErrors[fieldName]) {
      formErrors[fieldName] = [];
    }
    formErrors[fieldName].push(errorMsg);
  });

  return formErrors;
}

// Export to window object
if (typeof window !== 'undefined') {
  // Validators
  window.required = required;
  window.email = email;
  window.phone = phone;
  window.number = number;
  window.minLength = minLength;
  window.maxLength = maxLength;
  window.min = min;
  window.max = max;
  window.pattern = pattern;
  window.custom = custom;

  // Validation functions
  window.validateField = validateField;
  window.validateForm = validateForm;
  window.getFieldValue = getFieldValue;

  // Error display
  window.showFieldError = showFieldError;
  window.clearFieldError = clearFieldError;
  window.showFormErrors = showFormErrors;
  window.clearFormErrors = clearFormErrors;

  // Real-time validation
  window.attachValidator = attachValidator;
  window.detachValidator = detachValidator;

  // Model integration
  window.convertModelErrors = convertModelErrors;
}

console.log('Form validation system initialized');
