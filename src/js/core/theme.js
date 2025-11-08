/* ============================================
   THEME MODULE
   CodeLapras - Theme Management & Switching
   ============================================ */

// ============ Theme Constants ============
/**
 * Default theme token values for dark/light/high-contrast modes
 */
const DEFAULT_TOKENS = {
  dark: {
    bg: '#0b0e12',
    bg2: '#10151c',
    text: '#e7ecf2',
    muted: '#aab4c2',
    accent: '#18d47b',
    danger: '#ff5e6a',
    warn: '#ffb020',
    card: '#0f141b',
    border: '#233041',
    shadow: 'rgba(0,0,0,.35)'
  },
  light: {
    bg: '#f5f8fc',
    bg2: '#ffffff',
    text: '#0f1720',
    muted: '#4a5a6f',
    accent: '#09e3f3',
    danger: '#c62828',
    warn: '#b26a00',
    card: '#ffffff',
    border: '#d9e3ef',
    shadow: 'rgba(0,0,0,.12)'
  },
  hc: {
    border: '#4aa3ff',
    muted: '#dfe7f2'
  }
};

/**
 * Color keys for theme editor
 */
const COLOR_KEYS = ['bg', 'bg2', 'text', 'muted', 'accent', 'danger', 'warn', 'card', 'border', 'shadow'];

// ============ Theme Resolution ============
/**
 * Resolve effective theme mode (handles 'auto' preference)
 * @param {string} pref - Theme preference ('dark', 'light', or 'auto')
 * @returns {string} Effective mode ('dark' or 'light')
 */
function getEffectiveMode(pref = (window.settings?.themeMode || window.theme || 'dark')) {
  if (pref === 'auto') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  }
  return pref;
}

// ============ Theme Application ============
/**
 * Apply theme to document root
 * - Merges base tokens with custom tokens
 * - Handles high-contrast mode
 * - Persists theme preference
 */
function applyTheme() {
  if (!window.settings) return;

  // Resolve actual rendering mode
  const mode = getEffectiveMode(window.settings.themeMode || window.theme || 'dark');

  const root = document.documentElement;
  root.classList.toggle('light', mode === 'light');
  root.classList.toggle('dark', mode !== 'light');
  root.style.colorScheme = (mode === 'light' ? 'light' : 'dark');

  // Merge base + custom tokens
  const base = DEFAULT_TOKENS[mode] || {};
  const custom = (window.settings.themeTokens && window.settings.themeTokens[mode]) || {};
  const tok = Object.assign({}, base, custom);

  // Apply variables
  const setVar = (k, v) => (v != null) && root.style.setProperty('--' + k, String(v));
  COLOR_KEYS.forEach(k => setVar(k, tok[k]));

  // Keep a secondary accent if your CSS uses it
  root.style.setProperty('--accent-2', tok.accent || base.accent || getComputedStyle(root).getPropertyValue('--accent-2') || '#4fd8f0');

  // High contrast overlay
  root.classList.toggle('hc', !!window.settings.highContrast);
  if (window.settings.highContrast) {
    const hc = (window.settings.themeTokens && window.settings.themeTokens.hc) || {};
    Object.keys(hc).forEach(k => setVar(k, hc[k]));
  }

  // Persist last-effective mode for quick toggle
  if (typeof LS !== 'undefined') {
    LS.set('inv.theme', mode);
  }
}

// ============ Theme Editor UI Sync ============
/**
 * Keep Settings → Theme Colors pickers synced with the active palette
 */
function syncThemeEditorUI() {
  if (!window.settings) return;

  const dlg = document.getElementById('dlgSettings');
  if (!dlg?.open) return;

  const selMode = document.getElementById('setThemeMode');
  const selColor = document.getElementById('setColorMode');

  if (selMode) selMode.value = window.settings.themeMode || 'dark';

  const currentPalette = window.settings.highContrast ? 'hc' : getEffectiveMode();
  if (selColor) selColor.value = currentPalette;

  if (typeof window.fillColorInputs === 'function') {
    window.fillColorInputs(currentPalette);
  }
}

/**
 * Fill color input fields in settings dialog
 * @param {string} mode - Theme mode ('dark', 'light', or 'hc')
 */
function fillColorInputs(mode) {
  if (!window.settings) return;

  const tokens = window.settings.themeTokens || DEFAULT_TOKENS;
  const palette = tokens[mode] || {};

  COLOR_KEYS.forEach(key => {
    const input = document.getElementById(`color_${key}`);
    if (input && palette[key]) {
      input.value = palette[key];
    }
  });
}

/**
 * Push color change to settings and apply
 * @param {string} mode - Theme mode
 * @param {string} key - Color key
 * @param {string} value - Color value
 */
function pushColorChange(mode, key, value) {
  if (!window.settings) return;

  if (!window.settings.themeTokens) {
    window.settings.themeTokens = JSON.parse(JSON.stringify(DEFAULT_TOKENS));
  }

  if (!window.settings.themeTokens[mode]) {
    window.settings.themeTokens[mode] = {};
  }

  window.settings.themeTokens[mode][key] = value;

  // Save to localStorage if available
  if (typeof LS !== 'undefined') {
    LS.set('inv.settings', window.settings);
  }

  // Reapply theme to see changes
  applyTheme();
}

/**
 * Reset theme tokens to defaults
 * @param {string} mode - Theme mode to reset (or 'all' for all modes)
 */
function resetThemeTokens(mode = 'all') {
  if (!window.settings) return;

  if (mode === 'all') {
    window.settings.themeTokens = JSON.parse(JSON.stringify(DEFAULT_TOKENS));
  } else if (DEFAULT_TOKENS[mode]) {
    if (!window.settings.themeTokens) {
      window.settings.themeTokens = JSON.parse(JSON.stringify(DEFAULT_TOKENS));
    }
    window.settings.themeTokens[mode] = JSON.parse(JSON.stringify(DEFAULT_TOKENS[mode]));
  }

  if (typeof LS !== 'undefined') {
    LS.set('inv.settings', window.settings);
  }

  applyTheme();
  syncThemeEditorUI();
}

// ============ System Theme Change Listener ============
/**
 * Initialize system theme change listener
 * Automatically updates theme when system preference changes (if set to 'auto')
 */
function initSystemThemeListener() {
  try {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', () => {
      if ((window.settings?.themeMode || 'dark') === 'auto') {
        applyTheme();
        if (!window.settings?.highContrast) {
          syncThemeEditorUI();
        }
      }
    });
  } catch (err) {
    console.warn('System theme listener not supported:', err);
  }
}

// ============ Initialize Theme Tokens ============
/**
 * Initialize theme tokens in settings if not present
 */
function initializeThemeTokens() {
  if (!window.settings) {
    window.settings = {};
  }

  if (!window.settings.themeTokens) {
    window.settings.themeTokens = JSON.parse(JSON.stringify(DEFAULT_TOKENS));
    if (typeof LS !== 'undefined') {
      LS.set('inv.settings', window.settings);
    }
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.getEffectiveMode = getEffectiveMode;
  window.applyTheme = applyTheme;
  window.syncThemeEditorUI = syncThemeEditorUI;
  window.fillColorInputs = fillColorInputs;
  window.pushColorChange = pushColorChange;
  window.resetThemeTokens = resetThemeTokens;
  window.initSystemThemeListener = initSystemThemeListener;
  window.initializeThemeTokens = initializeThemeTokens;
  window.DEFAULT_TOKENS = DEFAULT_TOKENS;
  window.COLOR_KEYS = COLOR_KEYS;
}
