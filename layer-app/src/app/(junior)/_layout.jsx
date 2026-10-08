import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';

export default function JuniorLayout() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 54 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: '#064E3B',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Cases',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "folder-open" : "folder-open-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="amount-entry"
        options={{
          title: 'Amount Entry',
          tabBarItemStyle: { paddingTop: 3 },
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Hearing',
          tabBarItemStyle: { paddingTop: 3 },
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarItemStyle: { paddingTop: 3 },
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="case-details"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
