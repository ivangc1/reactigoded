import { useState, useEffect } from 'react'

/**
 * Hook para manejar el tema (dark/light) de la aplicación
 * @returns {{ theme: string, setTheme: function, toggleTheme: function }}
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.dataset.theme || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme, toggleTheme }
}
