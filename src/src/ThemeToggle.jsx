import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { THEME_STORAGE_KEY } from './theme'
import './ThemeToggle.css'

function currentTheme() {
  const chosen = document.documentElement.dataset.theme
  if (chosen) return chosen
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  const toggleTheme = () => {
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // storage unavailable — theme still applies for this session
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  )
}
