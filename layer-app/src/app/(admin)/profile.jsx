import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    photoUrl: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const storedPhoto = await AsyncStorage.getItem('profilePhotoUrl');
        const storedName = await AsyncStorage.getItem('profileName');
        const response = await fastFetch(`${API_BASE_URL}/api/admin/profile`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            name: storedName || (data.name && data.name !== 'Senior Advocate' ? data.name : '') || '',
            phone: data.phone || '',
            email: data.email || '',
            photoUrl: storedPhoto || data.photoUrl || null,
          });
        }
      } catch (error) {
        console.error('Error loading admin profile:', error);
        const storedPhoto = await AsyncStorage.getItem('profilePhotoUrl');
        const storedName = await AsyncStorage.getItem('profileName');
        setFormData((prev) => ({
          ...prev,
          name: storedName || '',
          photoUrl: storedPhoto || null,
        }));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, photoUrl: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (formData.name && formData.name.trim()) {
        await AsyncStorage.setItem('profileName', formData.name.trim());
      }
      if (formData.photoUrl) {
        await AsyncStorage.setItem('profilePhotoUrl', formData.photoUrl);
      }

      const apiUrl = `${API_BASE_URL}/api/admin/profile`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => router.replace('/(admin)/dashboard') },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save profile to server.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Saved Locally', 'Profile saved locally on your device.');
      router.replace('/(admin)/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0B1120' : '#FFFFFF'} />
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.subCardBg }]} 
          onPress={() => router.replace('/(admin)/settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile Information</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primaryButtonBg} />
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.photoContainer}>
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}>
              {formData.photoUrl ? (
                <Image
                  source={{ uri: formData.photoUrl }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                />
              ) : (
                <Ionicons name="person" size={44} color={colors.textSecondary} />
              )}
            </View>
            <TouchableOpacity 
              style={[styles.photoEditButton, { backgroundColor: colors.card, borderColor: colors.borderInput }]} 
              onPress={pickImage}
            >
              <Ionicons name="camera-outline" size={16} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={[styles.photoEditText, { color: colors.text }]}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Senior Advocate Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text }]}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="e.g. Senior Adv. Rajesh"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text }]}
                value={formData.phone}
                onChangeText={(t) => setFormData({ ...formData, phone: t })}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text }]}
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="advocate@chamber.com"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primaryButtonBg }, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>Save Profile Information</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
  },
  photoEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  photoEditText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
