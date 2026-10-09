import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState('light'); // dummy state

  const handleSelect = (t) => {
    setTheme(t);
    // Real app would save this in Context or AsyncStorage
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(admin)/settings')}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theme Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.option} onPress={() => handleSelect('light')}>
            <View style={styles.optionLeft}>
              <Ionicons name="sunny-outline" size={24} color="#0F172A" />
              <Text style={styles.optionText}>Light Mode</Text>
            </View>
            <View style={[styles.radio, theme === 'light' && styles.radioSelected]}>
              {theme === 'light' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.option} onPress={() => handleSelect('dark')}>
            <View style={styles.optionLeft}>
              <Ionicons name="moon-outline" size={24} color="#0F172A" />
              <Text style={styles.optionText}>Dark Mode</Text>
            </View>
            <View style={[styles.radio, theme === 'dark' && styles.radioSelected]}>
              {theme === 'dark' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? 48 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF' },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '500', color: '#0F172A', marginLeft: 12 },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: '#3B82F6' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6' },
});