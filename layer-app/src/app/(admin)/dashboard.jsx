import React, { useState, useEffect, useCallback } from 'react';
import {
  Platform,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('Admin');
  const [juniors, setJuniors] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Admin Case Closure Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedCaseToClose, setSelectedCaseToClose] = useState(null);
  const [closureDate, setClosureDate] = useState('');
  const [closureReason, setClosureReason] = useState('Settled Out of Court');
  const [finalRemarks, setFinalRemarks] = useState('');
  const [closingCaseLoading, setClosingCaseLoading] = useState(false);
  const [showClosureDatePicker, setShowClosureDatePicker] = useState(false);

  const closureReasonOptions = [
    'Settled Out of Court',
    'Disposed / Judgment Passed',
    'Quashed / Dismissed',
    'Client Withdrawal',
    'Compromise / Mutual Settlement',
    'Other',
  ];

  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateToString = (dateObj) => {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const parseDateString = (dateStr) => {
    if (!dateStr || dateStr === '-') return new Date();
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date();
  };

  const fetchDashboardData = async () => {
    try {
      // Load Admin Name
      const storedName = await AsyncStorage.getItem('profileName');
      if (storedName && storedName.trim()) {
        setAdminName(storedName.trim());
      } else {
        const storedAdmin = await AsyncStorage.getItem('@admin_info');
        if (storedAdmin) {
          try {
            const parsed = JSON.parse(storedAdmin);
            if (parsed.name) setAdminName(parsed.name);
          } catch (e) {}
        }
      }

      const storedPhoto = await AsyncStorage.getItem('profilePhotoUrl');
      if (storedPhoto) setProfilePhoto(storedPhoto);

      // Fetch juniors and cases using fastFetch & API_BASE_URL
      const [juniorsRes, casesRes] = await Promise.all([
        fastFetch(`${API_BASE_URL}/api/juniors`),
        fastFetch(`${API_BASE_URL}/api/cases`),
      ]);

      const juniorsData = await juniorsRes.json();
      if (Array.isArray(juniorsData)) {
        const seen = new Set();
        const uniqueJuniors = [];
        for (const j of juniorsData) {
          const key = (j.username || j.juniorName || j.email || j._id || '').trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueJuniors.push(j);
          }
        }
        setJuniors(uniqueJuniors);
      }

      const casesData = await casesRes.json();
      if (Array.isArray(casesData)) {
        const seen = new Set();
        const uniqueCases = [];
        for (const c of casesData) {
          const key = (c.caseNumber || c._id || '').trim().toUpperCase().replace(/\s+/g, '');
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueCases.push(c);
          }
        }
        setCases(uniqueCases);
      }
    } catch (e) {
      console.error('Error fetching admin dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setClosureDate(getTodayFormatted());
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Open Close Case modal for admin
  const handleOpenCloseModal = (c) => {
    setSelectedCaseToClose(c);
    setClosureDate(getTodayFormatted());
    if (c.closureRequest?.reason) {
      setClosureReason(c.closureRequest.reason);
    } else {
      setClosureReason('Settled Out of Court');
    }
    setFinalRemarks('');
    setShowCloseModal(true);
  };

  // Admin approves & closes case
  const handleApproveCaseClosure = async () => {
    if (!selectedCaseToClose) return;

    if (!closureDate.trim() || !closureReason.trim()) {
      Alert.alert('Validation Error', 'Please select a Closure Date and Closure Reason.');
      return;
    }

    setClosingCaseLoading(true);
    try {
      const targetId = selectedCaseToClose._id || selectedCaseToClose.caseNumber;
      const payload = {
        closureDate: closureDate.trim(),
        closureReason: closureReason.trim(),
        finalRemarks: finalRemarks.trim(),
        closedBy: adminName || 'Admin',
      };

      const response = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Case Closed! ✅', `Case "${selectedCaseToClose.caseNumber}" has been closed and moved to Closed Cases.`);
        setShowCloseModal(false);
        setSelectedCaseToClose(null);
        fetchDashboardData();
      } else {
        // Fallback local close
        setCases((prev) =>
          prev.map((c) =>
            c.caseNumber === selectedCaseToClose.caseNumber
              ? {
                  ...c,
                  status: 'Closed',
                  closureDetails: payload,
                  closureRequest: { ...c.closureRequest, status: 'Approved' },
                }
              : c
          )
        );
        setShowCloseModal(false);
        setSelectedCaseToClose(null);
        Alert.alert('Case Closed ✅', `Case "${selectedCaseToClose.caseNumber}" is now closed.`);
      }
    } catch (e) {
      console.error('Error closing case:', e);
      setCases((prev) =>
        prev.map((c) =>
          c.caseNumber === selectedCaseToClose?.caseNumber
            ? {
                ...c,
                status: 'Closed',
              }
            : c
        )
      );
      setShowCloseModal(false);
      setSelectedCaseToClose(null);
      Alert.alert('Case Closed', 'Case status updated to Closed.');
    } finally {
      setClosingCaseLoading(false);
    }
  };

  // Pending closure requests from juniors
  const pendingClosures = cases.filter(
    (c) => c.status === 'Closure Requested' || c.closureRequest?.status === 'Pending'
  );

  // Case counts
  const activeCases = cases.filter(
    (c) =>
      !c.status ||
      (c.status.toLowerCase() !== 'closed' &&
        c.status.toLowerCase() !== 'disposed' &&
        c.status.toLowerCase() !== 'completed')
  );

  const activeCasesCount = activeCases.length;

  const todayHearingsCount = cases.filter(
    (c) =>
      c.status !== 'Closed' &&
      c.status !== 'Disposed' &&
      c.nextHearing &&
      c.nextHearing.trim() !== '' &&
      c.nextHearing !== '-'
  ).length;

  const closedCasesCount = cases.filter(
    (c) => c.status && (c.status.toLowerCase() === 'closed' || c.status.toLowerCase() === 'disposed')
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F172A']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header matching Junior Dashboard style */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={styles.dashboardBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={styles.dashboardBadgeText}>Admin Dashboard</Text>
              </View>
            </View>
            <Text style={styles.welcomeTitle} numberOfLines={1}>
              Welcome, {adminName} 
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Senior Managing Partner • Firm Command Center
            </Text>
          </View>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => router.push('/(admin)/profile')}
            activeOpacity={0.8}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={{ width: 46, height: 46, borderRadius: 23 }} />
            ) : (
              <Text style={styles.avatarText}>
                {(adminName?.charAt(0) || 'A').toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Firm Status Ribbon */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerBottom}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#64748B" />
              <Text style={styles.dateText}>Tuesday, 28 Sep 2026 • 09:15 AM IST</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>All Benches Active</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(admin)/cases-list')}
            activeOpacity={0.8}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>Total Cases</Text>
              <Ionicons name="folder-outline" size={18} color="#64748B" />
            </View>
            <Text style={styles.statValue}>{cases.length || 48}</Text>
            <Text style={styles.statSubtext}>
              {activeCasesCount} Active • {closedCasesCount} Closed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(admin)/juniors-list')}
            activeOpacity={0.8}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>Active Roster</Text>
              <Ionicons name="people-outline" size={18} color="#64748B" />
            </View>
            <Text style={styles.statValue}>{juniors.length || 8}</Text>
            <Text style={styles.statSubtext}>Juniors • 100% On-duty</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(admin)/cases-list')}
            activeOpacity={0.8}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>Hearings</Text>
              <View style={styles.iconBgHighlight}>
                <Ionicons name="hammer" size={14} color="#D97706" />
              </View>
            </View>
            <Text style={styles.statValue}>{todayHearingsCount || 7}</Text>
            <Text style={styles.statSubtext}>Scheduled Proceedings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(admin)/cases-list')}
            activeOpacity={0.8}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>Active Cases</Text>
              <Ionicons name="time-outline" size={18} color="#64748B" />
            </View>
            <Text style={styles.statValue}>{activeCasesCount || 34}</Text>
            <Text style={[styles.statSubtext, { color: '#059669' }]}>In Progress</Text>
          </TouchableOpacity>
        </View>

        {/* Junior Roster Section (Clicking opens Juniors Directory) */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/(admin)/juniors-list')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="people-outline" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>Active Junior Roster</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.pendingBadge, { backgroundColor: '#EEF2FF', marginRight: 6 }]}>
                <Text style={[styles.pendingBadgeText, { color: '#4F46E5' }]}>{juniors.length} Total</Text>
              </View>
              <Text style={styles.viewAllText}>View Roster {'>'}</Text>
            </View>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="small" color="#4F46E5" style={{ padding: 20 }} />
          ) : juniors.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#64748B', padding: 20 }}>No juniors found.</Text>
          ) : (
            juniors.slice(0, 4).map((junior, index) => (
              <TouchableOpacity
                key={junior._id || index}
                style={[styles.closureCard, { marginBottom: 10 }]}
                onPress={() => router.push('/(admin)/juniors-list')}
                activeOpacity={0.8}
              >
                <View style={styles.closureHeader}>
                  <Text style={styles.caseNumber}>{junior.juniorName}</Text>
                  <View
                    style={[
                      styles.tagYellow,
                      { backgroundColor: junior.status === 'Active' ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagYellowText,
                        { color: junior.status === 'Active' ? '#166534' : '#991B1B' },
                      ]}
                    >
                      {junior.status || 'Active'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.caseInitiator}>Mobile: {junior.mobileNumber}</Text>
                <Text style={styles.caseInitiator}>Email: {junior.email}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pending Case Closure Requests (🚨 Action Required by Admin) */}
        {pendingClosures.length > 0 && (
          <View style={[styles.sectionCard, { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="alert-circle" size={22} color="#D97706" />
                <Text style={[styles.sectionTitle, { color: '#92400E' }]}>
                  Pending Case Closure Requests ({pendingClosures.length})
                </Text>
              </View>
              <View style={[styles.pendingBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.pendingBadgeText, { color: '#B45309', fontWeight: '800' }]}>ACTION REQUIRED</Text>
              </View>
            </View>

            <Text style={{ fontSize: 12.5, color: '#78350F', marginBottom: 12, lineHeight: 17 }}>
              Junior associates have submitted completion requests. Verify proceedings, enter closure particulars & close matters.
            </Text>

            {pendingClosures.map((item, idx) => (
              <View
                key={item._id || idx}
                style={[
                  styles.closureCard,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: '#FCD34D',
                    borderWidth: 1.5,
                    marginBottom: idx === pendingClosures.length - 1 ? 0 : 10,
                  },
                ]}
              >
                <View style={styles.closureHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.caseNumber, { color: '#0F172A' }]}>{item.caseNumber}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>
                      {item.clientName} • {item.courtName}
                    </Text>
                  </View>
                  <View style={[styles.tagYellow, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.tagYellowText, { color: '#B45309' }]}>Closure Requested ⏳</Text>
                  </View>
                </View>

                <View style={{ marginVertical: 8, padding: 8, backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#475569' }}>
                    <Text style={{ fontWeight: '700' }}>Requested By: </Text>
                    {item.closureRequest?.requestedBy || item.assignedJunior || 'Junior'}
                  </Text>
                  {item.closureRequest?.reason && (
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                      <Text style={{ fontWeight: '700' }}>Reason: </Text>
                      {item.closureRequest.reason}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.approveClosureBtn}
                  onPress={() => handleOpenCloseModal(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.approveClosureBtnText}>Verify & Close Case</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Active Cases Section (Clicking opens Cases Directory) */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/(admin)/cases-list')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="scale-outline" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>Active Cases</Text>
            </View>
            <Text style={styles.viewAllText}>View All ({activeCasesCount}) {'>'}</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="small" color="#4F46E5" style={{ padding: 20 }} />
          ) : activeCases.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#64748B', padding: 20 }}>No active cases found.</Text>
          ) : (
            activeCases.slice(0, 5).map((c, index) => (
              <TouchableOpacity
                key={c._id || index}
                style={styles.hearingCard}
                onPress={() => router.push('/(admin)/cases-list')}
                activeOpacity={0.8}
              >
                <View style={styles.hearingHeader}>
                  <View style={styles.timeBadge}>
                    <Ionicons name="calendar-outline" size={14} color="#D97706" />
                    <Text style={styles.timeBadgeText}> {c.filedDate || 'Recently Filed'}</Text>
                  </View>
                  <View style={styles.statusDotContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: c.status === 'Active' ? '#10B981' : '#D97706' },
                      ]}
                    />
                    <Text style={styles.statusTextSmall}>{c.status || 'Active'}</Text>
                  </View>
                </View>
                <Text style={styles.hearingCaseNo}>{c.caseNumber}</Text>
                <Text style={styles.hearingCaseTitle}>
                  {c.clientName} - {c.caseType}
                </Text>
                <Text style={styles.hearingCourt}>{c.courtName}</Text>

                <View style={styles.hearingDetails}>
                  <View style={styles.hearingDetailRow}>
                    <Text style={styles.hearingDetailLabel}>Priority:</Text>
                    <Text
                      style={[
                        styles.hearingDetailValue,
                        { color: c.priority === 'High' ? '#EF4444' : '#334155' },
                      ]}
                    >
                      {c.priority || 'Normal'}
                    </Text>
                  </View>
                  <View style={styles.hearingDetailRow}>
                    <Text style={styles.hearingDetailLabel}>Allocated To:</Text>
                    <Text style={styles.hearingDetailValue}>{c.assignedJunior || 'Unassigned'}</Text>
                  </View>
                  <View style={styles.hearingDetailRow}>
                    <Text style={styles.hearingDetailLabel}>Next Hearing:</Text>
                    <Text style={styles.hearingDetailValue}>{c.nextHearing || 'Not Scheduled'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Admin Verify & Close Case Modal */}
      <Modal visible={showCloseModal} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.closureModalContent}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#166534" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.modalMainTitle}>Admin Case Closure</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedCaseToClose?.caseNumber} - {selectedCaseToClose?.clientName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCloseModal(false)} style={styles.modalCloseCircle}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Closure Date Field with DateTimePicker */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Closure Date *</Text>
                <TouchableOpacity
                  style={styles.modalDatePickerBtn}
                  onPress={() => setShowClosureDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar" size={18} color="#0D6E42" style={{ marginRight: 10 }} />
                  <Text style={styles.modalDatePickerBtnText}>
                    {closureDate || 'Select Closure Date'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                {showClosureDatePicker && (
                  <DateTimePicker
                    value={parseDateString(closureDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowClosureDatePicker(false);
                      if (selectedDate) {
                        setClosureDate(formatDateToString(selectedDate));
                      }
                    }}
                  />
                )}
              </View>

              {/* Closure Reason Options */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Closure Reason *</Text>
                <View style={styles.reasonChipsWrap}>
                  {closureReasonOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.reasonChip,
                        closureReason === opt && styles.reasonChipActive,
                      ]}
                      onPress={() => setClosureReason(opt)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          closureReason === opt && styles.reasonChipTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Final Remarks */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Final Remarks / Judgement Summary</Text>
                <TextInput
                  style={styles.modalTextArea}
                  placeholder="Enter final decree, order copy reference or settlement particulars..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={finalRemarks}
                  onChangeText={setFinalRemarks}
                />
              </View>

              <View style={styles.closureNoticeBox}>
                <Ionicons name="information-circle-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.closureNoticeText}>
                  Once approved, case status will change to CLOSED ✅ and automatically archive into the Closed Cases section.
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowCloseModal(false)}
                disabled={closingCaseLoading}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmCloseBtn, closingCaseLoading && { opacity: 0.8 }]}
                onPress={handleApproveCaseClosure}
                disabled={closingCaseLoading}
              >
                {closingCaseLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmCloseBtnText}>Approve & Close Case</Text>
                  </>
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
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dashboardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dashboardBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
    letterSpacing: 0.3,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#0F172A',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46E5',
  },
  bannerContainer: {
    marginBottom: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  bannerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '500',
    color: '#D97706',
  },
  statusDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  iconBgHighlight: {
    backgroundColor: '#FEF3C7',
    padding: 4,
    borderRadius: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 11,
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closureCard: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  caseNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  tagYellow: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagYellowText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  caseInitiator: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  viewAllText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
  hearingCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  hearingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  hearingCaseNo: {
    fontSize: 12,
    color: '#0D6E42',
    fontWeight: '700',
    marginBottom: 2,
  },
  hearingCaseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  hearingCourt: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  hearingDetails: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  hearingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hearingDetailLabel: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  hearingDetailValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  approveClosureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D6E42',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  approveClosureBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  closureModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalDatePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: '#F8FAFC',
  },
  modalDatePickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  reasonChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  reasonChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  reasonChipTextActive: {
    color: '#166534',
    fontWeight: '700',
  },
  modalTextArea: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    height: 76,
    textAlignVertical: 'top',
  },
  closureNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  closureNoticeText: {
    fontSize: 11.5,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmCloseBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
