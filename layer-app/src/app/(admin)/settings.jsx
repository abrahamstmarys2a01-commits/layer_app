import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Notification states
  const [hearingAlerts, setHearingAlerts] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [caseAllocationNotif, setCaseAllocationNotif] = useState(true);

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
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Manage your chamber account, security & preferences
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
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowNotificationModal(true)}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.iconCircleBg }]}>
              <Ionicons name="notifications-outline" size={22} color={colors.iconColor} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>Hearing reminders & alerts</Text>
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
            Admin Chamber OS • v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* NOTIFICATIONS MODAL */}
      <Modal visible={showNotificationModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeader}>
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

            <TouchableOpacity
              style={[styles.saveNotifButton, { backgroundColor: colors.primaryButtonBg }]}
              onPress={() => {
                setShowNotificationModal(false);
                Alert.alert('Settings Saved', 'Notification preferences updated successfully.');
              }}
            >
              <Text style={styles.saveNotifButtonText}>Done</Text>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuItemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  logoutSubtext: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 2,
  },
  footer: {
    marginTop: 10,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
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
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  notifDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  saveNotifButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveNotifButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
