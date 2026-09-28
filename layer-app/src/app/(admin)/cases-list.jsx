import React, { useState, useCallback } from 'react';
import {
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function CasesListScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Admin Case Closure Modal state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedCaseToClose, setSelectedCaseToClose] = useState(null);
  const [closureDate, setClosureDate] = useState('');
  const [closureReason, setClosureReason] = useState('Settled Out of Court');
  const [finalRemarks, setFinalRemarks] = useState('');
  const [closingLoading, setClosingLoading] = useState(false);
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

  const fetchCases = async () => {
    setLoading(true);
    try {
      const response = await fastFetch(`${API_BASE_URL}/api/cases`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const seen = new Set();
        const unique = [];
        for (const c of data) {
          const key = (c.caseNumber || c._id || '').trim().toUpperCase().replace(/\s+/g, '');
          if (key && !seen.has(key)) {
            seen.add(key);
            unique.push(c);
          }
        }
        setCases(unique);
      } else {
        setCases([]);
      }
    } catch (e) {
      console.error('Error fetching cases:', e);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setClosureDate(getTodayFormatted());
      fetchCases();
    }, [])
  );

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

  const handleApproveClosure = async () => {
    if (!selectedCaseToClose) return;

    if (!closureDate.trim() || !closureReason.trim()) {
      Alert.alert('Validation Error', 'Please select a Closure Date and Closure Reason.');
      return;
    }

    setClosingLoading(true);
    try {
      const storedName = await AsyncStorage.getItem('profileName');
      const closedBy = storedName || 'Admin';

      const targetId = selectedCaseToClose._id || selectedCaseToClose.caseNumber;
      const payload = {
        closureDate: closureDate.trim(),
        closureReason: closureReason.trim(),
        finalRemarks: finalRemarks.trim(),
        closedBy,
      };

      const response = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Case Closed! ✅', `Case "${selectedCaseToClose.caseNumber}" has been closed.`);
        setShowCloseModal(false);
        setSelectedCaseToClose(null);
        fetchCases();
      } else {
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
        Alert.alert('Case Closed ✅', `Case "${selectedCaseToClose.caseNumber}" is now marked as Closed.`);
      }
    } catch (e) {
      console.error('Error closing case:', e);
      setCases((prev) =>
        prev.map((c) =>
          c.caseNumber === selectedCaseToClose?.caseNumber
            ? { ...c, status: 'Closed' }
            : c
        )
      );
      setShowCloseModal(false);
      setSelectedCaseToClose(null);
      Alert.alert('Case Closed', 'Case status updated to Closed.');
    } finally {
      setClosingLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (c.caseNumber && c.caseNumber.toLowerCase().includes(q)) ||
      (c.clientName && c.clientName.toLowerCase().includes(q)) ||
      (c.courtName && c.courtName.toLowerCase().includes(q)) ||
      (c.assignedJunior && c.assignedJunior.toLowerCase().includes(q)) ||
      (c.caseType && c.caseType.toLowerCase().includes(q));

    const isClosed = c.status === 'Closed' || c.status === 'Disposed' || c.status === 'Completed';
    const isClosureReq = c.status === 'Closure Requested' || c.closureRequest?.status === 'Pending';
    const isActive = !isClosed && !isClosureReq;

    const matchesFilter =
      filterType === 'All' ||
      (filterType === 'Active' && isActive) ||
      (filterType === 'Closure Requested' && isClosureReq) ||
      (filterType === 'Closed Cases' && isClosed) ||
      (filterType === 'High Priority' && c.priority === 'High');

    return matchesSearch && matchesFilter;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.subCardBg }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={[styles.navTitle, { color: colors.text }]}>All Cases Directory</Text>
          <Text style={[styles.navSubtitle, { color: colors.textSecondary }]}>{cases.length} Total Matters</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primaryButtonBg }]}
          onPress={() => router.push('/(admin)/cases')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.borderInput }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by case no, client, court, junior..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView} contentContainerStyle={styles.filterRow}>
          {['All', 'Active', 'Closure Requested', 'Closed Cases', 'High Priority'].map((type) => {
            const isSelected = filterType === type;
            let badgeCount = null;
            if (type === 'Closure Requested') {
              const cnt = cases.filter((c) => c.status === 'Closure Requested' || c.closureRequest?.status === 'Pending').length;
              if (cnt > 0) badgeCount = cnt;
            } else if (type === 'Closed Cases') {
              const cnt = cases.filter((c) => c.status === 'Closed' || c.status === 'Disposed').length;
              if (cnt > 0) badgeCount = cnt;
            }

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.card, borderColor: colors.borderInput },
                  isSelected && {
                    backgroundColor: type === 'Closure Requested' ? '#D97706' : type === 'Closed Cases' ? '#16A34A' : colors.primaryButtonBg,
                    borderColor: type === 'Closure Requested' ? '#D97706' : type === 'Closed Cases' ? '#16A34A' : colors.primaryButtonBg,
                  },
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.textSecondary },
                    isSelected && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  {type}
                  {badgeCount !== null ? ` (${badgeCount})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List Content */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryButtonBg} style={{ marginTop: 40 }} />
        ) : filteredCases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Cases Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'No matters matched your search query.'
                : filterType === 'Closed Cases'
                ? 'No cases have been closed yet.'
                : filterType === 'Closure Requested'
                ? 'No pending case closure requests.'
                : 'No cases have been registered in the system yet.'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primaryButtonBg }]}
              onPress={() => router.push('/(admin)/cases')}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Register New Case</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredCases.map((c, index) => {
            const isHighPriority = c.priority === 'High';
            const isClosed = c.status === 'Closed' || c.status === 'Disposed' || c.status === 'Completed';
            const isClosureReq = c.status === 'Closure Requested' || c.closureRequest?.status === 'Pending';
            const isActive = !isClosed && !isClosureReq;

            return (
              <View
                key={c._id || index}
                style={[
                  styles.caseCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isClosureReq ? '#F59E0B' : isClosed ? '#86EFAC' : colors.border,
                    borderWidth: isClosureReq || isClosed ? 1.5 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.caseBadgeRow}>
                    <View style={[styles.timeBadge, isClosed && { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons
                        name={isClosed ? 'checkmark-circle' : 'calendar-outline'}
                        size={13}
                        color={isClosed ? '#16A34A' : '#D97706'}
                      />
                      <Text style={[styles.timeBadgeText, isClosed && { color: '#16A34A' }]}>
                        {isClosed
                          ? `Closed: ${c.closureDetails?.closureDate || c.updatedAt?.split('T')[0] || 'Disposed'}`
                          : c.filedDate
                          ? `Filed: ${c.filedDate}`
                          : 'Recently Filed'}
                      </Text>
                    </View>
                    {isHighPriority && (
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityBadgeText}>HIGH PRIORITY</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.statusDotContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: isClosed ? '#16A34A' : isClosureReq ? '#D97706' : '#10B981',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusTextSmall,
                        {
                          color: isClosed ? '#16A34A' : isClosureReq ? '#D97706' : colors.textSecondary,
                          fontWeight: isClosed || isClosureReq ? '700' : '500',
                        },
                      ]}
                    >
                      {isClosed ? 'CLOSED ✅' : isClosureReq ? 'Closure Requested ⏳' : (c.status || 'Active')}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.caseNumber, { color: isClosed ? '#16A34A' : colors.textSecondary }]}>
                  {c.caseNumber || 'UNASSIGNED-NO'}
                </Text>
                <Text style={[styles.caseTitle, { color: colors.text }]}>
                  {c.clientName} {c.caseType ? `• ${c.caseType}` : ''}
                </Text>
                {c.courtName ? (
                  <View style={styles.courtRow}>
                    <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.courtText, { color: colors.textSecondary }]}>{c.courtName}</Text>
                  </View>
                ) : null}

                {c.caseDescription ? (
                  <Text style={[styles.caseDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {c.caseDescription}
                  </Text>
                ) : null}

                {/* Closure Details Box for Closed Cases */}
                {isClosed && c.closureDetails && (
                  <View style={styles.closedCaseInfoBox}>
                    <Text style={styles.closedInfoItem}>
                      ⚖️ <Text style={{ fontWeight: '700' }}>Reason: </Text>
                      {c.closureDetails.closureReason || 'Case Disposed'}
                    </Text>
                    {c.closureDetails.finalRemarks ? (
                      <Text style={styles.closedInfoItem}>
                        📝 <Text style={{ fontWeight: '700' }}>Remarks: </Text>
                        {c.closureDetails.finalRemarks}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Closure Request Prompt for Closure Requested cases */}
                {isClosureReq && (
                  <View style={styles.closureReqPromptBox}>
                    <Text style={styles.closureReqPromptText}>
                      <Text style={{ fontWeight: '700' }}>Requested By: </Text>
                      {c.closureRequest?.requestedBy || c.assignedJunior || 'Junior'}
                    </Text>
                    {c.closureRequest?.reason && (
                      <Text style={styles.closureReqPromptText}>
                        <Text style={{ fontWeight: '700' }}>Reason: </Text>
                        {c.closureRequest.reason}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.verifyClosureBtn}
                      onPress={() => handleOpenCloseModal(c)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.verifyClosureBtnText}>Verify & Close Case</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={[styles.detailsBox, { backgroundColor: colors.subCardBg, borderTopColor: colors.border }]}>
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assigned Junior</Text>
                    <View style={styles.juniorTag}>
                      <Ionicons name="person-outline" size={12} color={isDark ? '#60A5FA' : '#4F46E5'} />
                      <Text style={[styles.juniorTagText, { color: isDark ? '#60A5FA' : '#4F46E5' }]}>
                        {c.assignedJunior || 'Unassigned'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      {isClosed ? 'Status' : 'Next Hearing'}
                    </Text>
                    <Text style={[styles.detailValue, { color: isClosed ? '#16A34A' : colors.text, fontWeight: isClosed ? '700' : '500' }]}>
                      {isClosed ? 'Case Closed' : (c.nextHearing || 'Not Scheduled')}
                    </Text>
                  </View>

                  {/* Option for Admin to close active cases directly */}
                  {isActive && (
                    <TouchableOpacity
                      style={styles.directCloseBtn}
                      onPress={() => handleOpenCloseModal(c)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#0D6E42" style={{ marginRight: 4 }} />
                      <Text style={styles.directCloseBtnText}>Close Case</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Admin Verify & Close Case Modal */}
      <Modal visible={showCloseModal} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.closureModalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#166534" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.modalMainTitle, { color: colors.text }]}>Admin Case Closure</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    {selectedCaseToClose?.caseNumber} - {selectedCaseToClose?.clientName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCloseModal(false)} style={styles.modalCloseCircle}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Closure Date Field with DateTimePicker */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Closure Date *</Text>
                <TouchableOpacity
                  style={[styles.modalDatePickerBtn, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}
                  onPress={() => setShowClosureDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar" size={18} color="#0D6E42" style={{ marginRight: 10 }} />
                  <Text style={[styles.modalDatePickerBtnText, { color: colors.text }]}>
                    {closureDate || 'Select Closure Date'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
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
                <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Closure Reason *</Text>
                <View style={styles.reasonChipsWrap}>
                  {closureReasonOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.reasonChip,
                        { backgroundColor: colors.subCardBg, borderColor: colors.borderInput },
                        closureReason === opt && styles.reasonChipActive,
                      ]}
                      onPress={() => setClosureReason(opt)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          { color: colors.textSecondary },
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
                <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>
                  Final Remarks / Judgement Summary
                </Text>
                <TextInput
                  style={[styles.modalTextArea, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text }]}
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
                  Once approved, case status will change to CLOSED ✅ and will show under Closed Cases.
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { borderColor: colors.border }]}
                onPress={() => setShowCloseModal(false)}
                disabled={closingLoading}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmCloseBtn, closingLoading && { opacity: 0.8 }]}
                onPress={handleApproveClosure}
                disabled={closingLoading}
              >
                {closingLoading ? (
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
  navTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  navSubtitle: {
    fontSize: 12,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  caseCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  caseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 4,
  },
  priorityBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
  },
  statusDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  caseNumber: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  caseTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  courtText: {
    fontSize: 13,
  },
  caseDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: 12,
    borderTopWidth: 1,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  juniorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  juniorTagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 18,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  filterScrollView: {
    marginBottom: 16,
  },
  closedCaseInfoBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  closedInfoItem: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 3,
  },
  closureReqPromptBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  closureReqPromptText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
  },
  verifyClosureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D6E42',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  verifyClosureBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  directCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'center',
  },
  directCloseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  closureModalContent: {
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
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalDatePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  modalDatePickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  reasonChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reasonChipTextActive: {
    color: '#166534',
    fontWeight: '700',
  },
  modalTextArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    height: 76,
    textAlignVertical: 'top',
  },
  closureNoticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  closureNoticeText: {
    fontSize: 11.5,
    color: '#0284C7',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
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
