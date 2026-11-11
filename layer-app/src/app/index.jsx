import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { warmUpServer, preloadAppData } from '../constants/api';

export default function Index() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    // 1. Instantly warm up Render server & preload cache in background
    warmUpServer();
    preloadAppData();

    // 2. Check if user already logged in so app opens instantly
    async function checkAuth() {
      try {
        const role = await AsyncStorage.getItem('@user_role');
        if (role === 'admin') {
          setTarget('/(admin)/dashboard');
        } else if (role === 'junior') {
          setTarget('/(junior)/dashboard');
        } else {
          setTarget('/(auth)');
        }
      } catch (e) {
        setTarget('/(auth)');
      }
    }
    checkAuth();
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B1729', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return <Redirect href={target} />;
}
