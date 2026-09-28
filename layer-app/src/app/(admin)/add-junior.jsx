import { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../../constants/api';

export default function AddJuniorScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    username: '',
    password: '',
    joiningDate: '',
    isActive: true,
    photoUrl: null,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFormData({ ...formData, photoUrl: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.username.trim() || !formData.password.trim()) {
      Alert.alert('Validation Error', 'Please fill in Name, Mobile, Username, and Password.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/juniors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          juniorName: formData.name.trim(),
          mobileNumber: formData.mobile.trim(),
          email: formData.email.trim(),
          username: formData.username.trim(),
          password: formData.password.trim(),
          joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
          status: formData.isActive ? 'Active' : 'Inactive',
          photoUrl: formData.photoUrl,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Junior associate registered successfully!', [
          {
            text: 'View Roster',
            onPress: () => router.push('/(admin)/juniors-list'),
          },
          {
            text: 'Add Another',
            onPress: () => {
              setFormData({
                name: '',
                mobile: '',
                email: '',
                username: '',
                password: '',
                joiningDate: '',
                isActive: true,
                photoUrl: null,
              });
            },
          },
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert('Registration Failed', errorData.message || 'Unable to register junior.');
      }
    } catch (error) {
      console.error('Error saving junior:', error);
      Alert.alert('Error', 'Network Error. Could not connect to backend server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.topBarTitle}>Add Junior Associate</Text>
          <Text style={styles.topBarSub}>Create new advocate account</Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={20} color="#1E293B" />
            <Text style={styles.sectionTitle}>Personal Details</Text>
          </View>

          <View style={styles.photoUploadContainer}>
            <View style={styles.photoPlaceholder}>
              {formData.photoUrl ? (
                <Image source={{ uri: formData.photoUrl }} style={{ width: 72, height: 72, borderRadius: 36 }} />
              ) : (
                <Ionicons name="camera" size={32} color="#94A3B8" />
              )}
            </View>
            <TouchableOpacity style={styles.photoUploadButton} onPress={pickImage}>
              <Text style={styles.photoUploadText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Junior Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Arun Kumar"
              placeholderTextColor="#94A3B8"
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={formData.mobile}
              onChangeText={(t) => setFormData({ ...formData, mobile: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="arun@firm.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(t) => setFormData({ ...formData, email: t })}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={18} color="#1E293B" />
            <Text style={styles.sectionTitle}>Account Setup</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="arun_law"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              value={formData.username}
              onChangeText={(t) => setFormData({ ...formData, username: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={formData.password}
              onChangeText={(t) => setFormData({ ...formData, password: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Joining Date</Text>
            <TouchableOpacity
              style={styles.inputWithIcon}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <Text style={[styles.inputInline, !formData.joiningDate && { color: '#94A3B8' }]}>
                {formData.joiningDate || 'Select Date (YYYY-MM-DD)'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.joiningDate ? new Date(formData.joiningDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const dateStr = selectedDate.toISOString().split('T')[0];
                    setFormData({ ...formData, joiningDate: dateStr });
                  }
                }}
              />
            )}
          </View>

          <View style={[styles.inputGroup, styles.switchGroup]}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.label}>Account Status</Text>
              <Text style={styles.subLabel}>
                {formData.isActive ? 'Active (Can login & view assigned cases)' : 'Inactive (Access revoked)'}
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#CBD5E1', true: '#0F172A' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#CBD5E1"
              onValueChange={(v) => setFormData({ ...formData, isActive: v })}
              value={formData.isActive}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && { opacity: 0.8 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {saving ? 'Registering Junior...' : 'Create Junior Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  topBarSub: {
    fontSize: 12,
    color: '#64748B',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 8,
  },
  photoUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  photoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  photoUploadButton: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoUploadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputInline: {
    fontSize: 14,
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  submitButton: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
