/* ============================================
   FORM BUILDERS & UTILITIES
   CodeLapras - Form Data Extraction & Population
   ============================================ */

/**
 * Form Builder Utilities
 * Provides functions to populate forms from data objects,
 * extract data from forms, and manipulate form state.
 */

// ============ Form Data Functions ============

/**
 * Populate form fields from data object
 * @param {HTMLElement} formElement - Form element or dialog containing form
 * @param {object} data - Data object to populate form with
 * @param {object} options - Options { clearFirst: boolean }
 */
function populateForm(formElement, data = {}, options = {}) {
  if (!formElement || !data) return;

  const config = {
    clearFirst: options.clearFirst !== false // Default true
  };

  // If formElement is a dialog, find form inside it
  const form = formElement.tagName === 'FORM' ? formElement : formElement.querySelector('form');
  const container = form || formElement;

  // Clear form first if requested
  if (config.clearFirst) {
    clearForm(container);
  }

  // Populate each field
  for (const [key, value] of Object.entries(data)) {
    const field = container.querySelector(`[name="${key}"], #${key}`);

    if (field) {
      setFieldValue(field, value);
    }
  }
}

/**
 * Extract data object from form fields
 * @param {HTMLElement} formElement - Form element or dialog containing form
 * @param {object} options - Options { includeEmpty: boolean, typeConversion: boolean }
 * @returns {object} Data object extracted from form
 */
function extractFormData(formElement, options = {}) {
  if (!formElement) return {};

  const config = {
    includeEmpty: options.includeEmpty !== false, // Default true
    typeConversion: options.typeConversion !== false // Default true
  };

  // If formElement is a dialog, find form inside it
  const form = formElement.tagName === 'FORM' ? formElement : formElement.querySelector('form');
  const container = form || formElement;

  const data = {};

  // Get all input fields
  const fields = container.querySelectorAll('input, textarea, select');

  fields.forEach(field => {
    const name = field.name || field.id;

    if (!name) return; // Skip fields without name/id

    const type = field.type?.toLowerCase();

    // Handle radio buttons (only get checked one)
    if (type === 'radio') {
      if (field.checked) {
        data[name] = config.typeConversion ? convertValue(field.value, type) : field.value;
      }
      return;
    }

    // Handle checkboxes
    if (type === 'checkbox') {
      data[name] = field.checked;
      return;
    }

    // Get value
    const value = field.value;

    // Skip empty values if not including them
    if (!config.includeEmpty && (value === '' || value === null || value === undefined)) {
      return;
    }

    // Convert value type if requested
    data[name] = config.typeConversion ? convertValue(value, type) : value;
  });

  return data;
}

/**
 * Convert value to appropriate type based on input type
 * @param {string} value - Value to convert
 * @param {string} type - Input type
 * @returns {*} Converted value
 */
function convertValue(value, type) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  switch (type) {
    case 'number':
    case 'range':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;

    case 'date':
    case 'datetime-local':
    case 'time':
      return value; // Keep as string (ISO format)

    case 'checkbox':
      return Boolean(value);

    default:
      return value;
  }
}

/**
 * Clear all form fields
 * @param {HTMLElement} formElement - Form element or dialog containing form
 */
function clearForm(formElement) {
  if (!formElement) return;

  // If formElement is a dialog, find form inside it
  const form = formElement.tagName === 'FORM' ? formElement : formElement.querySelector('form');
  const container = form || formElement;

  // Get all input fields
  const fields = container.querySelectorAll('input, textarea, select');

  fields.forEach(field => {
    const type = field.type?.toLowerCase();

    if (type === 'checkbox' || type === 'radio') {
      field.checked = false;
    } else if (field.tagName === 'SELECT') {
      field.selectedIndex = 0;
    } else {
      field.value = '';
    }
  });

  // Clear any validation errors
  if (typeof clearFormErrors === 'function') {
    clearFormErrors(container);
  }
}

/**
 * Set readonly state for all form fields
 * @param {HTMLElement} formElement - Form element or dialog containing form
 * @param {boolean} readonly - Whether to set readonly (true) or editable (false)
 */
function setFormReadonly(formElement, readonly = true) {
  if (!formElement) return;

  const form = formElement.tagName === 'FORM' ? formElement : formElement.querySelector('form');
  const container = form || formElement;

  const fields = container.querySelectorAll('input, textarea, select, button');

  fields.forEach(field => {
    if (readonly) {
      if (field.tagName === 'BUTTON') {
        field.disabled = true;
      } else {
        field.setAttribute('readonly', 'true');
        if (field.tagName === 'SELECT') {
          field.disabled = true;
        }
      }
    } else {
      field.removeAttribute('readonly');
      field.disabled = false;
    }
  });
}

/**
 * Get only changed fields from form compared to original data
 * @param {HTMLElement} formElement - Form element
 * @param {object} originalData - Original data to compare against
 * @returns {object} Object containing only changed fields
 */
