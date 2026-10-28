import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '../services/storage.js';

export function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light' | 'system'>(() => {
    return loadSettings().theme || 'dark';
  });

  useEffect(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    }

    const currentSettings = loadSettings();
    if (currentSettings.theme !== theme) {
      saveSettings({ ...currentSettings, theme });
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, setTheme: setThemeState, toggleTheme };
}
