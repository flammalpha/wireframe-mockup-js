/**
 * Current manually selected theme, if any ('light', 'dark', or null for system default).
 * @type {string|null}
 */
let manualTheme = null;

/**
 * Applies the current theme to the document, prioritizing manualTheme, then system preference.
 */
function applySystemTheme() {
    if (manualTheme) {
        document.body.setAttribute('data-theme', manualTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.setAttribute('data-theme', 'light');
    }
    updateDarkModeToggleLabel();
}

/**
 * Toggles between light and dark themes manually.
 */
function toggleTheme() {
    if (document.body.getAttribute('data-theme') === 'dark') {
        manualTheme = 'light';
    } else {
        manualTheme = 'dark';
    }
    applySystemTheme();
}

/**
 * Updates the dark mode toggle button label to reflect the current theme state.
 */
function updateDarkModeToggleLabel() {
    const btn = document.getElementById('darkModeToggle');
    if (!btn) return;
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
}

applySystemTheme();

// Listen for system theme changes and apply theme if in system mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!manualTheme) applySystemTheme();
});