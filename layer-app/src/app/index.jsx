import React from 'react';
import { Redirect } from 'expo-router';

export default function Index() {
  // Always open Login Portal first on app launch as requested
  return <Redirect href="/(auth)" />;
}
