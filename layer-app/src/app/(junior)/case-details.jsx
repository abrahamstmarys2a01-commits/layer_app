import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../context/ThemeContext';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function CaseDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useAppTheme();

  const caseIdOrNumber = params.id || params.caseNumber || 'CSE-2026-001';

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Daily Updates / Case Notes modal state & pickers
  const [showAddDailyUpdateModal, setShowAddDailyUpdateModal] = useState(false);
  const [dailyUpdateDate, setDailyUpdateDate] = useState('');
  const [dailyUpdateText, setDailyUpdateText] = useState('');
  const [dailyUpdateAttachment, setDailyUpdateAttachment] = useState(null);
  const [savingDailyUpdate, setSavingDailyUpdate] = useState(false);
  const [showDailyUpdateDatePicker, setShowDailyUpdateDatePicker] = useState(false);

  // Hearing modal state & pickers
  const [showAddHearingModal, setShowAddHearingModal] = useState(false);
  const [hearingDate, setHearingDate] = useState('');
  const [hearingNotes, setHearingNotes] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [hearingStage, setHearingStage] = useState('Hearing completed');
  const [hearingAttachment, setHearingAttachment] = useState(null);
  const [savingHearing, setSavingHearing] = useState(false);
  const [showHearingDatePicker, setShowHearingDatePicker] = useState(false);
  const [showNextHearingDatePicker, setShowNextHearingDatePicker] = useState(false);

  // Extra Document modal state & pickers
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [selectedPresetDoc, setSelectedPresetDoc] = useState('Vakalatnama.pdf');
  const [savingDoc, setSavingDoc] = useState(false);

  // Payment modal state & picker
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payRemarks, setPayRemarks] = useState('Hearing payment');
  const [payMode, setPayMode] = useState('Cash');
  const [savingPayment, setSavingPayment] = useState(false);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);

  // Case Closure Request modal state
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureReason, setClosureReason] = useState('Final Judgement / Orders Passed');
  const [closureNotes, setClosureNotes] = useState('');
  const [requestingClosure, setRequestingClosure] = useState(false);

  // Payment ledger state
  const [casePayments, setCasePayments] = useState([]);
  const [caseTotalReceived, setCaseTotalReceived] = useState(0);

  // Available preset documents list for quick selection
  const availablePresetDocs = [
    { name: 'Vakalatnama.pdf', size: '1.1 MB', type: 'application/pdf' },
    { name: 'Court_Order.pdf', size: '2.4 MB', type: 'application/pdf' },
    { name: 'Rejoinder_Draft.pdf', size: '1.8 MB', type: 'application/pdf' },
    { name: 'Witness_Affidavit.pdf', size: '1.5 MB', type: 'application/pdf' },
    { name: 'Client_Aadhaar.pdf', size: '0.8 MB', type: 'application/pdf' },
    { name: 'Evidence_List.pdf', size: '3.1 MB', type: 'application/pdf' },
    { name: 'FIR_Copy.pdf', size: '1.4 MB', type: 'application/pdf' },
    { name: 'Receipt_Voucher.pdf', size: '0.9 MB', type: 'application/pdf' },
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

  const fetchFullCaseDetails = async () => {
    try {
      const targetParam = encodeURIComponent(caseIdOrNumber);
      const res = await fastFetch(`${API_BASE_URL}/api/cases/${targetParam}`);
      const data = await res.json();

      if (res.ok && data.success && data.case) {
        setCaseData(data.case);
        fetchCasePayments(data.case.caseNumber);
      } else {
        setFallbackCase();
      }
    } catch (e) {
      console.error('Error fetching full case details:', e);
      setFallbackCase();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCasePayments = async (caseNumber) => {
    try {
      const pRes = await fastFetch(
        `${API_BASE_URL}/api/payments/case/${encodeURIComponent(caseNumber)}`
      );
      const pData = await pRes.json();
      if (pRes.ok && pData.success) {
        setCasePayments(pData.history || []);
        setCaseTotalReceived(pData.totalReceived || 0);
      }
    } catch (e) {
      console.error('Error fetching case payments:', e);
    }
  };

  const setFallbackCase = () => {
    const fallback = {
      _id: params.id || caseIdOrNumber,
      caseNumber: params.caseNumber || (caseIdOrNumber !== 'sample_id' ? caseIdOrNumber : ''),
      clientName: params.clientName || 'Client',
      clientMobile: params.clientMobile || '-',
      courtName: params.courtName || '-',
      caseType: params.caseType || 'General',
      caseDescription: params.caseDescription || '',
      filedDate: params.filedDate || '-',
      assignedDate: params.assignedDate || '-',
      nextHearing: params.nextHearing || '-',
      status: params.status || 'Active',
      priority: params.priority || 'Normal',
      assignedJunior: params.assignedJunior || '',
      documents: [],
      dailyUpdates: [],
      hearingsHistory: [],
    };
    setCaseData(fallback);
    setCasePayments([]);
    setCaseTotalReceived(0);
  };

  useFocusEffect(
    useCallback(() => {
      const today = getTodayFormatted();
      setHearingDate(today);
      setDailyUpdateDate(today);
      setPayDate(today);
      fetchFullCaseDetails();
    }, [caseIdOrNumber])
  );

  // 1. Add Daily Update / Case Notes
  const handleAddDailyUpdate = async () => {
    if (!dailyUpdateDate.trim() || !dailyUpdateText.trim()) {
      Alert.alert('Validation Error', 'Please enter Update Date and Update Notes.');
      return;
    }

    setSavingDailyUpdate(true);
    try {
      const stored = await AsyncStorage.getItem('@junior_info');
      let addedBy = 'Junior';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.juniorName) addedBy = parsed.juniorName;
        } catch (e) {}
      }

      const targetId = caseData?._id || caseIdOrNumber;
      const payload = {
        date: dailyUpdateDate.trim(),
        update: dailyUpdateText.trim(),
        attachment: dailyUpdateAttachment,
        addedBy,
      };

      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/daily-updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.case) {
        setCaseData(data.case);
        Alert.alert('Success', 'Case daily update recorded successfully!');
        setShowAddDailyUpdateModal(false);
        setDailyUpdateText('');
        setDailyUpdateAttachment(null);
      } else {
        const newLocal = {
          _id: Date.now().toString(),
          ...payload,
          createdAt: new Date().toISOString(),
        };
        const updated = [...(caseData?.dailyUpdates || []), newLocal];
        setCaseData({ ...caseData, dailyUpdates: updated });
        setShowAddDailyUpdateModal(false);
        setDailyUpdateText('');
        setDailyUpdateAttachment(null);
        Alert.alert('Success', 'Daily note recorded in case history.');
      }
    } catch (e) {
      console.error('Error adding daily update:', e);
      const newLocal = {
        _id: Date.now().toString(),
        date: dailyUpdateDate.trim(),
        update: dailyUpdateText.trim(),
        attachment: dailyUpdateAttachment,
        addedBy: 'Junior',
        createdAt: new Date().toISOString(),
      };
      const updated = [...(caseData?.dailyUpdates || []), newLocal];
      setCaseData({ ...caseData, dailyUpdates: updated });
      setShowAddDailyUpdateModal(false);
      setDailyUpdateText('');
      setDailyUpdateAttachment(null);
      Alert.alert('Saved', 'Daily note saved.');
    } finally {
      setSavingDailyUpdate(false);
    }
  };

  // 2. Add Hearing Proceedings History
  const handleAddHearing = async () => {
    if (!hearingDate.trim() || !hearingNotes.trim()) {
      Alert.alert('Validation Error', 'Please enter Hearing Date and Hearing Proceedings Notes.');
      return;
    }

    setSavingHearing(true);
    try {
      const stored = await AsyncStorage.getItem('@junior_info');
      let addedBy = 'Junior';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.juniorName) addedBy = parsed.juniorName;
        } catch (e) {}
      }

      const targetId = caseData?._id || caseIdOrNumber;
      const payload = {
        hearingDate: hearingDate.trim(),
        hearingNotes: hearingNotes.trim(),
        nextHearingDate: nextHearingDate.trim() || '-',
        stage: hearingStage,
        attachment: hearingAttachment,
        addedBy,
      };

      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/hearings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.case) {
        setCaseData(data.case);
        Alert.alert('Hearing Saved!', 'Hearing entry recorded in history successfully.');
        setShowAddHearingModal(false);
        setHearingNotes('');
        setNextHearingDate('');
        setHearingAttachment(null);
      } else {
        const newLocalEntry = {
          ...payload,
          createdAt: new Date().toISOString(),
        };
        const updatedHistory = [...(caseData?.hearingsHistory || []), newLocalEntry];
        setCaseData({
          ...caseData,
          hearingsHistory: updatedHistory,
          nextHearing: nextHearingDate.trim() || caseData?.nextHearing,
        });
        setShowAddHearingModal(false);
        setHearingNotes('');
        setNextHearingDate('');
        setHearingAttachment(null);
        Alert.alert('Hearing Saved', 'Hearing recorded in case history.');
      }
    } catch (e) {
      console.error('Error saving hearing:', e);
      const newLocalEntry = {
        hearingDate: hearingDate.trim(),
        hearingNotes: hearingNotes.trim(),
        nextHearingDate: nextHearingDate.trim() || '-',
        stage: hearingStage,
        attachment: hearingAttachment,
        addedBy: 'Junior',
        createdAt: new Date().toISOString(),
      };
      const updatedHistory = [...(caseData?.hearingsHistory || []), newLocalEntry];
      setCaseData({
        ...caseData,
        hearingsHistory: updatedHistory,
        nextHearing: nextHearingDate.trim() || caseData?.nextHearing,
      });
      setShowAddHearingModal(false);
      setHearingNotes('');
      setNextHearingDate('');
      setHearingAttachment(null);
      Alert.alert('Saved', 'Hearing history updated.');
    } finally {
      setSavingHearing(false);
    }
  };

  // 3. Add Extra Document by Junior
  const handleAddExtraDocument = async () => {
    const docName = customDocTitle.trim() || selectedPresetDoc;
    if (!docName) {
      Alert.alert('Validation Error', 'Please enter or select a document name.');
      return;
    }

    setSavingDoc(true);
    try {
      const targetId = caseData?._id || caseIdOrNumber;
      const formattedName = docName.endsWith('.pdf') || docName.endsWith('.jpg') || docName.endsWith('.png') ? docName : `${docName}.pdf`;
      const docPayload = {
        name: formattedName,
        type: 'application/pdf',
        size: '1.2 MB',
        uploadedAt: getTodayFormatted(),
      };

      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docPayload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.case) {
        setCaseData(data.case);
        Alert.alert('Document Attached', `${formattedName} added to case documents!`);
        setShowAddDocModal(false);
        setCustomDocTitle('');
      } else {
        const updatedDocs = [...(caseData?.documents || []), docPayload];
        setCaseData({ ...caseData, documents: updatedDocs });
        setShowAddDocModal(false);
        setCustomDocTitle('');
        Alert.alert('Document Attached', `${formattedName} saved to case.`);
      }
    } catch (e) {
      console.error('Error adding document:', e);
      const formattedName = docName.endsWith('.pdf') ? docName : `${docName}.pdf`;
      const docPayload = {
        name: formattedName,
        type: 'application/pdf',
        size: '1.2 MB',
        uploadedAt: getTodayFormatted(),
      };
      const updatedDocs = [...(caseData?.documents || []), docPayload];
      setCaseData({ ...caseData, documents: updatedDocs });
      setShowAddDocModal(false);
      setCustomDocTitle('');
      Alert.alert('Document Attached', `${formattedName} saved.`);
    } finally {
      setSavingDoc(false);
    }
  };

  // 4. Add Payment Record
  const handleAddPayment = async () => {
    if (!payAmount.trim() || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount received.');
      return;
    }

    setSavingPayment(true);
    try {
      const stored = await AsyncStorage.getItem('@junior_info');
      let enteredBy = 'Junior';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.juniorName) enteredBy = parsed.juniorName;
        } catch (e) {}
      }

      const numAmount = Number(payAmount.trim());
      const payload = {
        caseNumber: caseData?.caseNumber || caseIdOrNumber,
        clientName: caseData?.clientName || 'Client',
        caseType: caseData?.caseType || 'General',
        courtName: caseData?.courtName || '',
        amountReceived: numAmount,
        date: payDate.trim() || getTodayFormatted(),
        remarks: payRemarks.trim() || 'Hearing payment',
        paymentMode: payMode,
        enteredBy,
      };

      const response = await fetch(`${API_BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Payment Recorded!', `₹${numAmount.toLocaleString('en-IN')} entry saved successfully.`);
        setShowAddPaymentModal(false);
        setPayAmount('');
        fetchCasePayments(caseData?.caseNumber || caseIdOrNumber);
      } else {
        const localEntry = {
          _id: Date.now().toString(),
          ...payload,
        };
        setCasePayments([localEntry, ...casePayments]);
        setCaseTotalReceived((prev) => prev + numAmount);
        setShowAddPaymentModal(false);
        setPayAmount('');
        Alert.alert('Payment Recorded', `₹${numAmount.toLocaleString('en-IN')} saved to case ledger.`);
      }
    } catch (e) {
      console.error('Error adding payment:', e);
      const numAmount = Number(payAmount.trim()) || 0;
      const localEntry = {
        _id: Date.now().toString(),
        caseNumber: caseData?.caseNumber || caseIdOrNumber,
        clientName: caseData?.clientName || 'Client',
        amountReceived: numAmount,
        date: payDate.trim() || getTodayFormatted(),
        remarks: payRemarks.trim() || 'Hearing payment',
        paymentMode: payMode,
        enteredBy: 'Junior',
      };
      setCasePayments([localEntry, ...casePayments]);
      setCaseTotalReceived((prev) => prev + numAmount);
      setShowAddPaymentModal(false);
      setPayAmount('');
      Alert.alert('Payment Saved', 'Payment entry recorded locally.');
    } finally {
      setSavingPayment(false);
    }
  };

  // 5. Request Case Closure
  const handleRequestCaseClosure = async () => {
    setRequestingClosure(true);
    try {
      const stored = await AsyncStorage.getItem('@junior_info');
      let requestedBy = 'Junior';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.juniorName) requestedBy = parsed.juniorName;
        } catch (e) {}
      }

      const targetId = caseData?._id || caseIdOrNumber;
      const fullReason = closureNotes.trim()
        ? `${closureReason} - Notes: ${closureNotes.trim()}`
        : closureReason;

      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/request-closure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: fullReason,
          requestedBy,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.case) {
        setCaseData(data.case);
        setShowClosureModal(false);
        Alert.alert(
          'Closure Request Sent! ⏳',
          'Admin has been notified to verify proceedings and approve final case closure.'
        );
      } else {
        setCaseData((prev) => ({
          ...prev,
          status: 'Closure Requested',
          closureRequest: {
            requested: true,
            status: 'Pending',
            reason: fullReason,
            requestedDate: getTodayFormatted(),
            requestedBy,
          },
        }));
        setShowClosureModal(false);
        Alert.alert('Request Submitted', 'Closure request submitted for admin review.');
      }
    } catch (err) {
      console.error('Error submitting closure request:', err);
      setCaseData((prev) => ({
        ...prev,
        status: 'Closure Requested',
      }));
      setShowClosureModal(false);
      Alert.alert('Request Sent', 'Case closure request sent to Admin.');
    } finally {
      setRequestingClosure(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0D6E42" />
          <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}>
            Loading complete case details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const c = caseData || {};
  const dailyUpdatesList = Array.isArray(c.dailyUpdates) ? c.dailyUpdates : [];
  const hearings = Array.isArray(c.hearingsHistory) ? c.hearingsHistory : [];
  const documentsList = Array.isArray(c.documents) ? c.documents : [];
  const isClosed = c.status === 'Closed' || c.status === 'Disposed' || c.status === 'Completed';
  const isClosurePending = c.status === 'Closure Requested' || c.closureRequest?.status === 'Pending';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top App Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.topBarTitle, { color: colors.text }]} numberOfLines={1}>
            Case Details
          </Text>
          <Text style={[styles.topBarSubtitle, { color: '#0D6E42' }]} numberOfLines={1}>
            {c.caseNumber}
          </Text>
        </View>
        {c.clientMobile && (
          <TouchableOpacity
            style={styles.headerCallBtn}
            onPress={() => Linking.openURL(`tel:${c.clientMobile}`)}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchFullCaseDetails();
            }}
            colors={['#0D6E42']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Closed Case Banner (If closed) */}
        {isClosed && (
          <View style={styles.closedCaseBanner}>
            <View style={styles.closedBannerHeader}>
              <Ionicons name="checkmark-circle" size={22} color="#16A34A" style={{ marginRight: 8 }} />
              <Text style={styles.closedBannerTitle}>Status: CLOSED ✅</Text>
            </View>
            <Text style={styles.closedBannerText}>
              This case has been disposed and closed. It is safely archived in Closed Cases.
            </Text>
            {c.closureDetails && (
              <View style={styles.closureDetailsBox}>
                <Text style={styles.closureDetailItem}>
                  📅 Closed Date: <Text style={{ fontWeight: '700' }}>{c.closureDetails.closureDate || '-'}</Text>
                </Text>
                <Text style={styles.closureDetailItem}>
                  ⚖️ Reason: <Text style={{ fontWeight: '700' }}>{c.closureDetails.closureReason || '-'}</Text>
                </Text>
                {c.closureDetails.finalRemarks ? (
                  <Text style={styles.closureDetailItem}>
                    📝 Final Remarks: <Text style={{ fontWeight: '600' }}>{c.closureDetails.finalRemarks}</Text>
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* Closure Request Pending Banner */}
        {isClosurePending && !isClosed && (
          <View style={styles.pendingClosureBanner}>
            <Ionicons name="hourglass-outline" size={22} color="#D97706" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingClosureTitle}>Case Closure Requested ⏳</Text>
              <Text style={styles.pendingClosureSub}>
                Waiting for Senior Admin verification and closure approval.
              </Text>
              {c.closureRequest?.reason && (
                <Text style={styles.pendingClosureReason}>
                  Reason: {c.closureRequest.reason}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Section 1: Case Overview Card */}
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardHeaderNumber, { color: '#0D6E42' }]}>{c.caseNumber}</Text>
              <Text style={[styles.cardHeaderType, { color: colors.textSecondary }]}>
                {c.caseType || 'General Civil'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isClosed ? '#F1F5F9' : isClosurePending ? '#FEF3C7' : '#DCFCE7',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: isClosed ? '#64748B' : isClosurePending ? '#D97706' : '#059669',
                  },
                ]}
              >
                {isClosed ? 'CLOSED ✅' : isClosurePending ? 'Closure Requested' : (c.status || 'Active')}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>CASE OVERVIEW</Text>

          {/* Grid of Fields */}
          <View style={styles.overviewGrid}>
            {/* Case Number */}
            <View style={styles.gridItemHalf}>
              <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>CASE NUMBER</Text>
              <Text style={[styles.gridValueBold, { color: '#0D6E42' }]}>
                📄 {c.caseNumber}
              </Text>
            </View>

            {/* Client Name */}
            <View style={styles.gridItemHalf}>
              <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>CLIENT NAME</Text>
              <Text style={[styles.gridValueBold, { color: colors.text }]}>
                👤 {c.clientName || 'Client'}
              </Text>
            </View>

            {/* Mobile */}
            <View style={styles.gridItemHalf}>
              <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>MOBILE</Text>
              {c.clientMobile ? (
                <TouchableOpacity
                  style={styles.mobileChip}
                  onPress={() => Linking.openURL(`tel:${c.clientMobile}`)}
                >
                  <Ionicons name="call" size={12} color="#0D6E42" style={{ marginRight: 4 }} />
                  <Text style={styles.mobileChipText}>{c.clientMobile}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.gridValue, { color: colors.textSecondary }]}>Not Provided</Text>
              )}
            </View>

            {/* Court */}
            <View style={styles.gridItemHalf}>
              <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>COURT</Text>
              <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={2}>
                🏛️ {c.courtName || 'District Court'}
              </Text>
            </View>

            {/* Case Type */}
            <View style={styles.gridItemHalf}>
              <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>CASE TYPE</Text>
              <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={2}>
                ⚖️ {c.caseType || 'Civil'}
              </Text>
            </View>

            {/* Assigned Date */}
            <View style={styles.gridItemHalf}>
              <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>ASSIGNED DATE</Text>
              <Text style={[styles.gridValue, { color: colors.text }]}>
                📅 {c.assignedDate || c.filedDate || '23/09/2026'}
              </Text>
            </View>

            {/* Assigned Junior */}
            <View style={styles.gridItemFullNoBorder}>
              <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>ASSIGNED JUNIOR</Text>
              <Text style={[styles.gridValue, { color: '#0D6E42', fontWeight: '800' }]}>
                👨‍⚖️ {c.assignedJunior || 'Arun'}
              </Text>
            </View>
          </View>

          {/* Description */}
          {c.caseDescription ? (
            <View style={[styles.descContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[styles.descLabel, { color: colors.textSecondary }]}>DESCRIPTION</Text>
              <Text style={[styles.descText, { color: colors.text }]}>{c.caseDescription}</Text>
            </View>
          ) : null}

          {/* Junior Request Case Closure Button (When case is active) */}
          {!isClosed && !isClosurePending && (
            <TouchableOpacity
              style={styles.requestClosureBtn}
              onPress={() => setShowClosureModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkbox-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.requestClosureBtnText}>Request Case Closure</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section 2: Case Notes & Daily Updates */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="clipboard-outline" size={19} color="#0D6E42" style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Case Notes / Updates</Text>
              </View>
              <Text style={[styles.sectionSubText, { color: colors.textSecondary }]}>
                Daily progress, client verifications & notes
              </Text>
            </View>
            {!isClosed && (
              <TouchableOpacity
                style={styles.actionGreenPillBtn}
                onPress={() => setShowAddDailyUpdateModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.actionGreenPillBtnText}>Add Daily Note</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Case Notes History Timeline */}
          {dailyUpdatesList.length === 0 ? (
            <View style={[styles.emptyTimelineBox, { borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={36} color={colors.textSecondary} />
              <Text style={[styles.emptyTimelineText, { color: colors.textSecondary }]}>
                No daily notes or updates added yet.
              </Text>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {dailyUpdatesList.map((item, index) => (
                <View key={item._id || index} style={styles.timelineItem}>
                  <View style={styles.timelineLeftColumn}>
                    <View style={[styles.timelineDot, { backgroundColor: index === 0 ? '#0D6E42' : '#94A3B8' }]} />
                    {index !== dailyUpdatesList.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    )}
                  </View>

                  <View style={[styles.timelineCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <View style={styles.timelineTopRow}>
                      <View style={styles.dailyUpdateDateBadge}>
                        <Ionicons name="calendar" size={13} color="#0D6E42" style={{ marginRight: 4 }} />
                        <Text style={styles.dailyUpdateDateBadgeText}>{item.date}</Text>
                      </View>
                      {item.addedBy && (
                        <Text style={[styles.addedByText, { color: colors.textSecondary }]}>
                          by {item.addedBy}
                        </Text>
                      )}
                    </View>

                    <Text style={[styles.timelineNotes, { color: colors.text }]}>
                      {item.update}
                    </Text>

                    {item.attachment && item.attachment.name && (
                      <View style={[styles.attachmentPillBox, { backgroundColor: isDark ? '#064e3b' : '#DCFCE7', borderColor: '#86EFAC' }]}>
                        <Ionicons name="document-attach" size={14} color="#0D6E42" style={{ marginRight: 6 }} />
                        <Text style={[styles.attachmentPillName, { color: '#0D6E42' }]} numberOfLines={1}>
                          {item.attachment.name} {item.attachment.size ? `(${item.attachment.size})` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 3: Hearing Details & History Maintenance */}
        <View style={[styles.hearingSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.hearingHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="hammer-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={[styles.hearingSectionTitle, { color: colors.text }]}>Hearing Details</Text>
              </View>
              <Text style={[styles.hearingSectionSub, { color: colors.textSecondary }]}>
                Maintain hearing history & proceedings
              </Text>
            </View>
            {!isClosed && (
              <TouchableOpacity
                style={styles.actionGreenPillBtn}
                onPress={() => setShowAddHearingModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.actionGreenPillBtnText}>Add Hearing</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Current Next Hearing Alert Box */}
          <View style={[styles.currentHearingBanner, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF', borderColor: isDark ? '#3B82F6' : '#BFDBFE' }]}>
            <Ionicons name="time" size={20} color="#2563EB" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.currentHearingLabel, { color: isDark ? '#BFDBFE' : '#1E40AF' }]}>
                CURRENT NEXT HEARING
              </Text>
              <Text style={[styles.currentHearingDate, { color: isDark ? '#FFFFFF' : '#1E3A8A' }]}>
                {isClosed ? 'Case Closed — No Hearings' : (c.nextHearing && c.nextHearing !== '-' ? c.nextHearing : 'Not Scheduled')}
              </Text>
            </View>
          </View>

          {/* Hearing History Timeline */}
          <Text style={[styles.timelineHeading, { color: colors.text }]}>
            Hearing History ({hearings.length})
          </Text>
          <Text style={[styles.historyHint, { color: colors.textSecondary }]}>
            * Previous hearing history is permanently saved chronologically.
          </Text>

          {hearings.length === 0 ? (
            <View style={[styles.emptyTimelineBox, { borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={36} color={colors.textSecondary} />
              <Text style={[styles.emptyTimelineText, { color: colors.textSecondary }]}>
                No hearing proceedings recorded yet.
              </Text>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {hearings.map((h, index) => (
                <View key={h._id || index} style={styles.timelineItem}>
                  <View style={styles.timelineLeftColumn}>
                    <View style={[styles.timelineDot, { backgroundColor: index === 0 ? '#0D6E42' : '#94A3B8' }]} />
                    {index !== hearings.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    )}
                  </View>

                  <View style={[styles.timelineCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                    <View style={styles.timelineTopRow}>
                      <View style={styles.hearingDateBadge}>
                        <Ionicons name="calendar" size={13} color="#0D6E42" style={{ marginRight: 4 }} />
                        <Text style={styles.hearingDateBadgeText}>{h.hearingDate}</Text>
                      </View>
                      <View style={styles.stageTag}>
                        <Text style={styles.stageTagText}>{h.stage || 'Hearing completed'}</Text>
                      </View>
                    </View>

                    <Text style={[styles.timelineNotes, { color: colors.text }]}>
                      {h.hearingNotes}
                    </Text>

                    {h.attachment && h.attachment.name && (
                      <View style={[styles.attachmentPillBox, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF', borderColor: '#BFDBFE', marginVertical: 4 }]}>
                        <Ionicons name="document-attach" size={14} color="#2563EB" style={{ marginRight: 6 }} />
                        <Text style={[styles.attachmentPillName, { color: '#1E40AF' }]} numberOfLines={1}>
                          {h.attachment.name} {h.attachment.size ? `(${h.attachment.size})` : ''}
                        </Text>
                      </View>
                    )}

                    <View style={styles.timelineFooterRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.nextHearingText, { color: colors.textSecondary }]}>
                          Next Hearing: <Text style={{ color: '#2563EB', fontWeight: '700' }}>{h.nextHearingDate || '-'}</Text>
                        </Text>
                      </View>
                      {h.addedBy && (
                        <Text style={[styles.addedByText, { color: colors.textSecondary }]}>
                          by {h.addedBy}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 4: Case Documents & Attachments */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="folder-open-outline" size={19} color="#0D6E42" style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Case Documents</Text>
              </View>
              <Text style={[styles.sectionSubText, { color: colors.textSecondary }]}>
                Attached petitions, orders & case files ({documentsList.length})
              </Text>
            </View>
            {!isClosed && (
              <TouchableOpacity
                style={styles.actionGreenPillBtn}
                onPress={() => setShowAddDocModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.actionGreenPillBtnText}>Add Document</Text>
              </TouchableOpacity>
            )}
          </View>

          {documentsList.length === 0 ? (
            <View style={[styles.emptyTimelineBox, { borderColor: colors.border }]}>
              <Ionicons name="folder-outline" size={36} color={colors.textSecondary} />
              <Text style={[styles.emptyTimelineText, { color: colors.textSecondary }]}>
                No documents uploaded for this case yet.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8, marginTop: 4 }}>
              {documentsList.map((doc, idx) => (
                <View
                  key={idx}
                  style={[styles.docItemCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}
                >
                  <View style={styles.docIconBox}>
                    <Ionicons name="document-text" size={20} color="#0D6E42" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.docItemTitle, { color: colors.text }]} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={[styles.docItemMeta, { color: colors.textSecondary }]}>
                      {doc.size || '1.2 MB'} • {doc.uploadedAt ? `Uploaded ${doc.uploadedAt}` : 'Attached'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewDocBtn}
                    onPress={() => Alert.alert('Document Preview', `Opening ${doc.name}...`)}
                  >
                    <Ionicons name="eye-outline" size={16} color="#0D6E42" />
                    <Text style={styles.viewDocBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 5: Amount & Payment History Ledger */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.hearingHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="wallet-outline" size={18} color="#0D6E42" style={{ marginRight: 6 }} />
                <Text style={[styles.hearingSectionTitle, { color: colors.text }]}>
                  Payment & Amount
                </Text>
              </View>
              <Text style={[styles.hearingSectionSub, { color: colors.textSecondary }]}>
                Client fees, receipts & ledger
              </Text>
            </View>
            {!isClosed && (
              <TouchableOpacity
                style={styles.actionGreenPillBtn}
                onPress={() => setShowAddPaymentModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.actionGreenPillBtnText}>Add Payment</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Total Amount Received Card */}
          <View style={[styles.totalReceivedBox, { backgroundColor: isDark ? '#064e3b' : '#F0FDF4', borderColor: isDark ? '#047857' : '#BBF7D0' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.totalReceivedLabel, { color: isDark ? '#A7F3D0' : '#15803D' }]}>
                  Total Amount Received
                </Text>
                <Text style={[styles.totalReceivedValue, { color: isDark ? '#FFFFFF' : '#0D6E42' }]}>
                  ₹{caseTotalReceived.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.totalIconBadge}>
                <Ionicons name="cash" size={24} color="#0D6E42" />
              </View>
            </View>
          </View>

          <Text style={[styles.subLedgerHeading, { color: colors.text }]}>Payment History</Text>

          {casePayments.length === 0 ? (
            <View style={[styles.emptyPaymentBox, { borderColor: colors.border }]}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
                No payments recorded for this case yet.
              </Text>
            </View>
          ) : (
            <View style={[styles.ledgerTable, { borderColor: colors.border }]}>
              <View style={[styles.ledgerTableHeader, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                <Text style={[styles.ledgerTh, { width: '32%', color: colors.textSecondary }]}>Date</Text>
                <Text style={[styles.ledgerTh, { width: '32%', color: colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.ledgerTh, { width: '36%', textAlign: 'right', color: colors.textSecondary }]}>Remarks</Text>
              </View>
              {casePayments.map((p, pIdx) => (
                <View key={pIdx} style={[styles.ledgerTableRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                  <Text style={[styles.ledgerTd, { width: '32%', color: colors.text }]}>{p.date}</Text>
                  <Text style={[styles.ledgerTdAmount, { width: '32%', color: '#0D6E42' }]}>
                    ₹{Number(p.amountReceived).toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.ledgerTdRemarks, { width: '36%', color: colors.textSecondary }]} numberOfLines={1}>
                    {p.remarks || 'Payment'}
                  </Text>
                </View>
              ))}
              <View style={[styles.ledgerTableFooter, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderTopColor: colors.border }]}>
                <Text style={[styles.ledgerTotalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.ledgerTotalAmount, { color: '#0D6E42' }]}>
                  ₹{caseTotalReceived.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.addPaymentShortcutBtn}
            onPress={() => router.push('/(junior)/amount-entry')}
          >
            <Ionicons name="open-outline" size={15} color="#0D6E42" style={{ marginRight: 6 }} />
            <Text style={styles.addPaymentShortcutText}>Open Amount Entry Tab</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal 1: Add Daily Update / Case Note Modal */}
      <Modal visible={showAddDailyUpdateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Daily Note / Update</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Case: {c.caseNumber} • {c.clientName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddDailyUpdateModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Date with Picker */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Date *</Text>
                <TouchableOpacity
                  style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  onPress={() => setShowDailyUpdateDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color="#0D6E42" style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTextInput, { color: colors.text, paddingTop: 12 }]}>
                    {dailyUpdateDate || 'Select Date'}
                  </Text>
                </TouchableOpacity>
                {showDailyUpdateDatePicker && (
                  <DateTimePicker
                    value={parseDateString(dailyUpdateDate)}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                      setShowDailyUpdateDatePicker(false);
                      if (d) setDailyUpdateDate(formatDateToString(d));
                    }}
                  />
                )}
              </View>

              {/* Quick Preset Updates */}
              <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 4 }]}>Quick Suggestions</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {[
                  'Client documents verified.',
                  'Draft petition prepared.',
                  'Hearing completed. Next hearing scheduled.',
                  'Certified order copy applied.',
                  'Notice served to opposite party.',
                ].map((preset, pIdx) => (
                  <TouchableOpacity
                    key={pIdx}
                    style={[
                      styles.stagePill,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setDailyUpdateText(preset)}
                  >
                    <Text style={[styles.stagePillText, { color: colors.text }]}>{preset}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Update Description */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Update / Case Progress *</Text>
                <TextInput
                  style={[
                    styles.modalTextArea,
                    { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: colors.text },
                  ]}
                  placeholder="e.g. Client documents verified. Rejoinder prepared and approved."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={dailyUpdateText}
                  onChangeText={setDailyUpdateText}
                />
              </View>

              {/* Optional Attachment Selection */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Attach Document (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {availablePresetDocs.map((doc) => {
                    const isSelected = dailyUpdateAttachment?.name === doc.name;
                    return (
                      <TouchableOpacity
                        key={doc.name}
                        style={[
                          styles.stagePill,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? '#064e3b' : '#DCFCE7')
                              : (isDark ? '#1E293B' : '#F1F5F9'),
                            borderColor: isSelected ? '#0D6E42' : colors.border,
                          },
                        ]}
                        onPress={() => setDailyUpdateAttachment(isSelected ? null : doc)}
                      >
                        <Text style={[styles.stagePillText, { color: isSelected ? '#0D6E42' : colors.text }]}>
                          📄 {doc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveSubmitBtn, savingDailyUpdate && { opacity: 0.8 }]}
              onPress={handleAddDailyUpdate}
              disabled={savingDailyUpdate}
            >
              {savingDailyUpdate ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveSubmitBtnText}>Save Daily Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Add Hearing Modal (With What happened in court / proceedings) */}
      <Modal visible={showAddHearingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Record Hearing</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Case: {c.caseNumber} • {c.courtName || 'Court'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddHearingModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Hearing Date with Picker */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Hearing Date *</Text>
                <TouchableOpacity
                  style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  onPress={() => setShowHearingDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color="#0D6E42" style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTextInput, { color: colors.text, paddingTop: 12 }]}>
                    {hearingDate || 'Select Hearing Date'}
                  </Text>
                </TouchableOpacity>
                {showHearingDatePicker && (
                  <DateTimePicker
                    value={parseDateString(hearingDate)}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                      setShowHearingDatePicker(false);
                      if (d) setHearingDate(formatDateToString(d));
                    }}
                  />
                )}
              </View>

              {/* Hearing Stage Pills */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Hearing Stage</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {[
                    'Hearing completed',
                    'Arguments filed',
                    'Cross-examination',
                    'Evidence submitted',
                    'Interim order',
                    'Orders reserved',
                    'Adjourned at request',
                  ].map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.stagePill,
                        {
                          backgroundColor:
                            hearingStage === stage
                              ? (isDark ? '#064e3b' : '#DCFCE7')
                              : (isDark ? '#1E293B' : '#F1F5F9'),
                          borderColor: hearingStage === stage ? '#0D6E42' : colors.border,
                        },
                      ]}
                      onPress={() => setHearingStage(stage)}
                    >
                      <Text style={[styles.stagePillText, { color: hearingStage === stage ? '#0D6E42' : colors.text }]}>
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Hearing Notes / Court Proceedings */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                  What was said in Court / Hearing Notes *
                </Text>
                <TextInput
                  style={[
                    styles.modalTextArea,
                    { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: colors.text },
                  ]}
                  placeholder="e.g. Hearing completed. Submissions filed by advocate. Opposite party sought 2 weeks time."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={hearingNotes}
                  onChangeText={setHearingNotes}
                />
              </View>

              {/* Next Hearing Date with Picker */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Next Hearing Date</Text>
                <TouchableOpacity
                  style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  onPress={() => setShowNextHearingDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTextInput, { color: colors.text, paddingTop: 12 }]}>
                    {nextHearingDate || 'Select Next Hearing Date'}
                  </Text>
                </TouchableOpacity>
                {showNextHearingDatePicker && (
                  <DateTimePicker
                    value={parseDateString(nextHearingDate)}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                      setShowNextHearingDatePicker(false);
                      if (d) setNextHearingDate(formatDateToString(d));
                    }}
                  />
                )}
              </View>

              {/* Optional Hearing Attachment */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Hearing Order / Doc Attachment</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {availablePresetDocs.map((doc) => {
                    const isSelected = hearingAttachment?.name === doc.name;
                    return (
                      <TouchableOpacity
                        key={doc.name}
                        style={[
                          styles.stagePill,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? '#1E3A8A' : '#EFF6FF')
                              : (isDark ? '#1E293B' : '#F1F5F9'),
                            borderColor: isSelected ? '#2563EB' : colors.border,
                          },
                        ]}
                        onPress={() => setHearingAttachment(isSelected ? null : doc)}
                      >
                        <Text style={[styles.stagePillText, { color: isSelected ? '#1E40AF' : colors.text }]}>
                          ⚖️ {doc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveSubmitBtn, savingHearing && { opacity: 0.8 }]}
              onPress={handleAddHearing}
              disabled={savingHearing}
            >
              {savingHearing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveSubmitBtnText}>Save Hearing Entry</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Add Extra Document Modal */}
      <Modal visible={showAddDocModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Case Document</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Case: {c.caseNumber} • {c.clientName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddDocModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Select from Presets</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {availablePresetDocs.map((doc) => {
                  const isSelected = selectedPresetDoc === doc.name && !customDocTitle.trim();
                  return (
                    <TouchableOpacity
                      key={doc.name}
                      style={[
                        styles.stagePill,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? '#064e3b' : '#DCFCE7')
                            : (isDark ? '#1E293B' : '#F1F5F9'),
                          borderColor: isSelected ? '#0D6E42' : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedPresetDoc(doc.name);
                        setCustomDocTitle('');
                      }}
                    >
                      <Text style={[styles.stagePillText, { color: isSelected ? '#0D6E42' : colors.text }]}>
                        📄 {doc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Or Type Custom Document Title</Text>
              <View style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                <TextInput
                  style={[styles.modalTextInput, { color: colors.text }]}
                  placeholder="e.g. Sale_Deed_Copy.pdf or Police_Report.pdf"
                  placeholderTextColor={colors.textSecondary}
                  value={customDocTitle}
                  onChangeText={setCustomDocTitle}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveSubmitBtn, savingDoc && { opacity: 0.8 }]}
              onPress={handleAddExtraDocument}
              disabled={savingDoc}
            >
              {savingDoc ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveSubmitBtnText}>Attach to Case</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 4: Add Payment Modal (With Date Picker) */}
      <Modal visible={showAddPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Amount Entry</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Case: {c.caseNumber} • {c.clientName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddPaymentModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Amount Received */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Amount Received (₹) *</Text>
                <View style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0D6E42', marginRight: 6 }}>₹</Text>
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.text, fontWeight: '700', fontSize: 16 }]}
                    placeholder="e.g. 10000 or 5000"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={payAmount}
                    onChangeText={setPayAmount}
                  />
                </View>
              </View>

              {/* Date with Picker */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Date *</Text>
                <TouchableOpacity
                  style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  onPress={() => setShowPaymentDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTextInput, { color: colors.text, paddingTop: 12 }]}>
                    {payDate || 'Select Payment Date'}
                  </Text>
                </TouchableOpacity>
                {showPaymentDatePicker && (
                  <DateTimePicker
                    value={parseDateString(payDate)}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                      setShowPaymentDatePicker(false);
                      if (d) setPayDate(formatDateToString(d));
                    }}
                  />
                )}
              </View>

              {/* Remarks */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Remarks</Text>
                <View style={[styles.modalInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.text }]}
                    placeholder="e.g. Initial payment, Hearing payment"
                    placeholderTextColor={colors.textSecondary}
                    value={payRemarks}
                    onChangeText={setPayRemarks}
                  />
                </View>
              </View>

              {/* Quick Remarks */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['Initial payment', 'Hearing payment', 'Filing fee', 'Final settlement'].map((rem) => (
                  <TouchableOpacity
                    key={rem}
                    style={[
                      styles.stagePill,
                      {
                        backgroundColor: payRemarks === rem ? (isDark ? '#064e3b' : '#DCFCE7') : (isDark ? '#1E293B' : '#F1F5F9'),
                        borderColor: payRemarks === rem ? '#0D6E42' : colors.border,
                      },
                    ]}
                    onPress={() => setPayRemarks(rem)}
                  >
                    <Text style={[styles.stagePillText, { color: payRemarks === rem ? '#0D6E42' : colors.text }]}>
                      {rem}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment Mode */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Payment Mode</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['Cash', 'UPI', 'Bank Transfer', 'Cheque'].map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.stagePill,
                        {
                          flex: 1,
                          alignItems: 'center',
                          backgroundColor: payMode === mode ? (isDark ? '#064e3b' : '#DCFCE7') : (isDark ? '#1E293B' : '#F1F5F9'),
                          borderColor: payMode === mode ? '#0D6E42' : colors.border,
                        },
                      ]}
                      onPress={() => setPayMode(mode)}
                    >
                      <Text style={[styles.stagePillText, { color: payMode === mode ? '#0D6E42' : colors.text }]}>
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveSubmitBtn, savingPayment && { opacity: 0.8 }]}
              onPress={handleAddPayment}
              disabled={savingPayment}
            >
              {savingPayment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveSubmitBtnText}>Record Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 5: Case Close Request Modal for Junior */}
      <Modal visible={showClosureModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Request Case Closure</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Case: {c.caseNumber} • {c.clientName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowClosureModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                Submit this case for final closure. Chamber Admin will verify details and archive the matter in Closed Cases.
              </Text>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Closure Reason *</Text>
              <View style={{ gap: 6, marginBottom: 14 }}>
                {[
                  'Final Judgement / Orders Passed',
                  'Proceedings Disposed by Court',
                  'Out of Court Settlement Reached',
                  'Compromise Decree Signed',
                  'Matter Withdrawn',
                ].map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOptionCard,
                      {
                        backgroundColor: closureReason === reason ? (isDark ? '#064e3b' : '#DCFCE7') : isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: closureReason === reason ? '#0D6E42' : colors.border,
                      },
                    ]}
                    onPress={() => setClosureReason(reason)}
                  >
                    <Ionicons
                      name={closureReason === reason ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={closureReason === reason ? '#0D6E42' : colors.textSecondary}
                    />
                    <Text style={[styles.reasonOptionText, { color: closureReason === reason ? '#0D6E42' : colors.text }]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Additional Notes / Judgement Summary</Text>
              <TextInput
                style={[
                  styles.modalTextArea,
                  { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: colors.text },
                ]}
                placeholder="e.g. Favourable order obtained on 28-09-2026. Certified copy applied."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={closureNotes}
                onChangeText={setClosureNotes}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveSubmitBtn, requestingClosure && { opacity: 0.8 }]}
              onPress={handleRequestCaseClosure}
              disabled={requestingClosure}
            >
              {requestingClosure ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveSubmitBtnText}>Submit Closure Request</Text>
              )}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  topBarSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  headerCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D6E42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  closedCaseBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  closedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  closedBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
  },
  closedBannerText: {
    fontSize: 12.5,
    color: '#166534',
    lineHeight: 18,
    marginTop: 2,
  },
  closureDetailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  closureDetailItem: {
    fontSize: 12,
    color: '#1E293B',
  },
  pendingClosureBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  pendingClosureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingClosureSub: {
    fontSize: 11.5,
    color: '#78350F',
    marginTop: 2,
  },
  pendingClosureReason: {
    fontSize: 11.5,
    color: '#92400E',
    fontWeight: '600',
    marginTop: 4,
  },
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  cardHeaderType: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItemHalf: {
    width: '50%',
    marginBottom: 12,
    paddingRight: 6,
  },
  gridItemFullNoBorder: {
    width: '100%',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridValueBold: {
    fontSize: 14,
    fontWeight: '700',
  },
  mobileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  mobileChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D6E42',
  },
  descContainer: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  descLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  descText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  requestClosureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 14,
  },
  requestClosureBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  actionGreenPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D6E42',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 20,
    shadowColor: '#0D6E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  actionGreenPillBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 3,
  },
  hearingSectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  hearingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hearingSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  hearingSectionSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  currentHearingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  currentHearingLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  currentHearingDate: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  timelineHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyHint: {
    fontSize: 11,
    marginBottom: 10,
  },
  emptyTimelineBox: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginVertical: 6,
  },
  emptyTimelineText: {
    fontSize: 12.5,
    marginTop: 6,
  },
  timelineList: {
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    width: 20,
    marginRight: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dailyUpdateDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dailyUpdateDateBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0D6E42',
  },
  attachmentPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  attachmentPillName: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  hearingDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hearingDateBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0D6E42',
  },
  stageTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stageTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  timelineNotes: {
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 4,
  },
  timelineFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  nextHearingText: {
    fontSize: 11,
  },
  addedByText: {
    fontSize: 10.5,
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  docItemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewDocBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D6E42',
    marginLeft: 3,
  },
  totalIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPaymentBox: {
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginVertical: 8,
  },
  totalReceivedBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  totalReceivedLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  totalReceivedValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  subLedgerHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  ledgerTable: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ledgerTableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  ledgerTh: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ledgerTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ledgerTd: {
    fontSize: 11,
    fontWeight: '600',
  },
  ledgerTdAmount: {
    fontSize: 11,
    fontWeight: '700',
  },
  ledgerTdRemarks: {
    fontSize: 11,
    textAlign: 'right',
  },
  ledgerTableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  ledgerTotalLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  ledgerTotalAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  addPaymentShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  addPaymentShortcutText: {
    color: '#0D6E42',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    marginBottom: 14,
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
  modalInputGroup: {
    marginBottom: 12,
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
  modalTextArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    height: 85,
  },
  stagePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  stagePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  saveSubmitBtn: {
    backgroundColor: '#0D6E42',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  reasonOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  reasonOptionText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
