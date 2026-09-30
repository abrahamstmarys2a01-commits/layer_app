import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, fastFetch } from '../constants/api';

export default function DemoExpiredModal({
  visible,
  onUnlocked,
  supportPhone = '+91 98765 43210',
  supportWhatsApp = '+919876543210',
}) {
  const [checking, setChecking] = useState(false);

  const handleWhatsApp = () => {
    const cleanNumber = supportWhatsApp.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      'Hello, our 30-day demo period for the Legal Case Management App has completed. We would like to request an extension or full activation.'
    );
    const url = `https://wa.me/${cleanNumber}?text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp. Please call support directly.');
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${supportPhone}`).catch(() => {
      Alert.alert('Error', 'Unable to place call.');
    });
  };

  const handleRefresh = async () => {
    setChecking(true);
    try {
      const res = await fastFetch(`${API_BASE_URL}/api/admin/demo-status`, {}, 6000);
      const data = await res.json();

      if (data.success && !data.isExpired) {
        Alert.alert('Demo Activated! 🎉', `Your demo has been renewed with ${data.daysRemaining} days remaining.`);
        if (onUnlocked) onUnlocked(data);
      } else {
        Alert.alert('Still Inactive', 'Demo has not been extended yet. Please contact administrator.');
      }
    } catch (e) {
      Alert.alert('Connection Error', 'Please check your internet connection and try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={48} color="#D97706" />
          </View>

          <Text style={styles.title}>Demo Period Concluded</Text>
          <Text style={styles.subtitle}>
            Your evaluation demo period has ended. To continue managing your cases and hearings, please contact the administrator for an extension or upgrade.
          </Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.waButton} onPress={handleWhatsApp} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.waButtonText}>Contact on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.callButton} onPress={handleCall} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={20} color="#1E3A8A" style={{ marginRight: 8 }} />
              <Text style={styles.callButtonText}>Call Support ({supportPhone})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.refreshButton, checking && { opacity: 0.7 }]}
              onPress={handleRefresh}
              disabled={checking}
              activeOpacity={0.8}
            >
              {checking ? (
                <ActivityIndicator color="#4B5563" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color="#4B5563" style={{ marginRight: 6 }} />
                  <Text style={styles.refreshButtonText}>Verify Extension / Refresh</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
  },
  waButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  waButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  callButtonText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  refreshButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },
});
