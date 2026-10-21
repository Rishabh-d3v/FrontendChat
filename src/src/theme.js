export const THEME_STORAGE_KEY = 'theme'

// Applies a previously chosen theme before first render; with no saved
// choice the CSS falls back to the OS preference.
export function applyStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.dataset.theme = saved
    }
  } catch {
    // storage unavailable — follow the system theme
  }
}
