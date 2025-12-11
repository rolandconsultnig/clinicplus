import React, { createContext, useContext, useEffect, useState } from 'react';
import { themeService } from '../services/themeService';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Make themeService available globally
    window.themeService = themeService;
    
    // Load theme from settings if available
    const loadThemeFromSettings = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const response = await fetch('/api/settings/appearance', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings && data.settings.theme) {
              const themeFromSettings = data.settings.theme;
              setCurrentTheme(themeFromSettings);
              themeService.setStoredTheme(themeFromSettings);
              return themeFromSettings;
            }
          }
        }
      } catch (error) {
        console.warn('Could not load theme from settings:', error);
      }
      return currentTheme;
    };
    
    // Load the current theme
    const loadTheme = async () => {
      try {
        const themeToLoad = await loadThemeFromSettings();
        await themeService.loadTheme(themeToLoad);
      } catch (error) {
        console.error('Error loading theme:', error);
        // Fallback to stored theme
        try {
          await themeService.loadTheme(currentTheme);
        } catch (fallbackError) {
          console.error('Error loading fallback theme:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  const switchTheme = async (themeName) => {
    try {
      await themeService.loadTheme(themeName);
      await themeService.saveThemePreference(themeName);
      setCurrentTheme(themeName);
      return true;
    } catch (error) {
      console.error('Error switching theme:', error);
      return false;
    }
  };

  const value = {
    currentTheme,
    switchTheme,
    getAllThemes: () => themeService.getAllThemes(),
    getThemeInfo: (name) => themeService.getThemeInfo(name),
    loading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

