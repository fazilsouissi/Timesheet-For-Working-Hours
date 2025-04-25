// components/ThemeToggle.jsx
'use client'

import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light')

  // On mount: read saved theme or system preference
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'

    const initial = (saved === 'dark' || (!saved && system)) ? 'dark' : 'light'
    setTheme(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('theme', next)
  }

  return (
      <button
          onClick={toggle}
          aria-label="Toggle dark mode"
          className="p-2 rounded focus:outline-none focus:ring
                 bg-gray-200 dark:bg-gray-700
                 text-gray-800 dark:text-gray-100"
      >
        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
  )
}
