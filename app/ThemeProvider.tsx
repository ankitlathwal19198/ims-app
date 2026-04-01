'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  themes: Theme[];
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themes: Theme[] = ['light', 'dark'];
  const [theme, setThemeState] = useState<Theme>('light');

  // initial load
  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme) || 'light';
    const safe: Theme = stored === 'dark' ? 'dark' : 'light';
    setThemeState(safe);
  }, []);

  // apply to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themes, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
