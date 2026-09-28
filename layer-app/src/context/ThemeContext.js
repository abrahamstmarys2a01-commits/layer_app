import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/api';

export const ThemeColors = {
  light: {
    isDark: false,
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#F1F5F9',
    borderInput: '#E2E8F0',
    inputBg: '#F8FAFC',
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#F1F5F9',
    tabActive: '#0F172A',
    tabInactive: '#94A3B8',
    primaryButtonBg: '#0F172A',
    primaryButtonText: '#FFFFFF',
    iconCircleBg: '#F1F5F9',
    iconColor: '#0F172A',
    modalBg: '#FFFFFF',
    bannerBg: '#FFFFFF',
    subCardBg: '#F8FAFC',
    badgeText: '#4F46E5',
    badgeBg: '#EEF2FF',
  },
  dark: {
    isDark: true,
    background: '#0B1120',
    card: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    border: '#334155',
    borderInput: '#334155',
    inputBg: '#0B1120',
    tabBarBg: '#1E293B',
    tabBarBorder: '#334155',
    tabActive: '#60A5FA',
    tabInactive: '#64748B',
    primaryButtonBg: '#3B82F6',
    primaryButtonText: '#FFFFFF',
    iconCircleBg: '#334155',
    iconColor: '#F8FAFC',
    modalBg: '#1E293B',
    bannerBg: '#1E293B',
    subCardBg: '#0F172A',
    badgeText: '#93C5FD',
    badgeBg: '#1E3A8A',
  },
};

const ThemeContext = createContext({
  themeMode: 'Light',
  isDark: false,
  colors: ThemeColors.light,
  setThemeMode: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useNativeColorScheme();
  const [themeMode, setThemeModeState] = useState('Light');

  useEffect(() => {
    const initTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('@app_theme');
        if (storedTheme) {
          setThemeModeState(storedTheme);
        } else {
          const res = await fetch(`${API_BASE_URL}/api/admin/profile`);
          if (res.ok) {
            const data = await res.json();
            if (data.theme) {
              setThemeModeState(data.theme);
              await AsyncStorage.setItem('@app_theme', data.theme);
            }
          }
        }
      } catch (e) {
        console.error('Error loading theme:', e);
      }
    };
    initTheme();
  }, []);

  const setThemeMode = async (mode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('@app_theme', mode);
      // Sync to backend
      fetch(`${API_BASE_URL}/api/admin/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: mode }),
      }).catch((err) => console.log('Theme sync error:', err));
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  };

  const activeMode =
    themeMode === 'System'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeMode.toLowerCase() === 'dark'
      ? 'dark'
      : 'light';

  const isDark = activeMode === 'dark';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
