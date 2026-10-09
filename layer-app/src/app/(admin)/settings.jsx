import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
  Switch,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Notification states
  const [hearingAlerts, setHearingAlerts] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [caseAllocationNotif, setCaseAllocationNotif] = useState(true);

  useEffect(() => {
    // Load persisted notification preferences
    const loadPreferences = async () => {
      try {
        const storedHearing = await AsyncStorage.getItem('@pref_hearing_alerts');
        const storedDeadline = await AsyncStorage.getItem('@pref_deadline_reminders');
        const storedCaseAlloc = await AsyncStorage.getItem('@pref_case_allocation');
        if (storedHearing !== null) setHearingAlerts(storedHearing === 'true');
        if (storedDeadline !== null) setDeadlineReminders(storedDeadline === 'true');
        if (storedCaseAlloc !== null) setCaseAllocationNotif(storedCaseAlloc === 'true');
      } catch (e) {}
    };
    loadPreferences();
  }, []);

  const handleSaveNotifications = async () => {
    try {
      await AsyncStorage.setItem('@pref_hearing_alerts', String(hearingAlerts));
      await AsyncStorage.setItem('@pref_deadline_reminders', String(deadlineReminders));
      await AsyncStorage.setItem('@pref_case_allocation', String(caseAllocationNotif));
    } catch (e) {}
    setShowNotificationModal(false);
    Alert.alert(
      'Notification Settings Saved',
      'Your notification preferences are active. You will receive real-time hearing reminders and chamber alerts.'
    );
  };

  const handleTestNotification = () => {
    Alert.alert(
      '🔔 Live Hearing Notification',
      'Test Alert: High Court Hearing scheduled for tomorrow (10:30 AM). Case: WP/2026/042 - Partition Matter (Court Hall 4).',
      [{ text: 'Dismiss', style: 'cancel' }, { text: 'View Case', onPress: () => router.push('/(admin)/cases-list') }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out of Admin Chamber?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            router.replace('/(auth)');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0B1120' : '#FFFFFF'} />
      
      {/* Top Navigation Bar with Back Arrow to Dashboard */}
      <View style={[styles.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.subCardBg }]}
          onPress={() => router.replace('/(admin)/dashboard')}
          activeOpacity={0.7}
          accessibilityLabel="Back to Dashboard"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Chamber Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chamber Settings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Manage your advocate account, security, preferences & alerts
          </Text>
        </View>

        {/* ACCOUNT SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(admin)/profile')}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.iconCircleBg }]}>
              <Ionicons name="person-circle-outline" size={22} color={colors.iconColor} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Profile Information</Text>
              <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>Senior advocate name, email & phone</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(admin)/change-password')}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.iconCircleBg }]}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.iconColor} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Change Password</Text>
              <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>Update your secure login password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* PREFERENCES SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences & Alerts</Text>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowNotificationModal(true)}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.iconCircleBg }]}>
              <Ionicons name="notifications-outline" size={22} color={colors.iconColor} />
            </View>
            <View style={styles.menuItemContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>Notifications</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
              <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>Hearing reminders & chamber alerts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* DANGER ZONE */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Danger Zone</Text>
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutButton]}
            onPress={handleLogout}
          >
            <View style={[styles.iconCircle, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.logoutText}>Logout of Account</Text>
              <Text style={styles.logoutSubtext}>End current chamber session</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            Vakil Grid Chamber OS • v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* NOTIFICATIONS MODAL WITH BACK ARROW */}
      <Modal visible={showNotificationModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalBackBtn}
                onPress={() => setShowNotificationModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.notifTitle, { color: colors.text }]}>Hearing Date Reminders</Text>
                <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>Get alerts 24h prior to court hearings</Text>
              </View>
              <Switch
                value={hearingAlerts}
                onValueChange={setHearingAlerts}
                trackColor={{ false: '#CBD5E1', true: colors.primaryButtonBg }}
              />
            </View>

            <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.notifTitle, { color: colors.text }]}>Registry Deadline Reminders</Text>
                <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>Reminders for counter affidavits & filings</Text>
              </View>
              <Switch
                value={deadlineReminders}
                onValueChange={setDeadlineReminders}
                trackColor={{ false: '#CBD5E1', true: colors.primaryButtonBg }}
              />
            </View>

            <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.notifTitle, { color: colors.text }]}>Case Allocation Alerts</Text>
                <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>Notifications when assigning matter to juniors</Text>
              </View>
              <Switch
                value={caseAllocationNotif}
                onValueChange={setCaseAllocationNotif}
                trackColor={{ false: '#CBD5E1', true: colors.primaryButtonBg }}
              />
            </View>

            {/* Test Notification Button */}
            <TouchableOpacity
              style={[styles.testNotifBtn, { borderColor: colors.border }]}
              onPress={handleTestNotification}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications" size={16} color={colors.primaryButtonBg} style={{ marginRight: 6 }} />
              <Text style={[styles.testNotifText, { color: colors.primaryButtonBg }]}>Send Test Notification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveNotifButton, { backgroundColor: colors.primaryButtonBg }]}
              onPress={handleSaveNotifications}
            >
              <Text style={styles.saveNotifButtonText}>Save & Return to Settings</Text>
            </TouchableOpacity>
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
  navBar: {
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
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  activeBadgeText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalBackBtn: {
    padding: 4,
    marginRight: 8,
  },
  testNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
    borderStyle: 'dashed',
  },
  testNotifText: {
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 16,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  menuItemSubtext: {
    fontSize: 11,
    marginTop: 1,
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  logoutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  logoutSubtext: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 1,
  },
  footer: {
    marginTop: 8,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  notifDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  saveNotifButton: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveNotifButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
