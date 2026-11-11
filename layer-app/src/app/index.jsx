import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { warmUpServer, preloadAppData } from '../constants/api';

export default function Index() {
  useEffect(() => {
    // Warm up server and preload data in background for fast loading
    warmUpServer();
    preloadAppData();
  }, []);

  // Always open Login Portal first on app launch as requested
  return <Redirect href="/(auth)" />;
}