function getFormChanges(formElement, originalData = {}) {
  if (!formElement) return {};

  const currentData = extractFormData(formElement);
  const changes = {};

  for (const [key, value] of Object.entries(currentData)) {
    const originalValue = originalData[key];

    // Compare values (handle null/undefined equality)
    if (value !== originalValue) {
      // Special handling for numbers and strings
      if (typeof value === 'number' && typeof originalValue === 'string') {
        if (value !== parseFloat(originalValue)) {
          changes[key] = value;
        }
      } else if (value !== originalValue) {
        changes[key] = value;
      }
    }
  }

  return changes;
}

// ============ Field Helpers ============

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

/**
 * Set field value with proper type handling
 * @param {HTMLElement} fieldElement - Field element
 * @param {*} value - Value to set
 */
function setFieldValue(fieldElement, value) {
  if (!fieldElement) return;

  const type = fieldElement.type?.toLowerCase();
  const tagName = fieldElement.tagName?.toLowerCase();

  // Handle null/undefined
  if (value === null || value === undefined) {
    if (type === 'checkbox') {
      fieldElement.checked = false;
    } else {
      fieldElement.value = '';
    }
    return;
  }

  // Checkbox
  if (type === 'checkbox') {
    fieldElement.checked = Boolean(value);
    return;
  }

  // Radio
  if (type === 'radio') {
    if (fieldElement.value === String(value)) {
      fieldElement.checked = true;
    }
    return;
  }

  // Select
  if (tagName === 'select') {
    fieldElement.value = String(value);
    return;
  }

  // Number input
  if (type === 'number') {
    fieldElement.value = value === '' ? '' : String(value);
    return;
  }

  // Date inputs
  if (type === 'date' || type === 'datetime-local' || type === 'time') {
    // Convert ISO string to appropriate format
    if (typeof value === 'string') {
      if (type === 'date' && value.includes('T')) {
        fieldElement.value = value.split('T')[0];
      } else {
        fieldElement.value = value;
      }
    } else {
      fieldElement.value = String(value);
    }
    return;
  }

  // Default: set as string
  fieldElement.value = String(value);
}

/**
 * Check if field is empty
 * @param {HTMLElement} fieldElement - Field element
 * @returns {boolean} True if field is empty
 */
function isFieldEmpty(fieldElement) {
  if (!fieldElement) return true;

  const type = fieldElement.type?.toLowerCase();

  if (type === 'checkbox' || type === 'radio') {
    return !fieldElement.checked;
  }

  const value = fieldElement.value;
  return value === '' || value === null || value === undefined;
}

/**
 * Enable/disable a field
 * @param {HTMLElement} fieldElement - Field element
 * @param {boolean} enabled - Whether to enable (true) or disable (false)
 */
function setFieldEnabled(fieldElement, enabled = true) {
  if (!fieldElement) return;

  if (enabled) {
    fieldElement.disabled = false;
    fieldElement.removeAttribute('readonly');
  } else {
    fieldElement.disabled = true;
  }
}

/**
 * Focus first empty required field in form
 * @param {HTMLElement} formElement - Form element
 * @returns {boolean} True if field was focused
 */
function focusFirstEmptyField(formElement) {
  if (!formElement) return false;

  const form = formElement.tagName === 'FORM' ? formElement : formElement.querySelector('form');
  const container = form || formElement;

  // Find first empty required field
  const requiredFields = container.querySelectorAll('[required]');

  for (const field of requiredFields) {
    if (isFieldEmpty(field)) {
      field.focus();
      return true;
    }
  }

  // If no empty required fields, focus first input
  const firstInput = container.querySelector('input, textarea, select');
  if (firstInput) {
    firstInput.focus();
    return true;
  }

  return false;
}

/**
 * Serialize form data to URL search params
 * @param {HTMLElement} formElement - Form element
 * @returns {string} URL-encoded query string
 */
function serializeForm(formElement) {
  if (!formElement) return '';

  const data = extractFormData(formElement);
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  }

  return params.toString();
}

/**
 * Deserialize URL search params to form data
 * @param {HTMLElement} formElement - Form element
 * @param {string|URLSearchParams} params - URL search params
 */
function deserializeForm(formElement, params) {
  if (!formElement || !params) return;

  const searchParams = typeof params === 'string' ? new URLSearchParams(params) : params;
  const data = {};

  for (const [key, value] of searchParams.entries()) {
    data[key] = value;
  }

  populateForm(formElement, data);
}

// Export to window object
if (typeof window !== 'undefined') {
  // Form data functions
  window.populateForm = populateForm;
  window.extractFormData = extractFormData;
  window.clearForm = clearForm;
  window.setFormReadonly = setFormReadonly;
  window.getFormChanges = getFormChanges;

  // Field helpers
  window.setFieldValue = setFieldValue;
  window.isFieldEmpty = isFieldEmpty;
  window.setFieldEnabled = setFieldEnabled;
  window.focusFirstEmptyField = focusFirstEmptyField;

  // Serialization
  window.serializeForm = serializeForm;
  window.deserializeForm = deserializeForm;
}

console.log('Form builders initialized');
