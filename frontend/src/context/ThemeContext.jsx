import React, { createContext, useContext, useState, useEffect } from 'react';

export const FONT_THEMES = [
  { id: 'inter', name: 'Inter (Silicon Valley / Linear)', displayFamily: "'Inter', system-ui, -apple-system, sans-serif" },
  { id: 'jakarta', name: 'Plus Jakarta Sans (Executive)', displayFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" },
  { id: 'dmsans', name: 'DM Sans (Clean Fintech)', displayFamily: "'DM Sans', system-ui, -apple-system, sans-serif" },
  { id: 'outfit', name: 'Outfit (Modern Tech)', displayFamily: "'Outfit', system-ui, -apple-system, sans-serif" },
];

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  isDark: true,
  fontTheme: 'inter',
  setFontTheme: () => {},
  fontThemes: FONT_THEMES,
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = sessionStorage.getItem('voila_theme');
    if (saved) return saved;
    return 'dark';
  });

  const [fontTheme, setFontTheme] = useState(() => {
    const saved = sessionStorage.getItem('voila_font_theme');
    if (saved && FONT_THEMES.some(f => f.id === saved)) return saved;
    // Default to ultra-clean Inter
    return 'inter';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    sessionStorage.setItem('voila_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    // Remove previous font theme classes
    FONT_THEMES.forEach(f => root.classList.remove(`font-theme-${f.id}`));
    root.classList.add(`font-theme-${fontTheme}`);

    const activeObj = FONT_THEMES.find(f => f.id === fontTheme) || FONT_THEMES[0];
    root.style.setProperty('--font-display-active', activeObj.displayFamily);

    sessionStorage.setItem('voila_font_theme', fontTheme);
  }, [fontTheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      isDark,
      fontTheme,
      setFontTheme,
      fontThemes: FONT_THEMES
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
