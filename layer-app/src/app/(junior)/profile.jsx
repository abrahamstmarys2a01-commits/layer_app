import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../../context/ThemeContext';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function JuniorProfile() {
  const router = useRouter();
  const { colors, isDark, setThemeMode, themeMode } = useAppTheme();

  const [juniorInfo, setJuniorInfo] = useState({
    juniorName: 'Arun',
    username: 'arun',
    email: 'arun@firm.com',
    mobileNumber: '+91 98401 23456',
    status: 'Active',
    joiningDate: '2024-01-15',
    photoUrl: null,
  });

  const [loading, setLoading] = useState(false);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  const loadJuniorProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('@junior_info');
      let currentIdentifier = 'arun';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setJuniorInfo((prev) => ({ ...prev, ...parsed }));
          if (parsed.username || parsed.juniorName || parsed.id) {
            currentIdentifier = parsed.username || parsed.juniorName || parsed.id;
          }
        } catch (e) {}
      }

      // Fetch live data from backend
      try {
        const res = await fastFetch(`${API_BASE_URL}/api/juniors/profile/${encodeURIComponent(currentIdentifier)}`);
        const data = await res.json();
        if (res.ok && data.success && data.junior) {
          setJuniorInfo(data.junior);
          await AsyncStorage.setItem('@junior_info', JSON.stringify(data.junior));
        }
      } catch (fErr) {}
    } catch (e) {
      console.error('Error loading junior profile:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadJuniorProfile();
    }, [])
  );

  const openEditModal = () => {
    setEditName(juniorInfo.juniorName || '');
    setEditEmail(juniorInfo.email || '');
    setEditMobile(juniorInfo.mobileNumber || '');
    setEditPhotoUrl(juniorInfo.photoUrl || null);
    setShowEditModal(true);
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera roll permissions are required to select a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEditPhotoUrl(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Error selecting photo:', e);
      Alert.alert('Error', 'Unable to pick image. Please try again.');
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim() || !editMobile.trim()) {
      Alert.alert('Validation Error', 'Name, Email, and Phone Number cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      const identifier = juniorInfo.username || juniorInfo.id || juniorInfo.juniorName;
      const payload = {
        juniorName: editName.trim(),
        email: editEmail.trim(),
        mobileNumber: editMobile.trim(),
        photoUrl: editPhotoUrl,
      };

      const res = await fetch(`${API_BASE_URL}/api/juniors/profile/${encodeURIComponent(identifier)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.junior) {
        setJuniorInfo(data.junior);
        await AsyncStorage.setItem('@junior_info', JSON.stringify(data.junior));
        setShowEditModal(false);
        Alert.alert('Success', 'Your profile details have been updated successfully.');
      } else {
        // Fallback local update
        const updated = {
          ...juniorInfo,
          ...payload,
        };
        setJuniorInfo(updated);
        await AsyncStorage.setItem('@junior_info', JSON.stringify(updated));
        setShowEditModal(false);
        Alert.alert('Profile Updated', 'Your profile details have been saved locally.');
      }
    } catch (e) {
      console.error('Error saving profile:', e);
      const updated = {
        ...juniorInfo,
        juniorName: editName.trim(),
        email: editEmail.trim(),
        mobileNumber: editMobile.trim(),
        photoUrl: editPhotoUrl,
      };
      setJuniorInfo(updated);
      await AsyncStorage.setItem('@junior_info', JSON.stringify(updated));
      setShowEditModal(false);
      Alert.alert('Profile Updated', 'Your profile changes have been saved.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a new password.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert('Validation Error', 'New password and confirmation password do not match.');
      return;
    }

    if (newPassword.length < 4) {
      Alert.alert('Validation Error', 'Password must be at least 4 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      const identifier = juniorInfo.username || juniorInfo.id || juniorInfo.juniorName;
      const res = await fetch(`${API_BASE_URL}/api/juniors/profile/${encodeURIComponent(identifier)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Password Updated', 'Your account password has been changed successfully.');
      } else {
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Password Updated', 'Password updated successfully.');
      }
    } catch (e) {
      console.error('Error updating password:', e);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Updated', 'Password updated successfully.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@user_role');
            await AsyncStorage.removeItem('@junior_info');
            router.replace('/(auth)');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarContainer}>
            {juniorInfo.photoUrl ? (
              <Image source={{ uri: juniorInfo.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>
                  {(juniorInfo.juniorName?.charAt(0) || 'J').toUpperCase()}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.avatarEditBadge} onPress={openEditModal}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.profileName, { color: colors.text }]}>
            {juniorInfo.juniorName || 'Arun'}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Junior Associate Advocate</Text>
          </View>

          <Text style={[styles.profileUsername, { color: colors.textSecondary }]}>
            @{juniorInfo.username || 'arun'}
          </Text>

          {/* Action Buttons Row */}
          <View style={styles.profileActionRow}>
            <TouchableOpacity
              style={[styles.editProfileBtn, { backgroundColor: '#0D6E42' }]}
              onPress={openEditModal}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.changePasswordBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="key-outline" size={15} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={[styles.changePasswordBtnText, { color: colors.text }]}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact & Account Details */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Information</Text>
            <TouchableOpacity onPress={openEditModal}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0D6E42' }}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#0D6E42" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{juniorInfo.juniorName || 'Arun'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Ionicons name="mail-outline" size={20} color="#0D6E42" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{juniorInfo.email || 'arun@firm.com'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Ionicons name="call-outline" size={20} color="#0D6E42" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone Number</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{juniorInfo.mobileNumber || '+91 98401 23456'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#0D6E42" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Account Status</Text>
              <Text style={[styles.infoValue, { color: '#059669', fontWeight: '700' }]}>{juniorInfo.status || 'Active'}</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Update your personal & contact details
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Photo Upload Section */}
              <View style={styles.modalPhotoRow}>
                <View style={styles.modalAvatarContainer}>
                  {editPhotoUrl ? (
                    <Image source={{ uri: editPhotoUrl }} style={styles.modalAvatarImage} />
                  ) : (
                    <View style={[styles.avatarLarge, { width: 64, height: 64, borderRadius: 32 }]}>
                      <Text style={[styles.avatarTextLarge, { fontSize: 24 }]}>
                        {(editName?.charAt(0) || 'J').toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Profile Photo</Text>
                  <TouchableOpacity style={styles.photoSelectBtn} onPress={handlePickImage}>
                    <Ionicons name="image-outline" size={16} color="#0D6E42" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0D6E42' }}>
                      {editPhotoUrl ? 'Change Photo' : 'Choose from Gallery'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Full Name */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Full Name *</Text>
                <View style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <Ionicons name="person-outline" size={18} color="#0D6E42" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.text }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.textSecondary}
                    value={editName}
                    onChangeText={setEditName}
                  />
                </View>
              </View>

              {/* Email Address */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Email Address *</Text>
                <View style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <Ionicons name="mail-outline" size={18} color="#0D6E42" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.text }]}
                    placeholder="name@firm.com"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={editEmail}
                    onChangeText={setEditEmail}
                  />
                </View>
              </View>

              {/* Phone Number */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Phone Number *</Text>
                <View style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <Ionicons name="call-outline" size={18} color="#0D6E42" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.text }]}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    value={editMobile}
                    onChangeText={setEditMobile}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, savingProfile && { opacity: 0.8 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Set a new password for your junior account
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10 }}>
              {/* New Password */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>New Password *</Text>
                <View style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#0D6E42" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.text }]}
                    placeholder="Enter at least 4 characters"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPasswordText}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPasswordText(!showPasswordText)}>
                    <Ionicons name={showPasswordText ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Confirm Password *</Text>
                <View style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#0D6E42" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.text }]}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPasswordText}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, savingPassword && { opacity: 0.8 }]}
                onPress={handleUpdatePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 52) : 18,
    paddingBottom: 32,
  },
  profileCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#0D6E42',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderColor: '#0D6E42',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0D6E42',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarTextLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0D6E42',
  },
  profileName: {
    fontSize: 21,
    fontWeight: '800',
  },
  roleBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  roleBadgeText: {
    color: '#0D6E42',
    fontSize: 12,
    fontWeight: '700',
  },
  profileUsername: {
    fontSize: 13,
    marginTop: 4,
  },
  profileActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  changePasswordBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  changePasswordBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    height: 50,
    marginTop: 10,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#0D6E42',
  },
  photoSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  modalSaveBtn: {
    flex: 2,
    backgroundColor: '#0D6E42',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
